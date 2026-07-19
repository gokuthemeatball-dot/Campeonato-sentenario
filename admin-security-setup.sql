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
