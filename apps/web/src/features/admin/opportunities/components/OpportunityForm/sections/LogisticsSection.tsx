import { MapPinIcon } from '@heroicons/react/24/outline';

interface LogisticsSectionProps {
    type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
    locations: string;
    setLocations: (val: string) => void;
    handleQuickLocation: (loc: string) => void;
    workMode: 'ONSITE' | 'HYBRID' | 'REMOTE';
    setWorkMode: (mode: 'ONSITE' | 'HYBRID' | 'REMOTE') => void;
}

export function LogisticsSection({
    type,
    locations, setLocations,
    handleQuickLocation,
    workMode, setWorkMode
}: LogisticsSectionProps) {
    return (
        <div className="space-y-5 md:space-y-6 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
            <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                <MapPinIcon className="w-4 h-4 text-muted-foreground" />
                Logistics
            </h3>

            <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">Locations</label>
                <input
                    required
                    value={locations}
                    onChange={(e) => setLocations(e.target.value)}
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                    placeholder="Mumbai, Bangalore, Remote"
                />
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {['Pan India', 'Bangalore', 'Mumbai', 'Delhi', 'Hyderabad', 'Remote'].map(loc => (
                        <button
                            key={loc}
                            type="button"
                            onClick={() => handleQuickLocation(loc)}
                            className="px-2 py-1 rounded bg-muted/50 hover:bg-primary/10 hover:text-primary text-[10px] font-bold capitalize transition-all border border-transparent hover:border-primary/20"
                        >
                            + {loc}
                        </button>
                    ))}
                </div>
            </div>

            {type !== 'WALKIN' && (
                <div className="space-y-2.5">
                    <label className="text-xs font-semibold text-muted-foreground capitalize tracking-wider">Work mode</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['ONSITE', 'HYBRID', 'REMOTE'] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setWorkMode(mode)}
                                className={`h-10 rounded-md text-xs font-semibold border transition-all ${workMode === mode
                                    ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                    : 'bg-background border-input text-muted-foreground hover:border-primary/40'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
