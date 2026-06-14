import { useEffect, useState } from 'react';
import { auth } from '@/lib/api/firebase';
import { signInWithCustomToken, onAuthStateChanged, User } from 'firebase/auth';
import { adminApi } from '../api/admin';

export function useFirebaseAdmin() {
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(true);

    useEffect(() => {
        // Listen to Auth State Changes
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setFirebaseUser(user);
                setIsAuthenticating(false);
            } else {
                // If not authenticated, fetch token and sign in
                try {
                    const res = await adminApi.getFirebaseToken() as { firebaseToken: string };
                    if (res?.firebaseToken) {
                        await signInWithCustomToken(auth, res.firebaseToken);
                    } else {
                        setIsAuthenticating(false);
                    }
                } catch (err) {
                    console.error('[Firebase Admin Auth Hook Error]', err);
                    setIsAuthenticating(false);
                }
            }
        });

        return () => unsubscribe();
    }, []);

    return {
        firebaseUser,
        isAuthenticated: !!firebaseUser,
        isAuthenticating
    };
}
