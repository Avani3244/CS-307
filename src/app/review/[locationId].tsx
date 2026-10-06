import LocationReviewsSection from '@/components/LocationReviewsSection';
import { supabase } from '@/lib/supabase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ComponentProps } from 'react';
import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const COLORS = {
  header: '#211A15',
  page: '#F1E2D2',
  card: '#FFF9F2',
  cardSoft: '#FAEFE4',
  text: '#21160F',
  muted: '#9A816B',
  icon: '#A3876D',
  gold: '#C98A38',
  goldDark: '#A96F2D',
  goldSoft: '#F4DFC3',
  border: '#E2CCB8',
  divider: '#EAD7C6',
  white: '#FFFFFF',
  delete: '#A22B25',
  deleteBackground: '#F9DDD7',
};

const studyCategories = [
  'Quietness',
  'Wi-Fi',
  'Outlets',
  'Seating',
  'Food Access',
];

const categoryIcons: Record<string, IconName> = {
  Quietness: 'volume-low',
  'Wi-Fi': 'wifi',
  Outlets: 'power-plug',
  Seating: 'seat',
  'Food Access': 'silverware-fork-knife',
};

function RatingSelector({
  value,
  onChange,
  compact = false,
}: {
  value: number | null;
  onChange: (rating: number) => void;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.ratingRow,
        compact && styles.compactRatingRow,
      ]}
    >
      {[1, 2, 3, 4, 5].map((rating) => {
        const isSelected = value === rating;

        return (
          <Pressable
            key={rating}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${rating} out of 5`}
            onPress={() => onChange(rating)}
            style={({ pressed }) => [
              styles.ratingButton,
              compact
                ? styles.compactRatingButton
                : styles.overallRatingButton,
              isSelected && styles.selectedRatingButton,
              pressed && styles.pressedButton,
            ]}
          >
            <Text
              style={[
                styles.ratingButtonText,
                compact && styles.compactRatingText,
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
  const insets = useSafeAreaInsets();

  const params = useLocalSearchParams<{ locationId?: string }>();
  const locationId = params.locationId ?? 'Unknown location';

  const [overallRating, setOverallRating] =
    useState<number | null>(null);

  const [categoryRatings, setCategoryRatings] = useState<
    Record<string, number>
  >({});

  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedPhoto, setSelectedPhoto] =
    useState<ImagePicker.ImagePickerAsset | null>(null);

  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);

  const updateCategoryRating = (
    category: string,
    rating: number
  ) => {
    setCategoryRatings((currentRatings) => ({
      ...currentRatings,
      [category]: rating,
    }));
  };

  const pickPhoto = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        'Photo permission required',
        'Photo library permission is required to choose a photo.'
      );
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
      selectedPhoto.fileName
        ?.split('.')
        .pop()
        ?.toLowerCase() ?? 'jpg';

    const storagePath =
      `${userId}/${Date.now()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from('review-photos')
      .upload(
        storagePath,
        decode(selectedPhoto.base64),
        {
          contentType:
            selectedPhoto.mimeType ?? 'image/jpeg',
          upsert: false,
        }
      );

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

      const { data: review, error: reviewError } =
        await supabase
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
        const { error: photoRecordError } =
          await supabase
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

      setOverallRating(null);
      setCategoryRatings({});
      setReviewText('');
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Review submission failed:', error);

      if (createdReviewId) {
        await supabase
          .from('reviews')
          .delete()
          .eq('id', createdReviewId);
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

  const shortLocationId =
    locationId === 'Unknown location'
      ? 'No location selected'
      : `${locationId.slice(0, 8)}…`;

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.container,
          {
            paddingBottom:
              Math.max(insets.bottom, 20) + 28,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.locationCard}>
          <View style={styles.locationIconBox}>
            <MaterialCommunityIcons
              name="map-marker"
              size={31}
              color={COLORS.goldDark}
            />
          </View>

          <View style={styles.locationInfo}>
            <Text style={styles.locationTitle}>
              Selected Study Location
            </Text>

            <Text
              numberOfLines={1}
              style={styles.locationSubtitle}
            >
              {shortLocationId}
            </Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconCircle}>
              <MaterialCommunityIcons
                name="star"
                size={20}
                color={COLORS.white}
              />
            </View>

            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>
                Overall Rating
              </Text>

              <Text style={styles.helperText}>
                How would you rate this study location overall?
              </Text>
            </View>

            <View style={styles.currentScoreBadge}>
              <MaterialCommunityIcons
                name="star"
                size={24}
                color={COLORS.gold}
              />

              <Text style={styles.currentScoreText}>
                {overallRating
                  ? overallRating.toFixed(1)
                  : '—'}
              </Text>
            </View>
          </View>

          <RatingSelector
            value={overallRating}
            onChange={setOverallRating}
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconCircle}>
              <MaterialCommunityIcons
                name="tune-variant"
                size={19}
                color={COLORS.white}
              />
            </View>

            <View style={styles.sectionHeadingText}>
              <Text style={styles.sectionTitle}>
                Study-Specific Ratings
              </Text>

              <Text style={styles.helperText}>
                Rate different aspects of this study location.
              </Text>
            </View>
          </View>

          <View style={styles.categoryList}>
            {studyCategories.map((category, index) => (
              <View
                key={category}
                style={[
                  styles.categoryRow,
                  index < studyCategories.length - 1 &&
                    styles.categoryDivider,
                ]}
              >
                <View style={styles.categoryIdentity}>
                  <View style={styles.categoryIconBox}>
                    <MaterialCommunityIcons
                      name={categoryIcons[category]}
                      size={22}
                      color={COLORS.icon}
                    />
                  </View>

                  <Text
                    numberOfLines={1}
                    style={styles.categoryLabel}
                  >
                    {category}
                  </Text>
                </View>

                <View style={styles.categoryRatingArea}>
                  <RatingSelector
                    compact
                    value={
                      categoryRatings[category] ?? null
                    }
                    onChange={(rating) =>
                      updateCategoryRating(
                        category,
                        rating
                      )
                    }
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.simpleSectionHeading}>
            <View style={styles.sectionIconCircle}>
              <MaterialCommunityIcons
                name="pencil"
                size={19}
                color={COLORS.white}
              />
            </View>

            <Text style={styles.sectionTitle}>
              Your Review
            </Text>
          </View>

          <TextInput
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="What was it like studying here?"
            placeholderTextColor="#AF9B89"
            multiline
            maxLength={1000}
            style={styles.reviewInput}
          />

          <Text style={styles.characterCount}>
            {reviewText.length}/1000
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.simpleSectionHeading}>
            <View style={styles.sectionIconCircle}>
              <MaterialCommunityIcons
                name="image"
                size={20}
                color={COLORS.white}
              />
            </View>

            <View>
              <Text style={styles.sectionTitle}>
                Photo
              </Text>

              <Text style={styles.helperText}>
                Add an optional photo of this study location.
              </Text>
            </View>
          </View>

          {!selectedPhoto ? (
            <Pressable
              accessibilityRole="button"
              onPress={pickPhoto}
              style={({ pressed }) => [
                styles.photoButton,
                pressed && styles.pressedButton,
              ]}
            >
              <MaterialCommunityIcons
                name="image-plus"
                size={27}
                color={COLORS.goldDark}
              />

              <Text style={styles.photoButtonText}>
                Choose Photo
              </Text>
            </Pressable>
          ) : (
            <View style={styles.photoPreviewContainer}>
              <Image
                source={{ uri: selectedPhoto.uri }}
                style={styles.photoPreview}
              />

              <Pressable
                accessibilityRole="button"
                onPress={() => setSelectedPhoto(null)}
                style={styles.removePhotoButton}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={18}
                  color={COLORS.delete}
                />

                <Text style={styles.removePhotoText}>
                  Remove Photo
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={submitReview}
          disabled={isSubmitting}
          style={({ pressed }) => [
            styles.submitButton,
            isSubmitting &&
              styles.submitButtonDisabled,
            pressed &&
              !isSubmitting &&
              styles.submitButtonPressed,
          ]}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting
              ? 'Submitting...'
              : 'Submit Review'}
          </Text>

          {!isSubmitting && (
            <MaterialCommunityIcons
              name="arrow-right"
              size={25}
              color={COLORS.white}
            />
          )}
        </Pressable>

        <View style={styles.reviewsSection}>
          <LocationReviewsSection
            locationId={locationId}
            refreshKey={reviewsRefreshKey}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.page,
  },

  scrollView: {
    flex: 1,
    backgroundColor: COLORS.page,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  container: {
    paddingTop: 18,
    paddingHorizontal: 14,
    gap: 18,
  },

  locationCard: {
    minHeight: 96,
    padding: 16,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,

    flexDirection: 'row',
    alignItems: 'center',

    shadowColor: '#5B3D28',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },

  locationIconBox: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: COLORS.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  locationInfo: {
    flex: 1,
    marginLeft: 14,
  },

  locationTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },

  locationSubtitle: {
    marginTop: 5,
    color: COLORS.muted,
    fontSize: 14,
  },

  sectionCard: {
    padding: 17,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,

    shadowColor: '#5B3D28',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  simpleSectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 13,
  },

  sectionIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.icon,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  sectionHeadingText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.25,
  },

  helperText: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 18,
  },

  currentScoreBadge: {
    minWidth: 89,
    marginLeft: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: COLORS.cardSoft,
    borderWidth: 1,
    borderColor: COLORS.goldSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  currentScoreText: {
    color: COLORS.text,
    fontSize: 19,
    fontWeight: '800',
  },

  ratingRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 18,
  },

  compactRatingRow: {
    flex: 1,
    marginTop: 0,
    gap: 5,
  },

  ratingButton: {
    borderWidth: 1,
    borderColor: '#F0E2D5',
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },

  overallRatingButton: {
    flex: 1,
    height: 54,
    borderRadius: 15,
  },

  compactRatingButton: {
    flex: 1,
    minWidth: 29,
    height: 38,
    borderRadius: 11,
  },

  selectedRatingButton: {
    backgroundColor: COLORS.gold,
    borderColor: COLORS.goldDark,

    shadowColor: COLORS.goldDark,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },

  pressedButton: {
    opacity: 0.75,
  },

  ratingButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '500',
  },

  compactRatingText: {
    fontSize: 14,
  },

  selectedRatingText: {
    color: COLORS.white,
    fontWeight: '800',
  },

  categoryList: {
    marginTop: 14,
  },

  categoryRow: {
    minHeight: 59,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },

  categoryDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  categoryIdentity: {
    width: 135,
    flexDirection: 'row',
    alignItems: 'center',
  },

  categoryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.cardSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  categoryLabel: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '600',
  },

  categoryRatingArea: {
    flex: 1,
    minWidth: 0,
  },

  reviewInput: {
    minHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#DCC3AA',
    borderRadius: 17,
    backgroundColor: '#FFFDF9',

    color: COLORS.text,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },

  characterCount: {
    marginTop: 6,
    color: COLORS.muted,
    textAlign: 'right',
    fontSize: 11,
  },

  photoButton: {
    minHeight: 82,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#D8BFA8',
    borderRadius: 17,
    backgroundColor: '#FFF9F3',

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 11,
  },

  photoButtonText: {
    color: '#51331D',
    fontSize: 16,
    fontWeight: '700',
  },

  photoPreviewContainer: {
    gap: 11,
  },

  photoPreview: {
    width: '100%',
    height: 220,
    borderRadius: 18,
  },

  removePhotoButton: {
    alignSelf: 'flex-end',
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: COLORS.deleteBackground,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  removePhotoText: {
    color: COLORS.delete,
    fontSize: 13,
    fontWeight: '700',
  },

  submitButton: {
    minHeight: 62,
    borderRadius: 20,
    paddingHorizontal: 20,
    backgroundColor: COLORS.goldDark,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,

    shadowColor: '#66401F',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },

  submitButtonPressed: {
    backgroundColor: '#956026',
  },

  submitButtonDisabled: {
    opacity: 0.55,
  },

  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '800',
  },

  reviewsSection: {
    marginHorizontal: -14,
  },
});