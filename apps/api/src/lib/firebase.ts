import { logger } from '@fresherflow/utils';

let appInstance: any = null;
let authInstance: any = null;

export const initializeFirebase = async () => {
    if (appInstance) return;

    const { initializeApp, getApps, cert } = await import('firebase-admin/app');
    const { getAuth } = await import('firebase-admin/auth');

    const project_id = process.env.FIREBASE_PROJECT_ID?.replace(/^"|"$/g, '');
    const client_email = process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, '');
    const private_key = process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '')?.replace(/\\n/g, '\n');

    const apps = getApps();
    let app;

    if (apps.length === 0) {
        if (project_id && client_email && private_key) {
            try {
                app = initializeApp({
                    credential: cert({
                        projectId: project_id,
                        clientEmail: client_email,
                        privateKey: private_key,
                    }),
                    databaseURL: `https://${project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`
                });
                logger.info('Firebase Admin initialized with service account.');
            } catch (error) {
                logger.error('[Firebase] Failed to initialize Admin SDK with certificate:', error);
                const pid = project_id || 'fresherflow-dev-staging';
                app = initializeApp({ 
                    projectId: pid,
                    databaseURL: `https://${pid}-default-rtdb.asia-southeast1.firebasedatabase.app`
                });
            }
        } else {
            const isStaging = process.env.RENDER_SERVICE_NAME?.includes('staging') || 
                              process.env.RENDER_EXTERNAL_URL?.includes('staging') ||
                              process.env.NODE_ENV === 'staging';
            const pid = project_id || (isStaging ? 'fresherflow-dev-staging' : 'fresherflow-3604b');
            if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = pid;
            try {
                // No service account available — init with projectId and databaseURL.
                app = initializeApp({ 
                    projectId: pid,
                    databaseURL: `https://${pid}-default-rtdb.asia-southeast1.firebasedatabase.app`
                });
                logger.info(`[Firebase] Admin initialized with Project ID: ${pid} and Database URL.`);
            } catch (error) {
                logger.error('[Firebase] Admin initialization failed in fallback mode:', error);
            }
        }
    } else {
        app = apps[0];
    }

    appInstance = app;
    authInstance = getAuth(app);
};

export const getFirebaseAuth = () => {
    if (!authInstance) {
        throw new Error('Firebase is not initialized yet');
    }
    return authInstance;
};

export const getFirebaseApp = () => {
    if (!appInstance) {
        throw new Error('Firebase is not initialized yet');
    }
    return appInstance;
};
