import { useMemo, useState } from 'react';
import { BoltIcon, DocumentDuplicateIcon, CheckIcon } from '@heroicons/react/24/outline';
import { SmartTextarea } from '@/features/admin/components/SmartTextarea';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/ui/Dialog';
import type { OpportunityFormApi } from '@/features/admin/opportunities/useOpportunityForm';
import { JOB_TEMPLATE, INTERNSHIP_TEMPLATE, WALKIN_TEMPLATE, GOVERNMENT_JOB_TEMPLATE } from '@/features/admin/opportunities/jsonTemplates';
import {
    BULK_MAX_ITEMS,
    bulkCreateOpportunities,
    parsePastedJson,
    stripCodeFences,
    type BulkItemResult,
    type BulkTemplateItem,
} from '@/features/admin/opportunities/bulkImport';

export function ParserSection({
    form,
    applyJsonToForm,
    jsonReport,
    closeParser,
}: {
    form: OpportunityFormApi;
    applyJsonToForm: (overrideJson?: string) => void;
    jsonReport: {
        valid: boolean;
        type: string | null;
        missing: string[];
        present: string[];
    } | null;
    closeParser: () => void;
}) {
    const {
        pastedText, setPastedText,
        handleAutoFill, isParsing,
        pastedJson, setPastedJson,
        clearAllFields,
    } = form;
    const jobTemplate = JOB_TEMPLATE;
    const internshipTemplate = INTERNSHIP_TEMPLATE;
    const walkinTemplate = WALKIN_TEMPLATE;
    const governmentTemplate = GOVERNMENT_JOB_TEMPLATE;
    const [copiedType, setCopiedType] = useState<'job' | 'internship' | 'walkin' | 'govt' | null>(null);
    const [bulkRunning, setBulkRunning] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0, current: '' });
    const [bulkResults, setBulkResults] = useState<BulkItemResult[] | null>(null);

    // A pasted JSON array means bulk import: preview counts before creating.
    const bulkPreview = useMemo(() => {
        if (!pastedJson.trim()) return null;
        const parsed = parsePastedJson(pastedJson);
        if (parsed.error || !Array.isArray(parsed.value)) return null;
        const items = parsed.value as BulkTemplateItem[];
        const valid = items.filter(
            (item) => item && typeof item === 'object' && !Array.isArray(item)
                && typeof (item as Record<string, unknown>).title === 'string'
                && ((item as Record<string, unknown>).title as string).trim()
                && typeof (item as Record<string, unknown>).company === 'string'
                && ((item as Record<string, unknown>).company as string).trim(),
        ).length;
        return { total: items.length, valid, invalid: items.length - valid, overLimit: items.length > BULK_MAX_ITEMS };
    }, [pastedJson]);

    const handleApplySingle = async () => {
        if (!pastedJson.trim()) {
            try {
                const text = await navigator.clipboard.readText();
                if (text) {
                    // Strip ``` fences so chat-copied payloads apply.
                    applyJsonToForm(stripCodeFences(text));
                }
            } catch (err) {
                console.error("Failed to read clipboard", err);
            }
        } else {
            applyJsonToForm(stripCodeFences(pastedJson));
        }
    };

    const handleBulkCreate = async () => {
        const parsed = parsePastedJson(pastedJson);
        if (parsed.error || !Array.isArray(parsed.value)) return;
        const items = (parsed.value as BulkTemplateItem[]).slice(0, BULK_MAX_ITEMS);
        setBulkRunning(true);
        setBulkResults(null);
        try {
            const results = await bulkCreateOpportunities(items, (done, total, current) =>
                setBulkProgress({ done, total, current }),
            );
            setBulkResults(results);
        } finally {
            setBulkRunning(false);
        }
    };

    const handleCopy = (text: string, type: 'job' | 'internship' | 'walkin' | 'govt') => {
        navigator.clipboard.writeText(text)
            .then(() => {
                setCopiedType(type);
                setTimeout(() => setCopiedType(null), 2000);
            })
            .catch((err) => {
                console.error('Failed to copy text: ', err);
            });
    };

    const templates: { text: string; type: 'job' | 'internship' | 'walkin' | 'govt'; label: string }[] = [
        { text: jobTemplate, type: 'job', label: 'Job JSON' },
        { text: internshipTemplate, type: 'internship', label: 'Internship JSON' },
        { text: walkinTemplate, type: 'walkin', label: 'Walk-in JSON' },
    ];
    if (governmentTemplate) {
        templates.push({ text: governmentTemplate, type: 'govt', label: 'Govt Job JSON' });
    }

    return (
        <div className="space-y-4">
            <DialogHeader>
                <DialogTitle>
                    <span className="flex items-center gap-2">
                        <BoltIcon className="w-4 h-4 text-primary" />
                        Auto-fill listing
                    </span>
                </DialogTitle>
                <DialogDescription>
                    Paste a JSON payload to fill the form, or paste a JSON array to create many listings at once.
                </DialogDescription>
            </DialogHeader>

            <div className="hidden space-y-2">
                <SmartTextarea
                    label="Paste raw text"
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste the job description here..."
                    rows={5}
                />
                <Button
                    type="button"
                    onClick={() => void handleAutoFill(pastedText)}
                    disabled={isParsing || !pastedText.trim()}
                    className="w-full"
                    size="sm"
                >
                    {isParsing ? (
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                        <BoltIcon className="w-4 h-4" />
                    )}
                    {isParsing ? 'Processing...' : 'Apply text'}
                </Button>
            </div>

            <SmartTextarea
                label="Paste JSON payload"
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder='{"type":"WALKIN","title":"...","company":"..."}'
                rows={6}
            />

            <div className="flex flex-wrap gap-2">
                {templates.map((template) => (
                    <Button
                        key={template.type}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(template.text, template.type)}
                    >
                        {copiedType === template.type ? (
                            <>
                                <CheckIcon className="w-3.5 h-3.5 text-success" />
                                <span>Copied!</span>
                            </>
                        ) : (
                            <>
                                <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                                <span>{template.label}</span>
                            </>
                        )}
                    </Button>
                ))}
            </div>

            {jsonReport && (
                <div className={`rounded-md border p-3 text-xs space-y-2 ${jsonReport.valid ? 'border-border bg-muted/40' : 'border-destructive/30 bg-destructive/5 text-destructive'}`}>
                    {!jsonReport.valid ? (
                        <p className="font-bold capitalize tracking-wider">Invalid JSON format</p>
                    ) : (
                        <>
                            <p className="font-bold capitalize tracking-wider text-muted-foreground">
                                JSON report • {jsonReport.type}
                            </p>
                            <div className="text-muted-foreground">
                                Present: {jsonReport.present.join(', ') || 'none'}
                            </div>
                            <div className={jsonReport.missing.length > 0 ? 'text-warning dark:text-warning font-semibold' : 'text-success dark:text-success font-semibold'}>
                                {jsonReport.missing.length > 0
                                    ? `Missing required: ${jsonReport.missing.join(', ')}`
                                    : 'All required fields found'}
                            </div>
                        </>
                    )}
                </div>
            )}

            {bulkPreview && (
                <div className="rounded-md border p-3 text-xs space-y-2 border-border bg-muted/40">
                    <p className="font-bold capitalize tracking-wider text-muted-foreground">
                        Bulk import • {bulkPreview.total} listings detected
                    </p>
                    <div className="text-muted-foreground">
                        {bulkPreview.valid} with title + company{bulkPreview.invalid > 0 ? `, ${bulkPreview.invalid} missing title or company (skipped)` : ''}.
                    </div>
                    {bulkPreview.overLimit && (
                        <div className="text-warning dark:text-warning font-semibold">
                            Capped at {BULK_MAX_ITEMS} per paste — split larger files.
                        </div>
                    )}
                    {bulkRunning && (
                        <div className="text-muted-foreground">
                            Creating {bulkProgress.done}/{bulkProgress.total}{bulkProgress.current ? ` • ${bulkProgress.current.slice(0, 50)}` : ''}…
                        </div>
                    )}
                    {bulkResults && (
                        <div className="max-h-40 overflow-y-auto space-y-1">
                            <div className="font-semibold text-success dark:text-success">
                                {bulkResults.filter((r) => r.ok).length} created, {bulkResults.filter((r) => !r.ok).length} failed.
                            </div>
                            {bulkResults.filter((r) => !r.ok).map((r) => (
                                <div key={r.index} className="text-destructive">
                                    {r.title.slice(0, 60)} — {r.message}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <DialogFooter>
                <div className="flex flex-1 flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                    {clearAllFields && (
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={clearAllFields}
                        >
                            Clear Form
                        </Button>
                    )}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={closeParser}>
                            Cancel
                        </Button>
                        {bulkPreview ? (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleBulkCreate}
                                disabled={bulkRunning || bulkPreview.valid === 0}
                            >
                                {bulkRunning
                                    ? `Creating ${bulkProgress.done}/${bulkProgress.total}…`
                                    : `Create ${Math.min(bulkPreview.total, BULK_MAX_ITEMS)} listings`}
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleApplySingle}
                            >
                                {!pastedJson.trim() ? 'Paste JSON & Apply' : 'Apply JSON'}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogFooter>

            {jsonReport?.valid && (
                <div className="flex flex-wrap gap-1.5">
                    <Badge variant="success">
                        {jsonReport.present.length} fields present
                    </Badge>
                    {jsonReport.missing.length > 0 && (
                        <Badge variant="warning">
                            {jsonReport.missing.length} missing
                        </Badge>
                    )}
                </div>
            )}
        </div>
    );
}
