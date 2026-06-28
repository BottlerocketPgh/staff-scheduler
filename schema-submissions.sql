-- Run this in Supabase SQL Editor

create table if not exists availability_submissions (
  id uuid default gen_random_uuid() primary key,
  staff_name text not null,
  month text not null, -- YYYY-MM
  submitted_at timestamptz default now(),
  unique(staff_name, month)
);

create index if not exists idx_submissions_month on availability_submissions(month);
