// src/app/(tabs)/index.tsx - Discover
// Host screen for Neha's stories #9 (filter/sort), #7 (nearby),
// #12 (favorites), #17 (crowd reports).

import CrowdReportSheet from '@/components/CrowdReportSheet';
import FavoriteButton from '@/components/FavoriteButton';
import FilterSheet from '@/components/FilterSheet';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { listFavoriteIds } from '@/lib/favorites';
import {
  fetchLocations,
  type Coords,
  type DiscoverLocation,
  type Filters,
  type SortOption,
} from '@/lib/locations';

import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DiscoverScreen() {
  const { user } = useAuth();

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const insets = useSafeAreaInsets();

  const [locations, setLocations] = useState<DiscoverLocation[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<SortOption>('name');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [nearbyOn, setNearbyOn] = useState(false);
  const [nearbyMessage, setNearbyMessage] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [reporting, setReporting] = useState<DiscoverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');

    try {
      setLocations(
        await fetchLocations({
          filters,
          sort,
          coords: nearbyOn ? coords : null,
        })
      );

      if (user) {
        setFavoriteIds(await listFavoriteIds(user.id));
      }
    } catch {
      setError('Could not load study locations. Pull to retry.');
    } finally {
      setLoading(false);
    }
  }, [filters, sort, nearbyOn, coords, user]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleNearby = async () => {
    if (nearbyOn) {
      setNearbyOn(false);
      setNearbyMessage('');

      if (sort === 'distance') {
        setSort('name');
      }

      return;
    }

    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      setNearbyMessage(
        'Location permission denied, so nearby results are unavailable. Showing the default list.'
      );
      return;
    }

    const position = await Location.getCurrentPositionAsync({});

    setCoords({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    setNearbyOn(true);
    setNearbyMessage('');
    setSort('distance');
  };

  const refreshLocations = async () => {
    if (nearbyOn) {
      try {
        const position = await Location.getCurrentPositionAsync({});

        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch {
        setError('Could not refresh your current location.');
      }
    } else {
      await load();
    }
  };

  const activeFilterCount = Object.keys(filters).length;

  const renderCard = ({ item }: { item: DiscoverLocation }) => (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.backgroundElement },
      ]}
    >
      <View style={styles.cardContent}>
        <Text style={[styles.cardName, { color: colors.text }]}>
          {item.name}
        </Text>

        <Text
          style={[
            styles.cardMeta,
            { color: colors.textSecondary },
          ]}
        >
          {item.category ?? 'Study spot'}
          {item.distanceKm != null
            ? `  ·  ${item.distanceKm.toFixed(1)} km away`
            : ''}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Report current conditions at ${item.name}`}
          onPress={() => setReporting(item)}
        >
          <Text style={styles.reportLink}>Report conditions</Text>
        </Pressable>
      </View>

      <FavoriteButton
        locationId={item.id}
        initiallyFavorited={favoriteIds.has(item.id)}
      />
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: nearbyOn }}
          style={[
            styles.controlButton,
            { backgroundColor: colors.backgroundElement },
            nearbyOn && styles.controlButtonOn,
          ]}
          onPress={toggleNearby}
        >
          <Text
            style={[
              styles.controlText,
              { color: colors.text },
              nearbyOn && styles.controlTextOn,
            ]}
          >
            {nearbyOn ? 'Nearby: on' : 'Nearby'}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={[
            styles.controlButton,
            { backgroundColor: colors.backgroundElement },
            activeFilterCount > 0 && styles.controlButtonOn,
          ]}
          onPress={() => setFilterSheetOpen(true)}
        >
          <Text
            style={[
              styles.controlText,
              { color: colors.text },
              activeFilterCount > 0 && styles.controlTextOn,
            ]}
          >
            Filters
            {activeFilterCount > 0
              ? ` (${activeFilterCount})`
              : ''}
          </Text>
        </Pressable>
      </View>

      {!!nearbyMessage && (
        <Text
          style={[
            styles.notice,
            { color: colors.textSecondary },
          ]}
        >
          {nearbyMessage}
        </Text>
      )}

      {!!error && (
        <Text style={styles.noticeError}>{error}</Text>
      )}

      {loading ? (
        <ActivityIndicator
          style={styles.loading}
          size="large"
          color="#208AEF"
        />
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          refreshControl={
            <RefreshControl
              refreshing={false}
              onRefresh={refreshLocations}
            />
          }
          contentContainerStyle={
            locations.length === 0
              ? styles.emptyWrap
              : styles.list
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.text },
                ]}
              >
                No study spots match your filters
              </Text>

              <Text
                style={[
                  styles.emptyBody,
                  { color: colors.textSecondary },
                ]}
              >
                Try removing a filter, or clear them all to see every
                location.
              </Text>

              {activeFilterCount > 0 && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setFilters({})}
                >
                  <Text style={styles.emptyClear}>
                    Clear all filters
                  </Text>
                </Pressable>
              )}
            </View>
          }
        />
      )}

      <FilterSheet
        visible={filterSheetOpen}
        filters={filters}
        sort={sort}
        nearbyOn={nearbyOn}
        onChangeFilters={setFilters}
        onChangeSort={setSort}
        onClose={() => setFilterSheetOpen(false)}
      />

      <CrowdReportSheet
        locationId={reporting?.id ?? null}
        locationName={reporting?.name}
        onClose={() => setReporting(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  controls: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
  },

  controlButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderRadius: 22,
  },

  controlButtonOn: {
    backgroundColor: '#208AEF',
  },

  controlText: {
    fontSize: 14,
    fontWeight: '600',
  },

  controlTextOn: {
    color: '#ffffff',
  },

  notice: {
    marginHorizontal: 14,
    marginBottom: 6,
  },

  noticeError: {
    marginHorizontal: 14,
    marginBottom: 6,
    color: '#C62828',
  },

  loading: {
    marginTop: 48,
  },

  list: {
    paddingBottom: 16,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 14,
    marginBottom: 10,
    padding: 14,
    borderRadius: 16,
  },

  cardContent: {
    flex: 1,
  },

  cardName: {
    fontSize: 16,
    fontWeight: '700',
  },

  cardMeta: {
    marginTop: 2,
    fontSize: 13,
  },

  reportLink: {
    marginTop: 8,
    color: '#208AEF',
    fontWeight: '600',
    fontSize: 13,
    minHeight: 24,
  },

  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  empty: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },

  emptyBody: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
  },

  emptyClear: {
    marginTop: 12,
    color: '#208AEF',
    fontWeight: '700',
    minHeight: 44,
    textAlignVertical: 'center',
  },
});