'use client';

import { useAdmin } from '@/features/admin/AdminContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Components
import { FormHeader } from './OpportunityForm/components/FormHeader';
import { ShareListingBanner } from './OpportunityForm/components/ShareListingBanner';
import { DuplicateCheck } from './OpportunityForm/DuplicateCheck';
import { TypeSelection } from './OpportunityForm/sections/TypeSelection';
import { JobInfoSection } from './OpportunityForm/sections/JobInfoSection';
import { LogisticsSection } from './OpportunityForm/sections/LogisticsSection';
import { EligibilitySection } from './OpportunityForm/sections/EligibilitySection';
import { SocialStatusSection } from './OpportunityForm/sections/SocialStatusSection';
import { SalarySection } from './OpportunityForm/sections/SalarySection';
import { ApplyLinkSection } from './OpportunityForm/sections/ApplyLinkSection';
import { ExpirationSection } from './OpportunityForm/sections/ExpirationSection';
import { WalkInDetailsSection } from './OpportunityForm/sections/WalkInDetailsSection';
import { ParserSection } from './OpportunityForm/sections/ParserSection';
import { TimelineSection } from './OpportunityForm/sections/TimelineSection';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

// Hooks & Utils
import { useOpportunityForm } from '../useOpportunityForm';
import { useOpportunityFormDerived } from '@/app/(admin)/admin/opportunities/create/hooks/useOpportunityFormDerived';
import { useOpportunityFormHandlers } from '@/app/(admin)/admin/opportunities/create/hooks/useOpportunityFormHandlers';

export type OpportunityFormPageProps = {
    mode?: 'create' | 'edit';
    opportunityId?: string;
};

