import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

type StepId = 'education' | 'preferences' | 'readiness';

interface Step {
    id: StepId;
    label: string;
    sub: string;
    icon: React.ElementType;
}

interface CompletionSidebarProps {
    steps: Step[];
    currentStep: StepId;
    setCurrentStep: (s: StepId) => void;
    completion: number;
    stepDone: (i: number) => boolean;
    canNav: (i: number) => boolean;
}

export const CompletionSidebar = ({
    steps,
    currentStep,
    setCurrentStep,
    completion,
    stepDone,
    canNav
}: CompletionSidebarProps) => {
    const currentIdx = steps.findIndex(s => s.id === currentStep);
    
    return (
        <aside className="hidden lg:flex flex-col gap-6 px-8 py-10 border-r border-border/50 sticky top-0 h-screen overflow-y-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold tracking-tight">Profile Setup</h1>
                <a href="/logout" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                    Logout
                </a>
            </div>

            <p className="text-xs text-muted-foreground -mt-4">
                Takes about 2 minutes. Helps us match you better.
            </p>

            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
                <div className="relative w-16 h-16 shrink-0">
                    <svg className="w-full h-full -rotate-90">
                        <circle cx="32" cy="32" r="28" strokeWidth="5" fill="none" className="text-muted stroke-current" />
                        <circle
                            cx="32" cy="32" r="28" strokeWidth="5" fill="none"
                            strokeDasharray={175.9}
                            strokeDashoffset={175.9 * (1 - completion / 100)}
                            className="text-primary stroke-current transition-all duration-700 ease-out"
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                        {completion}%
                    </div>
                </div>
                <div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Completion</p>
                    <p className="text-sm font-bold">{completion}% done</p>
                </div>
            </div>

            <div className="space-y-2">
                {steps.map((s, i) => {
                    const active = currentStep === s.id;
                    const done = stepDone(i);
                    const navigate = canNav(i);
                    return (
                        <button
                            key={s.id}
                            onClick={() => navigate && setCurrentStep(s.id)}
                            disabled={!navigate}
                            className={cn(
                                'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                                active ? 'bg-primary/10 border-primary/30 text-foreground shadow-sm'
                                    : done ? 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50 cursor-pointer'
                                        : 'bg-card border-border/40 text-muted-foreground opacity-40 cursor-not-allowed',
                            )}
                        >
                            <div className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all',
                                active ? 'bg-primary border-primary text-primary-foreground'
                                    : done ? 'bg-primary/10 border-primary text-primary'
                                        : 'bg-muted border-border text-muted-foreground',
                            )}>
                                {done && !active
                                    ? <CheckCircleIcon className="w-4 h-4" />
                                    : <s.icon className="w-4 h-4" />
                                }
                            </div>

                            <div className="min-w-0">
                                <p className={cn('text-xs font-bold uppercase tracking-wider', active ? 'text-foreground' : '')}>
                                    {s.label}
                                </p>
                                <p className="text-[10px] text-muted-foreground truncate">{s.sub}</p>
                            </div>

                            {done && !active && (
                                <CheckCircleIcon className="w-4 h-4 ml-auto text-primary shrink-0" />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="mt-auto pt-4 border-t border-border/40">
                <p className="text-[10px] text-muted-foreground">
                    Step {currentIdx + 1} of {steps.length}
                </p>
            </div>
        </aside>
    );
};
