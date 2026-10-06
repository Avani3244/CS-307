import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ReviewCardData } from '@/components/ReviewCard';
import ReviewList from '@/components/ReviewList';
import { useAuth } from '@/context/AuthContext';
import {
  deleteReview,
  getReviewsForLocation,
  updateReview,
} from '@/lib/reviews';

type IconName =
  ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  locationId: string;
  refreshKey?: number;
}

const COLORS = {
  card: '#FFF9F2',
  cardSoft: '#FAEFE4',
  text: '#21160F',
  muted: '#9A816B',
  icon: '#A3876D',
  gold: '#C98A38',
  goldDark: '#A96F2D',
  border: '#E2CCB8',
  divider: '#EAD7C6',
  green: '#286022',
  greenBackground: '#EAF4DE',
  greenBorder: '#D3E8C7',
  error: '#A22B25',
};

const CATEGORY_ORDER = [
  'food',
  'wifi',
  'outlets',
  'seating',
  'quietness',
];

const CATEGORY_META: Record<
  string,
  { label: string; icon: IconName }
> = {
  food: {
    label: 'Food',
    icon: 'silverware-fork-knife',
  },
  wifi: {
    label: 'Wi-Fi',
    icon: 'wifi',
  },
  outlets: {
    label: 'Outlets',
    icon: 'power-plug',
  },
  seating: {
    label: 'Seating',
    icon: 'seat',
  },
  quietness: {
    label: 'Quietness',
    icon: 'volume-low',
  },
};

function normalizeCategoryKey(name: string) {
  const normalized = name
    .toLowerCase()
    .replace(/[\s_-]+/g, '');

  if (
    normalized === 'food' ||
    normalized === 'foodaccess'
  ) {
    return 'food';
  }

  if (normalized === 'wifi') {
    return 'wifi';
  }

  if (normalized === 'outlets') {
    return 'outlets';
  }

  if (normalized === 'seating') {
    return 'seating';
  }

  if (normalized === 'quietness') {
    return 'quietness';
  }

  return name.toLowerCase();
}

