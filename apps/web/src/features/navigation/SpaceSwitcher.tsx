"use client"

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
  useSidebar,
} from "@/ui/sidebar"
import type { Space, SpaceId } from "@/features/navigation/navConfig"

/**
 * Space switcher (adapted from shadcn sidebar-07 TeamSwitcher).
 * Controlled: the active space comes from the URL via spaces.ts,
 * and switching spaces navigates (Jobs <-> Government).
 * No "Add team" row — spaces are fixed.
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
  const { isMobile } = useSidebar()
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
              tooltip={activeSpace.name}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <ActiveIcon className="size-5! shrink-0" aria-hidden />
              <span className="sidebar-expanded-only">{activeSpace.name}</span>
              <ChevronsUpDown className="sidebar-expanded-only ml-auto size-4 shrink-0" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
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
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {space.name}
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
