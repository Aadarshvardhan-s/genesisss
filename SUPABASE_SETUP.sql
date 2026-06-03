-- Supabase schema for Genesis Incubation Centre
-- Run this in Supabase SQL editor (replace schema names if needed)

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  username text unique,
  full_name text,
  role text default 'user',
  department text,
  year text,
  branch text,
  avatar_url text,
  bio text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Projects table
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner uuid references public.profiles(id) on delete set null,
  title text not null,
  summary text,
  status text,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  body text,
  read boolean default false,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid,
  sender uuid references public.profiles(id) on delete set null,
  recipient uuid references public.profiles(id) on delete set null,
  body text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- Settings
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  key text not null,
  value jsonb,
  created_at timestamptz default now(),
  unique (user_id, key)
);

-- Activity logs
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  action text,
  details jsonb,
  created_at timestamptz default now()
);

-- Storage: create a bucket named 'avatars' via Supabase Storage UI (not via SQL).

-- Row Level Security (basic): allow authenticated users to insert/select their own rows
-- Enable RLS on sensitive tables
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.notifications enable row level security;
alter table public.messages enable row level security;
alter table public.settings enable row level security;
alter table public.activity_logs enable row level security;

-- Policies: profiles (users can upsert and select their own profile)
create policy "profiles_select_self" on public.profiles
  for select using (auth.uid() = id OR auth.role() = 'service_role');

create policy "profiles_upsert_self" on public.profiles
  for insert, update using (auth.uid() = id) with check (auth.uid() = id);

-- Projects: owners can insert/select/update their projects
create policy "projects_owner" on public.projects
  for all using (owner = (select id from public.profiles where id = auth.uid())) with check (owner = (select id from public.profiles where id = auth.uid()));

-- Notifications: users can act on their notifications
create policy "notifications_user" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Messages: sender or recipient can access
create policy "messages_participant" on public.messages
  for select using (sender = (select id from public.profiles where id = auth.uid()) OR recipient = (select id from public.profiles where id = auth.uid()));

-- Settings and activity_logs: user-specific
create policy "settings_user" on public.settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "activity_logs_user" on public.activity_logs
  for insert using (user_id = auth.uid()) with check (user_id = auth.uid());

-- NOTE: Review policies and adjust roles for admin/service_role as needed.
