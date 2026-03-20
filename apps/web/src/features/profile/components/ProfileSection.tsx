'use client';

import { cn } from '@repo/ui/utils/cn';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import PencilIcon from '@heroicons/react/24/outline/PencilIcon';

type CompactSectionProps = {
    title: string;
    children: React.ReactNode;
    viewContent: React.ReactNode;
    isEditing: boolean;
    onToggleEdit: () => void;
    onSave: () => void;
    saving?: boolean;
};

export function CompactSection({ title, children, onSave, saving, isEditing, onToggleEdit, viewContent }: CompactSectionProps) {
    return (
        <section className={cn(
            'bg-card rounded-xl border transition-all duration-300 overflow-visible flex flex-col relative',
            isEditing ? 'border-primary/40 shadow-md ring-1 ring-primary/10 z-10' : 'border-border/60 hover:shadow-sm hover:border-border/80 z-0'
        )}>
            <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-b border-border/40 rounded-t-xl">
                <h2 className="text-sm font-bold text-foreground">{title}</h2>
                <button
                    onClick={onToggleEdit}
                    className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors',
                        isEditing ? 'bg-muted text-muted-foreground hover:bg-muted/80' : 'bg-primary/5 text-primary hover:bg-primary/10'
                    )}
                >
                    {isEditing ? 'Cancel' : <><PencilIcon className="w-3 h-3" /> Edit</>}
                </button>
            </div>

            <div className="p-4 flex-1">
                {isEditing ? <div className="space-y-4 animate-in fade-in duration-300">{children}</div> : viewContent}
            </div>

            {isEditing && (
                <div className="bg-muted/30 px-4 py-3 border-t border-border/50 flex justify-end animate-in slide-in-from-bottom-2 duration-300 shrink-0 rounded-b-xl">
                    <button
                        onClick={onSave}
                        disabled={saving}
                        className="h-8 px-5 rounded-lg text-xs font-bold bg-foreground text-background shadow-sm hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
                    >
                        {saving ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" /> : null}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            )}
        </section>
    );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5 w-full">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-0.5">{label}</label>
            {children}
        </div>
    );
}






