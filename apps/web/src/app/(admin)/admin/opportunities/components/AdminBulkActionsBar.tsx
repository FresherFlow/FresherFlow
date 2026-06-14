import React from 'react';

interface AdminBulkActionsBarProps {
    selectedCount: number;
    bulkActionPending: boolean;
    bulkActionLabel: string;
    onAction: (action: 'DELETE' | 'ARCHIVE' | 'PUBLISH' | 'EXPIRE') => void;
    onClear: () => void;
}

export const AdminBulkActionsBar = ({
    selectedCount,
    bulkActionPending,
    bulkActionLabel,
    onAction,
    onClear
}: AdminBulkActionsBarProps) => {
    if (selectedCount === 0) return null;

    return (
        <div className="flex flex-col gap-3 p-3 bg-background border border-input rounded-sm md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                        {selectedCount}
                    </div>
                    <span className="text-sm font-medium text-primary">Selected listings</span>
                    {bulkActionPending && (
                        <span className="text-xs font-semibold text-muted-foreground inline-flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            Working on {bulkActionLabel || 'update'}...
                        </span>
                    )}
                </div>
                <div className="hidden h-4 w-[1px] bg-primary/20 md:block" />
                <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:items-center">
                    <button
                        onClick={() => onAction('PUBLISH')}
                        disabled={bulkActionPending}
                        className="h-8 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100/50 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {bulkActionPending ? 'Working...' : 'Publish all'}
                    </button>
                    <button
                        onClick={() => onAction('ARCHIVE')}
                        disabled={bulkActionPending}
                        className="h-8 px-3 text-xs font-semibold text-amber-700 hover:bg-amber-100/50 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {bulkActionPending ? 'Working...' : 'Archive all'}
                    </button>
                    <button
                        onClick={() => onAction('DELETE')}
                        disabled={bulkActionPending}
                        className="h-8 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100/50 rounded-md transition-colors disabled:opacity-60 disabled:cursor-not-allowed col-span-2 sm:col-span-1"
                    >
                        {bulkActionPending ? 'Working...' : 'Delete all'}
                    </button>
                </div>
            </div>
            <button
                onClick={onClear}
                disabled={bulkActionPending}
                className="self-start text-xs font-medium text-muted-foreground hover:text-foreground px-2 disabled:opacity-60 disabled:cursor-not-allowed md:self-auto"
            >
                Clear selection
            </button>
        </div>
    );
};
