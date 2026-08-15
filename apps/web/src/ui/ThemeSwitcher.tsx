"use client"

import * as React from "react"
import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"

import { ResponsivePopover } from "./ResponsivePopover"

export function ThemeSwitcher({ className = '', children }: { className?: string; children?: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  async function handleThemeChange(newTheme: string) {
    setOpen(false);
    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }

    document.documentElement.style.viewTransitionName = 'theme-transition';
    const transition = document.startViewTransition(() => {
      setTheme(newTheme);
    });
    
    await transition.finished;
    document.documentElement.style.viewTransitionName = '';
  }

  if (!mounted) {
    return <div className={`w-10 h-10 ${className}`} />
  }

  return (
    <ResponsivePopover
      openPopover={open}
      setOpenPopover={setOpen}
      align="end"
      popoverContentClassName="w-40 p-1"
      content={
        <div className="flex flex-col w-full gap-1 p-1 sm:p-0">
          <button onClick={() => handleThemeChange("light")} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-muted text-foreground w-full text-left outline-none">
            <Sun className="h-4 w-4 opacity-70" />
            <span>Light</span>
          </button>
          <button onClick={() => handleThemeChange("dark")} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-muted text-foreground w-full text-left outline-none">
            <Moon className="h-4 w-4 opacity-70" />
            <span>Dark</span>
          </button>
          <button onClick={() => handleThemeChange("system")} className="flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-muted text-foreground w-full text-left outline-none">
            <Monitor className="h-4 w-4 opacity-70" />
            <span>System</span>
          </button>
        </div>
      }
    >
      {children ? children : (
        <button
          className={`group relative p-2 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl transition-colors duration-200 outline-none active:scale-[0.97] ${className}`}
          aria-label="Toggle Theme"
        >
          <div className="relative w-5 h-5 flex items-center justify-center">
            <Sun className={`absolute transition-all duration-300 ${resolvedTheme === 'dark' ? 'opacity-0 rotate-90 scale-75' : 'opacity-100 rotate-0 scale-100'}`} size={18} />
            <Moon className={`absolute transition-all duration-300 ${resolvedTheme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'}`} size={18} />
          </div>
        </button>
      )}
    </ResponsivePopover>
  )
}
