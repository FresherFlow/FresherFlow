"use client";

import * as React from "react";

/**
 * Must match the layout's real switch point, not the stock shadcn 768px.
 *
 * Both shells swap on `lg` (1024px): the desktop rail is `hidden lg:block`
 * and the drawer trigger is `lg:hidden`. At 768px this hook reported
 * "not mobile" for every 768-1023px screen, so a tablet got the drawer
 * (correct) rendered through the collapsed-rail branch (wrong) - icons with
 * no labels. Anything that must match the shell has to agree with `lg`.
 */
const MOBILE_BREAKPOINT = 1024;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(mql.matches);
    };

    mql.addEventListener("change", onChange);
    setIsMobile(mql.matches);

    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
