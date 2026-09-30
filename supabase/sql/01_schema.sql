-- 01_schema.sql  (Saaf prototype: tables, enums, indexes). Run ONCE. 

create extension if not exists pgcrypto; 

  

create type public.issue_type       as enum ('overflowing_bin','road_garbage','missed_collection','illegal_dumping','other'); 

create type public.complaint_status as enum ('submitted','acknowledged','in_progress','resolved','rejected'); 

create type public.priority_level   as enum ('low','medium','high','critical'); 

create type public.waste_type       as enum ('wet','dry','e_waste','bulky','hazardous'); 

create type public.pickup_status    as enum ('requested','scheduled','collected'); 

create type public.user_role        as enum ('resident','admin'); 

  

create table public.society_settings ( 

  id           int primary key default 1 check (id = 1), 

  society_name text not null, 

  join_code    text not null 

); 

  

create table public.areas ( 

  id        serial primary key, 

  block     text not null, 

  area_name text not null, 

  unique (block, area_name) 

); 

  

create table public.profiles ( 

  id         uuid primary key references auth.users(id) on delete cascade, 

  name       text not null, 

  flat_no    text, 

  block      text, 

  phone      text, 

  avatar_url text, 

  role       public.user_role not null default 'resident', 

  created_at timestamptz not null default now() 

); 

  

create table public.complaints ( 

  id                uuid primary key default gen_random_uuid(), 

  reporter_id       uuid not null references public.profiles(id), 

  issue_type        public.issue_type not null, 

  description       text not null default '', 

  area_id           int  not null references public.areas(id), 

  is_anonymous      boolean not null default false, 

  status            public.complaint_status not null default 'submitted', 

  priority          public.priority_level   not null default 'medium', 

  priority_reason   text, 

  ai_suggested_type public.issue_type, 

  resolution_note   text,          -- resolve note OR reject reason 

  after_photo_url   text, 

  scheduled_at      timestamptz, 

  resolved_at       timestamptz, 

  created_at        timestamptz not null default now() 

); 

create index complaints_status_priority_idx on public.complaints (status, priority); 

create index complaints_dup_idx on public.complaints (area_id, issue_type, status); 

  

create table public.complaint_photos ( 

  id           uuid primary key default gen_random_uuid(), 

  complaint_id uuid not null references public.complaints(id) on delete cascade, 

  url          text not null, 

  position     int  not null default 0 

); 

  

create table public.upvotes ( 

  complaint_id uuid not null references public.complaints(id) on delete cascade, 

  user_id      uuid not null references public.profiles(id)   on delete cascade, 

  primary key (complaint_id, user_id) 

); 

create index upvotes_complaint_idx on public.upvotes (complaint_id); 

  

create table public.status_history ( 

  id           uuid primary key default gen_random_uuid(), 

  complaint_id uuid not null references public.complaints(id) on delete cascade, 

  from_status  public.complaint_status, 

  to_status    public.complaint_status not null, 

  changed_by   uuid references public.profiles(id), 

  note         text, 

  created_at   timestamptz not null default now() 

); 

create index status_history_complaint_idx on public.status_history (complaint_id, created_at); 

  

create table public.pickups ( 

  id             uuid primary key default gen_random_uuid(), 

  resident_id    uuid not null references public.profiles(id), 

  waste_type     public.waste_type not null, 

  notes          text, 

  photo_url      text, 

  status         public.pickup_status not null default 'requested', 

  scheduled_date date, 

  created_at     timestamptz not null default now() 

); 

  

create table public.notifications ( 

  id                   uuid primary key default gen_random_uuid(), 

  user_id              uuid not null references public.profiles(id) on delete cascade, 

  message              text not null, 

  related_complaint_id uuid references public.complaints(id) on delete cascade, 

  is_read              boolean not null default false, 

  created_at           timestamptz not null default now() 

); 

create index notifications_user_idx on public.notifications (user_id, is_read);