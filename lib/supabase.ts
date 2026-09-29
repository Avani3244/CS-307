// lib/supabase.ts
// StudySpot Supabase client for Expo / React Native.
// Install first:
//   npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
//
// .env (in repo root, listed in .gitignore — get values from Dashboard > Settings > API Keys):
//   EXPO_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
//   EXPO_PUBLIC_SUPABASE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: AsyncStorage,   // persists the session on-device -> User Story 4 (stay logged in)
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // no browser URL on native
  },
});

// Keep the session token refreshed while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

/* Usage examples for the team:

// Story 1 - register (verification email is sent automatically when
// "Confirm email" is enabled in Dashboard > Authentication):
await supabase.auth.signUp({ email, password });

// Story 2 - login / logout:
await supabase.auth.signInWithPassword({ email, password });
await supabase.auth.signOut();

// Story 4 - restore session on app open:
const { data: { session } } = await supabase.auth.getSession();

// Story 7 - browse locations:
const { data } = await supabase
  .from('study_locations')
  .select('*, location_amenities(*)')
  .order('name')
  .limit(25);

// Story 9 - filter (e.g. quiet + outlets): query amenities and join,
// or filter per amenity_type/value pair:
const { data: quiet } = await supabase
  .from('location_amenities')
  .select('location_id')
  .eq('amenity_type', 'quietness')
  .eq('value', 'high');

// Story 15 - upload a review photo (path must start with the user's uid
// to satisfy the storage RLS policy):
const { data: { user } } = await supabase.auth.getUser();
await supabase.storage
  .from('review-photos')
  .upload(`${user!.id}/${reviewId}.jpg`, fileBytes, { contentType: 'image/jpeg' });
*/
