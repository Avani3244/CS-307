import {
  AMENITY_LABELS,
  AMENITY_OPTIONS,
  type AmenityKey,
  type Filters,
  type SortOption,
} from '@/lib/locations';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  page: '#F1E2D2',
  card: '#FFF9F2',
  text: '#21160F',
  muted: '#9A816B',
  gold: '#C98A38',
  goldDark: '#A96F2D',
  goldSoft: '#F4DFC3',
  border: '#E2CCB8',
  white: '#FFFFFF',
};

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'distance', label: 'Distance' },
];

// Only the displayed labels change.
// Actual filter values stay the same.
function getOptionLabel(key: AmenityKey, value: string): string {
  if (AMENITY_LABELS[key].toLowerCase() === 'quietness') {
    switch (value.toLowerCase()) {
      case 'high':
        return 'Very quiet';
      case 'medium':
        return 'Some noise';
      case 'low':
        return 'Lively';
    }
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface Props {
  visible: boolean;
  filters: Filters;
  sort: SortOption;
  nearbyOn: boolean;
  onChangeFilters: (f: Filters) => void;
  onChangeSort: (s: SortOption) => void;
  onClose: () => void;
}

export default function FilterSheet({
  visible,
  filters,
  sort,
  nearbyOn,
  onChangeFilters,
  onChangeSort,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();

  const toggle = (key: AmenityKey, value: string) => {
    const next = { ...filters };

    if (next[key] === value) {
      delete next[key];
    } else {
      next[key] = value;
    }

    onChangeFilters(next);
  };

  const activeCount = Object.keys(filters).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, 14) + 12,
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Filter & sort</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear all filters"
              disabled={activeCount === 0}
              onPress={() => onChangeFilters({})}
            >
              <Text
                style={[
                  styles.clear,
                  activeCount === 0 && styles.clearDisabled,
                ]}
              >
                Clear all
                {activeCount > 0 ? ` (${activeCount})` : ''}
              </Text>
            </Pressable>
          </View>

          <ScrollView
            style={styles.optionsScroll}
            contentContainerStyle={styles.optionsContent}
            showsVerticalScrollIndicator={false}
          >
            {(Object.keys(AMENITY_OPTIONS) as AmenityKey[]).map(
              (key) => (
                <View key={key} style={styles.group}>
                  <Text style={styles.groupLabel}>
                    {AMENITY_LABELS[key]}
                  </Text>

                  <View style={styles.chipRow}>
                    {AMENITY_OPTIONS[key].map((value) => {
                      const selected = filters[key] === value;
                      const label = getOptionLabel(key, value);

                      return (
                        <Pressable
                          key={value}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          accessibilityLabel={`${AMENITY_LABELS[key]}: ${label}`}
                          style={[
                            styles.chip,
                            selected && styles.chipSelected,
                          ]}
                          onPress={() => toggle(key, value)}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              selected && styles.chipTextSelected,
                            ]}
                          >
                            {label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )
            )}

            <View style={styles.group}>
              <Text style={styles.groupLabel}>Sort by</Text>

              <View style={styles.chipRow}>
                {SORT_OPTIONS.map((option) => {
                  const selected = sort === option.value;
                  const disabled =
                    option.value === 'distance' && !nearbyOn;

                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="button"
                      accessibilityState={{ selected, disabled }}
                      disabled={disabled}
                      style={[
                        styles.chip,
                        selected && styles.chipSelected,
                        disabled && styles.chipDisabled,
                      ]}
                      onPress={() => onChangeSort(option.value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          selected && styles.chipTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {!nearbyOn && (
                <Text style={styles.hint}>
                  Turn on Nearby to sort by distance.
                </Text>
              )}
            </View>
          </ScrollView>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.done,
              pressed && styles.donePressed,
            ]}
            onPress={onClose}
          >
            <Text style={styles.doneText}>
              Show results
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(33, 22, 15, 0.45)',
    justifyContent: 'flex-end',
  },

  sheet: {
    maxHeight: '92%',
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 12,
  },

  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 5,
    backgroundColor: COLORS.border,
    marginBottom: 18,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },

  title: {
    flex: 1,
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.text,
  },

  clear: {
    color: COLORS.goldDark,
    fontSize: 14,
    fontWeight: '700',
  },

  clearDisabled: {
    color: COLORS.muted,
    opacity: 0.55,
  },

  optionsScroll: {
    maxHeight: 490,
  },

  optionsContent: {
    paddingBottom: 12,
  },

  group: {
    marginTop: 19,
  },

  groupLabel: {
    marginBottom: 10,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },

  chip: {
    flexGrow: 1,
    minWidth: 80,
    minHeight: 46,
    paddingHorizontal: 13,
    borderRadius: 17,
    backgroundColor: COLORS.page,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  chipSelected: {
    backgroundColor: COLORS.goldDark,
    borderColor: COLORS.goldDark,
  },

  chipDisabled: {
    opacity: 0.4,
  },

  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },

  chipTextSelected: {
    color: COLORS.white,
    fontWeight: '800',
  },

  hint: {
    marginTop: 9,
    fontSize: 12,
    color: COLORS.muted,
  },

  done: {
    marginTop: 16,
    minHeight: 55,
    borderRadius: 17,
    backgroundColor: COLORS.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },

  donePressed: {
    backgroundColor: '#8D5929',
  },

  doneText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
  },
});