// src/app/(tabs)/favorites.tsx - Favorites
// Story #12: view and manage favorite study locations. Owner: Neha

import FavoriteButton from '@/components/FavoriteButton';
import { useAuth } from '@/context/AuthContext';
import { listFavoriteLocations } from '@/lib/favorites';
import type { StudyLocation } from '@/lib/locations';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

export default function FavoritesScreen() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<StudyLocation[]>([]);
  const [loading, setLoading] = useState(true);

  // Reload whenever the tab gains focus, so hearts toggled on Discover show here.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!user) return;
        try {
          const data = await listFavoriteLocations(user.id);
          if (active) setFavorites(data);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [user]),
  );

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 48 }} size="large" color="#208AEF" />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        contentContainerStyle={favorites.length === 0 && styles.emptyWrap}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardMeta}>{item.category ?? 'Study spot'}</Text>
            </View>
            <FavoriteButton
              locationId={item.id}
              initiallyFavorited
              onChange={(fav) => {
                if (!fav) setFavorites((prev) => prev.filter((l) => l.id !== item.id));
              }}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptyBody}>
              Tap the heart on any study spot in Discover to save it here.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 14 },
  card: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginBottom: 10, padding: 14, borderRadius: 12, backgroundColor: '#F0F0F3' },
  cardName: { fontSize: 16, fontWeight: '700' },
  cardMeta: { marginTop: 2, fontSize: 13, color: '#60646C' },
  emptyWrap: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyBody: { marginTop: 6, fontSize: 14, color: '#60646C', textAlign: 'center' },
});
