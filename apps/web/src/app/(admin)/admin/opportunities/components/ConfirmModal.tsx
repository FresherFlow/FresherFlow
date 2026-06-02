import React, { useState, useEffect } from 'react';

interface ConfirmModalProps {
    show: boolean;
    title: string;
    message: string;
    onConfirm: (reason?: string) => void;
    onCancel: () => void;
    type: 'danger' | 'warning';
    confirmText: string;
    requireReason?: boolean;
    reasonPlaceholder?: string;
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
}: ConfirmModalProps) => {
    const [reason, setReason] = useState('');

    useEffect(() => {
         
        if (!show) setReason('');
    }, [show]);

    if (!show) return null;

    const canConfirm = !requireReason || reason.trim().length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-card rounded-xl border border-border shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${type === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
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
                <div className="flex items-center gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 h-10 px-4 rounded-md border border-input bg-secondary/20 text-sm font-medium hover:bg-accent transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(requireReason ? reason.trim() : undefined)}
                        disabled={!canConfirm}
                        className={`flex-1 h-10 px-4 rounded-md text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed ${type === 'danger' ? 'bg-rose-600 text-white' : 'bg-primary text-primary-foreground'}`}
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
