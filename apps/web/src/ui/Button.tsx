import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/ui/cn";

/**
 * Material Design Compliant Button
 * 
 * HARD RULES (non-negotiable):
 * - Default: h-12 (48px) - Material Design minimum
 * - Small: h-10 (40px) - absolute minimum for secondary actions
 * - Large: h-14 (56px) - primary CTAs
 * - Icon: 48x48px square - touch-safe
 * - NO arbitrary values allowed outside this file
 * - Text: minimum text-sm (14px), prefer text-base (16px)
 */
const buttonVariants = cva(
    "inline-flex items-center justify-center cursor-pointer whitespace-nowrap rounded-md font-semibold gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-transparent transition-[transform,background-color,border-color,color] duration-150 ease-out active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/90",
                destructive: "bg-destructive text-destructive-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-destructive/90",
                outline: "border border-border bg-background text-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted",
                secondary: "bg-secondary text-secondary-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-secondary/80",
                ghost: "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground",
                // Muted icon button that turns destructive on hover (row delete
                // actions). Owns the muted base + red hover so call sites never
                // restyle color/motion on the primitive.
                ghostDanger: "text-muted-foreground transition-colors hover:text-destructive [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted [@media(hover:hover)_and_(pointer:fine)]:hover:text-destructive",
                // Hover uses `muted`, not `accent`: in the dark theme
                // `--color-accent` is near-white (oklch 97.7%), so `hover:bg-accent`
                // filled the button solid white. Light mode is unchanged — accent
                // and muted are the same value there.
                admin: "border border-input bg-muted/50 text-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground",
                link: "text-primary underline-offset-4 [@media(hover:hover)_and_(pointer:fine)]:hover:underline",
            },
            size: {
                default: "h-12 px-6 py-2 text-base",
                sm: "h-10 px-4 text-sm",
                lg: "h-14 px-8 text-lg",
                icon: "h-12 w-12",
                // Compact icon + label chip: 40px (the secondary-action
                // minimum) and the 6px gap between icon and label, which the
                // primitive owns so call sites never restyle spacing.
                chip: "h-10 gap-1.5 px-4 text-sm",
                // Dense 32px outline action (tracker tables). Matches the
                // previous `h-8 px-3 text-xs` call-site combo exactly.
                xs: "h-8 px-3 text-xs",
                // 32px square icon (bulk/row actions). Keeps the base
                // rounded-md; use `avatar` below for the circular trigger.
                iconSm: "h-8 w-8",
                // 32px circular avatar trigger (header profile menu). Owns
                // position + shape + padding so the call site stays clean.
                avatar: "relative h-8 w-8 shrink-0 rounded-full p-0",
                // Text-link with icon (view-matches). Owns auto height + tight
                // gap + no padding so call sites never restyle the primitive.
                linkSm: "h-auto gap-1 p-0 text-xs",
                // Wide CTA sizes for empty/error state actions. Pair with label="caps".
                cta: "h-12 px-8 py-2 text-sm",
                ctaCompact: "h-11 px-6 py-2 text-sm",
                ctaSmall: "h-10 px-6 py-2 text-xs",
            },
            label: {
                default: "",
                // Uppercase, letter-spaced CTA label treatment.
                caps: "font-bold capitalize tracking-widest",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, label, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, label }), className)}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
