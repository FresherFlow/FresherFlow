import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const project_id = process.env.FIREBASE_PROJECT_ID?.replace(/^"|"$/g, '') || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.replace(/^"|"$/g, '');
const client_email = process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, '');
const private_key = process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '')?.replace(/\\n/g, '\n');

const apps = getApps();
let app;

if (apps.length === 0) {
    if (project_id && client_email && private_key) {
        app = initializeApp({
            credential: cert({
                projectId: project_id,
                clientEmail: client_email,
                privateKey: private_key,
            }),
            databaseURL: `https://${project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`
        });
    } else {
        const pid = project_id || 'fresherflow-dev-staging';
        if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = pid;
        app = initializeApp({
            projectId: pid,
            databaseURL: `https://${pid}-default-rtdb.asia-southeast1.firebasedatabase.app`
        });
    }
} else {
    app = apps[0];
}

export const auth = getAuth(app);
export default app;
