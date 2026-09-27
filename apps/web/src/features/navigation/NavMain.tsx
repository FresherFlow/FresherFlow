"use client"
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import { useEffect, useState } from "react"
import Link from "next/link"

import { ChevronRight } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/Collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/DropdownMenu"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/ui/sidebar"
import { cn } from "@/ui/cn"
import {
  isSpaceItemActive,
  type SpaceNavGroup,
  type SpaceNavItem,
} from "@/features/navigation/navConfig"

type SearchParamsLike = Pick<URLSearchParams, "get"> | null | undefined

/**
 * Nav renderer for the app sidebar: stock shadcn primitives, nothing more.
 * Rows are plain `SidebarMenuButton` (`isActive` + `tooltip`) with `size-4`
 * icons and a 3px active indicator bar — collapse, tooltips, icon sizing,
 * and truncation stay the primitive's job. Group labels carry the only
 * calm override (uppercase muted). No JS branching on sidebar state, so
 * this is hydration-safe by construction.
 *
 * An item with `items` renders as a collapsible parent (`NavMainParent`) —
 * the shadcn-admin `NavCollapsible` / admin `Discovery Engine` shape: the row
 * opens a `SidebarMenuSub`, or a `DropdownMenu` when the rail is collapsed to
 * icons.
 */

const navGroupLabelClass =
  "px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-foreground/50 sidebar-expanded-only"

const navRowClass =
  "relative hover:bg-muted active:bg-muted data-[active=true]:bg-muted dark:text-foreground/70"

function visibleItems(group: SpaceNavGroup, isAuthed: boolean): SpaceNavItem[] {
  return group.items.filter((item) => !(item.requiresAuth && !isAuthed))
}

export function NavMain({
  groups,
  pathname,
  searchParams,
  isAuthed,
  badges,
}: {
  groups: SpaceNavGroup[]
  pathname: string
  searchParams?: SearchParamsLike
  /** Auth-gated items are filtered out for logged-out visitors. */
  isAuthed: boolean
  /** Live counts keyed by item href (e.g. { '/jobs': 1284 }). Overrides static badge. */
  badges?: Record<string, number>
}) {
  const states = groups
    .map((group) => ({ group, items: visibleItems(group, isAuthed) }))
    .filter((s) => s.items.length > 0)

  const renderItem = (item: SpaceNavItem) =>
    item.items ? (
      <NavMainParent
        key={`${item.title}::group`}
        item={item}
        pathname={pathname}
        searchParams={searchParams}
        badges={badges}
      />
    ) : (
      <NavMainRow
        key={`${item.href}::${item.title}`}
        item={item}
        pathname={pathname}
        searchParams={searchParams}
        badges={badges}
      />
    )

  return (
    <>
      {states.map(({ group, items }) => (
        <SidebarGroup key={group.label} className="mb-1 p-0 px-2">
          <SidebarGroupLabel className="h-auto bg-transparent p-0">
            <span className={cn(navGroupLabelClass, "block")}>{group.label}</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">{items.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}

function NavMainRow({
  item,
  pathname,
  searchParams,
  badges,
}: {
  item: SpaceNavItem
  pathname: string
  searchParams?: SearchParamsLike
  badges?: Record<string, number>
}) {
  const ItemIcon = item.icon
  const isActive = isSpaceItemActive(item, pathname, searchParams)
  const badge = badges?.[item.href] ?? item.badge

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
        className={navRowClass}
      >
        <Link href={item.href} aria-current={isActive ? "page" : undefined}>
          {isActive ? (
            <div
              data-nav-active-bar
              className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-primary group-data-[collapsible=icon]:hidden"
            />
          ) : null}
          <ItemIcon className="size-[22px]!" />
          <span className="sidebar-expanded-only">{item.title}</span>
        </Link>
      </SidebarMenuButton>
      {typeof badge === "number" && badge > 0 && (
        <SidebarMenuBadge data-nav-badge>{badge.toLocaleString('en-IN')}</SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  )
}

/**
 * Collapsible parent row. The trigger never navigates — it toggles the
 * submenu, exactly like the reference's `SidebarMenuCollapsible`. Its
 * `isActive` follows whichever child is active, so the parent stays
 * highlighted while a child route is open.
 */
function NavMainParent({
  item,
  pathname,
  searchParams,
  badges,
}: {
  item: SpaceNavItem
  pathname: string
  searchParams?: SearchParamsLike
  badges?: Record<string, number>
}) {
  const { state, isMobile } = useSidebar()
  const ParentIcon = item.icon
  const children = item.items ?? []
  const hasActiveChild = children.some((sub) =>
    isSpaceItemActive(sub, pathname, searchParams)
  )

  // Controlled, not `defaultOpen`: `defaultOpen` is read once on mount, so a
  // route change left the submenu shut with the active row hidden.
  const [open, setOpen] = useState(hasActiveChild)
  useEffect(() => {
    if (hasActiveChild) setOpen(true)
  }, [hasActiveChild])

  if (state === "collapsed" && !isMobile) {
    return (
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton tooltip={item.title} isActive={hasActiveChild}>
              <ParentIcon className="size-[22px]!" />
              <span className="sidebar-expanded-only">{item.title}</span>
              <ChevronRight className="ml-auto size-4 sidebar-expanded-only" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" sideOffset={4}>
            <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {children.map((sub) => {
              const SubIcon = sub.icon
              return (
                <DropdownMenuItem key={`${sub.href}::${sub.title}`} asChild>
                  <Link
                    href={sub.href}
                    className={cn(
                      isSpaceItemActive(sub, pathname, searchParams) && "bg-secondary"
                    )}
                  >
                    <SubIcon className="size-4 shrink-0" />
                    <span>{sub.title}</span>
                  </Link>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    )
  }

  return (
    <Collapsible asChild open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={item.title}
            isActive={hasActiveChild}
            className={navRowClass}
          >
            <ParentIcon className="size-[22px]!" />
            <span className="sidebar-expanded-only">{item.title}</span>
            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 sidebar-expanded-only" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {children.map((sub) => (
              <NavMainSubRow
                key={`${sub.href}::${sub.title}`}
                item={sub}
                pathname={pathname}
                searchParams={searchParams}
                badges={badges}
              />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

function NavMainSubRow({
  item,
  pathname,
  searchParams,
  badges,
}: {
  item: SpaceNavItem
  pathname: string
  searchParams?: SearchParamsLike
  badges?: Record<string, number>
}) {
  const SubIcon = item.icon
  const isActive = isSpaceItemActive(item, pathname, searchParams)
  const badge = badges?.[item.href] ?? item.badge

  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton asChild isActive={isActive}>
        <Link href={item.href} aria-current={isActive ? "page" : undefined}>
          <SubIcon />
          <span>{item.title}</span>
          {typeof badge === "number" && badge > 0 && (
            <span className="ms-auto text-xs tabular-nums">
              {badge.toLocaleString('en-IN')}
            </span>
          )}
        </Link>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  )
}
