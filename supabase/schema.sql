-- ============================================================
-- FireFindFox — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- Allowed email domain: @student.tsu.edu.ph
-- ============================================================

-- PROFILES (auto-created on signup via trigger)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  rating_avg numeric default 0,
  rating_count int default 0,
  created_at timestamptz default now()
);

-- LISTINGS
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text not null,
  price numeric not null,
  condition text check (condition in ('new','like_new','used','for_parts')) not null,
  status text check (status in ('active','reserved','sold','archived')) default 'active',
  category text not null,
  location text not null,
  image_url text,
  bump_count int default 0,
  last_bumped_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- CONVERSATIONS
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  buyer_id uuid references profiles(id),
  seller_id uuid references profiles(id),
  listing_title text,
  listing_price numeric,
  created_at timestamptz default now(),
  unique(listing_id, buyer_id)
);

-- MESSAGES
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id),
  content text not null,
  created_at timestamptz default now()
);

-- SAVED LISTINGS
create table if not exists saved_listings (
  user_id uuid references profiles(id) on delete cascade,
  listing_id uuid references listings(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, listing_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table profiles enable row level security;
alter table listings enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table saved_listings enable row level security;

-- Profiles
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Listings
create policy "listings_select" on listings for select using (true);
create policy "listings_insert" on listings for insert with check (auth.uid() = seller_id);
create policy "listings_update" on listings for update using (auth.uid() = seller_id);
create policy "listings_delete" on listings for delete using (auth.uid() = seller_id);

-- Conversations (participants only)
create policy "conversations_select" on conversations for select
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "conversations_insert" on conversations for insert
  with check (auth.uid() = buyer_id);

-- Messages (conversation participants only)
create policy "messages_select" on messages for select
  using (exists (
    select 1 from conversations c
    where c.id = conversation_id
    and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  ));
create policy "messages_insert" on messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from conversations c
      where c.id = conversation_id
      and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- Saved listings (own only)
create policy "saved_select" on saved_listings for select using (auth.uid() = user_id);
create policy "saved_insert" on saved_listings for insert with check (auth.uid() = user_id);
create policy "saved_delete" on saved_listings for delete using (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: enforce @student.tsu.edu.ph domain on signup
-- ============================================================

create or replace function public.enforce_tsu_email()
returns trigger as $$
begin
  if new.email not like '%@student.tsu.edu.ph' then
    raise exception 'Only @student.tsu.edu.ph email addresses are allowed.';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists check_tsu_email on auth.users;
create trigger check_tsu_email
  before insert on auth.users
  for each row execute procedure public.enforce_tsu_email();

-- ============================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- STORAGE: listing-images bucket
-- ============================================================

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

create policy "listing_images_public_read" on storage.objects
  for select using (bucket_id = 'listing-images');

create policy "listing_images_auth_insert" on storage.objects
  for insert with check (bucket_id = 'listing-images' and auth.role() = 'authenticated');

create policy "listing_images_owner_delete" on storage.objects
  for delete using (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_listings_seller on listings(seller_id);
create index if not exists idx_listings_status on listings(status);
create index if not exists idx_listings_bumped on listings(last_bumped_at desc);
create index if not exists idx_messages_convo on messages(conversation_id, created_at);
