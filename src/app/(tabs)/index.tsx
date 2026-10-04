import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>StudySpot</Text>
      <Text style={styles.subtitle}>
        Find the right place to study at Purdue.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  subtitle: {
    marginTop: 10,
    fontSize: 18,
    textAlign: 'center',
  },
});