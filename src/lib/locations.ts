import { supabase } from '@/lib/supabase';
import { StudyLocation } from '@/types/study-location';

export type { StudyLocation } from '@/types/study-location';

export async function getStudyLocations(): Promise<StudyLocation[]> {
  const { data, error } = await supabase
    .from('study_locations')
    .select(`
      id,
      name,
      category,
      building,
      campus_area,
      address,
      latitude,
      longitude,
      description,
      hours
    `)
    .order('name');

  if (error) {
    console.error('Error loading study locations:', error.message);
    throw error;
  }

  return (data ?? []) as StudyLocation[];
}

// ------------------------------------------------------------
// Filtering and sorting for Discover (story #9). Owner: Neha
// ------------------------------------------------------------

export type AmenityKey = 'quietness' | 'wifi' | 'outlets' | 'seating' | 'food' | 'study_type';

// The exact value vocabulary seeded in supabase/schema.sql
export const AMENITY_OPTIONS: Record<AmenityKey, string[]> = {
  quietness: ['high', 'medium', 'low'],
  wifi: ['high', 'medium', 'low'],
  outlets: ['high', 'medium', 'low'],
  seating: ['high', 'medium', 'low'],
  food: ['yes', 'no'],
  study_type: ['individual', 'group', 'both'],
};

export const AMENITY_LABELS: Record<AmenityKey, string> = {
  quietness: 'Quietness',
  wifi: 'Wi-Fi',
  outlets: 'Outlets',
  seating: 'Seating',
  food: 'Food nearby',
  study_type: 'Study type',
};

export type Filters = Partial<Record<AmenityKey, string>>;
export type SortOption = 'name' | 'category';

/**
 * Fetch study locations matching ALL selected amenity filters (story #9).
 * Each selected filter runs one indexed query against location_amenities;
 * the location id sets are intersected, then matching locations are fetched.
 */
export async function fetchLocations(opts: {
  filters?: Filters;
  sort?: SortOption;
}): Promise<StudyLocation[]> {
  const { filters = {}, sort = 'name' } = opts;
  const selected = Object.entries(filters).filter(([, v]) => !!v) as [AmenityKey, string][];

  let ids: string[] | null = null;
  for (const [amenityType, value] of selected) {
    const { data, error } = await supabase
      .from('location_amenities')
      .select('location_id')
      .eq('amenity_type', amenityType)
      .eq('value', value);
    if (error) throw error;
    const matched = new Set((data ?? []).map((r) => r.location_id as string));
    ids = ids === null ? [...matched] : ids.filter((id) => matched.has(id));
    if (ids.length === 0) return []; // no-match: AC requires a clear empty state
  }

  let query = supabase.from('study_locations').select('*');
  if (ids !== null) query = query.in('id', ids);
  const { data, error } = await query.order(sort, { ascending: true });
  if (error) throw error;

  return (data ?? []) as StudyLocation[];
}
