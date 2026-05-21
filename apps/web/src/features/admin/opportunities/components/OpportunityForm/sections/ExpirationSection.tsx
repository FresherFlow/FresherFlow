interface ExpirationSectionProps {
    expiresAt: string;
    setExpiresAt: (val: string) => void;
    onToggleAmPm: (target: 'AM' | 'PM') => void;
}

export function ExpirationSection({ expiresAt, setExpiresAt, onToggleAmPm }: ExpirationSectionProps) {
    return (
        <div className="space-y-1.5 relative group md:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider flex items-center gap-1.5">
                Expiration Date
            </label>
            <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split('T')[0] + "T00:00"}
                max="2099-12-31T23:59"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
            />
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
                {expiresAt && (
                    <button
                        type="button"
                        onClick={() => setExpiresAt('')}
                        className="px-2 py-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive text-[10px] font-bold capitalize transition-colors ml-auto"
                    >
                        Clear Date
                    </button>
                )}
            </div>
        </div>
    );
}
