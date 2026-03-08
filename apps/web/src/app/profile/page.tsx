'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGate, ProfileGate } from '@/components/gates/ProfileGate';
import { profileApi } from '@/lib/api/client';
import { useState, useEffect, useRef } from 'react';
import {
    EDUCATION_LEVELS, OPPORTUNITY_TYPES, WORK_MODES, DIPLOMA_DEGREES, UG_DEGREES,
    PG_DEGREES, getSpecializations
} from '@/lib/profileConstants';
import { cn } from '@/lib/utils';
import { useProfileForm } from '@/features/profile/hooks/useProfileForm';
import { validateEducationData } from '@/lib/profileFormValidation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import PencilIcon from '@heroicons/react/24/outline/PencilIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';

export default function ProfilePage() {
    const { profile, user, refreshUser } = useAuth();
    const [saving, setSaving] = useState<string | null>(null);
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const cityRef = useRef<HTMLDivElement>(null);
    const skillRef = useRef<HTMLDivElement>(null);
    const [cityOpen, setCityOpen] = useState(false);
    const [skillOpen, setSkillOpen] = useState(false);
    const {
        fullName, setFullName,
        educationLevel, setEducationLevel,
        tenthYear, setTenthYear,
        twelfthYear, setTwelfthYear,
        gradCourse, setGradCourse,
        gradSpecialization, setGradSpecialization,
        gradYear, setGradYear,
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

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (skillRef.current && !skillRef.current.contains(e.target as Node)) setSkillOpen(false);
            if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!profile || editingSection) return;
        hydrateFromProfile(profile, user?.fullName || '');
    }, [profile, user?.fullName, editingSection, hydrateFromProfile]);

    const toggleItem = (arr: string[], set: (v: string[]) => void, item: string) =>
        set(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);

    const addSkill = () => {
        const added = addSkillFromInput();
        if (added) setSkillOpen(false);
    };

    const addCity = () => {
        const result = addCityFromInput();
        if (!result.ok && result.reason === 'limit') toast.error('Max 5 cities');
        if (result.ok) setCityOpen(false);
    };

    const handleIdentityUpdate = async () => {
        if (!fullName.trim()) { toast.error('Full name is required'); return; }
        setSaving('identity');
        const t = toast.loading('Saving...');
        try {
            await profileApi.updateProfile({ fullName });
            await refreshUser();
            toast.success('Name updated.', { id: t });
            setEditingSection(null);
        } catch (err: unknown) { toast.error((err as Error).message || 'Failed', { id: t }); }
        finally { setSaving(null); }
    };

    const handleEducationUpdate = async () => {
        if (!tenthYear || !twelfthYear || !educationLevel || !gradCourse || !gradSpecialization || !gradYear) {
            toast.error('Please fill all mandatory education fields'); return;
        }
        const validation = validateEducationData({
            educationLevel,
            tenthYear,
            twelfthYear,
            gradCourse,
            gradSpecialization,
            gradYear,
            hasPG,
            pgCourse,
            pgSpecialization,
            pgYear,
        });
        if (!validation.valid || !validation.years) {
            toast.error(validation.error || 'Invalid education data');
            return;
        }
        setSaving('education');
        const t = toast.loading('Saving...');
        try {
            await profileApi.updateEducation({
                educationLevel,
                tenthYear: validation.years.tenthYear,
                twelfthYear: validation.years.twelfthYear,
                gradCourse,
                gradSpecialization,
                gradYear: validation.years.gradYear,
                ...(validation.includePG && { pgCourse, pgSpecialization, pgYear: validation.years.pgYear })
            });
            await refreshUser();
            toast.success('Education updated.', { id: t });
            setEditingSection(null);
        } catch (err: unknown) { toast.error((err as Error).message || 'Failed', { id: t }); }
        finally { setSaving(null); }
    };

    const handlePreferencesUpdate = async () => {
        setSaving('preferences');
        const t = toast.loading('Saving...');
        try {
            await profileApi.updatePreferences({ interestedIn, preferredCities, workModes });
            await refreshUser();
            toast.success('Preferences saved.', { id: t });
            setEditingSection(null);
        } catch (err: unknown) { toast.error((err as Error).message || 'Failed', { id: t }); }
        finally { setSaving(null); }
    };

    const handleReadinessUpdate = async () => {
        if (skills.length === 0) { toast.error('Add at least one skill'); return; }
        setSaving('skills');
        const t = toast.loading('Saving...');
        try {
            await profileApi.updateReadiness({ availability, skills });
            await refreshUser();
            toast.success('Skills updated.', { id: t });
            setEditingSection(null);
        } catch (err: unknown) { toast.error((err as Error).message || 'Failed', { id: t }); }
        finally { setSaving(null); }
    };

    const pct = profile?.completionPercentage ?? 0;
    const isComplete = pct >= 100;

    return (
        <AuthGate>
            <ProfileGate>
                <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
                    <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8 pb-20 font-sans">

                        <div className="mb-4 md:mb-5">
                            <Link href="/dashboard" className="inline-flex p-2 rounded-xl hover:bg-muted transition-colors active:scale-95" aria-label="Back to dashboard">
                                <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                            </Link>
                        </div>

                        {/* Mobile Status Card */}
                        <div className="lg:hidden mb-4">
                            <div className="bg-card rounded-xl border border-border/60 shadow-sm p-4 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full border-2 border-primary/20 bg-primary/5 flex items-center justify-center relative overflow-hidden shrink-0">
                                    <span className="text-xs font-bold text-primary relative z-10">{pct}%</span>
                                    <div className="absolute bottom-0 left-0 right-0 bg-primary/20 transition-all duration-700 z-0" style={{ height: `${pct}%` }} />
                                </div>
                                <div>
                                    <h3 className="text-sm md:text-base font-bold text-foreground">Profile Status</h3>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{isComplete ? "Looking great! You're fully setup." : "Complete your details to rank higher."}</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-start">

                            {/* ── Main Content (Left Col) ── */}
                            <div className="lg:col-span-8 space-y-5">

                                {/* ── Section 1: Identity ── */}
                                <CompactSection
                                    title="Personal Details"
                                    onSave={handleIdentityUpdate}
                                    saving={saving === 'identity'}
                                    isEditing={editingSection === 'identity'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'identity' ? null : 'identity')}
                                    viewContent={
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Full Name</p>
                                                <p className="text-sm md:text-base font-medium text-foreground">{user?.fullName || <span className="opacity-50 italic">Not set</span>}</p>
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Verified Email</p>
                                                <p className="text-sm md:text-base font-medium text-foreground opacity-80 break-all">{user?.email}</p>
                                            </div>
                                        </div>
                                    }
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <Field label="Full Name">
                                            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="premium-input text-sm h-11 md:h-10" placeholder="Enter name" />
                                        </Field>
                                        <Field label="Email Address">
                                            <input type="email" value={user?.email || ''} disabled className="premium-input text-sm h-11 md:h-10 opacity-50 cursor-not-allowed bg-muted" />
                                        </Field>
                                    </div>
                                </CompactSection>

                                {/* ── Section 2: Education ── */}
                                <CompactSection
                                    title="Academic Background"
                                    onSave={handleEducationUpdate}
                                    saving={saving === 'education'}
                                    isEditing={editingSection === 'education'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'education' ? null : 'education')}
                                    viewContent={
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Highest Qualification</p>
                                                    {profile?.gradCourse ? (
                                                        <div>
                                                            <p className="text-sm md:text-base font-semibold">{profile.pgCourse ? profile.pgCourse : profile.gradCourse} <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded ml-1 text-muted-foreground">{profile.educationLevel}</span></p>
                                                            <p className="text-[13px] text-muted-foreground mt-0.5">
                                                                {profile.pgCourse ? profile.pgSpecialization : profile.gradSpecialization} · Class of {profile.pgCourse ? profile.pgYear : profile.gradYear}
                                                            </p>
                                                        </div>
                                                    ) : <p className="text-sm text-muted-foreground italic">Not added</p>}
                                                </div>
                                                {profile?.pgCourse && (
                                                    <div>
                                                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Undergrad Degree</p>
                                                        <p className="text-sm md:text-base font-semibold">{profile.gradCourse}</p>
                                                        <p className="text-[13px] text-muted-foreground mt-0.5">{profile.gradSpecialization} · Class of {profile.gradYear}</p>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-8 pt-4 border-t border-border/40">
                                                <div>
                                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">10th Class</p>
                                                    <p className="text-sm md:text-base font-medium">{profile?.tenthYear ? `${profile.tenthYear}` : <span className="text-sm italic opacity-50">Not set</span>}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">12th / Diploma</p>
                                                    <p className="text-sm md:text-base font-medium">{profile?.twelfthYear ? `${profile.twelfthYear}` : <span className="text-sm italic opacity-50">Not set</span>}</p>
                                                </div>
                                            </div>
                                        </div>
                                    }
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="10th Passout Year">
                                            <input type="text" maxLength={4} value={tenthYear} onChange={e => setTenthYear(e.target.value.replace(/\D/g, ''))} className="premium-input text-sm h-11 md:h-10" placeholder="YYYY" />
                                        </Field>
                                        <Field label="12th Passout Year">
                                            <input type="text" maxLength={4} value={twelfthYear} onChange={e => setTwelfthYear(e.target.value.replace(/\D/g, ''))} className="premium-input text-sm h-11 md:h-10" placeholder="YYYY" />
                                        </Field>
                                    </div>
                                    <Field label="Qualification Level">
                                        <div className="flex flex-wrap gap-2">
                                            {EDUCATION_LEVELS.map(level => (
                                                <button key={level} type="button" onClick={() => setEducationLevel(level)}
                                                    className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                                                        educationLevel === level ? 'bg-foreground text-background border-foreground shadow' : 'bg-card hover:bg-muted text-muted-foreground border-border')}>
                                                    {level === 'DEGREE' ? 'Undergrad' : level === 'DIPLOMA' ? 'Diploma' : 'Postgrad'}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Field label="Course">
                                            <select value={gradCourse} onChange={e => { setGradCourse(e.target.value); setGradSpecialization(''); }} className="premium-input text-sm h-11 md:h-10">
                                                <option value="">Select...</option>
                                                {(educationLevel === 'DIPLOMA' ? DIPLOMA_DEGREES : educationLevel === 'PG' ? PG_DEGREES : UG_DEGREES).map(d => <option key={d}>{d}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Specialization">
                                            <select value={gradSpecialization} onChange={e => setGradSpecialization(e.target.value)} className="premium-input text-sm h-11 md:h-10" disabled={!gradCourse}>
                                                <option value="">Select...</option>
                                                {getSpecializations(gradCourse).map(s => <option key={s}>{s}</option>)}
                                            </select>
                                        </Field>
                                        <Field label="Passout Year">
                                            <input type="text" maxLength={4} value={gradYear} onChange={e => setGradYear(e.target.value.replace(/\D/g, ''))} className="premium-input text-sm h-11 md:h-10" placeholder="YYYY" />
                                        </Field>
                                    </div>
                                    <label className="flex items-center gap-2 mt-2">
                                        <input type="checkbox" checked={hasPG} onChange={e => setHasPG(e.target.checked)} className="rounded border-border w-4 h-4 text-primary bg-background focus:ring-1 focus:ring-primary shadow-sm" />
                                        <span className="text-[13px] font-medium text-foreground">Add Postgrad (PG) details</span>
                                    </label>
                                    {hasPG && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/40 animate-in slide-in-from-top-1 duration-200">
                                            <Field label="PG Course">
                                                <select value={pgCourse} onChange={e => setPgCourse(e.target.value)} className="premium-input text-sm h-11 md:h-10">
                                                    <option value="">Select...</option>
                                                    {PG_DEGREES.map(d => <option key={d}>{d}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Specialization">
                                                <select value={pgSpecialization} onChange={e => setPgSpecialization(e.target.value)} className="premium-input text-sm h-11 md:h-10">
                                                    <option value="">Select...</option>
                                                    {getSpecializations(pgCourse).map(s => <option key={s}>{s}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Passout Year">
                                                <input type="text" maxLength={4} value={pgYear} onChange={e => setPgYear(e.target.value.replace(/\D/g, ''))} className="premium-input text-sm h-11 md:h-10" placeholder="YYYY" />
                                            </Field>
                                        </div>
                                    )}
                                </CompactSection>

                                {/* ── Section 3: Skills ── */}
                                <CompactSection
                                    title="Skills & Tools"
                                    onSave={handleReadinessUpdate}
                                    saving={saving === 'skills'}
                                    isEditing={editingSection === 'skills'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'skills' ? null : 'skills')}
                                    viewContent={
                                        <div className="flex flex-wrap gap-1.5">
                                            {profile?.skills && profile.skills.length > 0 ? profile.skills.map(s => (
                                                <span key={s} className="bg-muted border border-border/80 px-2.5 py-1 rounded-md text-[13px] font-medium text-foreground">
                                                    {s}
                                                </span>
                                            )) : <span className="text-xs text-muted-foreground italic">No skills added</span>}
                                        </div>
                                    }
                                >
                                    <div className="space-y-3">
                                        <div className="relative" ref={skillRef}>
                                            <div className="flex gap-2">
                                                <input
                                                    value={skillInput}
                                                    onChange={e => { setSkillInput(e.target.value); setSkillOpen(true); }}
                                                    onFocus={() => setSkillOpen(true)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
                                                        else if (e.key === 'Escape') setSkillOpen(false);
                                                    }}
                                                    className="premium-input text-sm h-11 md:h-10 flex-1"
                                                    placeholder="Type to search and add skills..."
                                                />
                                                <button onClick={addSkill} className="w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted shadow-sm">
                                                    <PlusIcon className="w-4 h-4 text-foreground/80" />
                                                </button>
                                            </div>
                                            {skillOpen && filteredSkillOptions.length > 0 && (
                                                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                    {filteredSkillOptions.map(skill => (
                                                        <button key={skill}
                                                            onMouseDown={() => { addSkillValue(skill); setSkillInput(''); setSkillOpen(false); }}
                                                            className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm font-medium border-b border-border/40 last:border-0">
                                                            {skill}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {skills.map(s => (
                                                <span key={s} className="flex items-center gap-1.5 bg-foreground/5 px-2.5 py-1 rounded-md text-[13px] font-semibold border border-foreground/10">
                                                    {s}
                                                    <button onClick={() => setSkills(prev => prev.filter(x => x !== s))} className="text-foreground/50 hover:text-destructive">
                                                        <XMarkIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </CompactSection>
                            </div>

                            {/* ── Sidebar (Right Col) ── */}
                            <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-8">

                                {/* Completion Widget */}
                                <div className="hidden lg:flex bg-card rounded-xl border border-border/60 shadow-sm p-4 items-center gap-4">
                                    <div className="w-12 h-12 rounded-full border-2 border-primary/20 bg-primary/5 flex items-center justify-center relative overflow-hidden shrink-0">
                                        <span className="text-xs font-bold text-primary relative z-10">{pct}%</span>
                                        <div className="absolute bottom-0 left-0 right-0 bg-primary/20 transition-all duration-700 z-0" style={{ height: `${pct}%` }} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm md:text-base font-bold text-foreground">Profile Status</h3>
                                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{isComplete ? "Looking great! You're fully setup." : "Complete your details to rank higher."}</p>
                                    </div>
                                </div>

                                {/* Section 4: Preferences */}
                                <CompactSection
                                    title="Job Preferences"
                                    onSave={handlePreferencesUpdate}
                                    saving={saving === 'preferences'}
                                    isEditing={editingSection === 'preferences'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'preferences' ? null : 'preferences')}
                                    viewContent={
                                        <div className="space-y-4">
                                            <div>
                                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Goal</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {profile?.interestedIn?.map(t => <span key={t} className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{t}</span>)}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Work Modes</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {profile?.workModes?.map(m => <span key={m} className="bg-muted border border-border px-2 py-0.5 rounded text-[10px] font-bold uppercase">{m}</span>)}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Cities</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {profile?.preferredCities?.length ? profile.preferredCities.map(c => (
                                                        <span key={c} className="bg-muted px-2 py-1 rounded text-xs font-medium border border-border flex items-center gap-1"><MapPinIcon className="w-3 h-3 opacity-60" /> {c}</span>
                                                    )) : <span className="text-xs text-muted-foreground italic">Remote / Open</span>}
                                                </div>
                                            </div>
                                        </div>
                                    }
                                >
                                    <div className="space-y-4">
                                        <Field label="Looking For">
                                            <div className="flex flex-wrap gap-2">
                                                {OPPORTUNITY_TYPES.map(type => (
                                                    <button key={type} onClick={() => toggleItem(interestedIn, setInterestedIn, type)}
                                                        className={cn('px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all',
                                                            interestedIn.includes(type) ? 'bg-foreground text-background border-foreground shadow' : 'bg-card hover:bg-muted text-muted-foreground border-border/80')}>
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </Field>
                                        <Field label="Work Setup">
                                            <div className="flex flex-wrap gap-2">
                                                {WORK_MODES.map(mode => (
                                                    <button key={mode} onClick={() => toggleItem(workModes, setWorkModes, mode)}
                                                        className={cn('px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all',
                                                            workModes.includes(mode) ? 'bg-foreground text-background border-foreground shadow' : 'bg-card hover:bg-muted text-muted-foreground border-border/80')}>
                                                        {mode}
                                                    </button>
                                                ))}
                                            </div>
                                        </Field>
                                        <Field label="Target Cities">
                                            <div className="relative" ref={cityRef}>
                                                <div className="flex gap-2 mb-2">
                                                    <input type="text" value={cityInput} onChange={e => { setCityInput(e.target.value); setCityOpen(true); }} onFocus={() => setCityOpen(true)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCity(); } else if (e.key === 'Escape') setCityOpen(false); }} className="premium-input text-sm h-11 md:h-10 flex-1" placeholder="Add locality..." />
                                                    <button onClick={addCity} className="w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted shadow-sm">
                                                        <PlusIcon className="w-4 h-4 text-foreground/80" />
                                                    </button>
                                                </div>
                                                {cityOpen && cityInput && filteredCityOptions.length > 0 && (
                                                    <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                                        {filteredCityOptions.map(city => (
                                                            <button key={city} onMouseDown={() => {
                                                                const result = togglePreferredCity(city);
                                                                if (!result.ok && result.reason === 'limit') toast.error('Max 5 cities');
                                                                setCityInput('');
                                                                setCityOpen(false);
                                                            }} className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm font-medium border-b border-border/40 last:border-0">
                                                                {city}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap gap-1.5">
                                                    {preferredCities.map(city => (
                                                        <span key={city} className="flex items-center gap-1 bg-foreground/5 px-2 py-1 rounded-md text-[11px] font-semibold border border-foreground/10 uppercase tracking-wide">
                                                            {city}
                                                            <button onClick={() => setPreferredCities(prev => prev.filter(c => c !== city))} className="text-foreground/50 hover:text-destructive"><XMarkIcon className="w-3 h-3" /></button>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </Field>
                                    </div>
                                </CompactSection>

                            </div>
                        </div>
                    </div>
                </div>
            </ProfileGate>
        </AuthGate>
    );
}

function CompactSection({ title, children, onSave, saving, isEditing, onToggleEdit, viewContent }: {
    title: string;
    children: React.ReactNode;
    viewContent: React.ReactNode;
    isEditing: boolean;
    onToggleEdit: () => void;
    onSave: () => void;
    saving?: boolean;
}) {
    return (
        <section className={cn(
            "bg-card rounded-xl border transition-all duration-300 overflow-visible flex flex-col relative",
            isEditing ? "border-primary/40 shadow-md ring-1 ring-primary/10 z-10" : "border-border/60 hover:shadow-sm hover:border-border/80 z-0"
        )}>
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/40 rounded-t-xl">
                <h2 className="text-sm font-bold text-foreground">{title}</h2>
                <button
                    onClick={onToggleEdit}
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors",
                        isEditing ? "bg-muted text-muted-foreground hover:bg-muted/80" : "bg-primary/5 text-primary hover:bg-primary/10"
                    )}
                >
                    {isEditing ? 'Cancel' : <><PencilIcon className="w-3 h-3" /> Edit</>}
                </button>
            </div>

            <div className="p-4 flex-1">
                {isEditing ? <div className="space-y-4 animate-in fade-in duration-300">{children}</div> : viewContent}
            </div>

            {isEditing && (
                <div className="bg-muted/30 px-4 py-3 border-t border-border/50 flex justify-end animate-in slide-in-from-bottom-2 duration-300 shrink-0 rounded-b-xl">
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="h-8 px-5 rounded-lg text-xs font-bold bg-foreground text-background shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                    >
                        {saving ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : null}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </section>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5 w-full">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">{label}</label>
            {children}
        </div>
    );
}
