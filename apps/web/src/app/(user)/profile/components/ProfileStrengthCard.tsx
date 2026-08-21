'use client';

import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

type ProfileLike = {
    avatarUrl?: string | null;
    headline?: string | null;
    about?: string | null;
    skills?: string[] | null;
    gradYear?: number | null;
    pgYear?: number | null;
    gradCourse?: string | null;
    pgCourse?: string | null;
    gradSpecialization?: string | null;
    pgSpecialization?: string | null;
    educationLevel?: string | null;
    projects?: unknown[] | null;
    githubPinnedRepos?: unknown[] | null;
    linkedinUrl?: string | null;
    resumeUrl?: string | null;
    resumeKey?: string | null;
    preferredCities?: string[] | null;
    location?: string | null;
};

export function ProfileStrengthCard({
    profile,
    onNavigateSection,
}: {
    profile?: ProfileLike | null;
    onNavigateSection?: (sectionId: 'headline' | 'education' | 'skills' | 'preferences' | 'social') => void;
}) {
    const photoDone = Boolean(profile?.avatarUrl);
    const headlineDone = Boolean(profile?.headline || profile?.about);
    const skillsDone = Boolean(profile?.skills && profile.skills.length > 0);
    const gradYearDone = Boolean(profile?.gradYear || profile?.pgYear);
    const degreeDone = Boolean((profile?.gradCourse || profile?.pgCourse) && (profile?.gradSpecialization || profile?.pgSpecialization || profile?.educationLevel));
    const projectsDone = Boolean(
        (profile?.projects && profile.projects.length > 0) ||
        (profile?.githubPinnedRepos && Array.isArray(profile.githubPinnedRepos) && profile.githubPinnedRepos.length > 0)
    );
    const linkedinDone = Boolean(profile?.linkedinUrl);
    const resumeDone = Boolean(profile?.resumeUrl || profile?.resumeKey);
    const locationDone = Boolean((profile?.preferredCities && profile.preferredCities.length > 0) || profile?.location);

    const checklist = [
        { label: 'Profile photo uploaded', done: photoDone, section: 'headline' as const },
        { label: 'Headline / bio filled', done: headlineDone, section: 'headline' as const },
        { label: 'At least 1 skill added', done: skillsDone, section: 'skills' as const },
        { label: 'Graduation year set (batch year)', done: gradYearDone, section: 'education' as const },
        { label: 'Degree & branch filled', done: degreeDone, section: 'education' as const },
        { label: 'At least 1 project added', done: projectsDone, section: 'social' as const },
        { label: 'LinkedIn URL added', done: linkedinDone, section: 'social' as const },
        { label: 'Resume uploaded', done: resumeDone, section: 'preferences' as const },
        { label: 'Location set', done: locationDone, section: 'preferences' as const },
    ];

    const completedCount = checklist.filter((item) => item.done).length;
    const score = Math.round((completedCount / checklist.length) * 100);

    return (
        <div className="bg-card border border-border/60 rounded-xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-sm">Profile Strength</h3>
                <span className="text-2xl font-bold text-primary tabular-nums">{score}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${score}%` }}
                />
            </div>
            <ul className="space-y-2 pt-1">
                {checklist.map((item) => (
                    <li key={item.label} className="flex items-center gap-2 text-xs">
                        {item.done ? (
                            <CheckCircleIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : (
                            <ExclamationCircleIcon className="w-4 h-4 text-amber-500 shrink-0" />
                        )}
                        <span className={item.done ? 'text-muted-foreground line-through' : 'text-foreground font-medium'}>
                            {item.label}
                        </span>
                        {!item.done && (
                            <button
                                type="button"
                                onClick={() => onNavigateSection?.(item.section)}
                                className="text-xs text-primary hover:underline font-semibold ml-auto shrink-0"
                            >
                                Fix →
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
