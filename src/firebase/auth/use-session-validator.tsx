'use client';

import { useEffect, useState } from 'react';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserDocument } from './user-document';

/**
 * Hook to validate the current user's session against passwordChangedAt timestamp
 * If the user's token was created before the password change, sign them out
 */
export function useSessionValidator() {
    const auth = useAuth();
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const [isValidating, setIsValidating] = useState(false);

    useEffect(() => {
        if (isUserLoading || !user) {
            return;
        }

        setIsValidating(true);

        // Subscribe to user document changes
        const userDocRef = doc(firestore, 'users', user.uid);
        const unsubscribe = onSnapshot(
            userDocRef,
            async (docSnapshot) => {
                try {
                    if (!docSnapshot.exists()) {
                        // User document doesn't exist yet, no validation needed
                        setIsValidating(false);
                        return;
                    }

                    const userData = docSnapshot.data() as UserDocument;

                    // If no passwordChangedAt timestamp, session is valid
                    if (!userData.passwordChangedAt) {
                        setIsValidating(false);
                        return;
                    }

                    // Get the current user's token to check when it was issued
                    const idTokenResult = await user.getIdTokenResult();
                    const authTime = new Date(idTokenResult.authTime).getTime();
                    const passwordChangedTime = userData.passwordChangedAt.toMillis();

                    // If token was issued before password change, sign out
                    if (authTime < passwordChangedTime) {
                        console.log('Session invalid: token created before password change. Signing out...');
                        await auth.signOut();
                    }

                    setIsValidating(false);
                } catch (error) {
                    console.error('Error validating session:', error);
                    setIsValidating(false);
                }
            },
            (error) => {
                console.error('Error listening to user document:', error);
                setIsValidating(false);
            }
        );

        return () => unsubscribe();
    }, [user, isUserLoading, auth, firestore]);

    return { isValidating };
}
