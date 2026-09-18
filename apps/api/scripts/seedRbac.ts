import prisma from '../src/infrastructure/database/prisma';

const PERMISSIONS = [
    { key: 'opportunity.review', description: 'Review submitted opportunities', category: 'opportunity' },
    { key: 'opportunity.edit', description: 'Edit opportunity details', category: 'opportunity' },
    { key: 'opportunity.publish', description: 'Publish opportunities', category: 'opportunity' },
    { key: 'opportunity.archive', description: 'Archive opportunities', category: 'opportunity' },
    { key: 'opportunity.restore', description: 'Restore archived/deleted opportunities', category: 'opportunity' },
    { key: 'opportunity.delete', description: 'Delete opportunities', category: 'opportunity' },
    { key: 'opportunity.create', description: 'Create new opportunities', category: 'opportunity' },
    { key: 'report.resolve', description: 'Resolve reports', category: 'report' },
    { key: 'moderator.manage', description: 'Manage moderators and team', category: 'moderator' },
    { key: 'settings.manage', description: 'Manage site configuration', category: 'settings' },
    { key: 'audit.view', description: 'View audit logs', category: 'audit' },
    { key: 'user.manage', description: 'Manage users and status', category: 'user' },
    { key: 'source.manage', description: 'Manage ingestion sources', category: 'source' },
    { key: 'ingestion.manage', description: 'Manage ingestion runs', category: 'source' },
] as const;

const SUPER_ADMIN_PERMISSIONS = PERMISSIONS.map(p => p.key);
const MODERATOR_PERMISSIONS = [
    'opportunity.review', 'opportunity.edit', 'opportunity.publish',
    'opportunity.archive', 'report.resolve',
];

export async function seedRbac() {
    const superAdmin = await prisma.accessRole.upsert({
        where: { name: 'SUPER_ADMIN' },
        create: { name: 'SUPER_ADMIN', displayName: 'Super Admin', description: 'Full system access', isSystem: true },
        update: { displayName: 'Super Admin', description: 'Full system access', isSystem: true },
    });

    const moderator = await prisma.accessRole.upsert({
        where: { name: 'MODERATOR' },
        create: { name: 'MODERATOR', displayName: 'Moderator', description: 'Moderation access', isSystem: true },
        update: { displayName: 'Moderator', description: 'Moderation access', isSystem: true },
    });

    const existingKeys = new Set((await prisma.permission.findMany({ select: { key: true } })).map(p => p.key));
    const permissionRecords: { key: string; description: string; category: string }[] = [];

    for (const p of PERMISSIONS) {
        if (!existingKeys.has(p.key)) {
            const created = await prisma.permission.create({ data: p });
            permissionRecords.push(created);
        } else {
            const existing = await prisma.permission.update({
                where: { key: p.key },
                data: { description: p.description, category: p.category },
            });
            permissionRecords.push(existing);
        }
    }

    const allPermissions = await prisma.permission.findMany({ select: { id: true } });

    const existingSuperMappings = await prisma.accessRolePermission.findMany({
        where: { roleId: superAdmin.id },
        select: { permissionId: true },
    });
    const superPermissionIds = new Set(existingSuperMappings.map(m => m.permissionId));
    for (const perm of allPermissions) {
        if (!superPermissionIds.has(perm.id)) {
            await prisma.accessRolePermission.upsert({
                where: { roleId_permissionId: { roleId: superAdmin.id, permissionId: perm.id } },
                create: { roleId: superAdmin.id, permissionId: perm.id },
                update: {},
            });
        }
    }

    const existingModMappings = await prisma.accessRolePermission.findMany({
        where: { roleId: moderator.id },
        select: { permissionId: true },
    });
    const modPermissionIds = new Set(existingModMappings.map(m => m.permissionId));
    const modIds = new Set(MODERATOR_PERMISSIONS);
    for (const perm of allPermissions) {
        const shouldHave = modIds.has(perm.key);
        const has = modPermissionIds.has(perm.id);
        if (shouldHave && !has) {
            await prisma.accessRolePermission.create({ data: { roleId: moderator.id, permissionId: perm.id } });
        } else if (!shouldHave && has) {
            await prisma.accessRolePermission.deleteMany({ where: { roleId: moderator.id, permissionId: perm.id } });
        }
    }

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    let backfilled = 0;
    for (const admin of admins) {
        const existing = await prisma.userAccessRole.findFirst({
            where: { userId: admin.id, roleId: superAdmin.id },
        });
        if (!existing) {
            await prisma.userAccessRole.create({ data: { userId: admin.id, roleId: superAdmin.id, assignedBy: 'SYSTEM' } });
            backfilled++;
        }
    }

    return { superAdmin, moderator, permissionsCreated: allPermissions.length, backfilled };
}

if (require.main === module) {
    seedRbac()
        .then(result => { console.log('RBAC seed complete:', JSON.stringify(result)); process.exit(0); })
        .catch(err => { console.error('RBAC seed failed:', err); process.exit(1); });
}
