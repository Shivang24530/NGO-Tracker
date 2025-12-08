'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
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

// Initialize Firestore with modern offline persistence
// This allows the app to work 100% offline - field workers can register families
// and conduct visits without internet, and data will automatically sync when online
const firestore = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const storage = getStorage(firebaseApp);

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
export { useUser } from './auth/use-user';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
