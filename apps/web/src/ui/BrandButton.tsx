import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/ui/cn'

/**
 * The landing page's call-to-action buttons, as a primitive.
 *
 * The landing hero hand-rolls `rounded-[2px]` rectangles on the brand orange
 * (`--ff-accent`) instead of using the rounded `Button` primitive. That is a
 * deliberate brand choice - near-square corners, a heavy solid accent, 13.5px
 * semibold labels - and it is the treatment job CTAs are expected to match.
 *
 * It could not simply be copy-pasted into `features/jobs`: the root
 * `eslint.config.mjs` turns `shadcn/no-arbitrary-values` OFF for
 * `features/landing/**` only, so the same classes anywhere else either warn on
 * every value or get "corrected" to `bg-primary`, which is navy and loses the
 * orange entirely. Defining the geometry here, inside `src/ui/` (where that
 * rule is off because primitives compose classes by design), keeps one source
 * of truth for the style and keeps call sites free of arbitrary values.
 */
type BrandVariant = 'solid' | 'neutral' | 'outline' | 'selected' | 'ghost'
type BrandSize = 'sm' | 'md' | 'icon'

const VARIANTS: Record<BrandVariant, string> = {
    // Primary CTA. Hover lifts by a pixel; active presses in.
    // Label is navy, not paper: paper on the brand orange is 3.2:1 and fails AA
    // at this size. See --color-ff-accent-ink in globals.css.
    solid: 'bg-[var(--ff-accent)] text-[var(--color-ff-accent-ink)] hover:opacity-90 active:scale-[0.98]',
    // Solid but brand-neutral. For actions that leave the site, so the loud
    // brand accent is not spent on a click through to someone else's page.
    neutral: 'bg-foreground text-background hover:opacity-90 active:scale-[0.98]',
    // Secondary CTA: a hairline that darkens on hover.
    outline: 'border border-border text-foreground hover:border-foreground/40 active:scale-[0.98]',
    // Selected/toggled-on state. Keyed to `primary`, NOT `foreground`: a
    // `foreground/5` fill plus a `foreground/80` border glows white on the dark
    // theme, so a saved button lit up like a primary CTA in dark mode.
    selected: 'border-primary/40 bg-primary/10 text-primary active:scale-[0.98]',
    // Icon-only control at the same height as a labelled button.
    ghost: 'border border-border text-foreground hover:border-foreground/40 active:scale-[0.98]',
}

const SIZES: Record<BrandSize, string> = {
    // 32px, matches `size-8` icon controls beside it. For dense rows - list
    // cards, chip groups - where the full CTA height is too tall.
    sm: 'px-3 py-2 text-xs',
    md: 'px-[18px] py-[10px] text-[13.5px]',
    icon: 'px-2.5 py-[10px]',
}

export interface BrandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: BrandVariant
    size?: BrandSize
    /**
     * Render as the single child element instead of a `<button>`, for links and
     * other non-button elements that should carry the same geometry. Lets a
     * navigation be a real `<a>` with real focus behaviour instead of a button
     * wrapped in a link or a `pointer-events-none` overlay.
     */
    asChild?: boolean
}

export const BrandButton = React.forwardRef<HTMLButtonElement, BrandButtonProps>(
    ({ className, variant = 'solid', size = 'md', asChild = false, type, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button'
        return (
            <Comp
                ref={ref}
                {...(asChild ? {} : { type: type ?? 'button' })}
                className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-[2px] font-semibold transition-all duration-150 ease-out',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ff-accent)] focus-visible:ring-offset-2',
                    'disabled:pointer-events-none disabled:opacity-50',
                    VARIANTS[variant],
                    SIZES[size],
                    className
                )}
                {...props}
            />
        )
    }
)
BrandButton.displayName = 'BrandButton'
