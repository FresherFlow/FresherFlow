"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCampusDriveOpportunity = isCampusDriveOpportunity;
exports.getDriveDates = getDriveDates;
exports.getDriveMetadata = getDriveMetadata;
/**
 * Determines if an opportunity is part of a large campus hiring drive.
 * Inspects keywords and timeline event presence.
 */
function isCampusDriveOpportunity(opportunity) {
    const title = (opportunity.title || "").toLowerCase();
    const hasKeyword = title.includes("nqt") || title.includes("campus drive") || title.includes("off campus");
    const hasTimelineEvents = (opportunity.events || []).some((event) => ["REG_START", "REG_END", "EXAM_DATE"].includes(event.eventType));
    return hasKeyword || hasTimelineEvents;
}
/**
 * Extracts key dates for a drive from its timeline events.
 */
function getDriveDates(opportunity) {
    const events = opportunity.events || [];
    const findDate = (type) => {
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
function getDriveMetadata(opportunity) {
    const title = (opportunity.title || "").toLowerCase();
    const company = (opportunity.company || "").toLowerCase();
    const baseMeta = {
        maxCtcLabel: opportunity.maxCtcLabel || opportunity.salaryRange || "",
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
