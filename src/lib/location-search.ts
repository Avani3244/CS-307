import type { StudyLocation } from '@/types/study-location';

/** Match a partial query against any searchable location field. */
export function matchesLocationSearch(location: StudyLocation, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    location.name,
    location.building,
    location.campus_area,
    location.address,
    location.category,
  ].some((value) => value?.toLowerCase().includes(normalizedQuery));
}
