-- Run once in Supabase SQL Editor. This makes write access organizer-only.
-- Public visitors retain read access to posts, rules, and tournament details.

alter table public.community_posts enable row level security;
alter table public.site_content enable row level security;

revoke insert, update, delete on public.community_posts from anon;
revoke insert, update, delete on public.site_content from anon;
grant select on public.community_posts, public.site_content to anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;
grant update on public.site_content to authenticated;

-- Replace old write policies so a permissive policy cannot override these.
do $$
declare policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('community_posts', 'site_content')
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  loop
    execute format('drop policy if exists %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end $$;

drop policy if exists "Public can read community posts" on public.community_posts;
drop policy if exists "Public can read site content" on public.site_content;
drop policy if exists "Organizers can create posts" on public.community_posts;
drop policy if exists "Organizers can edit posts" on public.community_posts;
drop policy if exists "Organizers can delete posts" on public.community_posts;
drop policy if exists "Organizers can edit site content" on public.site_content;

create policy "Public can read community posts" on public.community_posts
for select to anon, authenticated using (true);

create policy "Public can read site content" on public.site_content
for select to anon, authenticated using (true);

create policy "Organizers can create posts" on public.community_posts
for insert to authenticated with check (
  lower(auth.jwt() ->> 'email') in ('gokuthemeatball@gmail.com', 'adrieljimenez067@gmail.com')
);

create policy "Organizers can edit posts" on public.community_posts
for update to authenticated using (
  lower(auth.jwt() ->> 'email') in ('gokuthemeatball@gmail.com', 'adrieljimenez067@gmail.com')
) with check (
  lower(auth.jwt() ->> 'email') in ('gokuthemeatball@gmail.com', 'adrieljimenez067@gmail.com')
);

create policy "Organizers can delete posts" on public.community_posts
for delete to authenticated using (
  lower(auth.jwt() ->> 'email') in ('gokuthemeatball@gmail.com', 'adrieljimenez067@gmail.com')
);

create policy "Organizers can edit site content" on public.site_content
for update to authenticated using (
  lower(auth.jwt() ->> 'email') in ('gokuthemeatball@gmail.com', 'adrieljimenez067@gmail.com')
) with check (
  lower(auth.jwt() ->> 'email') in ('gokuthemeatball@gmail.com', 'adrieljimenez067@gmail.com')
);

-- Public questions inbox. Visitors can submit; only organizers can read/delete.
create table if not exists public.player_questions (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  sender_name text not null check (char_length(trim(sender_name)) between 5 and 80),
  question text not null check (char_length(trim(question)) between 5 and 1000)
);

alter table public.player_questions add column if not exists organizer_reply text
  check (organizer_reply is null or char_length(trim(organizer_reply)) between 2 and 1000);
alter table public.player_questions add column if not exists replied_at timestamptz;

alter table public.player_questions enable row level security;
revoke all on public.player_questions from anon, authenticated;
grant insert on public.player_questions to anon, authenticated;
grant select, update, delete on public.player_questions to authenticated;
grant usage, select on sequence public.player_questions_id_seq to anon, authenticated;

drop policy if exists "Anyone can send a question" on public.player_questions;
drop policy if exists "Organizers can read questions" on public.player_questions;
drop policy if exists "Organizers can delete questions" on public.player_questions;
drop policy if exists "Organizers can reply to questions" on public.player_questions;

create policy "Anyone can send a question" on public.player_questions
for insert to anon, authenticated with check (true);

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

-- Public answers never expose the sender's name or unanswered questions.
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

revoke all on function public.public_answered_questions() from public;
grant execute on function public.public_answered_questions() to anon, authenticated;

-- Enforce a maximum of six registrations per team inside the database. The
-- advisory lock prevents simultaneous submissions from creating a 7th player.
create or replace function public.enforce_team_capacity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if char_length(trim(new.player_name)) < 5
     or position(' ' in trim(new.player_name)) = 0
     or lower(trim(new.player_name)) in ('test test', 'none none', 'no name', 'your name', 'first last', 'name name', 'john doe', 'jane doe', 'fake name') then
    raise exception 'INVALID_REAL_NAME' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtext(lower(new.team)));
  if (select count(*) from public.registrations where lower(team) = lower(new.team)) >= 6 then
    raise exception 'TEAM_FULL' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_team_capacity_before_insert on public.registrations;
create trigger enforce_team_capacity_before_insert
before insert on public.registrations
for each row execute function public.enforce_team_capacity();

-- Safe public availability summary: it exposes counts, never player details.
create or replace function public.team_availability()
returns table(team text, player_count bigint)
language sql
security definer
set search_path = public
as $$
  select registrations.team, count(*)::bigint
  from public.registrations
  group by registrations.team;
$$;

revoke all on function public.team_availability() from public;
grant execute on function public.team_availability() to anon, authenticated;
