/** One row of the /companies directory: a company plus its live role count. */
export interface CompanyDirectoryItem {
    name: string;
    slug: string;
    count: number;
    logoUrl?: string | null;
    website?: string | null;
    /** Live roles per ATS source, busiest first — drives the directory's source line. */
    sources?: Array<{ name: string; roles: number }>;
    atsProvider?: string | null;
    companyStage?: string | null;
    companySize?: string | null;
    companyIndustry?: string[];
    companyTopics?: string[];
}

/** What the followed-companies list needs per slug: real name, logo and live role count. */
export interface CompanyFollowSummary {
    name: string;
    logoUrl?: string | null;
    website?: string | null;
    count: number;
}

/** A companies.json entry — used to canonicalise slugs and enrich logos/websites. */
export interface CompanyDirectoryMeta {
    name: string;
    slug?: string;
    url?: string | null;
    logo_url?: string | null;
}
