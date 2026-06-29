create table if not exists sub_claims (
  token text primary key,
  staff_name text not null,
  absent_staff_name text not null,
  date text not null,
  status text not null default 'pending',
  created_at timestamptz default now()
);
