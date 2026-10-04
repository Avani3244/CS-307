-- ============================================================
-- StudySpot - Sprint 1 schema additions
-- Adds crowd condition reports (stories 17/18), review helpful
-- marks (story 15), and content reports (story 16).
-- Run once in the Supabase SQL Editor, after schema.sql.
-- ============================================================

-- Crowd condition reports (stories 17/18). Each report is a timestamped
-- observation; "current" conditions are derived from recent rows.
create table public.crowd_reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (user_id) on delete cascade,
  location_id   uuid not null references public.study_locations (id) on delete cascade,
  crowd_level   text not null check (crowd_level in ('low','medium','high')),
  seating_level text not null check (seating_level in ('plenty','limited','full')),
  noise_level   text not null check (noise_level in ('quiet','moderate','loud')),
  created_at    timestamptz not null default now()
);

create index idx_crowd_reports_location
  on public.crowd_reports (location_id, created_at desc);

-- Latest reports within a recency window, for the current-conditions view (story 18).
-- App call: supabase.rpc('latest_crowd_conditions', { loc_id, window_minutes: 120 })
create or replace function public.latest_crowd_conditions(loc_id uuid, window_minutes int default 120)
returns table (crowd_level text, seating_level text, noise_level text, reported_at timestamptz)
language sql stable as $$
  select crowd_level, seating_level, noise_level, created_at
  from public.crowd_reports
  where location_id = loc_id
    and created_at > now() - make_interval(mins => window_minutes)
  order by created_at desc
  limit 10;
$$;

-- Review helpful marks (story 15): one mark per user per review.
create table public.review_helpful (
  review_id  uuid not null references public.reviews (id) on delete cascade,
  user_id    uuid not null references public.profiles (user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);

-- Content reports (story 16): user reports of inappropriate reviews or photos.
create table public.content_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (user_id) on delete cascade,
  target_type text not null check (target_type in ('review','review_photo')),
  target_id   uuid not null,
  reason      text not null,
  status      text not null default 'pending' check (status in ('pending','resolved','dismissed')),
  created_at  timestamptz not null default now()
);

create index idx_content_reports_status on public.content_reports (status, created_at);

-- ---------------- Row Level Security ----------------
alter table public.crowd_reports   enable row level security;
alter table public.review_helpful  enable row level security;
alter table public.content_reports enable row level security;

-- Crowd reports: everyone signed in can read; you submit as yourself.
create policy "crowd reports readable" on public.crowd_reports
  for select to authenticated using (true);
create policy "submit own crowd report" on public.crowd_reports
  for insert to authenticated with check (auth.uid() = user_id);

-- Helpful marks: readable (counts shown to all); add/remove only your own,
-- and not on your own review.
create policy "helpful readable" on public.review_helpful
  for select to authenticated using (true);
create policy "mark helpful" on public.review_helpful
  for insert to authenticated
  with check (auth.uid() = user_id
    and not exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()));
create policy "unmark helpful" on public.review_helpful
  for delete to authenticated using (auth.uid() = user_id);

-- Content reports: you can file and see your own; admins see and update all.
create policy "file content report" on public.content_reports
  for insert to authenticated with check (auth.uid() = reporter_id);
create policy "see own reports or admin" on public.content_reports
  for select to authenticated using (auth.uid() = reporter_id or public.is_admin());
create policy "admin resolves reports" on public.content_reports
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Quick check after running:
--   select * from latest_crowd_conditions((select id from study_locations limit 1));
-- returns no rows until reports exist, which confirms the table and function are in place.
