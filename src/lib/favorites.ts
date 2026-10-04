// src/lib/favorites.ts
// Story #12: view and manage favorite study locations. Owner: Neha

import { supabase } from '@/lib/supabase';
import type { StudyLocation } from '@/lib/locations';

export async function listFavoriteIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('favorites')
    .select('location_id')
    .eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.location_id as string));
}

export async function listFavoriteLocations(userId: string): Promise<StudyLocation[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('created_at, study_locations(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((r) => r.study_locations as unknown as StudyLocation)
    .filter(Boolean);
}

export async function addFavorite(userId: string, locationId: string) {
  const { error } = await supabase
    .from('favorites')
    .insert({ user_id: userId, location_id: locationId });
  if (error && error.code !== '23505') throw error; // ignore duplicate taps
}

export async function removeFavorite(userId: string, locationId: string) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('user_id', userId)
    .eq('location_id', locationId);
  if (error) throw error;
}
