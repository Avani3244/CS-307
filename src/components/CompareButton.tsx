// src/components/CompareButton.tsx
// Story #19: add/remove a study location from the comparison.
//   variant "icon" - compact toggle for list cards (sits next to the favorite heart)
//   variant "row"  - full-width button for the detail page, with a shortcut to
//                    the comparison once two or more locations are selected

import { MAX_COMPARE, useCompare } from '@/context/CompareContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

const COLORS = {
  gold: '#C98A38',
  goldDark: '#A96F2D',
  goldSoft: '#F4DFC3',
  muted: '#9A816B',
  border: '#E2CCB8',
  card: '#FFF9F2',
};

interface Props {
  locationId: string;
  locationName?: string;
  variant?: 'icon' | 'row';
}

export default function CompareButton({ locationId, locationName, variant = 'icon' }: Props) {
  const { ids, isSelected, toggle } = useCompare();
  const router = useRouter();
  const selected = isSelected(locationId);

  const onPress = () => {
    if (toggle(locationId) === 'full') {
      Alert.alert(
        'Compare limit reached',
        `You can compare up to ${MAX_COMPARE} study spots at a time. Remove one to add another.`,
      );
    }
  };

  const label = locationName
    ? `${selected ? 'Remove' : 'Add'} ${locationName} ${selected ? 'from' : 'to'} compare`
    : selected
      ? 'Remove from compare'
      : 'Add to compare';

  if (variant === 'icon') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        hitSlop={6}
        style={[styles.iconButton, selected && styles.iconButtonOn]}
        onPress={onPress}
      >
        <MaterialCommunityIcons
          name="compare-horizontal"
          size={22}
          color={selected ? COLORS.goldDark : COLORS.muted}
        />
      </Pressable>
    );
  }

  return (
    <View style={styles.rowWrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={[styles.rowButton, selected && styles.rowButtonOn]}
        onPress={onPress}
      >
        <MaterialCommunityIcons
          name={selected ? 'check-circle' : 'compare-horizontal'}
          size={20}
          color={selected ? '#fff' : COLORS.goldDark}
        />
        <Text style={[styles.rowText, selected && styles.rowTextOn]}>
          {selected ? 'Added to compare' : 'Add to compare'}
        </Text>
      </Pressable>

      {ids.length >= 2 && (
        <Pressable
          accessibilityRole="button"
          style={styles.rowLink}
          onPress={() => router.push('/compare' as Href)}
        >
          <Text style={styles.rowLinkText}>View comparison ({ids.length})</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonOn: { backgroundColor: COLORS.goldSoft },

  rowWrap: { marginTop: 14, gap: 4 },
  rowButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.card,
  },
  rowButtonOn: { backgroundColor: COLORS.goldDark, borderColor: COLORS.goldDark },
  rowText: { color: COLORS.goldDark, fontSize: 15, fontWeight: '700' },
  rowTextOn: { color: '#fff' },
  rowLink: { minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  rowLinkText: { color: COLORS.goldDark, fontSize: 14, fontWeight: '700' },
});
