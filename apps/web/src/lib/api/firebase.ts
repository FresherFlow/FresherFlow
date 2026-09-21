import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { getAuth, type Auth } from 'firebase/auth';
import { PUBLIC_WEB_HOST } from '@/lib/utils/runtimeConfig';

const isProd = typeof window !== 'undefined'
    ? window.location.hostname.includes(PUBLIC_WEB_HOST.replace(/^www\./, ''))
    : process.env.NEXT_PUBLIC_APP_ENV === 'production';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || (isProd
        ? 'fresherflow-3604b.firebaseapp.com'
        : 'fresherflow-dev-staging.firebaseapp.com'),
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || (isProd
        ? 'https://fresherflow-3604b-default-rtdb.asia-southeast1.firebasedatabase.app'
        : 'https://fresherflow-dev-staging-default-rtdb.asia-southeast1.firebasedatabase.app'),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || (isProd ? 'fresherflow-3604b' : 'fresherflow-dev-staging'),
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || (isProd ? '1:436004959357:web:...' : '1:162796656158:web:a204518c1de7bf86e4800f'),
};

// Singleton pattern to ensure we initialize only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Lazy singletons — avoid "Service database is not available" when modules
// are imported during SSR or before Firebase SDK registers its services.
let _database: Database | null = null;
let _auth: Auth | null = null;

export function getFirebaseDatabase(): Database {
    if (!_database) _database = getDatabase(app);
    return _database;
}

export function getFirebaseAuth(): Auth {
    if (!_auth) _auth = getAuth(app);
    return _auth;
}

// Backward-compatible exports for `import { database, auth } from '@/lib/api/firebase'`.
// Proxy intercepts property access and delegates to the real instance,
// which is lazily initialized on first use — no throw during module evaluation.
export const database: Database = new Proxy({} as Database, {
    get(_t, prop) {
        return (getFirebaseDatabase() as any)[prop];
    },
});

export const auth: Auth = new Proxy({} as Auth, {
    get(_t, prop) {
        return (getFirebaseAuth() as any)[prop];
    },
});
