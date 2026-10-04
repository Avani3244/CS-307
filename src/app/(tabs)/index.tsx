// src/app/(tabs)/index.tsx - Discover
// Host screen for Neha's stories #9 (filter/sort) and #7 (nearby).
// NOTE for Sri: story #6 (browse list + open/closed status) owns the real
// location card. This list intentionally renders a minimal card; extend or
// replace renderCard with your design - the data and filter plumbing
// around it should not need to change.

import FilterSheet from '@/components/FilterSheet';
import {
  fetchLocations, type Coords, type DiscoverLocation, type Filters, type SortOption,
} from '@/lib/locations';
import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View,
} from 'react-native';

export default function DiscoverScreen() {
  const [locations, setLocations] = useState<DiscoverLocation[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<SortOption>('name');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [nearbyOn, setNearbyOn] = useState(false);
  const [nearbyMessage, setNearbyMessage] = useState('');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setLocations(await fetchLocations({ filters, sort, coords: nearbyOn ? coords : null }));
    } catch {
      setError('Could not load study locations. Pull to retry.');
    } finally {
      setLoading(false);
    }
  }, [filters, sort, nearbyOn, coords]);

  useEffect(() => { load(); }, [load]);

  // Story #7: nearby toggle with permission handling and denied fallback
  const toggleNearby = async () => {
    if (nearbyOn) {
      setNearbyOn(false);
      setNearbyMessage('');
      if (sort === 'distance') setSort('name');
      return;
    }
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setNearbyMessage('Location permission denied, so nearby results are unavailable. Showing the default list.');
      return;
    }
    const position = await Location.getCurrentPositionAsync({});
    setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    setNearbyOn(true);
    setNearbyMessage('');
    setSort('distance');
  };

  const activeFilterCount = Object.keys(filters).length;

  const renderCard = ({ item }: { item: DiscoverLocation }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardMeta}>
          {item.category ?? 'Study spot'}
          {item.distanceKm != null ? `  \u00B7  ${item.distanceKm.toFixed(1)} km away` : ''}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: nearbyOn }}
          style={[styles.controlButton, nearbyOn && styles.controlButtonOn]}
          onPress={toggleNearby}>
          <Text style={[styles.controlText, nearbyOn && styles.controlTextOn]}>
            {nearbyOn ? 'Nearby: on' : 'Nearby'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[styles.controlButton, activeFilterCount > 0 && styles.controlButtonOn]}
          onPress={() => setFilterSheetOpen(true)}>
          <Text style={[styles.controlText, activeFilterCount > 0 && styles.controlTextOn]}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </Pressable>
      </View>

      {!!nearbyMessage && <Text style={styles.notice}>{nearbyMessage}</Text>}
      {!!error && <Text style={styles.noticeError}>{error}</Text>}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 48 }} size="large" color="#208AEF" />
      ) : (
        <FlatList
          data={locations}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} />}
          contentContainerStyle={locations.length === 0 && styles.emptyWrap}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No study spots match your filters</Text>
              <Text style={styles.emptyBody}>Try removing a filter, or clear them all to see every location.</Text>
              {activeFilterCount > 0 && (
                <Pressable accessibilityRole="button" onPress={() => setFilters({})}>
                  <Text style={styles.emptyClear}>Clear all filters</Text>
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
  container: { flex: 1, backgroundColor: '#fff' },
  controls: { flexDirection: 'row', gap: 10, padding: 14 },
  controlButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, borderRadius: 22, backgroundColor: '#F0F0F3' },
  controlButtonOn: { backgroundColor: '#208AEF' },
  controlText: { fontSize: 14, fontWeight: '600', color: '#000' },
  controlTextOn: { color: '#fff' },
  notice: { marginHorizontal: 14, marginBottom: 6, color: '#60646C' },
  noticeError: { marginHorizontal: 14, marginBottom: 6, color: '#C62828' },
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 10, padding: 14, borderRadius: 12, backgroundColor: '#F0F0F3' },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardMeta: { marginTop: 2, fontSize: 13, color: '#60646C' },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptyBody: { marginTop: 6, fontSize: 14, color: '#60646C', textAlign: 'center' },
  emptyClear: { marginTop: 12, color: '#208AEF', fontWeight: '700', minHeight: 44, textAlignVertical: 'center' },
});
