/**
 * Firebase configuration for GymBro gym community feature.
 *
 * SETUP REQUIRED:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Enable Firestore Database (start in production mode)
 * 3. Enable Authentication → Anonymous sign-in method
 * 4. Replace the placeholder values below with your project's config
 * 5. Set Firestore Security Rules:
 *
 *   rules_version = '2';
 *   service cloud.firestore {
 *     match /databases/{database}/documents {
 *       match /gyms/{gymId} {
 *         allow read: if true;
 *         allow write: if request.auth != null;
 *         match /checkins/{checkinId} {
 *           allow read: if true;
 *           allow write: if request.auth != null;
 *         }
 *       }
 *     }
 *   }
 */

import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const firestoreDb = getFirestore(app);
export const firebaseAuth = getAuth(app);
