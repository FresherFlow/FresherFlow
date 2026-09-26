/**
 * Phase 11 — organization membership and invite lifecycle.
 *
 * `organization.service.ts` creates an organization and its first owner. This
 * module owns everything that happens to a team afterwards: adding and removing
 * members, changing roles, and running an invite from creation to acceptance.
 *
 * Three rules shape the design:
 *
 * 1. An invite is a capability, so its token is generated from the CSPRNG and
 *    it carries its own expiry. A leaked token only works until `expiresAt`.
 * 2. An invite is bound to one email. Accepting requires the authenticated
 *    user's own address to match, so a token forwarded to a third party is
 *    worthless. Addresses are compared after trimming and lowercasing because
 *    `User.email` is unique but not normalised on write.
 * 3. The last owner cannot be removed or demoted. An organization with no owner
 *    has nobody who can administer it or accept the next invite, so those two
 *    operations are refused rather than allowed to orphan the tenant.
 *
 * Every mutation that touches both an invite and a membership runs in one
 * transaction, so an accepted invite never leaves a membership behind without
 * its `acceptedAt` stamp or vice versa.
 */

import prisma from '../../database/prisma';
import { AppError } from '../../../middleware/errorHandler';
import { requireOrgMembership } from './orgAccess';
import {
    MembershipStatus,
    OrgRole,
    type Organization,
    type OrganizationInvite,
    type OrganizationMembership,
} from '@fresherflow/database';
import crypto from 'crypto';
import { OrganizationType } from '@fresherflow/types';
import { slugify } from '@fresherflow/utils';

/** An invite is a bearer capability, so it expires. Seven days matches the
 *  window recruiters expect from a "join my team" email. */
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const MAX_MEMBERS = 500;

export interface MemberWithUser extends OrganizationMembership {
    user: { id: string; fullName: string | null; username: string | null; email: string | null };
}

export interface InviteWithIssuer extends OrganizationInvite {
    invitedByUser: { id: string; fullName: string | null; email: string | null } | null;
}

export class OrganizationMembershipService {
    /**
     * Normalises an address for comparison. `User.email` and
     * `OrganizationInvite.email` are both free text, so a mixed-case or padded
     * address would otherwise compare unequal to the same mailbox.
     */
    private static normalizeEmail(email: string): string {
        return email.trim().toLowerCase();
    }

