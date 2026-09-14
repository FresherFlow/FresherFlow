import Link from 'next/link';
import { OpportunityCardDTO } from '@fresherflow/types';
import { LiveStatsBox } from './LiveStatsBox';

/**
 * "The board moves every day." — matches the accepted mock:
 * left: dark 7-day bar chart box (accent bar on today, ▲ header);
 * right: latest real postings with LIVE/AGING stamps (signal tokens) and
 * mono uppercase meta + timestamps. No chart lib, no CLS.
 */

interface ProofSectionProps {
    perDay: number[]; // 7 values, oldest → today
    latest: OpportunityCardDTO[];
}

function stampFor(o: OpportunityCardDTO): { label: 'LIVE' | 'AGING'; cls: string } {
    const days = Math.floor((Date.now() - new Date(o.postedAt).getTime()) / 86400000);
    if (days <= 2) {
        return {
            label: 'LIVE',
            cls: 'text-[var(--color-signal-live)] border-[color-mix(in_srgb,var(--color-signal-live)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-signal-live)_8%,transparent)]',
        };
    }
    return {
        label: 'AGING',
        cls: 'text-[var(--color-signal-aging)] border-[color-mix(in_srgb,var(--color-signal-aging)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-signal-aging)_8%,transparent)]',
    };
}

function timeAgo(iso: string): string {
    const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
    if (mins < 60) return `${Math.max(1, mins)}M AGO`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h}H AGO`;
    return h < 48 ? 'YDA' : `${Math.floor(h / 24)}D AGO`;
}

const DAY_LABELS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];

export function ProofSection({ perDay, latest }: ProofSectionProps) {
    const max = Math.max(1, ...perDay);
    const todayIdx = 6;

    return (
        <section className="w-full">
            <div className="mx-auto max-w-[1120px] px-6 py-[72px]">
            <div className="mb-9">
                <div className="flex items-center gap-2.5 font-record text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <span className="h-[7px] w-[7px] rounded-full bg-[var(--ff-accent)]" aria-hidden />
                    Proof of life
                    <span className="h-px flex-1 bg-border" aria-hidden />
                </div>
                <h2 className="mt-3.5 max-w-[26ch] font-display text-[clamp(28px,3.6vw,44px)] font-bold leading-[1.05] tracking-[-0.02em]">
                    The board moves every day.
                </h2>
            </div>

            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[5fr_7fr] lg:gap-14">
                <div className="flex flex-col gap-8">
                {/* Live /api/stats box — real Cloudflare analytics, on the page not the marquee */}
                <LiveStatsBox />

                {/* 7-day pulse — dark box in both themes (mock) */}
                <div className="ff-band-box">
                    <div className="ff-band-muted flex items-center justify-between px-6 pb-1 pt-[22px] font-record text-[11px] uppercase tracking-[0.12em]">
                        <span>Posted per day · last 7</span>
                        <b className="font-semibold text-[var(--ff-accent)]">▲ +{perDay[todayIdx] ?? 0} today</b>
                    </div>
                    <div className="flex h-[140px] items-end gap-2 px-6 pb-6 pt-4">
                        {perDay.map((v, i) => (
                            <div key={i} className="flex h-full flex-1 flex-col justify-end gap-2">
                                <div
                                    className={
                                        i === todayIdx
                                            ? 'border-t-2 border-[var(--ff-accent)] bg-[color-mix(in_srgb,var(--ff-accent)_30%,transparent)]'
                                            : 'border-t-2 border-[#8b93a5]/50 bg-[#eef1f6]/[0.08]'
                                    }
                                    style={{ height: `${Math.max(2, (v / max) * 100)}%` }}
                                    aria-label={`${DAY_LABELS[i]}: ${v}`}
                                />
                                <span className="ff-band-muted text-center font-record text-[10px]">
                                    {i === todayIdx ? 'SU' : DAY_LABELS[i]}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                </div>

                {/* Latest postings board */}
                <div className="border border-border bg-card">
                    {latest.length === 0 ? (
                        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                            New openings are being gathered right now — check the feed.
                        </div>
                    ) : (
                        latest.map((o) => {
                            const stamp = stampFor(o);
                            return (
                                <Link
                                    key={o.id}
                                    href={`/jobs/${o.slug}`}
                                    className="grid grid-cols-[56px_1fr_auto] items-center gap-4 border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-muted/40"
                                >
                                    <span
                                        className={`border py-[3px] text-center font-record text-[10px] font-semibold tracking-[0.1em] ${stamp.cls}`}
                                    >
                                        {stamp.label}
                                    </span>
                                    <span className="min-w-0">
                                        <span className="block truncate text-[14.5px] font-semibold">{o.title}</span>
                                        <span className="mt-0.5 block truncate font-record text-[11px] tracking-[0.02em] text-muted-foreground">
                                            {o.company.toUpperCase()}
                                            {o.locations[0] ? ` · ${o.locations[0].toUpperCase()}` : ''}
                                        </span>
                                    </span>
                                    <span className="whitespace-nowrap font-record text-[11px] text-muted-foreground/70">
                                        {timeAgo(String(o.postedAt))}
                                    </span>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>
            </div>
        </section>
    );
}
