import { Opportunity } from '@fresherflow/types';

export const CLOSING_SOON_WINDOW_HOURS = Number(process.env.CLOSING_SOON_WINDOW_HOURS || 48);

export type TzParts = { dateKey: string; hour: number };

export function getTimezoneParts(date: Date, timezone: string): TzParts {
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

export function buildOpportunityUrl(frontendUrl: string, slug: string) {
    return `${frontendUrl.replace(/\/$/, '')}/opportunities/${slug}`;
}

export function getClosingSoonHours(opportunity: Opportunity, now: Date): number | null {
    if (opportunity.type === 'WALKIN') {
        const dates = (opportunity.walkInDetails?.dates ?? []) as Array<string | Date>;
        if (dates.length === 0) return null;
        const lastDate = new Date(Math.max(...dates.map((d: string | Date) => new Date(d).getTime())));
        lastDate.setUTCHours(23, 59, 59, 999);
        const diffHours = (lastDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours > 0 && diffHours <= CLOSING_SOON_WINDOW_HOURS ? diffHours : null;
    }

    if (!opportunity.expiresAt) return null;
    const diffHours = (new Date(opportunity.expiresAt).getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours > 0 && diffHours <= CLOSING_SOON_WINDOW_HOURS ? diffHours : null;
}

export function formatExpiresText(hoursLeft: number): string {
    return hoursLeft <= 24
        ? `Expires in ${Math.max(1, Math.round(hoursLeft))} hours`
        : `Expires in ${Math.ceil(hoursLeft / 24)} days`;
}
