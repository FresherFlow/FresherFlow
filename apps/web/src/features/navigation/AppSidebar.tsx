"use client"
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

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
  COMMUNITY_GROUP,
  PERSONAL_GROUP,
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
 * logo sits above the Jobs / Govt switcher. In collapsed (icon) mode only the
 * logo tile shows. Logo links to the dashboard for signed-in users, home for
 * everyone else.
 */
function SidebarBrand({ href, className }: { href: string; className?: string }) {
  return (
    <SidebarMenu className={cn(className)}>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          size="lg"
          className="h-9 justify-start px-2 hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <Link href={href} aria-label="FresherFlow home" suppressHydrationWarning>
            <span className="sidebar-expanded-only truncate text-[20px] font-low tracking-tight leading-none">
              FresherFlow
            </span>
            <span className="sidebar-collapsed-only flex items-center justify-center">
              <LogoImage
                width={24}
                height={24}
                className="h-6 w-6 shrink-0 object-contain"
              />
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function AppSidebarRail() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { pathname, spaceId, setSpaceId, mounted, isAuthed, visiblePersonal, visibleCommunity, user } =
    useSpaceSelection()
  const space = getSpace(spaceId)
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
          "sticky top-0 z-10 gap-1.5 bg-sidebar/95 p-2 backdrop-blur-sm supports-[backdrop-filter]:bg-sidebar/80 relative",
          "border-b border-transparent transition-colors",
          isScrolled && "border-sidebar-border shadow-[0_4px_12px_-4px_rgb(0_0_0/0.12)]"
        )}
      >
        <SidebarBrand href={logoHref} />
        <TeamSwitcher spaces={SPACES} activeId={spaceId} onChange={handleSpaceChange} />
        {/* blur fade so scrolled items feel going under header */}
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 -bottom-3 h-3 bg-gradient-to-b from-sidebar to-transparent opacity-0 transition-opacity",
            isScrolled && "opacity-100"
          )}
        />
      </SidebarHeader>
      <SidebarContent
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 2)}
      >
        <NavMain
          groups={space.groups}
          pathname={pathname}
          searchParams={searchParams}
          isAuthed={isAuthed}
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

  const logoHref = mounted && user ? "/jobs?tab=for-you" : "/"

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
