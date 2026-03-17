import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import toast from 'react-hot-toast';
import { buildOpportunityPayload } from '../../opportunityPayload';
import { buildAdminSharePack, buildPlatformCaption, type SharePlatform } from '@/features/admin/opportunities/formUtils';
import { useOpportunityForm } from '@/features/admin/opportunities/useOpportunityForm';
import { Opportunity } from '@fresherflow/types';

export function useOpportunityFormHandlers(form: ReturnType<typeof useOpportunityForm>, mode: 'create' | 'edit', opportunityId?: string) {
    const router = useRouter();
    const isEditMode = mode === 'edit' && !!opportunityId;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const payload = buildOpportunityPayload({
            type: form.type,
            title: form.title,
            company: form.company,
            companyWebsite: form.companyWebsite,
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
            experienceMin: form.experienceMin,
            experienceMax: form.experienceMax,
            sourceLink: form.sourceLink,
            applyLink: form.applyLink,
            expiresAt: form.expiresAt,
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
            endTime: form.endTime
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
                type: opp.type,
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
