function statusBadgeVariant(status?: string): 'success' | 'destructive' | 'warning' {
    if (status === 'SUSPENDED' || status === 'DEACTIVATED') return 'destructive';
    return 'success';
}

function formatAssignedAt(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? '—'
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function displayName(e: { fullName?: string | null; email?: string | null; id: string }): string {
    return e.fullName || e.email || e.id;
}

export { statusBadgeVariant, formatAssignedAt, displayName };
