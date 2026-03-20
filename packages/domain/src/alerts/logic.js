"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLOSING_SOON_WINDOW_HOURS = void 0;
exports.getTimezoneParts = getTimezoneParts;
exports.buildOpportunityUrl = buildOpportunityUrl;
exports.getClosingSoonHours = getClosingSoonHours;
exports.formatExpiresText = formatExpiresText;
exports.CLOSING_SOON_WINDOW_HOURS = 48;
function getTimezoneParts(date, timezone) {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return {
        dateKey: `${map.year}-${map.month}-${map.day}`,
        hour: Number(map.hour ?? 0),
    };
}
function buildOpportunityUrl(frontendUrl, slug) {
    return `${frontendUrl.replace(/\/$/, '')}/opportunities/${slug}`;
}
function getClosingSoonHours(opportunity, now) {
    if (opportunity.type === 'WALKIN') {
        const dates = (opportunity.walkInDetails?.dates ?? []);
        if (dates.length === 0)
            return null;
        const lastDate = new Date(Math.max(...dates.map((d) => new Date(d).getTime())));
        lastDate.setUTCHours(23, 59, 59, 999);
        const diffHours = (lastDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours > 0 && diffHours <= exports.CLOSING_SOON_WINDOW_HOURS ? diffHours : null;
    }
    if (!opportunity.expiresAt)
        return null;
    const diffHours = (new Date(opportunity.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= exports.CLOSING_SOON_WINDOW_HOURS ? diffHours : null;
}
function formatExpiresText(hoursLeft) {
    return hoursLeft <= 24
        ? `Expires in ${Math.max(1, Math.round(hoursLeft))} hours`
        : `Expires in ${Math.ceil(hoursLeft / 24)} days`;
}
