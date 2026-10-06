import { Colors } from '@/constants/theme';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import type { ReviewCardData } from '@/components/ReviewCard';
import ReviewList from '@/components/ReviewList';
import { getReviewsForLocation } from '@/lib/reviews';

interface Props {
  locationId: string;
  refreshKey?: number;
}

function formatCategoryName(name: string) {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function LocationReviewsSection({
  locationId,
  refreshKey,
}: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [reviews, setReviews] = useState<ReviewCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadReviews = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const data = await getReviewsForLocation(locationId);
        setReviews(data);
      } catch {
        setError('Could not load reviews. Please try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [locationId]
  );

  useEffect(() => {
    loadReviews();
  }, [loadReviews, refreshKey]);

  const overallAverage = useMemo(() => {
    if (reviews.length === 0) return null;

    const total = reviews.reduce(
      (sum, review) => sum + review.overallRating,
      0
    );

    return total / reviews.length;
  }, [reviews]);

  const categoryAverages = useMemo(() => {
    const totals: Record<string, { total: number; count: number }> = {};

    reviews.forEach((review) => {
      if (!review.categoryRatings) return;

      Object.entries(review.categoryRatings).forEach(([category, rating]) => {
        if (!totals[category]) {
          totals[category] = {
            total: 0,
            count: 0,
          };
        }

        totals[category].total += rating;
        totals[category].count += 1;
      });
    });

    return Object.entries(totals).map(([category, values]) => ({
      category,
      average: values.total / values.count,
    }));
  }, [reviews]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.text} />
        <Text style={[styles.statusText, { color: colors.textSecondary }]}>
          Loading reviews...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>

        <Pressable
          accessibilityRole="button"
          style={styles.retryButton}
          onPress={() => loadReviews()}
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.headingRow}>
        <Text style={[styles.heading, { color: colors.text }]}>
          Reviews
        </Text>

        <Pressable
          accessibilityRole="button"
          disabled={refreshing}
          onPress={() => loadReviews(true)}
        >
          <Text style={styles.refreshText}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      {overallAverage !== null && (
        <View
          style={[
            styles.summary,
            {
              backgroundColor: colors.backgroundElement,
              borderColor: colors.textSecondary,
            },
          ]}
        >
          <Text style={[styles.overallRating, { color: colors.text }]}>
            ★ {overallAverage.toFixed(1)}
          </Text>

          <Text style={[styles.reviewCount, { color: colors.textSecondary }]}>
            {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </Text>

          {categoryAverages.length > 0 && (
            <View style={styles.categorySummary}>
              {categoryAverages.map(({ category, average }) => (
                <View
                  key={category}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: colors.backgroundSelected },
                  ]}
                >
                  <Text style={[styles.categoryText, { color: colors.text }]}>
                    {formatCategoryName(category)}: {average.toFixed(1)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <ReviewList reviews={reviews} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  statusText: {
    marginTop: 10,
  },

  error: {
    color: '#C62828',
    fontSize: 14,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#208AEF',
    justifyContent: 'center',
  },

  retryText: {
    color: '#ffffff',
    fontWeight: '700',
  },

  headingRow: {
    marginHorizontal: 14,
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  heading: {
    fontSize: 22,
    fontWeight: '700',
  },

  refreshText: {
    color: '#208AEF',
    fontSize: 14,
    fontWeight: '600',
  },

  summary: {
    marginHorizontal: 14,
    marginBottom: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },

  overallRating: {
    fontSize: 24,
    fontWeight: '700',
  },

  reviewCount: {
    marginTop: 3,
  },

  categorySummary: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },

  categoryChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
  },

  categoryText: {
    fontSize: 12,
  },
});