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
            });
            logger.info('Firebase Admin initialized with service account.');
        } catch (error) {
            logger.error('Firebase Admin initialization failed:', error);
        }
    } else {
        // Fallback to default credentials (useful for local dev with GOOGLE_APPLICATION_CREDENTIALS)
        admin.initializeApp();
        logger.info('Firebase Admin initialized with default credentials.');
    }
}

export const auth = admin.auth();
export default admin;
