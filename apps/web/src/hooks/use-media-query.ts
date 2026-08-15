import { useEffect, useState } from "react";

function getDevice(): "mobile" | "tablet" | "desktop" | null {
  if (typeof window === "undefined") return null;

  return window.matchMedia("(min-width: 1024px)").matches
    ? "desktop"
    : window.matchMedia("(min-width: 640px)").matches
      ? "tablet"
      : "mobile";
}

export function useMediaQuery() {
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop" | null>(getDevice);

  useEffect(() => {
    const checkDevice = () => {
      setDevice(getDevice());
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);

    return () => {
      window.removeEventListener("resize", checkDevice);
    };
  }, []);

  return {
    device,
    isMobile: device === "mobile",
    isTablet: device === "tablet",
    isDesktop: device === "desktop",
  };
}
