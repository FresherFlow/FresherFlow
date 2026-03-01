'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGate, ProfileGate } from '@/components/gates/ProfileGate';
import { profileApi } from '@/lib/api/client';
import { useState, useEffect, useRef } from 'react';
import {
    EDUCATION_LEVELS, OPPORTUNITY_TYPES, WORK_MODES, INDIAN_CITIES,
    COMMON_SKILLS, DIPLOMA_DEGREES, UG_DEGREES,
    PG_DEGREES, getSpecializations, normalizeSkillName
} from '@/lib/profileConstants';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import BoltIcon from '@heroicons/react/24/outline/BoltIcon';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import IdentificationIcon from '@heroicons/react/24/outline/IdentificationIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';

export default function ProfilePage() {
    const { profile, user, refreshUser } = useAuth();
    const [saving, setSaving] = useState(false);
    const [editingSection, setEditingSection] = useState<string | null>(null);

    // Education
    const [educationLevel, setEducationLevel] = useState('');
    const [tenthYear, setTenthYear] = useState('');
    const [twelfthYear, setTwelfthYear] = useState('');
    const [gradCourse, setGradCourse] = useState('');
    const [gradSpecialization, setGradSpecialization] = useState('');
    const [gradYear, setGradYear] = useState('');
    const [hasPG, setHasPG] = useState(false);
    const [pgCourse, setPgCourse] = useState('');
    const [pgSpecialization, setPgSpecialization] = useState('');
    const [pgYear, setPgYear] = useState('');

    // Preferences
    const [interestedIn, setInterestedIn] = useState<string[]>([]);
    const [preferredCities, setPreferredCities] = useState<string[]>([]);
    const [workModes, setWorkModes] = useState<string[]>([]);

    // City dropdown
    const [cityInput, setCityInput] = useState('');
    const [cityOpen, setCityOpen] = useState(false);
    const cityRef = useRef<HTMLDivElement>(null);

    // Readiness
    const [availability, setAvailability] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState('');
    const [skillOpen, setSkillOpen] = useState(false);
    const skillRef = useRef<HTMLDivElement>(null);

    // Personal
    const [fullName, setFullName] = useState('');

    // Filtered options
    const filteredSkillOptions = COMMON_SKILLS.filter(
        s => s.toLowerCase().includes(skillInput.toLowerCase()) && !skills.includes(s)
    ).slice(0, 10);

    const filteredCityOptions = INDIAN_CITIES.filter(
        c => c.toLowerCase().includes(cityInput.toLowerCase()) && !preferredCities.includes(c)
    ).slice(0, 10);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (skillRef.current && !skillRef.current.contains(e.target as Node)) setSkillOpen(false);
            if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Populate form from profile
    useEffect(() => {
        if (profile) {
            setEducationLevel(profile.educationLevel || '');
            setTenthYear(profile.tenthYear?.toString() || '');
            setTwelfthYear(profile.twelfthYear?.toString() || '');
            setGradCourse(profile.gradCourse || '');
            setGradSpecialization(profile.gradSpecialization || '');
            setGradYear(profile.gradYear?.toString() || '');
            if (profile.pgCourse) {
                setHasPG(true);
                setPgCourse(profile.pgCourse);
                setPgSpecialization(profile.pgSpecialization || '');
                setPgYear(profile.pgYear?.toString() || '');
            }
            setInterestedIn(profile.interestedIn || []);
            setPreferredCities(profile.preferredCities || []);
            setWorkModes(profile.workModes || []);
            setAvailability(profile.availability || '');
            const normalizedSkills = (profile.skills || [])
                .map((skill) => normalizeSkillName(skill))
                .filter(Boolean);
            setSkills(Array.from(new Set(normalizedSkills)));
        }
        if (user?.fullName && !fullName) setFullName(user.fullName);
    }, [profile, user]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleItem = (arr: string[], set: (v: string[]) => void, item: string) =>
        set(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item]);

    const addSkill = () => {
        const s = normalizeSkillName(skillInput);
        if (s && !skills.includes(s)) { setSkills(prev => [...prev, s]); setSkillInput(''); setSkillOpen(false); }
    };

    const addCity = () => {
        const c = cityInput.trim();
        if (!c) return;
        if (preferredCities.length >= 5) { toast.error('Max 5 cities'); return; }
        if (!preferredCities.includes(c)) { setPreferredCities(prev => [...prev, c]); }
        setCityInput(''); setCityOpen(false);
    };

    const handleIdentityUpdate = async () => {
        if (!fullName.trim()) { toast.error('Full name is required'); return; }
        setSaving(true);
        const t = toast.loading('Saving...');
        try {
            await profileApi.updateProfile({ fullName });
            await refreshUser();
            toast.success('Name updated.', { id: t });
            setEditingSection(null);
        } catch (err: unknown) { toast.error((err as Error).message || 'Failed', { id: t }); }
        finally { setSaving(false); }
    };

    const handleEducationUpdate = async () => {
        if (!tenthYear || !twelfthYear || !educationLevel || !gradCourse || !gradSpecialization || !gradYear) {
            toast.error('Education fields incomplete'); return;
        }
        if ([tenthYear, twelfthYear, gradYear].some(y => y.length !== 4) || (hasPG && pgYear && pgYear.length !== 4)) {
            toast.error('Years must be 4 digits'); return;
        }
        setSaving(true);
        const t = toast.loading('Saving education...');
        try {
            await profileApi.updateEducation({
                educationLevel, tenthYear: +tenthYear, twelfthYear: +twelfthYear,
                gradCourse, gradSpecialization, gradYear: +gradYear,
                ...(hasPG && { pgCourse, pgSpecialization, pgYear: pgYear ? +pgYear : undefined })
            });
            await refreshUser();
            toast.success('Education updated.', { id: t });
            setEditingSection(null);
        } catch (err: unknown) { toast.error((err as Error).message || 'Failed', { id: t }); }
        finally { setSaving(false); }
    };

    const handlePreferencesUpdate = async () => {
        setSaving(true);
        const t = toast.loading('Saving preferences...');
        try {
            await profileApi.updatePreferences({ interestedIn, preferredCities, workModes });
            await refreshUser();
            toast.success('Preferences saved.', { id: t });
        } catch (err: unknown) { toast.error((err as Error).message || 'Failed', { id: t }); }
        finally { setSaving(false); }
    };

    const handleReadinessUpdate = async () => {
        if (!availability || skills.length === 0) { toast.error('Skills & availability required'); return; }
        setSaving(true);
        const t = toast.loading('Saving...');
        try {
            await profileApi.updateReadiness({ availability, skills });
            await refreshUser();
            toast.success('Readiness updated.', { id: t });
            setEditingSection(null);
        } catch (err: unknown) { toast.error((err as Error).message || 'Failed', { id: t }); }
        finally { setSaving(false); }
    };

    return (
        <AuthGate>
            <ProfileGate>
                <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6 pb-16 space-y-4 md:space-y-5">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3">
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg transition-colors group">
                                <ArrowLeftIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-foreground">Profile</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${profile?.completionPercentage ?? 0}%` }} />
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        {profile?.completionPercentage ?? 0}% Complete
                                    </span>
                                </div>
                            </div>
                        </div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded">
                            ID: {profile?.id?.slice(-8)}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
                        {/* Main — left 8 cols */}
                        <div className="lg:col-span-8 space-y-4 md:space-y-5">

                            {/* ── Personal Identity ── */}
                            <section className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                                <div className="flex items-center justify-between p-3 md:p-4 bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <IdentificationIcon className="w-5 h-5 text-primary" />
                                        <h2 className="text-sm font-bold uppercase tracking-wider">Personal Identity</h2>
                                    </div>
                                    <button onClick={() => setEditingSection(editingSection === 'identity' ? null : 'identity')}
                                        className="text-xs font-bold text-primary hover:underline uppercase tracking-tighter">
                                        {editingSection === 'identity' ? 'Cancel' : 'Edit'}
                                    </button>
                                </div>
                                <div className="p-3 md:p-4">
                                    {editingSection === 'identity' ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Full Name</label>
                                                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                                                        className="premium-input h-9! text-sm" placeholder="Rahul Sharma" />
                                                </div>
                                                <div className="space-y-1.5 opacity-60">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Verified Email</label>
                                                    <input type="email" value={user?.email || ''} disabled
                                                        className="premium-input h-9! text-sm bg-muted cursor-not-allowed" />
                                                </div>
                                            </div>
                                            <Button onClick={handleIdentityUpdate} disabled={saving} className="w-full h-9 text-[10px] font-bold uppercase tracking-wider">
                                                {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Update Name
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60">Name</p>
                                                <h3 className="text-base font-bold tracking-tight">{user?.fullName || 'Not set'}</h3>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60">Email</p>
                                                <h3 className="text-base font-bold tracking-tight opacity-50">{user?.email || 'Not set'}</h3>
                                                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Email cannot be changed.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* ── Academic Foundation ── */}
                            <section className="bg-card rounded-xl border border-border overflow-hidden">
                                <div className="flex items-center justify-between p-3 md:p-4 bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <AcademicCapIcon className="w-5 h-5 text-primary" />
                                        <h2 className="text-sm font-bold uppercase tracking-wider">Academic Foundation</h2>
                                    </div>
                                    <button onClick={() => setEditingSection(editingSection === 'academic' ? null : 'academic')}
                                        className="text-xs font-bold text-primary hover:underline uppercase tracking-tighter">
                                        {editingSection === 'academic' ? 'Cancel' : 'Edit'}
                                    </button>
                                </div>
                                <div className="p-3 md:p-4">
                                    {editingSection === 'academic' ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">10th Year</label>
                                                    <input type="text" maxLength={4} value={tenthYear} onChange={e => setTenthYear(e.target.value.replace(/\D/g, ''))} className="premium-input h-9! text-sm" placeholder="2018" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">12th Year</label>
                                                    <input type="text" maxLength={4} value={twelfthYear} onChange={e => setTwelfthYear(e.target.value.replace(/\D/g, ''))} className="premium-input h-9! text-sm" placeholder="2020" />
                                                </div>
                                            </div>
                                            <div className="space-y-2 pt-3">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Highest Level</p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {EDUCATION_LEVELS.map(level => (
                                                        <button key={level} type="button" onClick={() => setEducationLevel(level)}
                                                            className={cn("py-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1",
                                                                educationLevel === level ? "bg-primary/5 border-primary text-primary" : "bg-background border-border text-muted-foreground hover:bg-muted")}>
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">{level === 'DEGREE' ? 'UG' : level}</span>
                                                            <span className="text-[8px] opacity-60">
                                                                {level === 'DIPLOMA' && 'Technical'}{level === 'DEGREE' && 'Undergrad'}{level === 'PG' && 'Postgrad'}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Course</label>
                                                    <select value={gradCourse} onChange={e => { setGradCourse(e.target.value); setGradSpecialization(''); }} className="premium-input h-9! text-sm">
                                                        <option value="">Select</option>
                                                        {(educationLevel === 'DIPLOMA' ? DIPLOMA_DEGREES : educationLevel === 'PG' ? PG_DEGREES : UG_DEGREES).map(d => <option key={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Field</label>
                                                    <select value={gradSpecialization} onChange={e => setGradSpecialization(e.target.value)} className="premium-input h-9! text-sm" disabled={!gradCourse}>
                                                        <option value="">Select</option>
                                                        {getSpecializations(gradCourse).map(s => <option key={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Year</label>
                                                    <input type="text" maxLength={4} value={gradYear} onChange={e => setGradYear(e.target.value.replace(/\D/g, ''))} className="premium-input h-9! text-sm" placeholder="2024" />
                                                </div>
                                            </div>
                                            <div className="pt-3">
                                                <label className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors border border-border/50">
                                                    <input type="checkbox" checked={hasPG} onChange={e => setHasPG(e.target.checked)} className="w-4 h-4 rounded" />
                                                    <span className="text-xs font-bold">Add Postgraduate (PG) Details</span>
                                                </label>
                                            </div>
                                            {hasPG && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">PG Course</label>
                                                        <select value={pgCourse} onChange={e => setPgCourse(e.target.value)} className="premium-input h-9! text-sm">
                                                            <option value="">Select</option>
                                                            {PG_DEGREES.map(d => <option key={d}>{d}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Specialization</label>
                                                        <select value={pgSpecialization} onChange={e => setPgSpecialization(e.target.value)} className="premium-input h-9! text-sm">
                                                            <option value="">Select</option>
                                                            {getSpecializations(pgCourse).map(s => <option key={s}>{s}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">PG Year</label>
                                                        <input type="text" maxLength={4} value={pgYear} onChange={e => setPgYear(e.target.value.replace(/\D/g, ''))} className="premium-input h-9! text-sm" placeholder="2026" />
                                                    </div>
                                                </div>
                                            )}
                                            <Button onClick={handleEducationUpdate} disabled={saving} className="w-full h-10 text-xs font-bold uppercase tracking-wider">
                                                {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Save Education
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-60">Level</p>
                                                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide",
                                                        profile?.educationLevel ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground border border-border")}>
                                                        {profile?.educationLevel === 'DEGREE' ? 'UG' : (profile?.educationLevel || 'Not set')}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-60">Undergraduate</p>
                                                    {profile?.gradCourse ? (
                                                        <div className="space-y-0.5">
                                                            <p className="text-sm font-semibold">{profile.gradCourse}</p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                {profile.gradSpecialization ? `${profile.gradSpecialization} · ` : ''}
                                                                {profile.gradYear ? `Class of ${profile.gradYear}` : 'Year missing'}
                                                            </p>
                                                        </div>
                                                    ) : <p className="text-xs text-muted-foreground italic opacity-60">Not added</p>}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-60">10th</p>
                                                        <p className="text-sm font-semibold">{profile?.tenthYear ? `${profile.tenthYear}` : <span className="text-xs italic opacity-50">Not set</span>}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-60">12th</p>
                                                        <p className="text-sm font-semibold">{profile?.twelfthYear ? `${profile.twelfthYear}` : <span className="text-xs italic opacity-50">Not set</span>}</p>
                                                    </div>
                                                </div>
                                                {profile?.pgCourse && (
                                                    <div>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 opacity-60">Postgraduate</p>
                                                        <p className="text-sm font-semibold">{profile.pgCourse}</p>
                                                        <p className="text-[11px] text-muted-foreground">{profile.pgSpecialization} · {profile.pgYear}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* ── Skills & Availability ── */}
                            <section className="bg-card rounded-xl border border-border overflow-hidden">
                                <div className="flex items-center justify-between p-3 md:p-4 bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <BoltIcon className="w-5 h-5 text-primary" />
                                        <h2 className="text-sm font-bold uppercase tracking-wider">Skills & Availability</h2>
                                    </div>
                                    <button onClick={() => setEditingSection(editingSection === 'talent' ? null : 'talent')}
                                        className="text-xs font-bold text-primary hover:underline uppercase tracking-tighter">
                                        {editingSection === 'talent' ? 'Cancel' : 'Edit'}
                                    </button>
                                </div>
                                <div className="p-3 md:p-4">
                                    {editingSection === 'talent' ? (
                                        <div className="space-y-4">
                                            {/* Availability — hidden temporarily
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Availability</p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {AVAILABILITY_OPTIONS.map(opt => (
                                                        <button key={opt.value} onClick={() => setAvailability(opt.value)}
                                                            className={cn("h-10 rounded-lg flex items-center justify-center border-2 transition-all font-bold text-xs",
                                                                availability === opt.value ? "border-primary bg-primary/5 text-primary" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30")}>
                                                            {opt.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                            */}
                                            <div className="pt-3 space-y-2">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Skills</p>
                                                {/* Skill input with ref-based dropdown */}
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
                                                            className="premium-input h-9! text-sm flex-1"
                                                            placeholder="Type a skill..."
                                                        />
                                                        <Button onClick={addSkill} variant="outline" className="shrink-0 px-3 h-9"><PlusIcon className="w-4 h-4" /></Button>
                                                    </div>
                                                    {skillOpen && skillInput && filteredSkillOptions.length > 0 && (
                                                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                                                            {filteredSkillOptions.map(skill => (
                                                                <button key={skill}
                                                                    onMouseDown={() => { setSkills(prev => [...new Set([...prev, skill])]); setSkillInput(''); setSkillOpen(false); }}
                                                                    className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors text-sm font-medium first:rounded-t-xl last:rounded-b-xl">
                                                                    {skill}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 min-h-6">
                                                    {skills.map(s => (
                                                        <span key={s} className="bg-primary/5 text-primary border border-primary/10 px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wide">
                                                            {s}
                                                            <XMarkIcon onClick={() => setSkills(prev => prev.filter(x => x !== s))} className="w-3 h-3 cursor-pointer opacity-70 hover:opacity-100" />
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <Button onClick={handleReadinessUpdate} disabled={saving} className="w-full h-9 text-[10px] font-bold uppercase tracking-wider">
                                                {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Save Skills
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {/* Availability — hidden temporarily
                                            <div>
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Availability</p>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase">
                                                    {AVAILABILITY_OPTIONS.find(o => o.value === availability)?.label || 'Not set'}
                                                </span>
                                            </div>
                                            */}
                                            <div>
                                                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Skills</p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {skills.length > 0 ? skills.map(s => (
                                                        <span key={s} className="px-2 py-0.5 bg-muted rounded text-[10px] font-bold">{s}</span>
                                                    )) : <p className="text-xs text-muted-foreground italic">No skills added yet.</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Sidebar — right 4 cols */}
                        <aside className="lg:col-span-4 space-y-3 lg:sticky lg:top-24">
                            <section className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                                <div className="p-3 bg-muted/20">
                                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Job Preferences</h2>
                                </div>
                                <div className="p-3 md:p-4 space-y-4">
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Career Goal</p>
                                        <div className="flex flex-wrap gap-2">
                                            {OPPORTUNITY_TYPES.map(type => (
                                                <button key={type} onClick={() => toggleItem(interestedIn, setInterestedIn, type)}
                                                    className={cn("px-3 h-8 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all",
                                                        interestedIn.includes(type) ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40")}>
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Work Mode</p>
                                        <div className="flex flex-wrap gap-2">
                                            {WORK_MODES.map(mode => (
                                                <button key={mode} onClick={() => toggleItem(workModes, setWorkModes, mode)}
                                                    className={cn("px-3 h-8 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all",
                                                        workModes.includes(mode) ? "bg-primary/10 border-primary text-primary" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40")}>
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Preferred Cities</p>
                                        {/* City input with ref-based dropdown */}
                                        <div className="relative" ref={cityRef}>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={cityInput}
                                                    onChange={e => { setCityInput(e.target.value); setCityOpen(true); }}
                                                    onFocus={() => setCityOpen(true)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') { e.preventDefault(); addCity(); }
                                                        else if (e.key === 'Escape') setCityOpen(false);
                                                    }}
                                                    className="premium-input h-9! text-[11px] flex-1"
                                                    placeholder="Add city..."
                                                />
                                                <Button onClick={addCity} variant="outline" className="shrink-0 px-3 h-9"><PlusIcon className="w-4 h-4" /></Button>
                                            </div>
                                            {cityOpen && cityInput && filteredCityOptions.length > 0 && (
                                                <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-56 overflow-y-auto">
                                                    {filteredCityOptions.map(city => (
                                                        <button key={city}
                                                            onMouseDown={() => { setPreferredCities(prev => [...prev, city]); setCityInput(''); setCityOpen(false); }}
                                                            className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors text-sm font-medium first:rounded-t-xl last:rounded-b-xl">
                                                            {city}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {preferredCities.map(city => (
                                                <span key={city} className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md border border-border text-[10px] font-bold uppercase tracking-tight">
                                                    {city}
                                                    <button onClick={() => setPreferredCities(prev => prev.filter(c => c !== city))} className="hover:text-destructive transition-colors">
                                                        <XMarkIcon className="w-3 h-3" />
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <Button onClick={handlePreferencesUpdate} disabled={saving} className="w-full h-9 text-[10px] font-bold uppercase tracking-wider mt-1">
                                        {saving ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin mr-2" /> : <CheckIcon className="w-3 h-3 mr-2" />}
                                        Save Preferences
                                    </Button>
                                </div>
                            </section>
                            <div className="bg-muted/30 p-3 rounded-xl flex items-start gap-3 border border-border/50">
                                <IdentificationIcon className="w-5 h-5 text-primary shrink-0" />
                                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                                    Keeping your profile updated improves job match quality. Review your targets regularly.
                                </p>
                            </div>
                        </aside>
                    </div>
                </div>
            </ProfileGate>
        </AuthGate>
    );
}
