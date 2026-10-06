import { FlatList, StyleSheet, Text, View } from 'react-native';

import ReviewCard, { type ReviewCardData } from '@/components/ReviewCard';

interface Props {
  reviews: ReviewCardData[];
  currentUserId?: string;
  onDeleteReview?: (reviewId: string) => Promise<void>;
}

export default function ReviewList({
  reviews,
  currentUserId,
  onDeleteReview,
}: Props) {
  if (reviews.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No reviews yet</Text>
        <Text style={styles.emptyText}>
          Be the first person to review this study location.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={reviews}
      keyExtractor={(review) => review.id}
      renderItem={({ item }) => (
        <ReviewCard
          review={item}
          isOwnReview={item.userId === currentUserId}
          onDeleteReview={onDeleteReview}
        />
      )}
      contentContainerStyle={styles.list}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingVertical: 8,
  },

  empty: {
    padding: 24,
    alignItems: 'center',
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#60646C',
    textAlign: 'center',
  },
});