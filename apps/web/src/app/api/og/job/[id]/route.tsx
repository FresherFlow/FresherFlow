import { ImageResponse } from "next/og";
import { BOOTSTRAP_FEED_URL } from "@/lib/runtimeConfig";

export const runtime = "edge";
export const revalidate = 86400; // 24 hours — job details don't change within minutes

const size = {
  width: 1200,
  height: 630,
};

async function signPathname(pathname: string, secret: string): Promise<{ t: number; sig: string }> {
  // Round timestamp to a 2-minute (120-second) window to make signed URLs stable for caching,
  // while remaining safely within the Cloudflare Worker's 5-minute (300-second) replay attack window.
  const t = Math.floor(Date.now() / 1000 / 120) * 120;
  const message = `${pathname}:${t}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  const cryptoObj = globalThis.crypto;
  const key = await cryptoObj.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await cryptoObj.subtle.sign(
    "HMAC",
    key,
    messageData
  );

  const hashArray = Array.from(new Uint8Array(signature));
  const sig = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return { t, sig };
}

async function getSignedUrl(url: string): Promise<string> {
  const secret = process.env.CDN_SIGNATURE_SECRET;
  if (secret) {
    try {
      const parsedUrl = new URL(url, "https://cdn.fresherflow.in");
      const pathname = parsedUrl.pathname;
      const isProtected = pathname === "/bootstrap-feed.min.json" ||
                          pathname === "/taken-usernames.min.json" ||
                          pathname === "/companies-directory.min.json" ||
                          pathname.startsWith("/categories/");

      if (isProtected) {
        const { t, sig } = await signPathname(pathname, secret);
        parsedUrl.searchParams.set("t", t.toString());
        parsedUrl.searchParams.set("sig", sig);
        return parsedUrl.toString();
      }
    } catch (err) {
      console.error("Failed to sign CDN url in OG route:", err);
    }
  }
  return url;
}

type OpportunityDto = {
  id: string;
  slug?: string | null;
  title: string;
  company: string;
  type?: "JOB" | "INTERNSHIP" | "WALKIN";
  status?: string;
  locations?: string[];
  experienceMin?: number;
  experienceMax?: number;
  salaryRange?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryPeriod?: "MONTHLY" | "YEARLY" | null;
  expiresAt?: string | null;
  companyWebsite?: string | null;
  applyLink?: string | null;
  companyLogoUrl?: string | null;
  events?: Array<{
    eventType:
    | "NOTIFICATION"
    | "REG_START"
    | "REG_END"
    | "EXAM_DATE"
    | "RESULT"
    | "INTERVIEW"
    | "DOC_VERIFICATION"
    | "OTHER";
    eventDate: string;
  }>;
};

const getApiBase = () =>
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "https://api.fresherflow.in";

const sanitizeDomain = (raw: string) => {
  try {
    const host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
    const parts = host.split(".").filter(Boolean);
    if (parts.length >= 2) return parts.slice(-2).join(".");
    return host;
  } catch {
    return "";
  }
};

interface AbortSignalConstructorExt {
  any?: (iterable: Iterable<AbortSignal>) => AbortSignal;
}

type FetchWithTimeoutOptions = {
  cacheMode?: RequestCache;
  revalidateSeconds?: number;
};

const fetchWithTimeout = async (
  url: string,
  timeoutMs = 15000,
  externalSignal?: AbortSignal,
  options?: FetchWithTimeoutOptions
) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const signals = [controller.signal];
  if (externalSignal) signals.push(externalSignal);

  try {
    const CustomAbortSignal = AbortSignal as unknown as AbortSignalConstructorExt;
    const requestInit: RequestInit & { next?: { revalidate: number } } = {
      method: "GET",
      cache: options?.cacheMode ?? "force-cache",
      // Link signals if AbortSignal.any is available (Edge runtime) or manually fallback
      signal: typeof CustomAbortSignal.any === 'function' ? CustomAbortSignal.any(signals) : controller.signal,
      headers: {
        "Origin": process.env.NEXT_PUBLIC_SITE_URL || "https://fresherflow.com",
      },
    };

    if (typeof options?.revalidateSeconds === "number") {
      requestInit.next = { revalidate: options.revalidateSeconds };
    }

    const response = await fetch(url, {
      ...requestInit,
    });
    return response;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const inferDomain = (opportunity: OpportunityDto) => {
  const fromWebsite = sanitizeDomain(opportunity.companyWebsite || "");
  if (fromWebsite) return fromWebsite;

  const fromApply = sanitizeDomain(opportunity.applyLink || "");
  if (fromApply) return fromApply;

  const fromCompany = opportunity.company
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "");
  return fromCompany ? `${fromCompany}.com` : "";
};

const getLogoCandidates = (opportunity: OpportunityDto) => {
  const domain = inferDomain(opportunity);
  if (!domain) return [];
  return [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    `https://logo.clearbit.com/${domain}?size=256`,
    `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  ];
};

const resolveLogoUrl = async (opportunity: OpportunityDto) => {
  if (opportunity.companyLogoUrl) {
    return opportunity.companyLogoUrl;
  }

  const candidates = getLogoCandidates(opportunity);
  if (!candidates.length) return "";

  const globalAbort = new AbortController();
  const timeout = new Promise<string>((resolve) =>
    setTimeout(() => {
      globalAbort.abort();
      resolve("");
    }, 800)
  );

  const checks = candidates.map(async (url) => {
    try {
      const response = await fetchWithTimeout(url, 1500, globalAbort.signal);
      if (!response || !response.ok) throw new Error();

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (!/(png|jpeg|jpg|svg)/.test(contentType)) throw new Error();

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength < 500) throw new Error();

      // Cancel others once we find one
      globalAbort.abort();
      return url;
    } catch (e) {
      throw e;
    }
  });

  const firstValid = Promise.any(checks).catch(() => "");

  return Promise.race([firstValid, timeout]);
};

const getTypeLabel = (type?: string) => {
  if (type === "INTERNSHIP") return "INTERNSHIP";
  if (type === "WALKIN") return "WALK-IN";
  return "JOB";
};

const findEventDate = (opportunity: OpportunityDto, eventType: string) => {
  const events = opportunity.events || [];
  const matching = events
    .filter((event) => event.eventType === eventType)
    .map((event) => new Date(event.eventDate))
    .filter((date) => !Number.isNaN(date.getTime()));
  return matching[0] ?? null;
};

const isCampusDrive = (opportunity: OpportunityDto) => {
  const title = (opportunity.title || "").toLowerCase();
  const hasKeyword = title.includes("nqt") || title.includes("campus drive");
  const hasTimelineEvents = (opportunity.events || []).some((event) =>
    ["REG_START", "REG_END", "EXAM_DATE"].includes(event.eventType)
  );
  return hasKeyword || hasTimelineEvents;
};

const truncate = (value: string, max: number) => {
  if (!value) return "";
  return value.length > max ? `${value.slice(0, max - 3)}...` : value;
};

const formatExperience = (opportunity: OpportunityDto) => {
  const min = opportunity.experienceMin;
  const max = opportunity.experienceMax;
  if (min == null && max == null) {
    if (opportunity.type === "INTERNSHIP") return "Fresher";
    return "Fresher+";
  }
  const finalMin = min ?? 0;
  if (finalMin === 0 && max === 0) return "Fresher";
  if (max == null) return finalMin <= 0 ? "Fresher+" : `${finalMin}+ yrs`;
  if (finalMin === max) return `${max} yr`;
  return `${finalMin}-${max} yrs`;
};

const formatSalary = (opportunity: OpportunityDto) => {
  if (opportunity.salaryRange) return truncate(opportunity.salaryRange, 24);
  const min = opportunity.salaryMin;
  const max = opportunity.salaryMax;
  if (min == null && max == null) return "Not disclosed";
  const monthly = opportunity.salaryPeriod === "MONTHLY";
  const suffix = monthly ? "k/month" : " LPA";
  const toDisplay = (v: number) =>
    monthly ? (Math.round(v / 1000).toString()) : (Math.floor(v / 10000) / 10).toString().replace(/\.0$/, "");
  if (min != null && max != null) {
    if (min === max) return `${toDisplay(min)}${suffix}`;
    return `${toDisplay(min)}-${toDisplay(max)}${suffix}`;
  }
  if (min != null) return `${toDisplay(min)}${suffix}`;
  return `Up to ${toDisplay(max as number)}${suffix}`;
};

const getCompactDriveSalary = (opportunity: OpportunityDto, driveMode: boolean) => {
  if (!driveMode) return null;
  const title = (opportunity.title || "").toLowerCase();
  const company = (opportunity.company || "").toLowerCase();
  const isTcsNqt = title.includes("nqt") && company.includes("tata");
  if (!isTcsNqt) return null;
  return "7-12 LPA";
};

const getDaysUntilExpiry = (targetDate: Date | null) => {
  if (!targetDate) return null;
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatDateLabel = (dt: Date | null) => {
  if (!dt || Number.isNaN(dt.getTime())) return "Open";
  return `${String(dt.getDate()).padStart(2, "0")} ${MONTHS[dt.getMonth()]}`;
};

const formatFullDateLabel = (dt: Date | null) => {
  if (!dt || Number.isNaN(dt.getTime())) return null;
  return `${String(dt.getDate()).padStart(2, "0")} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
};

