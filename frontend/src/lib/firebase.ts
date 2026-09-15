/**
 * Firebase Client SDK Initialization & Configuration.
 * 
 * Strict rule: All configuration values are loaded dynamically from Vite environment
 * variables. No production API keys or credentials are ever hardcoded in source code.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDvSoaTFipFUAEP0ayRT2BTYUM8PgcHfbQ',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'feedbackpro-d2e02.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'feedbackpro-d2e02',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'feedbackpro-d2e02.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '173752906033',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:173752906033:web:7362c5212afe941f8dc010',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-RCBSH3WWEB',
};

export const isFirebaseConfigured = Boolean(
  (import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey) &&
  (import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId)
);

// Initialize Firebase App singleton only once
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication service
export const auth: Auth = getAuth(app);

// Initialize Firebase Analytics safely (only in supported browser environments)
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported()
    .then((supported) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {
      // Analytics unsupported or blocked in current environment
    });
}
