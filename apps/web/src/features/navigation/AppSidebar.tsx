"use client"

import * as React from "react"
import { X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

import { NavMain } from "@/features/navigation/NavMain"
import { NavUser } from "@/features/navigation/NavUser"
import { SpaceSwitcher } from "@/features/navigation/SpaceSwitcher"
// @deprecated: TeamSwitcher shim — prefer SpaceSwitcher
const TeamSwitcher = SpaceSwitcher;
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
import {
  SECONDARY_GROUP,
  SPACES,
  getInitialSpace,
  getSpace,
  getSpaceForPathname,
  type SpaceId,
} from "@/features/navigation/navConfig"

/**
 * Space selection shared by the rail and the mobile tree: initial space from the
 * URL, then the user's choice wins. A space is only auto-selected when the
 * pathname itself changes (a deep link or a cross-space link), never on
 * selection.
 */
function useSpaceSelection() {
  const pathname = usePathname() || ""
  const [spaceId, setSpaceId] = React.useState<SpaceId>(() => getInitialSpace(pathname))
  const lastPathnameRef = React.useRef(pathname)

  React.useEffect(() => {
    if (lastPathnameRef.current === pathname) return
    lastPathnameRef.current = pathname
    const synced = getSpaceForPathname(pathname)
    if (synced) setSpaceId(synced)
  }, [pathname])

  const { user } = useAuth()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Before mount `isAuthed` is optimistically true, so `visibleSecondary` still
  // contains auth-gated items — callers gate on `mounted` so logged-out
  // visitors never see them flash in during hydration.
  const isAuthed = mounted ? Boolean(user) : true
  const visibleSecondary = SECONDARY_GROUP.items.filter(
    (item) => !(item.requiresAuth && !isAuthed)
  )

  return { pathname, spaceId, setSpaceId, mounted, isAuthed, visibleSecondary, user }
}

/**
 * Brand block at the top of the sidebar, restoring the past layout where the
 * logo sits above the Jobs / Govt switcher. In collapsed (icon) mode only the
 * logo tile shows. Logo links to the dashboard for signed-in users, home for
 * everyone else.
 */
function SidebarBrand({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      aria-label="FresherFlow home"
      suppressHydrationWarning
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-md px-1 py-1.5 transition-opacity hover:opacity-85",
        className
      )}
    >
      <LogoImage width={28} height={28} className="h-7 w-7 shrink-0 object-contain" />
      <span className="truncate text-base font-semibold tracking-tight group-data-[state=collapsed]:hidden">
        FresherFlow
      </span>
    </Link>
  )
}

function AppSidebarRail() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { pathname, spaceId, setSpaceId, mounted, isAuthed, visibleSecondary, user } =
    useSpaceSelection()
  const space = getSpace(spaceId)

  const logoHref = mounted && user ? "/dashboard" : "/"

  // Switching space is a navigation: the page must follow the switcher.
  const handleSpaceChange = (id: SpaceId) => {
    setSpaceId(id)
    router.push(id === "govt" ? "/govt" : "/jobs")
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="gap-3">
        <SidebarBrand href={logoHref} />
        <div className="pt-1">
          <TeamSwitcher spaces={SPACES} activeId={spaceId} onChange={handleSpaceChange} />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          groups={space.groups}
          pathname={pathname}
          searchParams={searchParams}
          isAuthed={isAuthed}
        />
        {/* Auth-gated group renders only after mount so logged-out visitors
            never see Saved / Tracker / Account flash on reload. */}
        {mounted && visibleSecondary.length > 0 && (
          <NavMain
            groups={[{ ...SECONDARY_GROUP, items: visibleSecondary }]}
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
  const { pathname, spaceId, setSpaceId, mounted, isAuthed, visibleSecondary, user } =
    useSpaceSelection()
  const space = getSpace(spaceId)

  const logoHref = mounted && user ? "/dashboard" : "/"

  const handleSpaceChange = (id: SpaceId) => {
    setSpaceId(id)
    onNavigate()
    router.push(id === "govt" ? "/govt" : "/jobs")
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 shrink-0 items-center justify-end border-b border-sidebar-border px-4">
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
        <TeamSwitcher spaces={SPACES} activeId={spaceId} onChange={handleSpaceChange} />
        {/* Every nav row is a link, so any click in here is a navigation and
            should close the Sheet. */}
        <div className="mt-2" onClickCapture={onNavigate}>
          <NavMain
            groups={space.groups}
            pathname={pathname}
            searchParams={searchParams}
            isAuthed={isAuthed}
          />
          {mounted && visibleSecondary.length > 0 && (
            <NavMain
              groups={[{ ...SECONDARY_GROUP, items: visibleSecondary }]}
              pathname={pathname}
              searchParams={searchParams}
              isAuthed={isAuthed}
            />
          )}
        </div>
      </div>
      <div className="shrink-0 border-t border-sidebar-border p-2">
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
