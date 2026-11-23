"use client"
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { NavGroup } from "@/features/navigation/NavGroup"
import { LogoImage } from "@/features/shell/LogoImage"
import { getNavGroups, isDocsPath } from "@/features/navigation/sidebar-data"
import { useNavCounts } from "@/features/navigation/useNavCounts"
import { NavUser } from "@/features/navigation/NavUser"
import { SpaceSwitcher } from "@/features/navigation/SpaceSwitcher"
import { ThemeSwitcher } from "@/ui/ThemeSwitcher"
import { ArrowLeft, Moon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/ui/sidebar"
import { useAuth } from "@/lib/auth/AuthContext"
import { cn } from "@/ui/cn"
import { persistSpaceId, readSpaceId } from "@/features/navigation/sidebarState"
import { useAppLayout } from "@/features/navigation/AppLayoutProvider"
import {
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

  // Before mount `isAuthed` is optimistically true, so auth-gated items are
  // still present — callers gate secondary groups on `mounted` (via
  // `getSidebarGroups`) so logged-out visitors never see them flash in.
  const isAuthed = mounted ? Boolean(user) : true

  return { pathname, spaceId, setSpaceId, mounted, isAuthed, user }
}

/**
 * Docs footer shared by the desktop rail and the mobile drawer. Keeping one
 * definition matters because the rail is hidden below `lg`: a footer added to
 * only one tree leaves mobile docs visitors with no way back to the site.
 */
function DocsFooter() {
  const { setOpenMobile } = useSidebar()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="Back to site">
          <Link href="/" onClick={() => setOpenMobile(false)}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            <span>Back to site</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <SidebarMenuItem>
        <ThemeSwitcher className="w-full">
          <SidebarMenuButton>
            <Moon className="size-4 opacity-70" aria-hidden="true" />
            <span>Theme</span>
          </SidebarMenuButton>
        </ThemeSwitcher>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function AppSidebarRail() {
  const router = useRouter()
  const { spaceId, setSpaceId, mounted, isAuthed } = useSpaceSelection()
  const navBadges = useNavCounts() ?? undefined
  const { variant, collapsible } = useAppLayout()
  const [isScrolled, setIsScrolled] = React.useState(false)

  const pathname = usePathname() || ""
  const groups = getNavGroups(pathname, { spaceId, isAuthed, mounted, badges: navBadges })

  // Switching space is a navigation: the page must follow the switcher, and
  // each space navigates to its own `homeHref`.
  const handleSpaceChange = (id: SpaceId) => {
    setSpaceId(id)
    router.push(getSpace(id).homeHref)
  }

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      {/*
        One header row. The header used to render `SidebarBrand` AND
        `SpaceSwitcher`; collapsed, both became 32px tiles and stacked, so the
        logo and the switcher appeared at two positions instead of one. The
        switcher now carries the logo, matching `AdminSidebar` and the
        reference `TeamSwitcher` (one button: tile, name, chevron).
      */}
      <SidebarHeader
        className={cn(
          "sticky top-0 z-10 gap-1.5 bg-sidebar/95 p-2 backdrop-blur-sm supports-[backdrop-filter]:bg-sidebar/80 relative",
          "border-b border-transparent transition-colors",
          isScrolled && "border-sidebar-border"
        )}
      >
        {/* One header row, the reference `TeamSwitcher` shape and the same as
            `AdminSidebar`: a single button holding a logo tile, the active
            space name and a chevron. The header used to render `SidebarBrand`
            AND `SpaceSwitcher` as two rows, so a collapsed rail stacked two
            tiles (white logo, then black space icon) at two offsets — the
            "logo and switcher in different positions" bug. Passing `logo`
            folds the brand into the switcher, so there is one row and one tile. */}
        {isDocsPath(pathname) ? (
          <Link
            href="/docs"
            className="flex h-8 items-center gap-2 rounded-md px-1 text-sm font-semibold text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <LogoImage width={24} height={24} className="size-6 shrink-0 object-contain" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-sidebar-foreground">FresherFlow</span>
              <span className="text-micro text-muted-foreground">Documentation</span>
            </span>
          </Link>
        ) : (
          <SpaceSwitcher
            spaces={SPACES}
            activeId={spaceId}
            onChange={handleSpaceChange}
            logo
          />
        )}
      </SidebarHeader>
      <SidebarContent
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 2)}
      >
        {groups.map((group) => (
          <NavGroup key={group.title} group={group} />
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border px-2 pb-1 pt-1">
        {isDocsPath(pathname) ? <DocsFooter /> : <NavUser />}
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
  const router = useRouter()
  const { spaceId, setSpaceId, mounted, isAuthed } = useSpaceSelection()
  const navBadges = useNavCounts() ?? undefined

  const pathname = usePathname() || ""
  const groups = getNavGroups(pathname, { spaceId, isAuthed, mounted, badges: navBadges })

  const handleSpaceChange = (id: SpaceId) => {
    setSpaceId(id)
    onNavigate()
    router.push(getSpace(id).homeHref)
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div className="flex-1 overflow-y-auto px-2 py-3">
        {/* Same single-row header as the rail: the switcher carries the logo. */}
        {isDocsPath(pathname) ? (
          <Link
            href="/docs"
            className="flex h-8 items-center gap-2 rounded-md px-1 text-sm font-semibold text-sidebar-foreground"
          >
            <LogoImage width={24} height={24} className="size-6 shrink-0 object-contain" />
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold text-sidebar-foreground">FresherFlow</span>
              <span className="text-micro text-muted-foreground">Documentation</span>
            </span>
          </Link>
        ) : (
          <SpaceSwitcher
            spaces={SPACES}
            activeId={spaceId}
            onChange={handleSpaceChange}
            logo
          />
        )}
        {/* Close on link clicks only: collapsible parents expand in place
            via chevron and must NOT dismiss the drawer. */}
        <div
          className="mt-2"
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest('a')) onNavigate()
          }}
        >
          {groups.map((group) => (
            <NavGroup key={group.title} group={group} />
          ))}
        </div>
      </div>
      <div className="shrink-0 border-t border-sidebar-border p-2">
        {isDocsPath(pathname) ? (
          <DocsFooter />
        ) : (
          <>
            <NavUser />
            <ThemeSwitcher className="w-full">
              <button
                type="button"
                className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground transition-colors duration-150 ease-out hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Moon className="size-4 shrink-0 opacity-70" aria-hidden="true" />
                <span className="flex-1 text-left">Theme</span>
              </button>
            </ThemeSwitcher>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Desktop rail for user-facing routes.
 *
 * The `SidebarProvider` lives in NavigationWrapper, not here: the mobile drawer
 * trigger lives in MobileTopNav, so both need the same provider. Collapse
 * open state is the existing `ff:sidebarCollapsed` / `sidebar_state` store;
 * variant + collapse mode come from `AppLayoutProvider` (same level as the
 * `SidebarProvider`), and layout width is `SIDEBAR_WIDTH.default ↔ 3rem` via
 * `--sidebar-w` — draggable between `SIDEBAR_WIDTH.min` and `max` on the rail.
 *
 * The rail is wrapped in `hidden lg:block` to match the `lg:pl-[var(--sidebar-w)]`
 * content offset in NavigationWrapper — without it the rail renders from `md`
 * up and overlaps the content between 768px and 1024px.
 */
export function AppSidebar() {
  return (
    <div className="hidden lg:block">
      <React.Suspense fallback={null}>
        <AppSidebarRail />
      </React.Suspense>
    </div>
  )
}
