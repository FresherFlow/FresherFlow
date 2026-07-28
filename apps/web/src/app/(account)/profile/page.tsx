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
import { CheckBadgeIcon, ArrowTopRightOnSquareIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

// Section Components
import { HeadlineSection } from './components/HeadlineSection';
import { SocialLinksSection } from './components/SocialLinksSection';
import { EducationSection } from './components/EducationSection';
import { SkillsSection } from './components/SkillsSection';
import { PreferencesSection } from './components/PreferencesSection';

// Hooks
import { useProfileUpdateHandlers } from './hooks/useProfileUpdateHandlers';

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
                    {/* Dual Column Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Main Left Column (7 cols) */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* Top Hero Profile Card (Identity + Strength + Headline & Bio in ONE BOX) */}
                            <div className="bg-card rounded-2xl border border-border/60 shadow-xs p-5 md:p-6 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        {profile?.avatarUrl ? (
                                            <img
                                                src={profile.avatarUrl}
                                                alt="Avatar"
                                                className="w-14 h-14 rounded-full object-cover border border-primary/20 shadow-xs shrink-0"
                                            />
                                        ) : (
                                            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-lg font-bold shrink-0 shadow-xs">
                                                {user?.fullName ? user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                                            </div>
                                        )}
                                        <div className="space-y-0.5 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h1 className="text-lg font-bold text-foreground tracking-tight">
                                                    {user?.fullName || fullName || 'Candidate Profile'}
                                                </h1>
                                                <button
                                                    onClick={() => setIsEditingIdentity(true)}
                                                    className="p-1 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/60"
                                                    title="Edit Full Name, Headline & Bio"
                                                >
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <span className="truncate">{user?.email || 'No email associated'}</span>
                                                {user?.email && (
                                                    <CheckBadgeIcon className="w-4 h-4 text-primary shrink-0" title="Verified Email" />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/40 justify-between sm:justify-end">
                                        {user?.username && (
                                            <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold gap-1 active:scale-[0.98]">
                                                <Link href={`/u/${user.username}`} target="_blank" rel="noopener noreferrer">
                                                    <span>View Public Profile</span>
                                                    <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5 text-primary" />
                                                </Link>
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Integrated Headline & Bio */}
                                <div className="pt-4 border-t border-border/40 space-y-4">
                                    {/* Profile Completion Bar (Private Profile Page Only) */}
                                    <div className="bg-muted/40 rounded-xl border border-border/50 p-3.5 space-y-2">
                                        <div className="flex items-center justify-between text-xs font-bold">
                                            <span className="text-foreground">Profile {profile?.completionPercentage ?? 71}% Complete</span>
                                            <span className="text-primary">{profile?.completionPercentage ?? 71}%</span>
                                        </div>
                                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                            <div
                                                className="bg-primary h-full rounded-full transition-all duration-300"
                                                style={{ width: `${profile?.completionPercentage ?? 71}%` }}
                                            />
                                        </div>
                                    </div>

                                    <HeadlineSection
                                        isEditingExternal={isEditingIdentity}
                                        onCloseExternal={() => setIsEditingIdentity(false)}
                                    />
                                </div>
                            </div>

                                <EducationSection
                                    profile={profile}
                                    tenthYear={tenthYear}
                                    setTenthYear={setTenthYear}
                                    twelfthYear={twelfthYear}
                                    setTwelfthYear={setTwelfthYear}
                                    educationLevel={educationLevel}
                                    setEducationLevel={setEducationLevel}
                                    gradCourse={gradCourse}
                                    setGradCourse={setGradCourse}
                                    gradSpecialization={gradSpecialization}
                                    setGradSpecialization={setGradSpecialization}
                                    gradYear={gradYear}
                                    setGradYear={setGradYear}
                                    collegeId={collegeId}
                                    setCollegeId={setCollegeId}
                                    collegeName={collegeName}
                                    setCollegeName={setCollegeName}
                                    collegeState={collegeState}
                                    setCollegeState={setCollegeState}
                                    hasPG={hasPG}
                                    setHasPG={setHasPG}
                                    pgCourse={pgCourse}
                                    setPgCourse={setPgCourse}
                                    pgSpecialization={pgSpecialization}
                                    setPgSpecialization={setPgSpecialization}
                                    pgYear={pgYear}
                                    setPgYear={setPgYear}
                                    isEditing={editingSection === 'education'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'education' ? null : 'education')}
                                    onSave={handleEducationUpdate}
                                    saving={saving === 'education'}
                                />

                                <SkillsSection
                                    profile={profile}
                                    skillInput={skillInput}
                                    setSkillInput={setSkillInput}
                                    skillOpen={skillOpen}
                                    setSkillOpen={setSkillOpen}
                                    filteredSkillOptions={filteredSkillOptions}
                                    skills={skills}
                                    setSkills={setSkills}
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

                            {/* Sidebar Right Column (5 cols) */}
                            <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
                                <PreferencesSection
                                    profile={profile}
                                    interestedIn={interestedIn}
                                    toggleInterestedIn={(item) => setInterestedIn(interestedIn.includes(item) ? interestedIn.filter((i: string) => i !== item) : [...interestedIn, item])}
                                    workModes={workModes}
                                    toggleWorkMode={(item) => setWorkModes(workModes.includes(item) ? workModes.filter((i: string) => i !== item) : [...workModes, item])}
                                    preferredCities={preferredCities}
                                    setPreferredCities={setPreferredCities}
                                    cityInput={cityInput}
                                    setCityInput={setCityInput}
                                    cityOpen={cityOpen}
                                    setCityOpen={setCityOpen}
                                    filteredCityOptions={filteredCityOptions}
                                    addCity={addCity}
                                    togglePreferredCity={togglePreferredCity}
                                    cityRef={cityRef}
                                    isEditing={editingSection === 'preferences'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'preferences' ? null : 'preferences')}
                                    onSave={handlePreferencesUpdate}
                                    saving={saving === 'preferences'}
                                />

                                <SocialLinksSection />
                            </div>
                        </div>
                    </div>
                </ProfileGate>
            </AuthGate>
        );
    }
