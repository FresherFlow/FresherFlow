import { MapPinIcon } from '@heroicons/react/24/outline';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { INDIAN_CITIES } from '@fresherflow/constants';

interface LogisticsSectionProps {
    type: 'JOB' | 'INTERNSHIP' | 'WALKIN' | 'GOVERNMENT';
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
        <div className="space-y-5 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
            <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                <MapPinIcon className="w-4 h-4 text-muted-foreground" />
                Logistics
            </h3>

            <SmartInput
                label="Locations"
                value={locations}
                onChange={(e) => setLocations(e.target.value)}
                placeholder="Mumbai, Bangalore, Remote"
                helpText={
                    <div className="flex flex-wrap gap-1.5 pt-1.5">
                        {['Pan India', ...INDIAN_CITIES.slice(0, 5), 'Remote'].map(loc => (
                            <button
                                key={loc}
                                type="button"
                                onClick={() => handleQuickLocation(loc)}
                                className="px-2 py-1 rounded bg-muted/50 hover:bg-primary/10 hover:text-primary text-xs font-semibold capitalize transition-all border border-transparent hover:border-primary/20"
                            >
                                + {loc}
                            </button>
                        ))}
                    </div>
                }
            />

            {type !== 'WALKIN' && (
                <div className="space-y-2.5">
                    <label className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5">Work mode</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['ONSITE', 'HYBRID', 'REMOTE'] as const).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => setWorkMode(mode)}
                                className={`h-8 rounded-sm text-sm font-medium border transition-none ${workMode === mode
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-background border-input text-foreground hover:bg-muted'
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
