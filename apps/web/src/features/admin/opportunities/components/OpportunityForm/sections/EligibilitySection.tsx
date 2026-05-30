import { AcademicCapIcon } from '@heroicons/react/24/outline';

interface EligibilitySectionProps {
    allowedDegrees: string[];
    handleDegreeToggle: (deg: string) => void;
    allowedCourses: string[];
    handleCourseToggle: (course: string) => void;
    allowedSpecializations: string[];
    handleSpecializationToggle: (spec: string) => void;
    experienceMin: string;
    setExperienceMin: (val: string) => void;
    experienceMax: string;
    setExperienceMax: (val: string) => void;
    passoutYears: number[];
    handlePassoutYearsChange: (val: string) => void;
    requiredSkills: string;
    setRequiredSkills: (val: string) => void;
    commonDegrees: string[];
    visibleCourseOptions: string[];
    visibleSpecializationOptions: string[];
    customDegrees: string[];
}

export function EligibilitySection({
    allowedDegrees, handleDegreeToggle,
    allowedCourses, handleCourseToggle,
    allowedSpecializations, handleSpecializationToggle,
    experienceMin, setExperienceMin,
    experienceMax, setExperienceMax,
    passoutYears, handlePassoutYearsChange,
    requiredSkills, setRequiredSkills,
    commonDegrees,
    visibleCourseOptions,
    visibleSpecializationOptions,
    customDegrees
}: EligibilitySectionProps) {
    return (
        <div className="space-y-5 md:space-y-6 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
                <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                    <AcademicCapIcon className="w-4 h-4 text-muted-foreground" />
                    Requirements
                </h3>
                
                <div className="flex flex-col gap-2 md:w-64">
                    <select
                        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs md:text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        value=""
                        onChange={(e) => {
                            if (e.target.value) {
                                handleDegreeToggle(e.target.value);
                                e.target.value = ""; // Reset
                            }
                        }}
                    >
                        <option value="" disabled>Select Education Level</option>
                        {commonDegrees.map(deg => (
                            <option key={deg} value={deg}>
                                {allowedDegrees.includes(deg) ? '✓ ' : ''}{deg === 'DEGREE' ? 'UG (Graduate)' : deg === 'PG' ? 'PG (Postgrad)' : 'Diploma (Specialized)'}
                            </option>
                        ))}
                    </select>
                    {allowedDegrees.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-end">
                            {allowedDegrees.map(deg => (
                                <span key={deg} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] md:text-xs font-bold bg-primary text-primary-foreground">
                                    {deg === 'DEGREE' ? 'UG' : deg}
                                    <button type="button" onClick={() => handleDegreeToggle(deg)} className="hover:text-red-200 ml-0.5">×</button>
                                </span>
                            ))}
                        </div>
                    )}
                    {customDegrees.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-end pt-1">
                            {customDegrees.map((degree) => (
                                <span key={degree} className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-primary/5 text-primary border-primary/20">
                                    {degree}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-5 pb-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">
                            Courses
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {visibleCourseOptions.map((course) => (
                                <button
                                    key={course}
                                    type="button"
                                    onClick={() => handleCourseToggle(course)}
                                    className={`px-2.5 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all border ${allowedCourses.includes(course)
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-muted/50 border-muted-foreground/10 text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                >
                                    {course}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">
                            Specializations
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {visibleSpecializationOptions.map((specialization) => (
                                <button
                                    key={specialization}
                                    type="button"
                                    onClick={() => handleSpecializationToggle(specialization)}
                                    className={`px-2.5 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all border ${allowedSpecializations.includes(specialization)
                                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                        : 'bg-muted/50 border-muted-foreground/10 text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`}
                                >
                                    {specialization}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">Min Exp (Yrs)</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={experienceMin}
                            onChange={(e) => setExperienceMin(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                            placeholder="0"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">Max Exp (Yrs)</label>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            value={experienceMax}
                            onChange={(e) => setExperienceMax(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                            placeholder="3"
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">
                        Passout years
                    </label>
                    <input
                        value={passoutYears.join(', ')}
                        onChange={(e) => handlePassoutYearsChange(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                        placeholder="e.g. 2024, 2025"
                    />
                </div>
            </div>

            <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">Skills & Requirements</label>
                <textarea
                    value={requiredSkills}
                    onChange={(e) => setRequiredSkills(e.target.value)}
                    rows={4}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm resize-y"
                    placeholder="E.g. React, Node.js, strong communication skills..."
                />
            </div>
        </div>
    );
}
