import React from 'react';

interface QuickActionsMobileProps {
    onReportClick: () => void;
}

export const QuickActionsMobile = ({ onReportClick }: QuickActionsMobileProps) => {
    return (
        <div className="lg:hidden bg-card p-4 rounded-xl border border-border space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Quick actions</h4>
            <button
                onClick={onReportClick}
                className="w-full h-9 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/5 transition-all text-xs font-bold uppercase"
            >
                Report issue
            </button>
            <p className="text-xs text-muted-foreground">
                We never charge for placement. Report suspicious activity.
            </p>
        </div>
    );
};
