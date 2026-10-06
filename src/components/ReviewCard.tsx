import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export interface ReviewCardData {
  id: string;
  userId: string;
  reviewerName: string;
  overallRating: number;
  categoryRatings?: Record<string, number> | null;
  reviewText?: string | null;
  createdAt: string;
  photoUrl?: string | null;
}

interface ReviewUpdates {
  overallRating: number;
  categoryRatings: Record<string, number>;
  reviewText: string;
}

interface Props {
  review: ReviewCardData;
  isOwnReview?: boolean;
  onDeleteReview?: (reviewId: string) => Promise<void>;
  onEditReview?: (
    reviewId: string,
    updates: ReviewUpdates
  ) => Promise<void>;
}

const ratingOptions = [1, 2, 3, 4, 5];

function formatCategoryName(name: string) {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ReviewCard({
  review,
  isOwnReview = false,
  onDeleteReview,
  onEditReview,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editOverallRating, setEditOverallRating] = useState(
    review.overallRating
  );

  const [editCategoryRatings, setEditCategoryRatings] = useState<
    Record<string, number>
  >(review.categoryRatings ?? {});

  const [editReviewText, setEditReviewText] = useState(
    review.reviewText ?? ''
  );

  useEffect(() => {
    if (!editing) {
      setEditOverallRating(review.overallRating);
      setEditCategoryRatings(review.categoryRatings ?? {});
      setEditReviewText(review.reviewText ?? '');
    }
  }, [review, editing]);

  const handleDeletePress = () => {
    Alert.alert(
      'Delete review?',
      'This review will be permanently deleted.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!onDeleteReview || deleting) {
              return;
            }

            try {
              setDeleting(true);
              await onDeleteReview(review.id);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleEditPress = () => {
    setEditOverallRating(review.overallRating);
    setEditCategoryRatings(review.categoryRatings ?? {});
    setEditReviewText(review.reviewText ?? '');
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditOverallRating(review.overallRating);
    setEditCategoryRatings(review.categoryRatings ?? {});
    setEditReviewText(review.reviewText ?? '');
    setEditing(false);
  };

  const handleCategoryRatingChange = (
    category: string,
    rating: number
  ) => {
    setEditCategoryRatings((current) => ({
      ...current,
      [category]: rating,
    }));
  };

  const handleSaveEdit = async () => {
    if (!onEditReview || saving) {
      return;
    }

    try {
      setSaving(true);

      await onEditReview(review.id, {
        overallRating: editOverallRating,
        categoryRatings: editCategoryRatings,
        reviewText: editReviewText,
      });

      setEditing(false);
    } catch {
      Alert.alert(
        'Could not save changes',
        'Please try editing your review again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.reviewerInfo}>
          <View style={styles.nameRow}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.reviewer}
            >
              {review.reviewerName}
            </Text>

            {isOwnReview && (
              <View style={styles.yourReviewBadge}>
                <Text style={styles.yourReviewText}>
                  Your review
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.date}>
            {new Date(review.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {!editing && (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>
              ★ {review.overallRating.toFixed(1)}
            </Text>
          </View>
        )}
      </View>

      {editing ? (
        <View style={styles.editSection}>
          <Text style={styles.editHeading}>Edit your review</Text>

          <Text style={styles.editLabel}>Overall rating</Text>

          <View style={styles.ratingSelector}>
            {ratingOptions.map((rating) => (
              <Pressable
                key={rating}
                accessibilityRole="button"
                onPress={() => setEditOverallRating(rating)}
                style={[
                  styles.ratingOption,
                  editOverallRating === rating &&
                    styles.ratingOptionSelected,
                ]}
              >
                <Text
                  style={[
                    styles.ratingOptionText,
                    editOverallRating === rating &&
                      styles.ratingOptionTextSelected,
                  ]}
                >
                  {rating}
                </Text>
              </Pressable>
            ))}
          </View>

          {Object.keys(editCategoryRatings).length > 0 && (
            <View style={styles.editCategories}>
              {Object.entries(editCategoryRatings).map(
                ([category, selectedRating]) => (
                  <View
                    key={category}
                    style={styles.editCategoryBlock}
                  >
                    <Text style={styles.editLabel}>
                      {formatCategoryName(category)}
                    </Text>

                    <View style={styles.ratingSelector}>
                      {ratingOptions.map((rating) => (
                        <Pressable
                          key={rating}
                          accessibilityRole="button"
                          onPress={() =>
                            handleCategoryRatingChange(
                              category,
                              rating
                            )
                          }
                          style={[
                            styles.smallRatingOption,
                            selectedRating === rating &&
                              styles.ratingOptionSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.ratingOptionText,
                              selectedRating === rating &&
                                styles.ratingOptionTextSelected,
                            ]}
                          >
                            {rating}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )
              )}
            </View>
          )}

          <Text style={styles.editLabel}>Review</Text>

          <TextInput
            value={editReviewText}
            onChangeText={setEditReviewText}
            multiline
            maxLength={1000}
            placeholder="Write your review..."
            placeholderTextColor="#725F54"
            style={styles.reviewInput}
          />

          <Text style={styles.characterCount}>
            {editReviewText.length}/1000
          </Text>

          {review.photoUrl && (
            <Text style={styles.photoNote}>
              Your existing photo will stay attached.
            </Text>
          )}

          <View style={styles.editActions}>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={handleCancelEdit}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={handleSaveEdit}
              style={[
                styles.saveButton,
                saving && styles.disabledButton,
              ]}
            >
              <Text style={styles.saveText}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {review.categoryRatings &&
            Object.entries(review.categoryRatings).length > 0 && (
              <View style={styles.categories}>
                {Object.entries(review.categoryRatings).map(
                  ([name, rating]) => (
                    <View key={name} style={styles.categoryChip}>
                      <Text style={styles.categoryName}>
                        {formatCategoryName(name)}
                      </Text>

                      <Text style={styles.categoryRating}>
                        {rating}/5
                      </Text>
                    </View>
                  )
                )}
              </View>
            )}

          {!!review.reviewText && (
            <View style={styles.reviewBody}>
              <Text style={styles.reviewText}>
                {review.reviewText}
              </Text>
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

          {isOwnReview && (
            <View style={styles.ownerActions}>
              {onEditReview && (
                <Pressable
                  accessibilityRole="button"
                  onPress={handleEditPress}
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>
                    Edit
                  </Text>
                </Pressable>
              )}

              {onDeleteReview && (
                <Pressable
                  accessibilityRole="button"
                  disabled={deleting}
                  onPress={handleDeletePress}
                  style={[
                    styles.deleteButton,
                    deleting && styles.disabledButton,
                  ]}
                >
                  <Text style={styles.deleteText}>
                    {deleting ? 'Deleting...' : 'Delete'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </>
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

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 0,
  },

  reviewer: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 21,
    color: '#2B211C',
  },

  yourReviewBadge: {
    flexShrink: 0,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#C7B0A2',
  },

  yourReviewText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#493A32',
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

  ownerActions: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#92796B',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },

  editButton: {
    minHeight: 38,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#735E52',
    backgroundColor: '#D2BFB4',
    justifyContent: 'center',
  },

  editButtonText: {
    color: '#493A32',
    fontSize: 13,
    fontWeight: '700',
  },

  deleteButton: {
    minHeight: 38,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#7A403B',
    backgroundColor: '#C89F98',
    justifyContent: 'center',
  },

  deleteText: {
    color: '#572D29',
    fontSize: 13,
    fontWeight: '700',
  },

  disabledButton: {
    opacity: 0.55,
  },

  editSection: {
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#92796B',
  },

  editHeading: {
    marginBottom: 16,
    fontSize: 18,
    fontWeight: '800',
    color: '#2B211C',
  },

  editLabel: {
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#493A32',
  },

  ratingSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },

  ratingOption: {
    width: 44,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#947B6D',
    backgroundColor: '#C7B0A2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  smallRatingOption: {
    width: 38,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#947B6D',
    backgroundColor: '#C7B0A2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ratingOptionSelected: {
    backgroundColor: '#765F53',
    borderColor: '#5F4B41',
  },

  ratingOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#493A32',
  },

  ratingOptionTextSelected: {
    color: '#F6EEE9',
  },

  editCategories: {
    marginBottom: 2,
  },

  editCategoryBlock: {
    marginBottom: 8,
  },

  reviewInput: {
    minHeight: 110,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#947B6D',
    backgroundColor: '#D2BFB4',
    color: '#2B211C',
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'top',
  },

  characterCount: {
    marginTop: 6,
    textAlign: 'right',
    fontSize: 11,
    color: '#5F4E45',
  },

  photoNote: {
    marginTop: 12,
    fontSize: 12,
    color: '#5F4E45',
  },

  editActions: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },

  cancelButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#947B6D',
    justifyContent: 'center',
  },

  cancelText: {
    color: '#493A32',
    fontSize: 13,
    fontWeight: '700',
  },

  saveButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#765F53',
    justifyContent: 'center',
  },

  saveText: {
    color: '#F6EEE9',
    fontSize: 13,
    fontWeight: '700',
  },
});