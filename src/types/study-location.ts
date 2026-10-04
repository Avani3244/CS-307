export type LocationHours =
  | '24h'
  | [string, string][]
  | null;

export interface StudyLocation {
  id: string;
  name: string;
  category: string | null;
  building: string | null;
  campus_area: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;

  hours: {
    sun?: LocationHours;
    mon?: LocationHours;
    tue?: LocationHours;
    wed?: LocationHours;
    thu?: LocationHours;
    fri?: LocationHours;
    sat?: LocationHours;
  } | null;

  reviews?: {
    overall_rating: number;
  }[];
}