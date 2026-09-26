'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, ExternalLink, Share2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { UsernameGate } from '@/features/auth/components/ProfileGate';
import { Button } from '@/ui/Button';
import { Skeleton } from '@/ui/Skeleton';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { cn } from '@/ui/cn';

import { buildShareText, whatsappShareHref } from '@/features/profile/publicProfile';
import { PROFILE_SECTION_ITEMS, type ProfileSectionId } from '@/features/profile/profileSections';
import { getProfileChecklist } from '@/features/profile/profileChecklist';
import { useProfileForm } from '@/features/profile/hooks/useProfileForm';
import { useProfileUpdateHandlers } from '@/features/profile/hooks/useProfileUpdateHandlers';

import { HeadlineSection } from '@/features/profile/components/sections/HeadlineSection';
import { SocialLinksSection } from '@/features/profile/components/sections/SocialLinksSection';
import { EducationSection } from '@/features/profile/components/sections/EducationSection';
import { SkillsSection } from '@/features/profile/components/sections/SkillsSection';
import { PreferencesSection } from '@/features/profile/components/sections/PreferencesSection';
import { ProfileStrengthCard } from '@/features/profile/components/sections/ProfileStrengthCard';
import { ProfilePreviewCard } from '@/features/profile/components/sections/ProfilePreviewCard';

/**
 * The profile editor behind /account?tab=profile.
 *
 * Two parts, and nothing else: a section rail, and the active section.
 * Navigation is the rail — not tabs above a second column — because a
 * profile is a place you move around in, and the rail can carry each section's
 * completion state next to its name.
 *
 * One section renders at a time on every viewport, so a section's props exist
 * in exactly one place. The rail and the completion card are each rendered once
 * too; on small screens they simply stack above the content.
 */
