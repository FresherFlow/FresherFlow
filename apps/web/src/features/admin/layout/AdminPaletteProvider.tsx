'use client';

import * as React from 'react';

type AdminPaletteContextValue = {
    open: boolean;
    setOpen: (open: boolean) => void;
    openPalette: () => void;
    closePalette: () => void;
    togglePalette: () => void;
};

export const AdminPaletteContext =
    React.createContext<AdminPaletteContextValue | null>(null);

export function useAdminPalette(): AdminPaletteContextValue | null {
    return React.useContext(AdminPaletteContext);
}

export function AdminPaletteProvider({ children }: { children: React.ReactNode }) {
    const [open, setOpenState] = React.useState(false);

    const setOpen = React.useCallback((next: boolean) => {
        setOpenState(next);
    }, []);
    const openPalette = React.useCallback(() => setOpenState(true), []);
    const closePalette = React.useCallback(() => setOpenState(false), []);
    const togglePalette = React.useCallback(() => setOpenState((prev) => !prev), []);

    React.useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                togglePalette();
            }
        }
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [togglePalette]);

    const value = React.useMemo<AdminPaletteContextValue>(
        () => ({ open, setOpen, openPalette, closePalette, togglePalette }),
        [open, setOpen, openPalette, closePalette, togglePalette],
    );

    return <AdminPaletteContext.Provider value={value}>{children}</AdminPaletteContext.Provider>;
}
