import { Opportunity } from '@fresherflow/types';

export interface DriveSalaryRow {
    cadre: 'Prime' | 'Digital' | string;
    experience: string;
    ug: string;
    pg: string;
}

export interface DriveMetadata {
    maxCtcLabel: string;
    badges: string[];
    isTcsNqt: boolean;
    overviewPoints: string[];
    salaryRows: DriveSalaryRow[];
    salaryNote: string;
    selectionSteps: string[];
    applySteps: string[];
}

/**
 * Determines if an opportunity is part of a large campus hiring drive.
 * Inspects keywords and timeline event presence.
 */
export function isCampusDriveOpportunity(opportunity: Partial<Opportunity>): boolean {
    const title = (opportunity.title || "").toLowerCase();
    const hasKeyword = title.includes("nqt") || title.includes("campus drive") || title.includes("off campus");
    const hasTimelineEvents = (opportunity.events || []).some((event) =>
        ["REG_START", "REG_END", "EXAM_DATE"].includes(event.eventType)
    );
    return hasKeyword || hasTimelineEvents;
}

/**
 * Extracts key dates for a drive from its timeline events.
 */
export function getDriveDates(opportunity: Partial<Opportunity>) {
    const events = opportunity.events || [];
    
    const findDate = (type: string) => {
        const event = events.find(e => e.eventType === type);
        return event ? new Date(event.eventDate) : null;
    };

    return {
        regStart: findDate("REG_START"),
        regEnd: findDate("REG_END"),
        examDate: findDate("EXAM_DATE"),
    };
}

/**
 * Extracts metadata for a drive, including salary labels and badges.
 */
export function getDriveMetadata(opportunity: Partial<Opportunity>): DriveMetadata {
    const title = (opportunity.title || "").toLowerCase();
    const company = (opportunity.company || "").toLowerCase();
    
    const baseMeta: DriveMetadata = {
        maxCtcLabel: (opportunity as unknown as Record<string, string>).maxCtcLabel || (opportunity as unknown as Record<string, string>).salaryRange || "",
        badges: [],
        isTcsNqt: false,
        overviewPoints: [],
        salaryRows: [],
        salaryNote: "",
        selectionSteps: [],
        applySteps: []
    };

    if (title.includes("nqt") && (company.includes("tata") || company.includes("tcs"))) {
        return {
            ...baseMeta,
            maxCtcLabel: "7-12 LPA",
            badges: ["Mass Hiring", "Global Drive"],
            isTcsNqt: true,
            overviewPoints: [
                "Open for both UG and PG candidates",
                "Two distinct cadres: Prime and Digital",
                "Pan-India locations available"
            ],
            salaryRows: [
                { cadre: 'Prime', experience: 'Freshers', ug: '9.0', pg: '11.5' },
                { cadre: 'Digital', experience: 'Freshers', ug: '7.0', pg: '7.0' }
            ],
            salaryNote: "Salary is subject to profile and performance in the exam and interview.",
            selectionSteps: ["Online Test", "Technical Interview", "HR Interview"],
            applySteps: ["Register on TCS NextStep portal", "Apply for Drive", "Attend Exam"]
        };
    }

    return baseMeta;
}
