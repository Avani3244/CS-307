-- ============================================================
-- StudySpot - Supabase schema for Sprint 1
-- Run this whole file in the Supabase Dashboard > SQL Editor.
-- Covers: profiles, study locations + amenities, reviews + photos,
-- favorites, recently viewed, RLS policies, storage buckets, seed data.
-- ============================================================

-- ---------- 1. PROFILES ----------
-- Auth credentials live in Supabase Auth (auth.users).
-- This table holds the app-facing profile (story 5) and the admin flag (story 6).
create table public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  username   text unique not null,
  bio        text,
  photo_path text,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row when a user signs up (username defaults to email prefix;
-- the user can change it on the profile page).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, username)
  values (new.id, split_part(new.email, '@', 1) || '_' || left(new.id::text, 4));
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper used by admin-only policies.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where user_id = auth.uid()), false);
$$;

-- ---------- 2. STUDY LOCATIONS ----------
create table public.study_locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text,                -- e.g. 'Library', 'Cafe', 'Academic Building'
  building    text,
  campus_area text,
  address     text,
  latitude    double precision,
  longitude   double precision,
  description text,
  -- hours: {"mon":[["08:00","23:00"]], "tue":[...], ...} or {"mon":"24h"} — agree as a team
  hours       jsonb,
  updated_at  timestamptz not null default now()
);

create index idx_locations_name on public.study_locations using gin (to_tsvector('english', name));
create index idx_locations_category on public.study_locations (category);

-- Structured, filterable attributes (story 9 filters query this table).
create table public.location_amenities (
  location_id  uuid not null references public.study_locations (id) on delete cascade,
  amenity_type text not null,     -- 'quietness','wifi','outlets','seating','food','study_type'
  value        text not null,     -- 'high','medium','low','yes','no','individual','group',...
  primary key (location_id, amenity_type)
);

create index idx_amenities_type_value on public.location_amenities (amenity_type, value);

-- ---------- 3. REVIEWS ----------
create table public.reviews (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (user_id) on delete cascade,
  location_id      uuid not null references public.study_locations (id) on delete cascade,
  overall_rating   int  not null check (overall_rating between 1 and 5),
  -- category_ratings: {"quietness":4,"wifi":5,"outlets":3,...}
  category_ratings jsonb,
  review_text      text,
  created_at       timestamptz not null default now()
);

create index idx_reviews_location on public.reviews (location_id, created_at desc);
create index idx_reviews_user on public.reviews (user_id);

create table public.review_photos (
  id           uuid primary key default gen_random_uuid(),
  review_id    uuid not null references public.reviews (id) on delete cascade,
  storage_path text not null,
  created_at   timestamptz not null default now()
);

-- ---------- 4. FAVORITES & RECENTLY VIEWED ----------
create table public.favorites (
  user_id     uuid not null references public.profiles (user_id) on delete cascade,
  location_id uuid not null references public.study_locations (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, location_id)
);

create table public.recently_viewed (
  user_id     uuid not null references public.profiles (user_id) on delete cascade,
  location_id uuid not null references public.study_locations (id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  primary key (user_id, location_id)   -- upsert on view; order by viewed_at desc
);

-- ---------- 5. ROW LEVEL SECURITY ----------
alter table public.profiles          enable row level security;
alter table public.study_locations   enable row level security;
alter table public.location_amenities enable row level security;
alter table public.reviews           enable row level security;
alter table public.review_photos     enable row level security;
alter table public.favorites         enable row level security;
alter table public.recently_viewed   enable row level security;

-- Profiles: anyone signed in can read (usernames shown on reviews); only you edit yours.
create policy "profiles readable" on public.profiles
  for select to authenticated using (true);
create policy "update own profile" on public.profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Locations & amenities: readable by all signed-in users; writable only by admins (story 6 AC).
create policy "locations readable" on public.study_locations
  for select to authenticated using (true);
create policy "admin writes locations" on public.study_locations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "amenities readable" on public.location_amenities
  for select to authenticated using (true);
create policy "admin writes amenities" on public.location_amenities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Reviews: everyone reads; you can only create/edit/delete your own.
create policy "reviews readable" on public.reviews
  for select to authenticated using (true);
create policy "insert own review" on public.reviews
  for insert to authenticated with check (auth.uid() = user_id);
create policy "update own review" on public.reviews
  for update to authenticated using (auth.uid() = user_id);
create policy "delete own review" on public.reviews
  for delete to authenticated using (auth.uid() = user_id);

-- Review photos: readable by all; insert/delete only if you own the parent review.
create policy "review photos readable" on public.review_photos
  for select to authenticated using (true);
create policy "insert own review photo" on public.review_photos
  for insert to authenticated
  with check (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()));
