// src/components/FilterSheet.tsx
// Story #9: filter and sort controls. Owner: Neha
// Bottom-sheet modal with one chip row per study criterion; multiple
// filters combine (AND), one tap clears all (per acceptance criteria).

import {
  AMENITY_LABELS,
  AMENITY_OPTIONS,
  type AmenityKey,
  type Filters,
  type SortOption,
} from '@/lib/locations';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
];

interface Props {
  visible: boolean;
  filters: Filters;
  sort: SortOption;
  onChangeFilters: (f: Filters) => void;
  onChangeSort: (s: SortOption) => void;
  onClose: () => void;
}

export default function FilterSheet({
  visible, filters, sort, onChangeFilters, onChangeSort, onClose,
}: Props) {
  const toggle = (key: AmenityKey, value: string) => {
    const next = { ...filters };
    if (next[key] === value) delete next[key];
    else next[key] = value;
    onChangeFilters(next);
  };

  const activeCount = Object.keys(filters).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Filter & sort</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
              disabled={activeCount === 0}
              onPress={() => onChangeFilters({})}>
              <Text style={[styles.clear, activeCount === 0 && styles.clearDisabled]}>
                Clear all{activeCount > 0 ? ` (${activeCount})` : ''}
              </Text>
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 420 }}>
            {(Object.keys(AMENITY_OPTIONS) as AmenityKey[]).map((key) => (
              <View key={key} style={styles.group}>
                <Text style={styles.groupLabel}>{AMENITY_LABELS[key]}</Text>
                <View style={styles.chipRow}>
                  {AMENITY_OPTIONS[key].map((value) => {
                    const selected = filters[key] === value;
                    return (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${AMENITY_LABELS[key]}: ${value}`}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => toggle(key, value)}>
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {value}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            <View style={styles.group}>
              <Text style={styles.groupLabel}>Sort by</Text>
              <View style={styles.chipRow}>
                {SORT_OPTIONS.map((option) => {
                  const selected = sort === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => onChangeSort(option.value)}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <Pressable accessibilityRole="button" style={styles.done} onPress={onClose}>
            <Text style={styles.doneText}>Show results</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: '700' },
  clear: { color: '#208AEF', fontWeight: '600' },
  clearDisabled: { color: '#B0B4BA' },
  group: { marginTop: 14 },
  groupLabel: { fontSize: 14, fontWeight: '600', color: '#60646C', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#F0F0F3' },
  chipSelected: { backgroundColor: '#208AEF' },
  chipText: { fontSize: 14, color: '#000' },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  done: { marginTop: 18, minHeight: 48, borderRadius: 12, backgroundColor: '#208AEF', alignItems: 'center', justifyContent: 'center' },
  doneText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
