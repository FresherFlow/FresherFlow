import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminApi } from '@/shared/api/admin';
import { Opportunity, SocialPost } from '@fresherflow/types';
import toast from 'react-hot-toast';
import {
    type OpportunityKind,
    type TimelineEvent,
    type DuplicateOpportunity,
    type ParsedJob,
    tokenSet,
    overlapRatio,
    extractDomain,
    typeParamToEnum,
    normalizeEducationPayload,
    normalizeSalaryPeriodValue,
    normalizePassoutYears,
    normalizeWorkModeValue,
    toStringArray
} from './formUtils';

export function useOpportunityForm(mode: 'create' | 'edit' = 'create', opportunityId?: string) {
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
        type: OpportunityKind;
        slugOrId: string;
        locations: string[];
        allowedPassoutYears: number[];
        allowedCourses: string[];
        allowedDegrees: string[];
    } | null>(null);

    const [duplicateCandidates, setDuplicateCandidates] = useState<Array<DuplicateOpportunity & { score: number }>>([]);
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    const [timelineLoading, setTimelineLoading] = useState(false);
    const [timelineBusyId, setTimelineBusyId] = useState<string | null>(null);
    const [socialPosts, setSocialPosts] = useState<SocialPost[]>([]);

    // Timeline event state
    const [newEventType, setNewEventType] = useState<TimelineEvent['eventType']>('NOTIFICATION');
    const [newEventDate, setNewEventDate] = useState('');
    const [newEventTitle, setNewEventTitle] = useState('');
    const [newEventNotes, setNewEventNotes] = useState('');
    const [newEventSourceLink, setNewEventSourceLink] = useState('');

    // Form state
    const [type, setType] = useState<OpportunityKind>('JOB');
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
    const [sourceLink, setSourceLink] = useState('');
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

    // Picker states
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [startTime, setStartTime] = useState('10:00');
    const [endTime, setEndTime] = useState('13:00');

    const toLocalISOString = (dateInput: Date | string) => {
        const date = new Date(dateInput);
        const tzOffset = date.getTimezoneOffset() * 60000;
        const localTime = new Date(date.getTime() - tzOffset);
        return localTime.toISOString().slice(0, 16);
    };

    useEffect(() => {
        if (isEditMode) return;
        const typeParam = searchParams.get('type');
        if (!typeParam) return;
        const normalized = typeParamToEnum(typeParam);
        if (normalized === 'JOB' || normalized === 'INTERNSHIP' || normalized === 'WALKIN') {
            setType(normalized as OpportunityKind);
        }
    }, [searchParams, isEditMode]);

    const onToggleAmPm = (target: 'AM' | 'PM') => {
        if (!expiresAt) return;
        const [datePart, timePart] = expiresAt.split('T');
        if (!timePart) return;
        const [hourPart, minutePart] = timePart.split(':');
        let hours = parseInt(hourPart, 10);
        if (target === 'AM' && hours >= 12) hours -= 12;
        if (target === 'PM' && hours < 12) hours += 12;
        const newTime = `${String(hours).padStart(2, '0')}:${minutePart}`;
        setExpiresAt(`${datePart}T${newTime}`);
    };

    // Duplicate check logic
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
                const currentApplyDomain = extractDomain(applyLink || sourceLink);

                const scored = opportunities
                    .filter((opp) => opp.id !== opportunityId)
                    .map((opp) => {
                        const titleScore = overlapRatio(titleTokens, tokenSet(opp.title || ''));
                        const companyScore = overlapRatio(companyTokens, tokenSet(opp.company || ''));
                        const candidateDomain = extractDomain(opp.applyLink || opp.sourceLink);
                        const applyDomainScore = currentApplyDomain && candidateDomain && currentApplyDomain === candidateDomain ? 1 : 0;
                        const score = (titleScore * 0.5) + (companyScore * 0.35) + (applyDomainScore * 0.15);
                        return { ...opp, score };
                    })
                    .filter((opp) => opp.score >= 0.45)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 4);
                
                setDuplicateCandidates(scored as Array<DuplicateOpportunity & { score: number }>);
            } catch {
                setDuplicateCandidates([]);
            } finally {
                setCheckingDuplicates(false);
            }
        }, 450);

        return () => clearTimeout(timeoutId);
    }, [title, company, applyLink, sourceLink, opportunityId]);

    const fetchOpportunityForEdit = useCallback(async () => {
        if (!opportunityId) return;
        try {
            const data = await adminApi.getOpportunity(opportunityId) as { opportunity: Opportunity };
            const opp = data.opportunity;

            setType(opp.type as OpportunityKind);
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
            setSourceLink(opp.sourceLink || '');
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

            if (opp.socialPosts) {
                setSocialPosts(opp.socialPosts);
            }
        } catch (err: unknown) {
            toast.error(`Failed to load listing: ${(err as Error).message}`);
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

    const handleCreateTimelineEvent = async () => {
        if (!opportunityId || !newEventDate || !newEventTitle) {
            toast.error('Date and Title are required.');
            return;
        }

        setTimelineBusyId('new');
        try {
            await adminApi.createOpportunityEvent(opportunityId, {
                eventType: newEventType,
                eventDate: new Date(newEventDate).toISOString(),
                title: newEventTitle,
                notes: newEventNotes || undefined,
                sourceLink: newEventSourceLink || undefined
            });
            toast.success('Event added.');
            setNewEventDate('');
            setNewEventTitle('');
            setNewEventNotes('');
            setNewEventSourceLink('');
            void loadTimelineEvents();
        } catch (err: unknown) {
            toast.error(`Failed to add event: ${(err as Error).message}`);
        } finally {
            setTimelineBusyId(null);
        }
    };

    const handleUpdateTimelineEvent = async (event: TimelineEvent) => {
        if (!opportunityId) return;
        setTimelineBusyId(event.id);
        try {
            await adminApi.updateOpportunityEvent(opportunityId, event.id, {
                eventType: event.eventType,
                eventDate: new Date(event.eventDate).toISOString(),
                title: event.title,
                notes: event.notes || undefined,
                sourceLink: event.sourceLink || undefined
            });
            toast.success('Event updated.');
            void loadTimelineEvents();
        } catch (err: unknown) {
            toast.error(`Update failed: ${(err as Error).message}`);
        } finally {
            setTimelineBusyId(null);
        }
    };

    const handleDeleteTimelineEvent = async (id: string) => {
        if (!opportunityId) return;
        if (!confirm('Are you sure?')) return;
        setTimelineBusyId(id);
        try {
            await adminApi.deleteOpportunityEvent(opportunityId, id);
            toast.success('Event deleted.');
            void loadTimelineEvents();
        } catch (err: unknown) {
            toast.error(`Delete failed: ${(err as Error).message}`);
        } finally {
            setTimelineBusyId(null);
        }
    };

    useEffect(() => {
        if (!isEditMode) return;
        void fetchOpportunityForEdit();
        void loadTimelineEvents();
    }, [isEditMode, fetchOpportunityForEdit, loadTimelineEvents]);

    const handleAutoFill = async (text: string) => {
        if (!text.trim()) {
            toast.error('Please paste some job content first');
            return;
        }

        setIsParsing(true);
        const toastId = toast.loading('Auto-filling from text...');

        try {
            const { parsed } = await adminApi.parseJobText(text) as { parsed: ParsedJob };

            if (parsed.title) setTitle(parsed.title);
            if (parsed.company) setCompany(parsed.company);
            if (parsed.companyWebsite) setCompanyWebsite(parsed.companyWebsite);
            if (parsed.type) {
                const normalizedType = typeParamToEnum(String(parsed.type));
                if (normalizedType === 'JOB' || normalizedType === 'INTERNSHIP' || normalizedType === 'WALKIN') {
                    setType(normalizedType as OpportunityKind);
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
            if (parsed.sourceLink) setSourceLink(parsed.sourceLink);
            if (parsed.applyLink) setApplyLink(parsed.applyLink);
            if (parsed.expiresAt) setExpiresAt(parsed.expiresAt);

            setDescription(text);

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

    const applyJsonData = (data: Partial<ParsedJob>) => {
        if (data.type) {
            const normalizedType = typeParamToEnum(String(data.type));
            if (normalizedType === 'JOB' || normalizedType === 'INTERNSHIP' || normalizedType === 'WALKIN') {
                setType(normalizedType as OpportunityKind);
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
        if (data.sourceLink) setSourceLink(String(data.sourceLink));
        if (data.applyLink) setApplyLink(String(data.applyLink));
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
            const walkInRequiredDocuments = toStringArray(data.walkInDetails.requiredDocuments);
            if (walkInRequiredDocuments.length > 0) setRequiredDocuments(walkInRequiredDocuments.join(', '));
            if (data.walkInDetails.contactPerson) setContactPerson(data.walkInDetails.contactPerson);
            if (data.walkInDetails.contactPhone) setContactPhone(data.walkInDetails.contactPhone);
            if (data.walkInDetails.dates?.length) {
                const sorted = [...data.walkInDetails.dates].sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());
                setStartDate(new Date(sorted[0]).toISOString().split('T')[0]);
                setEndDate(new Date(sorted[sorted.length - 1]).toISOString().split('T')[0]);
            }
        }
    };

    return {
        // State
        type, setType,
        title, setTitle,
        company, setCompany,
        companyWebsite, setCompanyWebsite,
        description, setDescription,
        allowedDegrees, setAllowedDegrees,
        allowedCourses, setAllowedCourses,
        allowedSpecializations, setAllowedSpecializations,
        passoutYears, setPassoutYears,
        requiredSkills, setRequiredSkills,
        locations, setLocations,
        workMode, setWorkMode,
        salaryRange, setSalaryRange,
        salaryAmount, setSalaryAmount,
        sourceLink, setSourceLink,
        applyLink, setApplyLink,
        expiresAt, setExpiresAt,
        jobFunction, setJobFunction,
        employmentType, setEmploymentType,
        incentives, setIncentives,
        selectionProcess, setSelectionProcess,
        notesHighlights, setNotesHighlights,
        salaryPeriod, setSalaryPeriod,
        experienceMin, setExperienceMin,
        experienceMax, setExperienceMax,
        venueAddress, setVenueAddress,
        walkInDateRange, setWalkInDateRange,
        walkInTimeRange, setWalkInTimeRange,
        venueLink, setVenueLink,
        requiredDocuments, setRequiredDocuments,
        contactPerson, setContactPerson,
        contactPhone, setContactPhone,
        startDate, setStartDate,
        endDate, setEndDate,
        startTime, setStartTime,
        endTime, setEndTime,
        
        // UI State
        isLoading, setIsLoading,
        isParsing, setIsParsing,
        pastedText, setPastedText,
        pastedJson, setPastedJson,
        showParser, setShowParser,
        publishedListing, setPublishedListing,
        duplicateCandidates, setDuplicateCandidates,
        checkingDuplicates, setCheckingDuplicates,
        timelineEvents, setTimelineEvents,
        timelineLoading, setTimelineLoading,
        timelineBusyId, setTimelineBusyId,
        socialPosts, setSocialPosts,
        
        // Handlers
        handleAutoFill,
        applyJsonData,
        loadTimelineEvents,
        fetchOpportunityForEdit,
        onToggleAmPm,
        handleCreateTimelineEvent,
        handleUpdateTimelineEvent,
        handleDeleteTimelineEvent,
        newEventType, setNewEventType,
        newEventDate, setNewEventDate,
        newEventTitle, setNewEventTitle,
        newEventNotes, setNewEventNotes,
        newEventSourceLink, setNewEventSourceLink
    };
}





