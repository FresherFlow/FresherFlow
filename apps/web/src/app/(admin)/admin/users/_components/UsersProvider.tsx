'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type {
    DirectoryUser,
    ModeratorListEntry,
} from '@/features/admin/moderators/moderationContract';

export interface UsersSuspendTarget {
    id: string;
    name: string;
}

interface UsersDialogsState {
    grantOpen: boolean;
    setGrantOpen: (open: boolean) => void;
    grantQuery: string;
    setGrantQuery: (query: string) => void;
    grantTarget: DirectoryUser | null;
    setGrantTarget: (target: DirectoryUser | null) => void;
    grantReason: string;
    setGrantReason: (reason: string) => void;
    revokeTarget: ModeratorListEntry | null;
    setRevokeTarget: (target: ModeratorListEntry | null) => void;
    suspendTarget: UsersSuspendTarget | null;
    setSuspendTarget: (target: UsersSuspendTarget | null) => void;
    reactivateTarget: UsersSuspendTarget | null;
    setReactivateTarget: (target: UsersSuspendTarget | null) => void;
    bulkSuspendTargets: UsersSuspendTarget[] | null;
    setBulkSuspendTargets: (targets: UsersSuspendTarget[] | null) => void;
    bulkReactivateTargets: UsersSuspendTarget[] | null;
    setBulkReactivateTargets: (targets: UsersSuspendTarget[] | null) => void;
    openGrant: () => void;
}

const UsersDialogsContext = createContext<UsersDialogsState | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
    const [grantOpen, setGrantOpen] = useState(false);
    const [grantQuery, setGrantQuery] = useState('');
    const [grantTarget, setGrantTarget] = useState<DirectoryUser | null>(null);
    const [grantReason, setGrantReason] = useState('');
    const [revokeTarget, setRevokeTarget] = useState<ModeratorListEntry | null>(null);
    const [suspendTarget, setSuspendTarget] = useState<UsersSuspendTarget | null>(null);
    const [reactivateTarget, setReactivateTarget] = useState<UsersSuspendTarget | null>(null);
    const [bulkSuspendTargets, setBulkSuspendTargets] = useState<UsersSuspendTarget[] | null>(null);
    const [bulkReactivateTargets, setBulkReactivateTargets] = useState<UsersSuspendTarget[] | null>(null);

    const openGrant = useCallback(() => {
        setGrantQuery('');
        setGrantTarget(null);
        setGrantReason('');
        setGrantOpen(true);
    }, []);

    const value = useMemo<UsersDialogsState>(
        () => ({
            grantOpen,
            setGrantOpen,
            grantQuery,
            setGrantQuery,
            grantTarget,
            setGrantTarget,
            grantReason,
            setGrantReason,
            revokeTarget,
            setRevokeTarget,
            suspendTarget,
            setSuspendTarget,
            reactivateTarget,
            setReactivateTarget,
            bulkSuspendTargets,
            setBulkSuspendTargets,
            bulkReactivateTargets,
            setBulkReactivateTargets,
            openGrant,
        }),
        [
            grantOpen,
            grantQuery,
            grantTarget,
            grantReason,
            revokeTarget,
            suspendTarget,
            reactivateTarget,
            bulkSuspendTargets,
            bulkReactivateTargets,
            openGrant,
        ],
    );

    return <UsersDialogsContext.Provider value={value}>{children}</UsersDialogsContext.Provider>;
}

export function useUsersDialogs(): UsersDialogsState {
    const ctx = useContext(UsersDialogsContext);
    if (!ctx) throw new Error('useUsersDialogs must be used within <UsersProvider>');
    return ctx;
}
