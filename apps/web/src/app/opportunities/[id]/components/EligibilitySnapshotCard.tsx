type EligibilitySnapshotCardProps = {
    education: string;
    experience: string;
    employmentType?: string | null;
    skills: string[];
};

export function EligibilitySnapshotCard({ education, experience, employmentType, skills }: EligibilitySnapshotCardProps) {
    return (
        <div className="hidden lg:block bg-card p-4 rounded-xl border border-border shadow-sm space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-widest text-primary">Eligibility snapshot</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Education</p>
                    <p className="text-foreground font-semibold leading-relaxed whitespace-pre-line">{education}</p>
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Experience</p>
                    <p className="text-foreground font-medium">{experience}</p>
                </div>
                {employmentType ? (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Employment</p>
                        <p className="text-foreground font-medium">{employmentType}</p>
                    </div>
                ) : null}
                {skills && skills.length > 0 && (
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                            {skills.slice(0, 6).map((skill) => (
                                <span key={skill} className="px-2 py-1 bg-muted/50 border border-border rounded text-[10px] font-semibold text-foreground">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
