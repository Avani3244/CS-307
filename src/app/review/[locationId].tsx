import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const studyCategories = [
  'Quietness',
  'Wi-Fi',
  'Outlets',
  'Seating',
  'Food Access',
];

function RatingSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (rating: number) => void;
}) {
  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <Pressable
          key={rating}
          onPress={() => onChange(rating)}
          style={[
            styles.ratingButton,
            value === rating && styles.selectedRatingButton,
          ]}
        >
          <Text
            style={[
              styles.ratingButtonText,
              value === rating && styles.selectedRatingText,
            ]}
          >
            {rating}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function ReviewScreen() {
  const params = useLocalSearchParams<{ locationId?: string }>();
  const locationId = params.locationId ?? 'Unknown location';

  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [categoryRatings, setCategoryRatings] = useState<
    Record<string, number>
  >({});
  const [reviewText, setReviewText] = useState('');

  const updateCategoryRating = (category: string, rating: number) => {
    setCategoryRatings((currentRatings) => ({
      ...currentRatings,
      [category]: rating,
    }));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Write a Review</Text>

      <Text style={styles.locationText}>
        Location ID: {locationId}
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overall Rating *</Text>
        <Text style={styles.helperText}>
          How would you rate this study location overall?
        </Text>

        <RatingSelector
          value={overallRating}
          onChange={setOverallRating}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Study-Specific Ratings
        </Text>

        {studyCategories.map((category) => (
          <View key={category} style={styles.categoryContainer}>
            <Text style={styles.categoryLabel}>{category}</Text>

            <RatingSelector
              value={categoryRatings[category] ?? null}
              onChange={(rating) =>
                updateCategoryRating(category, rating)
              }
            />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Review</Text>

        <TextInput
          value={reviewText}
          onChangeText={setReviewText}
          placeholder="What was it like studying here?"
          multiline
          maxLength={1000}
          style={styles.reviewInput}
        />

        <Text style={styles.characterCount}>
          {reviewText.length}/1000
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Photo</Text>

        <Text style={styles.helperText}>
          Add an optional photo of this study location.
        </Text>

        <Pressable style={styles.photoButton}>
          <Text style={styles.photoButtonText}>Choose Photo</Text>
        </Pressable>
      </View>

      <Pressable style={styles.submitButton}>
        <Text style={styles.submitButtonText}>Submit Review</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingBottom: 48,
    gap: 24,
  },

  title: {
    fontSize: 30,
    fontWeight: '700',
  },

  locationText: {
    fontSize: 14,
    opacity: 0.7,
  },

  section: {
    gap: 12,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },

  helperText: {
    fontSize: 14,
    opacity: 0.7,
  },

  categoryContainer: {
    gap: 8,
    marginBottom: 12,
  },

  categoryLabel: {
    fontSize: 16,
    fontWeight: '500',
  },

  ratingRow: {
    flexDirection: 'row',
    gap: 10,
  },

  ratingButton: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  selectedRatingButton: {
    borderWidth: 3,
  },

  ratingButtonText: {
    fontSize: 16,
  },

  selectedRatingText: {
    fontWeight: '700',
  },

  reviewInput: {
    minHeight: 130,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
  },

  characterCount: {
    textAlign: 'right',
    fontSize: 12,
    opacity: 0.6,
  },

  photoButton: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },

  photoButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },

  submitButton: {
    borderWidth: 2,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },

  submitButtonText: {
    fontSize: 17,
    fontWeight: '700',
  },
});