'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { appFeedbackApi } from '@/lib/api/client';
import LoadingScreen from '@/components/ui/LoadingScreen';
import toast from 'react-hot-toast';
import {
    ArrowLeftIcon,
    BugAntIcon,
    LightBulbIcon,
    HeartIcon,
    ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/outline';

const FEEDBACK_TYPES = [
    { value: 'BUG', label: 'Bug', description: 'Something is broken', icon: BugAntIcon },
    { value: 'IDEA', label: 'Idea', description: 'Feature or improvement', icon: LightBulbIcon },
    { value: 'PRAISE', label: 'Praise', description: 'What you liked', icon: HeartIcon },
    { value: 'OTHER', label: 'Other', description: 'Anything else', icon: ChatBubbleBottomCenterTextIcon }
] as const;

export default function FeedbackPage() {
    const { user, isLoading } = useAuth();
    const pathname = usePathname();
    const [type, setType] = useState<(typeof FEEDBACK_TYPES)[number]['value']>('IDEA');
    const [rating, setRating] = useState<number | null>(5);
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    if (isLoading) return <LoadingScreen message="Loading..." />;

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6">
                <div className="text-center space-y-6 animate-in fade-in duration-700">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                        <ChatBubbleBottomCenterTextIcon className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">Sign in required</h1>
                        <p className="text-muted-foreground font-medium">Please sign in to share feedback.</p>
                    </div>
                    <Link href="/login" className="premium-button mx-auto !w-fit px-8">Sign in</Link>
                </div>
            </div>
        );
    }

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (message.trim().length < 10) {
            toast.error('Please add at least 10 characters.');
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading('Sending feedback...');
        try {
            await appFeedbackApi.submit({
                type,
                rating: rating ?? undefined,
                message: message.trim(),
                pageUrl: pathname || undefined
            });
            toast.success('Thanks for the feedback.', { id: toastId });
            setMessage('');
        } catch (error) {
            const err = error as Error;
            toast.error(err.message || 'Unable to send feedback', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background animate-in fade-in duration-700 pb-16">
            <main className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/account" className="p-2 hover:bg-muted rounded-xl transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                    </Link>
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold tracking-tighter">Share feedback</h1>
                        <p className="text-xs md:text-sm text-muted-foreground">Tell us what to fix or improve.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {FEEDBACK_TYPES.map((option) => {
                            const Icon = option.icon;
                            const isActive = type === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setType(option.value)}
                                    className={`rounded-2xl border px-3 py-3 text-left transition-all ${isActive
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border bg-card hover:border-primary/50'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" />
                                        <span className="text-xs font-semibold uppercase tracking-widest">{option.label}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">{option.description}</p>
                                </button>
                            );
                        })}
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Overall rating</p>
                        <div className="flex gap-2 flex-wrap">
                            {[1, 2, 3, 4, 5].map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setRating(value)}
                                    className={`h-10 w-10 rounded-xl border text-sm font-semibold transition-all ${rating === value
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                                        }`}
                                >
                                    {value}
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setRating(null)}
                                className="h-10 px-3 rounded-xl border border-border text-[10px] font-semibold uppercase tracking-widest text-muted-foreground hover:border-primary/50"
                            >
                                Skip
                            </button>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your note</p>
                            <p className="text-[11px] text-muted-foreground">Be specific. It helps us ship faster.</p>
                        </div>
                        <textarea
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            rows={6}
                            placeholder="Share what you noticed or want improved..."
                            className="w-full rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <p className="text-[10px] text-muted-foreground">Minimum 10 characters.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full h-12 uppercase tracking-widest text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-50"
                    >
                        {submitting ? 'Sending...' : 'Submit feedback'}
                    </button>
                </form>
            </main>
        </div>
    );
}
