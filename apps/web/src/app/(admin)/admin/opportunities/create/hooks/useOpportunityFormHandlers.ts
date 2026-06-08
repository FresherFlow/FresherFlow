import { useRouter } from 'next/navigation';
import { adminApi } from '@/shared/api/admin';
import toast from 'react-hot-toast';
import { buildOpportunityPayload } from '../../opportunityPayload';
import { buildAdminSharePack, buildPlatformCaption, type OpportunityKind, type SharePlatform } from '@/features/admin/opportunities/formUtils';
import { useOpportunityForm } from '@/features/admin/opportunities/useOpportunityForm';
import { Opportunity } from '@fresherflow/types';

export function useOpportunityFormHandlers(form: ReturnType<typeof useOpportunityForm>, mode: 'create' | 'edit', opportunityId?: string) {
    const router = useRouter();
    const isEditMode = mode === 'edit' && !!opportunityId;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.type !== 'WALKIN' && !form.sourceLink.trim() && !form.applyLink.trim()) {
            form.setShowUrlError(true);
            toast.error('At least one of Source URL or Apply URL is required.');
            return;
        }

        const payload = buildOpportunityPayload({
            type: form.type,
            title: form.title,
            company: form.company,
            companyWebsite: form.companyWebsite,
            companyLogoUrl: form.companyLogoUrl,
            description: form.description,
            locations: form.locations,
            requiredSkills: form.requiredSkills,
            allowedDegrees: form.allowedDegrees,
            allowedCourses: form.allowedCourses,
            allowedSpecializations: form.allowedSpecializations,
            passoutYears: form.passoutYears,
            workMode: form.workMode,
            salaryRange: form.salaryRange,
            salaryAmount: form.salaryAmount,
            salaryPeriod: form.salaryPeriod,
            jobFunction: form.jobFunction,
            employmentType: form.employmentType,
            incentives: form.incentives,
            selectionProcess: form.selectionProcess,
            notesHighlights: form.notesHighlights,
            isGovernmentJob: form.isGovernmentJob,
            governmentTags: form.governmentTags,
            governmentDepartment: form.governmentDepartment,
            governmentOrganization: form.governmentOrganization,
            recruitingBody: form.recruitingBody,
            applicationStatus: form.applicationStatus,
            governmentLevel: form.governmentLevel,
            vacancyNature: form.vacancyNature,
            jobCategory: form.jobCategory,
            officialWebsiteUrl: form.officialWebsiteUrl,
            officialNotificationUrl: form.officialNotificationUrl,
            advertisementNumber: form.advertisementNumber,
            postName: form.postName,
            applicationMode: form.applicationMode,
            vacancyCount: form.vacancyCount,
            vacancyBreakdownJson: form.vacancyBreakdownJson,
            applicationFee: form.applicationFee,
            applicationFeeJson: form.applicationFeeJson,
            ageMin: form.ageMin,
            ageMax: form.ageMax,
            ageRelaxation: form.ageRelaxation,
            eligibilityDetailsJson: form.eligibilityDetailsJson,
            reservationNotes: form.reservationNotes,
            importantInstructions: form.importantInstructions,
            applicationStartDate: form.applicationStartDate,
            applicationEndDate: form.applicationEndDate,
            examDate: form.examDate,
            examDatesJson: form.examDatesJson,
            admitCardDate: form.admitCardDate,
            resultDate: form.resultDate,
            selectionStages: form.selectionStages,
            governmentRequiredDocuments: form.governmentRequiredDocuments,
            governmentRequiredDocumentsJson: form.governmentRequiredDocumentsJson,
            examCenters: form.examCenters,
            examPatternJson: form.examPatternJson,
            skillTestsJson: form.skillTestsJson,
            examStagesJson: form.examStagesJson,
            importantDatesJson: form.importantDatesJson,
            qualificationDetailsJson: form.qualificationDetailsJson,
            physicalStandardsJson: form.physicalStandardsJson,
            extraMetadataJson: form.extraMetadataJson,
            feeBreakdownJson: form.feeBreakdownJson,
            ageRelaxationRulesJson: form.ageRelaxationRulesJson,
            officialSourceVerified: form.officialSourceVerified,
            notificationPdfUrl: form.notificationPdfUrl,
            admitCardUrl: form.admitCardUrl,
            resultUrl: form.resultUrl,
            answerKeyUrl: form.answerKeyUrl,
            syllabusUrl: form.syllabusUrl,
            previousPapersUrl: form.previousPapersUrl,
            basicPay: form.basicPay,
            payLevel: form.payLevel,
            allowances: form.allowances,
            experienceMin: form.experienceMin,
            experienceMax: form.experienceMax,
            sourceLink: form.sourceLink,
            applyLink: form.applyLink,
            expiryDate: form.expiryDate,
            expiryTime: form.expiryTime,
            venueAddress: form.venueAddress,
            venueLink: form.venueLink,
            walkInDateRange: form.walkInDateRange,
            walkInTimeRange: form.walkInTimeRange,
            requiredDocuments: form.requiredDocuments,
            contactPerson: form.contactPerson,
            contactPhone: form.contactPhone,
            startDate: form.startDate,
            endDate: form.endDate,
            startTime: form.startTime,
            endTime: form.endTime,
            customSlug: form.customSlug,
            appMethod: form.appMethod,
            appPlatform: form.appPlatform,
            appDuration: form.appDuration,
            appRequiredItems: form.appRequiredItems
        });

        form.setIsLoading(true);
        const toastId = toast.loading(isEditMode ? 'Updating listing...' : 'Publishing listing...');

        try {
            const data = (isEditMode && opportunityId)
                ? await adminApi.updateOpportunity(opportunityId, payload) as { opportunity: Opportunity; message?: string }
                : await adminApi.createOpportunity(payload) as { opportunity: Opportunity; message?: string };

            toast.success(data.message || (isEditMode ? 'Listing updated successfully.' : 'New listing published!'), { id: toastId });

            const opp = data.opportunity;
            form.setPublishedListing({
                title: opp.title,
                company: opp.company,
                type: opp.type as OpportunityKind,
                slugOrId: opp.slug || opp.id,
                locations: opp.locations,
                allowedPassoutYears: opp.allowedPassoutYears,
                allowedCourses: opp.allowedCourses,
                allowedDegrees: opp.allowedDegrees
            });

            if (isEditMode) {
                router.push('/admin/opportunities');
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err: unknown) {
            toast.error(`Operation failed: ${(err as Error).message}`, { id: toastId });
        } finally {
            form.setIsLoading(false);
        }
    };

    const handleCopyCaption = async (platform: SharePlatform) => {
        if (!form.publishedListing) return;
        try {
            await navigator.clipboard.writeText(buildPlatformCaption(platform, form.publishedListing));
            toast.success(`${platform.toUpperCase()} caption copied.`);
        } catch {
            toast.error('Could not copy caption.');
        }
    };

    const handleCopyFullPack = async () => {
        if (!form.publishedListing) return;
        try {
            await navigator.clipboard.writeText(buildAdminSharePack(form.publishedListing));
            toast.success('Full share pack copied.');
        } catch {
            toast.error('Could not copy pack.');
        }
    };

    return {
        handleSubmit,
        handleCopyCaption,
        handleCopyFullPack
    };
}
