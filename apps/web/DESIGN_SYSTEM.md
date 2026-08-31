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

The web app uses **Tailwind CSS v4** with OKLCH color tokens defined in a single `@theme` block.

Key files:
- **Design tokens**: `@theme` block in [`globals.css`](src/app/globals.css) — single source of truth for all colors, fonts, spacing, and radius
- **Dark mode**: `.dark` block in the same file overrides `--color-*` tokens directly
- **No JS config**: `tailwind.config.ts` has been removed; Tailwind v4 uses CSS-first configuration

All color tokens are OKLCH values in `@theme`. Dark mode overrides them via `.dark { --color-*: ... }`. Component CSS references tokens via `var(--color-*)`. Alpha variants use `oklch(from var(--color-*) l c h / <alpha>)`.

```tsx
// Always use Tailwind utility classes — never inline styles for color/spacing
<div className="bg-background text-foreground px-4 py-3 rounded-lg" />
```

### Token Architecture

```
@theme (OKLCH values) → generates --color-* CSS variables
    ↓
Tailwind utilities: bg-primary, text-muted-foreground, etc.
    ↓
@layer components: var(--color-primary), color-mix(...), etc.
    ↓
.dark overrides → same --color-* variables with dark OKLCH values
```

No more `hsl(var(--primary))` indirection. Colors are defined once in `@theme` and consumed everywhere.

---

## Color System

Colors are OKLCH values in `@theme` — they automatically switch between light and dark via the `.dark` class on `<html>`.

### Semantic Color Tokens

| Tailwind Class | CSS Variable | Use Case |
|---|---|---|
| `bg-background` | `--color-background` | Page/screen background |
| `text-foreground` | `--color-foreground` | Primary body text |
| `bg-card` | `--color-card` | Card backgrounds |
| `text-card-foreground` | `--color-card-foreground` | Text inside cards |
| `bg-primary` | `--color-primary` | Primary buttons, active tabs |
| `text-primary-foreground` | `--color-primary-foreground` | Text on primary backgrounds |
| `bg-secondary` | `--color-secondary` | Secondary buttons, chips |
| `text-secondary-foreground` | `--color-secondary-foreground` | Text on secondary backgrounds |
| `bg-muted` | `--color-muted` | Skeleton loaders, disabled fields |
| `text-muted-foreground` | `--color-muted-foreground` | Secondary labels, placeholders |
| `bg-accent` | `--color-accent` | Hover states, highlights |
| `text-accent-foreground` | `--color-accent-foreground` | Text on accent backgrounds |
| `border-border` | `--color-border` | All borders and dividers |
| `ring-ring` | `--color-ring` | Focus rings |

### Status Tokens

| Tailwind Class | CSS Variable | Use Case |
|---|---|---|
| `bg-success` | `--color-success` | Success states |
| `bg-error` | `--color-error` | Error states |
| `bg-warning` | `--color-warning` | Warning states |
| `bg-destructive` | `--color-destructive` | Destructive actions |

### Component Tokens

| Tailwind Class | CSS Variable | Use Case |
|---|---|---|
| `bg-chip-active` | `--color-chip-active` | Active chip/pill background |
| `text-chip-active-text` | `--color-chip-active-text` | Active chip text |
| `border-chip-active-border` | `--color-chip-active-border` | Active chip border |
| `bg-dropdown-hover` | `--color-dropdown-hover` | Dropdown item hover |
| `text-dropdown-hover-text` | `--color-dropdown-hover-text` | Dropdown hover text |

### Alpha Variants

In component CSS, use `oklch(from var(--color-*) l c h / <alpha>)` for alpha:

```css
/* 60% opacity */
box-shadow: 0 8px 20px -16px oklch(from var(--color-primary) l c h / 0.6);

/* 35% opacity for borders */
border: 1px solid oklch(from var(--color-primary) l c h / 0.35);

/* 50% opacity for backgrounds */
background-color: oklch(from var(--color-muted) l c h / 0.5);
```

