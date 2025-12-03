import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

const OIL_RECOMMENDATIONS = {
  acne: {
    name: 'Tea Tree Oil (diluted)',
    reason: 'Helps reduce acne-causing bacteria and inflammation.',
  },
  'oily skin': {
    name: 'Jojoba Oil',
    reason: 'Balances sebum production and feels light on the skin.',
  },
  dryness: {
    name: 'Argan Oil',
    reason: 'Rich in fatty acids to deeply hydrate dry skin.',
  },
  'dark spots': {
    name: 'Rosehip Seed Oil',
    reason: 'Known to help with discoloration and texture over time.',
  },
  sensitivity: {
    name: 'Squalane Oil',
    reason: 'Very gentle, suitable for sensitive or reactive skin.',
  },
};

function mapIssuesToOils(issues = []) {
  const unique = new Map();

  issues.forEach((raw) => {
    const key = String(raw).toLowerCase();
    if (OIL_RECOMMENDATIONS[key] && !unique.has(key)) {
      unique.set(key, OIL_RECOMMENDATIONS[key]);
    }
  });

  // Fallback if nothing matched
  if (unique.size === 0) {
    unique.set('balanced', {
      name: 'Jojoba Oil',
      reason: 'A good all-rounder that works for most skin types.',
    });
  }

  return Array.from(unique.entries()).map(([issue, data]) => ({
    issue,
    ...data,
  }));
}

// Simple built-in "fake AI" so the app works without any external API.
// It returns sample issues and skin types so you can see the full flow.
function fakeAnalyzeImage() {
  const possibleIssues = [
    'acne',
    'dryness',
    'dark spots',
    'oily skin',
    'sensitivity',
  ];
  const skinTypes = ['oily', 'dry', 'combination', 'normal', 'sensitive'];

  // Pick 1–3 random issues
  const shuffled = possibleIssues.sort(() => 0.5 - Math.random());
  const count = Math.floor(Math.random() * 3) + 1;
  const issues = shuffled.slice(0, count);

  const skinType = skinTypes[Math.floor(Math.random() * skinTypes.length)];

  return { issues, skinType };
}

// Simulate multiple faces detected in a single photo.
function fakeAnalyzeMultipleFaces() {
  const faceCount = Math.floor(Math.random() * 3) + 1; // 1–3 faces
  return Array.from({ length: faceCount }, (_, index) => {
    const base = fakeAnalyzeImage();
    return {
      id: index + 1,
      ...base,
      recommendations: mapIssuesToOils(base.issues),
    };
  });
}

