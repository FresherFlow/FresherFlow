import React, { useState, useEffect } from 'react';

interface ConfirmModalProps {
    show: boolean;
    title: string;
    message: string;
    onConfirm: (reason?: string, status?: string) => void;
    onCancel: () => void;
    type: 'danger' | 'warning';
    confirmText: string;
    requireReason?: boolean;
    reasonPlaceholder?: string;
    statusOptions?: { value: string; label: string }[];
    defaultStatus?: string;
}

export const ConfirmModal = ({
    show,
    title,
    message,
    onConfirm,
    onCancel,
    type,
    confirmText,
    requireReason = false,
    reasonPlaceholder = 'Enter reason...',
    statusOptions,
    defaultStatus,
}: ConfirmModalProps) => {
    const [reason, setReason] = useState('');
    const [selectedStatus, setSelectedStatus] = useState(defaultStatus || '');

    useEffect(() => {
        if (!show) {
            setReason('');
            setSelectedStatus(defaultStatus || '');
        } else {
            setSelectedStatus(defaultStatus || '');
        }
    }, [show, defaultStatus]);

    if (!show) return null;

    const canConfirm = !requireReason || reason.trim().length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-card rounded-xl border border-border shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${type === 'danger' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'}`}>
                    <ExclamationTriangleIcon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{message}</p>
                {requireReason && (
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={reasonPlaceholder}
                        rows={3}
                        className="w-full mb-4 px-3 py-2 text-sm rounded-md border border-input bg-secondary/20 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                )}
                {statusOptions && (
                    <div className="mb-6 space-y-3">
                        {statusOptions.map(opt => (
                            <label key={opt.value} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                                <input
                                    type="radio"
                                    name="statusOption"
                                    value={opt.value}
                                    checked={selectedStatus === opt.value}
                                    onChange={(e) => setSelectedStatus(e.target.value)}
                                    className="w-4 h-4 text-primary focus:ring-primary border-input"
                                />
                                {opt.label}
                            </label>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 h-10 px-4 rounded-md border border-input bg-background text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(requireReason ? reason.trim() : undefined, statusOptions ? selectedStatus : undefined)}
                        disabled={!canConfirm}
                        className={`flex-1 h-10 px-4 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed ${type === 'danger' ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

function ExclamationTriangleIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
        </svg>
    );
}
