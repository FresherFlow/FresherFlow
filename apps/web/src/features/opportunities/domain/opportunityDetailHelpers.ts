import type { Opportunity } from '@fresherflow/types';
import { ActionType } from '@fresherflow/types';
import { buildShareUrl } from '@/lib/utils/share';

export type TimelineEventView = NonNullable<Opportunity['events']>[number] & { _dt: Date };

export function sortTimelineEvents(events: NonNullable<Opportunity['events']> = []): TimelineEventView[] {
  return events
    .map((event) => ({ ...event, _dt: new Date(event.eventDate) }))
    .filter((event) => !Number.isNaN(event._dt.getTime()))
    .sort((a, b) => a._dt.getTime() - b._dt.getTime());
}

export function isExpired(opp: Opportunity) {
  return Boolean(opp.expiresAt && new Date(opp.expiresAt).getTime() < Date.now());
}

export function isClosingSoon(opp: Opportunity) {
  if (!opp.expiresAt || isExpired(opp)) return false;
  return new Date(opp.expiresAt).getTime() <= Date.now() + 3 * 24 * 60 * 60 * 1000;
}

export function formatDeadline(value?: string | Date | null) {
  if (!value) return 'No deadline';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No deadline';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function getListingState(opp: Opportunity) {
  if (isExpired(opp)) return 'expired';
  if (isClosingSoon(opp)) return 'closing-soon';
  return 'active';
}

export function buildEligibilitySnapshot(opp: Opportunity) {
  return {
    years: opp.allowedPassoutYears || [],
    degrees: opp.allowedDegrees || [],
    courses: opp.allowedCourses || [],
    skills: opp.requiredSkills || [],
  };
}

export function getEducationDetails(degrees: string[], courses: string[], specializations: string[]) {
  return { degrees, courses, specializations };
}

export function getCurrentActionType(opp: Opportunity) {
  return opp.actions?.[0]?.actionType || null;
}

export function getTrackerOptions(isWalkinFlow: boolean) {
  return isWalkinFlow
    ? [
        { key: ActionType.PLANNED, label: 'Planned' },
        { key: ActionType.ATTENDED, label: 'Attended' },
      ]
    : [
        { key: ActionType.VIEWED, label: 'Viewed' },
        { key: ActionType.APPLIED, label: 'Applied' },
        { key: ActionType.INTERVIEWED, label: 'Interviewed' },
      ];
}

export function buildLoginFromDetailHref(path: string, source?: string | null, ref?: string | null) {
  const params = new URLSearchParams();
  params.set('redirect', path);
  if (source) params.set('source', source);
  if (ref) params.set('ref', ref);
  return `/app?${params.toString()}`;
}

export function getDetailShareUrl(rawUrl: string) {
  return buildShareUrl(rawUrl, { platform: 'other', source: 'opportunity_detail', campaign: 'opportunity_share', ref: 'share' });
}

export function getRelatedOpportunities(opp: Opportunity, all: Opportunity[]) {
  const skills = new Set((opp.requiredSkills || []).map((skill) => skill.toLowerCase()));
  return all
    .filter((item) => item.id !== opp.id)
    .map((item) => ({
      item,
      score:
        (item.company === opp.company ? 3 : 0) +
        ((item.requiredSkills || []).filter((skill) => skills.has(skill.toLowerCase())).length),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ item }) => item);
}

export function formatLpaValue(value: string) {
  return `${value} LPA`;
}

export function formatTimeText12Hour(value?: string | null) {
  if (!value) return 'Not specified';
  return value;
}
