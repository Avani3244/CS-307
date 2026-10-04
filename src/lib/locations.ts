import { supabase } from '@/lib/supabase';
import { StudyLocation } from '@/types/study-location';

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