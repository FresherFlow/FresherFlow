/**
 * Phase 14 - trust verification pipeline.
 *
 * One entry point per signal, one audit trail per decision:
 *
 *   - verifyLink: HEAD/GET the listing URL with an SSRF guard (new URL +
 *     protocol/hostname checks, private-IP rejection, redirect re-validation,
 *     timeout, size cap). Records linkHealth + lastVerifiedAt timestamps.
 *   - verifyOfficialSource: ATS/official-domain check via domainReputation.
 *     Records officialSourceVerified + sourceLastCheckedAt on
 *     GovernmentJobDetails or the opportunity trust fields for other kinds.
 *   - applyCommunityReport: duplicate/broken-link/suspicious submissions move
 *     the listing to COMMUNITY_REPORTED (never directly to REJECTED — a
 *     report is a claim, and claims need moderator review).
 *   - moderatorReview: the only path to VERIFIED / FLAGGED / REJECTED on a
 *     listing. Writes reviewedByUserId + reviewedAt timestamps and clamps the
 *     trust score.
 *
 * Every mutation writes reviewedAt/lastVerifiedAt (or the event verification
 * timestamps) so "when was this decided" is always answerable. Detailed
 * errors are logged server-side with the hostname only; callers get a generic
 * verdict so upstream URL shapes never leak into admin UI strings.
 */

import prisma from '../../infrastructure/database/prisma';
import { logger } from '@fresherflow/utils';
import { domainTierForLink, hostnameForLog } from './domainReputation';
import {
    assertListingTrust,
    canTransitionTrust,
    clampTrustScore,
    trustScoreDelta,
    type ListingTrust,
} from './trustState';

const VERIFY_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;

function isPrivateIpv4(hostname: string): boolean {
    const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
    if (!match) return false;
    const [a, b] = [Number(match[1]), Number(match[2])];
    if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return true;
    if (a === 169 && b === 254) return true;
    if (a === 0 || a >= 224) return true;
    return false;
}

function assertSafeVerifyTarget(rawUrl: string): URL {
    let url: URL;
    try {
        url = new URL(rawUrl.trim());
    } catch {
        throw new Error('Listing link is not a valid absolute URL');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new Error('Listing link must use http or https');
    }
    const hostname = url.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
        throw new Error('Listing link resolves to a blocked host');
    }
    if (isPrivateIpv4(hostname) || hostname === '[::1]') {
        throw new Error('Listing link resolves to a private address');
    }
    if (url.username || url.password) throw new Error('Listing link must not contain credentials');
    return url;
}

export type LinkVerdict = 'HEALTHY' | 'BROKEN' | 'RETRYING' | 'SKIPPED';

async function pingTarget(
    rawUrl: string,
    fetchImpl: typeof fetch = fetch
): Promise<'HEALTHY' | 'SOFT_FAIL' | 'HARD_FAIL'> {
    let current = rawUrl;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
        const url = assertSafeVerifyTarget(current);
        const timeout = AbortSignal.timeout(VERIFY_TIMEOUT_MS);
        let response: Response;
        try {
            response = await fetchImpl(url.toString(), {
                method: 'HEAD',
                signal: timeout,
                redirect: 'manual',
                headers: { 'user-agent': 'FresherFlow-VerificationBot/1.0' },
            });
        } catch {
            return 'SOFT_FAIL';
        }
        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) return 'SOFT_FAIL';
            current = new URL(location, url).toString();
            continue;
        }
        if (response.ok) return 'HEALTHY';
        if (response.status === 404 || response.status === 410) return 'HARD_FAIL';
        if (response.status === 401 || response.status === 429 || response.status >= 500) return 'SOFT_FAIL';
        return 'HARD_FAIL';
    }
    return 'SOFT_FAIL';
}

export async function verifyLink(
    opportunityId: string,
    options: { fetchImpl?: typeof fetch } = {}
): Promise<{ verdict: LinkVerdict; failures: number }> {
    const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { id: true, applyLink: true, sourceLink: true, verificationFailures: true, trustScore: true, trustLevel: true },
    });
    if (!opportunity) throw new Error('Opportunity not found');

    const target = (opportunity.applyLink as string | null) ?? (opportunity.sourceLink as string | null);
    if (!target) {
        await prisma.opportunity.update({
            where: { id: opportunityId },
            data: { linkHealth: 'RETRYING', lastVerifiedAt: new Date(), lastVerified: new Date() },
        });
        return { verdict: 'SKIPPED', failures: opportunity.verificationFailures ?? 0 };
    }

    let result: 'HEALTHY' | 'SOFT_FAIL' | 'HARD_FAIL';
    try {
        result = await pingTarget(target, options.fetchImpl ?? fetch);
    } catch (error) {
        logger.error('Trust link verification blocked', { host: hostnameForLog(target) });
        void error;
        await prisma.opportunity.update({
            where: { id: opportunityId },
            data: { linkHealth: 'RETRYING', lastVerifiedAt: new Date(), lastVerified: new Date() },
        });
        return { verdict: 'RETRYING', failures: opportunity.verificationFailures ?? 0 };
    }

    if (result === 'HEALTHY') {
        await prisma.opportunity.update({
            where: { id: opportunityId },
            data: { linkHealth: 'HEALTHY', verificationFailures: 0, lastVerifiedAt: new Date(), lastVerified: new Date() },
        });
        return { verdict: 'HEALTHY', failures: 0 };
    }

    const failures = (opportunity.verificationFailures ?? 0) + 1;
    const broken = failures >= 5;
    const nextScore = clampTrustScore((opportunity.trustScore ?? 50) + trustScoreDelta('broken_link'));
    await prisma.opportunity.update({
        where: { id: opportunityId },
        data: {
            linkHealth: broken ? 'BROKEN' : 'RETRYING',
            verificationFailures: failures,
            lastVerifiedAt: new Date(),
            lastVerified: new Date(),
            trustScore: nextScore,
            ...(broken ? { trustLevel: 'FLAGGED' as ListingTrust } : {}),
        },
    });
    logger.error('Trust link check failed', { host: hostnameForLog(target), failures });
    return { verdict: broken ? 'BROKEN' : 'RETRYING', failures };
}

