import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Firestore } from 'firebase/firestore';
import { User } from 'firebase/auth';

/**
 * User document structure in Firestore
 */
export interface UserDocument {
    uid: string;
    email: string | null;
    passwordChangedAt?: Timestamp;
    createdAt: Timestamp;
    lastLoginAt: Timestamp;
}

/**
 * Creates or updates a user document in Firestore
 * Called on login to ensure user document exists
 */
export async function ensureUserDocument(
    firestore: Firestore,
    user: User
): Promise<void> {
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        // Create new user document
        await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            createdAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
        });
    } else {
        // Update last login timestamp
        await setDoc(
            userDocRef,
            {
                lastLoginAt: serverTimestamp(),
            },
            { merge: true }
        );
    }
}

/**
 * Updates the passwordChangedAt timestamp in the user document
 * This will invalidate all existing sessions
 */
export async function updatePasswordChangedTimestamp(
    firestore: Firestore,
    userId: string
): Promise<void> {
    try {
        const userDocRef = doc(firestore, 'users', userId);

        // First check if document exists, if not create it
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            // Create the document with minimal data plus passwordChangedAt
            await setDoc(userDocRef, {
                uid: userId,
                email: null, // Will be updated on next login
                passwordChangedAt: serverTimestamp(),
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
            });
        } else {
            // Document exists, just update the timestamp
            await setDoc(
                userDocRef,
                {
                    passwordChangedAt: serverTimestamp(),
                },
                { merge: true }
            );
        }
    } catch (error) {
        console.error('Error updating passwordChangedAt:', error);
        throw error; // Re-throw so caller can handle it
    }
}

/**
 * Gets the user document from Firestore
 */
export async function getUserDocument(
    firestore: Firestore,
    userId: string
): Promise<UserDocument | null> {
    const userDocRef = doc(firestore, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        return null;
    }

    return userDoc.data() as UserDocument;
}
