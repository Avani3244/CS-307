# StudySpot

CS 30700 - Software Engineering I, Team 13

A campus-focused app that helps Purdue students discover, compare, rate, and review study locations by the factors that matter for studying: quietness, Wi-Fi, outlets, seating, food access, and hours.

**Team:** Adya Pattanaik, Avani Nagar, Neha Mahesh, Sri Madur, Tiya Shah
**Project Coordinator:** Mikayla Farnell

## Backend (Supabase) - set up and running

- **`supabase/schema.sql`** - the full database schema: tables (profiles, study locations, amenities, reviews, review photos, favorites, recently viewed), Row Level Security policies, storage buckets for photos, and seeded Purdue locations. It has been run against the team's shared Supabase project; treat this file as the source of truth for the data model. If your user story needs a schema change, post the SQL in the team chat before running it, and update this file in the same PR.
- **`lib/supabase.ts`** - the shared Supabase client the app will import (with usage examples for auth, queries, and photo uploads in the comments). Move it into the app's folder structure once the Expo project is added.
- **`.env.example`** - copy to `.env` and fill in the two values pinned in the team chat. Never commit `.env`.

The Expo app scaffold is set up with Expo Router, and the shared Supabase client is located at src/lib/supabase.ts.
