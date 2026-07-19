-- Run this in Supabase → SQL Editor → New query.
create table if not exists public.community_posts (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  message text not null check (char_length(message) between 1 and 1000)
);

alter table public.community_posts enable row level security;

create policy "Anyone can read community posts" on public.community_posts
for select to anon, authenticated using (true);

create policy "Organizers can publish community posts" on public.community_posts
for insert to authenticated with check (
  (auth.jwt() ->> 'email') in ('gokuthemeatball@gmail.com', 'adrieljimenez067@gmail.com')
);
