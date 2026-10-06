import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type IconName =
  ComponentProps<typeof MaterialCommunityIcons>['name'];

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
  onDeleteReview?: (
    reviewId: string
  ) => Promise<void>;
  onEditReview?: (
    reviewId: string,
    updates: ReviewUpdates
  ) => Promise<void>;
}

const COLORS = {
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
  deleteBorder: '#DF7B70',
};

const ratingOptions = [1, 2, 3, 4, 5];

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

function formatCategoryName(name: string) {
  const normalized =
    normalizeCategoryKey(name);

  if (CATEGORY_META[normalized]) {
    return CATEGORY_META[normalized].label;
  }

  return name
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      (letter) => letter.toUpperCase()
    );
}

function getCategoryIcon(
  name: string
): IconName {
  const normalized =
    normalizeCategoryKey(name);

  return (
    CATEGORY_META[normalized]?.icon ??
    'star-outline'
  );
}

export default function ReviewCard({
  review,
  isOwnReview = false,
  onDeleteReview,
  onEditReview,
}: Props) {
  const [deleting, setDeleting] =
    useState(false);

  const [editing, setEditing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    editOverallRating,
    setEditOverallRating,
  ] = useState(review.overallRating);

  const [
    editCategoryRatings,
    setEditCategoryRatings,
  ] = useState<Record<string, number>>(
    review.categoryRatings ?? {}
  );

  const [
    editReviewText,
    setEditReviewText,
  ] = useState(review.reviewText ?? '');

  useEffect(() => {
    if (!editing) {
      setEditOverallRating(
        review.overallRating
      );

      setEditCategoryRatings(
        review.categoryRatings ?? {}
      );

      setEditReviewText(
        review.reviewText ?? ''
      );
    }
  }, [review, editing]);

  const displayCategories = useMemo(() => {
    if (!review.categoryRatings) {
      return [];
    }

    return Object.entries(
      review.categoryRatings
    )
      .map(([name, rating]) => ({
        name,
        rating,
        normalized:
          normalizeCategoryKey(name),
      }))
      .sort((a, b) => {
        const aIndex =
          CATEGORY_ORDER.indexOf(
            a.normalized
          );

        const bIndex =
          CATEGORY_ORDER.indexOf(
            b.normalized
          );

        return (
          (aIndex === -1
            ? 999
            : aIndex) -
          (bIndex === -1
            ? 999
            : bIndex)
        );
      });
  }, [review.categoryRatings]);

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
            if (
              !onDeleteReview ||
              deleting
            ) {
              return;
            }

            try {
              setDeleting(true);

              await onDeleteReview(
                review.id
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleEditPress = () => {
    setEditOverallRating(
      review.overallRating
    );

    setEditCategoryRatings(
      review.categoryRatings ?? {}
    );

    setEditReviewText(
      review.reviewText ?? ''
    );

    setEditing(true);
  };

  const handleCancelEdit = () => {
    setEditOverallRating(
      review.overallRating
    );

    setEditCategoryRatings(
      review.categoryRatings ?? {}
    );

    setEditReviewText(
      review.reviewText ?? ''
    );

    setEditing(false);
  };

  const handleCategoryRatingChange = (
    category: string,
    rating: number
  ) => {
    setEditCategoryRatings(
      (current) => ({
        ...current,
        [category]: rating,
      })
    );
  };

  const handleSaveEdit = async () => {
    if (!onEditReview || saving) {
      return;
    }

    try {
      setSaving(true);

      await onEditReview(review.id, {
        overallRating:
          editOverallRating,
        categoryRatings:
          editCategoryRatings,
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
        <View style={styles.avatar}>
          <MaterialCommunityIcons
            name="account"
            size={34}
            color={COLORS.icon}
          />
        </View>

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
              <View
                style={
                  styles.yourReviewBadge
                }
              >
                <Text
                  style={
                    styles.yourReviewText
                  }
                >
                  Your review
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.date}>
            {new Date(
              review.createdAt
            ).toLocaleDateString()}
          </Text>
        </View>

        {!editing && (
          <View style={styles.ratingBadge}>
            <MaterialCommunityIcons
              name="star"
              size={22}
              color={COLORS.gold}
            />

            <Text style={styles.ratingText}>
              {review.overallRating.toFixed(
                1
              )}
            </Text>
          </View>
        )}
      </View>

      {editing ? (
        <View style={styles.editSection}>
          <View
            style={styles.editTitleRow}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={20}
              color={COLORS.goldDark}
            />

            <Text
              style={styles.editHeading}
            >
              Edit your review
            </Text>
          </View>

          <Text style={styles.editLabel}>
            Overall rating
          </Text>

          <View
            style={styles.ratingSelector}
          >
            {ratingOptions.map(
              (rating) => (
                <Pressable
                  key={rating}
                  accessibilityRole="button"
                  onPress={() =>
                    setEditOverallRating(
                      rating
                    )
                  }
                  style={[
                    styles.ratingOption,
                    editOverallRating ===
                      rating &&
                      styles.ratingOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.ratingOptionText,
                      editOverallRating ===
                        rating &&
                        styles.ratingOptionTextSelected,
                    ]}
                  >
                    {rating}
                  </Text>
                </Pressable>
              )
            )}
          </View>

          {Object.keys(
            editCategoryRatings
          ).length > 0 && (
            <View
              style={
                styles.editCategories
              }
            >
              {Object.entries(
                editCategoryRatings
              ).map(
                ([
                  category,
                  selectedRating,
                ]) => (
                  <View
                    key={category}
                    style={
                      styles.editCategoryBlock
                    }
                  >
                    <View
                      style={
                        styles.editCategoryLabelRow
                      }
                    >
                      <MaterialCommunityIcons
                        name={getCategoryIcon(
                          category
                        )}
                        size={18}
                        color={
                          COLORS.icon
                        }
                      />

                      <Text
                        style={
                          styles.editLabel
                        }
                      >
                        {formatCategoryName(
                          category
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles.ratingSelector
                      }
                    >
                      {ratingOptions.map(
                        (rating) => (
                          <Pressable
                            key={
                              rating
                            }
                            accessibilityRole="button"
                            onPress={() =>
                              handleCategoryRatingChange(
                                category,
                                rating
                              )
                            }
                            style={[
                              styles.smallRatingOption,
                              selectedRating ===
                                rating &&
                                styles.ratingOptionSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.ratingOptionText,
                                selectedRating ===
                                  rating &&
                                  styles.ratingOptionTextSelected,
                              ]}
                            >
                              {rating}
                            </Text>
                          </Pressable>
                        )
                      )}
                    </View>
                  </View>
                )
              )}
            </View>
          )}

          <Text style={styles.editLabel}>
            Review
          </Text>

          <TextInput
            value={editReviewText}
            onChangeText={
              setEditReviewText
            }
            multiline
            maxLength={1000}
            placeholder="Write your review..."
            placeholderTextColor="#AF9B89"
            style={styles.reviewInput}
          />

          <Text
            style={styles.characterCount}
          >
            {editReviewText.length}/1000
          </Text>

          {review.photoUrl && (
            <View style={styles.photoNote}>
              <MaterialCommunityIcons
                name="image-outline"
                size={16}
                color={COLORS.muted}
              />

              <Text
                style={
                  styles.photoNoteText
                }
              >
                Your existing photo will
                stay attached.
              </Text>
            </View>
          )}

          <View
            style={styles.editActions}
          >
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={handleCancelEdit}
              style={styles.cancelButton}
            >
              <Text
                style={styles.cancelText}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={handleSaveEdit}
              style={[
                styles.saveButton,
                saving &&
                  styles.disabledButton,
              ]}
            >
              <MaterialCommunityIcons
                name="check"
                size={18}
                color={COLORS.white}
              />

              <Text
                style={styles.saveText}
              >
                {saving
                  ? 'Saving...'
                  : 'Save Changes'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {displayCategories.length >
            0 && (
            <View
              style={styles.categories}
            >
              {displayCategories.map(
                ({
                  name,
                  rating,
                }) => (
                  <View
                    key={name}
                    style={
                      styles.categoryChip
                    }
                  >
                    <MaterialCommunityIcons
                      name={getCategoryIcon(
                        name
                      )}
                      size={18}
                      color={COLORS.icon}
                    />

                    <Text
                      style={
                        styles.categoryName
                      }
                    >
                      {formatCategoryName(
                        name
                      )}
                    </Text>

                    <Text
                      style={
                        styles.categoryRating
                      }
                    >
                      {rating}/5
                    </Text>
                  </View>
                )
              )}
            </View>
          )}

          {!!review.reviewText && (
            <View
              style={styles.reviewBody}
            >
              <Text
                style={styles.reviewText}
              >
                {review.reviewText}
              </Text>
            </View>
          )}

          {!!review.photoUrl && (
            <View
              style={
                styles.photoContainer
              }
            >
              <Image
                source={{
                  uri: review.photoUrl,
                }}
                style={styles.photo}
                resizeMode="cover"
              />
            </View>
          )}

          {isOwnReview && (
            <View
              style={styles.ownerActions}
            >
              {onEditReview && (
                <Pressable
                  accessibilityRole="button"
                  onPress={
                    handleEditPress
                  }
                  style={({ pressed }) => [
                    styles.editButton,
                    pressed &&
                      styles.pressedButton,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="pencil-outline"
                    size={18}
                    color={COLORS.text}
                  />

                  <Text
                    style={
                      styles.editButtonText
                    }
                  >
                    Edit
                  </Text>
                </Pressable>
              )}

              {onDeleteReview && (
                <Pressable
                  accessibilityRole="button"
                  disabled={deleting}
                  onPress={
                    handleDeletePress
                  }
                  style={({ pressed }) => [
                    styles.deleteButton,
                    deleting &&
                      styles.disabledButton,
                    pressed &&
                      !deleting &&
                      styles.pressedButton,
                  ]}
                >
                  <MaterialCommunityIcons
                    name="trash-can-outline"
                    size={18}
                    color={COLORS.delete}
                  />

                  <Text
                    style={
                      styles.deleteText
                    }
                  >
                    {deleting
                      ? 'Deleting...'
                      : 'Delete'}
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
    padding: 17,

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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,

    backgroundColor: '#EAD4BC',

    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },

  yourReviewBadge: {
    flexShrink: 0,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 13,
    backgroundColor: COLORS.goldSoft,
  },

  yourReviewText: {
    color: '#6D431C',
    fontSize: 10,
    fontWeight: '800',
  },

  date: {
    marginTop: 3,
    color: COLORS.muted,
    fontSize: 12,
  },

  ratingBadge: {
    flexShrink: 0,

    paddingHorizontal: 12,
    paddingVertical: 8,

    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSoft,

    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  ratingText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
  },

  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 16,
  },

  categoryChip: {
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 7,

    borderRadius: 16,
    backgroundColor: COLORS.cardSoft,

    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  categoryName: {
    color: COLORS.text,
    fontSize: 12,
  },

  categoryRating: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '800',
  },

  reviewBody: {
    marginTop: 16,
  },

  reviewText: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 22,
  },

  photoContainer: {
    marginTop: 14,

    overflow: 'hidden',
    borderRadius: 17,

    borderWidth: 1,
    borderColor: COLORS.border,
  },

  photo: {
    width: '100%',
    height: 220,
  },

  ownerActions: {
    marginTop: 16,
    paddingTop: 14,

    borderTopWidth: 1,
    borderTopColor: COLORS.divider,

    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
  },

  editButton: {
    minHeight: 42,
    paddingHorizontal: 16,

    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  editButtonText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },

  deleteButton: {
    minHeight: 42,
    paddingHorizontal: 16,

    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.deleteBorder,
    backgroundColor: COLORS.deleteBackground,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  deleteText: {
    color: COLORS.delete,
    fontSize: 13,
    fontWeight: '800',
  },

  disabledButton: {
    opacity: 0.5,
  },

  pressedButton: {
    opacity: 0.72,
  },

  editSection: {
    marginTop: 18,
    paddingTop: 16,

    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },

  editTitleRow: {
    marginBottom: 17,

    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  editHeading: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },

  editLabel: {
    marginBottom: 8,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },

  editCategoryLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  ratingSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 16,
  },

  ratingOption: {
    width: 44,
    height: 40,

    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSoft,

    alignItems: 'center',
    justifyContent: 'center',
  },

  smallRatingOption: {
    width: 38,
    height: 36,

    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardSoft,

    alignItems: 'center',
    justifyContent: 'center',
  },

  ratingOptionSelected: {
    borderColor: COLORS.goldDark,
    backgroundColor: COLORS.gold,
  },

  ratingOptionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },

  ratingOptionTextSelected: {
    color: COLORS.white,
    fontWeight: '900',
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

    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
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

  photoNote: {
    marginTop: 10,

    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  photoNoteText: {
    color: COLORS.muted,
    fontSize: 12,
  },

  editActions: {
    marginTop: 18,

    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 9,
  },

  cancelButton: {
    minHeight: 42,
    paddingHorizontal: 16,

    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,

    justifyContent: 'center',
  },

  cancelText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
  },

  saveButton: {
    minHeight: 42,
    paddingHorizontal: 16,

    borderRadius: 14,
    backgroundColor: COLORS.goldDark,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  saveText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
});