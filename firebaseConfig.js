// Firebase configuration for Face Analysis app.
// 1. Create a Firebase project in the Firebase console.
// 2. Enable Email/Password authentication.
// 3. Copy your web app config and paste the values below.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    throw new Error(
      `Missing Firebase config value for ${key}. Set EXPO_PUBLIC_FIREBASE_* environment variables.`,
    );
  }
});

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);


