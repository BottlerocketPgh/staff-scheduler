create table if not exists staff (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  priority_order integer not null,
  is_new boolean default true,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists availability (
  id uuid default gen_random_uuid() primary key,
  staff_name text not null,
  date date not null,
  created_at timestamptz default now(),
  unique(staff_name, date)
);

create table if not exists assignments (
  id uuid default gen_random_uuid() primary key,
  date date not null unique,
  staff_name text not null,
  assigned_at timestamptz default now()
);

create index if not exists idx_availability_staff_date on availability(staff_name, date);
create index if not exists idx_availability_date on availability(date);
create index if not exists idx_assignments_date on assignments(date);