    /** 32 bytes of CSPRNG output, hex encoded. `crypto.randomUUID` would do, but
     *  an invite token is a bearer credential with a long lifetime, so it is
     *  sized for entropy rather than for uniqueness. */
    private static generateToken(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    private static assertInvitableRole(role: OrgRole): void {
        // OWNER is not grantable through an invite. Ownership is transferred
        // deliberately, never as a side effect of inviting a teammate.
        if (role === OrgRole.OWNER) {
            throw new AppError('An organization role cannot be granted to another member', 400);
        }
    }

    private static async assertOwnerRemains(organizationId: string): Promise<void> {
        const owners = await prisma.organizationMembership.count({
            where: { organizationId, role: OrgRole.OWNER, status: MembershipStatus.APPROVED },
        });
        if (owners < 2) {
            throw new AppError('An organization must keep at least one owner', 409);
        }
    }

    // ── Members ─────────────────────────────────────────────────────────────

    static async listMembers(organizationId: string): Promise<MemberWithUser[]> {
        return prisma.organizationMembership.findMany({
            where: { organizationId },
            include: {
                user: { select: { id: true, fullName: true, username: true, email: true } },
            },
            orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
        });
    }

    /**
     * Adds an existing user directly, bypassing the invite email round-trip.
     * Reserved for an admin who already knows the exact account they want; the
     * invite path is the default for everyone else.
     */
    static async addMember(data: {
        organizationId: string;
        userId: string;
        role: OrgRole;
    }): Promise<MemberWithUser> {
        OrganizationMembershipService.assertInvitableRole(data.role);

        const user = await prisma.user.findUnique({
            where: { id: data.userId },
            select: { id: true, email: true, fullName: true, username: true, status: true },
        });
        if (!user) throw new AppError('User not found', 404);
        if (user.status !== 'ACTIVE') {
            throw new AppError('Only an active account can join an organization', 400);
        }

        const existing = await prisma.organizationMembership.findUnique({
            where: {
                userId_organizationId: {
                    userId: data.userId,
                    organizationId: data.organizationId,
                },
            },
            select: { id: true, status: true },
        });

        if (existing && existing.status === MembershipStatus.APPROVED) {
            throw new AppError('User is already a member of this organization', 409);
        }

        const count = await prisma.organizationMembership.count({
            where: { organizationId: data.organizationId },
        });
        if (count >= MAX_MEMBERS) {
            throw new AppError('This organization has reached its member limit', 409);
        }

        // A previously rejected or pending membership is revived rather than
        // duplicated: the compound unique key makes a second row impossible.
        const membership = existing
            ? await prisma.organizationMembership.update({
                  where: { id: existing.id },
                  data: { role: data.role, status: MembershipStatus.APPROVED },
              })
            : await prisma.organizationMembership.create({
                  data: {
                      userId: data.userId,
                      organizationId: data.organizationId,
                      role: data.role,
                      status: MembershipStatus.APPROVED,
                  },
              });

        return {
            ...membership,
            user: { id: user.id, fullName: user.fullName, username: user.username, email: user.email },
        };
    }

    /**
     * Changes a member's role. Promotion and demotion share this path so the
     * "keep one owner" rule cannot be bypassed by routing a demotion elsewhere.
     */
    static async updateMemberRole(data: {
        organizationId: string;
        userId: string;
        role: OrgRole;
    }): Promise<MemberWithUser> {
        const membership = await prisma.organizationMembership.findUnique({
            where: {
                userId_organizationId: { userId: data.userId, organizationId: data.organizationId },
            },
            select: { id: true, role: true, status: true },
        });
        if (!membership || membership.status !== MembershipStatus.APPROVED) {
            throw new AppError('Member not found', 404);
        }

        if (membership.role === OrgRole.OWNER && data.role !== OrgRole.OWNER) {
            await OrganizationMembershipService.assertOwnerRemains(data.organizationId);
        }

        if (data.role === OrgRole.OWNER && membership.role !== OrgRole.OWNER) {
            // Granting ownership is an explicit, audited decision, not something
            // reachable by PATCHing an arbitrary role.
            throw new AppError('Ownership must be transferred explicitly', 400);
        }

        const updated = await prisma.organizationMembership.update({
            where: { id: membership.id },
            data: { role: data.role },
        });

        const user = await prisma.user.findUnique({
            where: { id: data.userId },
            select: { id: true, fullName: true, username: true, email: true },
        });

        return { ...updated, user: user as MemberWithUser['user'] };
    }

    static async removeMember(data: { organizationId: string; userId: string }): Promise<void> {
        const membership = await prisma.organizationMembership.findUnique({
            where: {
                userId_organizationId: { userId: data.userId, organizationId: data.organizationId },
            },
            select: { id: true, role: true, status: true },
        });
        if (!membership || membership.status !== MembershipStatus.APPROVED) {
            throw new AppError('Member not found', 404);
        }
        if (membership.role === OrgRole.OWNER) {
            await OrganizationMembershipService.assertOwnerRemains(data.organizationId);
        }

        await prisma.organizationMembership.delete({ where: { id: membership.id } });
    }

    // ── Invites ─────────────────────────────────────────────────────────────

    /**
     * Issues an invite. Re-inviting the same live address supersedes the old
     * token instead of leaving two valid ones behind, so revoking access means
     * revoking a single row.
     */
    static async createInvite(data: {
        organizationId: string;
        email: string;
        role: OrgRole;
        invitedByUserId: string;
    }): Promise<OrganizationInvite> {
        OrganizationMembershipService.assertInvitableRole(data.role);

        const email = OrganizationMembershipService.normalizeEmail(data.email);
        if (!email || !email.includes('@')) {
            throw new AppError('A valid email address is required', 400);
        }

        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });
        if (existingUser) {
            const membership = await prisma.organizationMembership.findUnique({
                where: {
                    userId_organizationId: {
                        userId: existingUser.id,
                        organizationId: data.organizationId,
                    },
                },
                select: { status: true },
            });
            if (membership && membership.status === MembershipStatus.APPROVED) {
                throw new AppError('This person is already a member', 409);
            }
        }

