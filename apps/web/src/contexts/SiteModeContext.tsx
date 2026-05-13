"use client";

import React, { createContext, useContext, useEffect, useState, useTransition } from "react";
import { SiteMode, getSiteModeClient, setSiteModeClient } from "@/lib/siteMode";
import { useRouter } from "next/navigation";

interface SiteModeContextType {
  mode: SiteMode;      // The current display mode
  setMode: (mode: SiteMode) => void;
  isPending: boolean;
  isModeSyncing: boolean; // TRUE when we are in the middle of a "paper sweep"
}

const SiteModeContext = createContext<SiteModeContextType | undefined>(undefined);

const FALLBACK_SITE_MODE_CONTEXT: SiteModeContextType = {
  mode: "private",
  setMode: () => {},
  isPending: false,
  isModeSyncing: false,
};

export function SiteModeProvider({
  children,
  initialMode,
}: {
  children: React.ReactNode;
  initialMode: SiteMode;
}) {
  const [mode, setModeState] = useState<SiteMode>(() => {
    if (typeof window === "undefined") return initialMode;
    if (typeof document === "undefined" || !document.cookie.includes("ff_site_mode")) {
      return initialMode;
    }
    return getSiteModeClient();
  });
  // We need a separate state to trigger the animation WITHOUT changing the 'mode' immediately
  const [isModeSyncing, setIsModeSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (typeof document === 'undefined' || !document.cookie.includes("ff_site_mode")) {
      return;
    }
    const clientMode = getSiteModeClient();
    if (clientMode !== mode) {
      startTransition(() => {
        setModeState(clientMode);
      });
    }
  }, [mode, startTransition]);

  const setMode = (newMode: SiteMode) => {
    if (newMode === mode) return;

    // 1. START the sweep first (isModeSyncing = true)
    // IMPORTANT: We do NOT call setModeState yet!
    setIsModeSyncing(true);

    // 2. WAIT for the sweep to cover the screen (at least 600ms)
    setTimeout(() => {
      // 3. NOW swap the data while it's hidden behind the sweep
      setSiteModeClient(newMode);
      setModeState(newMode);

      startTransition(() => {
        // Refresh the router to update Server Components
        router.refresh();
        // 4. DONE with the swap, the sweep can now fade away
        setIsModeSyncing(false);
      });
    }, 700); // 700ms ensures the screen is 100% covered before swapping data
  };

  return (
    <SiteModeContext.Provider value={{ mode, setMode, isPending, isModeSyncing }}>
      {children}
    </SiteModeContext.Provider>
  );
}

export function useSiteMode() {
  const context = useContext(SiteModeContext);
  if (context === undefined) {
    return FALLBACK_SITE_MODE_CONTEXT;
  }
  return context;
}
