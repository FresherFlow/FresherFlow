"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground",
        "animate-in fade-in-0 zoom-in-95 duration-125 ease-out data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-75 data-[state=instant-open]:duration-0 data-[side=bottom]:origin-top data-[side=top]:origin-bottom data-[side=left]:origin-right data-[side=right]:origin-left",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

/**
 * A simplified Tooltip component for easy use everywhere.
 * Usage: <Hint label="Save"><button>...</button></Hint>
 */
export function Hint({ 
  label, 
  children, 
  side = "top", 
  align = "center",
  delayDuration = 200,
  avoidCollisions = true
}: { 
  label: string | React.ReactNode; 
  children: React.ReactNode; 
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  delayDuration?: number;
  avoidCollisions?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  
  if (!label) return <>{children}</>;
  
  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger 
          asChild 
          onClick={(e) => {
            setOpen(false);
            if (e.currentTarget instanceof HTMLElement) {
              e.currentTarget.blur();
            }
          }}
        >
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} align={align} avoidCollisions={avoidCollisions}>
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
