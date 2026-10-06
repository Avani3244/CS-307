import type { ReviewCardData } from '@/components/ReviewCard';
import { supabase } from '@/lib/supabase';

type ReviewRow = {
  id: string;
  user_id: string;
  overall_rating: number;
  category_ratings: Record<string, number> | null;
  review_text: string | null;
  created_at: string;
};

type ReviewPhotoRow = {
  review_id: string;
  storage_path: string;
};

export async function getReviewsForLocation(
  locationId: string
): Promise<ReviewCardData[]> {
  const { data: reviews, error: reviewsError } = await supabase
    .from('reviews')
    .select(
      'id, user_id, overall_rating, category_ratings, review_text, created_at'
    )
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });

  if (reviewsError) {
    throw reviewsError;
  }

  const reviewRows = (reviews ?? []) as ReviewRow[];

  if (reviewRows.length === 0) {
    return [];
  }

  const userIds = [...new Set(reviewRows.map((review) => review.user_id))];
  const reviewIds = reviewRows.map((review) => review.id);

  const [{ data: profiles, error: profilesError }, { data: photos, error: photosError }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('user_id, username')
        .in('user_id', userIds),

      supabase
        .from('review_photos')
        .select('review_id, storage_path')
        .in('review_id', reviewIds),
    ]);

  if (profilesError) {
    throw profilesError;
  }

  if (photosError) {
    throw photosError;
  }

  const usernameByUserId = new Map(
    (profiles ?? []).map((profile) => [
      profile.user_id as string,
      (profile.username as string | null) ?? 'StudySpot User',
    ])
  );

  const photoRows = (photos ?? []) as ReviewPhotoRow[];

  const photoEntries = await Promise.all(
    photoRows.map(async (photo) => {
      const { data, error } = await supabase.storage
        .from('review-photos')
        .createSignedUrl(photo.storage_path, 60 * 60);

      if (error || !data?.signedUrl) {
        return null;
      }

      return {
        reviewId: photo.review_id,
        url: data.signedUrl,
      };
    })
  );

  const photoUrlByReviewId = new Map<string, string>();

  photoEntries.forEach((entry) => {
    if (entry && !photoUrlByReviewId.has(entry.reviewId)) {
      photoUrlByReviewId.set(entry.reviewId, entry.url);
    }
  });

  return reviewRows.map((review) => ({
    id: review.id,
    reviewerName:
      usernameByUserId.get(review.user_id) ?? 'StudySpot User',
    overallRating: review.overall_rating,
    categoryRatings: review.category_ratings,
    reviewText: review.review_text,
    createdAt: review.created_at,
    photoUrl: photoUrlByReviewId.get(review.id) ?? null,
  }));
}