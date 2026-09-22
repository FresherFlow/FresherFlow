'use client';

import Image from 'next/image';
import { useAuth } from '@/lib/auth/AuthContext';
import { UsernameGate } from '@/features/auth/components/ProfileGate';
import { useState, useEffect, useRef } from 'react';
import { useProfileForm } from '@/features/profile/hooks/useProfileForm';
import toast from 'react-hot-toast';
import { Skeleton } from '@/ui/Skeleton';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Button } from '@/ui/Button';
import { TabBar } from '@/ui/TabBar';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CheckBadgeIcon, PencilSquareIcon, UserIcon, AcademicCapIcon, WrenchScrewdriverIcon, BriefcaseIcon, LinkIcon } from '@heroicons/react/24/outline';
import { cn } from '@/ui/cn';

// Section Components
import { HeadlineSection } from '@/features/profile/components/sections/HeadlineSection';
import { SocialLinksSection } from '@/features/profile/components/sections/SocialLinksSection';
import { EducationSection } from '@/features/profile/components/sections/EducationSection';
import { SkillsSection } from '@/features/profile/components/sections/SkillsSection';
import { PreferencesSection } from '@/features/profile/components/sections/PreferencesSection';
import { ProfileStrengthCard } from '@/features/profile/components/sections/ProfileStrengthCard';

// Hooks
import { useProfileUpdateHandlers } from '@/features/profile/hooks/useProfileUpdateHandlers';




