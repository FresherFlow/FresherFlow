"use client"
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import Link from "next/link"

import { ChevronRight } from "lucide-react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/Collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
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
 */

const navGroupLabelClass =
  "px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-foreground/50 sidebar-expanded-only"

function visibleItems(group: SpaceNavGroup, isAuthed: boolean): SpaceNavItem[] {
  return group.items.filter((item) => !(item.requiresAuth && !isAuthed))
}

/** Path-only ownership: ignores query params, so `/jobs?type=contract`
 *  still belongs to the group holding `/jobs` even when no row is active. */
function ownsPath(href: string, pathname: string): boolean {
  const path = href.split("?")[0]
  return pathname === path || (path !== "/" && pathname.startsWith(path + "/"))
}

function isGroupActive(
  items: SpaceNavItem[],
  pathname: string,
  searchParams?: SearchParamsLike
): boolean {
  return items.some((item) => isSpaceItemActive(item, pathname, searchParams))
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
  // At most the active group is open — except when nothing on the page
  // matches a row (e.g. `/jobs?type=contract`), in which case the group
  // owning the pathname opens so the user still sees where they are
  // instead of all-closed headers.
  const states = groups
    .map((group) => ({ group, items: visibleItems(group, isAuthed) }))
    .filter((s) => s.items.length > 0)
  const anyActive = states.some((s) =>
    isGroupActive(s.items, pathname, searchParams)
  )

  return (
    <>
      {states.map(({ group, items }) => {
        if (group.collapsible) {
          const hasActiveChild = isGroupActive(items, pathname, searchParams)
          const fallbackOpen =
            !anyActive &&
            items.some((item) => ownsPath(item.href, pathname))
          const defaultOpen = group.defaultOpen ?? (hasActiveChild || fallbackOpen)
          return (
            <Collapsible
              key={group.label}
              defaultOpen={defaultOpen}
              className="group/collapsible"
            >
              <SidebarGroup className="mb-1 p-0 px-2">
                <SidebarGroupLabel
                  asChild
                  className="h-auto bg-transparent p-0 hover:bg-transparent"
                >
                  <CollapsibleTrigger
                    className={cn(navGroupLabelClass, "flex w-full items-center rounded-md hover:text-foreground")}
                  >
                    <span className="sidebar-expanded-only">{group.label}</span>
                    <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90 sidebar-expanded-only" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-0">
                      {items.map((item) => (
                        <NavMainRow
                          key={`${item.href}::${item.title}`}
                          item={item}
                          pathname={pathname}
                          searchParams={searchParams}
                          badges={badges}
                        />
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )
        }

        return (
          <SidebarGroup key={group.label} className="mb-1 p-0 px-2">
            <SidebarGroupLabel className="h-auto bg-transparent p-0">
              <span className={cn(navGroupLabelClass, "block")}>{group.label}</span>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0">
                {items.map((item) => (
                  <NavMainRow
                    key={`${item.href}::${item.title}`}
                    item={item}
                    pathname={pathname}
                    searchParams={searchParams}
                    badges={badges}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )
      })}
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
        className="relative hover:bg-muted active:bg-muted data-[active=true]:bg-muted dark:text-foreground/70"
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
        <SidebarMenuBadge data-nav-badge>{badge > 99 ? "99+" : badge}</SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  )
}
