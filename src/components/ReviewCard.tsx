import { Image, StyleSheet, Text, View } from 'react-native';

export interface ReviewCardData {
  id: string;
  reviewerName: string;
  overallRating: number;
  categoryRatings?: Record<string, number> | null;
  reviewText?: string | null;
  createdAt: string;
  photoUrl?: string | null;
}

interface Props {
  review: ReviewCardData;
}

function formatCategoryName(name: string) {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ReviewCard({ review }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.reviewer}>{review.reviewerName}</Text>
          <Text style={styles.date}>
            {new Date(review.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>
            ★ {review.overallRating.toFixed(1)}
          </Text>
        </View>
      </View>

      {review.categoryRatings &&
        Object.entries(review.categoryRatings).length > 0 && (
          <View style={styles.categories}>
            {Object.entries(review.categoryRatings).map(([name, rating]) => (
              <View key={name} style={styles.categoryChip}>
                <Text style={styles.categoryText}>
                  {formatCategoryName(name)}: {rating}/5
                </Text>
              </View>
            ))}
          </View>
        )}

      {!!review.reviewText && (
        <Text style={styles.reviewText}>{review.reviewText}</Text>
      )}

      {!!review.photoUrl && (
        <Image
          source={{ uri: review.photoUrl }}
          style={styles.photo}
          resizeMode="cover"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 14,
    marginBottom: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#F0F0F3',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  reviewer: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },

  date: {
    marginTop: 2,
    fontSize: 12,
    color: '#60646C',
  },

  ratingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#fff',
  },

  ratingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },

  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },

  categoryChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#fff',
  },

  categoryText: {
    fontSize: 12,
    color: '#444',
  },

  reviewText: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 21,
    color: '#222',
  },

  photo: {
    width: '100%',
    height: 190,
    borderRadius: 10,
    marginTop: 12,
  },
});