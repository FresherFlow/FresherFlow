import { useMemo } from 'react';
import { type Opportunity } from '@fresherflow/types';
import { parseOpportunityLocation, getOpportunityDisplaySalary, normalizeSalaryInput } from '@/lib/opportunityDisplay';
import { getDriveDates, getDriveMetadata, isCampusDriveOpportunity } from '@/shared/utils/driveTimeline';
import {
    buildEligibilitySnapshot,
    formatDeadline,
    getEducationDetails,
    getListingState,
    isClosingSoon,
    isExpired,
    sortTimelineEvents,
} from './detailUtils';
import {
    buildLoginFromDetailHref,
    getCurrentActionType,
    getTrackerOptions,
} from './detailInteractionUtils';

export function useOpportunityDerivedState(opp: Opportunity, profile: any, searchParams: URLSearchParams) {
    return useMemo(() => {
        const hasApplyLink = Boolean(opp.applyLink || opp.companyWebsite);
        const isWalkinFlow = opp.type === 'WALKIN';
        const currentAction = getCurrentActionType(opp);
        const trackerOptions = getTrackerOptions(isWalkinFlow);
        const timelineEvents = sortTimelineEvents(opp.events || []);
        const upcomingTimelineEvents = timelineEvents.filter((event) => event._dt.getTime() >= Date.now());
        const isCampusDrive = isCampusDriveOpportunity(opp);
        const driveDates = getDriveDates(opp);
        const driveMeta = getDriveMetadata(opp);
        const locationInfo = parseOpportunityLocation(opp.locations);
        const displaySalary = isCampusDrive ? normalizeSalaryInput(driveMeta.maxCtcLabel) : getOpportunityDisplaySalary(opp);
        const listingState = getListingState(opp);
        const eligibilitySnapshot = buildEligibilitySnapshot(opp, profile);
        const educationDetails = getEducationDetails(
            opp.allowedDegrees || [],
            opp.allowedCourses || [],
            (opp as any).allowedSpecializations || []
        );
        const loginFromDetailHref = buildLoginFromDetailHref(
            `/opportunities/${opp.id}`,
            searchParams.get('source'),
            searchParams.get('ref')
        );

        const driveDateItems = [
            { label: 'Reg starts', date: driveDates.regStart },
            { label: 'Last date', date: driveDates.regEnd },
            { label: 'Test', date: driveDates.examDate },
        ].filter((item) => item.date);

        return {
            hasApplyLink,
            isWalkinFlow,
            currentAction,
            trackerOptions,
            timelineEvents,
            upcomingTimelineEvents,
            isCampusDrive,
            driveDates,
            driveMeta,
            locationInfo,
            displaySalary,
            listingState,
            eligibilitySnapshot,
            educationDetails,
            loginFromDetailHref,
            driveDateItems,
            formatDeadline,
            isExpired,
            isClosingSoon
        };
    }, [opp, profile, searchParams]);
}
