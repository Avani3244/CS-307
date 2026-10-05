// src/app/(tabs)/index.tsx - Discover
// Host screen for Neha's story #9 (filter/sort).
// NOTE for Sri: story #6 (browse list + open/closed status) owns the real
// location card. This list intentionally renders a minimal card; extend or
// replace renderCard with your design - the data and filter plumbing
// around it should not need to change.

import FilterSheet from '@/components/FilterSheet';
import {
  fetchLocations, type Filters, type SortOption, type StudyLocation,
} from '@/lib/locations';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View,
} from 'react-native';

export default function DiscoverScreen() {
  const [locations, setLocations] = useState<StudyLocation[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<SortOption>('name');
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setLocations(await fetchLocations({ filters, sort }));
    } catch {
      setError('Could not load study locations. Pull to retry.');
    } finally {
      setLoading(false);
    }
  }, [filters, sort]);

  useEffect(() => { load(); }, [load]);

  const activeFilterCount = Object.keys(filters).length;

  const renderCard = ({ item }: { item: StudyLocation }) => (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardMeta}>{item.category ?? 'Study spot'}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          style={[styles.controlButton, activeFilterCount > 0 && styles.controlButtonOn]}
          onPress={() => setFilterSheetOpen(true)}>
          <Text style={[styles.controlText, activeFilterCount > 0 && styles.controlTextOn]}>
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </Pressable>
      </View>

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
