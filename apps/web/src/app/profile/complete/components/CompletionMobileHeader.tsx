import React from 'react';
import { cn } from '@repo/ui/utils/cn';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

interface CompletionMobileHeaderProps {
    steps: { id: string; label: string; sub: string; icon: React.ElementType }[];
    currentStep: string;
    setCurrentStep: (s: string) => void;
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
        <div className="w-full max-w-2xl lg:hidden mb-4 mt-0">
            <div className="flex items-center">
                {steps.map((s, i) => {
                    const active = currentStep === s.id;
                    const done = stepDone(i);
                    const navigate = canNav(i);
                    return (
                        <React.Fragment key={s.id}>
                            <div className="flex flex-col items-center flex-1 last:flex-none">
                                <button
                                    onClick={() => navigate && setCurrentStep(s.id)}
                                    disabled={!navigate}
                                    className={cn('flex flex-col items-center gap-1 flex-1 w-full', !navigate && 'opacity-40 cursor-not-allowed')}
                                >
                                    <div className={cn(
                                        'w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all',
                                        active ? 'bg-primary border-primary text-primary-foreground'
                                            : done ? 'bg-primary/10 border-primary text-primary'
                                                : 'bg-muted border-border text-muted-foreground',
                                    )}>
                                        {done && !active ? <CheckCircleIcon className="w-3 h-3" /> : <s.icon className={cn("w-3 h-3", active && "stroke-[1.5]")} />}
                                    </div>
                                    <span className={cn('text-[10px] font-bold capitalize tracking-widest leading-none whitespace-nowrap truncate max-w-[80px]', active ? 'text-primary' : 'text-muted-foreground')}>
                                        {s.label}
                                    </span>
                                </button>
                            </div>
                            {i < steps.length - 1 && (
                                <div className="flex-1 px-1 pt-3">
                                    <div className={cn('h-px w-full transition-colors duration-500', currentIdx > i ? 'bg-primary' : 'bg-border/60')} />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};
