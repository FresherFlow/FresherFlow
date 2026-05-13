type EligibilitySnapshotCardProps = {
    statusLabel: string;
    statusTone: 'ok' | 'warn' | 'neutral';
    mustFix: string[];
    matchedSkills: string[];
    missingSkills: string[];
    alwaysVisible?: boolean;
};

export function EligibilitySnapshotCard({
    statusLabel,
    statusTone,
    mustFix,
    matchedSkills,
    missingSkills,
    alwaysVisible = false,
}: EligibilitySnapshotCardProps) {
    const statusClasses =
        statusTone === 'ok'
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : statusTone === 'warn'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-muted text-foreground border-border';

    return (
        <div className={`${alwaysVisible ? 'block' : 'hidden lg:block'} bg-card p-5 rounded-xl border border-border shadow-sm space-y-4`}>
            <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-bold uppercase tracking-wider text-primary">Eligibility Snapshot</h4>
                <span className={`px-2.5 py-1 rounded-md border text-xs font-bold uppercase tracking-wide ${statusClasses}`}>
                    {statusLabel}
                </span>
            </div>

            <div className="space-y-4 text-sm">
                {mustFix.length > 0 ? (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">What You Need To Fix</p>
                        <ul className="mt-1.5 space-y-1.5">
                            {mustFix.map((item) => (
                                <li key={item} className="text-sm font-semibold text-amber-700 leading-relaxed">
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Eligibility</p>
                        <p className="mt-1 text-sm font-semibold text-emerald-700">You meet the hard eligibility checks.</p>
                    </div>
                )}

                {(matchedSkills.length > 0 || missingSkills.length > 0) && (
                    <div className="space-y-2.5">
                        {matchedSkills.length > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Matched Skills</p>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {matchedSkills.slice(0, 8).map((skill) => (
                                        <span key={skill} className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded text-xs md:text-sm font-semibold text-emerald-700">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {missingSkills.length > 0 && (
                            <div>
                                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Missing Skills</p>
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                    {missingSkills.slice(0, 8).map((skill) => (
                                        <span key={skill} className="px-2.5 py-1 bg-muted/60 border border-border rounded text-xs md:text-sm font-semibold text-foreground">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
