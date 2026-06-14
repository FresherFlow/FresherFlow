'use client';

import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/utils';
import { Button } from './Button';

interface ErrorMessageProps {
    title?: string;
    message: string;
    onRetry?: () => void;
    className?: string;
    variant?: 'default' | 'subtle' | 'card';
}

export function ErrorMessage({
    title = 'Something went wrong',
    message,
    onRetry,
    className,
    variant = 'default'
}: ErrorMessageProps) {
    if (variant === 'subtle') {
        return (
            <div className={cn("flex items-center gap-2 p-3 rounded-lg bg-destructive/5 text-destructive border border-destructive/10", className)}>
                <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
                <p className="text-xs font-medium">{message}</p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="ml-auto text-xs font-bold capitalize tracking-widest hover:underline"
                    >
                        Retry
                    </button>
                )}
            </div>
        );
    }

    if (variant === 'card') {
        return (
            <div className={cn("p-6 rounded-2xl border border-border bg-card shadow-sm flex flex-col items-center text-center space-y-4", className)}>
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                    <ExclamationTriangleIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                    <h3 className="text-base font-bold text-foreground">{title}</h3>
                    <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
                </div>
                {onRetry && (
                    <Button
                        onClick={onRetry}
                        variant="outline"
                        className="h-9 px-6 text-[10px] font-bold capitalize tracking-widest gap-2"
                    >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        Try again
                    </Button>
                )}
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col items-center justify-center p-8 space-y-6 animate-in fade-in zoom-in duration-300", className)}>
            <div className="relative">
                <div className="absolute inset-0 bg-destructive/20 blur-2xl rounded-full" />
                <div className="relative w-16 h-16 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                    <ExclamationTriangleIcon className="w-8 h-8" />
                </div>
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                    {message}
                </p>
            </div>

            {onRetry && (
                <Button
                    onClick={onRetry}
                    className="h-11 px-8 rounded-xl text-xs font-bold capitalize tracking-widest group"
                >
                    <ArrowPathIcon className="w-4 h-4 mr-2 group-active:rotate-180 transition-transform duration-500" />
                    Attempt Recovery
                </Button>
            )}
        </div>
    );
}
