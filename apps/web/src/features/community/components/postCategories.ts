import { CommunityPostCategory } from '@fresherflow/types';

export const CATEGORY_LABELS: Record<string, string> = {
    [CommunityPostCategory.DISCUSSION]: 'Discussion',
    [CommunityPostCategory.QUESTION]: 'Questions',
    [CommunityPostCategory.EXPERIENCE]: 'Experiences',
    [CommunityPostCategory.INTERVIEW_EXPERIENCE]: 'Interviews',
    [CommunityPostCategory.HIRING_UPDATE]: 'Hiring Updates',
    [CommunityPostCategory.REFERRAL]: 'Referrals',
    [CommunityPostCategory.UPDATE]: 'Updates',
    [CommunityPostCategory.OTHER]: 'Other',
};

export const CATEGORIES: { value: CommunityPostCategory; label: string }[] = Object.entries(
    CATEGORY_LABELS
).map(([value, label]) => ({ value: value as CommunityPostCategory, label }));
