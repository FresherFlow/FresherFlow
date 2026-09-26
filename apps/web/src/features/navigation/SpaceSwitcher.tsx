"use client"
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/ui/DropdownMenu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/ui/sidebar"
import type { Space, SpaceId } from "@/features/navigation/navConfig"

/**
 * (name + subtitle + `ChevronsUpDown` switch affordance) with the panel
 * dropping down below it, instead of an icon tile + text whose menu flew
 * out to the side. No colored icon tile, so there is no blue tile in
 * dark mode. Data and `onChange` navigation contract are unchanged.
 */
export function SpaceSwitcher({
  spaces,
  activeId,
  onChange,
}: {
  spaces: Space[]
  activeId: SpaceId
  onChange: (id: SpaceId) => void
}) {
  const activeSpace = spaces.find((space) => space.id === activeId) ?? spaces[0]

  if (!activeSpace) {
    return null
  }

  const ActiveIcon = activeSpace.icon

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              suppressHydrationWarning
              size="lg"
              className="nav-switcher-btn h-auto rounded-lg border border-border bg-card px-3 py-1.5 hover:bg-muted hover:text-foreground active:bg-muted data-[state=open]:bg-muted data-[state=open]:text-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent"
            >
              <div className="sidebar-expanded-only flex aspect-square size-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-foreground">
                <ActiveIcon className="size-3.5 shrink-0" aria-hidden />
              </div>
              <div className="sidebar-expanded-only grid flex-1 text-left leading-tight">
                <span className="truncate text-sm font-medium">{activeSpace.name}</span>
                <span className="truncate text-xs text-foreground/60">{activeSpace.subtitle}</span>
              </div>
              <ChevronsUpDown className="sidebar-expanded-only ml-auto size-3.5 shrink-0 text-foreground/50" />
              <span className="sidebar-collapsed-only flex items-center justify-center text-foreground">
                <ActiveIcon className="size-[22px] shrink-0" aria-hidden />
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Switch space
            </DropdownMenuLabel>
            {spaces.map((space) => {
              const Icon = space.icon
              const isActive = space.id === activeSpace.id
              return (
                <DropdownMenuItem
                  key={space.id}
                  onClick={() => onChange(space.id)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="text-sm font-medium">{space.name}</span>
                    <span className="text-xs text-foreground/60">{space.subtitle}</span>
                  </div>
                  {isActive && <Check className="ml-auto size-4 shrink-0" />}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/** @deprecated Use SpaceSwitcher — kept for one release as shim. */
export const TeamSwitcher = SpaceSwitcher;
