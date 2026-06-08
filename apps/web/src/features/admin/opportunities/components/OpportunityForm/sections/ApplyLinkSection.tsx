import { LinkIcon } from '@heroicons/react/24/outline';

interface ApplyLinkSectionProps {
    type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
    sourceLink: string;
    setSourceLink: (val: string) => void;
    applyLink: string;
    setApplyLink: (val: string) => void;
    walkInDetailsComponent?: React.ReactNode;
    showUrlError?: boolean;
}

export function ApplyLinkSection({
    type,
    sourceLink, setSourceLink,
    applyLink, setApplyLink,
    walkInDetailsComponent,
    showUrlError = false
}: ApplyLinkSectionProps) {
    return (
        <div className={`space-y-5 md:space-y-6 border rounded-lg p-4 md:p-5 bg-card shadow-sm transition-all duration-300 ${
            showUrlError ? 'border-destructive/50 ring-1 ring-destructive/20 bg-destructive/5' : 'border-border'
        }`}>
            <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                <LinkIcon className={`w-4 h-4 ${showUrlError ? 'text-destructive' : 'text-muted-foreground'}`} />
                Apply link
            </h3>

            {type === 'WALKIN' ? (
                walkInDetailsComponent
            ) : (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className={`text-xs font-semibold capitalize tracking-wider ${showUrlError ? 'text-destructive' : 'text-muted-foreground'}`}>
                            Source URL {showUrlError && '*'}
                        </label>
                        <input
                            type="url"
                            value={sourceLink}
                            onChange={(e) => setSourceLink(e.target.value)}
                            className={`flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 transition-all shadow-sm ${
                                showUrlError
                                    ? 'border-destructive focus-visible:ring-destructive/20 focus-visible:border-destructive'
                                    : 'border-input focus-visible:ring-primary/20 focus-visible:border-primary'
                            }`}
                            placeholder="https://company.com/jobs/... (listing page)"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className={`text-xs font-semibold capitalize tracking-wider ${showUrlError ? 'text-destructive' : 'text-muted-foreground'}`}>
                            Apply URL {showUrlError && '*'}
                        </label>
                        <input
                            type="url"
                            value={applyLink}
                            onChange={(e) => setApplyLink(e.target.value)}
                            className={`flex h-11 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 transition-all shadow-sm ${
                                showUrlError
                                    ? 'border-destructive focus-visible:ring-destructive/20 focus-visible:border-destructive'
                                    : 'border-input focus-visible:ring-primary/20 focus-visible:border-primary'
                            }`}
                            placeholder="https://careers.company.com/... (application page)"
                        />
                    </div>
                    {showUrlError ? (
                        <p className="text-xs font-semibold text-destructive animate-pulse">
                            At least one of Source URL or Apply URL is required.
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Add at least one URL. If both are present, `Source URL` stays for tracing and `Apply URL` is where the listing should land.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
