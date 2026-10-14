// src/app/(tabs)/index.tsx - Discover
// Host screen for Neha's stories #9 (filter/sort), #7 (nearby),
// #12 (favorites), #17 (crowd reports).

import CrowdReportSheet from '@/components/CrowdReportSheet';
import FavoriteButton from '@/components/FavoriteButton';
import FilterSheet from '@/components/FilterSheet';
import StudyLocationCard from '@/components/study-location-card';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { listFavoriteIds } from '@/lib/favorites';
import { matchesLocationSearch } from '@/lib/location-search';
import {
  fetchLocations,
  getStudyLocations,
  type Coords,
  type DiscoverLocation,
  type Filters,
  type SortOption,
} from '@/lib/locations';

import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setSearchQuery(searchText.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchText]);

  // Filter the existing results so amenity filters and nearby ordering still apply.
  const visibleLocations = useMemo(
    () => locations.filter((location) => matchesLocationSearch(location, searchQuery)),
    [locations, searchQuery],
  );
  const suggestions = useMemo(
    () => searchText.trim()
      ? locations.filter((location) => matchesLocationSearch(location, searchText)).slice(0, 5)
      : [],
    [locations, searchText],
  );

  const clearSearch = () => {
    setSearchText('');
    setSearchQuery('');
    setSuggestionsOpen(false);
  };

  const selectSuggestion = (location: DiscoverLocation) => {
    setSearchText(location.name);
    setSearchQuery(location.name);
    setSuggestionsOpen(false);
    Keyboard.dismiss();
  };

  const load = useCallback(async () => {
    setError('');

    try {
      setLocations(
        Object.keys(filters).length === 0 && sort === 'name' && !nearbyOn
          ? await getStudyLocations()
          : await fetchLocations({
              filters,
              sort,
              coords: nearbyOn ? coords : null,
            })
      );

      if (user) {
        try {
          setFavoriteIds(await listFavoriteIds(user.id));
        } catch {
          setError('Study locations loaded, but favorites could not be loaded. Pull to retry.');
        }
      }
    } catch {
      setError('Could not load study locations. Pull to retry.');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    if (refreshing) return;
    setRefreshing(true);
    if (nearbyOn) {
      try {
        const position = await Location.getCurrentPositionAsync({});

        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch {
        setError('Could not refresh your current location.');
        setRefreshing(false);
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
        <StudyLocationCard location={item} />

        {item.distanceKm != null && (
          <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
            {item.distanceKm.toFixed(1)} km away
          </Text>
        )}

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
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: colors.backgroundElement }]}>
          <TextInput
            accessibilityLabel="Search study locations"
            placeholder="Search study locations"
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchText}
            onChangeText={(text) => {
              setSearchText(text);
              setSuggestionsOpen(true);
              if (!text.trim()) setSearchQuery('');
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onSubmitEditing={() => {
              setSearchQuery(searchText.trim());
              setSuggestionsOpen(false);
            }}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {!!searchText && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.searchClear}
              onPress={clearSearch}
            >
              <Text style={styles.searchClearText}>Clear</Text>
            </Pressable>
          )}
        </View>
        {suggestionsOpen && !loading && suggestions.length > 0 && (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            style={[styles.suggestions, { backgroundColor: colors.backgroundElement }]}
          >
            <Text style={[styles.suggestionsLabel, { color: colors.textSecondary }]}>
              Suggested locations
            </Text>
            {suggestions.map((location) => (
              <Pressable
                key={location.id}
                accessibilityRole="button"
                accessibilityLabel={`Search for ${location.name}`}
                style={styles.suggestion}
                onPress={() => selectSuggestion(location)}
              >
                <Text style={{ color: colors.text }}>{location.name}</Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  {[location.category, location.building, location.campus_area].filter(Boolean).join(' · ')}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

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
          accessibilityLabel="Loading study locations"
          style={styles.loading}
          size="large"
          color="#208AEF"
        />
      ) : (
        <FlatList
          data={visibleLocations}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => setSuggestionsOpen(false)}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refreshLocations}
            />
          }
          contentContainerStyle={
            visibleLocations.length === 0
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
                {error
                  ? 'Study locations unavailable'
                  : searchQuery
                    ? 'No study spots match your search'
                    : activeFilterCount > 0
                      ? 'No study spots match your filters'
                      : 'No study locations yet'}
              </Text>

              <Text
                style={[
                  styles.emptyBody,
                  { color: colors.textSecondary },
                ]}
              >
                {error
                  ? 'Try again to load study locations.'
                  : searchQuery
                    ? `No matches for “${searchQuery}”. Try another search${activeFilterCount > 0 ? ' or remove a filter' : ''}.`
                    : activeFilterCount > 0
                      ? 'Try removing a filter, or clear them all to see every location.'
                      : 'Check back later or pull down to refresh.'}
              </Text>

              {!!error && (
                <Pressable
                  accessibilityRole="button"
                  disabled={refreshing}
                  onPress={refreshLocations}
                >
                  <Text style={styles.emptyClear}>Try again</Text>
                </Pressable>
              )}

              {!error && !!searchQuery && (
                <Pressable accessibilityRole="button" onPress={clearSearch}>
                  <Text style={styles.emptyClear}>Clear search</Text>
                </Pressable>
              )}

              {!error && activeFilterCount > 0 && (
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

  searchWrap: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingLeft: 14,
  },

  searchInput: {
    flex: 1,
    minHeight: 48,
    fontSize: 16,
    paddingVertical: 10,
  },

  searchClear: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },

  searchClearText: {
    color: '#208AEF',
    fontWeight: '600',
  },

  suggestions: {
    maxHeight: 200,
    marginTop: 6,
    borderRadius: 16,
  },

  suggestionsLabel: {
    paddingHorizontal: 14,
    paddingTop: 10,
    fontSize: 12,
    fontWeight: '600',
  },

  suggestion: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
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