### Brand / Third-Party Tokens

For social media buttons and brand-specific UI:

| Tailwind Class | CSS Variable | Use Case |
|---|---|---|
| `bg-brand-telegram` | `--color-brand-telegram` | Telegram social button |
| `bg-brand-whatsapp` | `--color-brand-whatsapp` | WhatsApp social button |
| `bg-brand-whatsapp-hover` | `--color-brand-whatsapp-hover` | WhatsApp hover state |
| `bg-brand-linkedin` | `--color-brand-linkedin` | LinkedIn social button |
| `bg-brand-discord` | `--color-brand-discord` | Discord social button |
| `bg-brand-facebook` | `--color-brand-facebook` | Facebook social button |
| `bg-brand-company-blue` | `--color-brand-company-blue` | Company logo fallback (TCS) |

### Surface Tokens

| Tailwind Class | CSS Variable | Use Case |
|---|---|---|
| `bg-surface-warm` | `--color-surface-warm` | Warm gray surfaces (CaptionsTool) |

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

// Correct — brand tokens for social buttons
<a className="bg-brand-telegram text-white">Telegram</a>

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
- Use the `<Button>`, `<Card>`, `<Badge>`, `<Input>` React components for standard UI patterns
- Use the Inter type scale consistently — match the size table above to heading hierarchy
- Use `rounded-lg` (8px) for cards, `rounded-md` (6px) for buttons/inputs, `rounded-full` for pills
- Use `border-border` for all dividers and input borders

### Do Not

- Do not hardcode hex values in `className` or `style` props
- Do not use neutral scale (`neutral-*`) for text or backgrounds where semantic tokens exist
- Do not add custom font sizes outside the defined scale — extend the `@theme` block in `globals.css` if needed and document here
- Do not use `darkMode` conditionals in component code — the CSS variable layer handles it automatically
- Do not use `hsl(var(--primary))` indirection — always use `var(--color-primary)` or Tailwind utilities
- Do not use `slate-*`, `zinc-*`, `gray-*`, `stone-*` for UI colors — use semantic tokens instead
- Do not add colors to `:root` — all color tokens belong in the `@theme` block
- Do not create legacy CSS classes (`.premium-*`, `.btn-*`, `.admin-*`) — use the React components in `src/ui/` instead
- Do not use `bg-[#hex]` for brand colors — use the `bg-brand-*` tokens defined in `@theme`

## Component Ownership

Where should a new component go?

* **`src/ui/`**: Reusable generic UI components (buttons, inputs, dialogs, tables). Should not contain business logic.
* **`src/features/<feature>/`**: Domain-specific UI composed of `src/ui/` primitives (e.g. `AdminOpportunitiesTable`).
* **Route-local (`app/.../components/`)**: Single-page only UI composition.

How to choose canonical components:

* **Button vs CSS class**: Always use `<Button>` from `src/ui/Button.tsx`. The legacy `.premium-button`, `.btn-primary`, `.btn-outline` CSS classes have been removed.
* **Card vs CSS class**: Always use `<Card>` from `src/ui/Card.tsx`. The legacy `.premium-card`, `.card` CSS classes have been removed.
* **Input vs CSS class**: Always use `<Input>` from `src/ui/Input.tsx`. The legacy `.premium-input` CSS class has been removed.
* **Badge vs CSS class**: Always use `<Badge>` from `src/ui/Badge.tsx`. The legacy `.badge`, `.badge-primary`, `.badge-success`, `.badge-warning`, `.badge-error` CSS classes have been removed.
* **Table vs DataTable**: Use `Table` (`src/ui/Table.tsx`) for simple, static, read-only data. Use `DataTable` (`src/ui/data-table/DataTable.tsx`) when you need sorting, pagination, row selection, or filtering. Do not install new table libraries.
* **Select vs Combobox**: Use `Select` for simple, native dropdowns. Use `Combobox` (when built via Popover+Command) for searchable options. Use Shadcn/Radix for generic selections.
* **Dialog vs AlertDialog**: Use `Dialog` for normal modal interactions (forms, content). Use `AlertDialog` strictly for destructive confirmations (delete, warning).
* **When to add a shadcn component?**: First check if we have the primitive in `src/ui/`. If missing, install it via shadcn (e.g. `AlertDialog`). Do not install them just to have them.
* **Which icon library should I use?**:
    - `Iconify`: Skill, technology, or domain-specific icons.
    - `Lucide`: New generic UI icons (shadcn standard).
    - `Heroicons`: Only for existing legacy/application usage. Do not mass-migrate.

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

