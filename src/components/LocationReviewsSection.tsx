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
import { useAuth } from '@/context/AuthContext';
import { deleteReview, getReviewsForLocation } from '@/lib/reviews';

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
  const { user } = useAuth();

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

  const handleDeleteReview = async (reviewId: string) => {
    try {
      setError('');

      await deleteReview(reviewId);

      // Automatically reload reviews and rating summaries after deletion.
      await loadReviews(true);
    } catch {
      setError('Could not delete the review. Please try again.');
    }
  };

  const overallAverage = useMemo(() => {
    if (reviews.length === 0) {
      return null;
    }

    const total = reviews.reduce(
      (sum, review) => sum + review.overallRating,
      0
    );

    return total / reviews.length;
  }, [reviews]);

  const categoryAverages = useMemo(() => {
    const totals: Record<string, { total: number; count: number }> = {};

    reviews.forEach((review) => {
      if (!review.categoryRatings) {
        return;
      }

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
        <View>
          <Text style={styles.heading}>Reviews</Text>

          <Text style={styles.headingSubtitle}>
            What students are saying
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={refreshing}
          style={styles.refreshButton}
          onPress={() => loadReviews(true)}
        >
          <Text style={styles.refreshText}>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      {overallAverage !== null && (
        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={styles.overallRating}>
                ★ {overallAverage.toFixed(1)}
              </Text>

              <Text style={styles.reviewCount}>
                Based on {reviews.length}{' '}
                {reviews.length === 1 ? 'review' : 'reviews'}
              </Text>
            </View>

            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>
                {overallAverage >= 4
                  ? 'Highly rated'
                  : overallAverage >= 3
                    ? 'Good'
                    : 'Mixed'}
              </Text>
            </View>
          </View>

          {categoryAverages.length > 0 && (
            <View style={styles.categorySummary}>
              {categoryAverages.map(({ category, average }) => (
                <View key={category} style={styles.categoryChip}>
                  <Text style={styles.categoryLabel}>
                    {formatCategoryName(category)}
                  </Text>

                  <Text style={styles.categoryValue}>
                    {average.toFixed(1)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <ReviewList
        reviews={reviews}
        currentUserId={user?.id}
        onDeleteReview={handleDeleteReview}
      />
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
    color: '#5F4E45',
  },

  error: {
    color: '#7A302F',
    fontSize: 14,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#765F53',
    justifyContent: 'center',
  },

  retryText: {
    color: '#F6EEE9',
    fontWeight: '700',
  },

  headingRow: {
    marginHorizontal: 16,
    marginTop: 22,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  heading: {
    fontSize: 27,
    fontWeight: '800',
    color: '#2B211C',
  },

  headingSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: '#5F4E45',
  },

  refreshButton: {
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#C7B0A2',
    borderWidth: 1,
    borderColor: '#9B8173',
  },

  refreshText: {
    color: '#493A32',
    fontSize: 12,
    fontWeight: '700',
  },

  summary: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 19,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#7B6559',
    backgroundColor: '#B19989',

    shadowColor: '#4A3930',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 7,

    elevation: 4,
  },

  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },

  overallRating: {
    fontSize: 32,
    fontWeight: '800',
    color: '#2B211C',
  },

  reviewCount: {
    marginTop: 4,
    fontSize: 13,
    color: '#5F4E45',
  },

  scoreBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#D2BFB4',
    borderWidth: 1,
    borderColor: '#9B8173',
  },

  scoreBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#493A32',
  },

  categorySummary: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },

  categoryChip: {
    width: '47%',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#C7B0A2',
    borderWidth: 1,
    borderColor: '#A18778',
  },

  categoryLabel: {
    fontSize: 11,
    color: '#5F4E45',
  },

  categoryValue: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: '800',
    color: '#2B211C',
  },
});