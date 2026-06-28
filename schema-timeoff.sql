-- Run this in Supabase SQL Editor

create table if not exists time_off_requests (
  id uuid default gen_random_uuid() primary key,
  staff_name text not null,
  date date not null,
  note text,
  status text not null default 'pending', -- pending | approved | denied
  created_at timestamptz default now(),
  unique(staff_name, date)
);

create index if not exists idx_timeoff_date on time_off_requests(date);
create index if not exists idx_timeoff_status on time_off_requests(status);
