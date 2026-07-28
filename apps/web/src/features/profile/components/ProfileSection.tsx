'use client';

import React from 'react';
import { cn } from '@/ui/cn';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import PencilIcon from '@heroicons/react/24/outline/PencilIcon';

export type CompactSectionProps = {
    title: string;
    description?: string;
    children: React.ReactNode;
    viewContent: React.ReactNode;
    isEditing: boolean;
    onToggleEdit: () => void;
    onSave: () => void;
    saving?: boolean;
    actionLabel?: string;
};

export function CompactSection({ 
    title, description, children, onSave, saving, isEditing, onToggleEdit, viewContent, actionLabel = 'Edit' 
}: CompactSectionProps) {
    return (
        <>
            <style>{`
                .stagger-item {
                    opacity: 0;
                    transform: translateY(8px);
                    animation: fadeInStagger 300ms ease-out forwards;
                }
                @keyframes fadeInStagger {
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .stagger-item:nth-of-type(1) { animation-delay: 0ms; }
                .stagger-item:nth-of-type(2) { animation-delay: 50ms; }
                .stagger-item:nth-of-type(3) { animation-delay: 100ms; }
                .stagger-item:nth-of-type(4) { animation-delay: 150ms; }
                .stagger-item:nth-of-type(5) { animation-delay: 200ms; }
                .stagger-item:nth-of-type(6) { animation-delay: 250ms; }
                .stagger-item:nth-of-type(7) { animation-delay: 300ms; }
                .stagger-item:nth-of-type(8) { animation-delay: 350ms; }
            `}</style>
            <section className={cn(
                'bg-card rounded-2xl border transition-all duration-200 flex flex-col relative shadow-2xs stagger-item',
                isEditing ? 'border-primary/40 ring-1 ring-primary/10' : 'border-border/60 hover:border-border/80'
            )}>
            <div className="flex items-center justify-between px-5 py-4 bg-muted/20 border-b border-border/40 rounded-t-2xl">
                <div>
                    <h2 className="text-base font-semibold text-foreground tracking-tight">{title}</h2>
                    {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
                </div>
                <button
                    onClick={onToggleEdit}
                    type="button"
                    className={cn(
                        'flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shrink-0 ml-4',
                        isEditing
                            ? 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                            : 'bg-primary/5 text-primary border-primary/20 hover:bg-primary/10'
                    )}
                >
                    {isEditing ? 'Cancel' : <><PencilIcon className="w-3.5 h-3.5" /> {actionLabel}</>}
                </button>
            </div>

            <div className="p-5 flex-1">
                {isEditing ? <div className="space-y-4 animate-in fade-in duration-200">{children}</div> : viewContent}
            </div>

            {isEditing && (
                <div className="bg-muted/20 px-5 py-3 border-t border-border/40 flex justify-end gap-2 shrink-0 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onToggleEdit}
                        className="px-4 py-2 rounded-xl text-xs font-semibold border border-border bg-card text-muted-foreground hover:bg-muted transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={saving}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all cursor-pointer"
                    >
                        {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : null}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </section>
        </>
    );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5 w-full">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-0.5">{label}</label>
            {children}
        </div>
    );
}
