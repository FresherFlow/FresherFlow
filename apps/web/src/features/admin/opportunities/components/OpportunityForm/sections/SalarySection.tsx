import { CurrencyRupeeIcon } from '@heroicons/react/24/outline';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { Card, CardDescription, CardContent } from '@/ui/Card';
import { Tabs, TabsList, TabsTrigger } from '@/ui/Tabs';
import type { OpportunityFormApi } from '@/features/admin/opportunities/useOpportunityForm';

export function SalarySection({ form }: { form: OpportunityFormApi }) {
    const {
        salaryPeriod, setSalaryPeriod,
        salaryAmount, setSalaryAmount,
        salaryRange, setSalaryRange,
        stipend, setStipend
    } = form;
    return (
        <Card>
            <div className="p-4 md:p-5 pb-3 space-y-1">
                <h3 className="flex items-center gap-2 text-sm md:text-base font-semibold text-foreground">
                    <CurrencyRupeeIcon className="w-4 h-4 text-muted-foreground" />
                    Compensation
                </h3>
                <CardDescription>
                    What the candidate earns.
                </CardDescription>
            </div>
            <CardContent className="space-y-5 px-4 md:px-5 pb-4 md:pb-5">
            <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5">Salary Configuration</label>
                <Tabs value={salaryPeriod} onValueChange={(v) => setSalaryPeriod(v as 'YEARLY' | 'MONTHLY')}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="YEARLY">Yearly · LPA</TabsTrigger>
                        <TabsTrigger value="MONTHLY">Monthly</TabsTrigger>
                    </TabsList>
                </Tabs>
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
            </CardContent>
        </Card>
    );
}
