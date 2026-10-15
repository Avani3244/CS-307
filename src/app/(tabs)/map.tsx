import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import StudyLocationMap from '@/components/study-location-map';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { getStudyLocations } from '@/lib/locations';
import type { StudyLocation } from '@/types/study-location';

export default function MapScreen() {
  const theme = useTheme();
  const [locations, setLocations] = useState<StudyLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setLocations(await getStudyLocations({ includeRatings: true }));
    } catch {
      setError('Could not load study locations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasMarkers = locations.some(
    (location) => location.latitude != null && location.longitude != null
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <ThemedText type="subtitle" style={styles.heading}>Campus map</ThemedText>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#208AEF" accessibilityLabel="Loading study locations" />
          <ThemedText style={styles.message}>Loading study locations…</ThemedText>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText style={styles.message}>{error}</ThemedText>
          <Pressable accessibilityRole="button" onPress={load} style={styles.retryButton}>
            <ThemedText style={styles.retryLabel}>Try again</ThemedText>
          </Pressable>
        </View>
      ) : (
        <>
          {!hasMarkers && (
            <ThemedText style={styles.message}>No study locations with coordinates are available yet.</ThemedText>
          )}
          <StudyLocationMap locations={locations} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  heading: { paddingHorizontal: 16, paddingVertical: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  message: { textAlign: 'center', padding: 16 },
  retryButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 22, borderRadius: 10, backgroundColor: '#208AEF' },
  retryLabel: { color: '#ffffff', fontWeight: '700' },
});
