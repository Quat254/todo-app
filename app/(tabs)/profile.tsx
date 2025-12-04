import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FaceResult = {
  id: number;
  issues: string[];
  skinType: string;
};

type AnalysisEntry = {
  id: string;
  timestamp: number;
  faces: FaceResult[];
};

const USER_KEY = '@faceme_user';

export default function ProfileScreen() {
  const [userName, setUserName] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisEntry[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const rawUser = await AsyncStorage.getItem(USER_KEY);
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          setUserName(parsed.name || null);

          const historyKey = `@faceme_history_${parsed.id}`;
          const rawHistory = await AsyncStorage.getItem(historyKey);
          if (rawHistory) {
            setHistory(JSON.parse(rawHistory));
          }
        }
      } catch (e) {
        console.warn('Failed to load profile history', e);
      }
    };

    load();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>
          {userName ? `Hi, ${userName}` : 'Hi there'}
        </Text>
        <Text style={styles.subtitle}>
          Here is a history of your recent face analyses.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Analysis history</Text>
        {history.length === 0 ? (
          <Text style={styles.emptyText}>
            You don&apos;t have any saved analyses yet. Scan your face from the
            Home tab to see them here.
          </Text>
        ) : (
          history
            .slice()
            .reverse()
            .map((entry) => {
              const date = new Date(entry.timestamp);
              return (
                <View key={entry.id} style={styles.historyCard}>
                  <Text style={styles.historyDate}>
                    {date.toLocaleDateString()} • {date.toLocaleTimeString()}
                  </Text>
                  {entry.faces.map((face) => (
                    <View key={face.id} style={styles.historyFaceRow}>
                      <Text style={styles.historyFaceTitle}>
                        Face {face.id} ({face.skinType})
                      </Text>
                      <Text style={styles.historyIssues}>
                        Issues: {face.issues.join(', ')}
                      </Text>
                    </View>
                  ))}
                </View>
              );
            })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    paddingTop: 40,
    backgroundColor: '#E6F4FE',
  },
  card: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: '#ffffff',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#020617',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#020617',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  historyDate: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  historyFaceRow: {
    marginBottom: 6,
  },
  historyFaceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#020617',
  },
  historyIssues: {
    fontSize: 13,
    color: '#4b5563',
  },
});


