'use client';

import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function HeaderPortal({ children }: { children: ReactNode }) {
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalTarget(document.getElementById('top-header-portal-target'));
    }, []);

    if (!portalTarget) return null;

    return createPortal(children, portalTarget);
}
