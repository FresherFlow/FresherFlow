import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Opportunity } from "@fresherflow/types";
import type { CategoryFeedType } from "@/features/jobs/utils/walkinMapUtils";
import { useOpportunitiesFeed } from "@/features/jobs/hooks/useOpportunitiesFeed";
import { useAuth } from "@/lib/auth/AuthContext";
import { type FilterBarFilters } from "@/features/jobs/components/JobFilterBar";
import {
  GOVT_PHASE_STATUSES,
  GOVT_CATEGORIES,
  jobMatchesCategory,
  type GovtPhaseFilter,
  type GovtCategoryFilter,
} from "@/features/jobs/components/GovtPhaseTabs";
import { formatJobFeedTitle } from "@/features/jobs/utils/formatJobFeedTitle";
import {
  filterOpportunities,
  applyLocalFilters,
  applyProfileVisibility,
} from "@/features/jobs/utils/filterOpportunities";
import {
  type WalkinDrivePeriod,
} from "@/features/jobs/utils/walkinMapUtils";
import { sanitizeSearchQuery } from "@/features/jobs/utils/searchUtils";
import { useProfileFilterPrefs, buildProfileFilterSeed, resetProfileFilterDims } from "@/features/jobs/hooks/useProfileFilters";
import { FEED_PAGE_SIZE } from "@/lib/utils/feedPageSize";

/**
 * Multi-value filters are encoded as repeated keys (`?company=A&company=B`) so
 * a value containing a comma â€” a company name or job title â€” survives a round
 * trip. Older links used one comma-joined value, so a single occurrence is
 * still split on commas: links shared before this change keep working.
 */
/** Set equality for work modes â€” profile seeds are order-insensitive. */
const sameModeSet = (a: string[] | null | undefined, b: string[] | null | undefined): boolean => {
  const left = (a ?? []).map((mode) => mode.toUpperCase()).sort();
  const right = (b ?? []).map((mode) => mode.toUpperCase()).sort();
  return left.length > 0 && left.length === right.length && left.every((value, index) => value === right[index]);
};

const readMultiParam = (
  sp: URLSearchParams | null | undefined,
  key: string,
): string[] | null => {
  const values = sp?.getAll(key);
  if (!values || values.length === 0) return null;
  const parsed =
    values.length > 1
      ? values.filter(Boolean)
      : values[0].split(",").filter(Boolean);
  return parsed.length > 0 ? parsed : null;
};

/**
 * Identity of a location for the URL -> state sync. `?job=` is excluded on
 * purpose: it marks the open detail pane, not a filter, so opening or closing
 * a row must not look like a location change (that path rebuilds every filter
 * array and resets feed scroll + pagination).
 */
const urlSignature = (
  path: string,
  sp: URLSearchParams | null | undefined,
): string => {
  const copy = new URLSearchParams(sp?.toString() ?? "");
  copy.delete("job");
  const query = copy.toString();
  return query ? `${path}?${query}` : path;
};

export interface UseCategoryPageStateProps {
  type: CategoryFeedType | null;
  initialData?: {
    opportunities: Opportunity[];
    total: number;
    cachedAt?: number;
  } | null;
  initialFilters?: Partial<FilterBarFilters>;
  canonicalRedirect?: boolean;
  customTitle?: string;
  topContent?: React.ReactNode;
  bottomContent?: React.ReactNode;
  userLocation?: { latitude: number; longitude: number } | null;
}

