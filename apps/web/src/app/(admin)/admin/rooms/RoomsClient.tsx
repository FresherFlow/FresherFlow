'use client';

/**
 * Curated community rooms for `/admin/rooms`.
 *
 * Rooms are a small curated list, not a dataset to compare across rows, so this
 * stays a card list (shadcn-admin `features/apps/index.tsx` shape) rather than a
 * `DataGrid`. The page hands down a bounded height, this component fills it and
 * scrolls once — `min-h-0` on the container is what lets it.
 *
 * Create and edit are one dialog (`room === null` creates), and rooms are
 * never deleted: the only status control is activate / deactivate, which the API
 * exposes as a `PATCH` of `status`.
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { useFirebaseAdmin } from '@/features/admin/hooks/useFirebaseAdmin';
import { getErrorMessage } from '@/lib/utils/error';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { Card, CardContent } from '@/ui/Card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/ui/Dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/DropdownMenu';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Field } from '@/ui/Field';
import { Input } from '@/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { Skeleton } from '@/ui/Skeleton';
import { Textarea } from '@/ui/Textarea';
import {
    EllipsisHorizontalIcon,
    EyeIcon,
    PencilSquareIcon,
    PowerIcon,
} from '@heroicons/react/24/outline';

interface AdminRoom {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    icon: string | null;
    type: string;
    memberCount: number;
    postCount: number;
    jobCount: number;
    status: string;
    createdAt: string;
    createdBy?: { id: string; fullName: string | null; username: string | null } | null;
}

const ROOM_TYPES = ['BATCH', 'SKILL', 'LOCATION', 'COMPANY', 'TOPIC', 'CUSTOM'];

export default function AdminRoomsPage() {
    const { isAuthenticated } = useFirebaseAdmin();
    const [rooms, setRooms] = useState<AdminRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<AdminRoom | null>(null);
    // Row whose activate/deactivate PATCH is in flight, so a double click
    // cannot fire two writes.
    const [pendingId, setPendingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiClient<{ rooms: AdminRoom[] }>('/api/admin/rooms');
            setRooms(result.rooms || []);
        } catch (e) {
            setError(getErrorMessage(e, 'Failed to load rooms.'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Same gate as /admin/audit: hold the request until the Firebase
        // session exists, so the first load cannot 401 into an error page.
        if (!isAuthenticated) return;
        void load();
    }, [isAuthenticated, load]);

    const toggleStatus = useCallback(
        async (room: AdminRoom) => {
            setPendingId(room.id);
            try {
                await apiClient(`/api/admin/rooms/${encodeURIComponent(room.id)}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: room.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE',
                    }),
                });
                await load();
            } catch (e) {
                setError(getErrorMessage(e, 'Failed to update the room status.'));
            } finally {
                setPendingId(null);
            }
        },
        [load]
    );

    if (!isAuthenticated) return null;

    const openCreate = () => {
        setEditingRoom(null);
        setEditorOpen(true);
    };

    const openEdit = (room: AdminRoom) => {
        setEditingRoom(room);
        setEditorOpen(true);
    };

    const activeCount = rooms.filter((room) => room.status === 'ACTIVE').length;
    const hasRooms = rooms.length > 0;

    return (
        // `flex-1 min-h-0 overflow-y-auto` is load-bearing: the admin shell
        // clips its content column, so a page without its own scroll container
        // cannot be scrolled. `min-h-0` is what lets this flex child shrink far
        // enough for the scroller to engage — without it the column grew to its
        // content height and the shell clipped the bottom with nowhere to scroll.
        //
        // No `max-w-*` / `mx-auto`: the shell already constrains the content
        // column to `max-w-7xl` and centres it, and a nested narrower measure
        // just left a dead gutter on wide screens.
        //
        // No page-level top padding: AdminLayoutClient already reserves the
        // mobile top offset with `pt-14 md:pt-18 lg:pt-0`, so restating it
        // double-stacked the gap and collided with the fixed MobileTopNav.
        // `pb-20` IS needed here: the fixed AdminBottomNav renders on this path
        // (it returns null only on the opportunity/discovery/resources paths)
        // and is `md:hidden`, so `md:p-8` — which includes the bottom edge —
        // takes over from there.
        <div className="flex-1 min-h-0 space-y-6 overflow-y-auto p-4 text-foreground md:p-8">
            {/* One header row, shadcn-admin `index.tsx` shape: a short title and
                one line of description on the left, the count and the single
                working action on the right.

                The `h1` is `sr-only` below `lg`: `MobileTopNav` already prints
                the route name on a phone and `TopHeaderBar` prints it at `lg+`,
                so a visible heading made the page name appear twice on mobile.
                `sr-only` keeps it as the page's heading for screen readers;
                `lg:not-sr-only` restores the desktop rendering. The
                description is body copy under that title, so it is `text-base`
                — the same step already taken on /admin/users and /admin/audit. */}
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="sr-only lg:not-sr-only text-2xl font-semibold tracking-tight text-foreground">
                        Rooms
                    </h1>
                    <p className="mt-1 text-base text-muted-foreground">
                        Curated communities. Rooms are never deleted — set them inactive instead.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {hasRooms ? (
                        <Badge variant="outline" size="sm">
                            {activeCount} of {rooms.length} active
                        </Badge>
                    ) : null}
                    {loading && hasRooms ? (
                        <Badge variant="muted" size="sm" aria-live="polite">
                            Updating…
                        </Badge>
                    ) : null}
                    <Button type="button" size="sm" onClick={openCreate}>
                        New room
                    </Button>
                </div>
            </div>

            {error ? (
                <ErrorMessage
                    className="shrink-0"
                    message={error}
                    onRetry={() => void load()}
                    variant="subtle"
                />
            ) : null}

            {loading && !hasRooms ? (
                <div className="space-y-3" aria-hidden="true">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardContent className="space-y-2 p-4">
                                <Skeleton variant="subtle" className="h-4 w-1/3" />
                                <Skeleton variant="subtle" className="h-3 w-2/3" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : !hasRooms ? (
                <EmptyState
                    title="No rooms yet"
                    description="Create the first community room and fresher conversations start there."
                    icon="inbox"
                    size="md"
                    variant="ghost"
                    action={
                        <Button type="button" size="sm" onClick={openCreate}>
                            New room
                        </Button>
                    }
                />
            ) : (
                <ul className="space-y-3">
                    {rooms.map((room) => (
                        <RoomRow
                            key={room.id}
                            room={room}
                            busy={pendingId === room.id}
                            onEdit={() => openEdit(room)}
                            onToggleStatus={() => void toggleStatus(room)}
                        />
                    ))}
                </ul>
            )}

            <RoomFormDialog
                open={editorOpen}
                room={editingRoom}
                onOpenChange={setEditorOpen}
                onSaved={() => void load()}
            />
        </div>
    );
}

