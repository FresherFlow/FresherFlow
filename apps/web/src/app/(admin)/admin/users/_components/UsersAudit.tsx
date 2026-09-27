import type { ModeratorAuditRecord } from '@/features/admin/moderators/moderationContract';
import { Badge } from '@/ui/Badge';
import { formatAssignedAt } from './userDisplay';

export default function UsersAudit({ audit }: { audit: ModeratorAuditRecord[] }) {
    return (
        <section
            aria-label="Recent moderator audit"
            className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm md:p-5"
        >
            <div>
                <h2 className="text-base font-semibold tracking-tight text-foreground">Recent moderator audit</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Who did what to which object, when, and why. Full history lives under Audit log.
                </p>
            </div>
            {audit.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No audit entries yet. Grants, revocations, suspensions, and reactivations will appear here.
                </p>
            ) : (
                <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border/60">
                    {audit.slice(0, 8).map((entry, i) => (
                        <li key={`${entry.at}-${entry.action}-${entry.object}-${i}`} className="px-3 py-2">
                            <p className="text-sm text-foreground">
                                <span className="font-medium">{entry.who}</span>{' '}
                                <Badge variant="secondary">{entry.action}</Badge>
                            </p>
                            <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                                {entry.object} · {formatAssignedAt(entry.at)}
                                {entry.reason ? ` · ${entry.reason}` : ''}
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
