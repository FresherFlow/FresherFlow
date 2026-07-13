import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { PUBLIC_WEB_HOST } from '@/lib/utils/runtimeConfig';

const isProd = typeof window !== 'undefined'
    ? window.location.hostname.includes(PUBLIC_WEB_HOST.replace(/^www\./, ''))
    : process.env.NEXT_PUBLIC_APP_ENV === 'production';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || (isProd
        ? 'fresherflow-3604b.firebaseapp.com'
        : 'fresherflow-dev-staging.firebaseapp.com'),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || (isProd
        ? 'https://fresherflow-3604b-default-rtdb.asia-southeast1.firebasedatabase.app'
        : 'https://fresherflow-dev-staging-default-rtdb.asia-southeast1.firebasedatabase.app'),
};

// Singleton pattern to ensure we initialize only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const database = getDatabase(app);
export const auth = getAuth(app);
