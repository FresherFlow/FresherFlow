"use client"
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import * as React from "react"
import { X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import { NavGroup } from "@/features/navigation/NavGroup"
import { getSidebarGroups } from "@/features/navigation/sidebar-data"
import { useNavCounts } from "@/features/navigation/useNavCounts"
import { NavUser } from "@/features/navigation/NavUser"
import { SpaceSwitcher } from "@/features/navigation/SpaceSwitcher"
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
import { SiteHeader } from "@/features/navigation/SiteHeader"
import { LogoImage } from "@/features/shell/LogoImage"
import { cn } from "@/ui/cn"
import { persistSpaceId, readSpaceId } from "@/features/navigation/sidebarState"
import {
  SPACES,
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
 * Brand block following shadcn-admin's header pattern exactly (TeamSwitcher
 * structure): a size-8 logo tile plus two-line wordmark inside a size-lg
 * menu button. No custom expanded/collapsed spans — the primitive's
 * overflow + size rules own the collapse animation, so opening/closing
 * matches the reference instead of snapping via display toggles.
 */
function SidebarBrand({ href, className }: { href: string; className?: string }) {
  return (
    <SidebarMenu className={className}>
      <SidebarMenuItem>
        <SidebarMenuButton asChild size="lg">
          <Link href={href} aria-label="FresherFlow home" suppressHydrationWarning>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-logo-bg">
              <LogoImage
                width={16}
                height={16}
                className="size-4 shrink-0 object-contain"
              />
            </div>
            <div className="grid flex-1 text-start text-sm leading-tight">
              <span className="truncate font-semibold">FresherFlow</span>
            </div>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function AppSidebarRail() {
  const router = useRouter()
  const { spaceId, setSpaceId, mounted, isAuthed, user } = useSpaceSelection()
  const navBadges = useNavCounts() ?? undefined
  const [isScrolled, setIsScrolled] = React.useState(false)

  const groups = getSidebarGroups({ spaceId, isAuthed, mounted, badges: navBadges })

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
        {groups.map((group) => (
          <NavGroup key={group.title} group={group} />
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
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
  const router = useRouter()
  const { spaceId, setSpaceId, mounted, isAuthed, user } = useSpaceSelection()
  const navBadges = useNavCounts() ?? undefined

  const groups = getSidebarGroups({ spaceId, isAuthed, mounted, badges: navBadges })

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
          {groups.map((group) => (
            <NavGroup key={group.title} group={group} />
          ))}
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