create policy "delete own review photo" on public.review_photos
  for delete to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()));

-- Favorites & recently viewed: fully private per user.
create policy "own favorites" on public.favorites
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own history" on public.recently_viewed
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- 6. STORAGE ----------
-- Two public-read buckets; users may only write inside a folder named after their own uid.
-- Upload paths from the app: `${user.id}/avatar.jpg` and `${user.id}/${reviewId}.jpg`
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('review-photos', 'review-photos', true);

create policy "public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "upload own avatar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "update own avatar" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "public read review photos" on storage.objects
  for select using (bucket_id = 'review-photos');
create policy "upload own review photo" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own review photo file" on storage.objects
  for delete to authenticated
  using (bucket_id = 'review-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 7. SEED DATA (starter set; Avani's task 6.4 expands this) ----------
insert into public.study_locations (name, category, building, campus_area, address, latitude, longitude, description, hours) values
  ('Wilmeth Active Learning Center (WALC)', 'Library', 'WALC', 'Centennial Mall', '340 Centennial Mall Dr, West Lafayette, IN', 40.4274, -86.9132, 'Large active learning center with group and individual study space.', '{"mon":"24h","tue":"24h","wed":"24h","thu":"24h","fri":[["07:00","22:00"]],"sat":[["09:00","22:00"]],"sun":"24h"}'),
  ('Hicks Undergraduate Library', 'Library', 'HIKS', 'Academic Campus', '504 W State St, West Lafayette, IN', 40.4247, -86.9126, 'Underground undergraduate library, quiet study.', '{"mon":"24h","tue":"24h","wed":"24h","thu":"24h","fri":[["07:00","20:00"]],"sat":[["10:00","20:00"]],"sun":"24h"}'),
  ('Lawson Computer Science Building Commons', 'Academic Building', 'LWSN', 'Academic Campus', '305 N University St, West Lafayette, IN', 40.4277, -86.9169, 'CS building commons with tables and whiteboards.', '{"mon":[["07:00","23:00"]],"tue":[["07:00","23:00"]],"wed":[["07:00","23:00"]],"thu":[["07:00","23:00"]],"fri":[["07:00","21:00"]],"sat":[["09:00","18:00"]],"sun":[["12:00","23:00"]]}'),
  ('Purdue Memorial Union', 'Union', 'PMU', 'State Street', '101 N Grant St, West Lafayette, IN', 40.4249, -86.9109, 'Union building with couches, tables, and food court.', '{"mon":[["06:00","24:00"]],"tue":[["06:00","24:00"]],"wed":[["06:00","24:00"]],"thu":[["06:00","24:00"]],"fri":[["06:00","24:00"]],"sat":[["07:00","24:00"]],"sun":[["07:00","24:00"]]}'),
  ('Greyhouse Coffee & Supply Co.', 'Cafe', null, 'Chauncey Hill', '100 Northwestern Ave, West Lafayette, IN', 40.4232, -86.9081, 'Popular off-campus coffee shop; busy but great atmosphere.', '{"mon":[["07:00","23:00"]],"tue":[["07:00","23:00"]],"wed":[["07:00","23:00"]],"thu":[["07:00","23:00"]],"fri":[["07:00","23:00"]],"sat":[["08:00","23:00"]],"sun":[["08:00","22:00"]]}');

insert into public.location_amenities (location_id, amenity_type, value)
select id, a.t, a.v from public.study_locations,
lateral (values
  ('quietness', case name when 'Hicks Undergraduate Library' then 'high' when 'Greyhouse Coffee & Supply Co.' then 'low' else 'medium' end),
  ('wifi', 'high'),
  ('outlets', case name when 'Purdue Memorial Union' then 'medium' else 'high' end),
  ('seating', 'high'),
  ('food', case when name in ('Purdue Memorial Union','Greyhouse Coffee & Supply Co.') then 'yes' else 'no' end),
  ('study_type', case name when 'Hicks Undergraduate Library' then 'individual' when 'Lawson Computer Science Building Commons' then 'group' else 'both' end)
) as a(t, v);

-- ---------- 8. AFTER RUNNING THIS FILE ----------
-- 1) Register an account through the app, then make it an admin:
--      update public.profiles set is_admin = true where username = 'YOUR_USERNAME';
-- 2) Verify RLS: as a non-admin, an insert into study_locations should fail.
