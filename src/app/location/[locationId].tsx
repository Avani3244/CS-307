import CrowdReportSheet from '@/components/CrowdReportSheet';
import FavoriteButton from '@/components/FavoriteButton';
import { useAuth } from '@/context/AuthContext';
import { listFavoriteIds } from '@/lib/favorites';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '@/lib/supabase';
import type {
  LocationHours,
  StudyLocation,
} from '@/types/study-location';

type Amenity = {
  amenity_type: string;
  value: string;
};

const COLORS = {
  page: '#F1E2D2',
  card: '#FFF9F2',
  cardSoft: '#FAEFE4',
  text: '#21160F',
  muted: '#9A816B',
  gold: '#C98A38',
  goldDark: '#A96F2D',
  goldSoft: '#F4DFC3',
  border: '#E2CCB8',
  white: '#FFFFFF',
};

const amenityIcons: Record<
  string,
  React.ComponentProps<typeof MaterialCommunityIcons>['name']
> = {
  quietness: 'volume-low',
  wifi: 'wifi',
  outlets: 'power-plug',
  seating: 'seat',
  food: 'silverware-fork-knife',
  study_type: 'account-group-outline',
};

const amenityLabels: Record<string, string> = {
  quietness: 'Quietness',
  wifi: 'Wi-Fi',
  outlets: 'Outlets',
  seating: 'Seating',
  food: 'Food Access',
  study_type: 'Study Type',
};

const DAY_ORDER: {
  key: keyof NonNullable<StudyLocation['hours']>;
  label: string;
}[] = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
  ];

function formatHours(hours: LocationHours | undefined) {
  if (!hours) return 'Not available';

  if (hours === '24h') {
    return 'Open 24 hours';
  }

  if (hours.length === 0) {
    return 'Not available';
  }

  return hours
    .map(([open, close]) => `${open} – ${close}`)
    .join(', ');
}

