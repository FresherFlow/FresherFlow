import { Badge } from '@/ui/Badge';
import type { CommunityPostUser } from '@fresherflow/types';

export type RoomTab = 'posts' | 'jobs' | 'members';

export type RoomMember = {
    user: CommunityPostUser;
    role: string;
    joinedAt: string;
    activeThisWeek?: boolean;
};

export type RoomJobRow = {
    reason: 'PINNED' | 'SHARED';
    createdAt: string;
    opportunity: {
        id: string;
        slug: string;
        title: string;
        company: string;
        locations: string[];
        salaryRange: string | null;
        status: string;
    };
    addedBy: { id: string; fullName: string | null; username: string | null } | null;
};

/**
 * Weekly-activity pill, shared by the room header and the member rows. The dot
 * sits outside the badge because the primitive owns its own inner spacing.
 */
export function ActiveThisWeekBadge() {
    return (
        <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-live" aria-hidden="true" />
            <Badge variant="success" size="sm">Active this week</Badge>
        </span>
    );
}