        return prisma.$transaction(async (tx) => {
            await tx.organizationInvite.updateMany({
                where: { organizationId: data.organizationId, email, acceptedAt: null },
                data: { expiresAt: new Date(Date.now() - 1) },
            });

            return tx.organizationInvite.create({
                data: {
                    organizationId: data.organizationId,
                    email,
                    role: data.role,
                    invitedBy: data.invitedByUserId,
                    token: OrganizationMembershipService.generateToken(),
                    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
                },
            });
        });
    }

    /**
     * Pending invites. `OrganizationInvite.invitedBy` is a bare user id rather
     * than a relation, so the issuer's name is resolved with one grouped lookup
     * instead of being joined per row. This is a small admin list, not a hot
     * path, and a second query beats an N+1.
     */
    static async listInvites(organizationId: string): Promise<InviteWithIssuer[]> {
        const invites = await prisma.organizationInvite.findMany({
            where: { organizationId, acceptedAt: null },
            orderBy: { createdAt: 'desc' },
        });

        const issuerIds = [...new Set(invites.map((i) => i.invitedBy))];
        const issuers = issuerIds.length
            ? await prisma.user.findMany({
                  where: { id: { in: issuerIds } },
                  select: { id: true, fullName: true, email: true },
              })
            : [];
        const byId = new Map(issuers.map((u) => [u.id, u]));

        return invites.map((invite) => ({
            ...invite,
            invitedByUser: byId.get(invite.invitedBy) ?? null,
        }));
    }

    static async revokeInvite(data: { organizationId: string; inviteId: string }): Promise<void> {
        const invite = await prisma.organizationInvite.findFirst({
            where: { id: data.inviteId, organizationId: data.organizationId },
            select: { id: true, acceptedAt: true },
        });
        if (!invite) throw new AppError('Invite not found', 404);
        if (invite.acceptedAt) {
            throw new AppError('This invite has already been accepted', 409);
        }

        await prisma.organizationInvite.delete({ where: { id: invite.id } });
    }

    /**
     * Resolves an invite for display without consuming it, so the accept screen
     * can render the organization name before the user commits.
     */
    static async peekInvite(token: string): Promise<{
        organizationId: string;
        organizationName: string;
        email: string;
        role: OrgRole;
        expiresAt: Date;
    }> {
        const invite = await prisma.organizationInvite.findUnique({
            where: { token },
            select: {
                organizationId: true,
                email: true,
                role: true,
                expiresAt: true,
                acceptedAt: true,
                organization: { select: { name: true, active: true } },
            },
        });
        if (!invite) throw new AppError('This invite is not valid', 400);
        if (invite.acceptedAt) throw new AppError('This invite has already been accepted', 409);
        if (invite.expiresAt.getTime() <= Date.now()) {
            throw new AppError('This invite has expired', 400);
        }
        if (!invite.organization.active) {
            throw new AppError('This organization is not active', 400);
        }

        return {
            organizationId: invite.organizationId,
            organizationName: invite.organization.name,
            email: invite.email,
            role: invite.role,
            expiresAt: invite.expiresAt,
        };
    }

    /**
     * Redeems an invite for the authenticated user.
     *
     * The token is resolved through the unique index (`where: { token }`) rather
     * than a string compare, so there is no character-by-character timing
     * surface. Everything that must hold together — membership created, invite
     * stamped, sibling live invites retired — happens in one transaction.
     */
    static async acceptInvite(data: { token: string; userId: string }): Promise<{
        organization: Organization;
        membership: OrganizationMembership;
    }> {
        const user = await prisma.user.findUnique({
            where: { id: data.userId },
            select: { id: true, email: true, status: true },
        });
        if (!user) throw new AppError('Authentication required', 401);
        if (!user.email) {
            throw new AppError('A verified email address is required to join an organization', 400);
        }

        const invite = await prisma.organizationInvite.findUnique({
            where: { token: data.token },
            select: {
                id: true,
                organizationId: true,
                email: true,
                role: true,
                expiresAt: true,
                acceptedAt: true,
                organization: { select: { id: true, name: true, active: true } },
            },
        });

        if (!invite) throw new AppError('This invite is not valid', 400);
        if (invite.acceptedAt) throw new AppError('This invite has already been accepted', 409);
        if (invite.expiresAt.getTime() <= Date.now()) {
            throw new AppError('This invite has expired', 400);
        }
        if (!invite.organization.active) {
            throw new AppError('This organization is not active', 400);
        }
        if (invite.email !== OrganizationMembershipService.normalizeEmail(user.email)) {
            // A token is only good for the mailbox it was sent to. Without this,
            // anyone who saw the link could claim the seat.
            throw new AppError('This invite was issued to a different email address', 403);
        }

        const membership = await prisma.$transaction(async (tx) => {
            const created = await tx.organizationMembership.upsert({
                where: {
                    userId_organizationId: {
                        userId: data.userId,
                        organizationId: invite.organizationId,
                    },
                },
                create: {
                    userId: data.userId,
                    organizationId: invite.organizationId,
                    role: invite.role,
                    status: MembershipStatus.APPROVED,
                },
                update: { status: MembershipStatus.APPROVED },
            });

            await tx.organizationInvite.update({
                where: { id: invite.id },
                data: { acceptedAt: new Date() },
            });

            // Redeeming one link should not leave its siblings alive.
            await tx.organizationInvite.updateMany({
                where: {
                    organizationId: invite.organizationId,
                    email: invite.email,
                    acceptedAt: null,
                },
                data: { expiresAt: new Date(Date.now() - 1) },
            });

            return created;
        });

        const organization = await prisma.organization.findUnique({
            where: { id: invite.organizationId },
        });
        if (!organization) throw new AppError('Organization not found', 404);

        return { organization, membership };
    }
    // ── Organization profile ────────────────────────────────────────────────

    /**
     * Profile edits. Only an OWNER or ADMIN may change these, because the active
     * flag affects who else can see and join the org.
     */
    static async updateOrganization(data: {
        organizationId: string;
        actorUserId: string;
        patch: {
            name?: string;
            website?: string | null;
            logo?: string | null;
            active?: boolean;
        };
    }): Promise<Organization> {
        await requireOrgMembership(data.actorUserId, data.organizationId, { minRole: OrgRole.ADMIN });

        const patch: Record<string, unknown> = {};
        if (data.patch.name !== undefined) {
            const name = data.patch.name.trim();
            if (!name) throw new AppError('Organization name is required', 400);
            if (name.length > 120) {
                throw new AppError('Organization name must be 120 characters or fewer', 400);
            }
            patch.name = name;
        }
        if (data.patch.website !== undefined) {
            // Parsed and protocol-checked rather than substring-matched, so
            // `javascript:` and `data:` URLs cannot reach the website slot.
            if (data.patch.website) {
                let parsed: URL;
                try {
                    parsed = new URL(data.patch.website);
                } catch {
                    throw new AppError('Website must be a valid URL', 400);
                }
                if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
                    throw new AppError('Website must be an http or https URL', 400);
                }
            }
            patch.website = data.patch.website;
        }
        if (data.patch.logo !== undefined) patch.logo = data.patch.logo;
        if (data.patch.active !== undefined) patch.active = data.patch.active;

        if (Object.keys(patch).length === 0) {
            throw new AppError('No fields to update', 400);
        }

        return prisma.organization.update({
            where: { id: data.organizationId },
            data: patch,
        });
    }

    /**
     * Flips verification. Kept separate from `updateOrganization` so reaching it
     * requires an explicit call site: verification is a platform trust decision,
     * not a field a company admin can set on itself.
     */
    static async setVerified(data: {
        organizationId: string;
        verified: boolean;
    }): Promise<Organization> {
        return prisma.organization.update({
            where: { id: data.organizationId },
            data: {
                verified: data.verified,
                verifiedAt: data.verified ? new Date() : null,
            },
        });
    }
}

