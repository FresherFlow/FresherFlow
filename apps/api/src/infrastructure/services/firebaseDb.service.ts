import admin from '../../lib/firebase';
import { logger } from '@fresherflow/logger';

export interface FirebaseOnboardingRecord {
    username?: string | null;
    fullName?: string | null;
    skipUsernameSetup?: boolean;
    profileCompleted?: boolean;
    updatedAt?: number;
}

export class FirebaseDbService {
    static async updateOnboardingRecord(firebaseUid: string, payload: Partial<FirebaseOnboardingRecord>) {
        if (!firebaseUid) return;

        try {
            const db = admin.database();
            const ref = db.ref(`/users/${firebaseUid}/onboarding`);
            await ref.update({
                ...payload,
                updatedAt: Date.now(),
            });
            logger.debug(`[FirebaseDbService] Updated onboarding record for ${firebaseUid}`);
        } catch (error) {
            const err = error as { code?: string; errorInfo?: { code?: string }; message?: string };
            // In local dev (fallback mode) RTDB is not initialized — skip silently
            if (err?.code === 'app/invalid-credential' || err?.errorInfo?.code === 'app/no-database-url' || err?.message?.includes('database')) {
                return;
            }
            logger.error(`[FirebaseDbService] Failed to update onboarding record for ${firebaseUid}:`, error);
        }
    }
}
