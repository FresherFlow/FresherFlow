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
            logger.error(`[FirebaseDbService] Failed to update onboarding record for ${firebaseUid}:`, error);
        }
    }
}
