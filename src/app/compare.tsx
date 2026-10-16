// src/app/compare.tsx - Compare study locations side by side
// Story #19: rating, distance, hours, and amenities in aligned comparison fields.

import { useCompare } from '@/context/CompareContext';
import {
  COMPARE_AMENITIES,
  fetchCompareRows,
  normalizeCompareItem,
  type CompareRow,
} from '@/lib/compare';
import { NOT_AVAILABLE } from '@/lib/location-detail';
import type { Coords } from '@/lib/locations';
import * as Location from 'expo-location';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const COLORS = {
  page: '#F1E2D2',
  card: '#FFF9F2',
  text: '#21160F',
  muted: '#9A816B',
  gold: '#C98A38',
  goldDark: '#A96F2D',
  border: '#E2CCB8',
  divider: '#EAD7C6',
  goldSoft: '#F4DFC3',
  green: '#286022',
  red: '#A22B25',
};

type LoadState = 'loading' | 'error' | 'ready';

/** "Study spot A", "Study spot B", ... in column order. */
const spotLabel = (index: number) => `Study spot ${String.fromCharCode(65 + index)}`;

export default function CompareScreen() {
  const router = useRouter();
  const { ids, remove } = useCompare();

  const [rows, setRows] = useState<CompareRow[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  const idsKey = ids.join(',');

  const load = useCallback(async () => {
    const wanted = idsKey ? idsKey.split(',') : [];
    if (wanted.length === 0) {
      setRows([]);
      setState('ready');
      return;
    }
    try {
      setRows(await fetchCompareRows(wanted));
      setState('ready');
    } catch {
      setState('error');
    }
  }, [idsKey]);

  useEffect(() => {
    load();
  }, [load]);

  // Use the position only if permission was already granted; never prompt on open.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (!cancelled) setLocationDenied(true);
          return;
        }
        const position = await Location.getCurrentPositionAsync({});
        if (!cancelled) {
          setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        }
      } catch {
        if (!cancelled) setLocationDenied(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enableLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const position = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setLocationDenied(false);
    } catch {
      // Distance simply stays "Not available".
    }
  };

  // Removal is applied from the selection immediately, without waiting for a refetch.
  const items = useMemo(
    () =>
      rows
        .filter((row) => ids.includes(row.location.id))
        .map((row) => normalizeCompareItem(row, coords)),
    [rows, ids, coords],
  );

  const openDetails = (id: string) =>
    router.push({ pathname: '/location/[id]', params: { id } });

  if (state === 'loading') {
    return (
      <View style={[styles.page, styles.center]}>
        <Stack.Screen options={{ title: 'Compare' }} />
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.centerNote}>Loading comparison…</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={[styles.page, styles.center]}>
        <Stack.Screen options={{ title: 'Compare' }} />
        <Text style={styles.centerTitle}>Couldn't load the comparison</Text>
        <Text style={styles.centerNote}>Check your connection and try again.</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.primaryButton}
          onPress={() => {
            setState('loading');
            load();
          }}
        >
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (items.length < 2) {
    return (
      <View style={[styles.page, styles.center]}>
        <Stack.Screen options={{ title: 'Compare' }} />
        <Text style={styles.centerTitle}>Pick at least two study spots</Text>
        <Text style={styles.centerNote}>
          Tap the compare icon on a location in Discover or on its detail page, then come back here.
        </Text>
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Compare' }} />

      <View style={styles.headerRow}>
        {items.map((item, index) => (
          <View key={item.id} style={styles.headerCell}>
            <View style={styles.spotBadge}>
              <Text style={styles.spotBadgeText}>{spotLabel(index)}</Text>
            </View>
            <Text style={styles.headerName} numberOfLines={3}>
              {item.name}
            </Text>
            <Text style={styles.headerCategory} numberOfLines={1}>
              {item.category ?? NOT_AVAILABLE}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`View details for ${item.name}`}
              style={styles.detailsButton}
              onPress={() => openDetails(item.id)}
            >
              <Text style={styles.detailsButtonText}>View details</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${item.name} from compare`}
              style={styles.removeButton}
              onPress={() => remove(item.id)}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Section title="Overview" count={items.length}>
        <Metric label="Rating" values={items.map((item) => item.rating)} />
        <Metric label="Distance" values={items.map((item) => item.distance)} />
        <Metric
          label="Status"
          values={items.map((item) => item.status)}
          tone={(value) =>
            value === 'Open now' ? 'good' : value === 'Closed now' ? 'bad' : undefined
          }
          last
        />
        {locationDenied && (
          <Pressable accessibilityRole="button" style={styles.inlineLink} onPress={enableLocation}>
            <Text style={styles.inlineLinkText}>Turn on location to see distance</Text>
          </Pressable>
        )}
      </Section>

      <Section title="Operating hours" count={items.length}>
        <Metric label="Today" values={items.map((item) => item.todayHours)} />
        {items[0].weekHours.map((day, index) => (
          <Metric
            key={day.label}
            label={day.label}
            values={items.map((item) => item.weekHours[index]?.value ?? NOT_AVAILABLE)}
            last={index === items[0].weekHours.length - 1}
          />
        ))}
      </Section>

      <Section title="Amenities" count={items.length}>
        {COMPARE_AMENITIES.map(({ key, label }, index) => (
          <Metric
            key={key}
            label={label}
            values={items.map((item) => item.amenities[key])}
            last={index === COMPARE_AMENITIES.length - 1}
          />
        ))}
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {/* Repeats the column labels so each section says which side is which. */}
      <View style={styles.columnLabels}>
        {Array.from({ length: count }, (_, index) => (
          <Text key={index} style={styles.columnLabel}>
            {spotLabel(index)}
          </Text>
        ))}
      </View>
      {children}
    </View>
  );
}

/** One comparison field: its label, then one aligned value per location. */
function Metric({
  label,
  values,
  tone,
  last,
}: {
  label: string;
  values: string[];
  tone?: (value: string) => 'good' | 'bad' | undefined;
  last?: boolean;
}) {
  return (
    <View style={[styles.metric, last && styles.metricLast]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <View style={styles.metricValues}>
        {values.map((value, index) => {
          const unavailable = value === NOT_AVAILABLE;
          const kind = tone?.(value);
          return (
            <Text
              key={index}
              style={[
                styles.metricValue,
                unavailable && styles.unavailable,
                kind === 'good' && { color: COLORS.green },
                kind === 'bad' && { color: COLORS.red },
              ]}
            >
              {value}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.page },
  content: { padding: 16, paddingBottom: 40 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  centerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  centerNote: { marginTop: 8, fontSize: 14, color: COLORS.muted, textAlign: 'center' },
  primaryButton: {
    marginTop: 18,
    minHeight: 44,
    paddingHorizontal: 24,
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.gold,
  },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  headerRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  headerCell: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  spotBadge: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: COLORS.goldSoft,
  },
  spotBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.goldDark },
  headerName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  headerCategory: { marginTop: 4, fontSize: 12, color: COLORS.muted, fontWeight: '600' },
  detailsButton: {
    marginTop: 10,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.goldDark,
  },
  detailsButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  removeButton: { minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.goldDark,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  columnLabels: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  columnLabel: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.goldDark,
    letterSpacing: 0.3,
  },
  metric: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
  },
  metricLast: { borderBottomWidth: 0 },
  metricLabel: { fontSize: 12, color: COLORS.muted, fontWeight: '700', marginBottom: 4 },
  metricValues: { flexDirection: 'row', gap: 8 },
  metricValue: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '600' },
  unavailable: { color: COLORS.muted, fontStyle: 'italic', fontWeight: '400' },
  inlineLink: { minHeight: 40, justifyContent: 'center' },
  inlineLinkText: { color: COLORS.goldDark, fontSize: 13, fontWeight: '700' },
});
