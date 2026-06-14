import { CurrencyRupeeIcon } from '@heroicons/react/24/outline';
import { SmartInput } from '@/features/admin/ui/SmartInput';

interface SalarySectionProps {
    salaryPeriod: 'YEARLY' | 'MONTHLY';
    setSalaryPeriod: (val: 'YEARLY' | 'MONTHLY') => void;
    salaryAmount: string;
    setSalaryAmount: (val: string) => void;
    salaryRange: string;
    setSalaryRange: (val: string) => void;
    stipend: string;
    setStipend: (val: string) => void;
}

export function SalarySection({
    salaryPeriod, setSalaryPeriod,
    salaryAmount, setSalaryAmount,
    salaryRange, setSalaryRange,
    stipend, setStipend
}: SalarySectionProps) {
    return (
        <div className="space-y-5 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
            <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                <CurrencyRupeeIcon className="w-4 h-4 text-muted-foreground" />
                Compensation
            </h3>
            
            <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5">Salary Configuration</label>
                <div className="flex gap-2">
                    {(['YEARLY', 'MONTHLY'] as const).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setSalaryPeriod(p)}
                            className={`px-2 py-1 rounded-sm text-sm font-medium transition-none border ${salaryPeriod === p
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-input text-foreground hover:bg-muted'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SmartInput
                    label={`Salary amount (${salaryPeriod === 'YEARLY' ? 'LPA' : 'Monthly'})`}
                    value={salaryAmount}
                    type="number"
                    onChange={(e) => setSalaryAmount(e.target.value)}
                    placeholder={salaryPeriod === 'YEARLY' ? 'e.g. 2' : 'e.g. 20000'}
                    helpText={salaryPeriod === 'YEARLY' ? 'Enter LPA (e.g. 2 = 2 LPA)' : 'Enter monthly salary (e.g. 20000)'}
                />
                
                <SmartInput
                    label="Salary note (optional)"
                    value={salaryRange}
                    type="text"
                    onChange={(e) => setSalaryRange(e.target.value)}
                    placeholder="e.g. 2 LPA or 15-20k/month"
                />
                <SmartInput
                    label="Stipend (for Internships)"
                    value={stipend}
                    type="text"
                    onChange={(e) => setStipend(e.target.value)}
                    placeholder="e.g. 15k/month"
                />
            </div>
        </div>
    );
}
