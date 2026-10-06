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
        <View style={styles.reviewerInfo}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={styles.reviewer}
          >
            {review.reviewerName}
          </Text>

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
                <Text style={styles.categoryName}>
                  {formatCategoryName(name)}
                </Text>

                <Text style={styles.categoryRating}>
                  {rating}/5
                </Text>
              </View>
            ))}
          </View>
        )}

      {!!review.reviewText && (
        <View style={styles.reviewBody}>
          <Text style={styles.reviewText}>{review.reviewText}</Text>
        </View>
      )}

      {!!review.photoUrl && (
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: review.photoUrl }}
            style={styles.photo}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#7B6559',
    backgroundColor: '#B69B8C',

    shadowColor: '#4A3930',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.18,
    shadowRadius: 7,

    elevation: 4,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  reviewerInfo: {
    flex: 1,
    minWidth: 0,
  },

  reviewer: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
    color: '#2B211C',
  },

  date: {
    marginTop: 4,
    fontSize: 12,
    color: '#5F4E45',
  },

  ratingBadge: {
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#D2BFB4',
    borderWidth: 1,
    borderColor: '#9B8173',
  },

  ratingText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2B211C',
  },

  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },

  categoryChip: {
    minWidth: 88,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#C7B0A2',
    borderWidth: 1,
    borderColor: '#A18778',
  },

  categoryName: {
    fontSize: 11,
    color: '#5F4E45',
  },

  categoryRating: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: '700',
    color: '#2B211C',
  },

  reviewBody: {
    marginTop: 16,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#92796B',
  },

  reviewText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#2B211C',
  },

  photoContainer: {
    marginTop: 16,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#92796B',
  },

  photo: {
    width: '100%',
    height: 220,
  },
});