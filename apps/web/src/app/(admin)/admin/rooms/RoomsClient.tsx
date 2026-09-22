'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { cn } from "@/ui/cn";

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
    const [rooms, setRooms] = useState<AdminRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await apiClient<{ rooms: AdminRoom[] }>('/api/admin/rooms');
            setRooms(result.rooms || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load rooms.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="flex-1 p-4 md:p-8 space-y-6 max-w-5xl mx-auto w-full overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Rooms</h1>
                    <p className="text-muted-foreground mt-1">
                        Curated persistent communities. Rooms are never deleted — set them inactive instead.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setShowCreate(!showCreate)}
                    className="shrink-0 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90"
                >
                    {showCreate ? 'Cancel' : 'New Room'}
                </button>
            </div>

            {showCreate && (
                <CreateRoomForm
                    onCreated={() => { setShowCreate(false); void load(); }}
                />
            )}

            {loading ? (
                <div className="space-y-2">
                    {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/40" />)}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    {error}{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold text-primary hover:underline">Retry</button>
                </div>
            ) : rooms.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-xs text-muted-foreground">
                    No rooms yet. Create the first one.
                </div>
            ) : (
                <div className="space-y-2">
                    {rooms.map((room) => (
                        <RoomRow
                            key={room.id}
                            room={room}
                            editing={editingId === room.id}
                            onToggleEdit={() => setEditingId(editingId === room.id ? null : room.id)}
                            onUpdated={() => { setEditingId(null); void load(); }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Room Row ────────────────────────────────────────────────────────────────

function RoomRow({ room, editing, onToggleEdit, onUpdated }: {
    room: AdminRoom;
    editing: boolean;
    onToggleEdit: () => void;
    onUpdated: () => void;
}) {
    const isActive = room.status === 'ACTIVE';

    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-foreground truncate">{room.name}</h3>
                        <span className="rounded-full bg-muted/40 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {room.type}
                        </span>
                        <span className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wider',
                            isActive ? 'bg-signal-live/10 text-signal-live' : 'bg-muted text-muted-foreground'
                        )}>
                            {isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        /{room.slug} · {room.memberCount} members · {room.postCount} posts · {room.jobCount} jobs
                        {room.createdBy ? ` · by ${room.createdBy.fullName || room.createdBy.username || 'admin'}` : ''}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <Link href={`/community/rooms/${room.slug}`} className="text-xs font-semibold text-primary hover:underline">
                        View
                    </Link>
                    <button
                        type="button"
                        onClick={onToggleEdit}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
                    >
                        {editing ? 'Close' : 'Edit'}
                    </button>
                    <button
                        type="button"
                        onClick={() => void toggleStatus(room, onUpdated)}
                        className={cn(
                            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
                            isActive
                                ? 'text-muted-foreground hover:bg-muted/60 hover:text-destructive'
                                : 'text-signal-live hover:bg-signal-live/10'
                        )}
                    >
                        {isActive ? 'Deactivate' : 'Activate'}
                    </button>
                </div>
            </div>
            {editing && <EditRoomForm room={room} onSaved={onUpdated} />}
        </div>
    );
}

async function toggleStatus(room: AdminRoom, onDone: () => void) {
    await apiClient(`/api/admin/rooms/${encodeURIComponent(room.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: room.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' }),
    });
    onDone();
}

// ─── Create Form ─────────────────────────────────────────────────────────────

function CreateRoomForm({ onCreated }: { onCreated: () => void }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState('CUSTOM');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!name.trim()) { setError('Name is required.'); return; }
        setSubmitting(true);
        setError(null);
        try {
            await apiClient('/api/admin/rooms', {
                method: 'POST',
                body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, type }),
            });
            onCreated();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to create room.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="grid gap-3 md:grid-cols-2">
                <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Name *</label>
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 2026 Batch"
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
                <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Type</label>
                    <select value={type} onChange={(e) => setType(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30">
                        {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                    placeholder="What is this room about?"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
            </div>
            <button type="button" onClick={() => void handleSubmit()} disabled={submitting || !name.trim()}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50">
                {submitting ? 'Creating…' : 'Create Room'}
            </button>
        </div>
    );
}

// ─── Edit Form ───────────────────────────────────────────────────────────────

function EditRoomForm({ room, onSaved }: { room: AdminRoom; onSaved: () => void }) {
    const [name, setName] = useState(room.name);
    const [description, setDescription] = useState(room.description || '');
    const [type, setType] = useState(room.type);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setSaving(true);
        setError(null);
        try {
            await apiClient(`/api/admin/rooms/${encodeURIComponent(room.id)}`, {
                method: 'PATCH',
                body: JSON.stringify({ name: name.trim(), description: description.trim() || null, type }),
            });
            onSaved();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save room.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="border-t border-border pt-3 space-y-3">
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div className="grid gap-3 md:grid-cols-2">
                <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Name</label>
                    <input value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
                <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Type</label>
                    <select value={type} onChange={(e) => setType(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30">
                        {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
            </div>
            <button type="button" onClick={() => void handleSave()} disabled={saving || !name.trim()}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Changes'}
            </button>
        </div>
    );
}
