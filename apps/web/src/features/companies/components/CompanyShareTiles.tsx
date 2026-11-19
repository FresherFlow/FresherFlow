'use client';

/* eslint-disable shadcn/no-arbitrary-values */

import { useEffect, useState } from 'react';
import { CheckIcon, EnvelopeIcon, LinkIcon } from '@heroicons/react/24/outline';
import {
    FacebookBrandIcon,
    LinkedInBrandIcon,
    WhatsAppBrandIcon,
    XBrandIcon,
} from '@/features/navigation/SocialSidebar';

/**
 * Share tiles for the company masthead. Square, quiet and identical in
 * geometry — the brand mark is the only colour, and it never leaks into an
 * application action button. All hover styling is pointer-fine gated so a tap
 * cannot leave a tile stuck in its hover ring.
 */
const TILE_CLASS =
    'inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-surface-sunken text-muted-foreground transition-[transform,background-color,box-shadow,color] duration-150 ease-out active:scale-[0.96] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:border-transparent [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:ring-2 [@media(hover:hover)_and_(pointer:fine)]:hover:ring-primary/30';

type Props = {
    companyName: string;
};

export default function CompanyShareTiles({ companyName }: Props) {
    const [pageUrl, setPageUrl] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        setPageUrl(window.location.href);
    }, []);

    const shareText = `${companyName} jobs and openings on FresherFlow`;

    const links = [
        {
            label: 'WhatsApp',
            Icon: WhatsAppBrandIcon,
            href: `https://wa.me/?text=${encodeURIComponent(`${shareText} — ${pageUrl}`)}`,
        },
        {
            label: 'LinkedIn',
            Icon: LinkedInBrandIcon,
            href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`,
        },
        {
            label: 'X',
            Icon: XBrandIcon,
            href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`,
        },
        {
            label: 'Facebook',
            Icon: FacebookBrandIcon,
            href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`,
        },
        {
            label: 'Email',
            Icon: EnvelopeIcon,
            href: `mailto:?subject=${encodeURIComponent(shareText)}&body=${encodeURIComponent(pageUrl)}`,
        },
    ];

    return (
        <div className="flex items-center gap-1.5" aria-label="Share this company">
            {links.map(({ label, Icon, href }) => (
                <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Share on ${label}`}
                    title={`Share on ${label}`}
                    className={TILE_CLASS}
                >
                    <Icon className="size-4" />
                </a>
            ))}
            <button
                type="button"
                onClick={async () => {
                    try {
                        await navigator.clipboard.writeText(pageUrl);
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 1500);
                    } catch {
                        setCopied(false);
                    }
                }}
                aria-label={copied ? 'Link copied' : 'Copy link'}
                title={copied ? 'Link copied' : 'Copy link'}
                className={TILE_CLASS}
            >
                {copied ? <CheckIcon className="size-4" /> : <LinkIcon className="size-4" />}
            </button>
        </div>
    );
}
