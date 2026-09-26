"use client"
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import * as React from "react"
import { X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { NavMain } from "@/features/navigation/NavMain"
import { useNavCounts } from "@/features/navigation/useNavCounts"
import { NavUser } from "@/features/navigation/NavUser"
import { SpaceSwitcher } from "@/features/navigation/SpaceSwitcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/ui/sidebar"
import { useAuth } from "@/lib/auth/AuthContext"
import { SiteHeader } from "@/features/navigation/SiteHeader"
import { LogoImage } from "@/features/shell/LogoImage"
import { cn } from "@/ui/cn"
import { persistSpaceId, readSpaceId } from "@/features/navigation/sidebarState"
import {
  COMMUNITY_GROUP,
  PERSONAL_GROUP,
  SPACES,
  getSpace,
  getSpaceForPathname,
  type SpaceId,
} from "@/features/navigation/navConfig"

/**
 * Last space the user was actually looking at. Module-level on purpose: the
 * rail and the mobile drawer tree each mount their own `useSpaceSelection`,
 * and `Navbar` swaps between `AppSidebar` and `DesktopNav` on navigation, so
 * the choice has to survive remounts.
 */
let rememberedSpace: SpaceId | null = null;

/**
 * Space selection shared by the rail and the mobile tree: the route owns the
 * space when it maps to one (deep link or cross-space link), otherwise the
 * user's remembered choice wins. Never inferred from a non-space route.
 */
function useSpaceSelection() {
  const pathname = usePathname() || ""
  const [spaceId, setSpaceIdState] = React.useState<SpaceId>(
    () => getSpaceForPathname(pathname) ?? rememberedSpace ?? "jobs"
  )
  const lastPathnameRef = React.useRef(pathname)

  const setSpaceId = React.useCallback((next: SpaceId) => {
    rememberedSpace = next
    setSpaceIdState(next)
  }, [])

  React.useEffect(() => {
    if (lastPathnameRef.current !== pathname) {
      lastPathnameRef.current = pathname
      const synced = getSpaceForPathname(pathname)
      if (synced) setSpaceId(synced)
    }
    // Remember every space-owned route (deep links included) so a remount
    // on a space-neutral route can restore it below.
    const owned = getSpaceForPathname(pathname)
    if (owned) persistSpaceId(owned)
  }, [pathname])

  // Cross-group navigation (`(public)` ↔ `(user)`) remounts the sidebar and
  // re-runs the initializer above — space-neutral routes like `/account`
  // always initialize to Jobs. Restore the remembered space instead.
  // `setSpaceId` is a plain setter, not a `useState` updater, so the
  // no-op check compares against the current value in scope.
  React.useEffect(() => {
    if (getSpaceForPathname(pathname)) return
    const stored = readSpaceId()
    if (stored && stored !== spaceId) setSpaceId(stored)
  }, [pathname, spaceId, setSpaceId])

  const { user } = useAuth()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Before mount `isAuthed` is optimistically true, so `visibleSecondary` still
  // contains auth-gated items — callers gate on `mounted` so logged-out
  // visitors never see them flash in during hydration.
  const isAuthed = mounted ? Boolean(user) : true
  const visiblePersonal = PERSONAL_GROUP.items.filter(
    (item) => !(item.requiresAuth && !isAuthed)
  )
  const visibleCommunity = COMMUNITY_GROUP.items.filter(
    (item) => !(item.requiresAuth && !isAuthed)
  )

  return { pathname, spaceId, setSpaceId, mounted, isAuthed, visiblePersonal, visibleCommunity, user }
}

/**
 * Brand block at the top of the sidebar, restoring the past layout where the
 * logo sits above the Jobs / Govt switcher. A plain link like open-seo's
 * brand — deliberately not a `SidebarMenuButton`, whose menu chrome
 * (`focus-visible:ring-1`, truncation pressure, tight tracking) made the
 * wordmark render ringed and cramped instead of instantly readable.
 * In collapsed (icon) mode only the logo tile shows.
 */
function SidebarBrand({ href, className }: { href: string; className?: string }) {
  return (
    <div
      className={cn(
        "sidebar-brand flex h-9 items-center px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0",
        className
      )}
    >
      <Link
        href={href}
        aria-label="FresherFlow home"
        suppressHydrationWarning
        className="min-w-0 flex-1 truncate text-base font-semibold text-sidebar-foreground outline-none hover:text-sidebar-foreground focus:outline-none focus-visible:outline-none"
      >
        <span className="sidebar-expanded-only">FresherFlow</span>
        <span className="sidebar-collapsed-only flex items-center justify-center">
          <LogoImage
            width={24}
            height={24}
            className="h-6 w-6 shrink-0 object-contain"
          />
        </span>
      </Link>
    </div>
  )
}

function AppSidebarRail() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { pathname, spaceId, setSpaceId, mounted, isAuthed, visiblePersonal, visibleCommunity, user } =
    useSpaceSelection()
  const space = getSpace(spaceId)
  const navCounts = useNavCounts()
  const navBadges = navCounts !== null ? { '/jobs': navCounts } : undefined
  const [isScrolled, setIsScrolled] = React.useState(false)

  const logoHref = mounted && user ? "/jobs?tab=for-you" : "/"

  // Switching space is a navigation: the page must follow the switcher.
  const handleSpaceChange = (id: SpaceId) => {
    setSpaceId(id)
    router.push(id === "govt" ? "/govt" : "/jobs")
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader
        className={cn(
          "sticky top-0 z-10 gap-1.5 bg-background p-2 relative",
          "border-b border-transparent transition-colors",
          isScrolled && "border-border"
        )}
      >
        <SidebarBrand href={logoHref} />
        <SpaceSwitcher spaces={SPACES} activeId={spaceId} onChange={handleSpaceChange} />
      </SidebarHeader>
      <SidebarContent
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 2)}
      >
        <NavMain
          groups={space.groups}
          pathname={pathname}
          searchParams={searchParams}
          isAuthed={isAuthed}
          badges={navBadges}
        />
        {/* Auth-gated group renders only after mount so logged-out visitors
            never see Saved / Tracker / Account flash on reload. */}
        {mounted && visibleCommunity.length > 0 && (
          <NavMain
            groups={[{ ...COMMUNITY_GROUP, items: visibleCommunity }]}
            pathname={pathname}
            searchParams={searchParams}
            isAuthed={isAuthed}
          />
        )}
        {mounted && visiblePersonal.length > 0 && (
          <NavMain
            groups={[{ ...PERSONAL_GROUP, items: visiblePersonal }]}
            pathname={pathname}
            searchParams={searchParams}
            isAuthed={isAuthed}
          />
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/**
 * Nav tree for the mobile drawer rendered by MobileTopNav.
 *
 * Same spaces, groups and footer as the rail, inside a Sheet instead of the
 * rail. It relies on the shell's single `SidebarProvider` (NavigationWrapper)
 * and must not create one.
 */
export function MobileNavTree({ onNavigate }: { onNavigate: () => void }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { pathname, spaceId, setSpaceId, mounted, isAuthed, visiblePersonal, visibleCommunity, user } =
    useSpaceSelection()
  const space = getSpace(spaceId)
  const navCounts = useNavCounts()
  const navBadges = navCounts !== null ? { '/jobs': navCounts } : undefined

  const logoHref = mounted && user ? "/jobs?tab=for-you" : "/"

  const handleSpaceChange = (id: SpaceId) => {
    setSpaceId(id)
    onNavigate()
    router.push(id === "govt" ? "/govt" : "/jobs")
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center justify-end border-b border-border px-4">
        <button
          type="button"
          onClick={onNavigate}
          aria-label="Close menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <SidebarBrand href={logoHref} className="mb-1" />
        <SpaceSwitcher spaces={SPACES} activeId={spaceId} onChange={handleSpaceChange} />
        {/* Every nav row is a link, so any click in here is a navigation and
            should close the Sheet. */}
        <div className="mt-2" onClickCapture={onNavigate}>
          <NavMain
            groups={space.groups}
            pathname={pathname}
            searchParams={searchParams}
            isAuthed={isAuthed}
            badges={navBadges}
          />
          {mounted && visibleCommunity.length > 0 && (
            <NavMain
              groups={[{ ...COMMUNITY_GROUP, items: visibleCommunity }]}
              pathname={pathname}
              searchParams={searchParams}
              isAuthed={isAuthed}
            />
          )}
          {mounted && visiblePersonal.length > 0 && (
            <NavMain
              groups={[{ ...PERSONAL_GROUP, items: visiblePersonal }]}
              pathname={pathname}
              searchParams={searchParams}
              isAuthed={isAuthed}
            />
          )}
        </div>
      </div>
      <div className="shrink-0 border-t border-border p-2">
        <NavUser />
      </div>
    </div>
  )
}

/**
 * Desktop rail for user-facing routes.
 *
 * The `SidebarProvider` lives in NavigationWrapper, not here: the mobile drawer
 * trigger lives in MobileTopNav, so both need the same provider. Collapse state
 * is the existing `ff:sidebarCollapsed` / `sidebar_state` store, and layout
 * width stays `12rem ↔ 3rem` via `--sidebar-w`.
 *
 * The rail is wrapped in `hidden lg:block` to match the `lg:pl-[var(--sidebar-w)]`
 * content offset in NavigationWrapper — without it the rail renders from `md`
 * up and overlaps the content between 768px and 1024px.
 */
export function AppSidebar() {
  return (
    <>
      <div className="hidden lg:block">
        <React.Suspense fallback={null}>
          <AppSidebarRail />
        </React.Suspense>
      </div>
      <SiteHeader />
    </>
  )
}
