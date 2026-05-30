import { LinkIcon } from '@heroicons/react/24/outline';

interface ApplyLinkSectionProps {
    type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
    sourceLink: string;
    setSourceLink: (val: string) => void;
    applyLink: string;
    setApplyLink: (val: string) => void;
    walkInDetailsComponent?: React.ReactNode;
}

export function ApplyLinkSection({
    type,
    sourceLink, setSourceLink,
    applyLink, setApplyLink,
    walkInDetailsComponent
}: ApplyLinkSectionProps) {
    return (
        <div className="space-y-5 md:space-y-6 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
            <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-muted-foreground" />
                Apply link
            </h3>

            {type === 'WALKIN' ? (
                walkInDetailsComponent
            ) : (
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">Source URL</label>
                        <input
                            type="url"
                            value={sourceLink}
                            onChange={(e) => setSourceLink(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                            placeholder="https://company.com/jobs/... (listing page)"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">Apply URL</label>
                        <input
                            type="url"
                            value={applyLink}
                            onChange={(e) => setApplyLink(e.target.value)}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                            placeholder="https://careers.company.com/... (application page)"
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Add at least one URL. If both are present, `Source URL` stays for tracing and `Apply URL` is where the listing should land.
                    </p>
                </div>
            )}
        </div>
    );
}
