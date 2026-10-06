// src/lib/crowd.ts
// Story #17: report current study-location conditions. Owner: Neha
// Requires supabase/schema_update_sprint1_final.sql (crowd_reports table).

import { supabase } from '@/lib/supabase';

export const CROWD_LEVELS = ['low', 'medium', 'high'] as const;
export const SEATING_LEVELS = ['plenty', 'limited', 'full'] as const;
export const NOISE_LEVELS = ['quiet', 'moderate', 'loud'] as const;

export interface CrowdReportInput {
  crowd_level: (typeof CROWD_LEVELS)[number];
  seating_level: (typeof SEATING_LEVELS)[number];
  noise_level: (typeof NOISE_LEVELS)[number];
}

export async function submitCrowdReport(
  userId: string,
  locationId: string,
  report: CrowdReportInput,
) {
  const { error } = await supabase.from('crowd_reports').insert({
    user_id: userId,
    location_id: locationId,
    ...report,
  });
  if (error) throw error;
}
