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
import { LogoImage } from "@/features/shell/LogoImage"

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
  logo = false,
}: {
  spaces: Space[]
  activeId: SpaceId
  onChange: (id: SpaceId) => void
  /**
   * Render the FresherFlow logo as the leading tile instead of the active
   * space icon. Lets this single row BE the header: the reference
   * `TeamSwitcher` is one button holding a tile, a name and a chevron, so
   * adding a separate brand row above it made a collapsed rail stack two
   * tiles (logo, then the space icon) at two different offsets.
   */
  logo?: boolean
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
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {logo ? (
                <LogoImage width={24} height={24} className="size-6 shrink-0 object-contain" />
              ) : (
                <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-logo-bg text-paper">
                  <ActiveIcon className="size-4 shrink-0" aria-hidden />
                </div>
              )}
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold">{activeSpace.name}</span>
                <span className="truncate text-xs">{activeSpace.subtitle}</span>
              </div>
              <ChevronsUpDown className="ms-auto size-4 shrink-0" />
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
                  <div className="flex size-6 items-center justify-center rounded-sm border">
                    <Icon className="size-4 shrink-0" aria-hidden />
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
