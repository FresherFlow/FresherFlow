import { Briefcase, GraduationCap, MapPin, Landmark, Check } from "lucide-react";
import { cn } from "@/ui/cn";
import type { OpportunityFormApi } from '@/features/admin/opportunities/useOpportunityForm';

const TYPE_OPTIONS = [
    {
        value: 'JOB',
        label: 'Job',
        description: 'Full-time role with direct apply',
        icon: Briefcase,
    },
    {
        value: 'INTERNSHIP',
        label: 'Internship',
        description: 'Fixed-term role with stipend',
        icon: GraduationCap,
    },
    {
        value: 'WALKIN',
        label: 'Walk-in',
        description: 'In-person drive with venue',
        icon: MapPin,
    },
    {
        value: 'GOVERNMENT',
        label: 'Government',
        description: 'Sarkari notice with official data',
        icon: Landmark,
    },
] as const;

export function TypeSelection({ form }: { form: OpportunityFormApi }) {
    const { type, setType } = form;
    return (
        <div className="space-y-3">
            <div>
                <p className="text-sm font-semibold text-foreground">What are you publishing?</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    The form below adapts to the type you pick.
                </p>
            </div>
            <div
                role="radiogroup"
                aria-label="Opportunity type"
                className="grid grid-cols-2 gap-2.5 lg:grid-cols-4"
            >
                {TYPE_OPTIONS.map((option) => {
                    const isActive = type === option.value;
                    const Icon = option.icon;
                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            onClick={() => setType(option.value)}
                            className={cn(
                                "relative flex items-start gap-3 rounded-xl border bg-card p-3.5 text-left shadow-sm transition-all duration-150 ease-out active:scale-[0.98] motion-reduce:transform-none",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                isActive
                                    ? "border-primary ring-2 ring-primary/20"
                                    : "border-border hover:border-foreground/30 hover:bg-muted/40"
                            )}
                        >
                            <span
                                className={cn(
                                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                                    isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                )}
                            >
                                <Icon className="h-4.5 w-4.5" />
                            </span>
                            <span className="min-w-0">
                                <span className="block text-sm font-semibold text-foreground">
                                    {option.label}
                                </span>
                                <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                                    {option.description}
                                </span>
                            </span>
                            {isActive && (
                                <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                    <Check className="h-3 w-3" />
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
