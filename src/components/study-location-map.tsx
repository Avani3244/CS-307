import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';

import { getAverageRating } from '@/lib/location-hours';
import type { StudyLocation } from '@/types/study-location';

interface Props {
  locations: StudyLocation[];
}

// Purdue's West Lafayette academic campus, including the seeded study spots.
const PURDUE_REGION = {
  latitude: 40.4274,
  longitude: -86.914,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

export default function StudyLocationMap({ locations }: Props) {
  const { width } = useWindowDimensions();
  const calloutWidth = Math.min(260, width - 64);
  return (
    <MapView
      style={styles.map}
      initialRegion={PURDUE_REGION}
      showsUserLocation={false}
      showsMyLocationButton={false}
    >
      {locations.map((location) => {
        if (location.latitude == null || location.longitude == null) return null;
        const rating = getAverageRating(location.reviews);
        const ratingText = rating === null
          ? 'No ratings yet'
          : `★ ${rating.toFixed(1)} / 5`;

        return (
          <Marker
            key={location.id}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={location.name}
            description={[location.category, location.address, ratingText].filter(Boolean).join(' · ')}
          >
            <Callout>
              <View style={[styles.callout, { width: calloutWidth }]}>
                <Text style={styles.name}>{location.name}</Text>
                <Text style={styles.detail}>
                  {location.category ?? 'Category unavailable'}
                </Text>
                <Text style={styles.detail}>
                  {location.address ?? 'Address unavailable'}
                </Text>
                <Text style={styles.rating}>{ratingText}</Text>
              </View>
            </Callout>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  callout: { padding: 8, gap: 6 },
  name: { fontSize: 16, fontWeight: '700', color: '#2E2621' },
  detail: { fontSize: 14, color: '#6B5A50' },
  rating: { fontSize: 14, fontWeight: '600', color: '#2E2621' },
});
