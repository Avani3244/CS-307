import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { ReviewCardData } from '@/components/ReviewCard';
import ReviewList from '@/components/ReviewList';
import { getReviewsForLocation } from '@/lib/reviews';

interface Props {
  locationId: string;
}

export default function LocationReviewsSection({ locationId }: Props) {
  const [reviews, setReviews] = useState<ReviewCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadReviews = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await getReviewsForLocation(locationId);

        if (active) {
          setReviews(data);
        }
      } catch {
        if (active) {
          setError('Could not load reviews.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadReviews();

    return () => {
      active = false;
    };
  }, [locationId]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return <ReviewList reviews={reviews} />;
}

const styles = StyleSheet.create({
  centered: {
    paddingVertical: 24,
    alignItems: 'center',
  },

  error: {
    color: '#C62828',
    fontSize: 14,
  },
});