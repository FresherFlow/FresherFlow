import { Opportunity, OpportunityEventType } from '@fresherflow/types';

type DriveDates = {
    regStart: Date | null;
    regEnd: Date | null;
    examDate: Date | null;
};

function toDate(value?: Date | string | null): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function pickEarliestEventDate(opportunity: Opportunity, type: OpportunityEventType): Date | null {
    const events = opportunity.events || [];
    const matchingDates = events
        .filter((event) => event.eventType === type)
        .map((event) => toDate(event.eventDate))
        .filter((date): date is Date => date instanceof Date);

    if (matchingDates.length === 0) return null;

    return matchingDates.sort((a, b) => a.getTime() - b.getTime())[0];
}

export function getDriveDates(opportunity: Opportunity): DriveDates {
    return {
        regStart: pickEarliestEventDate(opportunity, OpportunityEventType.REG_START),
        regEnd: pickEarliestEventDate(opportunity, OpportunityEventType.REG_END),
        examDate: pickEarliestEventDate(opportunity, OpportunityEventType.EXAM_DATE),
    };
}

export function isCampusDriveOpportunity(opportunity: Opportunity): boolean {
    const title = (opportunity.title || '').toLowerCase();
    const hasDriveKeyword = title.includes('nqt') || title.includes('campus drive');
    const hasDriveEvents = (opportunity.events || []).some((event) =>
        event.eventType === OpportunityEventType.REG_START ||
        event.eventType === OpportunityEventType.REG_END ||
        event.eventType === OpportunityEventType.EXAM_DATE
    );

    return hasDriveKeyword || hasDriveEvents;
}