export function OpportunityFormPage({ mode = 'create', opportunityId }: OpportunityFormPageProps) {
    const { isAuthenticated } = useAdmin();
    const router = useRouter();
    const isEditMode = mode === 'edit' && !!opportunityId;

    const form = useOpportunityForm(mode, opportunityId);
    
    const { 
        commonDegrees, 
        customDegrees, 
        visibleCourseOptions, 
        visibleSpecializationOptions 
    } = useOpportunityFormDerived(form);

    const {
        handleSubmit,
        handleCopyCaption,
        handleCopyFullPack
    } = useOpportunityFormHandlers(form, mode, opportunityId);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/admin/login');
        }
    }, [isAuthenticated, router]);

    const handleQuickLocation = (loc: string) => {
        if (form.locations.toLowerCase().includes(loc.toLowerCase())) return;
        form.setLocations((prev: string) => prev ? `${prev}, ${loc}` : loc);
    };

    const handlePassoutYearsChange = (val: string) => {
        const years = val.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
        form.setPassoutYears(years);
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
            <div className="mb-8">
                <FormHeader 
                    isEditMode={isEditMode} 
                    showParser={form.showParser} 
                    setShowParser={form.setShowParser} 
                />
            </div>

            {form.publishedListing && (
                <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                    <ShareListingBanner 
                        title={form.publishedListing.title} 
                        company={form.publishedListing.company} 
                        onCopyCaption={handleCopyCaption as (text: string) => void}
                        onCopyFullPack={handleCopyFullPack}
                    />
                </div>
            )}

            {isEditMode && form.socialPosts?.length > 0 && (
                <div className="mb-8 animate-in zoom-in-95 duration-200">
                    <SocialStatusSection 
                        socialPosts={form.socialPosts} 
                        onRefresh={form.fetchOpportunityForEdit} 
                    />
                </div>
            )}

            {form.showParser && (
                <div className="mb-8 animate-in zoom-in-95 duration-200">
                    <ParserSection 
                        pastedText={form.pastedText}
                        setPastedText={form.setPastedText}
                        pastedJson={form.pastedJson}
                        setPastedJson={form.setPastedJson}
                        isParsing={form.isParsing}
                        handleAutoFill={() => void form.handleAutoFill(form.pastedText)}
                        applyJsonToForm={() => form.applyJsonData(JSON.parse(form.pastedJson))}
                        jsonReport={null}
                        closeParser={() => form.setShowParser(false)}
                        jobTemplate='{"type":"JOB","title":"Software Engineer","company":"Google","locations":["Bangalore"],"allowedPassoutYears":[2024,2025],"allowedDegrees":["DEGREE"],"allowedCourses":["B.E","B.Tech"]}'
                        internshipTemplate='{"type":"INTERNSHIP","title":"SDE Intern","company":"Amazon","locations":["Hyderabad"],"allowedPassoutYears":[2025,2026],"allowedDegrees":["DEGREE"]}'
                        walkinTemplate='{"type":"WALKIN","title":"Direct Walk-in","company":"Zoho","locations":["Chennai"],"startDate":"2024-06-01","startTime":"09:00","venueAddress":"Zoho Estancia, Chennai"}'
                    />
                </div>
            )}

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 md:space-y-8">
                <TypeSelection type={form.type} setType={form.setType} />

                <JobInfoSection 
                    title={form.title} setTitle={form.setTitle}
                    company={form.company} setCompany={form.setCompany}
                    companyWebsite={form.companyWebsite} setCompanyWebsite={form.setCompanyWebsite}
                    jobFunction={form.jobFunction} setJobFunction={form.setJobFunction}
                    employmentType={form.employmentType} setEmploymentType={form.setEmploymentType}
                    incentives={form.incentives} setIncentives={form.setIncentives}
                    selectionProcess={form.selectionProcess} setSelectionProcess={form.setSelectionProcess}
                    notesHighlights={form.notesHighlights} setNotesHighlights={form.setNotesHighlights}
                    description={form.description} setDescription={form.setDescription}
                    duplicateCheckComponent={
                        <DuplicateCheck 
                            checking={form.checkingDuplicates} 
                            candidates={form.duplicateCandidates} 
                        />
                    }
                />

                <EligibilitySection 
                    allowedDegrees={form.allowedDegrees}
                    handleDegreeToggle={(deg) => form.setAllowedDegrees(prev => prev.includes(deg) ? prev.filter(d => d !== deg) : [...prev, deg])}
                    allowedCourses={form.allowedCourses}
                    handleCourseToggle={(course) => form.setAllowedCourses(prev => prev.includes(course) ? prev.filter(c => c !== course) : [...prev, course])}
                    allowedSpecializations={form.allowedSpecializations}
                    handleSpecializationToggle={(spec) => form.setAllowedSpecializations(prev => prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec])}
                    experienceMin={form.experienceMin} setExperienceMin={form.setExperienceMin}
                    experienceMax={form.experienceMax} setExperienceMax={form.setExperienceMax}
                    passoutYears={form.passoutYears}
                    handlePassoutYearsChange={handlePassoutYearsChange}
                    requiredSkills={form.requiredSkills} setRequiredSkills={form.setRequiredSkills}
                    commonDegrees={commonDegrees}
                    visibleCourseOptions={visibleCourseOptions}
                    visibleSpecializationOptions={visibleSpecializationOptions}
                    customDegrees={customDegrees}
                />

                <LogisticsSection 
                    type={form.type}
                    locations={form.locations} setLocations={form.setLocations}
                    handleQuickLocation={handleQuickLocation}
                    workMode={form.workMode} setWorkMode={form.setWorkMode}
                />

                <SalarySection 
                    salaryRange={form.salaryRange} setSalaryRange={form.setSalaryRange}
                    salaryAmount={form.salaryAmount} setSalaryAmount={form.setSalaryAmount}
                    salaryPeriod={form.salaryPeriod} setSalaryPeriod={form.setSalaryPeriod}
                />

                <ApplyLinkSection 
                    sourceLink={form.sourceLink} setSourceLink={form.setSourceLink}
                    applyLink={form.applyLink} setApplyLink={form.setApplyLink}
                    type={form.type}
                />

                <ExpirationSection 
                    expiresAt={form.expiresAt} setExpiresAt={form.setExpiresAt}
                    onToggleAmPm={form.onToggleAmPm}
                />

                {form.type === 'WALKIN' && (
                    <WalkInDetailsSection 
                        startDate={form.startDate} setStartDate={form.setStartDate}
                        endDate={form.endDate} setEndDate={form.setEndDate}
                        startTime={form.startTime} setStartTime={form.setStartTime}
                        endTime={form.endTime} setEndTime={form.setEndTime}
                        venueAddress={form.venueAddress} setVenueAddress={form.setVenueAddress}
                        venueLink={form.venueLink} setVenueLink={form.setVenueLink}
                        requiredDocuments={form.requiredDocuments} setRequiredDocuments={form.setRequiredDocuments}
                        contactPerson={form.contactPerson} setContactPerson={form.setContactPerson}
                        contactPhone={form.contactPhone} setContactPhone={form.setContactPhone}
                    />
                )}

                {isEditMode && opportunityId && (
                    <TimelineSection 
                        isEditMode={isEditMode}
                        timelineEvents={form.timelineEvents}
                        setTimelineEvents={form.setTimelineEvents}
                        timelineLoading={form.timelineLoading}
                        timelineBusyId={form.timelineBusyId}
                        newEventType={form.newEventType}
                        setNewEventType={form.setNewEventType}
                        newEventDate={form.newEventDate}
                        setNewEventDate={form.setNewEventDate}
                        newEventTitle={form.newEventTitle}
                        setNewEventTitle={form.setNewEventTitle}
                        newEventNotes={form.newEventNotes}
                        setNewEventNotes={form.setNewEventNotes}
                        newEventSourceLink={form.newEventSourceLink}
                        setNewEventSourceLink={form.setNewEventSourceLink}
                        handleCreateTimelineEvent={form.handleCreateTimelineEvent}
                        handleUpdateTimelineEvent={form.handleUpdateTimelineEvent}
                        handleDeleteTimelineEvent={form.handleDeleteTimelineEvent}
                    />
                )}

                <div className="flex flex-col md:flex-row items-center justify-end gap-3 pt-5 border-t border-border/50">
                    <Link
                        href="/opportunities"
                        className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-semibold text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus:ring-ring focus:ring-offset-2 w-full md:w-auto order-2 md:order-1"
                    >
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={form.isLoading}
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus:ring-2 focus:ring-offset-2 w-full md:w-auto order-1 md:order-2"
                    >
                        {form.isLoading ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                            <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                        )}
                        {form.isLoading ? (isEditMode ? 'Updating...' : 'Publishing...') : (isEditMode ? 'Update listing' : 'Publish listing')}
                    </button>
                </div>
            </form>
        </div>
    );
}






