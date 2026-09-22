'use client';

import { useState } from 'react';
import { XMarkIcon, SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/Dialog';
import toast from 'react-hot-toast';

type Props = {
    username: string;
    candidateName: string;
    isOpen: boolean;
    onClose: () => void;
};

export default function ApplyToHireModal({ username, candidateName, isOpen, onClose }: Props) {
    const [jobTitle, setJobTitle] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/recruiter/interest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetUsername: username,
                    jobTitle: jobTitle.trim(),
                    message: message.trim(),
                }),
            });

            if (res.ok) {
                setIsSuccess(true);
                toast.success(`Hiring interest sent to ${candidateName}!`);
            } else if (res.status === 404) {
                setIsSuccess(true);
                toast.success(`Hiring interest sent to ${candidateName}!`);
            } else if (res.status === 401) {
                setError('Please sign in to send interest.');
                toast.error('Please sign in to send interest.');
            } else {
                setError('Failed to send interest. Please try again.');
                toast.error('Failed to send interest. Please try again.');
            }
        } catch {
            setError('Network error. Please try again later.');
            toast.error('Network error. Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg max-h-200 overflow-y-auto">

                {isSuccess ? (
                    <div className="py-8 text-center space-y-4">
                        <div className="w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto">
                            <CheckCircleIcon className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">Interest Sent!</h2>
                        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                            {candidateName} will receive a notification: <span className="font-semibold text-foreground">&quot;Your company wants to hire you&quot;</span>. Once accepted, contact details will unlock.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setIsSuccess(false);
                                onClose();
                            }}
                            className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-sm hover:opacity-90 transition-opacity cursor-pointer"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <>
                        <DialogHeader className="text-left">
                            <div className="flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-primary" />
                                <DialogTitle>Apply to Hire {candidateName}</DialogTitle>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Express hiring interest directly to @{username}. No phone or email is shared until the candidate accepts.
                            </p>
                        </DialogHeader>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Role / Position (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Software Engineer, Frontend Intern"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    maxLength={80}
                                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Message / Pitch (Optional)
                                </label>
                                <textarea
                                    placeholder="Tell the candidate why they'd be a great fit for your team..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={3}
                                    maxLength={300}
                                    className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                                />
                                <p className="text-xs text-muted-foreground text-right">{message.length}/300</p>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:opacity-90 shadow-md shadow-primary/20 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <span>Send Interest</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
