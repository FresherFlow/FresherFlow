'use client';

import { useAdmin } from '@/features/admin/AdminContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { FormHeader } from './OpportunityForm/components/FormHeader';
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
import { GovernmentJobSection } from './OpportunityForm/sections/GovernmentJobSection';
import { ParserSection } from './OpportunityForm/sections/ParserSection';
import { TimelineSection } from './OpportunityForm/sections/TimelineSection';
import { PaperAirplaneIcon, BoltIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

// Hooks & Utils
import { useOpportunityForm } from '../useOpportunityForm';
import { GOVERNMENT_JOB_TEMPLATE, INTERNSHIP_TEMPLATE, JOB_TEMPLATE, WALKIN_TEMPLATE } from '../jsonTemplates';
import { useOpportunityFormDerived } from '@/app/(admin)/admin/opportunities/create/hooks/useOpportunityFormDerived';
import { useOpportunityFormHandlers } from '@/app/(admin)/admin/opportunities/create/hooks/useOpportunityFormHandlers';

export type OpportunityFormPageProps = {
    mode?: 'create' | 'edit';
    opportunityId?: string;
    initialGovernmentMode?: boolean;
};

export function OpportunityFormPage({ mode = 'create', opportunityId, initialGovernmentMode = false }: OpportunityFormPageProps) {
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

    useEffect(() => {
        if (!isEditMode && initialGovernmentMode) {
            form.setIsGovernmentJob(true);
        }
    }, [form, initialGovernmentMode, isEditMode]);

    const handleQuickLocation = (loc: string) => {
        if (form.locations.toLowerCase().includes(loc.toLowerCase())) return;
        form.setLocations((prev: string) => prev ? `${prev}, ${loc}` : loc);
    };

    const handlePassoutYearsChange = (val: string) => {
        const years = val.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
        form.setPassoutYears(years);
    };

    return (
        <div className="max-w-6xl mx-auto px-4 pt-0 pb-8 md:pt-0 md:pb-12">
            <div className="mb-8">
                <FormHeader
                    isEditMode={isEditMode}
                    showParser={form.showParser}
                    setShowParser={form.setShowParser}
                    isGovernmentJob={form.isGovernmentJob}
                    setIsGovernmentJob={form.setIsGovernmentJob}
                />
            </div>



            {/* {isEditMode && form.socialPosts?.length > 0 && (
                <div className="mb-8 animate-in zoom-in-95 duration-200">
                    <SocialStatusSection
                        socialPosts={form.socialPosts}
                        onRefresh={form.fetchOpportunityForEdit}
                    />
                </div>
            )} */}

            {form.showParser && (
                <div 
                    onClick={() => form.setShowParser(false)}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
                >
                    <div 
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 p-1"
                    >
                        <ParserSection
                            pastedText={form.pastedText}
                            setPastedText={form.setPastedText}
                            pastedJson={form.pastedJson}
                            setPastedJson={form.setPastedJson}
                            isParsing={form.isParsing}
                            handleAutoFill={() => void form.handleAutoFill(form.pastedText)}
                            applyJsonToForm={() => {
                                try {
                                    const parsed = JSON.parse(form.pastedJson);
                                    form.applyJsonData(parsed);
                                    form.setShowParser(false);
                                } catch (err) {
                                    toast.error('Invalid JSON: Please check the pasted JSON structure.');
                                }
                            }}
                            jsonReport={null}
                            closeParser={() => form.setShowParser(false)}
                            jobTemplate={JOB_TEMPLATE}
                            internshipTemplate={INTERNSHIP_TEMPLATE}
                            walkinTemplate={WALKIN_TEMPLATE}
                            governmentTemplate={GOVERNMENT_JOB_TEMPLATE}
                            clearAllFields={form.clearAllFields}
                        />
                    </div>
                </div>
            )}

            {/* Mobile Floating Action Button (FAB) for Auto-fill */}
            <button
                type="button"
                onClick={() => form.setShowParser(true)}
                className="fixed bottom-20 right-6 z-40 md:hidden flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all outline-none"
                aria-label="Auto-fill helper"
            >
                <BoltIcon className="w-6 h-6 animate-pulse" />
            </button>

            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 space-y-6 md:space-y-8">
                        <TypeSelection
                            type={form.type}
                            setType={form.setType}
                            isGovernmentJob={form.isGovernmentJob}
                            setIsGovernmentJob={form.setIsGovernmentJob}
                        />
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
                            customSlug={form.customSlug} setCustomSlug={form.setCustomSlug}
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

                        <ApplyLinkSection
                            sourceLink={form.sourceLink} setSourceLink={form.setSourceLink}
                            applyLink={form.applyLink} setApplyLink={form.setApplyLink}
                            type={form.type}
                        />


                        {form.isGovernmentJob && (
                            <GovernmentJobSection
                                governmentTags={form.governmentTags}
                                setGovernmentTags={form.setGovernmentTags}
                                department={form.governmentDepartment}
                                setDepartment={form.setGovernmentDepartment}
                                organization={form.governmentOrganization}
                                setOrganization={form.setGovernmentOrganization}
                                recruitingBody={form.recruitingBody}
                                setRecruitingBody={form.setRecruitingBody}
                                officialWebsiteUrl={form.officialWebsiteUrl}
                                setOfficialWebsiteUrl={form.setOfficialWebsiteUrl}
                                officialNotificationUrl={form.officialNotificationUrl}
                                setOfficialNotificationUrl={form.setOfficialNotificationUrl}
                                advertisementNumber={form.advertisementNumber}
                                setAdvertisementNumber={form.setAdvertisementNumber}
                                postName={form.postName}
                                setPostName={form.setPostName}
                                applicationMode={form.applicationMode}
                                setApplicationMode={form.setApplicationMode}
                                notificationIssuedDate={form.notificationIssuedDate}
                                setNotificationIssuedDate={form.setNotificationIssuedDate}
                                vacancyCount={form.vacancyCount}
                                setVacancyCount={form.setVacancyCount}
                                vacancyBreakdownJson={form.vacancyBreakdownJson}
                                setVacancyBreakdownJson={form.setVacancyBreakdownJson}
                                applicationFee={form.applicationFee}
                                setApplicationFee={form.setApplicationFee}
                                applicationFeeJson={form.applicationFeeJson}
                                setApplicationFeeJson={form.setApplicationFeeJson}
                                ageMin={form.ageMin}
                                setAgeMin={form.setAgeMin}
                                ageMax={form.ageMax}
                                setAgeMax={form.setAgeMax}
                                ageRelaxation={form.ageRelaxation}
                                setAgeRelaxation={form.setAgeRelaxation}
                                eligibilityDetailsJson={form.eligibilityDetailsJson}
                                setEligibilityDetailsJson={form.setEligibilityDetailsJson}
                                reservationNotes={form.reservationNotes}
                                setReservationNotes={form.setReservationNotes}
                                importantInstructions={form.importantInstructions}
                                setImportantInstructions={form.setImportantInstructions}
                                applicationStartDate={form.applicationStartDate}
                                setApplicationStartDate={form.setApplicationStartDate}
                                applicationEndDate={form.applicationEndDate}
                                setApplicationEndDate={form.setApplicationEndDate}
                                examDate={form.examDate}
                                setExamDate={form.setExamDate}
                                examDatesJson={form.examDatesJson}
                                setExamDatesJson={form.setExamDatesJson}
                                admitCardDate={form.admitCardDate}
                                setAdmitCardDate={form.setAdmitCardDate}
                                resultDate={form.resultDate}
                                setResultDate={form.setResultDate}
                                selectionStages={form.selectionStages}
                                setSelectionStages={form.setSelectionStages}
                                governmentRequiredDocuments={form.governmentRequiredDocuments}
                                setGovernmentRequiredDocuments={form.setGovernmentRequiredDocuments}
                                governmentRequiredDocumentsJson={form.governmentRequiredDocumentsJson}
                                setGovernmentRequiredDocumentsJson={form.setGovernmentRequiredDocumentsJson}
                                
                                // New fields wired to UI
                                examCenters={form.examCenters}
                                setExamCenters={form.setExamCenters}
                                examPatternJson={form.examPatternJson}
                                setExamPatternJson={form.setExamPatternJson}
                                skillTestsJson={form.skillTestsJson}
                                setSkillTestsJson={form.setSkillTestsJson}
                                examStagesJson={form.examStagesJson}
                                setExamStagesJson={form.setExamStagesJson}
                                importantDatesJson={form.importantDatesJson}
                                setImportantDatesJson={form.setImportantDatesJson}
                                qualificationDetailsJson={form.qualificationDetailsJson}
                                setQualificationDetailsJson={form.setQualificationDetailsJson}
                                physicalStandardsJson={form.physicalStandardsJson}
                                setPhysicalStandardsJson={form.setPhysicalStandardsJson}
                                extraMetadataJson={form.extraMetadataJson}
                                setExtraMetadataJson={form.setExtraMetadataJson}
                                feeBreakdownJson={form.feeBreakdownJson}
                                setFeeBreakdownJson={form.setFeeBreakdownJson}
                                ageRelaxationRulesJson={form.ageRelaxationRulesJson}
                                setAgeRelaxationRulesJson={form.setAgeRelaxationRulesJson}
                                officialSourceVerified={form.officialSourceVerified}
                                setOfficialSourceVerified={form.setOfficialSourceVerified}
                                notificationPdfUrl={form.notificationPdfUrl}
                                setNotificationPdfUrl={form.setNotificationPdfUrl}
                                admitCardUrl={form.admitCardUrl}
                                setAdmitCardUrl={form.setAdmitCardUrl}
                                resultUrl={form.resultUrl}
                                setResultUrl={form.setResultUrl}
                                answerKeyUrl={form.answerKeyUrl}
                                setAnswerKeyUrl={form.setAnswerKeyUrl}
                                syllabusUrl={form.syllabusUrl}
                                setSyllabusUrl={form.setSyllabusUrl}
                                previousPapersUrl={form.previousPapersUrl}
                                setPreviousPapersUrl={form.setPreviousPapersUrl}
                                applicationStatus={form.applicationStatus}
                                setApplicationStatus={form.setApplicationStatus}
                                governmentLevel={form.governmentLevel}
                                setGovernmentLevel={form.setGovernmentLevel}
                                vacancyNature={form.vacancyNature}
                                setVacancyNature={form.setVacancyNature}
                                jobCategory={form.jobCategory}
                                setJobCategory={form.setJobCategory}
                            />
                        )}

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
                    </div>

                    <div className={`lg:col-span-4 space-y-6 md:space-y-8 ${form.isGovernmentJob ? '' : 'lg:sticky lg:top-8 self-start'}`}>

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


                        <ExpirationSection
                            expiresAt={form.expiresAt} setExpiresAt={form.setExpiresAt}
                            onToggleAmPm={form.onToggleAmPm}
                        />
                    </div>
                </div>

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
                        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-bold capitalize tracking-widest text-primary-foreground transition-all hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus:ring-2 focus:ring-offset-2 w-full md:w-auto order-1 md:order-2"
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
