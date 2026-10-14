import FavoriteButton from '@/components/FavoriteButton';
import { useAuth } from '@/context/AuthContext';
import { listFavoriteLocations } from '@/lib/favorites';
import type { StudyLocation } from '@/lib/locations';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
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
};

export default function FavoritesScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [favorites, setFavorites] = useState<StudyLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      setFavorites(await listFavoriteLocations(user.id));
    } catch {
      setError("Couldn't load your favorites. Check your connection and try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 12 },
      ]}
    >
      <View style={styles.brandRow}>
        <View style={styles.brandText}>
          <Text style={styles.brandTitle}>StudySpot</Text>
          <Text style={styles.brandSubtitle}>
            Your saved study spots
          </Text>
        </View>

        <View style={styles.brandIcon}>
          <MaterialCommunityIcons
            name="book-open-page-variant"
            size={26}
            color={COLORS.goldDark}
          />
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.pageTitle}>Favorites</Text>
        <Text style={styles.pageSubtitle}>
          Your saved places for later
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={COLORS.gold} />
        </View>
      ) : error ? (
        <View style={styles.centerState}>
          <Text style={styles.emptyTitle}>
            Something went wrong
          </Text>
          <Text style={styles.emptyBody}>{error}</Text>

          <Pressable
            accessibilityRole="button"
            style={styles.retryButton}
            onPress={() => {
              setLoading(true);
              void load();
            }}
          >
            <Text style={styles.retryLabel}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={favorites}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            favorites.length === 0 && styles.emptyWrap,
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={COLORS.gold}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View details for ${item.name}`}
                style={styles.cardMain}
                onPress={() =>
                  router.push({
                    pathname: '/location/[id]',
                    params: { id: item.id },
                  })
                }
              >
                <View style={styles.thumbnail}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={34}
                    color={COLORS.goldDark}
                  />
                </View>

                <View style={styles.cardInfo}>
                  <Text
                    style={styles.cardName}
                    numberOfLines={3}
                  >
                    {item.name}
                  </Text>

                  <Text style={styles.cardMeta}>
                    {item.category ?? 'Study spot'}
                  </Text>

                  <View style={styles.viewRow}>
                    <Text style={styles.viewText}>
                      View study spot
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={17}
                      color={COLORS.goldDark}
                    />
                  </View>
                </View>
              </Pressable>

              <View style={styles.favoriteWrap}>
                <FavoriteButton
                  locationId={item.id}
                  initiallyFavorited
                  onChange={(fav) => {
                    if (!fav) {
                      setFavorites((prev) =>
                        prev.filter((l) => l.id !== item.id)
                      );
                    }
                  }}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons
                name="heart-outline"
                size={43}
                color={COLORS.gold}
              />
              <Text style={styles.emptyTitle}>
                No favorites yet
              </Text>
              <Text style={styles.emptyBody}>
                Tap the heart on any study spot in Discover
                to save it here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.page,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  brandText: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 30,
    fontWeight: '900',
    color: COLORS.text,
    letterSpacing: -0.7,
  },
  brandSubtitle: {
    marginTop: 2,
    fontSize: 14,
    color: COLORS.muted,
  },
  brandIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.goldSoft,
  },
  sectionHeading: {
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.text,
  },
  pageSubtitle: {
    marginTop: 3,
    fontSize: 14,
    color: COLORS.muted,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 9,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  cardMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumbnail: {
    width: 93,
    height: 96,
    borderRadius: 16,
    backgroundColor: COLORS.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 19,
    color: COLORS.text,
  },
  cardMeta: {
    marginTop: 5,
    fontSize: 13,
    color: COLORS.muted,
  },
  viewRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldDark,
  },
  favoriteWrap: {
    paddingTop: 4,
    paddingRight: 2,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  emptyWrap: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: 25,
    gap: 9,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.muted,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.goldDark,
  },
  retryLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});