export function useCategoryPageState({
  type: propType,
  initialData,
  initialFilters,
  canonicalRedirect,
  customTitle,
  topContent,
  bottomContent,
  userLocation,
}: UseCategoryPageStateProps) {
  const { user, profile } = useAuth();
  const { prefs: profileFilterPrefs, setEnabled: setProfileFiltersEnabled } = useProfileFilterPrefs();
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlType = searchParams?.get("type");
  const type = (
    urlType ? urlType.toUpperCase() : propType
  ) as CategoryFeedType | null;
  // Every `?mode=` value: the feed's mode predicate ORs across them, and a
  // profile can seed several (`?mode=remote&mode=hybrid`).
  const modeParams = searchParams?.getAll("mode");
  const mode = modeParams && modeParams.length > 0 ? modeParams : null;
  const source = readMultiParam(searchParams, "source") ?? [];
  const sort = searchParams?.get("sort");

  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  // Value the `?job=` param should hold â€” the pane's URL is written from this,
  // never read back from a possibly-stale searchParams.
  const jobParamRef = useRef<string | null>(searchParams?.get("job") ?? null);

  // Removes `?job=` from the current entry, keeping whatever history state it
  // has, so a closed pane is never advertised as open by the URL.
  const stripJobParam = () => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has("job")) return;
    params.delete("job");
    const query = params.toString();
    window.history.replaceState(
      window.history.state ?? null,
      "",
      query ? `?${query}` : window.location.pathname,
    );
  };
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    // Touch devices only ever get the single mobile view. Width alone handed
    // landscape phones / tablets the desktop List + Split layout, so a tap on a
    // job card navigated to the job page instead of opening the detail drawer.
    const computeIsDesktop = () =>
      window.innerWidth >= 1280 &&
      !(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
    setIsDesktop(computeIsDesktop());
    const handleResize = () => setIsDesktop(computeIsDesktop());
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const paneWasOpen = event?.state?.modalOpen === true;
      const jobInUrl = new URLSearchParams(window.location.search).get("job");
      jobParamRef.current = paneWasOpen ? jobInUrl : null;
      if (!paneWasOpen) {
        // Landing on a non-pane entry means the pane is closed. A leftover
        // `job` there would re-open a row the user just dismissed, so drop it.
        if (jobInUrl) stripJobParam();
        setSelectedOpp(null);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);



  // Writes `?job=` from the live selection. Pushing only happens the first time
  // the pane opens for a URL, so switching rows never stacks history entries.
  const writeJobParam = (jobKey: string) => {
    const params = new URLSearchParams(window.location.search);
    params.set("job", jobKey);
    const query = params.toString();
    const url = query ? `?${query}` : window.location.pathname;
    const alreadyOpen = window.history.state?.modalOpen === true;
    if (alreadyOpen) {
      window.history.replaceState({ modalOpen: true }, "", url);
    } else {
      window.history.pushState({ modalOpen: true }, "", url);
    }
  };

  const handleSelectOpportunity = (opp: Opportunity) => {
    const jobKey = opp.slug || opp.id;
    jobParamRef.current = jobKey;
    setSelectedOpp(opp);
    // The URL now carries `?job=<slug>`, so the list and the open pane share one
    // addressable link â€” shareable, bookmarkable, and reproducible on reload.
    // Next.js still hands useSearchParams a fresh object for a truthy URL, but
    // `urlSignature` ignores `job`, so no filter array is rebuilt and feed scroll
    // + pagination survive the click. That is why this used to push a bare
    // entry with no URL at all.
    writeJobParam(jobKey);
  };

  const handleCloseOpportunityPane = () => {
    const mobileModal = document.getElementById("mobile-detail-modal");
    if (mobileModal) {
      mobileModal.classList.remove("animate-in", "slide-in-from-bottom");
      mobileModal.classList.add(
        "animate-out",
        "slide-out-to-bottom",
        "fade-out",
        "duration-300",
      );
    }
    setTimeout(() => {
      setSelectedOpp(null);
      jobParamRef.current = null;
      if (window.history.state?.modalOpen) {
        // The pane pushed an entry when it opened: Back restores the URL without
        // `job`. If that target entry still carries one (a deep link a later push
        // went on top of), popstate strips it below.
        window.history.back();
      } else {
        // Deep link that loaded straight into an open pane â€” there is no pushed
        // entry to abandon, so drop the param from the current one.
        stripJobParam();
      }
    }, 250);
  };

  const [search, setSearch] = useState(() =>
    sanitizeSearchQuery(searchParams?.get("q") || ""),
  );
  const [govtPhase, setGovtPhase] = useState<GovtPhaseFilter>("ALL");
  const [govtCategory, setGovtCategory] = useState<GovtCategoryFilter>(
    (searchParams?.get("category") as GovtCategoryFilter) || null,
  );
  const [filters, setFilters] = useState<FilterBarFilters>({
    location: searchParams?.get("location") || initialFilters?.location || null,
    year: searchParams?.get("year")
      ? parseInt(searchParams.get("year")!, 10)
      : initialFilters?.year || null,
    closingSoon: searchParams?.get("closingSoon") === "true",
    saved: searchParams?.get("saved") === "true",
    sector: searchParams?.get("sector") || initialFilters?.sector || null,
    qualification:
      searchParams?.get("qualification") ||
      initialFilters?.qualification ||
      null,
    course: searchParams?.get("course") || initialFilters?.course || null,
    workMode: searchParams?.getAll("mode").length
      ? searchParams.getAll("mode").map((m) => m.toUpperCase())
      : initialFilters?.workMode || null,
    skills: readMultiParam(searchParams, "skills") || initialFilters?.skills || [],
    source: readMultiParam(searchParams, "source") || initialFilters?.source || [],
    company: readMultiParam(searchParams, "company") || initialFilters?.company || [],
    role: readMultiParam(searchParams, "role") || initialFilters?.role || [],
    experience:
      readMultiParam(searchParams, "experience") ||
      initialFilters?.experience ||
      [],
  });
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [draftLoc, setDraftLoc] = useState<string | null>(null);
  const [draftYear, setDraftYear] = useState<number | null>(null);
  const [draftClosingSoon, setDraftClosingSoon] = useState(false);
  // Walk-in drafts. The mobile drawer edits a copy and commits on Apply, so
  // these are separate from the live `driveDate` / `driveRadiusKm`.
  const [draftDriveDate, setDraftDriveDate] = useState<WalkinDrivePeriod>("all");
  const [draftDriveRadiusKm, setDraftDriveRadiusKm] = useState<number | null>(null);
  const [driveDate, setDriveDate] = useState<WalkinDrivePeriod>(
    (searchParams?.get("driveDate") as WalkinDrivePeriod) || "all",
  );
  /**
   * Max distance for a walk-in, in km. `null` means no radius limit, which is
   * distinct from 0. Shared through the URL so a "drives near me" view is
   * linkable and survives a reload.
   */
  const [driveRadiusKm, setDriveRadiusKm] = useState<number | null>(() => {
    const raw = searchParams?.get("driveRadiusKm");
    if (!raw) return null;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 500) return null;
    return Math.round(parsed);
  });
  const [draftShowOnlySaved, setDraftShowOnlySaved] = useState(false);
  const [draftSector, setDraftSector] = useState<string | null>(null);
  const [draftQualification, setDraftQualification] = useState<string | null>(
    null,
  );
  const [draftCourse, setDraftCourse] = useState<string | null>(null);
  const [draftWorkMode, setDraftWorkMode] = useState<string[] | null>(null);
  const [draftSkills, setDraftSkills] = useState<string[]>([]);
  const [draftSource, setDraftSource] = useState<string[]>([]);
  const [draftCompany, setDraftCompany] = useState<string[]>([]);
  const [draftRole, setDraftRole] = useState<string[]>([]);
  const [draftExperience, setDraftExperience] = useState<string[]>([]);

  const [mounted, setMounted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(FEED_PAGE_SIZE);
  const replaceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * The query string the pending `replaceState` will write, stashed here rather
   * than captured in the timer closure so a timer that survives a re-render
   * still writes the newest query instead of the one current when it was armed.
   */
  const pendingQueryRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // â”€â”€ Profile â†’ URL seeding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // The profile's preferences are written into the query string, so the
  // EXISTING chip row renders them: from then on the URL is the single source
  // of truth â€” shareable, reload-stable, removable like any other filter.
  const profileSeed = useMemo(() => buildProfileFilterSeed(profile), [profile]);

  /** Fill only the slots the URL left empty; dismissed dimensions stay out. */
  const applyProfileSeeds = useCallback(() => {
    if (!profileFilterPrefs.enabled) return;
    const dismissed = new Set(profileFilterPrefs.dismissed);
    setFilters((prev) => {
      const next = { ...prev };
      let changed = false;
      if (profileSeed.location && !next.location && !dismissed.has("dim:city")) {
        next.location = profileSeed.location;
        changed = true;
      }
      if (profileSeed.year && !next.year && !dismissed.has("dim:batch")) {
        next.year = profileSeed.year;
        changed = true;
      }
      if (profileSeed.workMode?.length && !(next.workMode?.length) && !dismissed.has("dim:workMode")) {
        next.workMode = profileSeed.workMode;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [profileFilterPrefs, profileSeed]);

  /** Clear exactly the values the profile put there â€” anything the user
   * typed themselves is untouched. */
  const removeProfileSeeds = useCallback(() => {
    setFilters((prev) => {
      const next = { ...prev };
      let changed = false;
      if (profileSeed.location && next.location === profileSeed.location) {
        next.location = null;
        changed = true;
      }
      if (profileSeed.year && next.year === profileSeed.year) {
        next.year = null;
        changed = true;
      }
      if (profileSeed.workMode?.length && sameModeSet(next.workMode, profileSeed.workMode)) {
        next.workMode = null;
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [profileSeed]);

  // Seeding lifecycle: fill on mount / when the profile lands / on re-enable,
  // and clear the moment the master switch goes off.
  const prevProfileEnabledRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!mounted) return;
    const prev = prevProfileEnabledRef.current;
    const next = profileFilterPrefs.enabled;
    prevProfileEnabledRef.current = next;
    if (next) {
      // Switching back on restores every dimension, so an X'd chip has a way back.
      if (prev === false) resetProfileFilterDims();
      applyProfileSeeds();
    } else if (prev === true) {
      removeProfileSeeds();
    }
  }, [mounted, profileFilterPrefs, applyProfileSeeds, removeProfileSeeds]);

  /** Dimensions the profile currently owns â€” an X on one of these is a
   * dismissal, not just a cleared param, so reload never re-seeds it. */
  const profileOwnedDims = useMemo(() => {
    const owned: string[] = [];
    if (!profileFilterPrefs.enabled) return owned;
    if (profileSeed.location && filters.location === profileSeed.location) owned.push("city");
    if (profileSeed.year && filters.year === profileSeed.year) owned.push("batch");
    if (profileSeed.workMode?.length && sameModeSet(filters.workMode, profileSeed.workMode)) owned.push("workMode");
    return owned;
  }, [profileFilterPrefs.enabled, profileSeed, filters.location, filters.year, filters.workMode]);

  // Keep a ref to the latest searchParams so the outbound effect can read
  // the current URL without depending on searchParams reactively.
  const searchParamsRef = React.useRef(searchParams);
  useEffect(() => {
    searchParamsRef.current = searchParams;
  });

  // Sync filter state FROM URL when searchParams change (e.g. sidebar link navigation).
  // `appliedUrlSignature` is seeded with the CURRENT signature during render, not
  // in the effect. A boolean "have I parsed yet" latch cannot distinguish the
  // first pass from the StrictMode replay of the same mount (React does not
  // reset refs between them), so the replay re-parsed the URL into fresh filter
  // arrays and reset feed scroll + visible card count. Comparing the signature
  // is idempotent instead: the first pass and its replay both no-op, while a
  // real navigation still differs and syncs.
  const pathname = usePathname();
  const appliedUrlSignature = React.useRef<string | null>(urlSignature(pathname, searchParams));
  useEffect(() => {
    const sp = searchParams;
    const signature = urlSignature(pathname, sp);

    // `?job=` mirrors the open pane, so reconcile it from the URL here â€” before
    // the signature guard below, which deliberately ignores that param. Back and
    // forward navigation both arrive through this effect.
    const urlJobKey = sp?.get("job") ?? null;
    if (urlJobKey !== jobParamRef.current) {
      jobParamRef.current = urlJobKey;
      if (!urlJobKey) setSelectedOpp(null);
    }

    // useSearchParams() hands back a fresh object on every router restore, even
    // restores for the URL we are already on. Re-syncing then rebuilds all filter
    // arrays with new identities, which resets the feed scroll and the visible
    // card count. Only sync when the location actually changed.
    if (appliedUrlSignature.current === signature) return;
    appliedUrlSignature.current = signature;

    setSearch(sp?.get("q") || "");
    setGovtCategory((sp?.get("category") as GovtCategoryFilter) || null);
    setFilters({
      location: sp?.get("location") || initialFilters?.location || null,
      year: sp?.get("year")
        ? parseInt(sp.get("year")!, 10)
        : initialFilters?.year || null,
      closingSoon: sp?.get("closingSoon") === "true",
      saved: sp?.get("saved") === "true",
      sector: sp?.get("sector") || initialFilters?.sector || null,
      qualification:
        sp?.get("qualification") || initialFilters?.qualification || null,
      course: sp?.get("course") || initialFilters?.course || null,
      workMode: sp?.getAll("mode").length
        ? sp.getAll("mode").map((m) => m.toUpperCase())
        : initialFilters?.workMode || null,
      skills: readMultiParam(sp, "skills") || initialFilters?.skills || [],
      source: readMultiParam(sp, "source") || initialFilters?.source || [],
      company: readMultiParam(sp, "company") || initialFilters?.company || [],
      role: readMultiParam(sp, "role") || initialFilters?.role || [],
      experience:
        readMultiParam(sp, "experience") ||
        initialFilters?.experience ||
        [],
    });
  }, [searchParams, pathname]);

  // Reset pagination when search or filters change. `type` is folded in here
  // rather than kept in a second `[type]`-only effect: both fired on a feed
  // switch and both wrote the same value, so the second was redundant work for
  // no behavioural difference. Value comes from FEED_PAGE_SIZE, not a literal.
  useEffect(() => {
    setVisibleCount(FEED_PAGE_SIZE);
  }, [
    search,
    type,
    filters.location,
    filters.sector,
    filters.qualification,
    filters.course,
    filters.year,
    filters.closingSoon,
    filters.saved,
    filters.workMode,
    filters.skills,
    filters.source,
    filters.company,
    filters.role,
    filters.experience,
    driveDate,
    driveRadiusKm,
  ]);

  const mobileActiveCount =
    (filters.location ? 1 : 0) +
    (filters.closingSoon ? 1 : 0) +
    (filters.saved ? 1 : 0) +
    (filters.sector ? 1 : 0) +
    (filters.qualification ? 1 : 0) +
    (filters.course ? 1 : 0) +
    (filters.year ? 1 : 0) +
    (filters.workMode ? 1 : 0) +
    (filters.skills && filters.skills.length > 0 ? 1 : 0) +
    (filters.source && filters.source.length > 0 ? 1 : 0) +
    (filters.company && filters.company.length > 0 ? 1 : 0) +
    (filters.role && filters.role.length > 0 ? 1 : 0) +
    (filters.experience && filters.experience.length > 0 ? 1 : 0);

  useEffect(() => {
    if (!mounted) return;

    if (canonicalRedirect && initialFilters) {
      let canonicalCleared = false;
      if (
        initialFilters.skills &&
        initialFilters.skills.length > 0 &&
        (!filters.skills || filters.skills.length === 0)
      )
        canonicalCleared = true;
      if (initialFilters.location && !filters.location) canonicalCleared = true;
      if (initialFilters.year && !filters.year) canonicalCleared = true;
      if (
        initialFilters.workMode &&
        initialFilters.workMode.length > 0 &&
        (!filters.workMode || filters.workMode.length === 0)
      )
        canonicalCleared = true;
      if (
        initialFilters.role &&
        initialFilters.role.length > 0 &&
        (!filters.role || filters.role.length === 0)
      )
        canonicalCleared = true;

      if (canonicalCleared) {
        router.push("/jobs");
        return;
      }
    }

    const params = new URLSearchParams(
      searchParamsRef.current?.toString() || "",
    );
    let changed = false;

    const updateParam = (
      key: string,
      value: string | null | undefined | boolean | number,
    ) => {
      if (value) {
        const strValue = String(value);
        if (params.get(key) !== strValue) {
          params.set(key, strValue);
          changed = true;
        }
      } else if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    };

    updateParam("q", sanitizeSearchQuery(search) || null);
    updateParam("category", govtCategory);
    updateParam("location", filters.location);
    updateParam("year", filters.year);
    updateParam("closingSoon", filters.closingSoon);
    updateParam("driveDate", driveDate !== "all" ? driveDate : null);
    updateParam("driveRadiusKm", driveRadiusKm !== null ? String(driveRadiusKm) : null);
    updateParam("saved", filters.saved);
    updateParam("sector", filters.sector);
    updateParam("qualification", filters.qualification);
    updateParam("course", filters.course);

    if (params.has("workMode")) {
      params.delete("workMode");
      changed = true;
    } // Cleanup old param

    const currentModes = params.getAll("mode");
    const nextModes = (filters.workMode || []).map((m) => m.toLowerCase());

    // Simple array check
    if (currentModes.join(",") !== nextModes.join(",")) {
      params.delete("mode");
      nextModes.forEach((m) => params.append("mode", m));
      changed = true;
    }

    // Multi-value filters are written as repeated keys, exactly like `mode`
    // already is: no escaping ambiguity, and a comma inside a value is just data.
    const setMulti = (
      key: string,
      values: readonly string[] | null | undefined,
    ) => {
      const next = (values ?? []).filter(Boolean);
      const current = params.getAll(key);
      if (
        current.length === next.length &&
        current.every((value, index) => value === next[index])
      )
        return;
      params.delete(key);
      next.forEach((value) => params.append(key, value));
      changed = true;
    };

    setMulti("skills", filters.skills);
    setMulti("source", filters.source);
    setMulti("company", filters.company);
    setMulti("role", filters.role);
    setMulti("experience", filters.experience);

    // Board pages (canonicalRedirect && initialFilters) encode their filter in
    // the path â€” e.g. `/jobs/javascript` ~ skills=JavaScript. Final pass strips
    // any board-implied param so the URL stays canonical (no `?skills=` echo),
    // which is what caused the filter to appear duplicated on taxonomy boards.
    if (canonicalRedirect && initialFilters) {
      const stripParam = (key: string) => {
        if (params.has(key)) {
          params.delete(key);
          changed = true;
        }
      };
      if (initialFilters.skills?.length) stripParam("skills");
      if (initialFilters.location) stripParam("location");
      if (initialFilters.year != null) stripParam("year");
      if (initialFilters.workMode?.length) {
        stripParam("workMode");
        stripParam("mode");
      }
      if (initialFilters.role?.length) stripParam("role");
    }

    if (changed) {
      // The query is stashed in a ref, not captured in the closure, so a timer
      // that outlives a re-render writes the newest query rather than the one
      // that was current when it was armed.
      pendingQueryRef.current = params.toString();
      if (replaceTimerRef.current) clearTimeout(replaceTimerRef.current);
      replaceTimerRef.current = setTimeout(() => {
        replaceTimerRef.current = null;
        const pending = pendingQueryRef.current;
        pendingQueryRef.current = null;
        if (pending === null) return;
        const next = new URLSearchParams(pending);
        // The pane can open or close while this debounce is pending, so take
        // `job` from the live selection: a filter edit must neither drop it nor
        // resurrect a closed one. history.state is carried over so an open pane
        // keeps the marker that Back relies on.
        const job = jobParamRef.current;
        if (job) {
          next.set("job", job);
        } else {
          next.delete("job");
        }
        const newUrl = next.toString()
          ? `?${next.toString()}`
          : window.location.pathname;
        window.history.replaceState(window.history.state ?? null, "", newUrl);
      }, 300);
    }
  }, [
    search,
    govtCategory,
    filters.location,
    filters.year,
    filters.closingSoon,
    filters.saved,
    filters.sector,
    filters.qualification,
    filters.course,
    filters.skills,
    filters.source,
    filters.company,
    filters.role,
    filters.experience,
    filters.workMode,
    driveDate,
    driveRadiusKm,
    mounted,
  ]);

  // Unmount-only, deliberately NOT the writer effect's own cleanup. The writer
  // has a `changed` guard, so its per-run cleanup used to clear a timer that the
  // next run would only re-arm if `changed` was true again. A run where
  // `changed` was false therefore cancelled a pending write and never re-armed
  // it, silently losing that URL update. Letting the timer survive dep changes
  // makes this a real trailing debounce: the last edit before the 300ms quiet
  // period is the one that gets written, and the ref supplies the fresh value.
  useEffect(() => {
    return () => {
      if (replaceTimerRef.current) {
        clearTimeout(replaceTimerRef.current);
        replaceTimerRef.current = null;
      }
      pendingQueryRef.current = null;
    };
  }, []);

  const {
    opportunities,
    filteredOpps,
    isLoading,
    error,
    profileIncomplete,
    toggleSave,
    reload,
    submitLiveSearch,
    clearLiveSearch,
    isLiveSearching,
    isLiveResults,
    profileMismatchCount,
    hiddenProfileCount,
    profileChipCount,
    profileChipTotal,
    showHiddenProfile,
    setShowHiddenProfile,
    savedIds,
    draftBaseInputs,
  } = useOpportunitiesFeed({
    type,
    mode,
    // Live UI state, not the URL snapshot: filters.source seeds from ?source=
    // but UI edits only touch state, and the silent history.replaceState sync
    // never re-renders â€” so the URL value goes stale one edit behind. The
    // Source facet filtered nothing until reload.
    source: filters.source,
    company: filters.company,
    sort,
    selectedLoc: filters.location,
    showOnlySaved: filters.saved,
    closingSoon: filters.closingSoon,
    sector: filters.sector,
    qualification: filters.qualification,
    course: filters.course,
    selectedYear: filters.year,
    skills: filters.skills,
    roles: filters.role,
    experience: filters.experience,
    search,
    initialData,
    // The feed applies the signed-in profile preferences as visible filters â€”
    // the disclosure row in CategoryPageView accounts for what they hide.
    personalize: true,
  });

  const phaseCounts = useMemo(() => {
    if (type !== 'GOVERNMENT') return undefined;
    const counts: Partial<Record<GovtPhaseFilter, number>> = {};
    for (const [phase, statuses] of Object.entries(GOVT_PHASE_STATUSES)) {
      const key = phase as GovtPhaseFilter;
      counts[key] =
        key === "ALL"
          ? filteredOpps.length
          : filteredOpps.filter((o) => {
              const s =
                (o.governmentJobDetails as any)?.applicationStatus || "OPEN";
              return s && statuses.includes(s);
            }).length;
    }
    return counts;
  }, [filteredOpps, type]);

  const categoryCounts = useMemo(() => {
    if (type !== 'GOVERNMENT') return undefined;
    const counts: Record<string, number> = {};
    for (const { label } of GOVT_CATEGORIES) {
      counts[label] = filteredOpps.filter((o) =>
        jobMatchesCategory(o.governmentJobDetails, label),
      ).length;
    }
    return counts;
  }, [filteredOpps, type]);

  // Real feed freshness + total from the CDN bootstrap snapshot (generatedAt).
  // Shown on list pages to signal live, honest, freshly-synced listings.
  const feedUpdatedAt = initialData?.cachedAt ?? undefined;
  const feedTotal = initialData?.total ?? 0;

  const visibleOpps = useMemo(() => {
    return applyLocalFilters(filteredOpps, {
      saved: filters.saved,
      workMode: filters.workMode,
      skills: filters.skills,
      role: filters.role,
      type,
      govtPhase,
      govtCategory,
      userLocation: userLocation ?? null,
      driveDate,
      driveRadiusKm: driveRadiusKm ?? null,
    });
  }, [
    filteredOpps,
    filters.saved,
    filters.workMode,
    filters.skills,
    filters.role,
    type,
    govtPhase,
    govtCategory,
    userLocation,
    driveDate,
    driveRadiusKm,
  ]);

  useEffect(() => {
    if (!mounted) return;
    const newTitle = formatJobFeedTitle({
      type: type,
      workMode: filters.workMode,
      location: filters.location,
      skills: filters.skills,
      sector: filters.sector,
      course: filters.course,
      search: search,
      year: filters.year,
    });
    if (newTitle) {
      const count = visibleOpps.length;
      const countPrefix = count > 0 ? `${count} ` : "";
      const finalTitle = `${countPrefix}${newTitle} | FresherFlow`;

      if (document.title !== finalTitle) {
        document.title = finalTitle;
      }

      // Next.js completely replaces the <title> tag on soft navigation.
      // We MUST observe the document head to catch the replacement and enforce our dynamic title.
      const observer = new MutationObserver(() => {
        if (document.title !== finalTitle) {
          document.title = finalTitle;
        }
      });

      if (document.head) {
        observer.observe(document.head, {
          childList: true,
          subtree: true,
          characterData: true,
        });
      }

      return () => observer.disconnect();
    }
  }, [type, filters, search, mounted, searchParams, visibleOpps.length]);

  // Open the row named by `?job=<slug|id>` once the feed has loaded it, so a
  // shared or bookmarked link reproduces the same list with the same job open.
  const jobKey = searchParams?.get("job") ?? null;
  const resolvedJobRef = useRef<{ key: string; found: boolean } | null>(null);
  useEffect(() => {
    if (!jobKey || type === "GOVERNMENT" || type === "WALKIN") {
      // These pages render no detail pane, so a `job` param means nothing here.
      resolvedJobRef.current = null;
      return;
    }
    if (resolvedJobRef.current?.key === jobKey && resolvedJobRef.current.found)
      return;

    const matches = (opp: Opportunity) =>
      opp.slug === jobKey || opp.id === jobKey;
    const match = visibleOpps.find(matches) ?? opportunities.find(matches);
    if (!match) {
      // Only give up once the feed actually has rows: an empty first paint must
      // not fall back to row #1 and then jump when the real job arrives.
      if (visibleOpps.length > 0 || opportunities.length > 0) {
        resolvedJobRef.current = { key: jobKey, found: false };
      }
      return;
    }
    resolvedJobRef.current = { key: jobKey, found: true };
    if (selectedOpp?.id !== match.id) setSelectedOpp(match);
  }, [jobKey, type, visibleOpps, opportunities, selectedOpp]);

  // Keep selectedOpp in sync with visibleOpps on desktop without flashing null/skeleton (except Walkins where all pins are visible by default)
  useEffect(() => {
    if (
      isDesktop === true &&
      type !== 'GOVERNMENT' &&
      type !== 'WALKIN'
    ) {
      // A `?job=` link names the row the pane must show â€” never replace it with
      // row #1 just because that job sits outside the current filter view.
      if (jobKey && resolvedJobRef.current?.found) return;
      if (visibleOpps.length === 0) {
        setSelectedOpp(null);
      } else if (
        !selectedOpp ||
        !visibleOpps.some((o) => o.id === selectedOpp.id)
      ) {
        setSelectedOpp(visibleOpps[0]);
      }
    }
  }, [isDesktop, visibleOpps, selectedOpp, type, jobKey]);

  // Ensure selectedOpp is strictly null on government and walkin pages initially
  useEffect(() => {
    if (
      type === 'GOVERNMENT' ||
      type === 'WALKIN'
    ) {
      setSelectedOpp(null);
    }
  }, [type]);

  const isJobSaved = (opp: Opportunity) => opp.isSaved || false;
  const isJobApplied = (opp: Opportunity) =>
    !!(opp.actions && opp.actions.length > 0);

  const openMobileFilters = () => {
    setDraftLoc(filters.location);
    setDraftYear(filters.year);
    setDraftClosingSoon(filters.closingSoon);
    setDraftShowOnlySaved(filters.saved);
    setDraftSector(filters.sector);
    setDraftQualification(filters.qualification);
    setDraftCourse(filters.course);
    setDraftWorkMode(filters.workMode);
    setDraftSkills(filters.skills || []);
    setDraftSource(filters.source || []);
    setDraftCompany(filters.company || []);
    setDraftRole(filters.role || []);
    setDraftExperience(filters.experience ?? []);
    // Seed the drive drafts so the drawer opens showing what is already applied.
    setDraftDriveDate(driveDate);
    setDraftDriveRadiusKm(driveRadiusKm);
    setIsMobileFilterOpen(true);
  };

  const applyMobileFilters = () => {
    setFilters({
      location: draftLoc,
      year: draftYear,
      closingSoon: draftClosingSoon,
      saved: draftShowOnlySaved,
      sector: draftSector,
      qualification: draftQualification,
      course: draftCourse,
      workMode: draftWorkMode,
      skills: draftSkills,
      source: draftSource,
      company: draftCompany,
      role: draftRole,
      experience: draftExperience ?? [],
    });
    // Commit the walk-in drafts. Without this the drawer's When and Distance
    // sections changed the pills on screen but never filtered anything.
    setDriveDate(draftDriveDate);
    setDriveRadiusKm(draftDriveRadiusKm);
    setIsMobileFilterOpen(false);
  };

  const clearAll = () => {
    setSearch("");
    clearLiveSearch();
    setDriveDate("all");
    setDraftDriveDate("all");
    setDraftDriveRadiusKm(null);
    // The walk-in radius is a filter too. Leaving it set meant "Clear all
    // filters" still showed nothing for anyone outside the radius.
    setDriveRadiusKm(null);
    // Profile chips live in the same row as the manual ones, so "clear all"
    // clears them too â€” the switch visibly flips to Off, nothing hides.
    setProfileFiltersEnabled(false);
    setFilters({
      location: null,
      year: null,
      closingSoon: false,
      saved: false,
      sector: null,
      qualification: null,
      course: null,
      workMode: null,
      skills: [],
      source: [],
      company: [],
      role: [],
      experience: [],
    });
  };

  // Live match count for the mobile filter sheet's commit button. Runs the
  // exact applied pipeline â€” pass 1 with draft facets, profile gate, pass 2
  // with draft facets â€” so the number on the button is precisely what Apply
  // produces. Same shared predicates, zero duplication.
  const draftMatchCount = useMemo(() => {
    const base = draftBaseInputs.liveResults !== null ? draftBaseInputs.liveResults : opportunities;
    const pass1 = filterOpportunities(base, {
      showOnlySaved: draftShowOnlySaved,
      savedIds,
      sort,
      type,
      mode,
      source: draftSource,
      selectedLoc: draftLoc,
      closingSoon: draftClosingSoon,
      sector: draftSector,
      qualification: draftQualification,
      course: draftCourse,
      selectedYear: draftYear,
      skills: draftSkills,
      roles: draftRole,
      experience: draftExperience,
      company: draftCompany,
      debouncedSearch: draftBaseInputs.debouncedSearch,
      isLiveOverlay: draftBaseInputs.liveResults !== null,
    });
    const gated = applyProfileVisibility(pass1, {
      activeProfileChips: draftBaseInputs.activeProfileChips,
      layerOn: draftBaseInputs.profileLayerOn,
      showHiddenProfile: draftBaseInputs.showHiddenProfile,
    });
    return applyLocalFilters(gated, {
      saved: draftShowOnlySaved,
      workMode: draftWorkMode,
      skills: draftSkills,
      role: draftRole,
      type,
      govtPhase,
      govtCategory,
      userLocation: userLocation ?? null,
      driveDate,
    }).length;
  }, [
    opportunities,
    draftLoc,
    draftYear,
    draftClosingSoon,
    draftShowOnlySaved,
    draftSector,
    draftQualification,
    draftCourse,
    draftWorkMode,
    draftSkills,
    draftSource,
    draftCompany,
    draftRole,
    draftExperience,
    sort,
    type,
    mode,
    govtPhase,
    govtCategory,
    userLocation,
    driveDate,
    driveRadiusKm,
    savedIds,
    draftBaseInputs,
  ]);

  return {
    type,
    user,
    opportunities,
    filteredOpps,
    visibleOpps,
    isLoading,
    error,
    profileIncomplete,
    mounted,
    isDesktop,

    feedUpdatedAt,
    feedTotal,

    selectedOpp,
    handleSelectOpportunity,
    handleCloseOpportunityPane,

    search,
    setSearch,
    submitLiveSearch,
    clearLiveSearch,
    isLiveSearching,
    isLiveResults,
    filters,
    setFilters,
    govtPhase,
    setGovtPhase,
    govtCategory,
    setGovtCategory,
    phaseCounts,
    categoryCounts,

    isMobileFilterOpen,
    setIsMobileFilterOpen,
    draftLoc,
    setDraftLoc,
    draftYear,
    setDraftYear,
    draftClosingSoon,
    setDraftClosingSoon,
    draftShowOnlySaved,
    setDraftShowOnlySaved,
    draftSector,
    setDraftSector,
    draftQualification,
    setDraftQualification,
    draftCourse,
    setDraftCourse,
    draftWorkMode,
    setDraftWorkMode,
    draftSkills,
    setDraftSkills,
    draftSource,
    setDraftSource,
    draftCompany,
    setDraftCompany,
    draftRole,
    setDraftRole,
    draftExperience,
    setDraftExperience,
    mobileActiveCount,
    openMobileFilters,
    applyMobileFilters,
    clearAll,
    draftMatchCount,

    driveDate,

    setDriveDate,

    driveRadiusKm,

    setDriveRadiusKm,
    draftDriveDate,
    setDraftDriveDate,
    draftDriveRadiusKm,
    setDraftDriveRadiusKm,

    visibleCount,
    setVisibleCount,

    isJobSaved,
    isJobApplied,
    toggleSave,
    reload,
    customTitle,
    topContent,
    bottomContent,
    userLocation: userLocation ?? null,

    profileMismatchCount,
    hiddenProfileCount,
    profileChipCount,
    profileChipTotal,
    profileOwnedDims,
    showHiddenProfile,
    setShowHiddenProfile,
  };
}

export type CategoryPageState = ReturnType<typeof useCategoryPageState>;
