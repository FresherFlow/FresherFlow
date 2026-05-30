interface ExpirationSectionProps {
    expiresAt: string;
    setExpiresAt: (val: string) => void;
    onToggleAmPm: (target: 'AM' | 'PM') => void;
}

export function ExpirationSection({ expiresAt, setExpiresAt, onToggleAmPm }: ExpirationSectionProps) {
    return (
        <div className="space-y-5 md:space-y-6 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm relative group md:col-span-2">
            <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider flex items-center gap-1.5">
                    Expiration Date
                </label>
            </div>
            <div className="flex gap-2">
                <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split('T')[0] + "T00:00"}
                    max="2099-12-31T23:59"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                />
                <button
                    type="button"
                    onClick={() => setExpiresAt('')}
                    disabled={!expiresAt}
                    className="px-3 h-11 rounded-md border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 text-destructive text-xs font-bold transition-all shadow-sm shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    Clear
                </button>
            </div>
            <div className="flex gap-1.5 mt-1.5">
                <button
                    type="button"
                    onClick={() => onToggleAmPm('AM')}
                    className="px-2 py-1 rounded bg-muted hover:bg-muted-foreground/10 text-[10px] font-bold capitalize transition-colors"
                >
                    Force AM
                </button>
                <button
                    type="button"
                    onClick={() => onToggleAmPm('PM')}
                    className="px-2 py-1 rounded bg-muted hover:bg-muted-foreground/10 text-[10px] font-bold capitalize transition-colors"
                >
                    Force PM
                </button>
            </div>
        </div>
    );
}
