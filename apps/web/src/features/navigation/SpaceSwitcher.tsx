"use client"
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"

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
 * Space switcher - exact copy of shadcn team-switcher.tsx reference
 * with only data mapping (Space vs Team) and single ChevronDown.
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
              size="lg"
              className="h-9 hover:bg-transparent hover:text-sidebar-foreground active:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-sidebar-foreground"
            >
              <div className="flex aspect-square size-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
                <ActiveIcon className="size-3.5 shrink-0" aria-hidden />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate text-sm font-medium">{activeSpace.name}</span>
                <span className="truncate text-xs">{activeSpace.subtitle}</span>
              </div>
              <ChevronDown className="ml-auto size-3.5 shrink-0" />
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
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <Icon className="size-3.5 shrink-0" aria-hidden />
                  </div>
                  <div className="grid flex-1 text-left leading-tight">
                    <span className="text-sm font-medium">{space.name}</span>
                    <span className="text-xs text-muted-foreground">{space.subtitle}</span>
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
