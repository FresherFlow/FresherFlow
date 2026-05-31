import Constants from 'expo-constants';

type FirebaseDatabase = {
    ref(path: string): {
        push(): {
            key: string | null;
            set(value: unknown): Promise<void>;
        };
    };
};

let databaseInstance: FirebaseDatabase | null | undefined;

export function getFirebaseDatabaseUrl(): string {
    return Constants.expoConfig?.extra?.firebaseRtdbUrl
        || 'https://fresherflow-3604b-default-rtdb.asia-southeast1.firebasedatabase.app';
}

export function getFirebaseDatabase(): FirebaseDatabase | null {
    if (databaseInstance !== undefined) return databaseInstance;

    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const firebase = require('@react-native-firebase/app').default;
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('@react-native-firebase/database');
        databaseInstance = firebase.app().database(getFirebaseDatabaseUrl()) as FirebaseDatabase;
    } catch (error) {
        console.warn('[admin-mobile] Firebase RTDB unavailable:', error);
        databaseInstance = null;
    }

    return databaseInstance;
}
