import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from '../firebaseConfig';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';

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

// Simple built-in "fake AI" so the app works even if the Clarifai API key
// isn't configured yet. It returns sample issues and skin types so you can
// see the full flow.
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
  const [user, setUser] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [faces, setFaces] = useState([]);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const stored = await AsyncStorage.getItem('@faceme_user');
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch (e) {
        console.warn('Failed to load user', e);
      }
    };

    loadUser();

    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async () => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      setError('Please enter email and password to continue.');
      return;
    }

    const email = emailInput.trim().toLowerCase();
    const password = passwordInput;

    try {
      // Try sign-in first.
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = cred.user;

      const profile = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || nameInput.trim() || email,
        email: firebaseUser.email ?? email,
      };
      await AsyncStorage.setItem('@faceme_user', JSON.stringify(profile));
      setUser(profile);
      setError(null);
    } catch (signInError: any) {
      if (signInError.code === 'auth/user-not-found') {
        // If user doesn't exist, create an account.
        try {
          const cred = await createUserWithEmailAndPassword(
            auth,
            email,
            password,
          );
          const firebaseUser = cred.user;
          if (nameInput.trim()) {
            await updateProfile(firebaseUser, { displayName: nameInput.trim() });
          }
          const profile = {
            id: firebaseUser.uid,
            name: nameInput.trim() || email,
            email: firebaseUser.email ?? email,
          };
          await AsyncStorage.setItem('@faceme_user', JSON.stringify(profile));
          setUser(profile);
          setError(null);
        } catch (signUpError: any) {
          console.warn('Failed to sign up user', signUpError);
          setError(signUpError.message);
        }
      } else {
        console.warn('Failed to sign in user', signInError);
        setError(signInError.message);
      }
    }
  };

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

  // Clarifai API key is now read from an environment variable so it is
  // not hard-coded in the source code or committed to Git.
  // Set EXPO_PUBLIC_CLARIFAI_API_KEY before running the app, for example:
  //   PowerShell: $env:EXPO_PUBLIC_CLARIFAI_API_KEY="your_key_here"; npm start
  const CLARIFAI_API_KEY = process.env.EXPO_PUBLIC_CLARIFAI_API_KEY;
  const FACE_MODEL_VERSION_ID = '6dc7e46bc9124c5c8824be4822abe105';
  const GENERAL_MODEL_ID = 'general-image-recognition';

  const saveHistoryEntry = async (facesResults) => {
    if (!user) return;
    const entry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      faces: facesResults,
    };
    const historyKey = `@faceme_history_${user.id}`;
    try {
      const existing = await AsyncStorage.getItem(historyKey);
      const parsed = existing ? JSON.parse(existing) : [];
      parsed.push(entry);
      await AsyncStorage.setItem(historyKey, JSON.stringify(parsed));
    } catch (e) {
      console.warn('Failed to save history entry', e);
    }
  };

  const analyzeImage = async (base64) => {
    // If no API key is configured, fall back to the built‑in fake analysis
    // so the app still feels responsive and useful.
    if (!CLARIFAI_API_KEY) {
      const simulatedFaces = fakeAnalyzeMultipleFaces();
      setFaces(simulatedFaces);
      await saveHistoryEntry(simulatedFaces);
      setError(
        'Real AI analysis is not configured yet. Showing a simulated example. ' +
          'Set EXPO_PUBLIC_CLARIFAI_API_KEY and restart the app to enable Clarifai.'
      );
      return;
    }

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
      await saveHistoryEntry(results);
    } catch (e) {
      console.warn('Clarifai API error:', e);
      setError(
        `Could not analyze the photo: ${e.message}. Check your API key and internet connection.`
      );
    } finally {
      setLoading(false);
    }
  };

  if (showIntro) {
    return (
      <View style={styles.introScreen}>
        <Text style={styles.introTitle}>FACE ME</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <ScrollView contentContainerStyle={styles.loginScreen}>
        <View style={styles.loginCard}>
          <Text style={styles.greetingText}>Welcome 👋</Text>
          <Text style={styles.greetingSubtitle}>
            Sign in to save your face analysis history.
          </Text>

          <View style={styles.loginForm}>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              placeholder="Enter your name"
              value={nameInput}
              onChangeText={setNameInput}
              style={styles.inputField}
            />
            <Text style={styles.inputLabel}>Email (optional)</Text>
            <TextInput
              placeholder="you@example.com"
              value={emailInput}
              onChangeText={setEmailInput}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.inputField}
            />
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              placeholder="Enter password"
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry
              style={styles.inputField}
            />
            <View style={styles.loginButtonWrapper}>
              <Button title="Continue" onPress={handleLogin} color="#0C7686" />
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        </View>
      </ScrollView>
    );
  }

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
          <Text style={[styles.greetingSmall, isDark && styles.headerTextDark]}>
            Hi, {user.name || 'there'} 👋
          </Text>
          <View style={styles.titleBlock}>
            <Text style={[styles.headerTitle, isDark && styles.headerTextDark]}>
              Elevate your complexion care
            </Text>
            <Text
              style={[styles.headerSubtitle, isDark && styles.subtitleDark]}>
              Smart skin scan & oil recommendations
            </Text>
          </View>
          <View style={styles.themeToggle}>
            <Text style={[styles.themeLabel, isDark && styles.headerTextDark]}>
              {isDark ? 'Dark' : 'Light'}
            </Text>
            <Switch value={isDark} onValueChange={setIsDark} />
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroTextBlock}>
            <Text style={[styles.heroTitle, isDark && styles.headerTextDark]}>
              Glowing skin deserves good care
            </Text>
            <Text style={[styles.heroSubtitle, isDark && styles.subtitleDark]}>
              Scan your face and get personalized oil recommendations.
            </Text>
            <View style={styles.scanButtonWrapper}>
              <Button title="Scan your face" onPress={pickImage} color="#020617" />
            </View>
          </View>
          <View style={styles.heroImagePlaceholder}>
            <View style={styles.facePlaceholder}>
              <View style={styles.faceCircle} />
            </View>
          </View>
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
  loginScreen: {
    padding: 24,
    paddingTop: 80,
    alignItems: 'center',
    backgroundColor: '#E6F4FE',
    flexGrow: 1,
  },
  introScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F4FE',
  },
  introTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#020617',
  },
  loginCard: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 32,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  loginForm: {
    marginTop: 24,
    gap: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: '#4b5563',
    marginBottom: 4,
  },
  inputField: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
  },
  loginButtonWrapper: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  greetingText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#020617',
    marginBottom: 4,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  screen: {
    padding: 24,
    paddingTop: 40,
    alignItems: 'center',
    backgroundColor: '#E6F4FE',
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
  greetingSmall: {
    fontSize: 16,
    fontWeight: '600',
    color: '#14213d',
  },
  titleBlock: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: '#020617',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#6b7280',
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
    alignItems: 'stretch',
    marginBottom: 24,
  },
  heroCard: {
    flexDirection: 'row',
    borderRadius: 28,
    backgroundColor: '#ffe5d6',
    padding: 20,
    alignItems: 'center',
  },
  heroTextBlock: {
    flex: 2,
    paddingRight: 12,
    gap: 8,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#020617',
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#4b5563',
  },
  scanButtonWrapper: {
    marginTop: 8,
    borderRadius: 999,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    minWidth: 150,
  },
  heroImagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  facePlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f8f0ea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
