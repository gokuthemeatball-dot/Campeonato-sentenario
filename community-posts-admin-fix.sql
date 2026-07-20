-- Run this entire file once in Supabase -> SQL Editor.
-- It is safe to run again. Public visitors can read posts, while only the two
-- approved organizer accounts can create, edit, or delete them.

create table if not exists public.community_posts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  message text not null check (char_length(trim(message)) between 1 and 1000)
);

alter table public.community_posts enable row level security;

revoke all on public.community_posts from anon, authenticated;
grant select on public.community_posts to anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;
grant usage, select on sequence public.community_posts_id_seq to authenticated;

do $$
declare policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'community_posts'
  loop
    execute format('drop policy if exists %I on public.community_posts', policy_row.policyname);
  end loop;
end $$;

create policy "Anyone can read community posts" on public.community_posts
for select to anon, authenticated using (true);

create policy "Approved organizers can create posts" on public.community_posts
for insert to authenticated with check (
  lower(auth.jwt() ->> 'email') in (
    'gokuthemeatball@gmail.com',
    'adrieljimenez067@gmail.com'
  )
);

create policy "Approved organizers can edit posts" on public.community_posts
for update to authenticated using (
  lower(auth.jwt() ->> 'email') in (
    'gokuthemeatball@gmail.com',
    'adrieljimenez067@gmail.com'
  )
) with check (
  lower(auth.jwt() ->> 'email') in (
    'gokuthemeatball@gmail.com',
    'adrieljimenez067@gmail.com'
  )
);

create policy "Approved organizers can delete posts" on public.community_posts
for delete to authenticated using (
  lower(auth.jwt() ->> 'email') in (
    'gokuthemeatball@gmail.com',
    'adrieljimenez067@gmail.com'
  )
);