export default function ProfileEditor() {
    const { profile, user, refreshUser, isLoading } = useAuth();

    // ?section= deep links (the dashboard's checklist and gap chips use it) pick
    // the opening section; the rail then takes over. Before this the editor read
    // local state only, so every one of those links landed on Preview.
    const requestedSection = useSearchParams().get('section');
    const initialSection: ProfileSectionId = PROFILE_SECTION_ITEMS.some((s) => s.id === requestedSection)
        ? (requestedSection as ProfileSectionId)
        : 'preview';

    const [activeSection, setActiveSection] = useState<ProfileSectionId>(initialSection);

    const form = useProfileForm(5);

    const {
        fullName, setFullName,
        availability,
        educationLevel, setEducationLevel,
        tenthYear, setTenthYear,
        twelfthYear, setTwelfthYear,
        gradCourse, setGradCourse,
        gradSpecialization, setGradSpecialization,
        gradYear, setGradYear,
        collegeId, setCollegeId,
        collegeName, setCollegeName,
        collegeState, setCollegeState,
        hasPG, setHasPG,
        pgCourse, setPgCourse,
        pgSpecialization, setPgSpecialization,
        pgYear, setPgYear,
        interestedIn, setInterestedIn,
        preferredCities, setPreferredCities,
        workModes, setWorkModes,
        skills, setSkills,
        cityInput, setCityInput,
        skillInput, setSkillInput,
        filteredSkillOptions,
        filteredCityOptions,
        hydrateFromProfile,
        addSkillValue,
        addSkillFromInput,
        addCityFromInput,
        togglePreferredCity,
        expectedCtc, setExpectedCtc,
        resumeUrl, setResumeUrl,
        willingToRelocate, setWillingToRelocate,
    } = form;

    const {
        handleEducationUpdate,
        handlePreferencesUpdate,
        handleReadinessUpdate,
    } = useProfileUpdateHandlers(
        {
            fullName, setFullName,
            availability,
            educationLevel, setEducationLevel,
            tenthYear, setTenthYear,
            twelfthYear, setTwelfthYear,
            gradCourse, setGradCourse,
            gradSpecialization, setGradSpecialization,
            gradYear, setGradYear,
            collegeId, setCollegeId,
            collegeName, setCollegeName,
            collegeState, setCollegeState,
            hasPG, setHasPG,
            pgCourse, setPgCourse,
            pgSpecialization, setPgSpecialization,
            pgYear, setPgYear,
            interestedIn, setInterestedIn,
            preferredCities, setPreferredCities,
            workModes, setWorkModes,
            skills, setSkills,
        },
        refreshUser as unknown as () => Promise<void>,
    );

    // The fields are the live state, so they take their values from the profile
    // whenever it changes — which is after a successful save, since every handler
    // hands the saved values to `updateProfileState`.
    useEffect(() => {
        if (!profile) return;
        hydrateFromProfile(profile, user?.fullName || '');
    }, [profile, user?.fullName, hydrateFromProfile]);

    // The one checklist. Read from it rather than re-deriving "is this section
    // finished" per section, so the rail can never disagree with the card.
    const checklist = useMemo(() => getProfileChecklist(profile), [profile]);
    const sectionDone = useMemo(() => {
        const done: Partial<Record<ProfileSectionId, boolean>> = {};
        for (const item of checklist) {
            done[item.section] = (done[item.section] ?? true) && item.done;
        }
        return done;
    }, [checklist]);

    // Single gate for the whole editor: loading, signed-out, and ready states
    // all render inside it, so the page never nests or repeats the gate.
    return (
        <UsernameGate>
            {isLoading ? (
                <ProfileEditorSkeleton />
            ) : !user ? (
                <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
                    <ErrorMessage
                        title="Profile Unavailable"
                        message="We couldn't load your account details. Please ensure you are logged in."
                        onRetry={() => refreshUser()}
                    />
                </div>
            ) : (
            <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
                <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
                    <aside className="lg:col-span-3 lg:sticky lg:top-8 lg:self-start space-y-4">
                        <nav
                            aria-label="Profile sections"
                            className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto scroll-smooth px-4 pb-2 ff-hide-scrollbar lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0 lg:snap-none"
                        >
                            {PROFILE_SECTION_ITEMS.map((section) => {
                                const Icon = section.icon;
                                const isActive = activeSection === section.id;
                                return (
                                    <button
                                        key={section.id}
                                        type="button"
                                        onClick={() => setActiveSection(section.id)}
                                        aria-current={isActive ? 'true' : undefined}
                                        className={cn(
                                            'flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-150 ease-out lg:w-full lg:gap-2.5 lg:rounded-lg lg:px-3 lg:py-2 lg:text-sm lg:font-normal',
                                            isActive
                                                ? 'border-transparent bg-foreground text-background lg:bg-muted lg:font-medium lg:text-foreground'
                                                : 'border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground lg:border-transparent',
                                        )}
                                    >
                                        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                        <span className="lg:flex-1 lg:text-left">{section.label}</span>
                                        {sectionDone[section.id] && (
                                            <Check
                                                className={cn(
                                                    'h-3.5 w-3.5 shrink-0',
                                                    isActive ? 'text-background lg:text-success' : 'text-success',
                                                )}
                                                aria-label="Filled in"
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </nav>
                        <div className="hidden lg:block">
                            <ProfileStrengthCard checklist={checklist} onNavigateSection={setActiveSection} className="border-border/40 bg-card/50 shadow-none" />
                        </div>
                        <PublicPageActions username={user.username} className="hidden lg:block border-border/40 bg-card/50 shadow-none" />
                    </aside>

                    <div className="min-w-0 lg:col-span-9">
                        {activeSection === 'preview' && <ProfilePreviewCard />}

                        {activeSection === 'headline' && <HeadlineSection />}

                        {activeSection === 'education' && (
                            <EducationSection
                                profile={profile}
                                tenthYear={tenthYear} setTenthYear={setTenthYear}
                                twelfthYear={twelfthYear} setTwelfthYear={setTwelfthYear}
                                educationLevel={educationLevel} setEducationLevel={setEducationLevel}
                                gradCourse={gradCourse} setGradCourse={setGradCourse}
                                gradSpecialization={gradSpecialization} setGradSpecialization={setGradSpecialization}
                                gradYear={gradYear} setGradYear={setGradYear}
                                collegeId={collegeId} setCollegeId={setCollegeId}
                                collegeName={collegeName} setCollegeName={setCollegeName}
                                collegeState={collegeState} setCollegeState={setCollegeState}
                                hasPG={hasPG} setHasPG={setHasPG}
                                pgCourse={pgCourse} setPgCourse={setPgCourse}
                                pgSpecialization={pgSpecialization} setPgSpecialization={setPgSpecialization}
                                pgYear={pgYear} setPgYear={setPgYear}
                                onSave={handleEducationUpdate}
                            />
                        )}

                        {activeSection === 'skills' && (
                            <SkillsSection
                                profile={profile}
                                skillInput={skillInput} setSkillInput={setSkillInput}
                                filteredSkillOptions={filteredSkillOptions}
                                skills={skills} setSkills={setSkills}
                                addSkill={addSkillFromInput}
                                addSkillValue={addSkillValue}
                                onSave={handleReadinessUpdate}
                            />
                        )}

                        {activeSection === 'preferences' && (
                            <PreferencesSection
                                profile={profile}
                                interestedIn={interestedIn}
                                toggleInterestedIn={(item) => setInterestedIn(interestedIn.includes(item) ? interestedIn.filter((i: string) => i !== item) : [...interestedIn, item])}
                                workModes={workModes}
                                toggleWorkMode={(item) => setWorkModes(workModes.includes(item) ? workModes.filter((i: string) => i !== item) : [...workModes, item])}
                                preferredCities={preferredCities} setPreferredCities={setPreferredCities}
                                cityInput={cityInput} setCityInput={setCityInput}
                                filteredCityOptions={filteredCityOptions} addCity={addCityFromInput}
                                togglePreferredCity={togglePreferredCity}
                                onSave={handlePreferencesUpdate}
                                expectedCtc={expectedCtc} setExpectedCtc={setExpectedCtc}
                                resumeUrl={resumeUrl} setResumeUrl={setResumeUrl}
                                willingToRelocate={willingToRelocate} setWillingToRelocate={setWillingToRelocate}
                            />
                        )}

                        {activeSection === 'social' && <SocialLinksSection />}

                        <div className="mt-5 lg:hidden">
                            <ProfileStrengthCard checklist={checklist} onNavigateSection={setActiveSection} compact className="border-border/40 bg-card/50 shadow-none" />
                        </div>
                        <PublicPageActions username={user.username} className="mt-4 lg:hidden border-border/40 bg-card/50 shadow-none" />
                    </div>
                </div>
            </div>
            )}
        </UsernameGate>
    );
}

/**
 * The public-page link, with the two actions that belong to it.
 *
 * This was a full-width header above the editor: it repeated the "Profile"
 * label the tab bar already carries and pushed the section you came to edit
 * below the fold. The link is still worth showing here, so it sits at the end
 * of the rail — desktop — and under the section on phones.
 */
function PublicPageActions({ username, className }: { username?: string | null; className?: string }) {
    if (!username) return null;

    const shareProfile = () => {
        // Same copy as the public page — buildShareText strips the scheme,
        // so both surfaces produce byte-identical text.
        const shareText = buildShareText(`https://fresherflow.in/u/${username}`);
        window.open(whatsappShareHref(shareText), '_blank', 'noopener');
    };

    return (
        <section className={cn('rounded-2xl border border-border/70 bg-card p-4 shadow-sm', className)}>
            <h2 className="text-sm font-medium text-foreground">Your public page</h2>
            <p className="mt-1 truncate font-mono text-xs text-muted-foreground">
                fresherflow.in/u/{username}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                    <a href={`/u/${username}`} target="_blank" rel="noopener noreferrer">
                        <span className="inline-flex items-center gap-1.5">
                            View page
                            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        </span>
                    </a>
                </Button>
                <Button size="sm" onClick={shareProfile}>
                    <span className="inline-flex items-center gap-1.5">
                        <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        Share
                    </span>
                </Button>
            </div>
        </section>
    );
}

function ProfileEditorSkeleton() {
    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 animate-pulse">
            <div className="grid gap-6 lg:grid-cols-12 lg:gap-10">
                <div className="space-y-2 lg:col-span-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 w-full" />
                    ))}
                </div>
                <div className="space-y-4 lg:col-span-9">
                    <Skeleton className="h-14 w-full" />
                    <Skeleton className="h-40 w-full" />
                </div>
            </div>
        </div>
    );
}