function ProfilePageSkeleton() {
    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8 animate-pulse">
            <div className="space-y-3">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-5 w-96" />
            </div>

            <div className="space-y-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-2xl border border-border/40 p-6 space-y-5">
                        <div className="flex justify-between items-center pb-4">
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

const PROFILE_SECTIONS = [
    { id: 'preview', label: 'Preview' },
    { id: 'headline', label: 'Headline & Bio' },
    { id: 'education', label: 'Education' },
    { id: 'skills', label: 'Skills' },
    { id: 'preferences', label: 'Career Preferences' },
    { id: 'social', label: 'Social Links' },
] as const;

type ProfileSectionId = (typeof PROFILE_SECTIONS)[number]['id'];

export default function ProfileTab() {
    const { profile, user, refreshUser, isLoading } = useAuth();
    const [isEditingIdentity, setIsEditingIdentity] = useState(false);

    const [activeSection, setActiveSection] = useState<ProfileSectionId>('preview');

    const {
        fullName, setFullName,
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
        availability,
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
    } = useProfileForm(5);

    const formState = {
        fullName, setFullName,
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
        availability
    };

    const {
        saving,
        editingSection,
        setEditingSection,
        handleEducationUpdate,
        handlePreferencesUpdate,
        handleReadinessUpdate
    } = useProfileUpdateHandlers(formState, refreshUser as unknown as () => Promise<void>);

    useEffect(() => {
        if (!profile || editingSection) return;
        hydrateFromProfile(profile, user?.fullName || '');
    }, [profile, user?.fullName, editingSection, hydrateFromProfile]);


    if (isLoading) {
        return (
            <UsernameGate>
                <ProfilePageSkeleton />
            </UsernameGate>
        );
    }

    if (!user && !isLoading) {
        return (
            <UsernameGate>
                    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12">
                        <ErrorMessage
                            title="Profile Unavailable"
                            message="We couldn't load your account details. Please ensure you are logged in."
                            onRetry={() => refreshUser()}
                        />
                    </div>
            </UsernameGate>
        );
    }

    return (
        <UsernameGate>
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-6">
                {/* One shared horizontal tab bar — same TabBar UI as /jobs
                    and /settings. Buttons switch the section in place. */}
                <TabBar
                    variant="tabs"
                    items={PROFILE_SECTIONS.map((s) => ({
                        key: s.id,
                        label: s.label,
                        action: () => setActiveSection(s.id),
                    }))}
                    activeKey={activeSection}
                    className="px-0 pt-0 max-w-none"
                />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                        
                        {/* Left Sidebar (3 cols on lg) */}
                        <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-8">
                            {/* Profile Strength Card */}
                            <ProfileStrengthCard
                                profile={profile}
                                onNavigateSection={(sectionId) => setActiveSection(sectionId as ProfileSectionId)}
                            />
                        </div>

                        {/* Right Content Panel (9 cols on lg) */}
                        <div className="lg:col-span-9 space-y-6">

                            {/* Public profile share banner — the growth loop entry point */}
                            {user?.username && (
                                <div className="rounded-2xl border border-primary/30 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground">Your public profile is live</p>
                                        <p className="text-xs text-muted-foreground truncate">fresherflow.in/u/{user.username}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <a
                                            href={`/u/${user.username}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button variant="outline" size="sm">View page</Button>
                                        </a>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                const url = `https://fresherflow.in/u/${user.username}`;
                                                const text = `Made my fresher profile — fresherflow.in/u/${user.username}. 2 minutes, make yours.`;
                                                const wa = `https://wa.me/?text=${encodeURIComponent(text)}`;
                                                window.open(wa, '_blank', 'noopener');
                                                void url;
                                            }}
                                        >
                                            Share on WhatsApp
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Mobile View: Render all sections as a vertical stack */}
                            <div className="lg:hidden space-y-6">
                                <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            {profile?.avatarUrl ? (
                                                <Image src={profile.avatarUrl} alt="Avatar" width={56} height={56} className="w-14 h-14 rounded-full object-cover border border-primary/20 shadow-xs shrink-0" unoptimized />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">
                                                    {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                                                </div>
                                            )}
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h1 className="text-lg font-bold text-foreground tracking-tight">{user?.fullName || fullName || 'Candidate Profile'}</h1>
                                                    <button 
                                                        onClick={() => setIsEditingIdentity(true)} 
                                                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                                        title="Edit Profile"
                                                    >
                                                        <PencilSquareIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <span className="truncate">{user?.email || 'No email associated'}</span>
                                                    {user?.email && <CheckBadgeIcon className="w-4 h-4 text-primary shrink-0" title="Verified Email" />}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-border/40">
                                        <HeadlineSection isEditingExternal={isEditingIdentity} onCloseExternal={() => setIsEditingIdentity(false)} />
                                    </div>
                                </div>

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
                                    isEditing={editingSection === 'education'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'education' ? null : 'education')}
                                    onSave={handleEducationUpdate}
                                    saving={saving === 'education'}
                                />
                                
                                <SkillsSection
                                    profile={profile}
                                    skillInput={skillInput} setSkillInput={setSkillInput}
                                    filteredSkillOptions={filteredSkillOptions}
                                    skills={skills} setSkills={setSkills}
                                    addSkill={addSkillFromInput}
                                    addSkillValue={addSkillValue}
                                    isEditing={editingSection === 'skills'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'skills' ? null : 'skills')}
                                    onSave={handleReadinessUpdate}
                                    saving={saving === 'skills'}
                                    expectedCtc={expectedCtc} setExpectedCtc={setExpectedCtc}
                                    resumeUrl={resumeUrl} setResumeUrl={setResumeUrl}
                                    willingToRelocate={willingToRelocate} setWillingToRelocate={setWillingToRelocate}
                                />

                                <PreferencesSection
                                    profile={profile}
                                    interestedIn={interestedIn} toggleInterestedIn={(item) => setInterestedIn(interestedIn.includes(item) ? interestedIn.filter((i: string) => i !== item) : [...interestedIn, item])}
                                    workModes={workModes} toggleWorkMode={(item) => setWorkModes(workModes.includes(item) ? workModes.filter((i: string) => i !== item) : [...workModes, item])}
                                    preferredCities={preferredCities} setPreferredCities={setPreferredCities}
                                    cityInput={cityInput} setCityInput={setCityInput}
                                    filteredCityOptions={filteredCityOptions} addCity={addCityFromInput}
                                    togglePreferredCity={togglePreferredCity}
                                    isEditing={editingSection === 'preferences'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'preferences' ? null : 'preferences')}
                                    onSave={handlePreferencesUpdate}
                                    saving={saving === 'preferences'}
                                />

                                <SocialLinksSection />
                            </div>

                            {/* Desktop View: Render ONLY the active section */}
                            <div className="hidden lg:block">
                                {activeSection === 'headline' && (
                                    <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-6 space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex items-center gap-4">
                                            {profile?.avatarUrl ? (
                                                <Image src={profile.avatarUrl} alt="Avatar" width={56} height={56} className="w-14 h-14 rounded-full object-cover border border-primary/20 shadow-xs shrink-0" unoptimized />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">
                                                    {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                                                </div>
                                            )}
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h1 className="text-lg font-bold text-foreground tracking-tight">{user?.fullName || fullName || 'Candidate Profile'}</h1>
                                                    <button 
                                                        onClick={() => setIsEditingIdentity(true)} 
                                                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                                                        title="Edit Profile"
                                                    >
                                                        <PencilSquareIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <span className="truncate">{user?.email || 'No email associated'}</span>
                                                    {user?.email && <CheckBadgeIcon className="w-4 h-4 text-primary shrink-0" title="Verified Email" />}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="pt-5 border-t border-border/40">
                                            <HeadlineSection isEditingExternal={isEditingIdentity} onCloseExternal={() => setIsEditingIdentity(false)} />
                                        </div>
                                    </div>
                                )}
                                
                                {activeSection === 'education' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                                            isEditing={editingSection === 'education'}
                                            onToggleEdit={() => setEditingSection(editingSection === 'education' ? null : 'education')}
                                            onSave={handleEducationUpdate}
                                            saving={saving === 'education'}
                                        />
                                    </div>
                                )}

                                {activeSection === 'skills' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <SkillsSection
                                            profile={profile}
                                            skillInput={skillInput} setSkillInput={setSkillInput}
                                            filteredSkillOptions={filteredSkillOptions}
                                            skills={skills} setSkills={setSkills}
                                            addSkill={addSkillFromInput}
                                            addSkillValue={addSkillValue}
                                            isEditing={editingSection === 'skills'}
                                            onToggleEdit={() => setEditingSection(editingSection === 'skills' ? null : 'skills')}
                                            onSave={handleReadinessUpdate}
                                            saving={saving === 'skills'}
                                            expectedCtc={expectedCtc} setExpectedCtc={setExpectedCtc}
                                            resumeUrl={resumeUrl} setResumeUrl={setResumeUrl}
                                            willingToRelocate={willingToRelocate} setWillingToRelocate={setWillingToRelocate}
                                        />
                                    </div>
                                )}

                                {activeSection === 'preferences' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <PreferencesSection
                                            profile={profile}
                                            interestedIn={interestedIn} toggleInterestedIn={(item) => setInterestedIn(interestedIn.includes(item) ? interestedIn.filter((i: string) => i !== item) : [...interestedIn, item])}
                                            workModes={workModes} toggleWorkMode={(item) => setWorkModes(workModes.includes(item) ? workModes.filter((i: string) => i !== item) : [...workModes, item])}
                                            preferredCities={preferredCities} setPreferredCities={setPreferredCities}
                                            cityInput={cityInput} setCityInput={setCityInput}
                                            filteredCityOptions={filteredCityOptions} addCity={addCityFromInput}
                                            togglePreferredCity={togglePreferredCity}
                                            isEditing={editingSection === 'preferences'}
                                            onToggleEdit={() => setEditingSection(editingSection === 'preferences' ? null : 'preferences')}
                                            onSave={handlePreferencesUpdate}
                                            saving={saving === 'preferences'}
                                        />
                                    </div>
                                )}

                                {activeSection === 'social' && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <SocialLinksSection />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
        </UsernameGate>
    );
}
