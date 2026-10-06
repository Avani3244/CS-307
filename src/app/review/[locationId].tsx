import LocationReviewsSection from '@/components/LocationReviewsSection';
import { Colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';

import { useState } from 'react';
import {
  Alert,
  Image,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPhoto, setSelectedPhoto] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);

  const updateCategoryRating = (category: string, rating: number) => {
    setCategoryRatings((currentRatings) => ({
      ...currentRatings,
      [category]: rating,
    }));
  };

  const pickPhoto = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      alert('Photo library permission is required to choose a photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled) {
      setSelectedPhoto(result.assets[0]);
    }
  };

  const uploadReviewPhoto = async (userId: string) => {
    if (!selectedPhoto) {
      return null;
    }

    if (!selectedPhoto.base64) {
      throw new Error('Selected photo is missing image data.');
    }

    const fileExtension =
      selectedPhoto.fileName?.split('.').pop()?.toLowerCase() ?? 'jpg';

    const storagePath = `${userId}/${Date.now()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from('review-photos')
      .upload(storagePath, decode(selectedPhoto.base64), {
        contentType: selectedPhoto.mimeType ?? 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    return storagePath;
  };

  const submitReview = async () => {
    if (!overallRating) {
      Alert.alert(
        'Missing overall rating',
        'Please select an overall rating before submitting.'
      );
      return;
    }

    const requiredCategories = [
      'Quietness',
      'Wi-Fi',
      'Outlets',
      'Seating',
      'Food Access',
    ];

    const missingCategory = requiredCategories.find(
      (category) => !categoryRatings[category]
    );

    if (missingCategory) {
      Alert.alert(
        'Missing rating',
        `Please rate ${missingCategory} before submitting.`
      );
      return;
    }

    if (!locationId || locationId === 'Unknown location') {
      Alert.alert(
        'Invalid location',
        'This review must be opened from a valid study location.'
      );
      return;
    }

    let uploadedPhotoPath: string | null = null;
    let createdReviewId: string | null = null;

    try {
      setIsSubmitting(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert(
          'Sign in required',
          'You must be signed in before submitting a review.'
        );
        return;
      }

      if (selectedPhoto) {
        uploadedPhotoPath = await uploadReviewPhoto(user.id);
      }

      const { data: review, error: reviewError } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          location_id: locationId,
          overall_rating: overallRating,
          category_ratings: {
            quietness: categoryRatings['Quietness'],
            wifi: categoryRatings['Wi-Fi'],
            outlets: categoryRatings['Outlets'],
            seating: categoryRatings['Seating'],
            food: categoryRatings['Food Access'],
          },
          review_text: reviewText.trim() || null,
        })
        .select('id')
        .single();

      if (reviewError) {
        throw reviewError;
      }

      createdReviewId = review.id;

      if (uploadedPhotoPath) {
        const { error: photoRecordError } = await supabase
          .from('review_photos')
          .insert({
            review_id: review.id,
            storage_path: uploadedPhotoPath,
          });

        if (photoRecordError) {
          throw photoRecordError;
        }
      }

      Alert.alert(
        'Review submitted',
        'Your review was submitted successfully.'
      );

      setReviewsRefreshKey((current) => current + 1);

      console.log('Created review:', review.id);

      setOverallRating(null);
      setCategoryRatings({});
      setReviewText('');
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Review submission failed:', error);

      if (createdReviewId) {
        await supabase.from('reviews').delete().eq('id', createdReviewId);
      }

      if (uploadedPhotoPath) {
        await supabase.storage
          .from('review-photos')
          .remove([uploadedPhotoPath]);
      }

      Alert.alert(
        'Could not submit review',
        'Something went wrong while saving your review. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
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
          onPress={pickPhoto}
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
        {selectedPhoto && (
          <View style={styles.photoPreviewContainer}>
            <Image
              source={{ uri: selectedPhoto.uri }}
              style={styles.photoPreview}
            />

            <Pressable onPress={() => setSelectedPhoto(null)}>
              <Text style={{ color: colors.textSecondary }}>
                Remove Photo
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <Pressable
        onPress={submitReview}
        disabled={isSubmitting}
        style={[
          styles.submitButton,
          {
            borderColor: colors.text,
            backgroundColor: colors.backgroundElement,
            opacity: isSubmitting ? 0.6 : 1,
          },
        ]}
      >
        <Text style={[styles.submitButtonText, { color: colors.text }]}>
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </Text>
      </Pressable>
      <LocationReviewsSection
        locationId={locationId}
        refreshKey={reviewsRefreshKey}
      />
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

  photoPreviewContainer: {
    gap: 10,
    alignItems: 'center',
  },

  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
});