import React from 'react';
import { cn } from '@repo/ui/utils/cn';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

type StepId = 'education' | 'preferences' | 'readiness';

interface Step {
    id: StepId;
    label: string;
    sub: string;
    icon: React.ElementType;
}

interface CompletionMobileHeaderProps {
    steps: Step[];
    currentStep: StepId;
    setCurrentStep: (s: StepId) => void;
    stepDone: (i: number) => boolean;
    canNav: (i: number) => boolean;
    currentIdx: number;
}

export const CompletionMobileHeader = ({
    steps,
    currentStep,
    setCurrentStep,
    stepDone,
    canNav,
    currentIdx
}: CompletionMobileHeaderProps) => {
    return (
        <div className="w-full max-w-2xl lg:hidden mb-6">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Profile Setup</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Takes about 2 minutes.</p>
                </div>
                <a href="/logout" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                    Logout
                </a>
            </div>
            <div className="flex items-center">
                {steps.map((s, i) => {
                    const active = currentStep === s.id;
                    const done = stepDone(i);
                    const navigate = canNav(i);
                    return (
                        <div key={s.id} className="flex items-center flex-1 last:flex-none">
                            <button
                                onClick={() => navigate && setCurrentStep(s.id)}
                                disabled={!navigate}
                                className={cn('flex flex-col items-center gap-1 flex-1', !navigate && 'opacity-40 cursor-not-allowed')}
                            >
                                <div className={cn(
                                    'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                                    active ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/30'
                                        : done ? 'bg-primary/10 border-primary text-primary'
                                            : 'bg-muted border-border text-muted-foreground',
                                )}>
                                    {done && !active ? <CheckCircleIcon className="w-4 h-4" /> : <s.icon className="w-3.5 h-3.5" />}
                                </div>
                                <span className={cn('text-[9px] font-bold uppercase tracking-widest', active ? 'text-foreground' : 'text-muted-foreground')}>
                                    {s.label}
                                </span>
                            </button>
                            {i < steps.length - 1 && (
                                <div className={cn('h-px flex-1 mx-1.5 mb-4 transition-colors duration-500', currentIdx > i ? 'bg-primary' : 'bg-border')} />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};






