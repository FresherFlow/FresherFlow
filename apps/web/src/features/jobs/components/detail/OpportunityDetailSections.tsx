'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import type { Opportunity } from '@fresherflow/types';
import { ExpiredWarning } from '@/features/jobs/components/detail/ExpiredWarning';
import { DetailCampusDriveInfo } from '@/features/jobs/components/detail/DetailCampusDriveInfo';
import { getDriveDetails, isWalkinOpportunity } from '@/features/jobs/utils/walkinMapUtils';

/**
 * The detail view's *conditional* sections, in one place.
 *
 * `OpportunityDetailClient` (`/jobs/[slug]`) and `OpportunityDetailPane` (the
 * split view) render the same sections under the same conditions, but each had
 * its own copy of every condition — including the double `getDriveDetails` call
 * and the `walkInDetails` cast. The conditions are rules; the *order* is a
 * layout choice and stays per surface, so this module exports each section
 * self-gating rather than one pre-composed stack.
 *
 * These two are below the fold on every surface that renders them, and the
 * detail page code-split them before this module existed — `dynamic` keeps that
 * instead of pulling them into the page chunk for the pane's benefit.
 */
const WalkInDetailsCard = dynamic(() =>
    import('@/features/jobs/components/detail/WalkInDetailsCard').then((m) => m.WalkInDetailsCard)
);
const ComplexityCard = dynamic(() =>
    import('@/features/jobs/components/detail/ComplexityCard').then((m) => m.ComplexityCard)
);

/** The expired-listing warning, shown only for a listing that has passed its deadline. */
export function ExpiredWarningIfAny({
    opp,
    isExpired,
}: {
    opp: Opportunity;
    isExpired: (opportunity: Opportunity) => boolean;
}) {
    if (!opp.expiresAt || !isExpired(opp)) return null;
    return <ExpiredWarning opportunityId={opp.id} opportunityTitle={opp.title} />;
}

/** The application-complexity card, for listings whose application is a form. */
export function FormComplexityCard({ opp }: { opp: Opportunity }) {
    const applicationDetails = opp.applicationDetails;
    if (applicationDetails?.method !== 'FORM') return null;
    return <ComplexityCard applicationDetails={applicationDetails} />;
}

/** The walk-in venue card, for a drive that declares where it is held. */
export function WalkInDetailsCardIfAny({ opp }: { opp: Opportunity }) {
    const driveDetails = isWalkinOpportunity(opp) ? getDriveDetails(opp) : null;
    if (!driveDetails) return null;
    return (
        <WalkInDetailsCard
            walkInDetails={driveDetails as NonNullable<Opportunity['walkInDetails']>}
        />
    );
}

type CampusDriveInfoProps = ComponentProps<typeof DetailCampusDriveInfo>;

/** Campus-drive facts, for a listing the campus-drive detector matched. */
export function CampusDriveInfoIfCampus({
    isCampusDrive,
    ...props
}: CampusDriveInfoProps & { isCampusDrive: boolean }) {
    if (!isCampusDrive) return null;
    return <DetailCampusDriveInfo {...props} />;
}
