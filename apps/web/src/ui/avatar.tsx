"use client"

import * as React from "react"
import * as AvatarPrimitive from "@radix-ui/react-avatar"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/ui/cn"

const avatarVariants = cva(
  "relative flex shrink-0 overflow-hidden",
  {
    variants: {
      size: {
        default: "h-10 w-10",
        sm: "h-8 w-8",
      },
      shape: {
        full: "rounded-full",
        lg: "rounded-lg",
      },
    },
    defaultVariants: {
      size: "default",
      shape: "full",
    },
  }
)

type AvatarProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> &
  VariantProps<typeof avatarVariants>

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  AvatarProps
>(({ className, size, shape, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(avatarVariants({ size, shape }), className)}
    {...props}
  />
))
Avatar.displayName = AvatarPrimitive.Root.displayName

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = AvatarPrimitive.Image.displayName

const avatarFallbackVariants = cva(
  "flex h-full w-full items-center justify-center bg-muted",
  {
    variants: {
      shape: {
        full: "rounded-full",
        lg: "rounded-lg",
      },
      textSize: {
        default: "",
        xs: "text-xs",
        micro: "text-micro",
      },
      textWeight: {
        default: "",
        semibold: "font-semibold",
        bold: "font-bold",
      },
      tone: {
        default: "",
        foreground: "text-foreground",
        muted: "text-muted-foreground",
      },
    },
    defaultVariants: {
      shape: "full",
    },
  }
)

type AvatarFallbackProps = React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> &
  VariantProps<typeof avatarFallbackVariants>

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  AvatarFallbackProps
>(({ className, shape, textSize, textWeight, tone, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      avatarFallbackVariants({ shape, textSize, textWeight, tone }),
      className
    )}
    {...props}
  />
))
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName

export { Avatar, AvatarImage, AvatarFallback, avatarVariants, avatarFallbackVariants }