function formatAmenityValue(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function LocationDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { locationId } =
    useLocalSearchParams<{ locationId?: string }>();

  const [location, setLocation] =
    useState<StudyLocation | null>(null);

  const [amenities, setAmenities] =
    useState<Amenity[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initiallyFavorited, setInitiallyFavorited] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const loadLocation = useCallback(async () => {
    if (!locationId) {
      setError('This study location could not be found.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const [
        { data: locationData, error: locationError },
        { data: amenityData, error: amenityError },
      ] = await Promise.all([
        supabase
          .from('study_locations')
          .select(
            `
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
            `
          )
          .eq('id', locationId)
          .single(),

        supabase
          .from('location_amenities')
          .select('amenity_type, value')
          .eq('location_id', locationId),
      ]);

      if (locationError) {
        throw locationError;
      }

      if (amenityError) {
        throw amenityError;
      }

      setLocation(locationData as StudyLocation);
      setAmenities((amenityData ?? []) as Amenity[]);
      if (user) {
        const favoriteIds = await listFavoriteIds(user.id);
        setInitiallyFavorited(favoriteIds.has(locationId));
      }
    } catch (loadError) {
      console.error(
        'Could not load location details:',
        loadError
      );

      setError(
        'Could not load this study location. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [locationId, user]);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={COLORS.goldDark}
        />
        <Text style={styles.loadingText}>
          Loading study spot...
        </Text>
      </View>
    );
  }

  if (error || !location) {
    return (
      <View style={styles.centered}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={40}
          color={COLORS.goldDark}
        />

        <Text style={styles.errorText}>
          {error || 'Study location not found.'}
        </Text>

        <Pressable
          onPress={loadLocation}
          style={styles.retryButton}
        >
          <Text style={styles.retryText}>
            Try Again
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.container,
        {
          paddingBottom:
            Math.max(insets.bottom, 20) + 28,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.locationIcon}>
          <MaterialCommunityIcons
            name="map-marker"
            size={34}
            color={COLORS.goldDark}
          />
        </View>

        <Text style={styles.locationName}>
          {location.name}
        </Text>

        <Text style={styles.category}>
          {location.category ?? 'Study spot'}
        </Text>

        {!!location.address && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={18}
              color={COLORS.muted}
            />

            <Text style={styles.infoText}>
              {location.address}
            </Text>
          </View>
        )}

        {!!location.building && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="office-building-outline"
              size={18}
              color={COLORS.muted}
            />

            <Text style={styles.infoText}>
              {location.building}
            </Text>
          </View>
        )}

        {!!location.campus_area && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons
              name="school-outline"
              size={18}
              color={COLORS.muted}
            />

            <Text style={styles.infoText}>
              {location.campus_area}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          About
        </Text>

        <Text style={styles.bodyText}>
          {location.description ??
            'No description is available for this study location yet.'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeadingRow}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={22}
            color={COLORS.goldDark}
          />

          <Text style={styles.sectionHeadingText}>
            Operating Hours
          </Text>
        </View>

        {location.hours ? (
          <View style={styles.hoursList}>
            {DAY_ORDER.map((day) => (
              <View
                key={day.key}
                style={styles.hoursRow}
              >
                <Text style={styles.dayText}>
                  {day.label}
                </Text>

                <Text style={styles.hoursText}>
                  {formatHours(location.hours?.[day.key])}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bodyText}>
            Operating hours are not available.
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Study Amenities
        </Text>

        {amenities.length === 0 ? (
          <Text style={styles.bodyText}>
            Amenity information is not available yet.
          </Text>
        ) : (
          <View style={styles.amenities}>
            {amenities.map((amenity) => (
              <View
                key={amenity.amenity_type}
                style={styles.amenityRow}
              >
                <View style={styles.amenityIcon}>
                  <MaterialCommunityIcons
                    name={
                      amenityIcons[
                      amenity.amenity_type
                      ] ?? 'check-circle-outline'
                    }
                    size={21}
                    color={COLORS.goldDark}
                  />
                </View>

                <View style={styles.amenityText}>
                  <Text style={styles.amenityLabel}>
                    {amenityLabels[
                      amenity.amenity_type
                    ] ?? amenity.amenity_type}
                  </Text>

                  <Text style={styles.amenityValue}>
                    {formatAmenityValue(
                      amenity.value
                    )}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.actionCard}>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>
            Save this Study Spot
          </Text>

          <Text style={styles.actionSubtitle}>
            Add this location to your favorites.
          </Text>
        </View>

        <FavoriteButton
          locationId={location.id}
          initiallyFavorited={initiallyFavorited}
        />
      </View>

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
          router.push(
            `/review/${location.id}`
          )
        }
        style={styles.reviewButton}
      >
        <MaterialCommunityIcons
          name="star-outline"
          size={22}
          color={COLORS.white}
        />

        <Text style={styles.reviewButtonText}>
          Ratings & Reviews
        </Text>

        <MaterialCommunityIcons
          name="chevron-right"
          size={23}
          color={COLORS.white}
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.page,
  },

  container: {
    padding: 16,
    gap: 16,
  },

  centered: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.page,
  },

  loadingText: {
    marginTop: 12,
    color: COLORS.muted,
    fontSize: 14,
  },

  errorText: {
    marginTop: 12,
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 15,
    backgroundColor: COLORS.goldDark,
  },

  retryText: {
    color: COLORS.white,
    fontWeight: '800',
  },

  heroCard: {
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
    backgroundColor: COLORS.goldSoft,
  },

  locationName: {
    color: COLORS.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },

  category: {
    marginTop: 4,
    marginBottom: 14,
    color: COLORS.goldDark,
    fontSize: 14,
    fontWeight: '700',
  },

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

  card: {
    padding: 19,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  sectionTitle: {
    marginBottom: 11,
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '900',
  },

  bodyText: {
    color: COLORS.muted,
    fontSize: 15,
    lineHeight: 22,
  },

  amenities: {
    gap: 8,
  },

  amenityRow: {
    minHeight: 57,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EAD7C6',
  },

  amenityIcon: {
    width: 39,
    height: 39,
    marginRight: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardSoft,
  },

  amenityText: {
    flex: 1,
  },

  amenityLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },

  amenityValue: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 13,
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
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },

  actionCard: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    flexDirection: 'row',
    alignItems: 'center',
  },

  actionText: {
    flex: 1,
  },

  actionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },

  actionSubtitle: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 13,
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

  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },

  sectionHeadingText: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '900',
  },

  hoursList: {
    gap: 2,
  },

  hoursRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EAD7C6',
  },

  dayText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },

  hoursText: {
    flex: 1,
    marginLeft: 16,
    color: COLORS.muted,
    fontSize: 13,
    textAlign: 'right',
  },
});