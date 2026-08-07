import React from 'react';
import Link from 'next/link';
import { cn } from '@repo/ui/utils/cn';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

interface CompletionSidebarProps {
    steps: { id: string; label: string; sub: string; icon: React.ElementType }[];
    currentStep: string;
    setCurrentStep: (s: string) => void;
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
    return (
        <aside className="hidden lg:flex flex-col gap-6 px-4 py-10 sticky top-0 h-screen overflow-hidden">
            <div className="flex flex-col gap-8 bg-card border border-border rounded-[32px] p-8 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-foreground">Profile Setup</h1>
                    <p className="text-[13px] text-muted-foreground font-medium mt-0.5 tracking-normal">2 Simple Steps • 2 Mins</p>
                </div>

                <div className="space-y-4">
                    {steps.map((s, i) => {
                        const active = currentStep === s.id;
                        const done = stepDone(i);
                        const navigate = canNav(i);

                        return (
                            <div key={s.id} className="relative group">
                                {i < steps.length - 1 && (
                                    <div className={cn(
                                        "absolute left-5 top-10 w-0.5 h-6 z-0 transition-colors duration-500",
                                        done ? "bg-primary" : "bg-border/40"
                                    )} />
                                )}

                                <button
                                    onClick={() => navigate && setCurrentStep(s.id)}
                                    disabled={!navigate}
                                    className={cn(
                                        "w-full flex items-center gap-4 relative z-10 transition-all",
                                        !navigate && "opacity-40 cursor-not-allowed"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                                        active ? "bg-primary border-primary text-primary-foreground shadow-md"
                                            : done ? "bg-card border-primary text-primary"
                                                : "bg-card border-border text-muted-foreground"
                                    )}>
                                        {done && !active ? (
                                            <CheckCircleIcon className="w-5 h-5 stroke-[2.5]" />
                                        ) : (
                                            <s.icon className={cn("w-5 h-5", active && "stroke-[2.5]")} />
                                        )}
                                    </div>

                                    <div className="text-left">
                                        <p className={cn(
                                            "text-[14px] font-bold tracking-normal",
                                            active ? "text-foreground" : "text-muted-foreground"
                                        )}>
                                            {s.label}
                                        </p>
                                        {active && (
                                            <p className="text-[13px] text-primary/70 font-medium">In Progress</p>
                                        )}
                                    </div>
                                </button>
                            </div>
                        );
                    })}
                </div>

                <div className="pt-6 border-t border-border/40">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[14px] font-semibold text-muted-foreground tracking-normal">Profile Score</span>
                        <span className="text-[14px] font-bold text-foreground">{completion}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all duration-1000 ease-out rounded-full"
                            style={{ width: `${completion}%` }}
                        />
                    </div>
                </div>

                <Link href="/logout" className="text-[14px] font-semibold tracking-normal text-muted-foreground hover:text-foreground transition-colors mt-auto pt-4 text-center">
                    Logout From Account
                </Link>
            </div>
        </aside>
    );
};
