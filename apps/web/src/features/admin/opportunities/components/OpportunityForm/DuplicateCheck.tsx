import Link from 'next/link';

interface DuplicateCandidate {
    id: string;
    title: string;
    company: string;
    status: string;
    updatedAt: string;
    score?: number;
}

interface DuplicateCheckProps {
    checking: boolean;
    candidates: DuplicateCandidate[];
}

export function DuplicateCheck({ checking, candidates }: DuplicateCheckProps) {
    if (!checking && candidates.length === 0) return null;

    return (
        <div className="rounded-lg border border-amber-300/50 bg-amber-50/70 dark:bg-amber-500/10 p-3 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-700 dark:text-amber-300">
                Potential duplicate check
            </p>
            {checking ? (
                <p className="text-xs text-muted-foreground">Scanning existing listings...</p>
            ) : (
                <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                        Found {candidates.length} similar listing{candidates.length > 1 ? 's' : ''}. Review before publish.
                    </p>
                    <div className="space-y-1.5">
                        {candidates.map((dup) => (
                            <Link
                                key={dup.id}
                                href={`/opportunities/edit/${dup.id}`}
                                className="flex items-center justify-between rounded-md border border-border bg-card px-2.5 py-2 hover:bg-muted/30 transition-colors"
                            >
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-foreground truncate">{dup.title}</p>
                                    <p className="text-[11px] text-muted-foreground truncate">{dup.company}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    {typeof dup.score === 'number' ? (
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                                            {Math.round(dup.score * 100)}% match
                                        </p>
                                    ) : null}
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{dup.status}</p>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
