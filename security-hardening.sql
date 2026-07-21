-- Run once in Supabase SQL Editor. Safe to run again.
-- Moves public writes behind validated, rate-limited database functions.

alter table public.registrations add column if not exists submission_token text;
alter table public.community_posts add column if not exists updated_at timestamptz;

create unique index if not exists registrations_unique_cash_app_reference
on public.registrations (lower(trim(payment_reference)))
where registration_source = 'cash_app' and payment_reference is not null;

create table if not exists public.public_submission_attempts (
  id bigint generated always as identity primary key,
  submitted_at timestamptz not null default now(),
  submission_token text not null
);

alter table public.public_submission_attempts enable row level security;
revoke all on public.public_submission_attempts from anon, authenticated;

create table if not exists public.player_questions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  sender_name text not null check (char_length(trim(sender_name)) between 5 and 80),
  question text not null check (char_length(trim(question)) between 5 and 1000),
  organizer_reply text check (organizer_reply is null or char_length(trim(organizer_reply)) between 2 and 1000),
  replied_at timestamptz
);

alter table public.player_questions enable row level security;
revoke all on public.player_questions from anon, authenticated;
grant select, update, delete on public.player_questions to authenticated;

drop policy if exists "Organizers can read questions" on public.player_questions;
drop policy if exists "Organizers can delete questions" on public.player_questions;
drop policy if exists "Organizers can reply to questions" on public.player_questions;

create policy "Organizers can read questions" on public.player_questions
for select to authenticated using (
  lower(auth.jwt() ->> 'email') in ('gokuthemeatball@gmail.com', 'adrieljimenez067@gmail.com')
);
create policy "Organizers can delete questions" on public.player_questions
for delete to authenticated using (
  lower(auth.jwt() ->> 'email') in ('gokuthemeatball@gmail.com', 'adrieljimenez067@gmail.com')
);
create policy "Organizers can reply to questions" on public.player_questions
for update to authenticated using (
  lower(auth.jwt() ->> 'email') in ('gokuthemeatball@gmail.com', 'adrieljimenez067@gmail.com')
) with check (
  lower(auth.jwt() ->> 'email') in ('gokuthemeatball@gmail.com', 'adrieljimenez067@gmail.com')
);

create or replace function public.guard_public_submission(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_token is null or p_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'BOT_DETECTED' using errcode = 'P0001';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_token));
  if (select count(*) from public.public_submission_attempts where submission_token = p_token and submitted_at > now() - interval '1 hour') >= 5 then
    raise exception 'SUBMISSION_RATE_LIMIT' using errcode = 'P0001';
  end if;
  insert into public.public_submission_attempts (submission_token) values (p_token);
  delete from public.public_submission_attempts where submitted_at < now() - interval '24 hours';
end;
$$;

create or replace function public.submit_cash_app_registration(
  p_player_name text, p_player_age integer, p_position text, p_team text,
  p_payment_reference text, p_submission_token text, p_honeypot text,
  p_form_elapsed_ms integer
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_id bigint;
begin
  if coalesce(trim(p_honeypot), '') <> '' or coalesce(p_form_elapsed_ms, 0) < 2000 then
    raise exception 'BOT_DETECTED' using errcode = 'P0001';
  end if;
  perform public.guard_public_submission(p_submission_token);
  if char_length(trim(p_payment_reference)) not between 4 and 100 then
    raise exception 'INVALID_PAYMENT_REFERENCE' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.registrations where registration_source = 'cash_app' and lower(trim(payment_reference)) = lower(trim(p_payment_reference))) then
    raise exception 'PAYMENT_REFERENCE_USED' using errcode = 'P0001';
  end if;
  insert into public.registrations (
    player_name, player_age, position, team, payment_reference, submission_token,
    paid, registration_source, registration_status
  ) values (
    trim(p_player_name), p_player_age, trim(p_position), trim(p_team), trim(p_payment_reference), p_submission_token,
    false, 'cash_app', 'pending'
  ) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.submit_meeting_registration(
  p_player_name text, p_email text, p_player_age integer, p_team text,
  p_position text, p_submission_token text, p_honeypot text,
  p_form_elapsed_ms integer
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_id bigint;
begin
  if coalesce(trim(p_honeypot), '') <> '' or coalesce(p_form_elapsed_ms, 0) < 2000 then
    raise exception 'BOT_DETECTED' using errcode = 'P0001';
  end if;
  perform public.guard_public_submission(p_submission_token);
  if p_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'INVALID_EMAIL' using errcode = 'P0001';
  end if;
  insert into public.registrations (
    player_name, email, player_age, team, position, submission_token,
    paid, registration_source, registration_status
  ) values (
    trim(p_player_name), lower(trim(p_email)), p_player_age, trim(p_team), trim(p_position), p_submission_token,
    false, 'meeting', 'pending'
  ) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.submit_player_question(
  p_sender_name text, p_question text, p_submission_token text
) returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_id bigint;
begin
  perform public.guard_public_submission(p_submission_token);
  if char_length(trim(p_sender_name)) not between 5 and 80 or char_length(trim(p_question)) not between 5 and 1000 then
    raise exception 'INVALID_QUESTION' using errcode = 'P0001';
  end if;
  insert into public.player_questions (sender_name, question)
  values (trim(p_sender_name), trim(p_question)) returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.public_answered_questions()
returns table(question text, answer text, replied_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select player_questions.question, player_questions.organizer_reply, player_questions.replied_at
  from public.player_questions
  where player_questions.organizer_reply is not null
    and char_length(trim(player_questions.organizer_reply)) >= 2
  order by player_questions.replied_at desc nulls last;
$$;

revoke insert on public.registrations from anon, authenticated;
revoke insert on public.player_questions from anon, authenticated;

revoke all on function public.guard_public_submission(text) from public;
revoke all on function public.submit_cash_app_registration(text, integer, text, text, text, text, text, integer) from public;
revoke all on function public.submit_meeting_registration(text, text, integer, text, text, text, text, integer) from public;
revoke all on function public.submit_player_question(text, text, text) from public;
revoke all on function public.public_answered_questions() from public;
grant execute on function public.submit_cash_app_registration(text, integer, text, text, text, text, text, integer) to anon, authenticated;
grant execute on function public.submit_meeting_registration(text, text, integer, text, text, text, text, integer) to anon, authenticated;
grant execute on function public.submit_player_question(text, text, text) to anon, authenticated;
grant execute on function public.public_answered_questions() to anon, authenticated;

comment on function public.submit_cash_app_registration is 'Validated, rate-limited public Cash App registration entry point.';
