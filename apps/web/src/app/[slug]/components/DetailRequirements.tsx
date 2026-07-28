import { Opportunity } from '@fresherflow/types';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import CodeBracketIcon from '@heroicons/react/24/outline/CodeBracketIcon';
import ClipboardDocumentCheckIcon from '@heroicons/react/24/outline/ClipboardDocumentCheckIcon';
import InformationCircleIcon from '@heroicons/react/24/outline/InformationCircleIcon';
import TrophyIcon from '@heroicons/react/24/outline/TrophyIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import { capitalizeSkill } from '@/features/opportunities/domain/opportunityDisplay';
import { cn } from '@repo/ui/utils/cn';

interface DetailRequirementsProps {
    opp: Opportunity;
    educationDetails: {
        level: string;
        courses: string | null;
        specializations: string | null;
    };
    userProfileSkills?: string[];
    userProfile?: any;
}

export function RequirementsBox({ opp, educationDetails, userProfileSkills = [], userProfile }: DetailRequirementsProps) {
    const hasBatch = opp.allowedPassoutYears && opp.allowedPassoutYears.length > 0;
    const hasEducation = educationDetails.level || educationDetails.courses || educationDetails.specializations;
    const hasSkills = opp.requiredSkills && opp.requiredSkills.length > 0;

    if (!hasBatch && !hasEducation && !hasSkills) return null;

    return (
        <div className="bg-muted/30 rounded-2xl p-5 md:p-6 space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground tracking-wide border-b border-border/60 pb-2">
                Requirements
            </h3>
            
            <div className="space-y-4">
                {hasBatch && (() => {
                    const isYearEligible = !userProfile?.gradYear || 
                        !opp.allowedPassoutYears || 
                        opp.allowedPassoutYears.length === 0 || 
                        opp.allowedPassoutYears.map(Number).includes(Number(userProfile.gradYear));

                    return (
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 justify-between">
                                <div className="flex items-center gap-1.5">
                                    <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
                                    <span className="text-xs font-bold text-muted-foreground tracking-wide">Batch (Year)</span>
                                </div>
                                {userProfile && (
                                    <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                                        isYearEligible ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    )}>
                                        {isYearEligible ? '✓ Eligible Year' : '✕ Year Mismatch'}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-semibold text-foreground pl-5.5">
                                {[...opp.allowedPassoutYears].sort((a, b) => Number(a) - Number(b)).join(', ')}
                            </p>
                        </div>
                    );
                })()}

                {hasEducation && (() => {
                    let isEduEligible = true;
                    if (userProfile?.degree && educationDetails.courses) {
                        const coursesLower = educationDetails.courses.toLowerCase();
                        isEduEligible = coursesLower.includes(userProfile.degree.toLowerCase());
                    }

                    return (
                        <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 justify-between">
                                <div className="flex items-center gap-1.5">
                                    <AcademicCapIcon className="w-4 h-4 text-primary shrink-0" />
                                    <span className="text-xs font-bold text-muted-foreground tracking-wide">Education</span>
                                </div>
                                {userProfile?.degree && (
                                    <span className={cn(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded border",
                                        isEduEligible ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                    )}>
                                        {isEduEligible ? '✓ Relevant Degree' : '✕ Degree Mismatch'}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-1.5 pl-5.5">
                                {educationDetails.level && (
                                    <p className="text-sm text-foreground leading-relaxed">
                                        <span className="font-semibold text-foreground/80">Level:</span>{' '}
                                        <span className="font-normal">{educationDetails.level}</span>
                                    </p>
                                )}
                                {educationDetails.courses && (
                                    <p className="text-sm text-foreground leading-relaxed">
                                        <span className="font-semibold text-foreground/80">Courses:</span>{' '}
                                        <span className="font-normal">{educationDetails.courses}</span>
                                    </p>
                                )}
                                {educationDetails.specializations && (
                                    <p className="text-sm text-foreground leading-relaxed">
                                        <span className="font-semibold text-foreground/80">Specializations:</span>{' '}
                                        <span className="font-normal">{educationDetails.specializations}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    );
                })()}

                {hasSkills && (
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                            <CodeBracketIcon className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-xs font-bold text-muted-foreground tracking-wide">Key Skills</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 pt-0.5 pl-5.5">
                            {opp.requiredSkills.map((s: string) => {
                                const isMatched = userProfileSkills.includes(s.toLowerCase());
                                return (
                                    <span
                                        key={s}
                                        className={cn(
                                            "px-2.5 py-1 border text-xs font-medium rounded-md inline-flex items-center gap-1.5",
                                            isMatched 
                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" 
                                                : "bg-muted/50 text-muted-foreground border-border/40"
                                        )}
                                    >
                                        {isMatched && <span className="text-xs">✓</span>}
                                        {capitalizeSkill(s)}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export function AdditionalDetailsBox({ opp }: { opp: Opportunity }) {
    const hasSelection = !!opp.selectionProcess;
    const hasNotes = opp.notesHighlights && !opp.notesHighlights.includes('[AUTO-INGEST');
    const hasIncentives = !!opp.incentives;

    if (!hasSelection && !hasNotes && !hasIncentives) return null;

    return (
        <div className="bg-muted/30 rounded-2xl p-5 md:p-6 space-y-4">
            {hasSelection && (
                <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                        <ClipboardDocumentCheckIcon className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs font-bold text-muted-foreground tracking-wide">Selection process</span>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap pl-5.5">
                        {opp.selectionProcess}
                    </p>
                </div>
            )}
            
            {hasNotes && (
                <div className={`space-y-1.5 ${hasSelection ? "border-t border-border/60 pt-3" : ""}`}>
                    <div className="flex items-center gap-1.5">
                        <InformationCircleIcon className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs font-bold text-muted-foreground tracking-wide">Notes / Highlights</span>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap pl-5.5">
                        {opp.notesHighlights}
                    </p>
                </div>
            )}

            {hasIncentives && (
                <div className={`space-y-1.5 ${(hasSelection || hasNotes) ? "border-t border-border/60 pt-3" : ""}`}>
                    <div className="flex items-center gap-1.5">
                        <TrophyIcon className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs font-bold text-muted-foreground tracking-wide">Incentives / Benefits</span>
                    </div>
                    <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap pl-5.5">
                        {opp.incentives}
                    </p>
                </div>
            )}
        </div>
    );
}

export function DetailRequirements({ opp, educationDetails, userProfileSkills = [], userProfile }: DetailRequirementsProps) {
    return (
        <div className="space-y-4">
            <RequirementsBox opp={opp} educationDetails={educationDetails} userProfileSkills={userProfileSkills} userProfile={userProfile} />
            <AdditionalDetailsBox opp={opp} />
        </div>
    );
}
