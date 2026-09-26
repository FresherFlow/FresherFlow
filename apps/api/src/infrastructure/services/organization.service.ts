import prisma from '../database/prisma';
import { OrganizationType, OrgRole, MembershipStatus } from '@fresherflow/types';
import { slugify } from '@fresherflow/utils';
import { AppError } from '../../middleware/errorHandler';

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
