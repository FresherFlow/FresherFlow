'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { appFeedbackApi } from '@/lib/api/client';
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
    const pathname = usePathname();
    const [type, setType] = useState<(typeof FEEDBACK_TYPES)[number]['value']>('IDEA');
    const [rating, setRating] = useState<number | null>(5);
    const [message, setMessage] = useState('');
    const [email, setEmail] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (message.trim().length < 10) {
            toast.error('Please write at least 10 characters.');
            return;
        }

        setSubmitting(true);
        const toastId = toast.loading('Sending feedback...');
        try {
            // Append email to message if provided, or pass as extra context if required
            const finalMessage = email.trim() 
                ? `[Contact: ${email.trim()}]\n\n${message.trim()}`
                : message.trim();

            await appFeedbackApi.submit({
                type,
                rating: rating ?? undefined,
                message: finalMessage,
                pageUrl: pathname || undefined
            });
            toast.success('Thanks for the feedback!', { id: toastId });
            setMessage('');
            setEmail('');
        } catch (error) {
            const err = error as Error;
            toast.error(err.message || 'Unable to send feedback', { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background animate-in fade-in duration-700 pb-16">
            <main className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8">
                <div className="flex items-center gap-3">
                    <Link href="/" className="p-2 hover:bg-muted rounded-xl transition-colors">
                        <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                    </Link>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Get In Touch</p>
                        <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground mt-1">Share Feedback</h1>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {FEEDBACK_TYPES.map((option) => {
                            const Icon = option.icon;
                            const isActive = type === option.value;
                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setType(option.value)}
                                    className={`rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                                        isActive
                                            ? 'border-primary bg-primary/5 text-primary shadow-sm'
                                            : 'border-border bg-card hover:border-primary/50'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon className="w-4 h-4" />
                                        <span className="text-xs font-semibold capitalize tracking-widest">{option.label}</span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{option.description}</p>
                                </button>
                            );
                        })}
                    </div>

                    <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-3">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Overall rating</p>
                        <div className="flex gap-2 flex-wrap">
                            {[1, 2, 3, 4, 5].map((value) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setRating(value)}
                                    className={`h-10 w-10 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
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
                                className="h-10 px-4 rounded-xl border border-border text-[10px] font-semibold capitalize tracking-widest text-muted-foreground hover:border-primary/50 cursor-pointer"
                            >
                                Skip
                            </button>
                        </div>
                    </div>

                    <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contact details (Optional)</p>
                            <p className="text-[11px] text-muted-foreground">Add your email if you would like a reply from our team.</p>
                        </div>
                        <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="you@example.com"
                            className="w-full h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                    </div>

                    <div className="bg-card border border-border/80 rounded-2xl p-5 space-y-4">
                        <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Your note</p>
                            <p className="text-[11px] text-muted-foreground">Be as specific as possible. It helps us debug and ship faster.</p>
                        </div>
                        <textarea
                            value={message}
                            onChange={(event) => setMessage(event.target.value)}
                            rows={6}
                            placeholder="Share what you noticed, what we can improve, or new features you want..."
                            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <p className="text-[10px] text-muted-foreground">Minimum 10 characters.</p>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full h-12 capitalize tracking-widest text-xs font-semibold rounded-xl bg-foreground text-background hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center"
                    >
                        {submitting ? 'Sending...' : 'Submit feedback'}
                    </button>
                </form>
            </main>
        </div>
    );
}