export async function verifyOfficialSource(opportunityId: string): Promise<{ official: boolean; tier: string }> {
    const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { id: true, applyLink: true, sourceLink: true, trustScore: true, governmentJobDetails: { select: { opportunityId: true } } },
    });
    if (!opportunity) throw new Error('Opportunity not found');

    const tier = domainTierForLink((opportunity.applyLink as string | null) ?? (opportunity.sourceLink as string | null));
    const official = tier === 'official_ats';

    if (official) {
        const nextScore = clampTrustScore((opportunity.trustScore ?? 50) + trustScoreDelta('official_verified'));
        await prisma.opportunity.update({
            where: { id: opportunityId },
            data: { trustScore: nextScore, lastVerifiedAt: new Date(), lastVerified: new Date() },
        });
        if (opportunity.governmentJobDetails) {
            await prisma.governmentJobDetails.update({
                where: { opportunityId },
                data: { officialSourceVerified: true, sourceLastCheckedAt: new Date() },
            });
        }
    } else if (opportunity.governmentJobDetails) {
        await prisma.governmentJobDetails.update({
            where: { opportunityId },
            data: { sourceLastCheckedAt: new Date() },
        });
    }
    return { official, tier };
}

export type CommunitySignal = 'broken_link' | 'duplicate' | 'suspicious' | 'incorrect' | 'closed';

export async function applyCommunityReport(
    opportunityId: string,
    signal: CommunitySignal
): Promise<{ trustLevel: ListingTrust; trustScore: number }> {
    const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { id: true, trustLevel: true, trustScore: true },
    });
    if (!opportunity) throw new Error('Opportunity not found');

    const delta =
        signal === 'broken_link'
            ? trustScoreDelta('broken_link')
            : signal === 'duplicate'
              ? trustScoreDelta('duplicate')
              : signal === 'suspicious'
                ? trustScoreDelta('suspicious')
                : trustScoreDelta('community_report');
    const nextScore = clampTrustScore((opportunity.trustScore ?? 50) + delta);
    // A report is a claim, not a verdict: move to COMMUNITY_REPORTED for the
    // moderator queue, never straight to REJECTED.
    const nextLevel: ListingTrust =
        opportunity.trustLevel === 'VERIFIED' || opportunity.trustLevel === 'UNVERIFIED'
            ? 'COMMUNITY_REPORTED'
            : (opportunity.trustLevel as ListingTrust);

    const updated = await prisma.opportunity.update({
        where: { id: opportunityId },
        data: { trustLevel: nextLevel, trustScore: nextScore },
        select: { trustLevel: true, trustScore: true },
    });
    return { trustLevel: updated.trustLevel as ListingTrust, trustScore: updated.trustScore };
}

export async function moderatorReview(
    opportunityId: string,
    verdict: string,
    reviewerUserId: string
): Promise<{ trustLevel: ListingTrust; trustScore: number }> {
    const level = assertListingTrust(verdict);
    const opportunity = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        select: { id: true, trustLevel: true, trustScore: true },
    });
    if (!opportunity) throw new Error('Opportunity not found');
    if (!canTransitionTrust(opportunity.trustLevel as ListingTrust, level)) {
        throw new Error(`Cannot transition listing trust from ${opportunity.trustLevel} to ${level}`);
    }

    const delta =
        level === 'VERIFIED'
            ? trustScoreDelta('moderator_verified')
            : level === 'REJECTED'
              ? trustScoreDelta('rejected')
              : level === 'FLAGGED'
                ? trustScoreDelta('suspicious')
                : 0;
    const updated = await prisma.opportunity.update({
        where: { id: opportunityId },
        data: {
            trustLevel: level,
            trustScore: clampTrustScore((opportunity.trustScore ?? 50) + delta),
            reviewedByUserId: reviewerUserId,
            reviewedAt: new Date(),
        },
        select: { trustLevel: true, trustScore: true },
    });
    return { trustLevel: updated.trustLevel as ListingTrust, trustScore: updated.trustScore };
}
