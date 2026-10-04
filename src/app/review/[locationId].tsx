import { Colors } from '@/constants/theme';
import { useLocalSearchParams } from 'expo-router';

import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
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
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={styles.ratingRow}>
      {[1, 2, 3, 4, 5].map((rating) => {
        const isSelected = value === rating;

        return (
          <Pressable
            key={rating}
            onPress={() => onChange(rating)}
            style={[
              styles.ratingButton,
              {
                borderColor: isSelected
                  ? colors.text
                  : colors.textSecondary,
                backgroundColor: isSelected
                  ? colors.backgroundElement
                  : colors.background,
              },
              isSelected && styles.selectedRatingButton,
            ]}
          >
            <Text
              style={[
                styles.ratingButtonText,
                { color: colors.text },
                isSelected && styles.selectedRatingText,
              ]}
            >
              {rating}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function ReviewScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  
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
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: colors.text }]}>
        Write a Review
      </Text>

      <Text style={[styles.locationText, { color: colors.textSecondary }]}>
        Location ID: {locationId}
      </Text>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Overall Rating *
        </Text>
        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          How would you rate this study location overall?
        </Text>

        <RatingSelector
          value={overallRating}
          onChange={setOverallRating}
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Study-Specific Ratings
        </Text>

        {studyCategories.map((category) => (
          <View key={category} style={styles.categoryContainer}>
            <Text style={[styles.categoryLabel, { color: colors.text }]}>
              {category}
            </Text>
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Your Review
        </Text>

        <TextInput
          value={reviewText}
          onChangeText={setReviewText}
          placeholder="What was it like studying here?"
          placeholderTextColor={colors.textSecondary}
          multiline
          maxLength={1000}
          style={[
            styles.reviewInput,
            {
              color: colors.text,
              borderColor: colors.textSecondary,
              backgroundColor: colors.backgroundElement,
            },
          ]}
        />

        <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
          {reviewText.length}/1000
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Photo
        </Text>

        <Text style={[styles.helperText, { color: colors.textSecondary }]}>
          Add an optional photo of this study location.
        </Text>

        <Pressable
          style={[
            styles.photoButton,
            {
              borderColor: colors.textSecondary,
              backgroundColor: colors.backgroundElement,
            },
          ]}
        >
          <Text style={[styles.photoButtonText, { color: colors.text }]}>
            Choose Photo
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.submitButton,
          {
            borderColor: colors.text,
            backgroundColor: colors.backgroundElement,
          },
        ]}
      >
        <Text style={[styles.submitButtonText, { color: colors.text }]}>
          Submit Review
        </Text>
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