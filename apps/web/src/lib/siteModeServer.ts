import { cookies } from "next/headers";
import { isGovernmentModeEnabled, SITE_MODE_COOKIE, SiteMode } from "./siteMode";

export async function getSiteMode(): Promise<SiteMode> {
  if (!isGovernmentModeEnabled()) return "private";
  const cookieStore = await cookies();
  const mode = cookieStore.get(SITE_MODE_COOKIE)?.value;
  if (mode === "govt") return "govt";
  return "private";
}
