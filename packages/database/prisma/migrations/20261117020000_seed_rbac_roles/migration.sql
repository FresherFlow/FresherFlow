-- Seed the RBAC rows the admin moderator screen and the MCP surface assume.
--
-- The schema migration created the AccessRole / Permission / AccessRolePermission
-- tables and the RoleType enum, but never inserted any rows. As a result
-- POST /api/admin/moderators/:userId fails with 500 "Moderator role is not
-- configured", and no account can hold the opportunity.* grants the MCP
-- moderator tools require.
--
-- Inserted with fixed, readable UUIDs so the mapping is stable and the whole
-- file is idempotent (safe to re-run).

-- Roles ---------------------------------------------------------------------
INSERT INTO "AccessRole" ("id", "name", "displayName", "description", "isSystem", "updatedAt")
VALUES
  ('00000000-0000-4000-8000-000000000001', 'MODERATOR',  'Moderator',   'Reviews community submissions and listings; cannot manage staff or settings', true, NOW()),
  ('00000000-0000-4000-8000-000000000002', 'SUPER_ADMIN','Super Admin', 'Full administrative access including staff, settings and audit', true, NOW())
ON CONFLICT ("name") DO NOTHING;

-- Permissions ---------------------------------------------------------------
-- Moderator set: mirrors MODERATOR_PERMS in moderator-permissions.test.ts and
-- MODERATION_PERMISSIONS in the web moderation area.
INSERT INTO "Permission" ("id", "key", "description", "category")
VALUES
  ('00000000-0000-4000-8100-000000000001', 'opportunity.review',   'Review community submissions and listings', 'opportunity'),
  ('00000000-0000-4000-8100-000000000002', 'opportunity.edit',     'Edit existing listings and link submissions', 'opportunity'),
  ('00000000-0000-4000-8100-000000000003', 'opportunity.publish',  'Publish pending submissions and listings',    'opportunity'),
  ('00000000-0000-4000-8100-000000000004', 'opportunity.archive',  'Archive listings',                           'opportunity'),
  ('00000000-0000-4000-8100-000000000005', 'opportunity.restore',  'Restore archived listings',                  'opportunity'),
  ('00000000-0000-4000-8100-000000000006', 'report.resolve',       'Resolve reports',                            'moderation'),
  ('00000000-0000-4000-8100-000000000007', 'community.moderate',   'Moderate community content and rooms',       'moderation'),
  ('00000000-0000-4000-8100-000000000008', 'resource.moderate',    'Moderate pending community resources',        'moderation'),
  ('00000000-0000-4000-8100-000000000009', 'user.manage',          'Manage account status and visibility',        'user')
ON CONFLICT ("key") DO NOTHING;

-- SUPER_ADMIN-only permissions (explicitly excluded from MODERATOR).
INSERT INTO "Permission" ("id", "key", "description", "category")
VALUES
  ('00000000-0000-4000-8100-00000000000a', 'opportunity.create',  'Create full listings',                 'opportunity'),
  ('00000000-0000-4000-8100-00000000000b', 'opportunity.delete',  'Delete listings',                      'opportunity'),
  ('00000000-0000-4000-8100-00000000000c', 'resource.manage',     'Manage community resources',           'resource'),
  ('00000000-0000-4000-8100-00000000000d', 'moderator.manage',    'Grant and revoke the moderator role',   'system'),
  ('00000000-0000-4000-8100-00000000000e', 'settings.manage',     'Change application settings',           'system'),
  ('00000000-0000-4000-8100-00000000000f', 'audit.view',          'Read the admin audit trail',            'system'),
  ('00000000-0000-4000-8100-000000000010', 'source.manage',       'Manage ingestion sources',              'ingestion'),
  ('00000000-0000-4000-8100-000000000011', 'ingestion.manage',    'Run and configure ingestion',           'ingestion')
ON CONFLICT ("key") DO NOTHING;

-- Role -> permission mapping ------------------------------------------------
INSERT INTO "AccessRolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "AccessRole" r
CROSS JOIN "Permission" p
WHERE r."name" = 'MODERATOR'
  AND p."key" IN (
    'opportunity.review', 'opportunity.edit', 'opportunity.publish',
    'opportunity.archive', 'opportunity.restore',
    'report.resolve', 'community.moderate', 'resource.moderate', 'user.manage'
  )
ON CONFLICT DO NOTHING;

INSERT INTO "AccessRolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "AccessRole" r
CROSS JOIN "Permission" p
WHERE r."name" = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;
