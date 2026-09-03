import { Opportunity } from '@fresherflow/types';
import { cn } from '@repo/ui/utils/cn';
import { SkillPill } from '@/ui/SkillPill';

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
        <div className="space-y-5">
            {/* Education */}
            {(hasBatch || hasEducation) && (
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground">Education</h4>
                    <div className="space-y-1.5 text-sm text-foreground/80">
                        {hasBatch && (
                            <div className="flex items-start gap-2">
                                <span className="text-muted-foreground shrink-0">•</span>
                                <div>
                                    <span className="font-medium text-foreground">Batch:</span>{' '}
                                    {[...opp.allowedPassoutYears!].sort((a, b) => Number(a) - Number(b)).join(', ')}
                                    {userProfile?.gradYear && opp.allowedPassoutYears && (
                                        <span className={cn(
                                            "ml-2 text-xs font-semibold px-1.5 py-0.5 rounded",
                                            opp.allowedPassoutYears.map(Number).includes(Number(userProfile.gradYear))
                                                ? "bg-emerald-500/10 text-emerald-600"
                                                : "bg-rose-500/10 text-rose-600"
                                        )}>
                                            {opp.allowedPassoutYears.map(Number).includes(Number(userProfile.gradYear)) ? '✓ Eligible' : '✕ Mismatch'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                        {hasEducation && educationDetails.level && (
                            <div className="flex items-start gap-2">
                                <span className="text-muted-foreground shrink-0">•</span>
                                <div>
                                    <span className="font-medium text-foreground">Level:</span>{' '}
                                    {educationDetails.level}
                                    {userProfile?.degree && educationDetails.courses && (
                                        <span className={cn(
                                            "ml-2 text-xs font-semibold px-1.5 py-0.5 rounded",
                                            educationDetails.courses.toLowerCase().includes(userProfile.degree.toLowerCase())
                                                ? "bg-emerald-500/10 text-emerald-600"
                                                : "bg-rose-500/10 text-rose-600"
                                        )}>
                                            {educationDetails.courses.toLowerCase().includes(userProfile.degree.toLowerCase()) ? '✓ Match' : '✕ Mismatch'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                        {hasEducation && educationDetails.courses && (
                            <div className="flex items-start gap-2">
                                <span className="text-muted-foreground shrink-0">•</span>
                                <span><span className="font-medium text-foreground">Courses:</span> {educationDetails.courses}</span>
                            </div>
                        )}
                        {hasEducation && educationDetails.specializations && (
                            <div className="flex items-start gap-2">
                                <span className="text-muted-foreground shrink-0">•</span>
                                <span><span className="font-medium text-foreground">Specializations:</span> {educationDetails.specializations}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Skills */}
            {hasSkills && (
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground">Key Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                        {opp.requiredSkills.map((s: string) => {
                            const isMatched = userProfileSkills.includes(s.toLowerCase());
                            return (
                                <SkillPill
                                    key={s}
                                    skill={s}
                                    size="sm"
                                    className={cn(
                                        "text-xs",
                                        isMatched && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    )}
                                />
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export function AdditionalDetailsBox({ opp }: { opp: Opportunity }) {
    const hasSelection = !!opp.selectionProcess;
    const hasNotes = opp.notesHighlights && !opp.notesHighlights.includes('[AUTO-INGEST');
    const hasIncentives = !!opp.incentives;

    if (!hasSelection && !hasNotes && !hasIncentives) return null;

    // Parse incentives into a list (they come as "Benefit1. Benefit2. Benefit3.")
    const incentiveList = hasIncentives
        ? opp.incentives!
            .split(/\.\s+/)
            .map(s => s.replace(/\.$/, '').trim())
            .filter(Boolean)
        : [];

    return (
        <div className="space-y-5">
            {/* Selection Process */}
            {hasSelection && (
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground">Selection Process</h4>
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {opp.selectionProcess}
                    </p>
                </div>
            )}

            {/* Notes */}
            {hasNotes && (
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground">Notes</h4>
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                        {opp.notesHighlights}
                    </p>
                </div>
            )}

            {/* Benefits — render as list */}
            {hasIncentives && incentiveList.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-bold text-foreground">Benefits</h4>
                    <ul className="space-y-1.5">
                        {incentiveList.map((item, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
                                <span className="text-muted-foreground shrink-0 mt-0.5">•</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export function DetailRequirements({ opp, educationDetails, userProfileSkills = [], userProfile }: DetailRequirementsProps) {
    return (
        <div className="space-y-5">
            <RequirementsBox opp={opp} educationDetails={educationDetails} userProfileSkills={userProfileSkills} userProfile={userProfile} />
            <AdditionalDetailsBox opp={opp} />
        </div>
    );
}
