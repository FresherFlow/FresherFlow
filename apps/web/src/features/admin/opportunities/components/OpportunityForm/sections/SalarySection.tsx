interface SalarySectionProps {
    salaryPeriod: 'YEARLY' | 'MONTHLY';
    setSalaryPeriod: (val: 'YEARLY' | 'MONTHLY') => void;
    salaryAmount: string;
    setSalaryAmount: (val: string) => void;
    salaryRange: string;
    setSalaryRange: (val: string) => void;
}

export function SalarySection({
    salaryPeriod, setSalaryPeriod,
    salaryAmount, setSalaryAmount,
    salaryRange, setSalaryRange
}: SalarySectionProps) {
    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salary Configuration</label>
                <div className="flex gap-2">
                    {(['YEARLY', 'MONTHLY'] as const).map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => setSalaryPeriod(p)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all border ${salaryPeriod === p
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-muted/50 border-transparent text-muted-foreground hover:bg-muted'
                                }`}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Salary amount ({salaryPeriod === 'YEARLY' ? 'LPA' : 'Monthly'})
                    </label>
                    <input
                        type="number"
                        value={salaryAmount}
                        onChange={(e) => setSalaryAmount(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                        placeholder={salaryPeriod === 'YEARLY' ? 'e.g. 2' : 'e.g. 20000'}
                    />
                    <p className="text-[10px] text-muted-foreground">
                        {salaryPeriod === 'YEARLY'
                            ? 'Enter LPA (e.g. 2 = 2 LPA)'
                            : 'Enter monthly salary (e.g. 20000)'}
                    </p>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Salary note (optional)</label>
                    <input
                        type="text"
                        value={salaryRange}
                        onChange={(e) => setSalaryRange(e.target.value)}
                        className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary transition-all shadow-sm"
                        placeholder="e.g. 2 LPA or 15-20k/month"
                    />
                </div>
            </div>
        </div>
    );
}
