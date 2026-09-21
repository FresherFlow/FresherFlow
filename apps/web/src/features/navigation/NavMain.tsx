"use client"

import * as React from "react"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/ui/sidebar"
import {
  isSpaceItemActive,
  type SpaceNavGroup,
  type SpaceNavItem,
} from "@/features/navigation/navConfig"

type SearchParamsLike = Pick<URLSearchParams, "get"> | null | undefined

/**
 * Nav renderer for the app sidebar (shadcn `SidebarMenu` primitives).
 *
 * Renders one `SidebarGroup` per nav group and one row per item, with active
 * state resolved from the URL (path + query) via `isSpaceItemActive`. This is
 * the single nav renderer: it replaces the row/group helpers that used to be
 * duplicated inline in `app-sidebar.tsx` and the unused stock `NavMain`.
 *
 * Deliberately flat — no `Collapsible`. Every leaf here is a real route and
 * sub-navigation is expressed as query params (`/jobs?type=internship`), so a
 * collapsible wrapper would expand to an empty submenu. The stock `NavMain`
 * did exactly that, which is where the chevrons pointing nowhere came from.
 */
export function NavMain({
  groups,
  pathname,
  searchParams,
  isAuthed,
}: {
  groups: SpaceNavGroup[]
  pathname: string
  searchParams?: SearchParamsLike
  /** Auth-gated items are filtered out for logged-out visitors. */
  isAuthed: boolean
}) {
  return (
    <>
      {groups.map((group) => {
        const items = group.items.filter(
          (item) => !(item.requiresAuth && !isAuthed)
        )
        if (items.length === 0) return null
        return (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="sidebar-expanded-only">{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {items.map((item) => (
                <NavMainRow
                  key={`${item.href}::${item.title}`}
                  item={item}
                  pathname={pathname}
                  searchParams={searchParams}
                />
              ))}
            </SidebarMenu>
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
}: {
  item: SpaceNavItem
  pathname: string
  searchParams?: SearchParamsLike
}) {
  const ItemIcon = item.icon
  const isActive = isSpaceItemActive(item, pathname, searchParams)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.title}
      >
        <Link
          href={item.href}
          aria-current={isActive ? "page" : undefined}
        >
          <ItemIcon className="size-5!" />
          <span className="sidebar-expanded-only">{item.title}</span>
        </Link>
      </SidebarMenuButton>
      {typeof item.badge === "number" && item.badge > 0 && (
        <SidebarMenuBadge className="sidebar-expanded-only">{item.badge > 99 ? "99+" : item.badge}</SidebarMenuBadge>
      )}
    </SidebarMenuItem>
  )
}
