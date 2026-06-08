/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";
import { LINKS_FEED_URL } from "@/lib/runtimeConfig";

// Edge runtime: faster cold starts than Node.js, lower timeout ceiling, optimised for ImageResponse.
// Data caching uses force-cache (Vercel edge CDN) + module-level TTL guard for warm instances.
export const runtime = "edge";

const size = { width: 1200, height: 630 };

type OpportunityDto = {
  id: string; slug?: string | null; title: string; company: string;
  type?: "JOB" | "INTERNSHIP" | "WALKIN"; status?: string;
  locations?: string[]; expiresAt?: string | null; companyLogoUrl?: string | null;
  events?: Array<{ eventType: string; eventDate: string }>;
};

// Module-level cache shared across warm edge instances in the same region.
let cachedLinks: OpportunityDto[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 300_000; // 5 min — re-fetch after TTL expires on warm instances

// Pre-fetch logo as ArrayBuffer so ImageResponse gets a real image, not a redirect or SVG
async function logoToDataUrl(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 800);
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    // Only accept raster images — SVG breaks ImageResponse
    if (!/image\/(png|jpe?g|webp|gif)/.test(ct)) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength < 500) return null; // too small = placeholder/error
    if (buf.byteLength > 65536) return null; // >64KB logo — too expensive to base64 on edge
    // Chunked btoa — spreading the full buffer as args causes stack overflow on large images
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1024) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 1024));
    }
    return `data:${ct.split(';')[0]};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

const truncate = (v: string, max: number) => v.length > max ? `${v.slice(0, max - 1)}\u2026` : v;
const getTypeLabel = (t?: string) => t === "INTERNSHIP" ? "INTERNSHIP" : t === "WALKIN" ? "WALK-IN" : "JOB";
const getBadgeColors = (t?: string) => t === "INTERNSHIP"
  ? { bg: "rgba(124,58,237,0.22)", border: "rgba(167,139,250,0.4)", color: "#c4b5fd" }
  : t === "WALKIN"
  ? { bg: "rgba(5,150,105,0.22)", border: "rgba(52,211,153,0.4)", color: "#6ee7b7" }
  : { bg: "rgba(37,99,235,0.22)", border: "rgba(96,165,250,0.4)", color: "#93c5fd" };

const isCampusDrive = (o: OpportunityDto) => {
  const t = (o.title || "").toLowerCase();
  return t.includes("nqt") || t.includes("campus drive") ||
    (o.events || []).some(e => ["REG_START","REG_END","EXAM_DATE"].includes(e.eventType));
};

const getDays = (d?: string | null) => {
  if (!d) return null;
  const t = new Date(d); if (isNaN(t.getTime())) return null;
  return Math.ceil((t.getTime() - Date.now()) / 86_400_000);
};

const urgencyLabel = (days: number | null) =>
  days == null ? null : days <= 0 ? "Closing Today" : days <= 3 ? `Closing in ${days}d` : days <= 7 ? `${days} days left` : null;

const fallback = (title: string, sub: string) => new ImageResponse(
  <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", justifyContent:"space-between", background:"#020404", color:"#F5F7F8", padding:"60px", fontFamily:"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>
    <div style={{ fontSize:22, fontWeight:700, color:"rgba(245,247,248,0.4)" }}>FresherFlow</div>
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div style={{ fontSize:64, fontWeight:900, lineHeight:1.08 }}>{title}</div>
      <div style={{ fontSize:28, color:"rgba(245,247,248,0.45)" }}>{sub}</div>
    </div>
    <div style={{ fontSize:20, color:"rgba(245,247,248,0.28)" }}>fresherflow.in</div>
  </div>,
  { ...size, headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
);

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const now = Date.now();

  if (!cachedLinks || now - lastFetchTime > CACHE_TTL_MS) {
    try {
      // force-cache: Vercel edge CDN caches this between cold starts in the same region.
      // Promise.race guards against slow CDN responses on a cache miss — edge has no AbortSignal
      // issue with force-cache (unlike next:{revalidate} which bypasses cache when signal is set).
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 4000)
      );
      const res = await Promise.race([
        fetch(LINKS_FEED_URL, {
          cache: "force-cache",
          headers: { Origin: process.env.NEXT_PUBLIC_SITE_URL || "https://fresherflow.in" }
        }),
        timeout,
      ]);
      if (res.ok) {
        cachedLinks = ((await res.json())?.opportunities || []) as OpportunityDto[];
        lastFetchTime = now;
      }
    } catch { /* stale ok — serve whatever is in cachedLinks or fallback below */ }
  }

  const opp = cachedLinks?.find(o => o.id === id || o.slug === id) ?? null;
  if (!opp) return fallback("Opportunity Preview", "This listing is unavailable.");
  if (opp.status === "EXPIRED") return fallback("Listing Archived", "This opportunity has expired.");

  const isDrive = isCampusDrive(opp);
  const typeLabel = isDrive ? "CAMPUS DRIVE" : getTypeLabel(opp.type);
  const badge = getBadgeColors(isDrive ? undefined : opp.type);
  const title = truncate(opp.title || "Opportunity", 65);
  const company = truncate(opp.company || "Company", 34);
  const location = truncate(opp.locations?.[0] || "India", 24);
  const urgency = urgencyLabel(getDays(opp.expiresAt));
  let finalLogoUrl = opp.companyLogoUrl;
  if (finalLogoUrl?.includes('logo.clearbit.com/')) {
    const domain = finalLogoUrl.split('logo.clearbit.com/')[1];
    finalLogoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  }
  const logoUrl = finalLogoUrl ? await logoToDataUrl(finalLogoUrl) : null;
  // Long titles shrink — short titles fill space
  const titleSize = title.length > 52 ? 52 : title.length > 38 ? 62 : 74;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fresherflow.in";
  const siteLogoUrl = `${siteUrl}/logo-white-optimized.png`;

  return new ImageResponse(
    <div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", justifyContent:"space-between", background:"#020404", color:"#F5F7F8", padding:"52px 60px", fontFamily:"ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" }}>

      {/* TOP: Company + FresherFlow */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          {logoUrl
            ? <img src={logoUrl} alt={company} width={100} height={100} style={{ borderRadius:24, background:"#fff", objectFit:"contain", padding:10 }} />
            : <div style={{ width:100, height:100, borderRadius:24, display:"flex", alignItems:"center", justifyContent:"center", background:"#1c1c1c", border:"1px solid rgba(245,247,248,0.1)", fontSize:40, fontWeight:900 }}>{company[0]}</div>
          }
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            <div style={{ fontSize:22, color:"rgba(245,247,248,0.38)", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase" }}>Hiring at</div>
            <div style={{ fontSize:48, fontWeight:800, color:"#F5F7F8", letterSpacing:"-0.5px" }}>{company}</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(245,247,248,0.07)", border:"1px solid rgba(245,247,248,0.12)", borderRadius:12, padding:"10px 20px" }}>
          <img src={siteLogoUrl} alt="FresherFlow" width={26} height={26} style={{ objectFit: "contain" }} />
          <div style={{ fontSize:20, fontWeight:700, color:"#F5F7F8" }}>FresherFlow</div>
        </div>
      </div>

      {/* MIDDLE: Title */}
      <div style={{ fontSize:titleSize, fontWeight:900, lineHeight:1.1, color:"#F5F7F8", letterSpacing:"-1px", maxWidth:"1080px" }}>
        {title}
      </div>

      {/* BOTTOM: Badges */}
      <div style={{ display:"flex", alignItems:"center", gap:16 }}>
        <div style={{ display:"flex", borderRadius:12, padding:"16px 28px", background:badge.bg, border:`1px solid ${badge.border}`, fontSize:24, fontWeight:700, letterSpacing:"0.07em", color:badge.color }}>
          {typeLabel}
        </div>
        <div style={{ display:"flex", borderRadius:12, padding:"16px 28px", background:"rgba(245,247,248,0.07)", border:"1px solid rgba(245,247,248,0.11)", fontSize:24, fontWeight:600, color:"rgba(245,247,248,0.65)" }}>
          📍 {location}
        </div>
        {urgency && (
          <div style={{ display:"flex", borderRadius:12, padding:"16px 28px", background:"rgba(239,68,68,0.16)", border:"1px solid rgba(239,68,68,0.35)", fontSize:24, fontWeight:700, color:"#fca5a5" }}>
            ⚡ {urgency}
          </div>
        )}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginLeft:"auto" }}>
          <div style={{ width:12, height:12, borderRadius:999, background:"#4ade80", display:"flex" }} />
          <div style={{ fontSize:22, fontWeight:600, color:"rgba(245,247,248,0.32)" }}>Verified · fresherflow.in</div>
        </div>
      </div>

    </div>,
    { ...size, headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
