// src/app/location/[id].tsx - Study location detail
// Story #11: name, category, address, description, hours, and amenities for one location.

import CrowdReportSheet from '@/components/CrowdReportSheet';
import {
  buildHoursRows,
  formatAmenityValue,
  formatOptionalText,
  getLocationDetail,
  LocationNotFoundError,
  NOT_AVAILABLE,
  type LocationDetail,
} from '@/lib/location-detail';
import CompareButton from '@/components/CompareButton';
import { isLocationOpen } from '@/lib/location-hours';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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

const amenityIcons: Record<
  string,
  React.ComponentProps<typeof MaterialCommunityIcons>['name']
> = {
  'Seating': 'seat',
  'Wi-Fi': 'wifi',
  'Outlets': 'power-plug',
  'Food access': 'silverware-fork-knife',
  'Quietness': 'volume-low',
  'Study type': 'account-group-outline',
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
  const [reportOpen, setReportOpen] = useState(false);
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
        <View style={styles.locationIcon}>
          <MaterialCommunityIcons
            name="map-marker"
            size={34}
            color={COLORS.goldDark}
          />
        </View>
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

        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={18}
            color={COLORS.muted}
          />
          <Text style={styles.infoText}>
            {formatOptionalText(location.address)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="office-building-outline"
            size={18}
            color={COLORS.muted}
          />
          <Text style={styles.infoText}>
            {formatOptionalText(location.building)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="school-outline"
            size={18}
            color={COLORS.muted}
          />
          <Text style={styles.infoText}>
            {formatOptionalText(location.campus_area)}
          </Text>
        </View>

        <CompareButton
          locationId={location.id}
          locationName={location.name}
          variant="row"
        />
      </View>

      <Section title="About">


        <Value text={location.description} />
      </Section>


      <Section title="Operating hours" icon="clock-outline">
        {hoursRows === null ? (
          <Value text={null} />
        ) : (
          hoursRows.map((row, index) => (
            <View
              key={row.key}
              style={[
                styles.row,
                styles.hoursRow,
                index === hoursRows.length - 1 && styles.rowLast,
              ]}
            >

              <Text style={[styles.rowLabel, styles.hoursDay, row.isToday && styles.today]}>
                {row.label}
                {row.isToday ? ' (today)' : ''}
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  styles.hoursValue,
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

      <Section title="Amenities" icon="check-circle-outline">
        <Row label="Seating" text={amenities.seating} amenity />
        <Row label="Wi-Fi" text={amenities.wifi} amenity />
        <Row label="Outlets" text={amenities.outlets} amenity />
        <Row label="Food access" text={amenities.food} amenity last />
      </Section>

      <Section title="Study environment" icon="volume-low">
        <Row label="Quietness" text={amenities.quietness} amenity />
        <Row label="Study type" text={amenities.study_type} amenity last />
      </Section>

      <Pressable
        accessibilityRole="button"
        onPress={() => setReportOpen(true)}
        style={styles.conditionButton}
      >
        <MaterialCommunityIcons
          name="account-group-outline"
          size={22}
          color={COLORS.goldDark}
        />

        <View style={styles.conditionText}>
          <Text style={styles.conditionTitle}>
            Report Current Conditions
          </Text>
          <Text style={styles.conditionSubtitle}>
            Share the crowd, seating, and noise level right now.
          </Text>
        </View>

        <MaterialCommunityIcons
          name="chevron-right"
          size={23}
          color={COLORS.goldDark}
        />
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({
            pathname: '/review/[locationId]',
            params: { locationId: location.id },
          })
        }
        style={styles.reviewButton}
      >
        <MaterialCommunityIcons
          name="star-outline"
          size={22}
          color="#FFFFFF"
        />



        <Text style={styles.reviewButtonText}>
          Ratings & Reviews
        </Text>

        <MaterialCommunityIcons
          name="chevron-right"
          size={23}
          color="#FFFFFF"
        />
      </Pressable>
      <CrowdReportSheet
        locationId={reportOpen ? location.id : null}
        locationName={location.name}
        onClose={() => setReportOpen(false)}
      />
    </ScrollView>
  );
}

function Section({
  title,
  children,
  icon,
}: {
  title: string;
  children: ReactNode;
  icon?: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
}) {
  return (
    <View style={styles.section}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={COLORS.goldDark}
          />
        )}
        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>
          {title}
        </Text>
      </View>
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
    <View style={[styles.row, amenity && styles.amenityRow, last && styles.rowLast]}>
      {amenity ? (
        <>
          <View style={styles.amenityIconTile}>
            <MaterialCommunityIcons
              name={amenityIcons[label] ?? 'check-circle-outline'}
              size={21}
              color={COLORS.goldDark}
            />
          </View>

          <View style={styles.amenityText}>
            <Text style={styles.amenityName}>
              {label}
            </Text>

            <Text
              style={[
                styles.amenityValue,
                display === NOT_AVAILABLE && styles.unavailable,
              ]}
            >
              {display}
            </Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.rowLabel}>{label}</Text>
          <Text style={[styles.rowValue, display === NOT_AVAILABLE && styles.unavailable]}>
            {display}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: COLORS.page },
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 16,
  },
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

  header: {
    padding: 22,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  locationIcon: {
    width: 62,
    height: 62,
    marginBottom: 15,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4DFC3',
  },

  name: {
    color: COLORS.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerRow: {
    marginTop: 4,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  category: {
    color: COLORS.goldDark,
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },

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
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 19,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 12,
  },
  body: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  hoursRow: {
    minHeight: 46,
    alignItems: 'center',
  },

  hoursValue: {
    flex: 1,
    marginLeft: 16,
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'right',
  },

  hoursDay: {
    color: COLORS.text,
    fontWeight: '700',
  },
  amenityRow: {
    minHeight: 57,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#EAD7C6',
  },

  amenityIconTile: {
    width: 39,
    height: 39,
    marginRight: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAEFE4',
  },

  amenityText: {
    flex: 1,
  },

  amenityName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },

  amenityValue: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 13,
  },
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


  infoRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  infoText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
  },

  conditionButton: {
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  conditionText: {
    flex: 1,
  },

  conditionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },

  conditionSubtitle: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },

  reviewButton: {
    minHeight: 62,
    paddingHorizontal: 19,
    borderRadius: 20,
    backgroundColor: COLORS.goldDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },

  reviewButtonText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
});
