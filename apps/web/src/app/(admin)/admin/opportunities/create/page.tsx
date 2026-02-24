'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdmin } from '@/contexts/AdminContext';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { adminApi } from '@/lib/api/admin';
import { Opportunity } from '@fresherflow/types';
import toast from 'react-hot-toast';

interface ParsedJob {
    title?: string;
    company?: string;
    companyWebsite?: string;
    type?: string;
    locations?: string[];
    skills?: string[];
    requiredSkills?: string[];
    experienceMin?: number | string;
    experienceMax?: number | string;
    salaryRange?: string;
    salaryMin?: number;
    salaryMax?: number;
    salaryPeriod?: string;
    jobFunction?: string;
    employmentType?: string;
    incentives?: string;
    selectionProcess?: string;
    notesHighlights?: string;
    allowedDegrees?: string[];
    allowedCourses?: string[];
    allowedSpecializations?: string[];
    allowedPassoutYears?: number[];
    applyLink?: string;
    expiresAt?: string;
    venueAddress?: string;
    venueLink?: string;
    dateRange?: string;
    timeRange?: string;
    requiredDocuments?: string[];
    contactPerson?: string;
    contactPhone?: string;
    description?: string;
}

type DuplicateOpportunity = {
    id: string;
    title: string;
    company: string;
    applyLink?: string;
    status: string;
    updatedAt: string;
};

