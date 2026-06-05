type OpportunityDeadlineBadgeProps = {
    isExpired: boolean;
    isClosingSoon: boolean;
    deadlineLabel: string | null;
};

export function OpportunityDeadlineBadge({ isExpired, isClosingSoon, deadlineLabel }: OpportunityDeadlineBadgeProps) {
    const label = deadlineLabel || 'Not specified';
    return (
        <div className="pt-3 border-t border-border/50">
            {isExpired ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-1.5 text-xs font-bold text-destructive uppercase tracking-wider">
                    Expired on {label}
                </div>
            ) : isClosingSoon ? (
                <div className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                    Closing soon · {label}
                </div>
            ) : (
                <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Apply before {label}
                </div>
            )}
        </div>
    );
}
