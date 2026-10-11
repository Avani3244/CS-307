import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import type { StudyLocation } from '@/types/study-location';

// Keep the native map package out of the web bundle.
export default function StudyLocationMap(_props: { locations: StudyLocation[] }) {
  return (
    <View style={styles.container}>
      <ThemedText>Open StudySpot in Expo Go on iOS or Android to view the map.</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
});
