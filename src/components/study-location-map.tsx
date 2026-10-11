import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

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
  return (
    <MapView
      style={styles.map}
      initialRegion={PURDUE_REGION}
      showsUserLocation={false}
      showsMyLocationButton={false}
    >
      {locations.map((location) => {
        if (location.latitude == null || location.longitude == null) return null;

        return (
          <Marker
            key={location.id}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={location.name}
            description={[location.category, location.address].filter(Boolean).join(' · ')}
          />
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
