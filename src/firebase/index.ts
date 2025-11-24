'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

let firebaseApp: FirebaseApp;
if (!getApps().length) {
  try {
    firebaseApp = initializeApp(firebaseConfig);
  } catch (e) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        'Automatic initialization failed. Falling back to firebase config object.',
        e
      );
    }
    firebaseApp = initializeApp(firebaseConfig);
  }
} else {
  firebaseApp = getApp();
}

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);
const storage = getStorage(firebaseApp);

// Enable offline persistence for Firestore
// This allows the app to work 100% offline - field workers can register families
// and conduct visits without internet, and data will automatically sync when online
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(firestore)
    .catch((err) => {
      if (err.code === 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a time
        console.warn('Firestore offline persistence failed: Multiple tabs open');
      } else if (err.code === 'unimplemented') {
        // The current browser doesn't support persistence
        console.warn('Firestore offline persistence failed: Browser not supported');
      } else {
        console.warn('Firestore offline persistence failed:', err.code);
      }
    });
}

export { firebaseApp, auth, firestore, storage };

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  return {
    firebaseApp,
    auth,
    firestore,
    storage,
  };
}

export function getSdks(app: FirebaseApp) {
  return {
    firebaseApp: app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    storage: getStorage(app),
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './auth/use-user';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