export class OrganizationService {
    /**
     * Get organization by ID or slug
     */
    static async getOrganization(idOrSlug: string) {
        return prisma.organization.findFirst({
            where: {
                OR: [
                    { id: idOrSlug },
                    { slug: idOrSlug }
                ]
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                fullName: true,
                                username: true,
                                email: true,
                                role: true
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create or auto-join Organization based on user email domain
     */
    static async createOrJoinOrganization(data: {
        userId: string;
        userEmail: string;
        orgName: string;
        type?: OrganizationType;
        website?: string;
    }) {
        const domainMatch = data.userEmail.includes('@') ? data.userEmail.split('@')[1]?.toLowerCase() : null;
        
        // Exclude common personal email domains
        const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
        const isCorporateDomain = domainMatch && !publicDomains.includes(domainMatch);

        if (isCorporateDomain) {
            // Check if verified org exists with this email domain
            const existingOrg = await prisma.organization.findFirst({
                where: {
                    emailDomain: domainMatch,
                    verified: true
                }
            });

            if (existingOrg) {
                // Auto-join as RECRUITER
                const membership = await prisma.organizationMembership.upsert({
                    where: {
                        userId_organizationId: {
                            userId: data.userId,
                            organizationId: existingOrg.id
                        }
                    },
                    create: {
                        userId: data.userId,
                        organizationId: existingOrg.id,
                        role: OrgRole.RECRUITER,
                        status: MembershipStatus.APPROVED
                    },
                    update: {}
                });

                return { organization: existingOrg, membership, autoJoined: true };
            }
        }

        // Otherwise create new Organization (pending manual verification unless trusted corporate domain)
        const baseSlug = slugify(data.orgName);
        const autoVerify = Boolean(isCorporateDomain && ['tcs.com', 'wipro.com', 'amazon.com', 'google.com', 'microsoft.com'].includes(domainMatch!));

        const organization = await prisma.organization.create({
            data: {
                name: data.orgName,
                slug: `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`,
                type: data.type || OrganizationType.COMPANY,
                emailDomain: isCorporateDomain ? domainMatch : null,
                website: data.website || null,
                verified: autoVerify,
                verifiedAt: autoVerify ? new Date() : null,
                members: {
                    create: {
                        userId: data.userId,
                        role: OrgRole.OWNER,
                        status: MembershipStatus.APPROVED
                    }
                }
            },
            include: {
                members: true
            }
        });

        return { organization, membership: organization.members[0], autoJoined: false };
    }

    /**
     * Check whether a user is an ACTIVE member of an organization.
     */
    static async isActiveMember(organizationId: string, userId: string) {
        const membership = await prisma.organizationMembership.findFirst({
            where: {
                organizationId,
                userId,
                status: MembershipStatus.APPROVED
            },
            select: { role: true }
        });

        return membership;
    }

    /**
     * Invite a team member to an Organization.
     *
     * Only ACTIVE members of the target organization may invite. Enforced here
     * (not in the route) so no caller can bypass the membership check.
     */
    static async inviteTeamMember(data: {
        organizationId: string;
        invitedByUserId: string;
        email: string;
        role?: OrgRole;
    }) {
        const membership = await OrganizationService.isActiveMember(
            data.organizationId,
            data.invitedByUserId
        );

        if (!membership) {
            throw new AppError('You are not an active member of this organization', 403);
        }

        // Only owners/admins may grant elevated roles.
        const requestedRole = data.role || OrgRole.RECRUITER;
        const canGrant = membership.role === OrgRole.OWNER || membership.role === OrgRole.ADMIN;

        if (!canGrant && requestedRole !== OrgRole.RECRUITER) {
            throw new AppError('You do not have permission to invite with this role', 403);
        }

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        return prisma.organizationInvite.create({
            data: {
                organizationId: data.organizationId,
                email: data.email.toLowerCase().trim(),
                role: requestedRole,
                invitedBy: data.invitedByUserId,
                expiresAt
            }
        });
    }
}
