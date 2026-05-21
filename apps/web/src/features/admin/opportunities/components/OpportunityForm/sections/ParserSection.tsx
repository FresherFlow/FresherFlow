import { BoltIcon } from '@heroicons/react/24/outline';

interface ParserSectionProps {
    pastedText: string;
    setPastedText: (val: string) => void;
    handleAutoFill: () => void;
    isParsing: boolean;
    pastedJson: string;
    setPastedJson: (val: string) => void;
    applyJsonToForm: () => void;
    jsonReport: {
        valid: boolean;
        type: string | null;
        missing: string[];
        present: string[];
    } | null;
    closeParser: () => void;
    jobTemplate: string;
    internshipTemplate: string;
    walkinTemplate: string;
    governmentTemplate?: string;
    clearAllFields?: () => void;
}

export function ParserSection({
    pastedText, setPastedText,
    handleAutoFill, isParsing,
    pastedJson, setPastedJson,
    applyJsonToForm, jsonReport,
    clearAllFields,
    closeParser,
    jobTemplate, internshipTemplate, walkinTemplate, governmentTemplate
}: ParserSectionProps) {
    return (
        <div className="bg-muted/30 border border-border rounded-lg p-4 md:p-5 shadow-sm animate-in slide-in-from-top-2 duration-300">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <BoltIcon className="w-4 h-4 text-primary" />
                        Auto-fill
                    </h3>
                    <button onClick={closeParser} className="text-muted-foreground hover:text-foreground text-xs font-bold capitalize">
                        Close
                    </button>
                </div>
                <div className="grid grid-cols-1 gap-3">
                    <div className="hidden space-y-2">
                        <label className="text-[10px] font-bold capitalize tracking-widest text-muted-foreground">Paste raw text</label>
                        <textarea
                            value={pastedText}
                            onChange={(e) => setPastedText(e.target.value)}
                            placeholder="Paste the job description here..."
                            className="w-full min-h-32 p-3 text-sm rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                        <button
                            type="button"
                            onClick={handleAutoFill}
                            disabled={isParsing || !pastedText.trim()}
                            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-md transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isParsing ? (
                                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                            ) : (
                                <BoltIcon className="w-4 h-4" />
                            )}
                            {isParsing ? 'Processing...' : 'Apply text'}
                        </button>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold capitalize tracking-widest text-muted-foreground">Paste JSON payload</label>
                        <textarea
                            value={pastedJson}
                            onChange={(e) => setPastedJson(e.target.value)}
                            placeholder='{"type":"WALKIN","title":"...","company":"..."}'
                            className="w-full min-h-32 p-3 text-sm rounded-md border border-border bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono"
                        />
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setPastedJson(jobTemplate)}
                                className="px-2.5 py-1 rounded-md text-[10px] font-bold capitalize tracking-widest bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                                Insert Job
                            </button>
                            <button
                                type="button"
                                onClick={() => setPastedJson(internshipTemplate)}
                                className="px-2.5 py-1 rounded-md text-[10px] font-bold capitalize tracking-widest bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                                Insert Internship
                            </button>
                            <button
                                type="button"
                                onClick={() => setPastedJson(walkinTemplate)}
                                className="px-2.5 py-1 rounded-md text-[10px] font-bold capitalize tracking-widest bg-muted/60 border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            >
                                Insert Walk-in
                            </button>
                            {governmentTemplate && (
                                <button
                                    type="button"
                                    onClick={() => setPastedJson(governmentTemplate)}
                                    className="px-2.5 py-1 rounded-md text-[10px] font-bold capitalize tracking-widest bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15"
                                >
                                    Insert Govt Job
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={applyJsonToForm}
                                disabled={!pastedJson.trim()}
                                className="flex-1 h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-md transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                Apply JSON
                            </button>
                            {clearAllFields && (
                                <button
                                    type="button"
                                    onClick={clearAllFields}
                                    className="px-4 h-10 bg-destructive/10 hover:bg-destructive/20 text-destructive font-bold text-sm rounded-md transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
                                >
                                    Clear Form
                                </button>
                            )}
                        </div>
                        {jsonReport && (
                            <div className={`rounded-md border p-3 text-[10px] space-y-2 ${jsonReport.valid ? 'border-border bg-muted/40' : 'border-destructive/30 bg-destructive/5 text-destructive'}`}>
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
                                        <div className={jsonReport.missing.length > 0 ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-emerald-600 dark:text-emerald-400 font-semibold'}>
                                            {jsonReport.missing.length > 0
                                                ? `Missing required: ${jsonReport.missing.join(', ')}`
                                                : 'All required fields found'}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
