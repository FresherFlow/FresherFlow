import XMarkIcon from '@heroicons/react/20/solid/XMarkIcon';

interface ExpirationSectionProps {
    expiryDate: string;
    setExpiryDate: (val: string) => void;
    expiryTime: string;
    setExpiryTime: (val: string) => void;
    onToggleAmPm: (target: 'AM' | 'PM') => void;
}

export function ExpirationSection({
    expiryDate, setExpiryDate,
    expiryTime, setExpiryTime,
    onToggleAmPm
}: ExpirationSectionProps) {
    const handleClear = () => {
        setExpiryDate('');
        setExpiryTime('');
    };

    return (
        <div className="space-y-4 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm md:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">
                Expiration Date &amp; Time
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider block">
                        Date (Optional)
                    </label>
                    <div className="relative">
                        <input
                            type="date"
                            value={expiryDate}
                            onChange={(e) => setExpiryDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm pr-9"
                        />
                        {expiryDate && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-muted hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors"
                                aria-label="Clear date"
                            >
                                <XMarkIcon className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Time */}
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider block">
                        Time (Optional — default 23:59)
                    </label>
                    <input
                        type="time"
                        value={expiryTime}
                        onChange={(e) => setExpiryTime(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* AM/PM quick set — only shown when a date is selected */}
            {expiryDate && (
                <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Quick set:</span>
                    <button
                        type="button"
                        onClick={() => onToggleAmPm('AM')}
                        className="px-3 py-1 rounded bg-muted hover:bg-muted-foreground/10 text-[10px] font-bold uppercase tracking-wider transition-colors"
                    >
                        Force AM
                    </button>
                    <button
                        type="button"
                        onClick={() => onToggleAmPm('PM')}
                        className="px-3 py-1 rounded bg-muted hover:bg-muted-foreground/10 text-[10px] font-bold uppercase tracking-wider transition-colors"
                    >
                        Force PM
                    </button>
                </div>
            )}
        </div>
    );
}
