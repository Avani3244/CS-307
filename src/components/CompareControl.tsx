// src/components/CompareControl.tsx
// Story #19: "Compare" pill for the Discover controls row, next to Nearby and Filters.
// Shows how many locations are selected and opens the comparison once there are two or more.

import { useCompare } from '@/context/CompareContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

const COLORS = {
  text: '#21160F',
  goldDark: '#A96F2D',
  card: '#FFF9F2',
  border: '#E2CCB8',
  white: '#ffffff',
};

export default function CompareControl() {
  const { ids } = useCompare();
  const router = useRouter();

  const count = ids.length;
  const ready = count >= 2;

  const onPress = () => {
    if (!ready) {
      Alert.alert(
        'Pick at least two study spots',
        'Tap the compare icon on two or more study spots, then tap Compare.',
      );
      return;
    }
    router.push('/compare' as Href);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        count === 0 ? 'Compare study spots' : `Compare, ${count} selected`
      }
      accessibilityState={{ selected: count > 0 }}
      style={[styles.button, count > 0 && styles.buttonOn]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <MaterialCommunityIcons
          name="compare-horizontal"
          size={18}
          color={count > 0 ? COLORS.white : COLORS.goldDark}
        />
        <Text style={[styles.text, count > 0 && styles.textOn]}>
          {count > 0 ? `Compare (${count})` : 'Compare'}
        </Text>
      </View>
    </Pressable>
  );
}

// Matches the Nearby / Filters pills in the Discover controls row.
const styles = StyleSheet.create({
  button: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 17,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  buttonOn: {
    backgroundColor: COLORS.goldDark,
    borderColor: COLORS.goldDark,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  text: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  textOn: {
    color: COLORS.white,
  },
});
