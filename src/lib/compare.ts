// src/lib/compare.ts
// Story #19: load and normalize the fields shown in the side-by-side comparison.
// Every field is turned into display text up front, so a missing value becomes
// "Not available" here and the compare screen never has to guess.

import { getAverageRating, isLocationOpen } from '@/lib/location-hours';
import {
  buildHoursRows,
  formatAmenityValue,
  NOT_AVAILABLE,
  type AmenityMap,
} from '@/lib/location-detail';
import { distanceKm, type AmenityKey, type Coords } from '@/lib/locations';
import { supabase } from '@/lib/supabase';
import type { StudyLocation } from '@/types/study-location';

export const COMPARE_AMENITIES: { key: AmenityKey; label: string }[] = [
  { key: 'seating', label: 'Seating' },
  { key: 'wifi', label: 'Wi-Fi' },
  { key: 'outlets', label: 'Outlets' },
  { key: 'food', label: 'Food access' },
  { key: 'quietness', label: 'Quietness' },
  { key: 'study_type', label: 'Study type' },
];

/** A location as loaded from Supabase, before display formatting. */
export interface CompareRow {
  location: StudyLocation;
  amenities: AmenityMap;
}

export interface CompareItem {
  id: string;
  name: string;
  category: string | null;
  rating: string;
  distance: string;
  status: string;
  todayHours: string;
  weekHours: { label: string; value: string }[];
  amenities: Record<AmenityKey, string>;
}

const WEEK_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Turn one loaded location into display-ready, aligned comparison fields. */
export function normalizeCompareItem(
  { location, amenities }: CompareRow,
  coords: Coords | null,
  now: Date = new Date(),
): CompareItem {
  const reviewCount = location.reviews?.length ?? 0;
  const average = getAverageRating(location.reviews);
  const rating =
    average === null
      ? NOT_AVAILABLE
      : `★ ${average.toFixed(1)} (${reviewCount} ${reviewCount === 1 ? 'review' : 'reviews'})`;

  const distance =
    coords && location.latitude != null && location.longitude != null
      ? `${distanceKm(coords, { latitude: location.latitude, longitude: location.longitude }).toFixed(1)} km`
      : NOT_AVAILABLE;

  const open = isLocationOpen(location.hours);
  const status = open === null ? NOT_AVAILABLE : open ? 'Open now' : 'Closed now';

  const hoursRows = buildHoursRows(location.hours, now);
  const todayHours = hoursRows?.find((row) => row.isToday)?.value ?? NOT_AVAILABLE;
  const weekHours = hoursRows
    ? hoursRows.map((row) => ({ label: row.label, value: row.value }))
    : WEEK_LABELS.map((label) => ({ label, value: NOT_AVAILABLE }));

  const formattedAmenities = {} as Record<AmenityKey, string>;
  for (const { key } of COMPARE_AMENITIES) {
    formattedAmenities[key] = formatAmenityValue(amenities[key]);
  }

  return {
    id: location.id,
    name: location.name,
    category: location.category?.trim() || null,
    rating,
    distance,
    status,
    todayHours,
    weekHours,
    amenities: formattedAmenities,
  };
}

/**
 * Load the selected locations (with their reviews and amenities), in the order
 * they were selected. Ids that no longer exist are dropped.
 */
export async function fetchCompareRows(ids: string[]): Promise<CompareRow[]> {
  if (ids.length === 0) return [];

  const [locationResult, amenityResult] = await Promise.all([
    supabase.from('study_locations').select('*, reviews(overall_rating)').in('id', ids),
    supabase.from('location_amenities').select('location_id, amenity_type, value').in('location_id', ids),
  ]);

  if (locationResult.error) throw locationResult.error;
  if (amenityResult.error) throw amenityResult.error;

  const amenitiesByLocation = new Map<string, AmenityMap>();
  for (const row of amenityResult.data ?? []) {
    if (!row.value) continue;
    const existing = amenitiesByLocation.get(row.location_id as string) ?? {};
    existing[row.amenity_type as AmenityKey] = row.value as string;
    amenitiesByLocation.set(row.location_id as string, existing);
  }

  const locationsById = new Map(
    ((locationResult.data ?? []) as StudyLocation[]).map((location) => [location.id, location]),
  );

  return ids
    .map((id) => locationsById.get(id))
    .filter((location): location is StudyLocation => Boolean(location))
    .map((location) => ({ location, amenities: amenitiesByLocation.get(location.id) ?? {} }));
}
