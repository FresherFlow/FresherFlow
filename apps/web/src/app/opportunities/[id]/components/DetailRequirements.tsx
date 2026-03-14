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
            <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-muted-foreground pb-2">Requirements</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-0.5 p-2.5 bg-muted/20 border border-border rounded-lg">
                    <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-widest">Education</p>
                    <div className="mt-2 space-y-2.5">
                        <p className="text-sm md:text-base text-foreground leading-relaxed">
                            <span className="font-semibold">Level:</span>{' '}
                            <span className="font-medium">{educationDetails.level}</span>
                        </p>
                        {educationDetails.courses && (
                            <p className="text-sm md:text-base text-foreground leading-relaxed">
                                <span className="font-semibold">Courses:</span>{' '}
                                <span className="font-medium">{educationDetails.courses}</span>
                            </p>
                        )}
                        {educationDetails.specializations && (
                            <p className="text-sm md:text-base text-foreground leading-relaxed">
                                <span className="font-semibold">Specializations:</span>{' '}
                                <span className="font-medium">{educationDetails.specializations}</span>
                            </p>
                        )}
                    </div>
                </div>
                {opp.requiredSkills && opp.requiredSkills.length > 0 && (
                    <div className="space-y-0.5 p-2.5 bg-muted/20 border border-border rounded-lg">
                        <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase tracking-widest">Key Skills</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                            {opp.requiredSkills.map((s: string) => (
                                <span key={s} className="px-2 py-1 bg-primary/5 text-primary text-xs md:text-sm font-semibold rounded">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {(opp.jobFunction || opp.incentives) && (
                    <div className="space-y-0.5 p-2.5 bg-muted/20 border border-border rounded-lg">
                        <p className="text-xs md:text-sm font-bold text-muted-foreground uppercase">Role details</p>
                        <p className="text-sm font-semibold text-foreground">{opp.jobFunction || 'General'}</p>
                        {opp.incentives ? (
                            <p className="text-sm text-muted-foreground">Incentives: {opp.incentives}</p>
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
