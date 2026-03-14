import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface TypeSelectionProps {
    type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
    setType: (type: 'JOB' | 'INTERNSHIP' | 'WALKIN') => void;
}

export function TypeSelection({ type, setType }: TypeSelectionProps) {
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
                        <span className={`text-[10px] md:text-sm font-bold uppercase tracking-wider ${type === t ? 'text-primary' : 'text-foreground'}`}>{t}</span>
                        <span className="text-[9px] md:text-xs text-muted-foreground mt-0.5 whitespace-nowrap">
                            {t === 'WALKIN' ? 'In-person' : 'Direct apply'}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
