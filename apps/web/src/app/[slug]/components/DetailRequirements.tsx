import { Opportunity } from '@fresherflow/types';
// removed unused cn import

interface DetailRequirementsProps {
    opp: Opportunity;
    educationDetails: {
        level: string;
        courses: string | null;
        specializations: string | null;
    };
}

export function DetailRequirements({ opp, educationDetails }: DetailRequirementsProps) {
    return (
        <div className="bg-card p-4 md:p-5 rounded-xl border border-border shadow-sm space-y-4">
            <h3 className="text-sm md:text-base font-bold text-foreground/80 tracking-tight pb-2">Requirements</h3>

            <div className="space-y-3">
                <div className="p-3.5 bg-muted/20 border border-border rounded-lg space-y-2">
                    <p className="text-sm font-bold text-foreground/80">Education</p>
                    <div className="space-y-1.5">
                        <p className="text-sm md:text-base text-foreground leading-relaxed">
                            <span className="font-semibold text-foreground/80">Level:</span>{' '}
                            <span className="font-normal">{educationDetails.level}</span>
                        </p>
                        {educationDetails.courses && (
                            <p className="text-sm md:text-base text-foreground leading-relaxed">
                                <span className="font-semibold text-foreground/80">Courses:</span>{' '}
                                <span className="font-normal">{educationDetails.courses}</span>
                            </p>
                        )}
                        {educationDetails.specializations && (
                            <p className="text-sm md:text-base text-foreground leading-relaxed">
                                <span className="font-semibold text-foreground/80">Specializations:</span>{' '}
                                <span className="font-normal">{educationDetails.specializations}</span>
                            </p>
                        )}
                    </div>
                </div>
                {opp.requiredSkills && opp.requiredSkills.length > 0 && (
                    <div className="p-3.5 bg-muted/20 border border-border rounded-lg space-y-2">
                        <p className="text-sm font-bold text-foreground/80">Key Skills</p>
                        <div className="flex flex-wrap gap-2">
                            {opp.requiredSkills.map((s: string) => (
                                <span key={s} className="px-3 py-1.5 bg-primary/10 text-primary text-[13px] md:text-sm font-medium rounded-md">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {(opp.jobFunction || opp.incentives) && (
                    <div className="p-3.5 bg-muted/20 border border-border rounded-lg space-y-2">
                        <p className="text-sm font-bold text-foreground/80">Role Details</p>
                        <p className="text-[15px] md:text-base font-medium text-foreground">{opp.jobFunction || 'General'}</p>
                        {opp.incentives ? (
                            <p className="text-[15px] text-foreground/70">Incentives: {opp.incentives}</p>
                        ) : null}
                    </div>
                )}
                {opp.selectionProcess && (
                    <div className="space-y-0.5 p-2.5 bg-muted/20 border border-border rounded-lg md:col-span-2">
                        <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase">Selection process</p>
                        <p className="text-sm md:text-base font-medium text-foreground leading-relaxed whitespace-pre-wrap">{opp.selectionProcess}</p>
                    </div>
                )}
                {opp.notesHighlights && !opp.notesHighlights.includes('[AUTO-INGEST') && (
                    <div className="space-y-0.5 p-2.5 bg-muted/20 border border-border rounded-lg md:col-span-2">
                        <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase">Notes / Highlights</p>
                        <p className="text-sm md:text-base font-medium text-foreground leading-relaxed whitespace-pre-wrap">{opp.notesHighlights}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
