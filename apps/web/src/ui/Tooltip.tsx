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
        "z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground origin-[--radix-tooltip-content-transform-origin]",
        "transition-[opacity,transform] duration-150 ease-out data-[state=closed]:opacity-0 data-[state=closed]:scale-95 starting:opacity-0 starting:scale-95 data-[state=instant-open]:duration-0",
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