type TimelineEvent = {
    id: string;
    opportunityId: string;
    eventType: 'NOTIFICATION' | 'REG_START' | 'REG_END' | 'EXAM_DATE' | 'RESULT' | 'INTERVIEW' | 'DOC_VERIFICATION' | 'OTHER';
    eventDate: string;
    title: string;
    notes?: string | null;
    sourceLink?: string | null;
};
import { buildOpportunityPayload } from '../opportunityPayload';
import { INTERNSHIP_TEMPLATE, JOB_TEMPLATE, WALKIN_TEMPLATE } from '@/features/admin/opportunities/jsonTemplates';
import { buildShareUrl, type SharePlatform } from '@/lib/share';
import { getOpportunityPath } from '@/lib/opportunityPath';
import {
    ArrowLeftIcon,
    InformationCircleIcon,
    BoltIcon,
    BriefcaseIcon,
    AcademicCapIcon,
    MapPinIcon,
    LinkIcon,
    PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import {
    ALL_COURSE_OPTIONS,
    ALL_SPECIALIZATION_OPTIONS,
    normalizeCourseName,
    normalizeSpecializationName
} from '@/lib/profileConstants';

type OpportunityFormPageProps = {
    mode?: 'create' | 'edit';
    opportunityId?: string;
};

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const tokenSet = (value: string) => new Set(normalizeKey(value).split(' ').filter(Boolean));
const overlapRatio = (a: Set<string>, b: Set<string>) => {
    if (a.size === 0 || b.size === 0) return 0;
    let matches = 0;
    for (const token of a) {
        if (b.has(token)) matches += 1;
    }
    return matches / Math.max(a.size, b.size);
};
const extractDomain = (value?: string | null) => {
    if (!value) return '';
    try {
        return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return '';
    }
};

export function OpportunityFormPage({ mode = 'create', opportunityId }: OpportunityFormPageProps) {
    const { isAuthenticated } = useAdmin();
    const router = useRouter();
    const searchParams = useSearchParams();
    const isEditMode = mode === 'edit' && !!opportunityId;
    const [isLoading, setIsLoading] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [pastedText, setPastedText] = useState('');
    const [pastedJson, setPastedJson] = useState('');
    const [showParser, setShowParser] = useState(false);
    const [publishedListing, setPublishedListing] = useState<{
        title: string;
        company: string;
        type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
        slugOrId: string;
        locations: string[];
        allowedPassoutYears: number[];
    } | null>(null);
    const [duplicateCandidates, setDuplicateCandidates] = useState<Array<{
        id: string;
        title: string;
        company: string;
        status: string;
        updatedAt: string;
    }>>([]);
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [timelineBusyId, setTimelineBusyId] = useState<string | null>(null);
    const [newEventType, setNewEventType] = useState<TimelineEvent['eventType']>('OTHER');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventNotes, setNewEventNotes] = useState('');
    const [newEventSourceLink, setNewEventSourceLink] = useState('');

    // Form state
    const [type, setType] = useState<'JOB' | 'INTERNSHIP' | 'WALKIN'>('JOB');
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [companyWebsite, setCompanyWebsite] = useState('');
    const [description, setDescription] = useState('');
    const [allowedDegrees, setAllowedDegrees] = useState<string[]>([]);
    const [allowedCourses, setAllowedCourses] = useState<string[]>([]);
    const [allowedSpecializations, setAllowedSpecializations] = useState<string[]>([]);
    const [passoutYears, setPassoutYears] = useState<number[]>([]);
    const [requiredSkills, setRequiredSkills] = useState<string>('');
    const [locations, setLocations] = useState<string>('');
    const [workMode, setWorkMode] = useState<'ONSITE' | 'HYBRID' | 'REMOTE'>('ONSITE');
    const [salaryRange, setSalaryRange] = useState('');
    const [salaryAmount, setSalaryAmount] = useState('');
    const [applyLink, setApplyLink] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [jobFunction, setJobFunction] = useState('');
    const [employmentType, setEmploymentType] = useState('');
    const [incentives, setIncentives] = useState('');
    const [selectionProcess, setSelectionProcess] = useState('');
    const [notesHighlights, setNotesHighlights] = useState('');
    const [salaryPeriod, setSalaryPeriod] = useState<'YEARLY' | 'MONTHLY'>('YEARLY');
    const [experienceMin, setExperienceMin] = useState('');
    const [experienceMax, setExperienceMax] = useState('');

    // Walk-in specific
    const [venueAddress, setVenueAddress] = useState('');
    const [walkInDateRange, setWalkInDateRange] = useState('');
    const [walkInTimeRange, setWalkInTimeRange] = useState('');
    const [venueLink, setVenueLink] = useState('');
    const [requiredDocuments, setRequiredDocuments] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [contactPhone, setContactPhone] = useState('');

    // Picker states for simpler UI
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('13:00');

    const getPublicOpportunityUrl = (slugOrId: string, opportunityType: 'JOB' | 'INTERNSHIP' | 'WALKIN') => {
        const configuredOrigin =
            process.env.NEXT_PUBLIC_SITE_URL
            || process.env.NEXT_PUBLIC_APP_URL
            || 'https://fresherflow.in';
        const origin = /localhost|127\.0\.0\.1/i.test(configuredOrigin)
            ? 'https://fresherflow.in'
            : configuredOrigin;
        return `${origin}${getOpportunityPath(opportunityType, slugOrId)}`;
    };

    const buildAdminSharePack = (payload: {
        title: string;
        company: string;
        type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
        slugOrId: string;
        locations: string[];
        allowedPassoutYears: number[];
    }) => {
        const publicUrl = getPublicOpportunityUrl(payload.slugOrId, payload.type);
        const normalizedLocations = (payload.locations || []).map((value) => value.trim()).filter(Boolean);
        const locationLine = normalizedLocations.length > 1
            ? normalizedLocations.join(' | ')
            : (normalizedLocations[0] || 'Remote');
        const locationTag = normalizedLocations.length === 1
            ? `#${normalizedLocations[0].replace(/[^a-zA-Z0-9]/g, '')}Jobs`
            : '';
        const sortedYears = [...(payload.allowedPassoutYears || [])]
            .filter((year) => Number.isFinite(year))
            .sort((a, b) => a - b);
        const batch = sortedYears.length > 0 ? sortedYears.join(', ') : 'Any';

        return [
            `${payload.title} - at ${payload.company}`,
            `location: ${locationLine}`,
            '',
            `Batch: ${batch}`,
            '',
            `Apply: ${publicUrl}`,
            '',
            ['#FresherJobs', locationTag, '#FresherFlow'].filter(Boolean).join(' '),
        ].join('\n');
    };

    const buildPlatformCaption = (platform: SharePlatform, payload: {
        title: string;
        company: string;
        type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
        slugOrId: string;
    }) => {
        const publicUrl = getPublicOpportunityUrl(payload.slugOrId, payload.type);
        const tracked = buildShareUrl(publicUrl, { platform, ref: 'admin_share', campaign: 'job_share' });
        const label = payload.type === 'WALKIN' ? 'Walk-in' : payload.type === 'INTERNSHIP' ? 'Internship' : 'Job';

        return [
            `${payload.title} at ${payload.company}`,
            `${label} listing on FresherFlow`,
            tracked,
            '#FresherFlow #FresherJobs #OffCampus #Hiring',
        ].join('\n');
    };

    const copyCaption = async (platform: SharePlatform) => {
        if (!publishedListing) return;
        try {
            await navigator.clipboard.writeText(buildPlatformCaption(platform, publishedListing));
            toast.success(`${platform.toUpperCase()} caption copied.`);
        } catch {
            toast.error('Could not copy caption.');
        }
    };

    const toLocalISOString = (dateInput: Date | string) => {
        const date = new Date(dateInput);
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localTime = new Date(date.getTime() - tzOffset);
        return localTime.toISOString().slice(0, 16);
    };

    const typeParamToEnum = (value: string) => {
        const v = value.toLowerCase();
        if (v === 'job' || v === 'jobs') return 'JOB';
        if (v === 'internship' || v === 'internships') return 'INTERNSHIP';
        if (v === 'walk-in' || v === 'walkin' || v === 'walkins' || v === 'walk-ins') return 'WALKIN';
        return value.toUpperCase();
    };

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/admin/login');
        }
    }, [isAuthenticated, router]);

    useEffect(() => {
        if (isEditMode) return;
        const typeParam = searchParams.get('type');
        if (!typeParam) return;
        const normalized = typeParamToEnum(typeParam);
        if (normalized === 'JOB' || normalized === 'INTERNSHIP' || normalized === 'WALKIN') {
            setType(normalized as 'JOB' | 'INTERNSHIP' | 'WALKIN');
        }
    }, [searchParams, isEditMode]);

    useEffect(() => {
        const trimmedTitle = title.trim();
        const trimmedCompany = company.trim();
        if (trimmedTitle.length < 3 || trimmedCompany.length < 2) {
            setDuplicateCandidates([]);
            setCheckingDuplicates(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
            try {
                setCheckingDuplicates(true);
                const response = await adminApi.getOpportunities({ q: trimmedCompany, limit: 25 }) as { opportunities: DuplicateOpportunity[] };
                const opportunities = (response?.opportunities || []);
                const titleTokens = tokenSet(trimmedTitle);
                const companyTokens = tokenSet(trimmedCompany);
                const currentApplyDomain = extractDomain(applyLink);

                const scored = opportunities
                    .filter((opp) => opp.id !== opportunityId)
                    .map((opp) => {
                        const titleScore = overlapRatio(titleTokens, tokenSet(opp.title || ''));
                        const companyScore = overlapRatio(companyTokens, tokenSet(opp.company || ''));
                        const candidateDomain = extractDomain(opp.applyLink);
                        const applyDomainScore = currentApplyDomain && candidateDomain && currentApplyDomain === candidateDomain ? 1 : 0;
                        const score = (titleScore * 0.5) + (companyScore * 0.35) + (applyDomainScore * 0.15);
                        return { ...opp, score };
                    })
                    .filter((opp) => opp.score >= 0.45)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 4)
                    .map((opp) => ({
                        id: opp.id,
                        title: opp.title,
                        company: opp.company,
                        status: `${opp.status} • ${Math.round(opp.score * 100)}%`,
                        updatedAt: opp.updatedAt
                    }));
                setDuplicateCandidates(scored);
            } catch {
                setDuplicateCandidates([]);
            } finally {
                setCheckingDuplicates(false);
            }
        }, 450);

        return () => clearTimeout(timeoutId);
    }, [title, company, applyLink, opportunityId]);

    const fetchOpportunityForEdit = useCallback(async () => {
        if (!opportunityId) return;
        try {
            const data = await adminApi.getOpportunity(opportunityId) as { opportunity: Opportunity };
            const opp = data.opportunity;

            setType(opp.type);
            setTitle(opp.title);
            setCompany(opp.company);
            setCompanyWebsite(opp.companyWebsite || '');
            setDescription(opp.description || '');
            setLocations((opp.locations || []).join(', '));
            setRequiredSkills((opp.requiredSkills || []).join(', '));
            setAllowedDegrees(opp.allowedDegrees || []);
            setAllowedCourses(opp.allowedCourses || []);
            setAllowedSpecializations(opp.allowedSpecializations || []);
            setPassoutYears(opp.allowedPassoutYears || []);
            setWorkMode(opp.workMode || 'ONSITE');
            setSalaryRange(opp.salaryRange || '');
            setJobFunction(opp.jobFunction || '');
            setEmploymentType(opp.employmentType || '');
            setIncentives(opp.incentives || '');
            setSelectionProcess(opp.selectionProcess || '');
            setNotesHighlights(opp.notesHighlights || '');
            setSalaryPeriod(opp.salaryPeriod || 'YEARLY');
            setExperienceMin(opp.experienceMin?.toString() || '');
            setExperienceMax(opp.experienceMax?.toString() || '');
            setApplyLink(opp.applyLink || '');
            setExpiresAt(opp.expiresAt ? toLocalISOString(opp.expiresAt) : '');

            if (opp.walkInDetails) {
                setVenueAddress(opp.walkInDetails.venueAddress || '');
                setWalkInDateRange(opp.walkInDetails.dateRange || '');
                setWalkInTimeRange(opp.walkInDetails.timeRange || opp.walkInDetails.reportingTime || '');
                setVenueLink(opp.walkInDetails.venueLink || '');
                setRequiredDocuments((opp.walkInDetails.requiredDocuments || []).join(', '));
                setContactPerson(opp.walkInDetails.contactPerson || '');
                setContactPhone(opp.walkInDetails.contactPhone || '');

                if (opp.walkInDetails.dates?.length) {
                    const sorted = [...opp.walkInDetails.dates].sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());
                    setStartDate(new Date(sorted[0]).toISOString().split('T')[0]);
                    setEndDate(new Date(sorted[sorted.length - 1]).toISOString().split('T')[0]);
                }
            }
        } catch (err: unknown) {
            const error = err as Error;
            toast.error(`Failed to load listing: ${error.message}`);
            router.push('/admin/opportunities');
        }
    }, [opportunityId, router]);

    const loadTimelineEvents = useCallback(async () => {
        if (!opportunityId) return;
        setTimelineLoading(true);
        try {
            const response = await adminApi.getOpportunityEvents(opportunityId) as { events: TimelineEvent[] };
            setTimelineEvents((response.events || []).map((event) => ({
                ...event,
                eventDate: event.eventDate ? toLocalISOString(event.eventDate) : '',
            })));
        } catch {
            toast.error('Could not load timeline events.');
        } finally {
            setTimelineLoading(false);
        }
    }, [opportunityId]);

    useEffect(() => {
        if (!isAuthenticated || !isEditMode) return;
        void fetchOpportunityForEdit();
        void loadTimelineEvents();
    }, [isAuthenticated, isEditMode, fetchOpportunityForEdit, loadTimelineEvents]);

    const handleCreateTimelineEvent = async () => {
        if (!opportunityId) return;
        if (!newEventTitle.trim() || !newEventDate) {
            toast.error('Event title and date are required.');
            return;
        }

        try {
            setTimelineBusyId('new');
            await adminApi.createOpportunityEvent(opportunityId, {
                eventType: newEventType,
                eventDate: new Date(newEventDate).toISOString(),
                title: newEventTitle.trim(),
                notes: newEventNotes.trim() || undefined,
                sourceLink: newEventSourceLink.trim() || undefined,
            });
            setNewEventTitle('');
            setNewEventDate('');
            setNewEventNotes('');
            setNewEventSourceLink('');
            setNewEventType('OTHER');
            await loadTimelineEvents();
            toast.success('Timeline event added.');
        } catch {
            toast.error('Failed to add timeline event.');
        } finally {
            setTimelineBusyId(null);
        }
    };

    const handleUpdateTimelineEvent = async (event: TimelineEvent) => {
        if (!opportunityId || !event.id) return;
        if (!event.title.trim() || !event.eventDate) {
            toast.error('Event title and date are required.');
            return;
        }
        try {
            setTimelineBusyId(event.id);
            await adminApi.updateOpportunityEvent(opportunityId, event.id, {
                eventType: event.eventType,
                eventDate: new Date(event.eventDate).toISOString(),
                title: event.title.trim(),
                notes: event.notes?.trim() || undefined,
                sourceLink: event.sourceLink?.trim() || undefined,
            });
            toast.success('Event updated.');
        } catch {
            toast.error('Failed to update event.');
        } finally {
            setTimelineBusyId(null);
        }
    };

    const handleDeleteTimelineEvent = async (eventId: string) => {
        if (!opportunityId || !eventId) return;
        try {
            setTimelineBusyId(eventId);
            await adminApi.deleteOpportunityEvent(opportunityId, eventId);
            setTimelineEvents((prev) => prev.filter((event) => event.id !== eventId));
            toast.success('Event removed.');
        } catch {
            toast.error('Failed to remove event.');
        } finally {
            setTimelineBusyId(null);
        }
    };

    const handleDegreeToggle = (degree: string) => {
        setAllowedDegrees(prev =>
            prev.includes(degree)
                ? prev.filter(d => d !== degree)
                : [...prev, degree]
        );
    };

    const handleCourseToggle = (course: string) => {
        setAllowedCourses(prev =>
            prev.includes(course) ? prev.filter(c => c !== course) : [...prev, course]
        );
    };

    const handleSpecializationToggle = (specialization: string) => {
        setAllowedSpecializations(prev =>
            prev.includes(specialization)
                ? prev.filter((item) => item !== specialization)
                : [...prev, specialization]
        );
    };

    const handleQuickLocation = (loc: string) => {
        if (locations.toLowerCase().includes(loc.toLowerCase())) return;
        setLocations(prev => prev ? `${prev}, ${loc}` : loc);
    };

    const normalizeTextValue = (value: string) =>
        value
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/\s+/g, ' ')
            .trim();

    const uniqueValues = (items: string[]) => Array.from(new Set(items.map(normalizeTextValue).filter(Boolean)));

    const DEGREE_ENUMS = ['DIPLOMA', 'DEGREE', 'PG'] as const;
    const normalizeDegreeValue = (degree: string) => {
        const value = normalizeTextValue(degree).toLowerCase();
        if (
            value.includes('bachelor') ||
            value.includes('undergraduate') ||
            value === 'ug' ||
            value.includes('degree')
        ) return 'DEGREE';
        if (
            value.includes('master') ||
            value.includes('postgraduate') ||
            value.includes('post graduate') ||
            value === 'pg'
        ) return 'PG';
        if (value.includes('diploma') || value.includes('polytechnic') || value.includes('iti')) return 'DIPLOMA';
        return '';
    };

    const toStringArray = (values: unknown) => {
        if (Array.isArray(values)) return values.map((value) => String(value));
        if (typeof values === 'string') {
            return values.split(',').map((value) => value.trim()).filter(Boolean);
        }
        return [];
    };

    const normalizeDegrees = (values: unknown) => {
        return uniqueValues(
            toStringArray(values)
                .map((value) => normalizeDegreeValue(value))
                .filter((value): value is (typeof DEGREE_ENUMS)[number] => DEGREE_ENUMS.includes(value as (typeof DEGREE_ENUMS)[number]))
        );
    };

    const normalizeCourses = (values: unknown, type: 'course' | 'specialization') => {
        const normalize = type === 'course' ? normalizeCourseName : normalizeSpecializationName;
        return uniqueValues(
            toStringArray(values)
                .map((value) => normalize(value))
                .filter(Boolean)
        );
    };

    const normalizeEducationPayload = (degreesInput: unknown, coursesInput: unknown, specializationsInput: unknown) => {
        const rawDegrees = toStringArray(degreesInput);
        const normalizedDegrees = normalizeDegrees(rawDegrees);
        const inferredCoursesFromDegrees = rawDegrees.filter((value) => !normalizeDegreeValue(value));
        const normalizedCourses = normalizeCourses([
            ...toStringArray(coursesInput),
            ...inferredCoursesFromDegrees,
        ], 'course');
        const normalizedSpecializations = normalizeCourses(specializationsInput, 'specialization');

        // If only degree specializations were provided in allowedDegrees, keep eligibility broad as UG.
        const degrees = normalizedDegrees.length > 0
            ? normalizedDegrees
            : (inferredCoursesFromDegrees.length > 0 ? ['DEGREE'] : []);

        return { degrees, courses: normalizedCourses, specializations: normalizedSpecializations };
    };

    const normalizeWorkModeValue = (value: unknown): 'ONSITE' | 'HYBRID' | 'REMOTE' | undefined => {
        const normalized = String(value || '').toLowerCase().replace(/[\s_-]/g, '');
        if (normalized === 'onsite' || normalized === 'office') return 'ONSITE';
        if (normalized === 'hybrid') return 'HYBRID';
        if (normalized === 'remote' || normalized === 'wfh') return 'REMOTE';
        return undefined;
    };

    const normalizeSalaryPeriodValue = (value: unknown): 'YEARLY' | 'MONTHLY' | undefined => {
        const normalized = String(value || '').toLowerCase();
        if (normalized.includes('month')) return 'MONTHLY';
        if (normalized.includes('year') || normalized.includes('annum') || normalized.includes('lpa')) return 'YEARLY';
        return undefined;
    };

    const normalizePassoutYears = (values: unknown) => {
        return toStringArray(values)
            .map((value) => parseInt(String(value).replace(/[^0-9]/g, ''), 10))
            .filter((value) => Number.isFinite(value));
    };

    const handleAutoFill = async () => {
        if (!pastedText.trim()) {
            toast.error('Please paste some job content first');
            return;
        }

        setIsParsing(true);
        const toastId = toast.loading('Auto-filling from text...');

        try {
            const { parsed } = await adminApi.parseJobText(pastedText) as { parsed: ParsedJob };

            if (parsed.title) setTitle(parsed.title);
            if (parsed.company) setCompany(parsed.company);
            if (parsed.companyWebsite) setCompanyWebsite(parsed.companyWebsite);
            if (parsed.type) {
                const normalizedType = typeParamToEnum(String(parsed.type));
                if (normalizedType === 'JOB' || normalizedType === 'INTERNSHIP' || normalizedType === 'WALKIN') {
                    setType(normalizedType as 'JOB' | 'INTERNSHIP' | 'WALKIN');
                }
            }
            if (parsed.locations?.length) setLocations(parsed.locations.join(', '));
            if (parsed.skills?.length) setRequiredSkills(parsed.skills.join(', '));
            if (parsed.requiredSkills?.length) setRequiredSkills(parsed.requiredSkills.join(', '));
            if (parsed.experienceMin !== undefined) setExperienceMin(String(parsed.experienceMin));
            if (parsed.experienceMax !== undefined) setExperienceMax(String(parsed.experienceMax));
            if (parsed.salaryRange) setSalaryRange(parsed.salaryRange);
            if (parsed.salaryMin !== undefined && parsed.salaryMax !== undefined) {
                setSalaryRange(`${parsed.salaryMin}-${parsed.salaryMax}`);
            }
            if (parsed.salaryPeriod) {
                const normalizedSalaryPeriod = normalizeSalaryPeriodValue(parsed.salaryPeriod);
                if (normalizedSalaryPeriod) setSalaryPeriod(normalizedSalaryPeriod);
            }
            if (parsed.jobFunction) setJobFunction(parsed.jobFunction);
            if (parsed.employmentType) setEmploymentType(parsed.employmentType);
            if (parsed.incentives) setIncentives(parsed.incentives);
            if (parsed.selectionProcess) setSelectionProcess(parsed.selectionProcess);
            if (parsed.notesHighlights) setNotesHighlights(parsed.notesHighlights);
            const parsedEducation = normalizeEducationPayload(parsed.allowedDegrees, parsed.allowedCourses, parsed.allowedSpecializations);
            setAllowedDegrees(parsedEducation.degrees);
            setAllowedCourses(parsedEducation.courses);
            setAllowedSpecializations(parsedEducation.specializations);
            if (parsed.allowedPassoutYears?.length) setPassoutYears(normalizePassoutYears(parsed.allowedPassoutYears));
            if (parsed.applyLink) setApplyLink(parsed.applyLink);
            if (parsed.expiresAt) setExpiresAt(parsed.expiresAt);

            // Set description to the raw text for reference
            setDescription(pastedText);

            if (parsed.type === 'WALKIN') {
                if (parsed.venueAddress) setVenueAddress(parsed.venueAddress);
                if (parsed.venueLink) setVenueLink(parsed.venueLink);
                if (parsed.dateRange) setWalkInDateRange(parsed.dateRange);
                if (parsed.timeRange) setWalkInTimeRange(parsed.timeRange);
                if (parsed.requiredDocuments?.length) setRequiredDocuments(parsed.requiredDocuments.join(', '));
                if (parsed.contactPerson) setContactPerson(parsed.contactPerson);
                if (parsed.contactPhone) setContactPhone(parsed.contactPhone);
            }

            toast.success('Form updated from text.', { id: toastId });
            setShowParser(false);
        } catch {
            toast.error('Failed to parse text. Please fill manually.', { id: toastId });
        } finally {
            setIsParsing(false);
        }
    };

    const jsonReport = useMemo(() => {
        if (!pastedJson.trim()) return null;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any = JSON.parse(pastedJson);
            const normalizedType = data.type ? typeParamToEnum(String(data.type)) : 'JOB';
            const requiredFields = ['title', 'company', 'description', 'locations'];
            if (normalizedType !== 'WALKIN') requiredFields.push('applyLink');
            if (normalizedType === 'WALKIN') {
                requiredFields.push('venueAddress');
            }

            const hasField = (field: string) => {
                if (field === 'venueAddress') {
                    return Boolean(data.venueAddress || data.walkInDetails?.venueAddress);
                }
                const value = data[field];
                if (Array.isArray(value)) return value.length > 0;
                if (typeof value === 'string') return value.trim().length > 0;
                return value !== undefined && value !== null;
            };

            const missing = requiredFields.filter((field) => !hasField(field));
            const present = requiredFields.filter((field) => hasField(field));

            return {
                valid: true,
                type: normalizedType,
                missing,
                present,
            };
        } catch {
            return {
                valid: false,
                type: null,
                missing: [] as string[],
                present: [] as string[],
            };
        }
    }, [pastedJson]);

    const applyJsonToForm = () => {
        if (!pastedJson.trim()) {
            toast.error('Please paste JSON first');
            return;
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const data: any = JSON.parse(pastedJson);

            if (data.type) {
                const normalizedType = typeParamToEnum(String(data.type));
                if (normalizedType === 'JOB' || normalizedType === 'INTERNSHIP' || normalizedType === 'WALKIN') {
                    setType(normalizedType as 'JOB' | 'INTERNSHIP' | 'WALKIN');
                }
            }
            if (data.title) setTitle(data.title);
            if (data.company) setCompany(data.company);
            if (data.companyWebsite) setCompanyWebsite(data.companyWebsite);
            if (data.description) setDescription(String(data.description));
            const parsedEducation = normalizeEducationPayload(data.allowedDegrees, data.allowedCourses, data.allowedSpecializations);
            setAllowedDegrees(parsedEducation.degrees);
            setAllowedCourses(parsedEducation.courses);
            setAllowedSpecializations(parsedEducation.specializations);
            setPassoutYears(normalizePassoutYears(data.allowedPassoutYears));
            const requiredSkillsValues = toStringArray(data.requiredSkills);
            if (requiredSkillsValues.length > 0) setRequiredSkills(requiredSkillsValues.join(', '));
            const locationsValues = toStringArray(data.locations);
            if (locationsValues.length > 0) setLocations(locationsValues.join(', '));
            if (data.workMode) {
                const normalizedWorkMode = normalizeWorkModeValue(data.workMode);
                if (normalizedWorkMode) setWorkMode(normalizedWorkMode);
            }
            if (data.salaryRange) setSalaryRange(String(data.salaryRange));
            if (data.salaryAmount !== undefined) setSalaryAmount(String(data.salaryAmount));
            if (data.salaryMin !== undefined && data.salaryMax !== undefined) {
                setSalaryRange(`${data.salaryMin}-${data.salaryMax}`);
            }
            if (data.salaryPeriod) {
                const normalizedSalaryPeriod = normalizeSalaryPeriodValue(data.salaryPeriod);
                if (normalizedSalaryPeriod) setSalaryPeriod(normalizedSalaryPeriod);
            }
            if (data.jobFunction) setJobFunction(String(data.jobFunction));
            if (data.employmentType) setEmploymentType(String(data.employmentType));
            if (data.incentives) setIncentives(String(data.incentives));
            if (data.selectionProcess) setSelectionProcess(String(data.selectionProcess));
            if (data.notesHighlights) setNotesHighlights(String(data.notesHighlights));
            if (data.experienceMin !== undefined) setExperienceMin(String(data.experienceMin));
            if (data.experienceMax !== undefined) setExperienceMax(String(data.experienceMax));
            if (data.applyLink) setApplyLink(data.applyLink);
            if (data.expiresAt) setExpiresAt(data.expiresAt);
            if (data.venueAddress) setVenueAddress(String(data.venueAddress));
            if (data.venueLink) setVenueLink(String(data.venueLink));
            if (data.dateRange) setWalkInDateRange(String(data.dateRange));
            if (data.timeRange) setWalkInTimeRange(String(data.timeRange));
            if (data.requiredDocuments) {
                const requiredDocumentsValues = toStringArray(data.requiredDocuments);
                if (requiredDocumentsValues.length > 0) setRequiredDocuments(requiredDocumentsValues.join(', '));
            }
            if (data.contactPerson) setContactPerson(String(data.contactPerson));
            if (data.contactPhone) setContactPhone(String(data.contactPhone));
            if (data.startDate) setStartDate(String(data.startDate));
            if (data.endDate) setEndDate(String(data.endDate));
            if (data.startTime) setStartTime(String(data.startTime));
            if (data.endTime) setEndTime(String(data.endTime));

            if (data.walkInDetails) {
                if (data.walkInDetails.dateRange) setWalkInDateRange(data.walkInDetails.dateRange);
                if (data.walkInDetails.timeRange) setWalkInTimeRange(data.walkInDetails.timeRange);
                if (data.walkInDetails.reportingTime && !data.walkInDetails.timeRange) setWalkInTimeRange(data.walkInDetails.reportingTime);
                if (data.walkInDetails.venueAddress) setVenueAddress(data.walkInDetails.venueAddress);
                if (data.walkInDetails.venueLink) setVenueLink(data.walkInDetails.venueLink);
                const requiredDocumentsValues = toStringArray(data.walkInDetails.requiredDocuments);
                if (requiredDocumentsValues.length > 0) setRequiredDocuments(requiredDocumentsValues.join(', '));
                if (data.walkInDetails.contactPerson) setContactPerson(data.walkInDetails.contactPerson);
                if (data.walkInDetails.contactPhone) setContactPhone(data.walkInDetails.contactPhone);
                if (Array.isArray(data.walkInDetails.dates) && data.walkInDetails.dates.length > 0) {
                    const sortedDates = data.walkInDetails.dates
                        .map((value: unknown) => String(value))
                        .filter(Boolean)
                        .sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());
                    if (sortedDates.length > 0) setStartDate(sortedDates[0]);
                    if (sortedDates.length > 1) setEndDate(sortedDates[sortedDates.length - 1]);
                }
            }

            toast.success('Form updated from JSON.');
            setShowParser(false);
        } catch {
            toast.error('Invalid JSON. Please paste a valid JSON payload.');
        }
    };

    const toggleAmPm = (target: 'AM' | 'PM') => {
        if (!expiresAt) return;
        const [date, time] = expiresAt.split('T');
        if (!time) return;
        const [hours, minutes] = time.split(':');
        let h = parseInt(hours);

        if (target === 'PM' && h < 12) h += 12;
        else if (target === 'AM' && h >= 12) h -= 12;

        const newTime = `${String(h).padStart(2, '0')}:${minutes}`;
        setExpiresAt(`${date}T${newTime}`);
    };




    const COMMON_DEGREES = ['DIPLOMA', 'DEGREE', 'PG'];
    const visibleCourseOptions = Array.from(new Set([...ALL_COURSE_OPTIONS, ...allowedCourses]));
    const visibleSpecializationOptions = Array.from(new Set([...ALL_SPECIALIZATION_OPTIONS, ...allowedSpecializations]));
    const customDegrees = allowedDegrees.filter((degree) => !COMMON_DEGREES.includes(degree));



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const loadingToast = toast.loading(isEditMode ? 'Updating listing...' : 'Publishing listing...');

        try {
            const payload = buildOpportunityPayload({
                type,
                title,
                company,
                companyWebsite,
                description,
                allowedDegrees,
                allowedCourses,
                allowedSpecializations,
                passoutYears,
                requiredSkills,
                locations,
                workMode,
                salaryRange,
                salaryAmount,
                salaryPeriod,
                employmentType,
                incentives,
                jobFunction,
                selectionProcess,
                notesHighlights,
                experienceMin,
                experienceMax,
                applyLink,
                expiresAt,
                venueAddress,
                walkInDateRange,
                walkInTimeRange,
                venueLink,
                requiredDocuments,
                contactPerson,
                contactPhone,
                startDate,
                endDate,
                startTime,
                endTime,
            });

            if (isEditMode && opportunityId) {
                await adminApi.updateOpportunity(opportunityId, payload);
            } else {
                const response = await adminApi.createOpportunity(payload) as { opportunity: Opportunity };
                const created = response?.opportunity;
                if (created?.id || created?.slug) {
                    const listingData = {
                        title: created.title || title,
                        company: created.company || company,
                        type: created.type || type,
                        slugOrId: created.slug || created.id,
                        locations: created.locations || locations.split(',').map((value) => value.trim()).filter(Boolean),
                        allowedPassoutYears: created.allowedPassoutYears || passoutYears,
                    };
                    setPublishedListing(listingData);
                }
            }

            const successMessage = isEditMode
                ? 'Listing updated.'
                : 'Listing published.';
            toast.success(successMessage, { id: loadingToast });
            router.push('/admin/opportunities');
        } catch (err: unknown) {
            const error = err as Error;
            let errorMessage = 'An unexpected error occurred.';
            if (error instanceof Error) {
                errorMessage = error.message;
            } else if (typeof err === 'object' && err !== null && 'message' in err) {
                errorMessage = String((err as { message: unknown }).message);
            }
            toast.error(`Error: ${errorMessage}`, { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isAuthenticated) return null;

    return (
        <div className="max-w-5xl mx-auto space-y-5 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            {/* Header */}
            <div className="space-y-3">
                <Link href="/admin/opportunities" className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    Back to listings
                </Link>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">New listing</h1>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                            {isEditMode ? 'Update and republish a verified listing.' : 'Create and publish a verified listing.'}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowParser(!showParser)}
                        className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm w-full md:w-auto"
                    >
                        <BoltIcon className="w-4 h-4 mr-2" />
                        Auto-fill text
                    </button>
                </div>
            </div>

            {publishedListing && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 md:p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">Listing published</h3>
                            <p className="text-xs text-muted-foreground mt-1">Copy platform captions or open the listings page.</p>
                        </div>
                        <Link
                            href="/admin/opportunities"
                            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Back to listings
                        </Link>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => void copyCaption('telegram')}
                            className="inline-flex h-8 items-center justify-center rounded-md bg-primary px-3 text-[10px] font-bold uppercase tracking-widest text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            Copy Telegram
                        </button>
                        <button
                            type="button"
                            onClick={() => void copyCaption('linkedin')}
                            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Copy LinkedIn
                        </button>
                        <button
                            type="button"
                            onClick={() => void copyCaption('x')}
                            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Copy X
                        </button>
                        <button
                            type="button"
                            onClick={() => void copyCaption('instagram')}
                            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Copy Instagram
                        </button>
                        <button
                            type="button"
                            onClick={async () => {
                                try {
                                    await navigator.clipboard.writeText(buildAdminSharePack(publishedListing));
                                    toast.success('Full share pack copied.');
                                } catch {
                                    toast.error('Could not copy share pack.');
                                }
                            }}
                            className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Copy full pack
                        </button>
                    </div>
                </div>
            )}

            {/* Auto-Fill Section */}
            {showParser && (
                <div className="bg-muted/30 border border-border rounded-lg p-4 md:p-5 shadow-sm animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold flex items-center gap-2">
                                <BoltIcon className="w-4 h-4 text-primary" />
                                Auto-fill
                            </h3>
                            <button onClick={() => setShowParser(false)} className="text-muted-foreground hover:text-foreground text-xs font-bold uppercase">
                                Close
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                            {/* Temporarily disabled: raw text auto-fill. Keep JSON auto-fill only. */}
                            <div className="hidden space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Paste raw text</label>
                                <textarea
                                    value={pastedText}
                                    onChange={(e) => setPastedText(e.target.value)}
                                    placeholder="Paste the job description here..."
                                    className="w-full min-h-32 p-3 text-sm rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                />
                                <button
                                    onClick={handleAutoFill}
                                    disabled={isParsing || !pastedText.trim()}
                                    className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-md transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isParsing ? (
                                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                                    ) : (
                                        <BoltIcon className="w-4 h-4" />
                                    )}
                                    {isParsing ? 'Processing...' : 'Apply text'}
                                </button>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Paste JSON payload</label>
                                <textarea
                                    value={pastedJson}
                                    onChange={(e) => setPastedJson(e.target.value)}
                                    placeholder='{"type":"WALKIN","title":"...","company":"..."}'
                                    className="w-full min-h-32 p-3 text-sm rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                                />
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setPastedJson(JOB_TEMPLATE)}
                                        className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                    >
                                        Insert Job
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPastedJson(INTERNSHIP_TEMPLATE)}
                                        className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                    >
                                        Insert Internship
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPastedJson(WALKIN_TEMPLATE)}
                                        className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                                    >
                                        Insert Walk-in
                                    </button>
                                </div>
                                <button
                                    onClick={applyJsonToForm}
                                    disabled={!pastedJson.trim()}
                                    className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-md transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    Apply JSON
                                </button>
                                {jsonReport && (
                                    <div className={`rounded-md border p-3 text-[10px] space-y-2 ${jsonReport.valid ? 'border-border bg-muted/40' : 'border-destructive/30 bg-destructive/5 text-destructive'}`}>
                                        {!jsonReport.valid ? (
                                            <p className="font-bold uppercase tracking-wider">Invalid JSON format</p>
                                        ) : (
                                            <>
                                                <p className="font-bold uppercase tracking-wider text-muted-foreground">
                                                    JSON report • {jsonReport.type}
                                                </p>
                                                <div className="text-muted-foreground">
                                                    Present: {jsonReport.present.join(', ') || 'none'}
                                                </div>
                                                <div className={jsonReport.missing.length > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                                                    {jsonReport.missing.length > 0
                                                        ? `Missing required: ${jsonReport.missing.join(', ')}`
                                                        : 'All required fields found'}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-6">
                {/* Type Selection */}
                <div className="space-y-3">
                    <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                        <InformationCircleIcon className="w-4 h-4 text-muted-foreground" />
                        Type
                    </h3>
                    <div className="grid grid-cols-3 gap-2 md:gap-3">
                        {(['JOB', 'INTERNSHIP', 'WALKIN'] as const).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-lg border transition-all text-center h-full ${type === t
                                    ? 'bg-primary/5 border-primary ring-1 ring-primary shadow-sm'
                                    : 'bg-card border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                                    }`}
                            >
                                <span className={`text-[10px] md:text-sm font-bold uppercase tracking-wider ${type === t ? 'text-primary' : 'text-foreground'}`}>{t}</span>
                                <span className="text-[9px] md:text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                                    {t === 'WALKIN' ? 'In-person' : 'Direct apply'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Details */}
                <div className="space-y-5 md:space-y-6 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
                    <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                        <BriefcaseIcon className="w-4 h-4 text-muted-foreground" />
                        Core details
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Title *</label>
                            <input
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                                placeholder="e.g. Frontend Engineer"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company *</label>
                            <input
                                required
                                value={company}
                                onChange={(e) => setCompany(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                                placeholder="e.g. Google"
                            />
                        </div>
                    </div>
                    {(checkingDuplicates || duplicateCandidates.length > 0) && (
                        <div className="rounded-lg border border-amber-300/50 bg-amber-50/70 dark:bg-amber-500/10 p-3 space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                                Potential duplicate check
                            </p>
                            {checkingDuplicates ? (
                                <p className="text-xs text-muted-foreground">Scanning existing listings...</p>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        Found {duplicateCandidates.length} similar listing{duplicateCandidates.length > 1 ? 's' : ''}. Review before publish.
                                    </p>
                                    <div className="space-y-1.5">
                                        {duplicateCandidates.map((dup) => (
                                            <Link
                                                key={dup.id}
                                                href={`/admin/opportunities/edit/${dup.id}`}
                                                className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-2 hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-foreground truncate">{dup.title}</p>
                                                    <p className="text-[11px] text-muted-foreground truncate">{dup.company}</p>
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{dup.status}</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company website (logo)</label>
                            <input
                                type="url"
                                value={companyWebsite}
                                onChange={(e) => setCompanyWebsite(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                                placeholder="https://wipro.com"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Function</label>
                            <input
                                value={jobFunction}
                                onChange={(e) => setJobFunction(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                                placeholder="e.g. Sales, Banking, IT"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employment type</label>
                            <input
                                value={employmentType}
                                onChange={(e) => setEmploymentType(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                                placeholder="e.g. Full Time, Permanent"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Benefits</label>
                            <input
                                value={incentives}
                                onChange={(e) => setIncentives(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all shadow-sm"
                                placeholder="e.g. Rs. 20,000 to 1,00,000"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selection process</label>
                            <textarea
                                value={selectionProcess}
                                onChange={(e) => setSelectionProcess(e.target.value)}
                                rows={3}
                                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-y transition-all shadow-sm"
                                placeholder="e.g. Aptitude Test > Technical Interview > HR Round"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes / highlights</label>
                            <textarea
                                value={notesHighlights}
                                onChange={(e) => setNotesHighlights(e.target.value)}
                                rows={3}
                                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary resize-y transition-all shadow-sm"
                                placeholder="e.g. Bond: 12 months, Training: 3 months, Immediate joiners preferred"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={8}
                            className="flex min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 resize-y transition-all shadow-sm"
                            placeholder="Roles and responsibilities..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salary Configuration</label>
                        <div className="flex gap-2">
                            {(['YEARLY', 'MONTHLY'] as const).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setSalaryPeriod(p)}
                                    className={`px-3 py-1 rounded text-xs font-bold transition-all border ${salaryPeriod === p
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                                        }`}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Salary amount ({salaryPeriod === 'YEARLY' ? 'LPA' : 'Monthly'})
                            </label>
                            <input
                                type="number"
                                value={salaryAmount}
                                onChange={(e) => setSalaryAmount(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                                placeholder={salaryPeriod === 'YEARLY' ? 'e.g. 2' : 'e.g. 20000'}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                {salaryPeriod === 'YEARLY'
                                    ? 'Enter LPA (e.g. 2 = 2 LPA)'
                                    : 'Enter monthly salary (e.g. 20000)'}
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salary note (optional)</label>
                            <input
                                type="text"
                                value={salaryRange}
                                onChange={(e) => setSalaryRange(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                                placeholder="e.g. 2 LPA or 20k-30k"
                            />
                        </div>
                        <div className="space-y-1.5 relative group md:col-span-2">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                Expiration Node
                            </label>
                            <input
                                type="datetime-local"
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                min={new Date().toISOString().split('T')[0] + "T00:00"}
                                max="2099-12-31T23:59"
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                            />
                            <div className="flex gap-1.5 mt-1.5">
                                <button
                                    type="button"
                                    onClick={() => toggleAmPm('AM')}
                                    className="px-2 py-1 rounded bg-muted hover:bg-muted-foreground/10 text-[10px] font-bold uppercase transition-colors"
                                >
                                    Force AM
                                </button>
                                <button
                                    type="button"
                                    onClick={() => toggleAmPm('PM')}
                                    className="px-2 py-1 rounded bg-muted hover:bg-muted-foreground/10 text-[10px] font-bold uppercase transition-colors"
                                >
                                    Force PM
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Requirements */}
                <div className="space-y-5 md:space-y-6 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
                    <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                        <AcademicCapIcon className="w-4 h-4 text-muted-foreground" />
                        Requirements
                    </h3>

                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Education level
                            <span className="ml-2 text-[10px] font-normal lowercase opacity-70 italic">(optional)</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {COMMON_DEGREES.map((deg) => (
                                <button
                                    key={deg}
                                    type="button"
                                    onClick={() => handleDegreeToggle(deg)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all flex flex-col items-start gap-0.5 ${allowedDegrees.includes(deg)
                                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                        : 'bg-background border-input text-muted-foreground hover:border-primary/40 hover:text-primary/70'
                                        }`}
                                >
                                    <span>{deg === 'DEGREE' ? 'UG' : deg === 'PG' ? 'PG' : 'Diploma'}</span>
                                    <span className="text-[10px] opacity-60 font-medium whitespace-nowrap">
                                        {deg === 'DEGREE' ? 'Graduate' : deg === 'PG' ? 'Postgrad' : 'Specialized'}
                                    </span>
                                </button>
                            ))}
                        </div>
                        {customDegrees.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                                {customDegrees.map((degree) => (
                                    <span
                                        key={degree}
                                        className="px-2 py-1 rounded-md text-[10px] font-bold border bg-primary/5 text-primary border-primary/20"
                                    >
                                        {degree}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Courses
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {visibleCourseOptions.map((course) => (
                                <button
                                    key={course}
                                    type="button"
                                    onClick={() => handleCourseToggle(course)}
                                    className={`px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold transition-all border ${allowedCourses.includes(course)
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-muted/50 border-muted-foreground/10 text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                >
                                    {course}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Specializations
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {visibleSpecializationOptions.map((specialization) => (
                                <button
                                    key={specialization}
                                    type="button"
                                    onClick={() => handleSpecializationToggle(specialization)}
                                    className={`px-2.5 py-1 rounded-md text-[10px] md:text-xs font-bold transition-all border ${allowedSpecializations.includes(specialization)
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-muted/50 border-muted-foreground/10 text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                >
                                    {specialization}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Min Exp (years)</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={experienceMin}
                                onChange={(e) => setExperienceMin(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                                placeholder="0"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Max Exp (years)</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={experienceMax}
                                onChange={(e) => setExperienceMax(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                                placeholder="3"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Passout years
                            </label>
                            <input
                                value={passoutYears.join(', ')}
                                onChange={(e) => setPassoutYears(e.target.value.split(',').map(y => parseInt(y.trim())).filter(Boolean))}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                                placeholder="e.g. 2024, 2025"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Skills</label>
                            <input
                                value={requiredSkills}
                                onChange={(e) => setRequiredSkills(e.target.value)}
                                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                                placeholder="React, Node.js..."
                            />
                        </div>
                    </div>
                </div>

                {/* Logistics */}
                <div className="space-y-5 md:space-y-6 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
                    <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                        <MapPinIcon className="w-4 h-4 text-muted-foreground" />
                        Logistics
                    </h3>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Locations</label>
                        <input
                            required
                            value={locations}
                            onChange={(e) => setLocations(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                            placeholder="Mumbai, Bangalore, Remote"
                        />
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {['Pan India', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Remote'].map(loc => (
                                <button
                                    key={loc}
                                    type="button"
                                    onClick={() => handleQuickLocation(loc)}
                                    className="px-2 py-1 rounded bg-muted/50 hover:bg-primary/10 hover:text-primary text-[10px] font-bold uppercase transition-all border border-transparent hover:border-primary/20"
                                >
                                    + {loc}
                                </button>
                            ))}
                        </div>
                    </div>

                    {type !== 'WALKIN' && (
                        <div className="space-y-2.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Work mode</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['ONSITE', 'HYBRID', 'REMOTE'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setWorkMode(mode)}
                                        className={`h-10 rounded-md text-xs font-semibold border transition-all ${workMode === mode
                                            ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                            : 'bg-background border-input text-muted-foreground hover:border-primary/40'
                                            }`}
                                    >
                                        {mode}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Apply Settings */}
                <div className="space-y-5 md:space-y-6 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
                    <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                        <LinkIcon className="w-4 h-4 text-muted-foreground" />
                        Apply link
                    </h3>

                    {type === 'WALKIN' ? (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4 md:p-5 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Drive dates *</label>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <input
                                            type="date"
                                            required
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 text-sm focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50"
                                        />
                                        <span className="text-amber-700/50 text-center text-xs font-bold">{">>"}</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 text-sm focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Reporting window *</label>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                        <input
                                            type="time"
                                            required
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 text-sm focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50"
                                        />
                                        <span className="text-amber-700/50 text-center text-xs font-bold">{">>"}</span>
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 text-sm focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Venue address *</label>
                                    <textarea
                                        required
                                        value={venueAddress}
                                        onChange={(e) => setVenueAddress(e.target.value)}
                                        rows={2}
                                        className="flex min-h-15 w-full rounded-md border border-amber-500/30 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none transition-all"
                                        placeholder="Complete street address..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Maps link</label>
                                    <input
                                        value={venueLink}
                                        onChange={(e) => setVenueLink(e.target.value)}
                                        className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all shadow-sm"
                                        placeholder="Google Maps link..."
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Documents to carry</label>
                                    <input
                                        value={requiredDocuments}
                                        onChange={(e) => setRequiredDocuments(e.target.value)}
                                        className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all shadow-sm"
                                        placeholder="Resume, Photo, PAN, Provisional certificate"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Contact person</label>
                                    <input
                                        value={contactPerson}
                                        onChange={(e) => setContactPerson(e.target.value)}
                                        className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all shadow-sm"
                                        placeholder="Wipro TA Team"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Contact phone</label>
                                    <input
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                        className="flex h-11 w-full rounded-md border border-amber-500/30 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all shadow-sm"
                                        placeholder="Optional phone number"
                                    />
                                </div>
                            </div>
                        </div>
                    )
                        : (
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Apply URL *</label>
                                <input
                                    type="url"
                                    required
                                    value={applyLink}
                                    onChange={(e) => setApplyLink(e.target.value)}
                                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                                    placeholder="https://careers.company.com/..."
                                />
                            </div>
                        )}
                </div>

                {/* Footer Actions */}
                <div className="space-y-5 md:space-y-6 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
                    <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                        <InformationCircleIcon className="w-4 h-4 text-muted-foreground" />
                        Drive timeline events
                    </h3>
                    {!isEditMode ? (
                        <p className="text-xs text-muted-foreground">
                            Publish this listing first, then add timeline milestones like registration dates, exam, result, and interview.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <select
                                    value={newEventType}
                                    onChange={(e) => setNewEventType(e.target.value as TimelineEvent['eventType'])}
                                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                >
                                    <option value="NOTIFICATION">Notification</option>
                                    <option value="REG_START">Registration Start</option>
                                    <option value="REG_END">Registration End</option>
                                    <option value="EXAM_DATE">Exam Date</option>
                                    <option value="RESULT">Result</option>
                                    <option value="INTERVIEW">Interview</option>
                                    <option value="DOC_VERIFICATION">Document Verification</option>
                                    <option value="OTHER">Other</option>
                                </select>
                                <input
                                    type="datetime-local"
                                    value={newEventDate}
                                    onChange={(e) => setNewEventDate(e.target.value)}
                                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                />
                                <input
                                    value={newEventTitle}
                                    onChange={(e) => setNewEventTitle(e.target.value)}
                                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:col-span-2"
                                    placeholder="Event title"
                                />
                                <textarea
                                    rows={2}
                                    value={newEventNotes}
                                    onChange={(e) => setNewEventNotes(e.target.value)}
                                    className="flex min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:col-span-2"
                                    placeholder="Notes (optional)"
                                />
                                <input
                                    value={newEventSourceLink}
                                    onChange={(e) => setNewEventSourceLink(e.target.value)}
                                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:col-span-2"
                                    placeholder="Source link (optional)"
                                />
                            </div>
                            <div className="flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => void handleCreateTimelineEvent()}
                                    disabled={timelineBusyId === 'new'}
                                    className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-60"
                                >
                                    {timelineBusyId === 'new' ? 'Adding...' : 'Add event'}
                                </button>
                            </div>

                            <div className="space-y-3">
                                {timelineLoading ? (
                                    <div className="text-xs text-muted-foreground">Loading timeline...</div>
                                ) : timelineEvents.length === 0 ? (
                                    <div className="text-xs text-muted-foreground">No timeline events yet.</div>
                                ) : timelineEvents.map((event) => (
                                    <div key={event.id} className="border border-border rounded-md p-3 space-y-2">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            <select
                                                value={event.eventType}
                                                onChange={(e) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, eventType: e.target.value as TimelineEvent['eventType'] } : item))}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                            >
                                                <option value="NOTIFICATION">Notification</option>
                                                <option value="REG_START">Registration Start</option>
                                                <option value="REG_END">Registration End</option>
                                                <option value="EXAM_DATE">Exam Date</option>
                                                <option value="RESULT">Result</option>
                                                <option value="INTERVIEW">Interview</option>
                                                <option value="DOC_VERIFICATION">Document Verification</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                            <input
                                                type="datetime-local"
                                                value={event.eventDate}
                                                onChange={(e) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, eventDate: e.target.value } : item))}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                                            />
                                            <input
                                                value={event.title}
                                                onChange={(e) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, title: e.target.value } : item))}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:col-span-2"
                                            />
                                            <textarea
                                                rows={2}
                                                value={event.notes || ''}
                                                onChange={(e) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, notes: e.target.value } : item))}
                                                className="flex min-h-14 w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:col-span-2"
                                                placeholder="Notes"
                                            />
                                            <input
                                                value={event.sourceLink || ''}
                                                onChange={(e) => setTimelineEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, sourceLink: e.target.value } : item))}
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 md:col-span-2"
                                                placeholder="Source link"
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void handleDeleteTimelineEvent(event.id)}
                                                disabled={timelineBusyId === event.id}
                                                className="inline-flex h-9 items-center justify-center rounded-md border border-rose-300 bg-rose-50 px-3 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                                            >
                                                Delete
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleUpdateTimelineEvent(event)}
                                                disabled={timelineBusyId === event.id}
                                                className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-[11px] font-semibold text-foreground hover:bg-accent disabled:opacity-60"
                                            >
                                                {timelineBusyId === event.id ? 'Saving...' : 'Save event'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col md:flex-row items-center justify-end gap-3 pt-5 border-t border-border/50">
                    <Link
                        href="/admin/opportunities"
                        className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-semibold text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus:ring-ring focus:ring-offset-2 w-full md:w-auto order-2 md:order-1"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus:ring-ring focus:ring-offset-2 w-full md:w-auto order-1 md:order-2"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                            <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                        )}
                        {isLoading ? (isEditMode ? 'Updating...' : 'Publishing...') : (isEditMode ? 'Update listing' : 'Publish listing')}
                    </button>
                </div>
            </form>
        </div>
    );
}

import { Suspense } from 'react';

export default function CreateOpportunityPage() {
    return (
        <Suspense fallback={<div className="p-10 text-center text-muted-foreground animate-pulse">Loading editor...</div>}>
            <OpportunityFormPage mode="create" />
        </Suspense>
    );
}