const renderFallbackCard = (title: string, subtitle: string) =>
  new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0b1329 0%, #132b55 48%, #1e3a78 100%)",
          color: "#f8fafc",
          padding: "52px",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div
            style={{
              borderRadius: "999px",
              border: "1px solid rgba(148, 163, 184, 0.35)",
              background: "rgba(15, 23, 42, 0.4)",
              padding: "10px 18px",
              fontSize: "20px",
              color: "#bfdbfe",
            }}
          >
            FresherFlow
          </div>
          <div
            style={{
              borderRadius: "999px",
              border: "1px solid rgba(251, 191, 36, 0.45)",
              background: "rgba(120, 53, 15, 0.38)",
              color: "#fde68a",
              fontSize: "18px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              padding: "10px 16px",
            }}
          >
            PREVIEW
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ fontSize: "58px", lineHeight: 1.08, fontWeight: 800 }}>
            {title}
          </div>
          <div style={{ fontSize: "28px", color: "#cbd5e1" }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: "22px", color: "#bfdbfe" }}>
          Explore active opportunities at fresherflow.in
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const apiBase = getApiBase();

  let opportunity: OpportunityDto | null = null;

  // 1. Try to fetch from the secure CDN feed first (100% Vercel-side)
  try {
    const signedUrl = await getSignedUrl(BOOTSTRAP_FEED_URL);
    const cdnResponse = await fetchWithTimeout(
      signedUrl,
      5000,
      undefined,
      { 
        cacheMode: "force-cache", 
        revalidateSeconds: 300 
      }
    );

    if (cdnResponse && cdnResponse.ok) {
      const payload = await cdnResponse.json();
      const allOpportunities = (payload?.opportunities || []) as OpportunityDto[];
      opportunity = allOpportunities.find((o) => o.id === id || o.slug === id) || null;
    }
  } catch (cdnError) {
    console.warn("CDN preview fetch failed:", cdnError);
  }

  if (!opportunity) {
    return renderFallbackCard("Opportunity preview", "This listing is unavailable.");
  }

  if (opportunity.status === "EXPIRED") {
    return renderFallbackCard(
      "Listing archived",
      "This opportunity has expired. Discover active roles on FresherFlow."
    );
  }

  const logoUrl = await resolveLogoUrl(opportunity);
  const title = truncate(opportunity.title || "Opportunity", 80);
  const company = truncate(opportunity.company || "Company", 42);
  const location = truncate(opportunity.locations?.[0] || "India", 24);
  const driveMode = isCampusDrive(opportunity);
  const compactDriveSalary = getCompactDriveSalary(opportunity, driveMode);
  const regEndDate = findEventDate(opportunity, "REG_END");
  const examDate = findEventDate(opportunity, "EXAM_DATE");
  const expiryDate = opportunity.expiresAt ? new Date(opportunity.expiresAt) : null;
  const validExpiryDate = expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate : null;
  const effectiveDeadlineDate =
    regEndDate ?? validExpiryDate;
  const typeLabel = driveMode ? "CAMPUS DRIVE" : getTypeLabel(opportunity.type);
  const experienceLabel = formatExperience(opportunity);
  const salaryLabel = compactDriveSalary || formatSalary(opportunity);
  const deadlineLabel = formatDateLabel(effectiveDeadlineDate);
  const applyBeforeLabel = formatFullDateLabel(validExpiryDate);
  const daysUntilExpiry = getDaysUntilExpiry(effectiveDeadlineDate);
  const urgencyLabel =
    daysUntilExpiry != null && daysUntilExpiry <= 3
      ? daysUntilExpiry <= 0
        ? "Closing today"
        : `Closing in ${daysUntilExpiry}d`
      : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(135deg, #07142d 0%, #0e274f 40%, #153872 100%)",
          color: "#f8fafc",
          padding: "40px",
          fontFamily:
            "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              background: "rgba(15, 23, 42, 0.45)",
              border: "1px solid rgba(148, 163, 184, 0.25)",
              borderRadius: "16px",
              padding: "10px 14px",
            }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Company logo"
                width={50}
                height={50}
                style={{
                  borderRadius: "10px",
                  background: "#ffffff",
                  objectFit: "contain",
                  padding: "6px",
                }}
              />
            ) : (
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#1e293b",
                  color: "#e2e8f0",
                  fontWeight: 700,
                }}
              >
                {company.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span
                style={{
                  fontSize: "17px",
                  color: "#cbd5e1",
                  letterSpacing: "0.03em",
                }}
              >
                Hiring at
              </span>
              <span style={{ fontSize: "30px", fontWeight: 700 }}>{company}</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              borderRadius: "999px",
              background: "rgba(2, 6, 23, 0.5)",
              border: "1px solid rgba(148, 163, 184, 0.28)",
              padding: "8px 14px",
            }}
          >
            <span
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "999px",
                background: "#f8fafc",
                color: "#0f172a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: "13px",
              }}
            >
              F
            </span>
            <span style={{ fontSize: "20px", fontWeight: 700 }}>FresherFlow</span>
          </div>
        </div>

        <div
          style={{
            marginTop: "32px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <span
              style={{
                borderRadius: "999px",
                border: "1px solid rgba(186, 230, 253, 0.45)",
                background: "rgba(14, 116, 144, 0.24)",
                color: "#e0f2fe",
                fontSize: "18px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                padding: "8px 14px",
              }}
            >
              {typeLabel}
            </span>
            <span
              style={{
                borderRadius: "999px",
                border: "1px solid rgba(186, 230, 253, 0.25)",
                background: "rgba(15, 23, 42, 0.35)",
                color: "#e2e8f0",
                fontSize: "18px",
                fontWeight: 600,
                padding: "8px 14px",
              }}
            >
              {location}
            </span>
            {urgencyLabel ? (
              <span
                style={{
                  borderRadius: "999px",
                  border: "1px solid rgba(251, 191, 36, 0.5)",
                  background: "rgba(120, 53, 15, 0.38)",
                  color: "#fde68a",
                  fontSize: "16px",
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  padding: "8px 14px",
                }}
              >
                {urgencyLabel}
              </span>
            ) : null}
          </div>
          {applyBeforeLabel ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "4px",
              }}
            >
              <span
                style={{
                  borderRadius: "999px",
                  border: "1px solid rgba(253, 230, 138, 0.55)",
                  background: "rgba(120, 53, 15, 0.35)",
                  color: "#fde68a",
                  fontSize: "16px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  padding: "6px 12px",
                }}
              >
                APPLY BEFORE {applyBeforeLabel.toUpperCase()}
              </span>
            </div>
          ) : null}

          <div
            style={{
              fontSize: "56px",
              lineHeight: 1.08,
              fontWeight: 800,
              maxWidth: "1100px",
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "stretch",
            gap: "12px",
          }}
        >
          {[
            { label: "Experience", value: experienceLabel },
            { label: "Compensation", value: salaryLabel },
            { label: driveMode ? "Reg Ends" : "Apply by", value: deadlineLabel },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                flex: 1,
                borderRadius: "14px",
                border: "1px solid rgba(148, 163, 184, 0.22)",
                background: "rgba(2, 6, 23, 0.42)",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              <span
                style={{
                  fontSize: "14px",
                  color: "#cbd5e1",
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  fontSize: "24px",
                  lineHeight: 1.2,
                  fontWeight: 700,
                  color: "#f8fafc",
                }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            color: "#bfdbfe",
            fontSize: "18px",
            letterSpacing: "0.02em",
            marginTop: "10px",
          }}
        >
          {driveMode && examDate
            ? `Test from ${formatDateLabel(examDate)} - Verified listing on fresherflow.in`
            : "Verified listing on fresherflow.in"}
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
