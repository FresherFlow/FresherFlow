"use client";

import { cn } from "@/lib/utils/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { PropsWithChildren, ReactNode, WheelEventHandler } from "react";
import { createPortal } from "react-dom";
import { Drawer } from "vaul";
import { useMediaQuery } from "../hooks/use-media-query";

export type ResponsivePopoverProps = PropsWithChildren<{
  content: ReactNode | string;
  align?: "center" | "start" | "end";
  side?: "bottom" | "top" | "left" | "right";
  openPopover: boolean;
  setOpenPopover: (open: boolean) => void;
  mobileOnly?: boolean;
  forceDropdown?: boolean;
  popoverContentClassName?: string;
  onOpenAutoFocus?: PopoverPrimitive.PopoverContentProps["onOpenAutoFocus"];
  onCloseAutoFocus?: PopoverPrimitive.PopoverContentProps["onCloseAutoFocus"];
  collisionBoundary?: Element | Element[];
  sticky?: "partial" | "always";
  onEscapeKeyDown?: (event: KeyboardEvent) => void;
  onWheel?: WheelEventHandler;
  sideOffset?: number;
  anchor?: ReactNode;
}>;

export function ResponsivePopover({
  children,
  content,
  align = "center",
  side = "bottom",
  openPopover,
  setOpenPopover,
  mobileOnly,
  forceDropdown,
  popoverContentClassName,
  onOpenAutoFocus,
  onCloseAutoFocus,
  collisionBoundary,
  sticky,
  onEscapeKeyDown,
  onWheel,
  sideOffset = 8,
  anchor,
}: ResponsivePopoverProps) {
  const { isMobile } = useMediaQuery();

  if (!forceDropdown && (mobileOnly || isMobile)) {
    return (
      <Drawer.Root open={openPopover} onOpenChange={setOpenPopover}>
        <Drawer.Trigger className="sm:hidden" asChild>
          {children}
        </Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <Drawer.Content
            className="fixed bottom-0 left-0 right-0 z-50 mt-24 rounded-t-[10px] border border-border bg-background"
            onEscapeKeyDown={onEscapeKeyDown}
            onPointerDownOutside={(e) => {
              if (
                e.target instanceof Element &&
                e.target.closest("[data-sonner-toast]")
              ) {
                e.preventDefault();
              }
            }}
          >
            <div className="sticky top-0 z-20 flex w-full items-center justify-center rounded-t-[10px] bg-inherit">
              <div className="my-3 h-1.5 w-12 rounded-full bg-muted" />
            </div>
            <div className="flex w-full flex-col items-center justify-center overflow-hidden pb-4 align-middle shadow-xl bg-background">
              {content}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    );
  }

  return (
    <PopoverPrimitive.Root open={openPopover} onOpenChange={setOpenPopover}>
      {anchor &&
        typeof document !== "undefined" &&
        createPortal(
          <PopoverPrimitive.Anchor asChild>{anchor}</PopoverPrimitive.Anchor>,
          document.body,
        )}
      <PopoverPrimitive.Trigger className="sm:inline-flex" asChild>
        {children}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          sideOffset={sideOffset}
          align={align}
          side={side}
          className={cn(
            "z-50 items-center rounded-lg border border-border bg-card p-2 shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 sm:block",
            popoverContentClassName,
          )}
          sticky={sticky}
          collisionBoundary={collisionBoundary}
          onOpenAutoFocus={onOpenAutoFocus}
          onCloseAutoFocus={onCloseAutoFocus}
          onEscapeKeyDown={onEscapeKeyDown}
          onWheel={onWheel}
        >
          {content}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