## Form Field Standards

### Basic Input
`src/ui/Input.tsx`
Use for the underlying text input primitive.

### Field + Input
Use when building a new generic form field:
```tsx
<Field label="Name">
  <Input />
</Field>
```

### SmartInput
Use only when its convenience API is genuinely useful, especially for existing admin code.

### Select
`src/ui/Select.tsx`
Use for simple/native selections.

### SmartSelect
Use only when its label/help/field wrapper is useful.

### Textarea
`src/ui/Textarea.tsx`
Use as the canonical textarea primitive.

### SmartTextarea
Use only where the existing convenience API is needed.

> Do not create another `CustomInput`, `CustomSelect`, `CustomTextarea`, `SmartField`, or feature-specific generic field component.

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

### Legacy CSS Classes → React Components

| Legacy CSS Class | Replacement | Import |
|---|---|---|
| `.premium-button` / `.btn-primary` | `<Button variant="default">` | `import { Button } from '@/ui/Button'` |
| `.premium-button-outline` / `.btn-outline` | `<Button variant="outline">` | `import { Button } from '@/ui/Button'` |
| `.btn-secondary-cta` | `<Button variant="secondary">` | `import { Button } from '@/ui/Button'` |
| `.premium-card` / `.card` | `<Card>` | `import { Card } from '@/ui/Card'` |
| `.premium-input` | `<Input>` | `import { Input } from '@/ui/Input'` |
| `.badge` / `.badge-*` | `<Badge variant="...">` | `import { Badge } from '@/ui/Badge'` |
| `.admin-*` | Tailwind utilities | N/A — use inline Tailwind classes |

### Colors

| Hardcoded | Token | Class / Utility |
|---|---|---|
| `#ffffff` / white | `--color-background` (light) | `bg-background` |
| `#000000` / black | `--color-foreground` (dark) | `text-foreground` |
| `#f5f5f5` | `--color-muted` | `bg-muted` |
| `#6b7280` / gray-500 | `--color-muted-foreground` | `text-muted-foreground` |
| `#e5e7eb` / gray-200 | `--color-border` | `border-border` |
| card bg | `--color-card` | `bg-card` |
| `bg-slate-200 dark:bg-zinc-800` (active chips) | `--color-chip-active-*` | Tailwind `bg-chip-active text-chip-active-text border-chip-active-border` |
| `hover:bg-foreground/10` (dropdown hover) | `--color-dropdown-hover` | Tailwind `bg-dropdown-hover text-dropdown-hover-text` |
| `bg-[#229ED9]` (Telegram) | `--color-brand-telegram` | `bg-brand-telegram` |
| `bg-[#25D366]` (WhatsApp) | `--color-brand-whatsapp` | `bg-brand-whatsapp` |
| `bg-[#0A66C2]` (LinkedIn) | `--color-brand-linkedin` | `bg-brand-linkedin` |
| `bg-[#5865F2]` (Discord) | `--color-brand-discord` | `bg-brand-discord` |
| `bg-[#1877F2]` (Facebook) | `--color-brand-facebook` | `bg-brand-facebook` |
| `bg-[#F5F4EF]` (warm gray) | `--color-surface-warm` | `bg-surface-warm` |
| `bg-slate-*` / `text-slate-*` | Semantic tokens | Use `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border` |
| `bg-zinc-*` / `text-zinc-*` | Semantic tokens | Use `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border` |

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

