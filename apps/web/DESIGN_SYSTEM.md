# FresherFlow Web — Design System

This document is the single source of truth for all UI tokens, color usage, typography, spacing, and component patterns in the web app. All agents and contributors must reference this before building or editing any UI.

---

## Table of Contents

1. [Overview](#overview)
2. [Color System](#color-system)
3. [Typography System](#typography-system)
4. [Spacing System](#spacing-system)
5. [Usage Guidelines](#usage-guidelines)

---

## Overview

The web app uses **Tailwind CSS** with a custom token layer built on CSS variables.

Key files:
- **Tailwind config**: [`tailwind.config.ts`](tailwind.config.ts)
- **CSS variables**: [`src/app/globals.css`](src/app/globals.css)

All color tokens are defined as CSS variables and consumed via Tailwind utilities. Dark mode is toggled via the `.dark` class (`darkMode: "class"` in Tailwind config).

```tsx
// Always use Tailwind utility classes — never inline styles for color/spacing
<div className="bg-background text-foreground px-4 py-3 rounded-lg" />
```

---

## Color System

Colors are CSS variable-backed — they automatically switch between light and dark via the `.dark` class on `<html>`.

### Semantic Color Tokens

| Tailwind Class | CSS Variable | Use Case |
|---|---|---|
| `bg-background` | `--background` | Page/screen background |
| `text-foreground` | `--foreground` | Primary body text |
| `bg-card` | `--card` | Card backgrounds |
| `text-card-foreground` | `--card-foreground` | Text inside cards |
| `bg-primary` | `--primary` | Primary buttons, active tabs |
| `text-primary-foreground` | `--primary-foreground` | Text on primary backgrounds |
| `bg-secondary` | `--secondary` | Secondary buttons, chips |
| `text-secondary-foreground` | `--secondary-foreground` | Text on secondary backgrounds |
| `bg-muted` | `--muted` | Skeleton loaders, disabled fields |
| `text-muted-foreground` | `--muted-foreground` | Secondary labels, placeholders |
| `bg-accent` | `--accent` | Hover states, highlights |
| `text-accent-foreground` | `--accent-foreground` | Text on accent backgrounds |
| `border-border` | `--border` | All borders and dividers |
| `ring-ring` | `--ring` | Focus rings |

### Neutral Scale (Static)

Used for decorative elements, illustrations, or when semantic tokens aren't appropriate.

| Token | Value | Use Case |
|---|---|---|
| `neutral-50` | `#FAFAFA` | Lightest background tint |
| `neutral-100` | `#F5F5F5` | Light surface |
| `neutral-200` | `#E5E5E5` | Borders on light mode |
| `neutral-300` | `#D4D4D4` | Dividers |
| `neutral-400` | `#A3A3A3` | Muted icons |
| `neutral-500` | `#737373` | Secondary text |
| `neutral-600` | `#525252` | Body text light mode |
| `neutral-700` | `#404040` | Headings light mode |
| `neutral-800` | `#262626` | Dark surface |
| `neutral-900` | `#171717` | Near-black background |

### Usage

```tsx
// Correct — semantic tokens
<div className="bg-card border border-border text-card-foreground" />

// Correct — neutral scale for decorative use
<div className="bg-neutral-800" />

// Wrong — never hardcode hex in className or style
<div style={{ backgroundColor: '#1a1a1a' }} />
```

---

## Typography System

Font: **Inter** loaded via `next/font/google`, applied as `font-sans` via `var(--font-inter)`.

### Type Scale

| Class | Size | Line Height | Use Case |
|---|---|---|---|
| `text-xs` | 12px | 16px | Badges, timestamps, fine print |
| `text-sm` | 14px | 20px | Secondary labels, metadata |
| `text-base` | 16px | 24px | Primary body copy |
| `text-lg` | 18px | 26px | Card titles, list headings |
| `text-xl` | 20px | 28px | Section headers |
| `text-2xl` | 24px | 32px | Page sub-headers |
| `text-3xl` | 30px | 38px | Page titles, hero text |

### Usage

```tsx
// Page title
<h1 className="text-3xl font-bold text-foreground" />

// Section header
<h2 className="text-xl font-semibold text-foreground" />

// Card title
<h3 className="text-lg font-medium text-foreground" />

// Body copy
<p className="text-base text-foreground" />

// Secondary label / metadata
<span className="text-sm text-muted-foreground" />

// Timestamp / badge
<span className="text-xs text-muted-foreground" />
```

---

## Spacing System

Tailwind's default 4-point spacing scale applies. Extended custom values:

| Class | Value | Use Case |
|---|---|---|
| `p-18` / `m-18` | `4.5rem (72px)` | Large section spacing |
| `p-22` / `m-22` | `5.5rem (88px)` | Hero/banner padding |

Standard scale in use:

| Class | Value | Use Case |
|---|---|---|
| `p-1` / `gap-1` | 4px | Hairline spacing |
| `p-2` / `gap-2` | 8px | Tight inline gaps |
| `p-3` / `gap-3` | 12px | Compact padding |
| `p-4` / `gap-4` | 16px | Standard card padding |
| `p-6` / `gap-6` | 24px | Section padding |
| `p-8` / `gap-8` | 32px | Large section gaps |
| `px-4` | 16px | Standard horizontal screen padding |

### Usage

```tsx
// Standard job card
<div className="p-4 rounded-lg border border-border bg-card gap-3 flex flex-col" />

// Page section
<section className="px-4 py-6" />

// Inline row of chips
<div className="flex gap-2 flex-wrap" />
```

---

## Usage Guidelines

### Do

- Use semantic color tokens (`bg-background`, `text-muted-foreground`) for all UI — they handle dark mode automatically
- Use the Inter type scale consistently — match the size table above to heading hierarchy
- Use `rounded-lg` (8px) for cards, `rounded-md` (6px) for buttons/inputs, `rounded-full` for pills
- Use `border-border` for all dividers and input borders

### Do Not

- Do not hardcode hex values in `className` or `style` props
- Do not use neutral scale (`neutral-*`) for text or backgrounds where semantic tokens exist
- Do not add custom font sizes outside the defined scale — extend `tailwind.config.ts` if needed and document here
- Do not use `darkMode` conditionals in component code — the CSS variable layer handles it automatically

---

## Common Components & UI Catalog

Always inspect `src/ui/` for existing components before building custom UI element wrappers.

### UI Primitive Catalog (`src/ui/`)

| Component | Import Path | Underlying Library | Use Case |
|---|---|---|---|
| `Button` | `src/ui/Button.tsx` | Custom / cva | Buttons with `default`, `secondary`, `outline`, `ghost`, `destructive`, `link` variants |
| `Card` | `src/ui/Card.tsx` | Custom | Styled card container with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` |
| `Badge` | `src/ui/Badge.tsx` | Custom / cva | Status tags and pills (`default`, `secondary`, `destructive`, `outline`, `success`, `warning`) |
| `Dialog` | `src/ui/Dialog.tsx` | `@radix-ui/react-dialog` | Modal dialogs with accessible backdrop blur, title, description, close button |
| `Sheet` | `src/ui/Sheet.tsx` | `@radix-ui/react-dialog` | Slide-over drawer panels (`top`, `bottom`, `left`, `right`) for mobile nav and side detail views |
| `DropdownMenu` | `src/ui/DropdownMenu.tsx` | `@radix-ui/react-dropdown-menu` | Action dropdowns, user menus, context options with keyboard accessibility |
| `Popover` | `src/ui/Popover.tsx` | `@radix-ui/react-popover` | Lightweight floating cards, notification bell popups, contextual filters |
| `Tabs` | `src/ui/Tabs.tsx` | `@radix-ui/react-tabs` | Segmented tab views with `TabsList`, `TabsTrigger`, `TabsContent` |
| `Tooltip` | `src/ui/Tooltip.tsx` | `@radix-ui/react-tooltip` | Hover tooltips for icon buttons, badges, and truncated text |
| `Command` | `src/ui/Command.tsx` | `cmdk` | Quick search command palette, comboboxes, and filter selectors |
| `Input` | `src/ui/Input.tsx` | Custom | Standard form input with focus ring and semantic border tokens |
| `Select` | `src/ui/Select.tsx` | Custom | Native/styled dropdown select input |
| `Skeleton` | `src/ui/Skeleton.tsx` | Custom | Skeleton loading states for cards, text rows, avatars, list items |
| `EmptyState` | `src/ui/EmptyState.tsx` | Custom | Contextual empty state with icon, headline, description, and action button |
| `ErrorMessage` | `src/ui/ErrorMessage.tsx` | Custom | Error banner with retry callback |
| `CompanyLogo` | `src/ui/CompanyLogo.tsx` | Custom | Company logo loader with Cloudflare R2 / Google favicon fallback |
| `JobCard` | `src/ui/` / `src/features/` | Custom | Standard opportunity listing card with match score and fast actions |
| `MatchScoreGauge` | `src/ui/MatchScoreGauge.tsx` | Custom | Visual match percentage ring/gauge |
| `PageTagLinks` | `src/ui/PageTagLinks.tsx` | Custom | Linked skill, role, or location tag cloud |
| `AppPromoBanner` | `src/ui/AppPromoBanner.tsx` | Custom | Mobile app download promotion banner |
| `Breadcrumb` | `src/ui/Breadcrumb.tsx` | Custom | Navigation breadcrumb trails |
| `ScrollToTop` | `src/ui/ScrollToTop.tsx` | Custom | Floating back-to-top button |
| `ThemeToggle` | `src/ui/ThemeToggle.tsx` | Custom | Dark/light theme switcher |
| `Toasts` | `sonner` / `react-hot-toast` | `sonner` | Toast notifications (notifications, success alerts, copy feedback) |

### Icon Libraries
- **Lucide Icons**: `lucide-react` (Primary line icon set for new UI components)
- **Heroicons**: `@heroicons/react` (Legacy icon set)

---

## Animation & Motion System

Motion in FresherFlow must be **fast**, **restrained**, and **purposeful**. Follow Emil Kowalski's UI principles and the gate rules in `find-animation-opportunities`.

### Budget & Timing Guidelines

| Surface | Duration | Easing Curve | CSS Utility / Config |
|---|---|---|---|
| Press feedback (`:active`) | 100–160ms | `ease-out` | `active:scale-[0.97] transition-all duration-150 ease-out` |
| Tooltips & Popovers | 125–200ms | `cubic-bezier(0.16, 1, 0.3, 1)` | `animate-in fade-in-0 zoom-in-95 duration-150` |
| Dropdowns & Menus | 150–200ms | `cubic-bezier(0.16, 1, 0.3, 1)` | `animate-in fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2` |
| Slide-over Sheets / Drawers | 250–350ms | `cubic-bezier(0.32, 0.72, 0, 1)` | `transition-transform duration-300 ease-out` |
| Modals & Dialogs | 200–300ms | `cubic-bezier(0.16, 1, 0.3, 1)` | `animate-in fade-in-0 zoom-in-95 duration-200` |
| Staggered list entrances | 30–60ms / item | `ease-out` | Staggered entrance on list load (max 5 items) |

### Hard Animation Rules

1. **Never animate from `scale(0)`**: Always enter from `scale(0.95)` or `scale(0.97)` to keep elements feeling solid.
2. **High-frequency UI stays instant**: Never add open/close delay to command palettes, main tabs, or keyboard shortcuts.
3. **Use transform & opacity only**: Avoid animating `width`, `height`, `margin`, or `padding` directly to prevent layout thrashing.
4. **Respect Reduced Motion**: Always support `motion-reduce:transition-none` or `motion-reduce:animate-none` for accessibility.
5. **No Sparkle icons**: Never use `✨` or `SparklesIcon`.

### Code Pattern Examples

```tsx
// Micro-interaction button
<button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium active:scale-[0.97] hover:bg-primary/90 transition-all duration-150 ease-out" />

// Glassmorphic Card Entrance
<div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-xl animate-in fade-in-0 zoom-in-95 duration-200" />
```

---

## Migration Guide (Hardcoded → Token)

When fixing hardcoded values, use this table to replace them with tokens.

### Colors

| Hardcoded | Token | Class |
|---|---|---|
| `#ffffff` / white | `--background` (light) | `bg-background` |
| `#000000` / black | `--foreground` (dark) | `text-foreground` |
| `#f5f5f5` | `--muted` | `bg-muted` |
| `#6b7280` / gray-500 | `--muted-foreground` | `text-muted-foreground` |
| `#e5e7eb` / gray-200 | `--border` | `border-border` |
| card bg | `--card` | `bg-card` |

### Spacing

| Hardcoded | Token |
|---|---|
| `4px` / `0.25rem` | `p-1` / `gap-1` |
| `8px` / `0.5rem` | `p-2` / `gap-2` |
| `12px` / `0.75rem` | `p-3` / `gap-3` |
| `16px` / `1rem` | `p-4` / `gap-4` |
| `24px` / `1.5rem` | `p-6` / `gap-6` |
| `32px` / `2rem` | `p-8` / `gap-8` |

### Border Radius

| Hardcoded | Token |
|---|---|
| `4px` | `rounded-sm` |
| `6px` | `rounded-md` |
| `8px` | `rounded-lg` |
| `12px` | `rounded-xl` |
| `9999px` / pill | `rounded-full` |

