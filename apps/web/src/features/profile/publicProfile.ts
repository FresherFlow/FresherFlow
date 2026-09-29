/**
 * Non-UI code for the public profile page.
 *
 * The page component renders; this module holds the shape it renders, the labels it maps to,
 * and the URLs it links out to. Keeping them here means the preview and the live page can both
 * import the same definitions without importing a React component.
 */

export interface PublicProfile {
    userId: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    memberSince?: string;
    headline: string | null;
    about: string | null;
    degree: string | null;
    specialization: string | null;
    gradYear: number | null;
    collegeName: string | null;
    educationLevel: string | null;
    skills: string[];
    availability: string | null;
    preferredCities: string[];
    workModes: string[];
    /**
     * Owner-preview only. The public endpoint stopped serving these two when the page
     * became minimal: a downloadable resume and a CTC number are exactly the fields
     * scrapers harvest, and neither survives a "do not crawl" request.
     */
    expectedCtc: number | null;
    resumeUrl: string | null;
    willingToRelocate: boolean | null;
    openToRecruiters: boolean;
    /** Last boost stamp. Present only while the boost window is open — a freshness signal,
     *  not a lifetime: the page itself stays online either way. */
    lastActivatedAt?: string | null;
    completionPercentage?: number;
    projects: Array<{
        id: string;
        title: string;
        description: string | null;
        githubUrl: string | null;
        liveUrl: string | null;
        skills: string[];
    }>;
}

/** The database enum stored on the profile, in the words a visitor reads. */
export const AVAILABILITY_LABEL: Record<string, string> = {
    IMMEDIATE: 'Actively looking',
    DAYS_15: 'Open to offers',
    MONTH_1: 'Open to offers',
};

const PUBLIC_PROFILE_HOST = 'fresherflow.in';

/**
 * The page's canonical URL.
 *
 * Prefers the address the visitor is actually on so a preview served from a non-production
 * host does not advertise a link that does not resolve to it yet.
 */
export function resolveProfileUrl(username: string | null | undefined): string {
    if (typeof window !== 'undefined') return window.location.href;
    return `https://${PUBLIC_PROFILE_HOST}/u/${username ?? ''}`;
}

/** Pre-filled share copy. Generated once so every share channel says the same thing. */
export function buildShareText(profileUrl: string): string {
    return `Made my fresher profile — ${profileUrl.replace('https://', '')}. 2 minutes, make yours.`;
}

export function whatsappShareHref(shareText: string): string {
    return `https://wa.me/?text=${encodeURIComponent(shareText)}`;
}

export function linkedinShareHref(profileUrl: string): string {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;
}

export interface IntroForm {
    name: string;
    company: string;
    email: string;
    phone: string;
    message: string;
}

export const EMPTY_INTRO_FORM: IntroForm = {
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
};

/**
 * Validation rules for the intro request.
 *
 * Returned as a message rather than thrown so the caller decides how to surface it, and stated
 * once here rather than inline in the submit handler.
 */
export function validateIntroRequest(form: IntroForm, isRecruiter: boolean): string | null {
    if (!isRecruiter) return 'Please confirm you are contacting about a role.';
    if (!form.name.trim()) return 'Please add your name and an email or phone number.';
    if (!form.email.trim() && !form.phone.trim()) return 'Please add your name and an email or phone number.';
    return null;
}
