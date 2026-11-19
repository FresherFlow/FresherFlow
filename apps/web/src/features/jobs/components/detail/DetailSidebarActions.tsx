import { ActionType, CommunityPostCategory, type Opportunity, type User, type OpportunityEvent } from '@fresherflow/types';
import { cn } from '@/ui/cn';
import { BrandButton } from '@/ui/BrandButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import { COMMUNITY_UI_ENABLED } from '@/features/community/communityUi';
import Link from 'next/link';
import { CopyButton } from '@/ui/CopyButton';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import UsersIcon from '@heroicons/react/24/outline/UsersIcon';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import { useState, useEffect, useId } from 'react';
import EnvelopeIcon from '@heroicons/react/24/outline/EnvelopeIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import {
    WhatsAppBrandIcon,
    LinkedInBrandIcon,
    XBrandIcon,
    FacebookBrandIcon,
} from '@/features/navigation/SocialSidebar';
import { communityApi } from '@fresherflow/api-client';
import type { Room } from '@fresherflow/types';
import { getGroupedLocations } from '@/features/jobs/domain/opportunityDisplay';
import { ApplyActionContent } from '@/features/jobs/components/ApplyAction';
import { getPrimaryEmploymentType } from '@/features/jobs/utils/walkinMapUtils';
import { SkeletonListRow } from '@/features/jobs/components/OpportunitySkeletons';

