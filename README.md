# StudySpot

CS 30700 - Software Engineering I, Team 13

A campus-focused app that helps Purdue students discover, compare, rate, and review study locations by the factors that matter for studying: quietness, Wi-Fi, outlets, seating, food access, and hours.

**Team:** Adya Pattanaik, Avani Nagar, Neha Mahesh, Sri Madur, Tiya Shah
**Project Coordinator:** Mikayla Farnell

**Stack:** React Native + Expo (expo-router, TypeScript) · Supabase (Auth, PostgreSQL + RLS, Storage)

## First-time setup

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/Avani3244/CS-307.git
   cd CS-307
   npm install
   npx expo install --fix   # aligns native package versions with the Expo SDK
   ```

2. Create your env file:

   ```bash
   cp .env.example .env
   ```

   Fill in the two values from the pinned message in the team chat (they come from Supabase Dashboard > Settings > API Keys). Never commit `.env`.

3. Run the app:

   ```bash
   npx expo start
   ```

   Scan the QR code with the Expo Go app on your phone, or press `i` / `a` for a simulator.

## Supabase

- The database schema lives in [`supabase/schema.sql`](supabase/schema.sql). Run it once in the team's shared Supabase project (Dashboard > SQL Editor); after that, teammates do **not** need to run it again.
-
- The app talks to Supabase through the shared client in [`src/lib/supabase.ts`](src/lib/supabase.ts):

  ```ts
  import { supabase } from '@/lib/supabase';
  ```

  It has usage examples for auth, queries, and photo uploads in the comments.
- To make your account an admin (for the admin location screens), ask whoever has dashboard access to run:

  ```sql
  update public.profiles set is_admin = true where username = 'your_username';
  ```

## Project structure

```
src/app/         screens (expo-router file-based routing)
src/components/  shared UI components
src/lib/         supabase client and other shared modules
supabase/        database schema (source of truth for the data model)
```


