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

function parseExpiryDateTime(val: string | Date) {
    const expiresAtStr = typeof val === 'string' ? val : val.toISOString();
    const hasTime = /[T\s]/.test(expiresAtStr) && /:/.test(expiresAtStr) && !expiresAtStr.includes('T00:00:00');
    const dateObj = new Date(val);
    if (isNaN(dateObj.getTime())) return null;

    if (!hasTime) {
        const y = dateObj.getUTCFullYear();
        const m = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dateObj.getUTCDate()).padStart(2, '0');
        return { date: `${y}-${m}-${d}`, time: '' };
    }

    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    const localObj = new Date(dateObj.getTime() - tzOffset);
    const isoStr = localObj.toISOString();
    const datePart = isoStr.slice(0, 10);
    const timePart = isoStr.slice(11, 16);
    return {
        date: datePart,
        time: timePart === '23:59' ? '' : timePart
    };
}

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
    const [companyLogoUrl, setCompanyLogoUrl] = useState('');
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
    const [showUrlError, setShowUrlError] = useState(false);
    const [expiryDate, setExpiryDate] = useState('');
    const [expiryTime, setExpiryTime] = useState('');
    const [jobFunction, setJobFunction] = useState('');
    const [employmentType, setEmploymentType] = useState('');
    const [incentives, setIncentives] = useState('');
    const [selectionProcess, setSelectionProcess] = useState('');
    const [notesHighlights, setNotesHighlights] = useState('');
    const [salaryPeriod, setSalaryPeriod] = useState<'YEARLY' | 'MONTHLY'>('YEARLY');
    const [experienceMin, setExperienceMin] = useState('');
    const [experienceMax, setExperienceMax] = useState('');
    const [customSlug, setCustomSlug] = useState('');
    const [isGovernmentJob, setIsGovernmentJob] = useState(false);
    const [governmentTags, setGovernmentTags] = useState('');
    const [governmentDepartment, setGovernmentDepartment] = useState('');
    const [governmentOrganization, setGovernmentOrganization] = useState('');
    const [recruitingBody, setRecruitingBody] = useState('');
    const [applicationStatus, setApplicationStatus] = useState<string>('OPEN');
    const [governmentLevel, setGovernmentLevel] = useState<string>('CENTRAL');
    const [vacancyNature, setVacancyNature] = useState<string>('PERMANENT');
    const [jobCategory, setJobCategory] = useState<string>('');
    const [officialWebsiteUrl, setOfficialWebsiteUrl] = useState('');
    const [officialNotificationUrl, setOfficialNotificationUrl] = useState('');
    const [advertisementNumber, setAdvertisementNumber] = useState('');
    const [postName, setPostName] = useState('');
    const [applicationMode, setApplicationMode] = useState('');
    const [applicationEndDate, setApplicationEndDate] = useState('');
    const [examDate, setExamDate] = useState('');
    const [vacancyCount, setVacancyCount] = useState('');
    const [vacancyBreakdownJson, setVacancyBreakdownJson] = useState('');
    const [applicationFee, setApplicationFee] = useState('');
    const [applicationFeeJson, setApplicationFeeJson] = useState('');
    const [ageMin, setAgeMin] = useState('');
    const [ageMax, setAgeMax] = useState('');
    const [ageRelaxation, setAgeRelaxation] = useState('');
    const [eligibilityDetailsJson, setEligibilityDetailsJson] = useState('');
    const [reservationNotes, setReservationNotes] = useState('');
    const [importantInstructions, setImportantInstructions] = useState('');
    const [applicationStartDate, setApplicationStartDate] = useState('');
    const [notificationIssuedDate, setNotificationIssuedDate] = useState('');
    const [examDatesJson, setExamDatesJson] = useState('');
    const [admitCardDate, setAdmitCardDate] = useState('');
    const [resultDate, setResultDate] = useState('');
    const [selectionStages, setSelectionStages] = useState('');
    const [governmentRequiredDocuments, setGovernmentRequiredDocuments] = useState('');
    const [governmentRequiredDocumentsJson, setGovernmentRequiredDocumentsJson] = useState('');
    const [examCenters, setExamCenters] = useState('');
    const [examPatternJson, setExamPatternJson] = useState('');
    const [skillTestsJson, setSkillTestsJson] = useState('');
    const [examStagesJson, setExamStagesJson] = useState('');
    const [importantDatesJson, setImportantDatesJson] = useState('');
    const [qualificationDetailsJson, setQualificationDetailsJson] = useState('');
    const [physicalStandardsJson, setPhysicalStandardsJson] = useState('');
    const [extraMetadataJson, setExtraMetadataJson] = useState('');
    const [feeBreakdownJson, setFeeBreakdownJson] = useState('');
    const [ageRelaxationRulesJson, setAgeRelaxationRulesJson] = useState('');
    const [officialSourceVerified, setOfficialSourceVerified] = useState(false);
    const [notificationPdfUrl, setNotificationPdfUrl] = useState('');
    const [admitCardUrl, setAdmitCardUrl] = useState('');
    const [resultUrl, setResultUrl] = useState('');
    const [answerKeyUrl, setAnswerKeyUrl] = useState('');
    const [syllabusUrl, setSyllabusUrl] = useState('');
    const [previousPapersUrl, setPreviousPapersUrl] = useState('');
    const [examName, setExamName] = useState('');
    const [categoryVacanciesJson, setCategoryVacanciesJson] = useState('');
    const [cadreDetailsJson, setCadreDetailsJson] = useState('');
    const [postPreferencesJson, setPostPreferencesJson] = useState('');
    const [serviceBondJson, setServiceBondJson] = useState('');
    const [reservationDetailsJson, setReservationDetailsJson] = useState('');
    const [referenceLinksJson, setReferenceLinksJson] = useState('');
    const [cutOffMarksJson, setCutOffMarksJson] = useState('');
    const [basicPay, setBasicPay] = useState('');
    const [payLevel, setPayLevel] = useState('');
    const [allowances, setAllowances] = useState('');

    // Walk-in specific
    const [venueAddress, setVenueAddress] = useState('');
    const [walkInDateRange, setWalkInDateRange] = useState('');
    const [walkInTimeRange, setWalkInTimeRange] = useState('');
    const [venueLink, setVenueLink] = useState('');
    const [requiredDocuments, setRequiredDocuments] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [contactPhone, setContactPhone] = useState('');

    // Application Details (Complexity)
    const [appMethod, setAppMethod] = useState<'DIRECT' | 'FORM' | 'ASSESSMENT'>('DIRECT');
    const [appPlatform, setAppPlatform] = useState('');
    const [appDuration, setAppDuration] = useState('');
    const [appRequiredItems, setAppRequiredItems] = useState<string[]>([]);

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

    useEffect(() => {
        if (sourceLink.trim() || applyLink.trim()) {
            setShowUrlError(false);
        }
    }, [sourceLink, applyLink]);

    const onToggleAmPm = (target: 'AM' | 'PM') => {
        const timePart = expiryTime || '23:59';
        const [hourPart, minutePart] = timePart.split(':');
        let hours = parseInt(hourPart, 10);
        if (target === 'AM' && hours >= 12) hours -= 12;
        if (target === 'PM' && hours < 12) hours += 12;
        setExpiryTime(`${String(hours).padStart(2, '0')}:${minutePart}`);
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
            setCompanyLogoUrl(opp.companyLogoUrl || '');
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
            setGovernmentTags((opp.tags || []).join(', '));
            setSourceLink(opp.sourceLink || '');
            setApplyLink(opp.applyLink || '');
            if (opp.expiresAt) {
                const parsedResult = parseExpiryDateTime(opp.expiresAt);
                if (parsedResult) {
                    setExpiryDate(parsedResult.date);
                    setExpiryTime(parsedResult.time);
                } else {
                    setExpiryDate('');
                    setExpiryTime('');
                }
            } else {
                setExpiryDate('');
                setExpiryTime('');
            }
            setCustomSlug(opp.slug || '');

            if (opp.governmentJobDetails) {
                setIsGovernmentJob(true);
                setGovernmentDepartment(opp.governmentJobDetails.department || '');
                setGovernmentOrganization(opp.governmentJobDetails.organization || '');
                setRecruitingBody(opp.governmentJobDetails.recruitingBody || '');
                setApplicationStatus(opp.governmentJobDetails.applicationStatus || 'OPEN');
                setGovernmentLevel(opp.governmentJobDetails.governmentLevel || 'CENTRAL');
                setVacancyNature(opp.governmentJobDetails.vacancyNature || 'PERMANENT');
                setJobCategory((opp.governmentJobDetails.jobCategory || []).join(', '));
                setOfficialWebsiteUrl(opp.governmentJobDetails.officialWebsiteUrl || '');
                setOfficialNotificationUrl(opp.governmentJobDetails.officialNotificationUrl || '');
                setAdvertisementNumber(opp.governmentJobDetails.advertisementNumber || '');
                setApplicationMode(opp.governmentJobDetails.applicationMode || '');
                setNotificationIssuedDate(opp.governmentJobDetails.notificationIssuedDate || '');
                setVacancyCount(opp.governmentJobDetails.vacancyCount?.toString() || '');
                setVacancyBreakdownJson(opp.governmentJobDetails.vacancyBreakdown ? JSON.stringify(opp.governmentJobDetails.vacancyBreakdown, null, 2) : '');
                setApplicationFee(opp.governmentJobDetails.applicationFee || '');
                setApplicationFeeJson(opp.governmentJobDetails.applicationFeeDetails ? JSON.stringify(opp.governmentJobDetails.applicationFeeDetails, null, 2) : '');
                setAgeMin(opp.governmentJobDetails.ageMin?.toString() || '');
                setAgeMax(opp.governmentJobDetails.ageMax?.toString() || '');
                setAgeRelaxation(opp.governmentJobDetails.ageRelaxation || '');
                setEligibilityDetailsJson(opp.governmentJobDetails.eligibilityDetails ? JSON.stringify(opp.governmentJobDetails.eligibilityDetails, null, 2) : '');
                setReservationNotes(opp.governmentJobDetails.reservationNotes || '');
                setImportantInstructions(opp.governmentJobDetails.importantInstructions || '');
                setApplicationStartDate(opp.governmentJobDetails.applicationStartDate || '');
                setApplicationEndDate(opp.governmentJobDetails.applicationEndDate || '');
                setExamDate(opp.governmentJobDetails.examDate || '');
                setExamDatesJson(opp.governmentJobDetails.examDates ? JSON.stringify(opp.governmentJobDetails.examDates, null, 2) : '');
                setAdmitCardDate(opp.governmentJobDetails.admitCardDate || '');
                setResultDate(opp.governmentJobDetails.resultDate || '');
                setSelectionStages((opp.governmentJobDetails.selectionStages || []).join(', '));
                setGovernmentRequiredDocuments((opp.governmentJobDetails.requiredDocuments || []).join(', '));
                setGovernmentRequiredDocumentsJson(opp.governmentJobDetails.requiredDocumentDetails ? JSON.stringify(opp.governmentJobDetails.requiredDocumentDetails, null, 2) : '');
                setExamCenters((opp.governmentJobDetails.examCenters || []).join(', '));
                setExamPatternJson(opp.governmentJobDetails.examPattern ? JSON.stringify(opp.governmentJobDetails.examPattern, null, 2) : '');
                setSkillTestsJson(opp.governmentJobDetails.skillTests ? JSON.stringify(opp.governmentJobDetails.skillTests, null, 2) : '');
                setExamStagesJson(opp.governmentJobDetails.examStages ? JSON.stringify(opp.governmentJobDetails.examStages, null, 2) : '');
                setImportantDatesJson(opp.governmentJobDetails.importantDates ? JSON.stringify(opp.governmentJobDetails.importantDates, null, 2) : '');
                setQualificationDetailsJson(opp.governmentJobDetails.qualificationDetails ? JSON.stringify(opp.governmentJobDetails.qualificationDetails, null, 2) : '');
                setPhysicalStandardsJson(opp.governmentJobDetails.physicalStandards ? JSON.stringify(opp.governmentJobDetails.physicalStandards, null, 2) : '');
                setExtraMetadataJson(opp.governmentJobDetails.extraMetadata ? JSON.stringify(opp.governmentJobDetails.extraMetadata, null, 2) : '');
                setFeeBreakdownJson(opp.governmentJobDetails.feeBreakdown ? JSON.stringify(opp.governmentJobDetails.feeBreakdown, null, 2) : '');
                setAgeRelaxationRulesJson(opp.governmentJobDetails.ageRelaxationRules ? JSON.stringify(opp.governmentJobDetails.ageRelaxationRules, null, 2) : '');
                setOfficialSourceVerified(opp.governmentJobDetails.officialSourceVerified || false);
                setNotificationPdfUrl(opp.governmentJobDetails.notificationPdfUrl || '');
                setAdmitCardUrl(opp.governmentJobDetails.admitCardUrl || '');
                setResultUrl(opp.governmentJobDetails.resultUrl || '');
                setAnswerKeyUrl(opp.governmentJobDetails.answerKeyUrl || '');
                setSyllabusUrl(opp.governmentJobDetails.syllabusUrl || '');
                setPreviousPapersUrl(opp.governmentJobDetails.previousPapersUrl || '');
                setExamName(opp.governmentJobDetails.examName || '');
                setCategoryVacanciesJson(opp.governmentJobDetails.categoryVacancies ? JSON.stringify(opp.governmentJobDetails.categoryVacancies, null, 2) : '');
                setCadreDetailsJson(opp.governmentJobDetails.cadreDetails ? JSON.stringify(opp.governmentJobDetails.cadreDetails, null, 2) : '');
                setPostPreferencesJson(opp.governmentJobDetails.postPreferences ? JSON.stringify(opp.governmentJobDetails.postPreferences, null, 2) : '');
                setServiceBondJson(opp.governmentJobDetails.serviceBond ? JSON.stringify(opp.governmentJobDetails.serviceBond, null, 2) : '');
                setReservationDetailsJson(opp.governmentJobDetails.reservationDetails ? JSON.stringify(opp.governmentJobDetails.reservationDetails, null, 2) : '');
                setReferenceLinksJson(opp.governmentJobDetails.referenceLinks ? JSON.stringify(opp.governmentJobDetails.referenceLinks, null, 2) : '');
                setCutOffMarksJson(opp.governmentJobDetails.cutOffMarks ? JSON.stringify(opp.governmentJobDetails.cutOffMarks, null, 2) : '');
                setBasicPay(opp.governmentJobDetails.basicPay?.toString() || '');
                setPayLevel(opp.governmentJobDetails.payLevel || '');
                setAllowances((opp.governmentJobDetails.allowances || []).join(', '));
            } else {
                setIsGovernmentJob(false);
            }

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

            if (opp.applicationDetails) {
                setAppMethod(opp.applicationDetails.method || 'DIRECT');
                setAppPlatform(opp.applicationDetails.platform || '');
                setAppDuration(opp.applicationDetails.estimatedMinutes?.toString() || '');
                setAppRequiredItems(opp.applicationDetails.requiredItems || []);
            } else {
                setAppMethod('DIRECT');
                setAppPlatform('');
                setAppDuration('');
                setAppRequiredItems([]);
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
            if (parsed.expiresAt) {
                const parsedResult = parseExpiryDateTime(parsed.expiresAt);
                if (parsedResult) {
                    setExpiryDate(parsedResult.date);
                    setExpiryTime(parsedResult.time);
                }
            }

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
        if ((data as any).companyLogoUrl) setCompanyLogoUrl((data as any).companyLogoUrl);
        if (data.description) setDescription(String(data.description));
        const parsedEducation = normalizeEducationPayload(data.allowedDegrees, data.allowedCourses, data.allowedSpecializations);
        setAllowedDegrees(parsedEducation.degrees);
        setAllowedCourses(parsedEducation.courses);
        setAllowedSpecializations(parsedEducation.specializations);
        setPassoutYears(normalizePassoutYears(data.allowedPassoutYears));
        const requiredSkillsValues = toStringArray(data.requiredSkills);
        if (requiredSkillsValues.length > 0) setRequiredSkills(requiredSkillsValues.join(', '));
        const tagValues = toStringArray(data.tags);
        if (tagValues.length > 0) setGovernmentTags(tagValues.join(', '));
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
        if (data.expiresAt) {
            const parsedResult = parseExpiryDateTime(data.expiresAt);
            if (parsedResult) {
                setExpiryDate(parsedResult.date);
                setExpiryTime(parsedResult.time);
            }
        }
        if ((data as any).slug) setCustomSlug(String((data as any).slug));
        if ((data as any).customSlug) setCustomSlug(String((data as any).customSlug));
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

        if (data.governmentJobDetails) {
            setIsGovernmentJob(true);
            if (data.governmentJobDetails.department) setGovernmentDepartment(String(data.governmentJobDetails.department));
            if (data.governmentJobDetails.organization) setGovernmentOrganization(String(data.governmentJobDetails.organization));
            if (data.governmentJobDetails.recruitingBody) setRecruitingBody(String(data.governmentJobDetails.recruitingBody));
            if (data.governmentJobDetails.applicationStatus) setApplicationStatus(String(data.governmentJobDetails.applicationStatus));
            if (data.governmentJobDetails.governmentLevel) setGovernmentLevel(String(data.governmentJobDetails.governmentLevel));
            if (data.governmentJobDetails.vacancyNature) setVacancyNature(String(data.governmentJobDetails.vacancyNature));
            const categoryValues = toStringArray(data.governmentJobDetails.jobCategory);
            if (categoryValues.length > 0) setJobCategory(categoryValues.join(', '));
            if (data.governmentJobDetails.officialWebsiteUrl) setOfficialWebsiteUrl(String(data.governmentJobDetails.officialWebsiteUrl));
            if (data.governmentJobDetails.officialNotificationUrl) setOfficialNotificationUrl(String(data.governmentJobDetails.officialNotificationUrl));
            if (data.governmentJobDetails.advertisementNumber) setAdvertisementNumber(String(data.governmentJobDetails.advertisementNumber));
            if (data.governmentJobDetails.applicationMode) setApplicationMode(String(data.governmentJobDetails.applicationMode));
            if (data.governmentJobDetails.notificationIssuedDate) setNotificationIssuedDate(String(data.governmentJobDetails.notificationIssuedDate));
            if (data.governmentJobDetails.vacancyCount !== undefined) setVacancyCount(String(data.governmentJobDetails.vacancyCount));
            if (data.governmentJobDetails.vacancyBreakdown) setVacancyBreakdownJson(JSON.stringify(data.governmentJobDetails.vacancyBreakdown, null, 2));
            if (data.governmentJobDetails.applicationFee) setApplicationFee(String(data.governmentJobDetails.applicationFee));
            if (data.governmentJobDetails.applicationFeeDetails) setApplicationFeeJson(JSON.stringify(data.governmentJobDetails.applicationFeeDetails, null, 2));
            if (data.governmentJobDetails.ageMin !== undefined) setAgeMin(String(data.governmentJobDetails.ageMin));
            if (data.governmentJobDetails.ageMax !== undefined) setAgeMax(String(data.governmentJobDetails.ageMax));
            if (data.governmentJobDetails.ageRelaxation) setAgeRelaxation(String(data.governmentJobDetails.ageRelaxation));
            if (data.governmentJobDetails.eligibilityDetails) setEligibilityDetailsJson(JSON.stringify(data.governmentJobDetails.eligibilityDetails, null, 2));
            if (data.governmentJobDetails.reservationNotes) setReservationNotes(String(data.governmentJobDetails.reservationNotes));
            if (data.governmentJobDetails.importantInstructions) setImportantInstructions(String(data.governmentJobDetails.importantInstructions));
            if (data.governmentJobDetails.applicationStartDate) setApplicationStartDate(String(data.governmentJobDetails.applicationStartDate));
            if (data.governmentJobDetails.applicationEndDate) setApplicationEndDate(String(data.governmentJobDetails.applicationEndDate));
            if (data.governmentJobDetails.examDate) setExamDate(String(data.governmentJobDetails.examDate));
            if (data.governmentJobDetails.examDates) setExamDatesJson(JSON.stringify(data.governmentJobDetails.examDates, null, 2));
            if (data.governmentJobDetails.admitCardDate) setAdmitCardDate(String(data.governmentJobDetails.admitCardDate));
            if (data.governmentJobDetails.resultDate) setResultDate(String(data.governmentJobDetails.resultDate));
            const stageValues = toStringArray(data.governmentJobDetails.selectionStages);
            if (stageValues.length > 0) setSelectionStages(stageValues.join(', '));
            const docValues = toStringArray(data.governmentJobDetails.requiredDocuments);
            if (docValues.length > 0) setGovernmentRequiredDocuments(docValues.join(', '));
            if (data.governmentJobDetails.requiredDocumentDetails) setGovernmentRequiredDocumentsJson(JSON.stringify(data.governmentJobDetails.requiredDocumentDetails, null, 2));
            const seoTagValues = toStringArray(data.governmentJobDetails.seoTags);
            if (seoTagValues.length > 0) setGovernmentTags(seoTagValues.join(', '));
            const examCentersList = toStringArray(data.governmentJobDetails.examCenters);
            if (examCentersList.length > 0) setExamCenters(examCentersList.join(', '));
            if (data.governmentJobDetails.examPattern) setExamPatternJson(JSON.stringify(data.governmentJobDetails.examPattern, null, 2));
            if ((data.governmentJobDetails as any).skillTests) setSkillTestsJson(JSON.stringify((data.governmentJobDetails as any).skillTests, null, 2));
            if ((data.governmentJobDetails as any).examStages) setExamStagesJson(JSON.stringify((data.governmentJobDetails as any).examStages, null, 2));
            if (data.governmentJobDetails.importantDates) setImportantDatesJson(JSON.stringify(data.governmentJobDetails.importantDates, null, 2));
            if (data.governmentJobDetails.qualificationDetails) setQualificationDetailsJson(JSON.stringify(data.governmentJobDetails.qualificationDetails, null, 2));
            if (data.governmentJobDetails.physicalStandards) setPhysicalStandardsJson(JSON.stringify(data.governmentJobDetails.physicalStandards, null, 2));
            if (data.governmentJobDetails.extraMetadata) setExtraMetadataJson(JSON.stringify(data.governmentJobDetails.extraMetadata, null, 2));
            if (data.governmentJobDetails.feeBreakdown) setFeeBreakdownJson(JSON.stringify(data.governmentJobDetails.feeBreakdown, null, 2));
            if (data.governmentJobDetails.ageRelaxationRules) setAgeRelaxationRulesJson(JSON.stringify(data.governmentJobDetails.ageRelaxationRules, null, 2));
            if (data.governmentJobDetails.officialSourceVerified !== undefined) setOfficialSourceVerified(Boolean(data.governmentJobDetails.officialSourceVerified));
            if (data.governmentJobDetails.notificationPdfUrl) setNotificationPdfUrl(String(data.governmentJobDetails.notificationPdfUrl));
            if (data.governmentJobDetails.admitCardUrl) setAdmitCardUrl(String(data.governmentJobDetails.admitCardUrl));
            if (data.governmentJobDetails.resultUrl) setResultUrl(String(data.governmentJobDetails.resultUrl));
            if (data.governmentJobDetails.answerKeyUrl) setAnswerKeyUrl(String(data.governmentJobDetails.answerKeyUrl));
            if (data.governmentJobDetails.syllabusUrl) setSyllabusUrl(String(data.governmentJobDetails.syllabusUrl));
            if (data.governmentJobDetails.previousPapersUrl) setPreviousPapersUrl(String(data.governmentJobDetails.previousPapersUrl));
            if (data.governmentJobDetails.examName) setExamName(String(data.governmentJobDetails.examName));
            if (data.governmentJobDetails.categoryVacancies) setCategoryVacanciesJson(JSON.stringify(data.governmentJobDetails.categoryVacancies, null, 2));
            if (data.governmentJobDetails.cadreDetails) setCadreDetailsJson(JSON.stringify(data.governmentJobDetails.cadreDetails, null, 2));
            if (data.governmentJobDetails.postPreferences) setPostPreferencesJson(JSON.stringify(data.governmentJobDetails.postPreferences, null, 2));
            if (data.governmentJobDetails.serviceBond) setServiceBondJson(JSON.stringify(data.governmentJobDetails.serviceBond, null, 2));
            if (data.governmentJobDetails.reservationDetails) setReservationDetailsJson(JSON.stringify(data.governmentJobDetails.reservationDetails, null, 2));
            if (data.governmentJobDetails.referenceLinks) setReferenceLinksJson(JSON.stringify(data.governmentJobDetails.referenceLinks, null, 2));
            if (data.governmentJobDetails.cutOffMarks) setCutOffMarksJson(JSON.stringify(data.governmentJobDetails.cutOffMarks, null, 2));
            if (data.governmentJobDetails.basicPay !== undefined) setBasicPay(String(data.governmentJobDetails.basicPay));
            if (data.governmentJobDetails.payLevel) setPayLevel(String(data.governmentJobDetails.payLevel));
            const allowanceValues = toStringArray((data.governmentJobDetails as any).allowances);
            if (allowanceValues.length > 0) setAllowances(allowanceValues.join(', '));
        }

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

        const appDetails = (data as any).applicationDetails;
        if (appDetails) {
            if (appDetails.method) setAppMethod(appDetails.method);
            if (appDetails.platform) setAppPlatform(appDetails.platform);
            if (appDetails.estimatedMinutes !== undefined) setAppDuration(String(appDetails.estimatedMinutes));
            if (appDetails.requiredItems) setAppRequiredItems(appDetails.requiredItems);
        }
    };

    const clearAllFields = () => {
        setType('JOB');
        setTitle('');
        setCompany('');
        setCompanyWebsite('');
        setCompanyLogoUrl('');
        setDescription('');
        setAllowedDegrees([]);
        setAllowedCourses([]);
        setAllowedSpecializations([]);
        setPassoutYears([]);
        setRequiredSkills('');
        setLocations('');
        setWorkMode('ONSITE');
        setSalaryRange('');
        setSalaryAmount('');
        setSourceLink('');
        setApplyLink('');
        setExpiryDate('');
        setExpiryTime('');
        setCustomSlug('');
        setJobFunction('');
        setEmploymentType('');
        setIncentives('');
        setSelectionProcess('');
        setNotesHighlights('');
        setSalaryPeriod('YEARLY');
        setExperienceMin('');
        setExperienceMax('');
        setIsGovernmentJob(false);
        setGovernmentTags('');
        setGovernmentDepartment('');
        setRecruitingBody('');
        setExamName('');
        setCategoryVacanciesJson('');
        setCadreDetailsJson('');
        setPostPreferencesJson('');
        setServiceBondJson('');
        setReservationDetailsJson('');
        setReferenceLinksJson('');
        setCutOffMarksJson('');
        setApplicationStatus('OPEN');
        setGovernmentLevel('CENTRAL');
        setVacancyNature('PERMANENT');
        setJobCategory('');
        setOfficialWebsiteUrl('');
        setOfficialNotificationUrl('');
        setAdvertisementNumber('');
        setApplicationMode('');
        setVacancyCount('');
        setVacancyBreakdownJson('');
        setApplicationFee('');
        setApplicationFeeJson('');
        setAgeMin('');
        setAgeMax('');
        setAgeRelaxation('');
        setEligibilityDetailsJson('');
        setReservationNotes('');
        setImportantInstructions('');
        setApplicationStartDate('');
        setApplicationEndDate('');
        setExamDate('');
        setExamDatesJson('');
        setAdmitCardDate('');
        setResultDate('');
        setSelectionStages('');
        setGovernmentRequiredDocuments('');
        setGovernmentRequiredDocumentsJson('');
        setExamCenters('');
        setExamPatternJson('');
        setSkillTestsJson('');
        setExamStagesJson('');
        setImportantDatesJson('');
        setQualificationDetailsJson('');
        setPhysicalStandardsJson('');
        setExtraMetadataJson('');
        setFeeBreakdownJson('');
        setAgeRelaxationRulesJson('');
        setOfficialSourceVerified(false);
        setNotificationPdfUrl('');
        setAdmitCardUrl('');
        setResultUrl('');
        setAnswerKeyUrl('');
        setSyllabusUrl('');
        setPreviousPapersUrl('');
        setBasicPay('');
        setPayLevel('');
        setAllowances('');
        setVenueAddress('');
        setWalkInDateRange('');
        setWalkInTimeRange('');
        setVenueLink('');
        setRequiredDocuments('');
        setContactPerson('');
        setContactPhone('');
        setStartDate('');
        setEndDate('');
        setStartTime('10:00');
        setEndTime('13:00');
        setPastedText('');
        setPastedJson('');
        setAppMethod('DIRECT');
        setAppPlatform('');
        setAppDuration('');
        setAppRequiredItems([]);
        setShowUrlError(false);
    };

    return {
        // State
        clearAllFields,
        type, setType,
        title, setTitle,
        company, setCompany,
        companyWebsite, setCompanyWebsite,
        companyLogoUrl, setCompanyLogoUrl,
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
        showUrlError, setShowUrlError,
        expiryDate, setExpiryDate,
        expiryTime, setExpiryTime,
        customSlug, setCustomSlug,
        jobFunction, setJobFunction,
        employmentType, setEmploymentType,
        incentives, setIncentives,
        selectionProcess, setSelectionProcess,
        notesHighlights, setNotesHighlights,
        salaryPeriod, setSalaryPeriod,
        experienceMin, setExperienceMin,
        experienceMax, setExperienceMax,
        isGovernmentJob, setIsGovernmentJob,
        governmentTags, setGovernmentTags,
        governmentDepartment, setGovernmentDepartment,
        governmentOrganization, setGovernmentOrganization,
        recruitingBody, setRecruitingBody,
        applicationStatus, setApplicationStatus,
        governmentLevel, setGovernmentLevel,
        vacancyNature, setVacancyNature,
        jobCategory, setJobCategory,
        officialWebsiteUrl, setOfficialWebsiteUrl,
        officialNotificationUrl, setOfficialNotificationUrl,
        advertisementNumber, setAdvertisementNumber,
        postName, setPostName,
        applicationMode, setApplicationMode,
        applicationEndDate, setApplicationEndDate,
        examDate, setExamDate,
        vacancyCount, setVacancyCount,
        vacancyBreakdownJson, setVacancyBreakdownJson,
        notificationIssuedDate, setNotificationIssuedDate,
        applicationFee, setApplicationFee,
        applicationFeeJson, setApplicationFeeJson,
        ageMin, setAgeMin,
        ageMax, setAgeMax,
        ageRelaxation, setAgeRelaxation,
        eligibilityDetailsJson, setEligibilityDetailsJson,
        reservationNotes, setReservationNotes,
        importantInstructions, setImportantInstructions,
        applicationStartDate, setApplicationStartDate,
        examDatesJson, setExamDatesJson,
        admitCardDate, setAdmitCardDate,
        resultDate, setResultDate,
        selectionStages, setSelectionStages,
        governmentRequiredDocuments, setGovernmentRequiredDocuments,
        governmentRequiredDocumentsJson, setGovernmentRequiredDocumentsJson,
        examCenters, setExamCenters,
        examPatternJson, setExamPatternJson,
        skillTestsJson, setSkillTestsJson,
        examStagesJson, setExamStagesJson,
        importantDatesJson, setImportantDatesJson,
        qualificationDetailsJson, setQualificationDetailsJson,
        physicalStandardsJson, setPhysicalStandardsJson,
        extraMetadataJson, setExtraMetadataJson,
        feeBreakdownJson, setFeeBreakdownJson,
        ageRelaxationRulesJson, setAgeRelaxationRulesJson,
        officialSourceVerified, setOfficialSourceVerified,
        notificationPdfUrl, setNotificationPdfUrl,
        admitCardUrl, setAdmitCardUrl,
        resultUrl, setResultUrl,
        answerKeyUrl, setAnswerKeyUrl,
        syllabusUrl, setSyllabusUrl,
        previousPapersUrl, setPreviousPapersUrl,
        examName, setExamName,
        categoryVacanciesJson, setCategoryVacanciesJson,
        cadreDetailsJson, setCadreDetailsJson,
        postPreferencesJson, setPostPreferencesJson,
        serviceBondJson, setServiceBondJson,
        reservationDetailsJson, setReservationDetailsJson,
        referenceLinksJson, setReferenceLinksJson,
        cutOffMarksJson, setCutOffMarksJson,
        basicPay, setBasicPay,
        payLevel, setPayLevel,
        allowances, setAllowances,
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

        // Application Details (Complexity)
        appMethod, setAppMethod,
        appPlatform, setAppPlatform,
        appDuration, setAppDuration,
        appRequiredItems, setAppRequiredItems,

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