function formatEmploymentText(text: string | null | undefined): string {
    if (!text) return 'Not specified';
    const formatted = text.replace(/_/g, ' ');
    return formatted.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

/** Sentinel for "no status" in the tracker select. Not a real ActionType. */
const TRACKER_NONE = '__none__';

interface DetailSidebarActionsProps {    user: User | null;
    opp: Opportunity;
    currentAction: ActionType | null;
    trackerOptions: { key: ActionType; label: string }[];
    isUpdatingAction: boolean;
    handleSetAction: (actionType: ActionType) => void;
    hasApplyLink: boolean;
    isCampusDrive: boolean;
    timelineEvents: OpportunityEvent[];
    jumpToTimeline: () => void;
    listingState: string;
    formatDeadline: (opp: Opportunity) => string | null;
    handleApply: () => void;
    handleToggleSave: () => void;
    handleShare: () => void;
}

export function DetailSidebarActions({
    user,
    opp,
    currentAction,
    trackerOptions,
    isUpdatingAction,
    handleSetAction,
    hasApplyLink,
    isCampusDrive,
    timelineEvents,
    jumpToTimeline,
    listingState,
    formatDeadline,
    handleApply,
    handleToggleSave,
    handleShare,
}: DetailSidebarActionsProps) {
    const statusSelectId = useId();
    /* `user` hydrates from the client-side auth session *after* SSR, so any
        branch on it renders different HTML on server vs first client paint.
        Gate every user-dependent branch on mount — the same `isMounted`
        pattern OpportunityDetailClient already uses for its own user-gated
        blocks — so hydration always sees the logged-out tree first. */
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);

    /* `handleSetAction` toggles: clicking the value it already holds clears the
       row. So "Not set" resends the current value, which clears it for real
       rather than shipping a control that pretends to unset something the API
       cannot unset. */
    const handleStatusChange = (value: string) => {
        if (value === TRACKER_NONE) {
            if (currentAction) handleSetAction(currentAction);
            return;
        }
        handleSetAction(value as ActionType);
    };
    const locationsGrouped = getGroupedLocations(opp.locations);
    const hasSalary = !!opp.salaryMax;
    const salaryText = hasSalary ? `₹${opp.salaryMin} – ₹${opp.salaryMax}` : null;
    const experience = opp.experienceMax ? `${opp.experienceMin || 0}–${opp.experienceMax} yrs` : 'Freshers';
    const deadline = formatDeadline(opp);

    const [copied, setCopied] = useState(false);
    const [pageUrl, setPageUrl] = useState('');
    useEffect(() => { setPageUrl(window.location.href); }, []);
    const [roomPickerOpen, setRoomPickerOpen] = useState(false);
    const [rooms, setRooms] = useState<Room[] | null>(null);
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [sharingTo, setSharingTo] = useState<string | null>(null);
    const [shareResult, setShareResult] = useState<{ ok: boolean; message: string } | null>(null);

    const openRoomPicker = async () => {
        setRoomPickerOpen((v) => !v);
        setShareResult(null);
        if (!rooms && !roomsLoading) {
            setRoomsLoading(true);
            try {
                const result = await communityApi.listRooms({ limit: 50 });
                setRooms(result.rooms || []);
            } catch {
                setRooms([]);
            } finally {
                setRoomsLoading(false);
            }
        }
    };

    const shareToRoom = async (room: Room) => {
        if (sharingTo) return;
        setSharingTo(room.id);
        setShareResult(null);
        try {
            await communityApi.createCommunityPost({
                title: opp.title,
                body: `${opp.title} at ${opp.company}. Discuss deadlines, interview experiences, and updates in this room.`,
                category: CommunityPostCategory.DISCUSSION,
                sourceOpportunityId: opp.id,
                roomId: room.id,
            });
            setShareResult({ ok: true, message: `Shared to ${room.name}` });
            setRoomPickerOpen(false);
        } catch (e) {
            setShareResult({ ok: false, message: e instanceof Error ? e.message : 'Could not share to the room.' });
        } finally {
            setSharingTo(null);
        }
    };

    return (
        <div className="space-y-4">
            {/* -- Apply now -- one decisive action. */}
            <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                        <h3 className="text-sm font-semibold text-foreground">Apply now</h3>
                    </div>
                    {deadline && (
                        <span className="text-[11px] font-medium text-muted-foreground">By {deadline}</span>
                    )}
                </div>
                {hasApplyLink && listingState !== 'EXPIRED' ? (
                    <BrandButton variant="neutral" onClick={handleApply} className="h-12 w-full rounded-md active:scale-[0.97] motion-reduce:transform-none">
                        <ApplyActionContent
                            applyLink={opp.applyLink}
                            isGovernment={Boolean(opp.governmentJobDetails)}
                            showDestination
                            showArrow
                        />
                    </BrandButton>
                ) : hasApplyLink && listingState === 'EXPIRED' ? (
                    <div className="inline-flex h-12 w-full items-center justify-center rounded-md border border-border bg-surface-sunken px-4 text-sm font-semibold text-muted-foreground select-none">
                        Applications closed
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">Application link not available.</p>
                )}
                <p className="text-xs text-muted-foreground">You&apos;ll finish on the employer&apos;s site.</p>
            </div>

            {/* -- Share this job -- reuses the brand icons already in the app. */}
            <div className="space-y-3 border-t border-border/40 pt-4">
                <div className="flex items-center gap-2">
                    <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-foreground">Share</h3>
                </div>
                <div className="grid grid-cols-3 gap-y-3">
                    {[
                        { label: 'WhatsApp', Icon: WhatsAppBrandIcon, tile: 'bg-brand-whatsapp', href: `https://wa.me/?text=${encodeURIComponent(`${opp.title} — ${pageUrl}`)}` },
                        { label: 'LinkedIn', Icon: LinkedInBrandIcon, tile: 'bg-brand-linkedin', href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}` },
                        { label: 'X', Icon: XBrandIcon, tile: 'bg-foreground', href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(opp.title)}&url=${encodeURIComponent(pageUrl)}` },
                        { label: 'Facebook', Icon: FacebookBrandIcon, tile: 'bg-brand-facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}` },
                        { label: 'Email', Icon: EnvelopeIcon, tile: 'bg-warning', href: `mailto:?subject=${encodeURIComponent(opp.title)}&body=${encodeURIComponent(pageUrl)}` },
                        { label: 'More', Icon: ShareIcon, tile: 'bg-muted-foreground/20', onClick: handleShare },
                    ].map((item) => {
                        const content = (
                            <>
                                <span className={`flex size-9 items-center justify-center rounded-md transition-shadow duration-150 ease-out group-hover:ring-2 group-hover:ring-primary/30 ${item.tile} ${item.label === 'More' ? 'text-foreground' : item.label === 'X' ? 'text-background' : 'text-paper'}`}>
                                    <item.Icon className="size-4.5" />
                                </span>
                                <span className="text-xs font-medium text-foreground">{item.label}</span>
                            </>
                        );
                        const itemClass = 'group flex cursor-pointer flex-col items-center gap-1.5 rounded-lg p-1.5 transition-colors duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-sunken active:scale-[0.96] motion-reduce:transform-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
                        return item.href ? (
                            <a
                                key={item.label}
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Share on ${item.label}`}
                                className={itemClass}
                            >
                                {content}
                            </a>
                        ) : (
                            <button
                                key={item.label}
                                type="button"
                                onClick={item.onClick}
                                aria-label="More share options"
                                className={itemClass}
                            >
                                {content}
                            </button>
                        );
                    })}
                </div>
                <div className="flex items-center gap-2">
                    <input
                        readOnly
                        aria-label="Job link"
                        value={pageUrl}
                        className="min-w-0 flex-1 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground"
                    />
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
                        className="shrink-0 rounded-md bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                        {copied ? 'Copied' : 'Copy link'}
                    </button>
                </div>
            </div>

            {/* -- Share to Room --
                Gated with the rest of the community surfaces: this posts a
                CommunityPost into a room, so while community is paused it must
                not be the way in. Same COMMUNITY_UI_ENABLED switch as the
                sidebar, the hero CTA and the landing page's discuss links. */}
            {isMounted && user && COMMUNITY_UI_ENABLED && (
                <div className="space-y-2">
                    <button
                        type="button"
                        onClick={() => void openRoomPicker()}
                        className="w-full h-9 rounded-lg border border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground transition-all flex items-center justify-center gap-1.5 text-xs font-semibold"
                    >
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                        Share to Room
                    </button>
                    {shareResult && (
                        <p className={cn('text-xs', shareResult.ok ? 'text-success' : 'text-destructive')}>
                            {shareResult.message}
                        </p>
                    )}
                    {roomPickerOpen && (
                        <div className="rounded-xl border border-border bg-card p-2 max-h-48 overflow-y-auto space-y-0.5">
                            {roomsLoading ? (
                                <div className="space-y-1" aria-busy="true" aria-label="Loading rooms">
                                    <SkeletonListRow className="rounded-lg border-0 bg-muted/20 px-2 py-2" />
                                    <SkeletonListRow className="rounded-lg border-0 bg-muted/20 px-2 py-2" />
                                </div>
                            ) : !rooms || rooms.length === 0 ? (
                                <div className="p-3 text-xs text-muted-foreground">No rooms available.</div>
                            ) : (
                                rooms.map((room) => (
                                    <button
                                        key={room.id}
                                        type="button"
                                        onClick={() => void shareToRoom(room)}
                                        disabled={sharingTo !== null}
                                        className="w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
                                    >
                                        <span className="truncate font-semibold">{room.name}</span>
                                        <span className="shrink-0 ml-2 text-muted-foreground">
                                            {sharingTo === room.id ? 'Sharing…' : `${room.memberCount}`}
                                        </span>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* -- Campus Drive -- */}
            {isCampusDrive && timelineEvents.length > 0 && (
                <button
                    onClick={jumpToTimeline}
                    className="rounded-xs border border-primary/20 bg-primary/5 px-4.5 py-2.5 text-meta font-semibold text-primary transition-colors hover:bg-muted"
                >
                    View drive timeline
                </button>
            )}

            {/* -- Status (logged-in users only) --
                A select rather than a row of toggles. As toggles, the only way
                off a status was re-clicking the active chip, which read as a
                dead end, and the row of pills also broke the one-geometry rule
                the rest of this rail follows. `triggerVariant="brand"` keeps the trigger
                the same height, corners and type as the Apply/Save row above. */}
            <div className="space-y-3 border-t border-border pt-4">
                {isMounted && user && trackerOptions.length > 0 && (
                    <div className="space-y-1.5">
                        <label
                            htmlFor={statusSelectId}
                            className="block text-xs font-medium text-muted-foreground"
                        >
                            Your status
                        </label>
                        <Select
                            value={currentAction ?? TRACKER_NONE}
                            onValueChange={handleStatusChange}
                            disabled={isUpdatingAction}
                        >
                            <SelectTrigger id={statusSelectId} triggerVariant="brand" className="w-full">
                                <SelectValue placeholder="Not set" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value={TRACKER_NONE}>Not set</SelectItem>
                                {trackerOptions.map((option) => (
                                    <SelectItem key={option.key} value={option.key}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* One full-width secondary action with a clear verb and icon. */}
                <BrandButton asChild variant="outline" className="w-full">
                    <Link href="/contribute">
                        <PlusIcon className="size-4" aria-hidden="true" />
                        Submit a job
                    </Link>
                </BrandButton>
            </div>

        </div>
    );
}
