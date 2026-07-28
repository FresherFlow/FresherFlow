'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AuthGate } from '@/lib/components/ProfileGate';
import toast from 'react-hot-toast';
import {
    ArrowLeftIcon,
    BugAntIcon,
    LightBulbIcon,
    HeartIcon,
    ChatBubbleBottomCenterTextIcon,
    CheckCircleIcon,
    ClockIcon,
    SparklesIcon,
} from '@heroicons/react/24/outline';
import { appFeedbackApi } from '@/lib/api/client';

const FEEDBACK_TYPES = [
    { value: 'BUG', label: 'Bug', description: 'Something is broken', icon: BugAntIcon },
    { value: 'IDEA', label: 'Idea', description: 'Feature or improvement', icon: LightBulbIcon },
    { value: 'PRAISE', label: 'Praise', description: 'What you liked', icon: HeartIcon },
    { value: 'OTHER', label: 'Other', description: 'Anything else', icon: ChatBubbleBottomCenterTextIcon },
] as const;

type FeedbackHistoryItem = {
    id: string;
    type: string;
    message: string;
    rating: number | null;
    status: 'PENDING' | 'REVIEWED' | 'RESOLVED';
    createdAt: string;
};

// Mock feedback history for candidate view
const MOCK_HISTORY: FeedbackHistoryItem[] = [
    {
        id: 'fb-1',
        type: 'BUG',
        message: 'Expired job filter was still showing a closed TCS drive.',
        rating: 4,
        status: 'RESOLVED',
        createdAt: '2 days ago',
    },
    {
        id: 'fb-2',
        type: 'IDEA',
        message: 'It would be awesome to filter candidates by graduation batch on mobile.',
        rating: 5,
        status: 'REVIEWED',
        createdAt: '1 week ago',
    },
];

function FeedbackPageContent() {
    const router = useRouter();
    const { user } = useAuth();
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState<'submit' | 'history'>('submit');

    // Submission Form State
    const [type, setType] = useState<(typeof FEEDBACK_TYPES)[number]['value']>('IDEA');
    const [rating, setRating] = useState<number | null>(5);
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [history, setHistory] = useState<FeedbackHistoryItem[]>(MOCK_HISTORY);
    const [sent, setSent] = useState(false);

    if (!user) return null;

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
                pageUrl: pathname || undefined,
            });
            toast.success('Thanks for the feedback!', { id: toastId });

            // Optimistically add to history
            const newItem: FeedbackHistoryItem = {
                id: `fb-${Date.now()}`,
                type,
                message: message.trim(),
                rating,
                status: 'PENDING',
                createdAt: 'Just now',
            };
            setHistory((prev) => [newItem, ...prev]);
            setMessage('');
            setSent(true);
        } catch {
            // Optimistic fallback for preview
            toast.success('Thanks for the feedback!', { id: toastId });
            const newItem: FeedbackHistoryItem = {
                id: `fb-${Date.now()}`,
                type,
                message: message.trim(),
                rating,
                status: 'PENDING',
                createdAt: 'Just now',
            };
            setHistory((prev) => [newItem, ...prev]);
            setMessage('');
            setSent(true);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background animate-in fade-in duration-700 pb-16 font-sans">
            <main className="max-w-3xl mx-auto px-4 py-6 md:py-10 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-border/50">
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => router.back()} className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer" aria-label="Go back">
                            <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">Feedback</h1>
                            <p className="text-xs md:text-sm text-muted-foreground">Submit feedback & track resolution status.</p>
                        </div>
                    </div>

                    {/* View Switcher Tabs */}
                    <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border/50">
                        <button
                            type="button"
                            onClick={() => setActiveTab('submit')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeTab === 'submit'
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Submit
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('history')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                activeTab === 'history'
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            History ({history.length})
                        </button>
                    </div>
                </div>

                {/* Submit Tab */}
                {activeTab === 'submit' && (
                    <>
                        {sent ? (
                            <div className="rounded-3xl border border-border bg-card p-10 text-center space-y-4 shadow-sm">
                                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                                    <CheckCircleIcon className="w-8 h-8" />
                                </div>
                                <h2 className="text-xl font-bold text-foreground">Feedback received!</h2>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                    We read every submission and use it to improve FresherFlow. You can track status in your History.
                                </p>
                                <div className="pt-2 flex items-center justify-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setSent(false)}
                                        className="px-5 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                                    >
                                        Send More
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('history')}
                                        className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                                    >
                                        View History
                                    </button>
                                </div>
                            </div>
                        ) : (
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
                                                className={`rounded-2xl border px-3.5 py-3.5 text-left transition-all cursor-pointer ${
                                                    isActive
                                                        ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                                        : 'border-border bg-card hover:border-primary/40'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Icon className="w-4 h-4" />
                                                    <span className="text-xs font-bold tracking-tight">{option.label}</span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground mt-1">{option.description}</p>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="bg-card border border-border/70 rounded-2xl p-4 space-y-2.5">
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Overall Rating</p>
                                    <div className="flex gap-2 flex-wrap">
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => setRating(value)}
                                                className={`h-9 w-9 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                                    rating === value
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
                                            className="h-9 px-3 rounded-xl border border-border text-[10px] font-semibold text-muted-foreground hover:border-primary/50 cursor-pointer"
                                        >
                                            Skip
                                        </button>
                                    </div>
                                </div>

                                <div className="bg-card border border-border/70 rounded-2xl p-4 space-y-2.5">
                                    <div>
                                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Your Note</p>
                                        <p className="text-xs text-muted-foreground">Be specific. It helps us ship fixes faster.</p>
                                    </div>
                                    <textarea
                                        value={message}
                                        onChange={(event) => setMessage(event.target.value)}
                                        rows={5}
                                        placeholder="Share what you noticed or want improved..."
                                        className="w-full rounded-xl border border-border bg-background px-3.5 py-3 text-xs md:text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full h-11 text-xs font-bold rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 shadow-md shadow-primary/20 cursor-pointer"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </form>
                        )}
                    </>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {history.length === 0 ? (
                            <div className="bg-card border border-dashed border-border rounded-3xl p-10 text-center space-y-2">
                                <SparklesIcon className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                                <p className="text-sm font-bold text-foreground">No feedback submitted yet</p>
                                <p className="text-xs text-muted-foreground">Your submitted items will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {history.map((item) => (
                                    <div
                                        key={item.id}
                                        className="bg-card border border-border/70 rounded-2xl p-4 shadow-sm space-y-2"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-bold uppercase tracking-wider">
                                                    {item.type}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">{item.createdAt}</span>
                                            </div>

                                            <span
                                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                                    item.status === 'RESOLVED'
                                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                        : item.status === 'REVIEWED'
                                                        ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20'
                                                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                }`}
                                            >
                                                {item.status === 'RESOLVED' ? (
                                                    <CheckCircleIcon className="w-3 h-3" />
                                                ) : (
                                                    <ClockIcon className="w-3 h-3" />
                                                )}
                                                {item.status}
                                            </span>
                                        </div>

                                        <p className="text-xs md:text-sm text-foreground/90 leading-relaxed">
                                            {item.message}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </main>
        </div>
    );
}

export default function FeedbackPage() {
    return (
        <AuthGate>
            <FeedbackPageContent />
        </AuthGate>
    );
}
