import * as admin from 'firebase-admin';
import { logger } from '@fresherflow/logger';

const project_id = process.env.FIREBASE_PROJECT_ID;
const client_email = process.env.FIREBASE_CLIENT_EMAIL;
const private_key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!admin.apps.length) {
    if (project_id && client_email && private_key) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: project_id,
                    clientEmail: client_email,
                    privateKey: private_key,
                }),
                databaseURL: `https://${project_id}-default-rtdb.firebaseio.com`
            });
            logger.info('Firebase Admin initialized with service account.');
        } catch (error) {
            logger.error('Firebase Admin initialization failed:', error);
        }
    } else {
        // Explicit fallback for local development
        const pid = project_id || 'fresherflow-3604b';
        if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = pid;
        try {
            admin.initializeApp({
                projectId: pid,
                databaseURL: `https://${pid}-default-rtdb.firebaseio.com`
            });
            logger.info(`[Firebase] Admin initialized with Project ID: ${pid} (Fallback Mode)`);
        } catch (error) {
            logger.error('[Firebase] Admin initialization failed in fallback mode:', error);
        }
    }
}

export const auth = admin.auth();
export default admin;
