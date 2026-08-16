export type PlatformCategory =
    | 'Websites'
    | 'Repositories'
    | 'Tools'
    | 'Startups'
    | 'Research'
    | 'Government';

export interface InternshipPlatform {
    name: string;
    url: string;
    companyLogoUrl?: string;
    description: string;
    tags: string[];
    /** e.g. "Internship platform", "Job board", "Coding practice" */
    type: string;
    /** e.g. "Jul 22, 2026" */
    updated: string;
    category: PlatformCategory;
    isRecommended: boolean;
}

export interface InternshipPlatformsData {
    meta: {
        source: string;
        extractedAt: string;
        count: number;
    };
    resources: InternshipPlatform[];
}
