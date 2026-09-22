import React from 'react';
import { cn } from '@repo/ui/utils/cn';
import { EDUCATION_LEVELS, DIPLOMA_DEGREES, UG_DEGREES, PG_DEGREES, getSpecializations } from '@fresherflow/utils';

import { Input } from '@/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/Select";
import { ArrowPathIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface EducationStepProps {
    fullName: string;
    setFullName: (v: string) => void;
    email?: string;
    tenthYear: string;
    setTenthYear: (v: string) => void;
    twelfthYear: string;
    setTwelfthYear: (v: string) => void;
    educationLevel: string;
    setEducationLevel: (v: string) => void;
    gradCourse: string;
    setGradCourse: (v: string) => void;
    gradSpecialization: string;
    setGradSpecialization: (v: string) => void;
    gradYear: string;
    setGradYear: (v: string) => void;
    hasPG: boolean;
    setHasPG: (v: boolean) => void;
    pgCourse: string;
    setPgCourse: (v: string) => void;
    pgSpecialization: string;
    setPgSpecialization: (v: string) => void;
    pgYear: string;
    setPgYear: (v: string) => void;
    isLoading: boolean;
    onSubmit: () => void;
}

export const EducationStep = ({
    fullName,
    setFullName,
    email,
    tenthYear,
    setTenthYear,
    twelfthYear,
    setTwelfthYear,
    educationLevel,
    setEducationLevel,
    gradCourse,
    setGradCourse,
    gradSpecialization,
    setGradSpecialization,
    gradYear,
    setGradYear,
    hasPG,
    setHasPG,
    pgCourse,
    setPgCourse,
    pgSpecialization,
    setPgSpecialization,
    pgYear,
    setPgYear,
    isLoading,
    onSubmit
}: EducationStepProps) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
            {email && (
                <div className="flex items-center justify-end gap-2 text-xs">
                    <span className="font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">Verified</span>
                    <span className="font-medium text-foreground/80">{email}</span>
                </div>
            )}

            {/* Main Info Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Field label="Full Name">
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Rahul Sharma" className="h-9" />
                </Field>
                <Field label="10th Passout Year">
                    <Input inputMode="numeric" maxLength={4} value={tenthYear} onChange={e => setTenthYear(e.target.value.replace(/\D/g, ''))} placeholder="YYYY" className="h-9" />
                </Field>
                <Field label="12th Passout Year">
                    <Input inputMode="numeric" maxLength={4} value={twelfthYear} onChange={e => setTwelfthYear(e.target.value.replace(/\D/g, ''))} placeholder="YYYY" className="h-9" />
                </Field>
            </div>

            {/* Undergraduate Section */}
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-end gap-10">
                    <Field label="Choose your qualification level" className="w-auto">
                        <div className="flex flex-wrap gap-2">
                            {EDUCATION_LEVELS.map(level => (
                                <button key={level} type="button" onClick={() => setEducationLevel(level)}
                                    className={cn('px-5 h-10 rounded-xl border text-sm font-medium transition-all duration-200',
                                        educationLevel === level ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary border-border text-muted-foreground hover:border-primary/40')}
                                >
                                    {level === 'DEGREE' ? 'UG' : level}
                                </button>
                            ))}
                        </div>
                    </Field>
                    <Field label="Graduation Passout Year" className="max-w-48">
                        <Input inputMode="numeric" maxLength={4} value={gradYear} onChange={e => setGradYear(e.target.value.replace(/\D/g, ''))} placeholder="YYYY" className="h-9" />
                    </Field>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Field label="Course">
                        <Select value={gradCourse} onValueChange={v => { setGradCourse(v); setGradSpecialization(''); }} disabled={!educationLevel}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                                {educationLevel && (educationLevel === 'DIPLOMA' ? DIPLOMA_DEGREES : educationLevel === 'DEGREE' ? UG_DEGREES : PG_DEGREES).map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="Specialization">
                        <Select value={gradSpecialization} onValueChange={setGradSpecialization} disabled={!gradCourse}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                                {getSpecializations(gradCourse).map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                </div>
            </div>

            {/* PG Toggle */}
            <label className="flex items-center gap-3 p-4 bg-secondary rounded-xl border border-border cursor-pointer hover:bg-muted transition-colors">
                <input type="checkbox" checked={hasPG} onChange={e => setHasPG(e.target.checked)} className="w-4 h-4 rounded border-border accent-primary" />
                <span className="text-sm font-semibold text-foreground/80">I also have a Postgraduate (PG) degree</span>
            </label>

            {/* Postgraduate Section */}
            {hasPG && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-300">
                    <Field label="PG Course">
                        <Select value={pgCourse} onValueChange={v => { setPgCourse(v); setPgSpecialization(''); }}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                                {PG_DEGREES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="PG Specialization">
                        <Select value={pgSpecialization} onValueChange={setPgSpecialization} disabled={!pgCourse}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                                {getSpecializations(pgCourse).map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                    <Field label="PG Passout Year">
                        <Input inputMode="numeric" maxLength={4} value={pgYear} onChange={e => setPgYear(e.target.value.replace(/\D/g, ''))} placeholder="YYYY" className="h-9" />
                    </Field>
                </div>
            )}

            <div className="flex justify-end pt-6 border-t border-border/40">
                <button
                    onClick={onSubmit}
                    disabled={isLoading}
                    className="px-8 h-11 bg-primary text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <>Save & Continue <ArrowRightIcon className="w-4 h-4" /></>}
                </button>
            </div>
        </div>
    );
};

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
    return (
        <div className={cn("space-y-1.5 w-full", className)}>
            <label className="text-sm font-bold text-muted-foreground">{label}</label>
            {children}
        </div>
    );
}
