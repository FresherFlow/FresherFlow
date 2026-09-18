import { apiClient } from './apiClient';
import type {
    SavedSearch,
    SavedSearchFilters,
    ReferralRequestItem,
    ReferralRequestListResult,
    SalaryReportItem,
    SalaryReportListResult,
    ReferralRequestStatus,
    SalaryReportType,
} from '@fresherflow/types';

export interface CompanyHubResult {
    company: string;
    drives: Array<{
        id: string;
        slug: string;
        title: string;
        type: string;
        locations: string[];
        salaryRange: string | null;
        salaryMin: number | null;
        salaryMax: number | null;
        allowedPassoutYears: number[];
        postedAt: string;
        expiresAt: string | null;
        linkHealth: string;
    }>;
    driveCount: number;
    interviewExperiences: Array<{
        id: string;
        role: string;
        batch: number | null;
        difficulty: string | null;
        result: string | null;
        overallNotes: string | null;
        upvotes: number;
        createdAt: string;
        author: { id: string; fullName: string | null; username: string | null; avatarUrl: string | null };
    }>;
    experienceStats: { total: number; selected: number; rejected: number };
    salaryReports: Array<{
        id: string;
        role: string;
        ctcTotal: number | null;
        inHandMonthly: number | null;
        bondMonths: number | null;
        reportType: string;
        createdAt: string;
        author: { id: string; fullName: string | null; username: string | null; avatarUrl: string | null };
    }>;
    salaryStats: {
        count: number;
        avgTotal: number | null;
        minTotal: number | null;
        maxTotal: number | null;
    };
    trust: { openReferralRequests: number; reportCount: number };
}

export interface WalkInTodayItem {
    id: string;
    slug: string;
    title: string;
    company: string;
    companyLogoUrl: string | null;
    locations: string[];
    salaryRange: string | null;
    applyLink: string | null;
    allowedPassoutYears: number[];
    postedAt: string;
    expiresAt: string | null;
    walkIn: {
        dates: string[];
        dateRange?: string | null;
        timeRange?: string | null;
        venueAddress: string;
        venueLink?: string | null;
        city?: string | null;
        clusterName?: string | null;
        reportingTime?: string | null;
        requiredDocuments: string[];
        landmark?: string | null;
    } | null;
}

export interface WalkInsTodayResult {
    today: WalkInTodayItem[];
    tomorrow: WalkInTodayItem[];
    upcoming: WalkInTodayItem[];
    undated: WalkInTodayItem[];
    total: number;
    updatedAt: string;
}

export const fresherNeedsApi = {
    // ------------------------------------------------------------------
    // Walk-ins today
    // ------------------------------------------------------------------
    listWalkInsToday: (params?: { city?: string; batch?: number; limit?: number }) => {
        const qs = new URLSearchParams();
        if (params?.city) qs.set('city', params.city);
        if (params?.batch) qs.set('batch', String(params.batch));
        if (params?.limit) qs.set('limit', String(params.limit));
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return apiClient<WalkInsTodayResult>(`/api/walk-ins-today${suffix}`);
    },

    // ------------------------------------------------------------------
    // Saved searches
    // ------------------------------------------------------------------
    listSavedSearches: () => apiClient<{ searches: SavedSearch[] }>('/api/saved-searches'),

    createSavedSearch: (data: { name: string; filters: SavedSearchFilters; alertEnabled?: boolean }) =>
        apiClient<{ search: SavedSearch }>('/api/saved-searches', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateSavedSearch: (id: string, data: { name?: string; alertEnabled?: boolean }) =>
        apiClient<{ search: SavedSearch }>(`/api/saved-searches/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    deleteSavedSearch: (id: string) =>
        apiClient<{ success: boolean }>(`/api/saved-searches/${encodeURIComponent(id)}`, {
            method: 'DELETE',
        }),

    // ------------------------------------------------------------------
    // Referral request board
    // ------------------------------------------------------------------
    listReferralRequests: (params?: { page?: number; limit?: number; company?: string; status?: 'OPEN' | 'FULFILLED' | 'CLOSED' }) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        if (params?.company) qs.set('company', params.company);
        if (params?.status) qs.set('status', params.status);
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return apiClient<ReferralRequestListResult>(`/api/referral-requests${suffix}`);
    },

    createReferralRequest: (data: { company: string; role?: string; batch?: number; city?: string; note?: string }) =>
        apiClient<{ request: ReferralRequestItem }>('/api/referral-requests', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateReferralRequestStatus: (id: string, status: ReferralRequestStatus) =>
        apiClient<{ request: ReferralRequestItem }>(`/api/referral-requests/${encodeURIComponent(id)}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),

    respondToReferralRequest: (id: string, data: { message?: string; contactHandle?: string }) =>
        apiClient<{ response: unknown }>(`/api/referral-requests/${encodeURIComponent(id)}/respond`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    deleteReferralResponse: (id: string) =>
        apiClient<{ success: boolean }>(`/api/referral-requests/${encodeURIComponent(id)}/respond`, {
            method: 'DELETE',
        }),

    // ------------------------------------------------------------------
    // Salary reports
    // ------------------------------------------------------------------
    listSalaryReports: (params?: { page?: number; limit?: number; company?: string; role?: string; city?: string; batch?: number }) => {
        const qs = new URLSearchParams();
        if (params?.page) qs.set('page', String(params.page));
        if (params?.limit) qs.set('limit', String(params.limit));
        if (params?.company) qs.set('company', params.company);
        if (params?.role) qs.set('role', params.role);
        if (params?.city) qs.set('city', params.city);
        if (params?.batch) qs.set('batch', String(params.batch));
        const suffix = qs.toString() ? `?${qs.toString()}` : '';
        return apiClient<SalaryReportListResult>(`/api/salary-reports${suffix}`);
    },

    createSalaryReport: (data: {
        opportunityId?: string;
        company: string;
        role: string;
        batch?: number;
        city?: string;
        reportType?: SalaryReportType;
        ctcFixed?: number;
        ctcVariable?: number;
        ctcTotal?: number;
        inHandMonthly?: number;
        joinBonus?: number;
        bondMonths?: number;
        notes?: string;
    }) =>
        apiClient<{ report: SalaryReportItem }>('/api/salary-reports', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    markSalaryReportHelpful: (id: string) =>
        apiClient<{ marked: boolean; helpfulCount: number }>(`/api/salary-reports/${encodeURIComponent(id)}/helpful`, {
            method: 'POST',
        }),

    // ------------------------------------------------------------------
    // Company hub
    // ------------------------------------------------------------------
    companyHub: (name: string) =>
        apiClient<CompanyHubResult>(`/api/companies/${encodeURIComponent(name)}/hub`),
};
