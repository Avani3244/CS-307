// src/app/location/[id].tsx - Study location detail
// Story #11: name, category, address, description, hours, and amenities for one location.

import { isLocationOpen } from '@/lib/location-hours';
import {
  buildHoursRows,
  formatAmenityValue,
  formatOptionalText,
  getLocationDetail,
  LocationNotFoundError,
  NOT_AVAILABLE,
  type LocationDetail,
} from '@/lib/location-detail';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
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
  green: '#286022',
  greenBackground: '#EAF4DE',
  red: '#A22B25',
  redBackground: '#F9DDD7',
};

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'not-found' }
  | { status: 'ready'; detail: LocationDetail };

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  // Guards against an older request resolving after a newer one (retry / id change).
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const current = ++requestId.current;
    try {
      const detail = await getLocationDetail(String(id));
      if (current === requestId.current) setState({ status: 'ready', detail });
    } catch (error) {
      if (current !== requestId.current) return;
      setState({ status: error instanceof LocationNotFoundError ? 'not-found' : 'error' });
    }
  }, [id]);

  useEffect(() => {
    setState({ status: 'loading' });
    load();
  }, [load]);

  const retry = () => {
    setState({ status: 'loading' });
    load();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (state.status === 'loading') {
    return (
      <View style={[styles.page, styles.center]}>
        <Stack.Screen options={{ title: 'Location Details' }} />
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.centerNote}>Loading location details…</Text>
      </View>
    );
  }

  if (state.status === 'error') {
    return (
      <View style={[styles.page, styles.center]}>
        <Stack.Screen options={{ title: 'Location Details' }} />
        <Text style={styles.centerTitle}>Couldn't load this location</Text>
        <Text style={styles.centerNote}>
          Check your connection and try again.
        </Text>
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={retry}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.linkButton} onPress={() => router.back()}>
          <Text style={styles.linkButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (state.status === 'not-found') {
    return (
      <View style={[styles.page, styles.center]}>
        <Stack.Screen options={{ title: 'Location Details' }} />
        <Text style={styles.centerTitle}>Location not found</Text>
        <Text style={styles.centerNote}>
          This study spot may have been removed or the link is no longer valid.
        </Text>
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => router.back()}>
          <Text style={styles.primaryButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const { location, amenities } = state.detail;
  const open = isLocationOpen(location.hours);
  const hoursRows = buildHoursRows(location.hours);

  const statusText = open === null ? 'Hours not available' : open ? 'Open now' : 'Closed now';

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Stack.Screen options={{ title: location.name }} />

      <View style={styles.header}>
        <Text style={styles.name}>{location.name}</Text>
        <View style={styles.headerRow}>
          <Text style={styles.category}>{formatOptionalText(location.category)}</Text>
          <View
            style={[
              styles.statusPill,
              open === true && styles.statusOpen,
              open === false && styles.statusClosed,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                open === true && { color: COLORS.green },
                open === false && { color: COLORS.red },
              ]}
            >
              {statusText}
            </Text>
          </View>
        </View>
      </View>

      <Section title="About">
        <Value text={location.description} />
      </Section>

      <Section title="Address">
        <Row label="Building" text={location.building} />
        <Row label="Address" text={location.address} />
        <Row label="Campus area" text={location.campus_area} last />
      </Section>

      <Section title="Operating hours">
        {hoursRows === null ? (
          <Value text={null} />
        ) : (
          hoursRows.map((row, index) => (
            <View
              key={row.key}
              style={[styles.row, index === hoursRows.length - 1 && styles.rowLast]}
            >
              <Text style={[styles.rowLabel, row.isToday && styles.today]}>
                {row.label}
                {row.isToday ? ' (today)' : ''}
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  !row.available && styles.unavailable,
                  row.isToday && styles.today,
                ]}
              >
                {row.value}
              </Text>
            </View>
          ))
        )}
      </Section>

      <Section title="Amenities">
        <Row label="Seating" text={amenities.seating} amenity />
        <Row label="Wi-Fi" text={amenities.wifi} amenity />
        <Row label="Outlets" text={amenities.outlets} amenity />
        <Row label="Food access" text={amenities.food} amenity last />
      </Section>

      <Section title="Study environment">
        <Row label="Quietness" text={amenities.quietness} amenity />
        <Row label="Study type" text={amenities.study_type} amenity last />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Value({ text }: { text: string | null | undefined }) {
  const display = formatOptionalText(text);
  return (
    <Text style={[styles.body, display === NOT_AVAILABLE && styles.unavailable]}>{display}</Text>
  );
}

function Row({
  label,
  text,
  amenity,
  last,
}: {
  label: string;
  text: string | null | undefined;
  amenity?: boolean;
  last?: boolean;
}) {
  const display = amenity ? formatAmenityValue(text) : formatOptionalText(text);
  return (
    <View style={[styles.row, last && styles.rowLast]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, display === NOT_AVAILABLE && styles.unavailable]}>
        {display}
      </Text>
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
  linkButton: { marginTop: 8, minHeight: 44, justifyContent: 'center' },
  linkButtonText: { color: COLORS.goldDark, fontWeight: '600', fontSize: 14 },

  header: { marginBottom: 14 },
  name: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  headerRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  category: { fontSize: 15, color: COLORS.muted, fontWeight: '600', flexShrink: 1 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.divider,
  },
  statusOpen: { backgroundColor: COLORS.greenBackground },
  statusClosed: { backgroundColor: COLORS.redBackground },
  statusText: { fontSize: 13, fontWeight: '700', color: COLORS.muted },

  section: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.goldDark,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  body: { fontSize: 15, lineHeight: 22, color: COLORS.text },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.divider,
    gap: 12,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 14, color: COLORS.muted, fontWeight: '600' },
  rowValue: { fontSize: 14, color: COLORS.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  unavailable: { color: COLORS.muted, fontStyle: 'italic', fontWeight: '400' },
  today: { color: COLORS.goldDark, fontWeight: '800' },
});
