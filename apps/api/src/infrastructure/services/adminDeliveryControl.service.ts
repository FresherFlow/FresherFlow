import prisma from '../database/prisma';
import { env } from '@fresherflow/config';

export interface AdminDeliveryControls {
    socialAutoPostingEnabled: boolean;
    userAlertsEnabled: boolean;
    userEmailNotificationsEnabled: boolean;
}

const GLOBAL_CONTROL_ID = 'global';

const DEFAULT_CONTROLS: AdminDeliveryControls = {
    socialAutoPostingEnabled: env.ENABLE_SOCIAL_POSTING !== false,
    userAlertsEnabled: env.ENABLE_CRON_TASKS !== false,
    userEmailNotificationsEnabled: env.ENABLE_EMAIL_SENDING !== false,
};

export async function getAdminDeliveryControls(): Promise<AdminDeliveryControls> {
    const controls = await prisma.adminDeliveryControl.findUnique({
        where: { id: GLOBAL_CONTROL_ID },
        select: {
            socialAutoPostingEnabled: true,
            userAlertsEnabled: true,
            userEmailNotificationsEnabled: true,
        }
    });

    if (!controls) {
        return DEFAULT_CONTROLS;
    }

    return controls;
}

export async function updateAdminDeliveryControls(
    input: Partial<AdminDeliveryControls>,
    updatedByUserId?: string
): Promise<AdminDeliveryControls> {
    const existing = await getAdminDeliveryControls();
    const nextState = {
        ...existing,
        ...input,
    };

    const controls = await prisma.adminDeliveryControl.upsert({
        where: { id: GLOBAL_CONTROL_ID },
        create: {
            id: GLOBAL_CONTROL_ID,
            ...nextState,
            updatedByUserId: updatedByUserId || null,
        },
        update: {
            ...nextState,
            updatedByUserId: updatedByUserId || null,
        },
        select: {
            socialAutoPostingEnabled: true,
            userAlertsEnabled: true,
            userEmailNotificationsEnabled: true,
        }
    });

    return controls;
}
