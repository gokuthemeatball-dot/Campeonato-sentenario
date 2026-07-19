-- Run this once in Supabase → SQL Editor → New query.
alter table public.registrations add column if not exists position text;
