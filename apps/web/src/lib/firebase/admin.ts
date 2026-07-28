import * as admin from 'firebase-admin';

const project_id = process.env.FIREBASE_PROJECT_ID?.replace(/^"|"$/g, '') || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.replace(/^"|"$/g, '');
const client_email = process.env.FIREBASE_CLIENT_EMAIL?.replace(/^"|"$/g, '');
const private_key = process.env.FIREBASE_PRIVATE_KEY?.replace(/^"|"$/g, '')?.replace(/\\n/g, '\n');

if (!admin.apps.length) {
    if (project_id && client_email && private_key) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: project_id,
                clientEmail: client_email,
                privateKey: private_key,
            }),
            databaseURL: `https://${project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`
        });
    } else {
        const pid = project_id || 'fresherflow-dev-staging';
        if (!process.env.GCLOUD_PROJECT) process.env.GCLOUD_PROJECT = pid;
        admin.initializeApp({
            projectId: pid,
            databaseURL: `https://${pid}-default-rtdb.asia-southeast1.firebasedatabase.app`
        });
    }
}

export const auth = admin.auth();
export default admin;