// ─── Room row ─────────────────────────────────────────────────────────────────

function RoomRow({
    room,
    busy,
    onEdit,
    onToggleStatus,
}: {
    room: AdminRoom;
    busy: boolean;
    onEdit: () => void;
    onToggleStatus: () => void;
}) {
    const isActive = room.status === 'ACTIVE';

    return (
        <li>
            <Card>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <h2 className="truncate text-sm font-semibold text-foreground">
                                {room.name}
                            </h2>
                            <Badge variant="muted" size="sm">
                                {room.type}
                            </Badge>
                            <Badge variant={isActive ? 'success' : 'secondary'} size="sm">
                                {isActive ? 'Active' : 'Inactive'}
                            </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            /{room.slug} · {room.memberCount} members · {room.postCount} posts
                            · {room.jobCount} jobs
                            {room.createdBy
                                ? ` · by ${room.createdBy.fullName || room.createdBy.username || 'admin'}`
                                : ''}
                        </p>
                        {room.description ? (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                                {room.description}
                            </p>
                        ) : null}
                    </div>
                    <div className="flex shrink-0 items-center">
                        {/* One icon trigger per row, the shadcn-admin
                            `users-table.tsx` idiom: the row's actions live in a
                            menu so the card stays a card instead of a button
                            tray. `modal={false}` keeps the menu from trapping
                            focus, which matters because the list sits inside a
                            bounded scroller. */}
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    aria-label={`Actions for ${room.name}`}
                                >
                                    <EllipsisHorizontalIcon className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href={`/community/rooms/${room.slug}`}>
                                        <EyeIcon className="size-4" />
                                        View room
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={onEdit}>
                                    <PencilSquareIcon className="size-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    disabled={busy}
                                    onSelect={onToggleStatus}
                                >
                                    <PowerIcon className="size-4" />
                                    {busy ? 'Working…' : isActive ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardContent>
            </Card>
        </li>
    );
}

// ─── Create / edit dialog ─────────────────────────────────────────────────────

/**
 * One dialog for both modes: `room === null` creates (`POST /api/admin/rooms`),
 * otherwise it edits (`PATCH /api/admin/rooms/:id`).
 *
 * The form lives in a child of `DialogContent`, which Radix only mounts while
 * the dialog is open, so each open seeds from the room being edited instead of
 * inheriting the previous one's values.
 */
function RoomFormDialog({
    open,
    room,
    onOpenChange,
    onSaved,
}: {
    open: boolean;
    room: AdminRoom | null;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-9/10 overflow-y-auto sm:max-w-lg">
                <RoomForm room={room} onOpenChange={onOpenChange} onSaved={onSaved} />
            </DialogContent>
        </Dialog>
    );
}

function RoomForm({
    room,
    onOpenChange,
    onSaved,
}: {
    room: AdminRoom | null;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
}) {
    const [name, setName] = useState(room?.name ?? '');
    const [description, setDescription] = useState(room?.description ?? '');
    const [type, setType] = useState(room?.type ?? 'CUSTOM');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!room && !name.trim()) {
            setError('Name is required.');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (room) {
                // Edit keeps the original "clear the field to clear the value"
                // contract by sending null rather than omitting the key.
                await apiClient(`/api/admin/rooms/${encodeURIComponent(room.id)}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        name: name.trim(),
                        description: description.trim() || null,
                        type,
                    }),
                });
            } else {
                await apiClient('/api/admin/rooms', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: name.trim(),
                        description: description.trim() || undefined,
                        type,
                    }),
                });
            }
            onOpenChange(false);
            onSaved();
        } catch (e) {
            setError(getErrorMessage(e, room ? 'Failed to save room.' : 'Failed to create room.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{room ? 'Edit room' : 'New room'}</DialogTitle>
                <DialogDescription>
                    {room
                        ? 'Name is the only required field.'
                        : 'Name is required. Type and description are optional.'}
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error ? <ErrorMessage message={error} variant="subtle" /> : null}

                <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Name" htmlFor="room-name" required>
                        <Input
                            id="room-name"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. 2026 Batch"
                        />
                    </Field>
                    <Field label="Type">
                        <Select value={type} onValueChange={setType} disabled={saving}>
                            <SelectTrigger id="room-type" aria-label="Room type">
                                <SelectValue placeholder="Pick a type" />
                            </SelectTrigger>
                            <SelectContent>
                                {ROOM_TYPES.map((t) => (
                                    <SelectItem key={t} value={t}>
                                        {t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </Field>
                </div>

                <Field label="Description" htmlFor="room-description">
                    <Textarea
                        id="room-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                        placeholder="What is this room about?"
                    />
                </Field>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        size="sm"
                        disabled={saving || !name.trim()}
                    >
                        {saving ? 'Saving…' : room ? 'Save changes' : 'Create room'}
                    </Button>
                </DialogFooter>
            </form>
        </>
    );
}
