import { LinkIcon } from '@heroicons/react/24/outline';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { Card, CardDescription, CardContent } from '@/ui/Card';
import { ErrorMessage } from '@/ui/ErrorMessage';
import type { OpportunityFormApi } from '@/features/admin/opportunities/useOpportunityForm';

export function ApplyLinkSection({ form }: { form: OpportunityFormApi }) {
    const {
        sourceLink, setSourceLink,
        applyLink, setApplyLink,
        showUrlError
    } = form;
    return (
        // eslint-disable-next-line shadcn/no-restyle -- error-state border; Card owns its color and has no error treatment
        <Card className={showUrlError ? 'border-destructive/60' : undefined}>
            <div className="p-4 md:p-5 pb-3 space-y-1">
                <h3 className="flex items-center gap-2 text-sm md:text-base font-semibold text-foreground">
                    <LinkIcon className={`w-4 h-4 ${showUrlError ? 'text-destructive' : 'text-muted-foreground'}`} />
                    Apply link
                </h3>
                <CardDescription>
                    Where candidates apply. At least one URL is required.
                </CardDescription>
            </div>
            <CardContent className="space-y-3 px-4 md:px-5 pb-4 md:pb-5">
                <SmartInput
                    label="Source URL"
                    required={showUrlError}
                    value={sourceLink}
                    type="url"
                    onChange={(e) => setSourceLink(e.target.value)}
                    placeholder="https://company.com/jobs/... (listing page)"
                />
                <SmartInput
                    label="Apply URL"
                    required={showUrlError}
                    value={applyLink}
                    type="url"
                    onChange={(e) => setApplyLink(e.target.value)}
                    placeholder="https://careers.company.com/... (application page)"
                />
                {showUrlError ? (
                    <ErrorMessage
                        variant="subtle"
                        title="URL required"
                        message="At least one of Source URL or Apply URL is required."
                    />
                ) : (
                    <p className="text-sm text-muted-foreground">
                        If both are present, Source URL stays for tracing and Apply URL is where candidates land.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
