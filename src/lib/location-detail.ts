// src/lib/location-detail.ts
// Story #11: data loading and display formatting for the study-location detail page.

import type { AmenityKey } from '@/lib/locations';
import { supabase } from '@/lib/supabase';
import type { StudyLocation } from '@/types/study-location';

export const NOT_AVAILABLE = 'Not available';

export type AmenityMap = Partial<Record<AmenityKey, string>>;

export interface LocationDetail {
  location: StudyLocation;
  amenities: AmenityMap;
}

export class LocationNotFoundError extends Error {
  constructor() {
    super('Location not found');
    this.name = 'LocationNotFoundError';
  }
}

// Postgres "invalid input syntax for type uuid": a malformed id can't match a location.
const INVALID_UUID_CODE = '22P02';

export async function getLocationDetail(id: string): Promise<LocationDetail> {
  const [locationResult, amenityResult] = await Promise.all([
    supabase.from('study_locations').select('*').eq('id', id).maybeSingle(),
    supabase.from('location_amenities').select('amenity_type, value').eq('location_id', id),
  ]);

  if (locationResult.error) {
    if (locationResult.error.code === INVALID_UUID_CODE) throw new LocationNotFoundError();
    throw locationResult.error;
  }
  if (amenityResult.error) {
    if (amenityResult.error.code === INVALID_UUID_CODE) throw new LocationNotFoundError();
    throw amenityResult.error;
  }
  if (!locationResult.data) throw new LocationNotFoundError();

  const amenities: AmenityMap = {};
  for (const row of amenityResult.data ?? []) {
    if (row.value) amenities[row.amenity_type as AmenityKey] = row.value as string;
  }

  return { location: locationResult.data as StudyLocation, amenities };
}

// ---------------- Display formatting ----------------

const AMENITY_VALUE_LABELS: Record<string, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  yes: 'Yes',
  no: 'No',
  individual: 'Individual',
  group: 'Group',
  both: 'Individual & group',
};

/** Human-readable amenity value, or "Not available" when it is missing. */
export function formatAmenityValue(value: string | null | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return NOT_AVAILABLE;
  return AMENITY_VALUE_LABELS[trimmed.toLowerCase()] ?? trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** Text for an optional string field, or "Not available" when empty. */
export function formatOptionalText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : NOT_AVAILABLE;
}

/** "07:00" -> "7:00 AM", "24:00" -> "12:00 AM". Unparseable input is returned as-is. */
export function formatTime(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return time;
  const hour = Number(match[1]);
  const minute = match[2];
  if (hour > 24 || Number(minute) > 59) return time;
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? 'PM' : 'AM';
  const twelveHour = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${twelveHour}:${minute} ${suffix}`;
}

const WEEK_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type DayKey = (typeof WEEK_ORDER)[number];

const DAY_LABELS: Record<DayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const JS_DAY_TO_KEY: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export interface HoursRow {
  key: DayKey;
  label: string;
  value: string;
  available: boolean;
  isToday: boolean;
}

/**
 * One row per weekday, Monday first. Returns null when no hours are known at all,
 * so the caller can show a single "Not available" state. A day with no entry is
 * "Not available" rather than "Closed" so we never claim a closure we don't know.
 */
export function buildHoursRows(
  hours: StudyLocation['hours'],
  today: Date = new Date(),
): HoursRow[] | null {
  if (!hours || WEEK_ORDER.every((day) => hours[day] == null)) return null;

  const todayKey = JS_DAY_TO_KEY[today.getDay()];

  return WEEK_ORDER.map((key) => {
    const day = hours[key];
    let value = NOT_AVAILABLE;
    let available = false;

    if (day === '24h') {
      value = 'Open 24 hours';
      available = true;
    } else if (Array.isArray(day)) {
      available = true;
      value =
        day.length === 0
          ? 'Closed'
          : day.map(([open, close]) => `${formatTime(open)} – ${formatTime(close)}`).join(', ');
    }

    return { key, label: DAY_LABELS[key], value, available, isToday: key === todayKey };
  });
}
