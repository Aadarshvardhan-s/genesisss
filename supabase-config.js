// supabase-config.js — Frontend Supabase client
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project values.
// supabase-config.js — Frontend Supabase client
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project values.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Paste your Supabase project values here (or replace at build time).
export const SUPABASE_URL = 'https://itihkglyvxkwgiisenbe.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_JiDl4bwgM1-RhN8t9TRM-Q_qGF2lHMk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storageKey: 'genesis-auth'
  }
});

export const auth = supabase.auth;
export const storage = supabase.storage;

// Small helper to parse auth session quickly
export async function getCurrentSession() {
  const { data } = await auth.getSession();
  return data?.session ?? null;
}

export default supabase;

// ─────────────────────────────────────────────────────────────────────────────
// Required Supabase setup (run once in SQL editor):
// ─────────────────────────────────────────────────────────────────────────────
/*
-- 1. Profiles table
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  full_name   text,
  bio         text,
  avatar_url  text,
  updated_at  timestamptz default now()
);

-- 2. RLS policies
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- 3. Storage bucket for avatars
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

create policy "Avatar images are publicly accessible"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Anyone can upload an avatar"
  on storage.objects for insert with check (bucket_id = 'avatars');

create policy "Anyone can update their own avatar"
  on storage.objects for update using (bucket_id = 'avatars');

-- 4. Trigger: auto-create profile row on sign-up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'user_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
*/
