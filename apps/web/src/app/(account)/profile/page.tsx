'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { AuthGate, ProfileGate } from '@/lib/components/ProfileGate';
import { useState, useEffect, useRef } from 'react';
import { useProfileForm } from '@/features/profile/hooks/useProfileForm';
import toast from 'react-hot-toast';
import { useClickOutside } from '@/lib/hooks/useClickOutside';
import { Skeleton } from '@/ui/Skeleton';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Button } from '@/ui/Button';
import Link from 'next/link';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CheckBadgeIcon, ArrowTopRightOnSquareIcon, PencilSquareIcon, UserIcon, AcademicCapIcon, WrenchScrewdriverIcon, BriefcaseIcon, LinkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '@/ui/cn';

// Section Components
import { HeadlineSection } from './components/HeadlineSection';
import { SocialLinksSection } from './components/SocialLinksSection';
import { EducationSection } from './components/EducationSection';
import { SkillsSection } from './components/SkillsSection';
import { PreferencesSection } from './components/PreferencesSection';

// Hooks
import { useProfileUpdateHandlers } from './hooks/useProfileUpdateHandlers';
import { profileApi } from '@/lib/api/profile';

function formatPublishedStatus(publishedAt?: Date | string | null): string {
    if (!publishedAt) return 'Not published yet';
    const date = new Date(publishedAt);
    if (isNaN(date.getTime())) return 'Not published yet';

    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Last published: today';
    if (diffDays === 1) return 'Last published: 1 day ago';
    return `Last published: ${diffDays} days ago`;
}

