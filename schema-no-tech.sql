create table if not exists no_tech_dates (
  date text primary key,
  created_at timestamptz default now()
);
