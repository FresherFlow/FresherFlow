import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface TypeSelectionProps {
    type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
    setType: (type: 'JOB' | 'INTERNSHIP' | 'WALKIN') => void;
    isGovernmentJob?: boolean;
    setIsGovernmentJob?: (value: boolean) => void;
}

export function TypeSelection({ type, setType, isGovernmentJob = false, setIsGovernmentJob }: TypeSelectionProps) {
    return (
        <div className="space-y-3">
            <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                <InformationCircleIcon className="w-4 h-4 text-muted-foreground" />
                Type
            </h3>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
                {(['JOB', 'INTERNSHIP', 'WALKIN'] as const).map((t) => (
                    <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-lg border transition-all text-center h-full ${type === t
                            ? 'bg-primary/5 border-primary ring-1 ring-primary shadow-sm'
                            : 'bg-card border-border hover:border-muted-foreground/30 hover:bg-muted/50'
                            }`}
                    >
                        <span className={`text-[10px] md:text-sm font-bold capitalize tracking-wider ${type === t ? 'text-primary' : 'text-foreground'}`}>{t}</span>
                        <span className="text-[9px] md:text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                            {t === 'WALKIN' ? 'In-person' : 'Direct apply'}
                        </span>
                    </button>
                ))}
            </div>
            {setIsGovernmentJob && (
                <button
                    type="button"
                    onClick={() => setIsGovernmentJob(!isGovernmentJob)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${isGovernmentJob ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border bg-card hover:bg-muted/40'}`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-bold text-foreground">Government Job Mode</p>
                            <p className="text-xs text-muted-foreground">Turn this on for official-notice fields, tags, fee, age, and exam timeline metadata.</p>
                        </div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold capitalize tracking-widest ${isGovernmentJob ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                            {isGovernmentJob ? 'On' : 'Off'}
                        </span>
                    </div>
                </button>
            )}
        </div>
    );
}
