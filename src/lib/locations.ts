import { supabase } from '@/lib/supabase';
import { StudyLocation } from '@/types/study-location';

/** StudyLocation plus the distance badge populated in nearby mode (story #7). */
export type DiscoverLocation = StudyLocation & { distanceKm?: number };
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
// Filtering, sorting, and nearby distance ordering for Discover
// (stories #9 and #7). Owner: Neha
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
export type SortOption = 'name' | 'category' | 'distance';

export interface Coords {
  latitude: number;
  longitude: number;
}

/** Haversine distance in km between two coordinates (story #7). */
export function distanceKm(a: Coords, b: Coords): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Fetch study locations matching ALL selected amenity filters (story #9).
 * Each selected filter runs one indexed query against location_amenities;
 * the location id sets are intersected, then matching locations are fetched.
 */
export async function fetchLocations(opts: {
  filters?: Filters;
  sort?: SortOption;
  coords?: Coords | null;
}): Promise<DiscoverLocation[]> {
  const { filters = {}, sort = 'name', coords } = opts;
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
  const orderColumn = sort === 'distance' ? 'name' : sort;
  const { data, error } = await query.order(orderColumn, { ascending: true });
  if (error) throw error;

  let locations = (data ?? []) as DiscoverLocation[];

  if (coords) {
    locations = locations.map((l) =>
      l.latitude != null && l.longitude != null
        ? { ...l, distanceKm: distanceKm(coords, { latitude: l.latitude, longitude: l.longitude }) }
        : l,
    );
  }

  if (sort === 'distance' && coords) {
    locations.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }

  return locations;
}
