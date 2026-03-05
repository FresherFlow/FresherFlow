'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useState } from 'react';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';

// Profile completion banner
export function ProfileCompletionBanner() {
    const { profile } = useAuth();
    const pct = profile?.completionPercentage ?? 0;

    // Only show when incomplete (gate already blocks <40%)
    if (!profile || pct >= 100) return null;

    return (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1.5 flex-1">
                <p className="text-xs font-semibold text-foreground">
                    Profile {pct}% complete - finish to unlock all features
                </p>
                <div className="h-1.5 w-full max-w-xs bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
            <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary hover:underline whitespace-nowrap"
            >
                Complete profile
                <ArrowRightIcon className="w-3 h-3" />
            </Link>
        </div>
    );
}

// Referral link button
export function ReferralLinkButton() {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);

    if (!user?.id) return null;

    const referralUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://app.fresherflow.in'}/login?ref=${user.id}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(referralUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const el = document.createElement('textarea');
            el.value = referralUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
            title="Copy your invite link"
        >
            {copied ? (
                <>
                    <CheckIcon className="w-3.5 h-3.5 text-success" />
                    <span className="text-success">Copied!</span>
                </>
            ) : (
                <>
                    <LinkIcon className="w-3.5 h-3.5" />
                    Invite a friend
                </>
            )}
        </button>
    );
}
