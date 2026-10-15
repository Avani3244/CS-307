// src/app/(tabs)/index.tsx - Discover
// Host screen for Neha's stories #9 (filter/sort), #7 (nearby),
// #12 (favorites), #17 (crowd reports).

import FavoriteButton from '@/components/FavoriteButton';
import FilterSheet from '@/components/FilterSheet';
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

import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
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
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';


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


export default function DiscoverScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const insets = useSafeAreaInsets();

  const [locations, setLocations] = useState<DiscoverLocation[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<SortOption>('name');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [nearbyOn, setNearbyOn] = useState(false);
  const [nearbyMessage, setNearbyMessage] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
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
    <View style={styles.card}>
      <View style={styles.cardContent}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View details for ${item.name}`}
          onPress={() => router.push({
            pathname: '/location/[id]',
            params: { id: item.id },
          })}
          style={styles.cardMain}
        >
          <View style={styles.thumbnail}>
            <MaterialCommunityIcons
              name={
                item.category?.toLowerCase().includes('library')
                  ? 'bookshelf'
                  : item.category?.toLowerCase().includes('cafe')
                    ? 'coffee-outline'
                    : item.category?.toLowerCase().includes('union')
                      ? 'account-group-outline'
                      : 'school-outline'
              }
              size={34}
              color={COLORS.goldDark}
            />
          </View>

          <View style={styles.cardText}>
            <Text style={styles.cardName}>
              {item.name}
            </Text>

            <Text style={styles.cardMeta}>
              {item.category ?? 'Study spot'}
              {item.distanceKm != null
                ? ` · ${item.distanceKm.toFixed(1)} km`
                : ''}
            </Text>

            <View style={styles.cardAccentRow}>
              <MaterialCommunityIcons
                name="map-marker"
                size={17}
                color={COLORS.gold}
              />

              <Text style={styles.cardAccentText}>
                View study spot
              </Text>
            </View>
          </View>
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
          backgroundColor: COLORS.page,
          paddingTop: insets.top,
        },
      ]}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>StudySpot</Text>
          <Text style={styles.tagline}>
            Find your next study spot
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <MaterialCommunityIcons
            name="book-open-page-variant-outline"
            size={25}
            color={COLORS.goldDark}
          />
        </View>
      </View>
      <View style={styles.searchWrap}>
        <View style={[styles.searchBar, { backgroundColor: COLORS.card }]}>
          <TextInput
            accessibilityLabel="Search study locations"
            placeholder="Search study locations"
            placeholderTextColor={COLORS.muted}
            style={[styles.searchInput, { color: COLORS.text }]}
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
            style={[styles.suggestions, { backgroundColor: COLORS.card }]}
          >
            <Text style={[styles.suggestionsLabel, { color: COLORS.muted }]}>
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
                <Text style={{ color: COLORS.text }}>{location.name}</Text>
                <Text style={[styles.cardMeta, { color: COLORS.muted }]}>
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
            nearbyOn && styles.controlButtonOn,
          ]}
          onPress={toggleNearby}
        >
          <View style={styles.controlContent}>
            <MaterialCommunityIcons
              name="map-marker-outline"
              size={18}
              color={nearbyOn ? COLORS.white : COLORS.goldDark}
            />

            <Text
              style={[
                styles.controlText,
                { color: COLORS.text },
                nearbyOn && styles.controlTextOn,
              ]}
            >
              {nearbyOn ? 'Nearby: on' : 'Nearby'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={[
            styles.controlButton,
            activeFilterCount > 0 && styles.controlButtonOn,
          ]}
          onPress={() => setFilterSheetOpen(true)}
        >
          <View style={styles.controlContent}>
            <MaterialCommunityIcons
              name="tune-variant"
              size={18}
              color={
                activeFilterCount > 0
                  ? COLORS.white
                  : COLORS.goldDark
              }
            />

            <Text
              style={[
                styles.controlText,
                activeFilterCount > 0 && styles.controlTextOn,
              ]}
            >
              Filters
              {activeFilterCount > 0
                ? ` (${activeFilterCount})`
                : ''}
            </Text>
          </View>
        </Pressable>
      </View>

      {!!nearbyMessage && (
        <Text
          style={[
            styles.notice,
            { color: COLORS.muted },
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
          color={COLORS.goldDark}
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
                  { color: COLORS.text },
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
                  { color: COLORS.muted },
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  searchWrap: {
    paddingHorizontal: 18,
    paddingTop: 10,
  },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    color: COLORS.goldDark,
    fontWeight: '600',
  },

  suggestions: {
    maxHeight: 200,
    marginTop: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
  },

  controlText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },

  controlButton: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 17,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  controlButtonOn: {
    backgroundColor: COLORS.goldDark,
    borderColor: COLORS.goldDark,
  },

  controlContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
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
    paddingTop: 4,
    paddingBottom: 120,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginBottom: 12,
    padding: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  cardContent: {
    flex: 1,
  },

  cardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  thumbnail: {
    width: 100,
    height: 92,
    borderRadius: 18,
    backgroundColor: COLORS.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  cardText: {
    flex: 1,
    paddingVertical: 4,
  },

  cardAccentRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  cardAccentText: {
    color: COLORS.goldDark,
    fontSize: 13,
    fontWeight: '700',
  },

  cardName: {
    color: COLORS.text,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
  },

  cardMeta: {
    marginTop: 5,
    color: COLORS.muted,
    fontSize: 13,
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
    color: COLORS.goldDark,
    fontWeight: '700',
    minHeight: 44,
    textAlignVertical: 'center',
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  appName: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.7,
  },

  tagline: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '500',
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: COLORS.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
