import { LinkIcon } from '@heroicons/react/24/outline';
import { SmartInput } from '@/features/admin/ui/SmartInput';

interface ApplyLinkSectionProps {
    type: 'JOB' | 'INTERNSHIP' | 'WALKIN' | 'GOVERNMENT';
    sourceLink: string;
    setSourceLink: (val: string) => void;
    applyLink: string;
    setApplyLink: (val: string) => void;
    showUrlError?: boolean;
}

export function ApplyLinkSection({
    type,
    sourceLink, setSourceLink,
    applyLink, setApplyLink,
    showUrlError = false
}: ApplyLinkSectionProps) {
    return (
        <div className={`space-y-5 border rounded-lg p-4 md:p-5 bg-card shadow-sm ${
            showUrlError ? 'border-destructive' : 'border-border'
        }`}>
            <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                <LinkIcon className={`w-4 h-4 ${showUrlError ? 'text-destructive' : 'text-muted-foreground'}`} />
                Apply link
            </h3>

            <div className="space-y-3">
                <SmartInput
                    label={`Source URL ${showUrlError ? '*' : ''}`}
                    value={sourceLink}
                    labelClassName={showUrlError ? 'text-destructive' : ''}
                    type="url"
                    onChange={(e) => setSourceLink(e.target.value)}
                    className={
                        showUrlError
                            ? 'border-destructive focus:border-destructive'
                            : ''
                    }
                    placeholder="https://company.com/jobs/... (listing page)"
                />
                <SmartInput
                    label={`Apply URL ${showUrlError ? '*' : ''}`}
                    value={applyLink}
                    labelClassName={showUrlError ? 'text-destructive' : ''}
                    type="url"
                    onChange={(e) => setApplyLink(e.target.value)}
                    className={
                        showUrlError
                            ? 'border-destructive focus:border-destructive'
                            : ''
                    }
                    placeholder="https://careers.company.com/... (application page)"
                />
                {showUrlError ? (
                    <p className="text-sm font-semibold text-destructive animate-pulse">
                        At least one of Source URL or Apply URL is required.
                    </p>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        Add at least one URL. If both are present, `Source URL` stays for tracing and `Apply URL` is where the listing should land.
                    </p>
                )}
            </div>
        </div>
    );
}
