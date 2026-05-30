import { InformationCircleIcon } from '@heroicons/react/24/outline';

interface TypeSelectionProps {
    type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
    setType: (type: 'JOB' | 'INTERNSHIP' | 'WALKIN') => void;
    isGovernmentJob?: boolean;
    setIsGovernmentJob?: (value: boolean) => void;
}

export function TypeSelection({ type, setType, isGovernmentJob = false, setIsGovernmentJob }: TypeSelectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col justify-center">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Opportunity Type
                </label>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'JOB' | 'INTERNSHIP' | 'WALKIN')}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <option value="JOB">JOB - Direct apply</option>
                    <option value="INTERNSHIP">INTERNSHIP - Direct apply</option>
                    <option value="WALKIN">WALKIN - In-person</option>
                </select>
            </div>

            {setIsGovernmentJob && (
                <div className="flex items-center justify-between p-2.5 rounded-md border border-border bg-card">
                    <p className="text-xs font-bold text-foreground">Govt Job Mode</p>

                        <button
                            type="button"
                            role="switch"
                            aria-checked={isGovernmentJob}
                            onClick={() => setIsGovernmentJob(!isGovernmentJob)}
                            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary ${
                                isGovernmentJob ? 'bg-primary' : 'bg-muted-foreground/30'
                            }`}
                        >
                            <span
                                aria-hidden="true"
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                    isGovernmentJob ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                )}
            </div>
    );
}
