'use client';

import { useAuth } from '@/features/auth';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import { analytics } from '@/lib/analytics';
import { buildInviteUrl } from '@fresherflow/domain';
import { referralApi } from '@/shared/api/client';

// Profile completion banner
export function ProfileCompletionBanner() {
    const { profile } = useAuth();
    const pct = profile?.completionPercentage ?? 0;

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
    const [shared, setShared] = useState(false);
    const [referralCode, setReferralCode] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!user?.id) return;
        referralApi.getMe()
            .then((res) => {
                const data = res as { referralCode: string } | null;
                if (!cancelled && data?.referralCode) setReferralCode(data.referralCode);
            })
            .catch(() => { /* silent */ });
        return () => { cancelled = true; };
    }, [user?.id]);

    if (!user?.id) return null;

    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://fresherflow.in';
    // Use short code if loaded, otherwise fall back to user id (will update once fetched)
    const referralUrl = buildInviteUrl(referralCode ?? user.id, { shareBase: origin });

    const shareData = {
        title: 'Join me on FresherFlow',
        text: 'Use FresherFlow to find verified fresher jobs, internships, and walk-ins.',
        url: referralUrl,
    };

    const flashState = (type: 'copied' | 'shared') => {
        if (type === 'copied') {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            return;
        }
        setShared(true);
        setTimeout(() => setShared(false), 2000);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(referralUrl);
            analytics.inviteShare('copy_link');
            flashState('copied');
        } catch {
            const el = document.createElement('textarea');
            el.value = referralUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            analytics.inviteShare('copy_link_fallback');
            flashState('copied');
        }
    };

    const handleShare = async () => {
        if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
            try {
                await navigator.share(shareData);
                analytics.inviteShare('native_share');
                flashState('shared');
                return;
            } catch (error) {
                if ((error as Error).name === 'AbortError') return;
            }
        }
        await handleCopy();
    };

    return (
        <div className="inline-flex items-center gap-1.5">
            <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                title="Share your invite link"
            >
                {shared ? (
                    <>
                        <CheckIcon className="w-3.5 h-3.5 text-success" />
                        <span className="text-success">Shared</span>
                    </>
                ) : (
                    <>
                        <ShareIcon className="w-3.5 h-3.5" />
                        Invite a friend
                    </>
                )}
            </button>
            <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
                title="Copy your invite link"
            >
                {copied ? (
                    <>
                        <CheckIcon className="w-3.5 h-3.5 text-success" />
                        <span className="text-success">Copied</span>
                    </>
                ) : (
                    <>
                        <LinkIcon className="w-3.5 h-3.5" />
                        Copy link
                    </>
                )}
            </button>
        </div>
    );
}






