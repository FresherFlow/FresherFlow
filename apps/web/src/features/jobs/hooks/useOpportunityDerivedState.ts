import { useEffect, useMemo, useState } from 'react';
import { type Opportunity } from '@fresherflow/types';
import { parseOpportunityLocation, getOpportunityDisplaySalary, normalizeSalaryInput } from '@/features/jobs/domain/opportunityDisplay';
import { getDriveDates, getDriveMetadata, isCampusDriveOpportunity } from '@/features/jobs/domain/driveTimeline';
import {
    formatDeadline,
    getEducationDetails,
    getListingState,
    isClosingSoon,
    isExpired,
    sortTimelineEvents,
} from '@/features/jobs/utils/detailUtils';
import { getCurrentActionType, getTrackerOptions } from '@fresherflow/utils';
import { isWalkinOpportunity } from '@/features/jobs/utils/walkinMapUtils';

/**
 * How often the wall clock is re-read. Deadlines are day-granular, so minute
 * resolution is finer than any visible difference and cheap.
 */
const CLOCK_TICK_MS = 60_000;

export function useOpportunityDerivedState(opp: Opportunity | null) {
    /**
     * A live wall clock, not `useState(() => Date.now())`.
     *
     * A `useState` initializer runs once, so `now` froze at mount and
     * `upcomingTimelineEvents` never aged: a pane left open across a deadline
     * kept counting a finished event as upcoming forever. Reading `Date.now()`
     * inside the `useMemo` instead would be an impure render read — it
     * disagrees with itself under StrictMode's double-render and is what
     * `react-hooks/purity` flags.
     *
     * The interval is the only impure part and it is a plain effect with a
     * matching cleanup, so `now` changes at most once a minute.
     */
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
        return () => clearInterval(timer);
    }, []);

    return useMemo(() => {
        if (!opp) {
            return {
                hasApplyLink: false,
                isWalkinFlow: false,
                currentAction: null,
                trackerOptions: [],
                timelineEvents: [],
                upcomingTimelineEvents: [],
                isCampusDrive: false,
                driveDates: { regStart: null, regEnd: null, examDate: null },
                driveMeta: {
                    isTcsNqt: false,
                    badges: [],
                    maxCtcLabel: '',
                    overviewPoints: [],
                    selectionSteps: [],
                    applySteps: [],
                    salaryRows: [],
                    salaryNote: ''
                },
                locationInfo: { shortLabel: '', fullLabel: '', city: '', state: '' },
                displaySalary: '',
                listingState: 'INACTIVE',
                educationDetails: { level: 'Any Graduate', courses: null, specializations: null },
                driveDateItems: [],
                formatDeadline: () => '',
                isExpired: () => false,
                isClosingSoon: () => false
            };
        }

        const hasApplyLink = Boolean(opp.applyLink || opp.companyWebsite);
        const isWalkinFlow = isWalkinOpportunity(opp);
        const currentAction = getCurrentActionType(opp);
        const trackerOptions = getTrackerOptions(isWalkinFlow);
        const timelineEvents = sortTimelineEvents(opp.events || []);
        const upcomingTimelineEvents = timelineEvents.filter((event) => event._dt.getTime() >= now);
        const isCampusDrive = isCampusDriveOpportunity(opp);
        const driveDates = getDriveDates(opp);
        const driveMeta = getDriveMetadata(opp);
        const locationInfo = parseOpportunityLocation(opp.locations);
        const displaySalary = isCampusDrive ? normalizeSalaryInput(driveMeta.maxCtcLabel) : getOpportunityDisplaySalary(opp);
        const listingState = getListingState(opp);
        const educationDetails = getEducationDetails(
            opp.allowedDegrees || [],
            opp.allowedCourses || [],
            opp.allowedSpecializations || []
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
            educationDetails,
            driveDateItems,
            formatDeadline,
            isExpired,
            isClosingSoon
        };
    }, [opp, now]);
}
