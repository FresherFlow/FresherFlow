'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/features/system/components/ui/Button';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                        </svg>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
                        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            An unexpected error occurred. We&apos;ve been notified and are looking into it.
                        </p>
                    </div>
                    <Button
                        onClick={() => window.location.reload()}
                        className="h-9 px-4 text-xs font-bold uppercase tracking-widest"
                    >
                        Reload page
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}






