import { ActionType, CommunityPostCategory, type Opportunity, type User, type OpportunityEvent } from '@fresherflow/types';
import { cn } from '@/ui/cn';
import { Button } from '@/ui/Button';
import { BrandButton } from '@/ui/BrandButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import BookmarkIcon from '@heroicons/react/24/outline/BookmarkIcon';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import ArrowTopRightOnSquareIcon from '@heroicons/react/24/outline/ArrowTopRightOnSquareIcon';
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
import { useState, useId } from 'react';
import { communityApi } from '@fresherflow/api-client';
import type { Room } from '@fresherflow/types';
import { getGroupedLocations } from '@/features/jobs/domain/opportunityDisplay';
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
    loginFromDetailHref: string;
    listingState: string;
    formatDeadline: (opp: Opportunity) => string | null;
    isMobile?: boolean;
    handleApply: () => void;
    handleToggleSave: () => void;
    handleShare: () => void;
    handleCopyLink: () => void;
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
            {/* -- CTA Row: Apply + Save + Share --
                BrandButton is the landing page's own CTA treatment
                (`rounded-[2px]` + `--ff-accent`), extracted to a primitive so
                this row matches the landing hero instead of the rounded admin
                `Button`. One height across all three. Share is the only
                secondary: a separate copy-link control duplicated it. */}
            <div className="flex gap-2">
                {hasApplyLink && listingState !== 'EXPIRED' ? (
                    /* Neutral, not the brand orange: this click leaves for the
                       company's own site. The accent is our call to action, and
                       spending it on someone else's page both misreads as "our
                       flow continues" and loses the landing hero's meaning. The
                       label says where it goes. */
                    <BrandButton variant="neutral" onClick={handleApply} className="flex-1">
                        Apply on company site
                        <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
                    </BrandButton>
                ) : hasApplyLink && listingState === 'EXPIRED' ? (
                    <div className="flex-1 inline-flex items-center justify-center gap-2 rounded-xs border border-muted bg-muted/50 px-4.5 py-2.5 text-meta font-semibold text-muted-foreground select-none">
                        Closed
                    </div>
                ) : null}
                <BrandButton
                    variant={opp.isSaved ? 'selected' : 'outline'}
                    onClick={handleToggleSave}
                    aria-pressed={opp.isSaved}
                >
                    {opp.isSaved ? <BookmarkSolidIcon className="w-4 h-4" /> : <BookmarkIcon className="w-4 h-4" />}
                    {opp.isSaved ? 'Saved' : 'Save'}
                </BrandButton>
                <BrandButton
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    aria-label="Share"
                    title="Share"
                >
                    <ShareIcon className="w-4 h-4" />
                </BrandButton>
            </div>

            {/* -- Share to Room --
                Gated with the rest of the community surfaces: this posts a
                CommunityPost into a room, so while community is paused it must
                not be the way in. Same COMMUNITY_UI_ENABLED switch as the
                sidebar, the hero CTA and the landing page's discuss links. */}
            {user && COMMUNITY_UI_ENABLED && (
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

            {/* -- Key Facts --
                Sharp-cornered box chips, not icon+text rows and not pills, to
                match the CTA row's geometry. `pointer-events-none` because a
                fact is not a control - these must not be focusable or announced
                as interactive. Width is content-driven, so they pack instead of
                stretching across the rail. */}
            <div className="flex flex-wrap gap-1.5">
                {hasSalary && (
                    <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-xs border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground">
                        <CurrencyRupeeIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        {salaryText}
                    </span>
                )}
                <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-xs border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground">
                    <BriefcaseIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    {experience}
                </span>
                <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-xs border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground">
                    <UsersIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    {formatEmploymentText(getPrimaryEmploymentType(opp))}
                </span>
                <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-xs border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground">
                    <ShieldCheckIcon className="size-3.5 shrink-0 text-muted-foreground" />
                    {opp.jobFunction || 'General'}
                </span>
                {locationsGrouped.map((loc) => (
                    <span
                        key={loc}
                        className="pointer-events-none inline-flex items-center gap-1.5 rounded-xs border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground"
                    >
                        <MapPinIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        {loc}
                    </span>
                ))}
                {opp.postedAt && (
                    <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-xs border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground">
                        <ClockIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        {new Date(opp.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                )}
                {opp.expiresAt && (
                    <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-xs border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground">
                        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
                        {formatDeadline(opp)}
                    </span>
                )}
            </div>

            {/* -- Campus Drive -- */}
            {isCampusDrive && timelineEvents.length > 0 && (
                <button
                    onClick={jumpToTimeline}
                    className="rounded-xs border border-primary/20 bg-primary/5 px-4.5 py-2.5 text-meta font-semibold text-primary transition-colors hover:bg-primary/10"
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
            {/* One row: the status control and the submit link share a single
                divider and sit side by side. They were two full-width-ish blocks
                stacked, which read as two sections for two minor controls. The
                select is content-width and the button is `shrink-0` so neither
                stretches, and the label truncates before anything collides. */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-4">
                {user && trackerOptions.length > 0 && (
                    <div className="flex min-w-0 items-center gap-2">
                        <label
                            htmlFor={statusSelectId}
                            className="shrink-0 truncate text-xs font-medium text-muted-foreground"
                        >
                            Your status
                        </label>
                        <Select
                            value={currentAction ?? TRACKER_NONE}
                            onValueChange={handleStatusChange}
                            disabled={isUpdatingAction}
                        >
                            <SelectTrigger id={statusSelectId} triggerVariant="brand" className="w-auto min-w-36">
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

                {/* `asChild` renders the anchor itself, so this is one real link
                    with the brand geometry. */}
                <BrandButton asChild variant="outline" className="shrink-0">
                    <Link href="/contribute">Submit a job</Link>
                </BrandButton>
            </div>

            {/* -- Admin -- */}
            {user?.role === 'ADMIN' && (
                <div className="pt-3 border-t border-border/40">
                    <Link href={`/admin/opportunities/edit/${opp.id}`} className="block">
                        <Button size="sm" variant="outline" className="w-full">
                            Edit
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
