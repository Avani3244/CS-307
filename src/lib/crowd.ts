// src/lib/crowd.ts
// Story #17: report current study-location conditions. Owner: Neha
// Requires supabase/schema_sprint1_additions.sql (crowd_reports table).

import { supabase } from '@/lib/supabase';

export const CROWD_LEVELS = ['low', 'medium', 'high'] as const;
export const SEATING_LEVELS = ['plenty', 'limited', 'full'] as const;
export const NOISE_LEVELS = ['quiet', 'moderate', 'loud'] as const;

export interface CrowdReportInput {
  crowd_level: (typeof CROWD_LEVELS)[number];
  seating_level: (typeof SEATING_LEVELS)[number];
  noise_level: (typeof NOISE_LEVELS)[number];
}

export interface CrowdReport extends CrowdReportInput {
  id: string;
  created_at: string;
}

/** Story #18: return only the newest report, including reports older than an hour. */
export async function getLatestCrowdReport(locationId: string): Promise<CrowdReport | null> {
  const { data, error } = await supabase
    .from('crowd_reports')
    .select('id, crowd_level, seating_level, noise_level, created_at')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle<CrowdReport>();

  if (error) throw error;
  return data;
}

export function isCrowdReportCurrent(createdAt: string, now = Date.now()): boolean {
  return now - new Date(createdAt).getTime() <= 60 * 60 * 1000;
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