export default function LocationReviewsSection({
  locationId,
  refreshKey,
}: Props) {
  const { user } = useAuth();

  const [reviews, setReviews] =
    useState<ReviewCardData[]>([]);

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
        const data =
          await getReviewsForLocation(locationId);

        setReviews(data);
      } catch {
        setError(
          'Could not load reviews. Please try again.'
        );
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

  const handleDeleteReview = async (
    reviewId: string
  ) => {
    try {
      setError('');

      await deleteReview(reviewId);
      await loadReviews(true);
    } catch {
      setError(
        'Could not delete the review. Please try again.'
      );
    }
  };

  const handleEditReview = async (
    reviewId: string,
    updates: {
      overallRating: number;
      categoryRatings: Record<string, number>;
      reviewText: string;
    }
  ) => {
    try {
      setError('');

      await updateReview(reviewId, updates);
      await loadReviews(true);
    } catch {
      setError(
        'Could not update the review. Please try again.'
      );

      throw new Error('Could not update review');
    }
  };

  const overallAverage = useMemo(() => {
    if (reviews.length === 0) {
      return null;
    }

    const total = reviews.reduce(
      (sum, review) =>
        sum + review.overallRating,
      0
    );

    return total / reviews.length;
  }, [reviews]);

  const categoryAverages = useMemo(() => {
    const totals: Record<
      string,
      { total: number; count: number }
    > = {};

    reviews.forEach((review) => {
      if (!review.categoryRatings) {
        return;
      }

      Object.entries(
        review.categoryRatings
      ).forEach(([category, rating]) => {
        const normalized =
          normalizeCategoryKey(category);

        if (!totals[normalized]) {
          totals[normalized] = {
            total: 0,
            count: 0,
          };
        }

        totals[normalized].total += rating;
        totals[normalized].count += 1;
      });
    });

    return CATEGORY_ORDER.filter(
      (category) => totals[category]
    ).map((category) => ({
      category,
      average:
        totals[category].total /
        totals[category].count,
    }));
  }, [reviews]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={COLORS.goldDark}
        />

        <Text style={styles.statusText}>
          Loading reviews...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          {error}
        </Text>

        <Pressable
          accessibilityRole="button"
          style={styles.retryButton}
          onPress={() => loadReviews()}
        >
          <Text style={styles.retryText}>
            Retry
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <View style={styles.headingText}>
          <Text style={styles.heading}>
            Reviews
          </Text>

          <Text style={styles.headingSubtitle}>
            What students are saying
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={refreshing}
          onPress={() => loadReviews(true)}
          style={({ pressed }) => [
            styles.refreshButton,
            refreshing &&
              styles.refreshButtonDisabled,
            pressed &&
              !refreshing &&
              styles.buttonPressed,
          ]}
        >
          <MaterialCommunityIcons
            name="refresh"
            size={19}
            color={COLORS.text}
          />

          <Text style={styles.refreshText}>
            {refreshing
              ? 'Refreshing'
              : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      {overallAverage !== null && (
        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View style={styles.scoreArea}>
              <MaterialCommunityIcons
                name="star"
                size={48}
                color={COLORS.gold}
              />

              <View>
                <Text style={styles.overallRating}>
                  {overallAverage.toFixed(1)}
                </Text>

                <Text style={styles.reviewCount}>
                  Based on {reviews.length}{' '}
                  {reviews.length === 1
                    ? 'review'
                    : 'reviews'}
                </Text>
              </View>
            </View>

            <View style={styles.scoreBadge}>
              <MaterialCommunityIcons
                name="crown"
                size={20}
                color={COLORS.green}
              />

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
            <>
              <View style={styles.divider} />

              <View style={styles.categorySummary}>
                {categoryAverages.map(
                  ({ category, average }) => {
                    const meta =
                      CATEGORY_META[category];

                    return (
                      <View
                        key={category}
                        style={
                          styles.categorySummaryCard
                        }
                      >
                        <MaterialCommunityIcons
                          name={
                            meta?.icon ??
                            'star-outline'
                          }
                          size={22}
                          color={COLORS.icon}
                        />

                        <Text
                          numberOfLines={1}
                          style={
                            styles.categorySummaryLabel
                          }
                        >
                          {meta?.label ??
                            category}
                        </Text>

                        <Text
                          style={
                            styles.categorySummaryValue
                          }
                        >
                          {average.toFixed(1)}
                        </Text>
                      </View>
                    );
                  }
                )}
              </View>
            </>
          )}
        </View>
      )}

      <ReviewList
        reviews={reviews}
        currentUserId={user?.id}
        onDeleteReview={handleDeleteReview}
        onEditReview={handleEditReview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingTop: 10,
  },

  centered: {
    paddingVertical: 35,
    paddingHorizontal: 20,
    alignItems: 'center',
  },

  statusText: {
    marginTop: 10,
    color: COLORS.muted,
    fontSize: 14,
  },

  error: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 14,
    minHeight: 42,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: COLORS.goldDark,
    justifyContent: 'center',
  },

  retryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  headingRow: {
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: 16,

    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },

  headingText: {
    flex: 1,
    minWidth: 0,
  },

  heading: {
    color: COLORS.text,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    letterSpacing: -0.8,
  },

  headingSubtitle: {
    marginTop: 2,
    color: COLORS.muted,
    fontSize: 16,
  },

  refreshButton: {
    minHeight: 46,
    paddingHorizontal: 15,
    borderRadius: 23,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,

    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,

    shadowColor: '#5B3D28',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },

  refreshButtonDisabled: {
    opacity: 0.55,
  },

  refreshText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },

  buttonPressed: {
    opacity: 0.72,
  },

  summary: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 18,

    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,

    shadowColor: '#5B3D28',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },

  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },

  scoreArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  overallRating: {
    color: COLORS.text,
    fontSize: 40,
    lineHeight: 43,
    fontWeight: '900',
    letterSpacing: -1,
  },

  reviewCount: {
    marginTop: 1,
    color: COLORS.muted,
    fontSize: 13,
  },

  scoreBadge: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 9,

    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.greenBorder,
    backgroundColor: COLORS.greenBackground,

    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  scoreBadgeText: {
    color: COLORS.green,
    fontSize: 12,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    marginTop: 17,
    marginBottom: 14,
    backgroundColor: COLORS.divider,
  },

  categorySummary: {
    flexDirection: 'row',
    gap: 6,
  },

  categorySummaryCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 94,

    paddingVertical: 10,
    paddingHorizontal: 3,
    borderRadius: 17,

    backgroundColor: COLORS.cardSoft,

    alignItems: 'center',
    justifyContent: 'center',
  },

  categorySummaryLabel: {
    width: '100%',
    marginTop: 5,
    color: COLORS.muted,
    fontSize: 10,
    textAlign: 'center',
  },

  categorySummaryValue: {
    marginTop: 3,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
  },
});