-- Run once in the Supabase SQL Editor before publishing the website update.
-- Cash App registrations remain pending until an organizer verifies payment.

alter table public.registrations
  add column if not exists payment_reference text;

alter table public.registrations
  drop constraint if exists registrations_cash_app_confirmation_check;

alter table public.registrations
  add constraint registrations_cash_app_confirmation_check check (
    registration_source is distinct from 'cash_app'
    or (
      registration_status = 'pending'
      and paid is false
      and char_length(trim(payment_reference)) between 4 and 100
    )
  );

comment on column public.registrations.payment_reference is
  'Cash App confirmation or reference supplied by the player for organizer review.';
