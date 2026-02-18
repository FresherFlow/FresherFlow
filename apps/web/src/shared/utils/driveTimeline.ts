import { Opportunity, OpportunityEventType } from '@fresherflow/types';

type DriveDates = {
    regStart: Date | null;
    regEnd: Date | null;
    examDate: Date | null;
};

export type DriveSalaryRow = {
    cadre: 'Prime' | 'Digital';
    experience: '0-1 yr' | '1-2 yr';
    ug: string;
    pg: string;
};

export type DriveMetadata = {
    isTcsNqt: boolean;
    badges: string[];
    maxCtcLabel: string;
    overviewPoints: string[];
    selectionSteps: string[];
    applySteps: string[];
    salaryRows: DriveSalaryRow[];
    salaryNote: string;
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

export function getDriveMetadata(opportunity: Opportunity): DriveMetadata {
    const title = (opportunity.title || '').toLowerCase();
    const company = (opportunity.company || '').toLowerCase();
    const isTcsNqt = title.includes('nqt') && company.includes('tata');

    if (isTcsNqt) {
        return {
            isTcsNqt: true,
            badges: ['Hiring Drive', 'Campus 2024-2026', '0-2 Yrs', 'Prime + Digital'],
            maxCtcLabel: 'Up to 12.26 LPA',
            overviewPoints: [
                'Batch: 2024, 2025, 2026',
                'Prime and Digital cadre hiring',
                'National-level assessment process',
            ],
            selectionSteps: ['NQT Test', 'Shortlisting', 'Interview', 'Offer'],
            applySteps: [
                'Register/Login on TCS NextStep',
                'Apply for the drive',
                'Choose test center and job city preferences',
            ],
            salaryRows: [
                { cadre: 'Prime', experience: '0-1 yr', ug: '9.09-9.30', pg: '11.59-11.80' },
                { cadre: 'Prime', experience: '1-2 yr', ug: '9.45-9.66', pg: '12.05-12.26' },
                { cadre: 'Digital', experience: '0-1 yr', ug: '7.09-7.30', pg: '7.39-7.60' },
                { cadre: 'Digital', experience: '1-2 yr', ug: '7.50-7.72', pg: '7.82-8.04' },
            ],
            salaryNote: 'Final CTC depends on experience and job location.',
        };
    }

    return {
        isTcsNqt: false,
        badges: ['Hiring Drive'],
        maxCtcLabel: 'Not disclosed',
        overviewPoints: [],
        selectionSteps: [],
        applySteps: [],
        salaryRows: [],
        salaryNote: '',
    };
}
