"use client"
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import * as React from "react"
import Link from "next/link"
import { LogIn } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/DropdownMenu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/ui/sidebar"
import { useAuth } from "@/lib/auth/AuthContext"
import { useTheme } from "@/lib/providers/ThemeContext"
import {
  BadgeCheck,
  Bell,
  ChevronsUpDown,
  LogOut,
  MessageSquare,
  Moon,
  Sun,
  UserCircle,
  Users,
} from "lucide-react"

/**
 * Sidebar user footer (adapted from shadcn sidebar-07 NavUser).
 * Wired to FresherFlow auth: real avatar/name/email, account links,
 * theme toggle, logout. Logged-out visitors get a Log in row.
 */
export function NavUser() {
  const { isMobile } = useSidebar()
  const { user, profile, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Before mount the auth source of truth is unknown, so the row itself cannot
  // render yet (SSR HTML must equal first client paint). Reserve its footprint
  // instead: returning `null` here collapsed the footer and made the nav list
  // jump up by one row once auth hydrated.
  if (!mounted)
    return (
      <SidebarMenu aria-hidden>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" tabIndex={-1} className="pointer-events-none" />
        </SidebarMenuItem>
      </SidebarMenu>
    )

  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild tooltip="Log in">
            <Link href="/login">
              <LogIn />
              <span className="sidebar-expanded-only">Log in</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  const displayName = user.fullName || user.username || "User"
  const initial = (user.fullName?.[0] || user.username?.[0] || "U").toUpperCase()
  const avatarSrc = profile?.avatarUrl || undefined

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={avatarSrc} alt={displayName} />
                <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ms-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={avatarSrc} alt={displayName} />
                    <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-start text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                  <Link href="/account?tab=settings">
                    <BadgeCheck className="size-4 shrink-0" />
                    Account & security
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account?tab=profile">
                    <UserCircle className="size-4 shrink-0" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account?tab=referral">
                    <Users className="size-4 shrink-0" />
                    Referrals
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account?tab=feedback">
                    <MessageSquare className="size-4 shrink-0" />
                    Feedback
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/jobs?tab=alerts">
                    <Bell className="size-4 shrink-0" />
                    Job Alerts
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toggleTheme()}>
                {theme === "dark" ? (
                  <Sun className="size-4 shrink-0" />
                ) : (
                  <Moon className="size-4 shrink-0" />
                )}
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => logout("/login")}
                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                <LogOut className="size-4 shrink-0" />
                Sign out
              </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
