// Firebase configuration for Face Analysis app.
// 1. Create a Firebase project in the Firebase console.
// 2. Enable Email/Password authentication.
// 3. Copy your web app config and paste the values below.

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Web app Firebase configuration copied from the Firebase console.
// Analytics is only available on the web; for React Native we only use auth.
const firebaseConfig = {
  apiKey: 'AIzaSyAAk7TQIa-tXcxNLAo1VqVsQ9-BPDZL4ms',
  authDomain: 'face-me-cbbb2.firebaseapp.com',
  projectId: 'face-me-cbbb2',
  storageBucket: 'face-me-cbbb2.firebasestorage.app',
  messagingSenderId: '685503854952',
  appId: '1:685503854952:web:6f28851ea34890d5bbbedd',
  measurementId: 'G-6LWY31571H',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);