export default function HomeScreen() {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [faces, setFaces] = useState([]);
  const [isDark, setIsDark] = useState(false);

  const pickImage = async () => {
    setError(null);
    setFaces([]);

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Permission to access gallery was denied.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
      base64: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    if (!asset.base64) {
      setError('Could not read image data. Please try another photo.');
      return;
    }

    analyzeImage(asset.base64);
  };

  // TODO: Replace 'YOUR_CLARIFAI_API_KEY_HERE' with your actual API key from Clarifai Settings
  const CLARIFAI_API_KEY = '94762d5c61a54cb786f7e00a1757a551';
  const FACE_MODEL_VERSION_ID = '6dc7e46bc9124c5c8824be4822abe105';
  const GENERAL_MODEL_ID = 'general-image-recognition';

  const analyzeImage = async (base64) => {
    setLoading(true);
    setError(null);
    setFaces([]);

    try {
      // Step 1: Detect faces in the image using face-detection model
      const faceResponse = await fetch(
        `https://api.clarifai.com/v2/models/face-detection/versions/${FACE_MODEL_VERSION_ID}/outputs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${CLARIFAI_API_KEY}`,
          },
          body: JSON.stringify({
            inputs: [
              {
                data: {
                  image: {
                    base64,
                  },
                },
              },
            ],
          }),
        }
      );

      if (!faceResponse.ok) {
        const errorText = await faceResponse.text();
        throw new Error(`Face detection failed: ${faceResponse.status} - ${errorText}`);
      }

      const faceData = await faceResponse.json();
      const faceRegions = faceData.outputs?.[0]?.data?.regions || [];

      // Step 2: Get general image concepts for skin analysis
      const generalResponse = await fetch(
        `https://api.clarifai.com/v2/models/${GENERAL_MODEL_ID}/outputs`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Key ${CLARIFAI_API_KEY}`,
          },
          body: JSON.stringify({
            inputs: [
              {
                data: {
                  image: {
                    base64,
                  },
                },
              },
            ],
          }),
        }
      );

      if (!generalResponse.ok) {
        const errorText = await generalResponse.text();
        throw new Error(`Image recognition failed: ${generalResponse.status} - ${errorText}`);
      }

      const generalData = await generalResponse.json();
      const concepts =
        generalData.outputs?.[0]?.data?.concepts?.map((c) =>
          c.name.toLowerCase()
        ) || [];

      // Map concepts to skin issues
      const possibleIssues = [
        'acne',
        'dryness',
        'dark spots',
        'oily skin',
        'sensitivity',
      ];
      const detectedIssues = concepts.filter((concept) =>
        possibleIssues.some((issue) => concept.includes(issue))
      );

      // If no specific issues detected, use general concepts that might relate to skin
      let issues = detectedIssues;
      if (issues.length === 0) {
        // Fallback: check for general face/skin related concepts
        const skinRelated = concepts.filter((c) =>
          ['face', 'person', 'skin', 'portrait', 'human'].some((term) =>
            c.includes(term)
          )
        );
        if (skinRelated.length > 0) {
          issues = ['balanced']; // Default to balanced skin
        } else {
          issues = ['balanced'];
        }
      }

      // Create a face object for each detected face
      const faceCount = Math.max(faceRegions.length, 1); // At least 1 face
      const results = Array.from({ length: faceCount }, (_, index) => {
        const skinType = ['oily', 'dry', 'combination', 'normal', 'sensitive'][
          Math.floor(Math.random() * 5)
        ]; // Placeholder until we have a skin type model

        return {
          id: index + 1,
          issues,
          skinType,
          recommendations: mapIssuesToOils(issues),
        };
      });

      setFaces(results);
    } catch (e) {
      console.warn('Clarifai API error:', e);
      setError(
        `Could not analyze the photo: ${e.message}. Check your API key and internet connection.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.screen,
        isDark && styles.screenDark,
      ]}>
      <View
        style={[
          styles.cardContainer,
          isDark && styles.cardContainerDark,
        ]}>
        <View style={styles.headerRow}>
          <Text style={[styles.backArrow, isDark && styles.headerTextDark]}>
            {'\u2190'}
          </Text>
          <Text
            style={[styles.headerTitle, isDark && styles.headerTextDark]}>
            FACE ME
          </Text>
          <View style={styles.themeToggle}>
            <Text style={[styles.themeLabel, isDark && styles.headerTextDark]}>
              {isDark ? 'Dark' : 'Light'}
            </Text>
            <Switch value={isDark} onValueChange={setIsDark} />
          </View>
        </View>

        <View style={styles.illustrationWrapper}>
          <View style={styles.illustrationCard}>
            <View style={styles.facePlaceholder}>
              <View style={styles.faceCircle} />
            </View>
          </View>
        </View>

        <View style={styles.textSection}>
          <Text style={[styles.mainTitle, isDark && styles.headerTextDark]}>
            Check Your Skin
          </Text>
          <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
            Analyze your skin for better recommendations.
          </Text>
        </View>

        <View style={styles.buttonWrapper}>
          <Button title="Scan Skin" onPress={pickImage} color="#0C7686" />
        </View>

        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#0C7686" />
            <Text style={styles.infoText}>Analyzing skin…</Text>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        {imageUri && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          </View>
        )}

        {faces.length > 0 && (
          <View style={styles.recommendedSection}>
            <Text
              style={[styles.sectionLabel, isDark && styles.headerTextDark]}>
              Recommended Oils
            </Text>

            {faces.map((face) => (
              <View key={face.id} style={styles.faceBlock}>
                <Text style={[styles.faceTitle, isDark && styles.headerTextDark]}>
                  Face {face.id}
                </Text>

                {face.recommendations.map((rec) => (
                  <View
                    key={rec.issue}
                    style={[styles.oilCard, isDark && styles.oilCardDark]}>
                    <View style={styles.oilIcon} />
                    <View style={styles.oilTextBlock}>
                      <Text
                        style={[styles.oilName, isDark && styles.headerTextDark]}>
                        {rec.name}
                      </Text>
                      <Text
                        style={[styles.oilDescription, isDark && styles.subtitleDark]}>
                        {rec.reason}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
    backgroundColor: '#f2f4f7',
  },
  screenDark: {
    backgroundColor: '#020617',
  },
  cardContainer: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardContainerDark: {
    backgroundColor: '#020617',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backArrow: {
    fontSize: 22,
    color: '#14213d',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#14213d',
  },
  headerTextDark: {
    color: '#e5e7eb',
  },
  themeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  themeLabel: {
    fontSize: 12,
    color: '#4b5563',
  },
  illustrationWrapper: {
    alignItems: 'center',
    marginBottom: 24,
  },
  illustrationCard: {
    width: 220,
    height: 180,
    borderRadius: 28,
    backgroundColor: '#ffe5d6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  facePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f0ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: '#333333',
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#14213d',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    color: '#6b7280',
  },
  subtitleDark: {
    color: '#9ca3af',
  },
  buttonWrapper: {
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 18,
    overflow: 'hidden',
  },
  center: {
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    color: 'red',
    marginTop: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
  },
  recommendedSection: {
    marginTop: 8,
  },
  faceBlock: {
    marginBottom: 12,
  },
  faceTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#14213d',
    marginBottom: 8,
  },
  oilCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  oilIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#d1f4e0',
    marginRight: 12,
  },
  oilTextBlock: {
    flex: 1,
  },
  oilName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  oilDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  helperText: {
    fontSize: 13,
    color: '#777',
    marginTop: 16,
    textAlign: 'center',
  },
  bold: {
    fontWeight: '700',
  },
  previewContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  previewImage: {
    width: 140,
    height: 140,
    borderRadius: 18,
  },
});
