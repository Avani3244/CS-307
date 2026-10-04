// src/components/FavoriteButton.tsx
// Story #12: favorite/unfavorite toggle. Owner: Neha
// Used on Discover cards now; drop the same component onto the
// location detail page (story #11) when it lands.

import { useAuth } from '@/context/AuthContext';
import { addFavorite, removeFavorite } from '@/lib/favorites';
import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

interface Props {
  locationId: string;
  initiallyFavorited: boolean;
  onChange?: (favorited: boolean) => void;
}

export default function FavoriteButton({ locationId, initiallyFavorited, onChange }: Props) {
  const { user } = useAuth();
  const [favorited, setFavorited] = useState(initiallyFavorited);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!user || busy) return;
    setBusy(true);
    const next = !favorited;
    setFavorited(next); // optimistic
    try {
      if (next) await addFavorite(user.id, locationId);
      else await removeFavorite(user.id, locationId);
      onChange?.(next);
    } catch {
      setFavorited(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={favorited ? 'Remove from favorites' : 'Add to favorites'}
      accessibilityState={{ selected: favorited }}
      hitSlop={10}
      style={styles.button}
      onPress={toggle}>
      <Text style={[styles.heart, favorited && styles.heartOn]}>{favorited ? '\u2665' : '\u2661'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  heart: { fontSize: 22, color: '#60646C' },
  heartOn: { color: '#E0245E' },
});
