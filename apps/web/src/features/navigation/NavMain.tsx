"use client"
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import * as React from "react"
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
 * state resolved from the URL (path + query) via `isSpaceItemActive`. Groups
 * with `collapsible: true` render as shadcn Collapsible (like Platform /
 * Playground / Models / Documentation / Settings in sidebar-07 nav-main.tsx)
 * with a ChevronRight that rotates `group-data-[state=open]/collapsible:rotate-90`.
 * Flat groups stay plain. Jobs and Govt stay separate spaces via SpaceSwitcher —
 * collapsibles only toggle within a space, they never merge spaces.
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

        // Collapsible groups — shadcn Platform/Playground pattern (nav-main.tsx:40)
        // group-data-[state=open]/collapsible:rotate-90 drives the chevron.
        // defaultOpen: explicit flag, or auto-open if any child is active (like sidebar-07 nav-main defaultOpen={item.isActive})
        if (group.collapsible) {
          const hasActiveChild = items.some((item) =>
            isSpaceItemActive(item, pathname, searchParams)
          )
          const defaultOpen = group.defaultOpen ?? hasActiveChild
          return (
            <Collapsible
              key={group.label}
              defaultOpen={defaultOpen}
              className="group/collapsible"
            >
              <SidebarGroup>
                <SidebarGroupLabel
                  asChild
                  className="group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <CollapsibleTrigger className="flex w-full items-center rounded-md">
                    <span className="sidebar-expanded-only">{group.label}</span>
                    <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90 sidebar-expanded-only" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent className="mt-2">
                  <SidebarGroupContent>
                    <SidebarMenu className="gap-1">
                      {items.map((item) => (
                        <NavMainRow
                          key={`${item.href}::${item.title}`}
                          item={item}
                          pathname={pathname}
                          searchParams={searchParams}
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
