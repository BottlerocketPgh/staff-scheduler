-- Run this in Supabase SQL Editor after the initial schema.sql

alter table staff add column if not exists email text;

create table if not exists shift_confirmations (
  id uuid default gen_random_uuid() primary key,
  date date not null unique,
  staff_name text not null,
  token text not null unique,
  status text not null default 'pending', -- pending | confirmed | cancelled
  sent_at timestamptz default now(),
  responded_at timestamptz
);

create index if not exists idx_confirmations_token on shift_confirmations(token);
create index if not exists idx_confirmations_date on shift_confirmations(date);
