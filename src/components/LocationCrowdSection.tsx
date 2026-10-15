import { getLatestCrowdReport, isCrowdReportCurrent, type CrowdReport } from '@/lib/crowd';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, View } from 'react-native';

interface Props {
  locationId: string;
}

export default function LocationCrowdSection({ locationId }: Props) {
  const [report, setReport] = useState<CrowdReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [refreshKey, setRefreshKey] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    let requestId = 0;

    const load = async () => {
      const currentRequest = ++requestId;
      setLoading(true);
      setError('');
      setReport(null);
      try {
        const latest = await getLatestCrowdReport(locationId);
        if (active && currentRequest === requestId) {
          setReport(latest);
          setNow(Date.now());
        }
      } catch {
        if (active && currentRequest === requestId) {
          setError('Could not load crowd conditions. Please try again.');
        }
      } finally {
        if (active && currentRequest === requestId) setLoading(false);
      }
    };

    void load();
    // Keep the status accurate when the report crosses the one-hour boundary.
    const timer = setInterval(() => setNow(Date.now()), 1000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load();
    });

    return () => {
      active = false;
      clearInterval(timer);
      subscription.remove();
    };
  }, [locationId, refreshKey]));

  const current = report ? isCrowdReportCurrent(report.created_at, now) : false;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Latest crowd conditions</Text>
        {report && !loading && (
          <Text style={[styles.status, current ? styles.current : styles.stale]}>
            {current ? 'Current' : 'Stale'}
          </Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading crowd conditions" color="#C98A38" />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : report ? (
        <View style={styles.details}>
          <Text style={styles.detail}>Crowd level: {report.crowd_level}</Text>
          <Text style={styles.detail}>Seating availability: {report.seating_level}</Text>
          <Text style={styles.detail}>Noise level: {report.noise_level}</Text>
          <Text style={styles.timestamp}>
            Submitted: {new Date(report.created_at).toLocaleString()}
          </Text>
          {!current && (
            <Text style={styles.timestamp}>This report is more than 60 minutes old.</Text>
          )}
        </View>
      ) : (
        <Text style={styles.detail}>No Recent Crowd Data</Text>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={error ? 'Retry loading crowd conditions' : 'Refresh crowd conditions'}
        disabled={loading}
        onPress={() => setRefreshKey((key) => key + 1)}
        style={[styles.refresh, loading && styles.disabled]}
      >
        <Text style={styles.refreshText}>{error ? 'Try again' : 'Refresh conditions'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 17,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: '#E2CCB8',
    backgroundColor: '#FFF9F2',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: '#21160F' },
  status: { fontSize: 14, fontWeight: '700' },
  current: { color: '#2E7D32' },
  stale: { color: '#A96F2D' },
  details: { gap: 6 },
  detail: { fontSize: 14, color: '#21160F' },
  timestamp: { fontSize: 13, color: '#78614E' },
  error: { fontSize: 14, color: '#A22B25' },
  refresh: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', marginTop: 6 },
  refreshText: { color: '#A96F2D', fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
