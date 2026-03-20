import prisma from '../infrastructure/database/prisma';




/**
 * Automatic Admin Audit Logger
 * Logs all admin mutations automatically
 * Cannot be forgotten or skipped
 */
export async function logAdminAction(
    adminId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPIRE',
    targetId: string,
    reason?: string
): Promise<void> {
    await prisma.adminAudit.create({
        data: {
            userId: adminId,
            action,
            targetId,
            reason: reason || null
        }
    });
}

/**
 * Validate delete/expire reason
 * Minimum 10 characters, cannot be empty or "test"
 */
export function validateReason(reason: string | undefined, action: string): void {
    if (!reason || reason.trim().length < 10) {
        throw new Error(`Reason is required for ${action} (minimum 10 characters)`);
    }

    const normalized = reason.toLowerCase().trim();
    if (normalized === 'test' || normalized === 'testing') {
        throw new Error('Invalid reason - provide a meaningful explanation');
    }
}

