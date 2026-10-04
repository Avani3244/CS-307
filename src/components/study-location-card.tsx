import { StyleSheet, Text, View } from 'react-native';

import {
    getAverageRating,
    isLocationOpen,
} from '@/lib/location-hours';
import { StudyLocation } from '@/types/study-location';

interface StudyLocationCardProps {
  location: StudyLocation;
}

export default function StudyLocationCard({
  location,
}: StudyLocationCardProps) {
  const isOpen = isLocationOpen(location.hours);
  const rating = getAverageRating(location.reviews);

  const statusText =
    isOpen === null
      ? 'Hours unavailable'
      : isOpen
        ? 'Open'
        : 'Closed';

  return (
    <View style={styles.card}>
      <Text style={styles.name}>
        {location.name}
      </Text>

      <View style={styles.row}>
        <Text style={styles.category}>
          {location.category ?? 'Study Location'}
        </Text>

        <Text
          style={[
            styles.status,
            isOpen === true && styles.open,
            isOpen === false && styles.closed,
          ]}
        >
          {statusText}
        </Text>
      </View>

      {location.building && (
        <Text style={styles.detail}>
          {location.building}
        </Text>
      )}

      {location.address && (
        <Text style={styles.detail}>
          {location.address}
        </Text>
      )}

      <Text style={styles.rating}>
        {rating === null
          ? 'No ratings yet'
          : `★ ${rating.toFixed(1)}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },

  name: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  category: {
    fontSize: 14,
    color: '#666666',
  },

  status: {
    fontSize: 14,
    fontWeight: '600',
  },

  open: {
    color: '#17803d',
  },

  closed: {
    color: '#b42318',
  },

  detail: {
    color: '#555555',
    marginTop: 3,
  },

  rating: {
    marginTop: 10,
    fontWeight: '600',
  },
});