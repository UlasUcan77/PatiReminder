import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PatiReminder</Text>
      <Text style={styles.subtitle}>Vaccines and medication for your pet, shared with your family.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 28, fontWeight: '600' },
  subtitle: { fontSize: 16, textAlign: 'center', opacity: 0.7 },
});