function ProfilePageSkeleton() {
    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8 animate-pulse">
            <div className="space-y-3">
                <Skeleton className="h-10 w-64 rounded-xl" />
                <Skeleton className="h-5 w-96 rounded-lg" />
            </div>

            <div className="space-y-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-card rounded-2xl border border-border/40 p-6 space-y-5">
                        <div className="flex justify-between items-center pb-4">
                            <Skeleton className="h-6 w-48 rounded-md" />
                            <Skeleton className="h-8 w-16 rounded-full" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <Skeleton className="h-12 w-full rounded-xl" />
                            <Skeleton className="h-12 w-full rounded-xl" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { profile, user, refreshUser, isLoading } = useAuth();
    const cityRef = useRef<HTMLDivElement>(null);
    const skillRef = useRef<HTMLDivElement>(null);
    const [cityOpen, setCityOpen] = useState(false);
    const [skillOpen, setSkillOpen] = useState(false);
    const [isEditingIdentity, setIsEditingIdentity] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);

    const handlePublishProfile = async () => {
        try {
            setIsPublishing(true);
            const res = await profileApi.publishProfile();
            setLastPublishedAt(res.publishedAt);
            toast.success('Public profile published successfully!');
            refreshUser();
        } catch (err: any) {
            toast.error(err?.message || 'Failed to publish profile');
        } finally {
            setIsPublishing(false);
        }
    };

    const SECTIONS = [
        { id: 'headline', label: 'Headline & Bio', icon: UserIcon },
        { id: 'education', label: 'Education', icon: AcademicCapIcon },
        { id: 'skills', label: 'Skills', icon: WrenchScrewdriverIcon },
        { id: 'preferences', label: 'Career Preferences', icon: BriefcaseIcon },
        { id: 'social', label: 'Social Links', icon: LinkIcon },
    ] as const;
    type SectionId = typeof SECTIONS[number]['id'];
    const [activeSection, setActiveSection] = useState<SectionId>('headline');

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

    useClickOutside(skillRef, () => setSkillOpen(false));
    useClickOutside(cityRef, () => setCityOpen(false));

    useEffect(() => {
        if (!profile || editingSection) return;
        hydrateFromProfile(profile, user?.fullName || '');
    }, [profile, user?.fullName, editingSection, hydrateFromProfile]);

    const addCity = () => {
        const result = addCityFromInput();
        if (!result.ok && result.reason === 'limit') toast.error('Max 5 cities');
        if (result.ok) setCityOpen(false);
    };


    if (isLoading) {
        return (
            <AuthGate>
                <ProfileGate>
                    <ProfilePageSkeleton />
                </ProfileGate>
            </AuthGate>
        );
    }

    if (!user && !isLoading) {
        return (
            <AuthGate>
                <ProfileGate>
                    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-12">
                        <ErrorMessage
                            title="Profile Unavailable"
                            message="We couldn't load your account details. Please ensure you are logged in."
                            onRetry={() => refreshUser()}
                        />
                    </div>
                </ProfileGate>
            </AuthGate>
        );
    }

    return (
        <AuthGate>
            <ProfileGate>
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 pb-6">
                    {/* 3-Column / 9-Column Admin Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
                        
                        {/* Left Sidebar (3 cols on lg) */}
                        <div className="lg:col-span-3 space-y-6 lg:sticky lg:top-8">
                            {/* Profile Completion Card */}
                            <div className="bg-card rounded-xl border border-border/60 p-4 shadow-sm space-y-3">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-foreground">Profile Score</span>
                                        <span className="text-primary">{profile?.completionPercentage ?? 71}%</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="bg-primary h-full rounded-full transition-all duration-300"
                                            style={{ width: `${profile?.completionPercentage ?? 71}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-border/40 space-y-2">
                                    {user?.username && (
                                        <>
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <Link 
                                                    href={`/u/${user.username}`} 
                                                    target="_blank" 
                                                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                                                >
                                                    View Public Profile <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                                                </Link>
                                                <Button
                                                    onClick={handlePublishProfile}
                                                    disabled={isPublishing}
                                                    size="sm"
                                                    className="h-7 px-2.5 text-xs font-medium"
                                                >
                                                    {isPublishing ? 'Publishing...' : 'Publish Public Profile'}
                                                </Button>
                                            </div>
                                            <p className="text-[11px] text-muted-foreground">
                                                {formatPublishedStatus(lastPublishedAt || profile?.profilePublishedAt)}
                                            </p>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Desktop Sidebar Nav */}
                            <nav className="hidden lg:flex flex-col bg-card border border-border/60 rounded-xl p-2 shadow-sm space-y-0.5">
                                {SECTIONS.map(s => {
                                    const Icon = s.icon;
                                    const isActive = activeSection === s.id;
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => setActiveSection(s.id)}
                                            className={cn(
                                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors text-left",
                                                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                            )}
                                        >
                                            <Icon className="w-4 h-4 shrink-0" />
                                            {s.label}
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>

                        {/* Right Content Panel (9 cols on lg) */}
                        <div className="lg:col-span-9 space-y-6">
                            
                            {/* Mobile View: Render all sections as a vertical stack */}
                            <div className="lg:hidden space-y-6">
                                <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-5 space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            {profile?.avatarUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={profile.avatarUrl} alt="Avatar" className="w-14 h-14 rounded-full object-cover border border-primary/20 shadow-xs shrink-0" />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">
                                                    {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                                                </div>
                                            )}
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h1 className="text-lg font-bold text-foreground tracking-tight">{user?.fullName || fullName || 'Candidate Profile'}</h1>
                                                    <button onClick={() => setIsEditingIdentity(true)} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/60" title="Edit Full Name & Headline">
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
                                    skillOpen={skillOpen} setSkillOpen={setSkillOpen}
                                    filteredSkillOptions={filteredSkillOptions}
                                    skills={skills} setSkills={setSkills}
                                    addSkill={() => {
                                        const added = addSkillFromInput();
                                        if (added) setSkillOpen(false);
                                    }}
                                    addSkillValue={addSkillValue}
                                    skillRef={skillRef}
                                    isEditing={editingSection === 'skills'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'skills' ? null : 'skills')}
                                    onSave={handleReadinessUpdate}
                                    saving={saving === 'skills'}
                                />

                                <PreferencesSection
                                    profile={profile}
                                    interestedIn={interestedIn} toggleInterestedIn={(item) => setInterestedIn(interestedIn.includes(item) ? interestedIn.filter((i: string) => i !== item) : [...interestedIn, item])}
                                    workModes={workModes} toggleWorkMode={(item) => setWorkModes(workModes.includes(item) ? workModes.filter((i: string) => i !== item) : [...workModes, item])}
                                    preferredCities={preferredCities} setPreferredCities={setPreferredCities}
                                    cityInput={cityInput} setCityInput={setCityInput}
                                    cityOpen={cityOpen} setCityOpen={setCityOpen}
                                    filteredCityOptions={filteredCityOptions} addCity={addCity}
                                    togglePreferredCity={togglePreferredCity} cityRef={cityRef}
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
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={profile.avatarUrl} alt="Avatar" className="w-14 h-14 rounded-full object-cover border border-primary/20 shadow-xs shrink-0" />
                                            ) : (
                                                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">
                                                    {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                                                </div>
                                            )}
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h1 className="text-lg font-bold text-foreground tracking-tight">{user?.fullName || fullName || 'Candidate Profile'}</h1>
                                                    <button onClick={() => setIsEditingIdentity(true)} className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/60" title="Edit Full Name & Headline">
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
                                            skillOpen={skillOpen} setSkillOpen={setSkillOpen}
                                            filteredSkillOptions={filteredSkillOptions}
                                            skills={skills} setSkills={setSkills}
                                            addSkill={() => {
                                                const added = addSkillFromInput();
                                                if (added) setSkillOpen(false);
                                            }}
                                            addSkillValue={addSkillValue}
                                            skillRef={skillRef}
                                            isEditing={editingSection === 'skills'}
                                            onToggleEdit={() => setEditingSection(editingSection === 'skills' ? null : 'skills')}
                                            onSave={handleReadinessUpdate}
                                            saving={saving === 'skills'}
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
                                            cityOpen={cityOpen} setCityOpen={setCityOpen}
                                            filteredCityOptions={filteredCityOptions} addCity={addCity}
                                            togglePreferredCity={togglePreferredCity} cityRef={cityRef}
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
            </ProfileGate>
        </AuthGate>
    );
}
