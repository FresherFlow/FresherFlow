# FresherFlow Mobile — Design System

This document is the single source of truth for all UI tokens, spacing, typography, colors, and component patterns in the mobile app. All agents and contributors must reference this before building or editing any UI.

---

## Table of Contents

1. [Overview](#overview)
2. [Color System](#color-system)
3. [Spacing System](#spacing-system)
4. [Roundness System](#roundness-system)
5. [Elevation System](#elevation-system)
6. [Typography System](#typography-system)
7. [Usage Guidelines](#usage-guidelines)

---

## Overview

All design tokens live in a single file:

- **Theme**: [`src/theme/index.ts`](src/theme/index.ts)

Access all tokens via the `theme` export:

```tsx
import { theme } from '@/theme';

<View style={{ backgroundColor: theme.colors.background, padding: theme.spacing.md }} />
```

Use the `alpha()` utility for opacity variants:

```tsx
import { alpha } from '@/theme';

alpha(theme.colors.primary, 0.5) // 'rgba(245, 247, 248, 0.5)'
```

---

## Color System

Base: dark mode only. Background is near-black `#020404`. Primary text is off-white `#F5F7F8`.

### Core Colors

| Token | Value | Use Case |
|---|---|---|
| `colors.primary` | `#F5F7F8` | Primary text, icons, active states |
| `colors.secondary` | `#FF6B6B` | Destructive actions, alerts, badges |
| `colors.background` | `#020404` | Screen backgrounds |
| `colors.surface` | `rgba(245,247,248,0.05)` | Cards, list items, input backgrounds |
| `colors.surfaceMuted` | `rgba(245,247,248,0.03)` | Subtle section backgrounds |
| `colors.accent` | `#F5F7F8` | Highlights, selected states |
| `colors.text` | `#F5F7F8` | Primary body text |
| `colors.textMuted` | `rgba(245,247,248,0.7)` | Secondary labels, placeholders |
| `colors.border` | `rgba(245,247,248,0.12)` | Dividers, input borders |
| `colors.muted` | `rgba(245,247,248,0.38)` | Disabled states, ghost text |
| `colors.overlay` | `rgba(2,4,4,0.7)` | Modal backdrops |

### Semantic Colors

| Token | Value | Use Case |
|---|---|---|
| `colors.error` | `#CF6679` | Error states, form validation |
| `colors.success` | `#03DAC6` | Match scores, confirmed actions |
| `colors.warning` | `#FFB74D` | Review flags, expiry warnings |
| `colors.info` | `#D2E8F7` | Informational banners |

### Elevation Colors

| Token | Value | Use Case |
|---|---|---|
| `colors.elevation1` | `rgba(245,247,248,0.03)` | Lowest raised surface |
| `colors.elevation2` | `rgba(245,247,248,0.03)` | Cards on background |
| `colors.elevation3` | `rgba(245,247,248,0.11)` | Modals, sheets |
| `colors.elevation4` | `rgba(245,247,248,0.12)` | Top-layer elements |

### Semantic Translucent Tokens

| Token | Value | Use Case |
|---|---|---|
| `colors.dividerSubtle` | `rgba(245,247,248,0.05)` | Section dividers |
| `colors.glassSubtle` | `rgba(245,247,248,0.03)` | Glassmorphism backgrounds |
| `colors.overlaySubtle` | `rgba(2,4,4,0.7)` | Screen overlays |
| `colors.shadowLight` | `rgba(0,0,0,0.04)` | Subtle card shadows |
| `colors.shadowMedium` | `rgba(0,0,0,0.08)` | Elevated card shadows |

### Usage

```tsx
// Correct — use theme tokens
<View style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }} />

// Wrong — never hardcode
<View style={{ backgroundColor: '#1a1a1a', borderColor: '#333' }} />
```

---

## Spacing System

| Token | Value | Use Case |
|---|---|---|
| `spacing.xxs` | `4` | Icon gaps, tight inline spacing |
| `spacing.xs` | `8` | Compact padding, chip inner spacing |
| `spacing.sm` | `12` | Form field padding, list item gaps |
| `spacing.md` | `16` | Standard screen horizontal padding |
| `spacing.lg` | `24` | Section spacing, card padding |
| `spacing.xl` | `32` | Between major sections |
| `spacing.xxl` | `40` | Screen-level top/bottom padding |

### Usage

```tsx
// Standard card
<View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }} />

// Screen horizontal padding
<View style={{ paddingHorizontal: theme.spacing.md }} />

// Tight row
<View style={{ gap: theme.spacing.xs }} />
```

---

## Roundness System

| Token | Value | Use Case |
|---|---|---|
| `roundness.sm` | `8` | Chips, tags, small badges |
| `roundness.md` | `12` | Input fields, buttons |
| `roundness.lg` | `16` | Cards, list tiles |
| `roundness.xl` | `20` | Bottom sheets, modals |
| `roundness.full` | `9999` | Pill buttons, avatar rings |

### Usage

```tsx
// Chip/tag
<View style={{ borderRadius: theme.roundness.sm }} />

// Card
<View style={{ borderRadius: theme.roundness.lg }} />

// Pill button
<View style={{ borderRadius: theme.roundness.full }} />
```

---

## Elevation System

| Token | Value | Use Case |
|---|---|---|
| `elevation.sm` | `2` | Subtle lift on list items |
| `elevation.md` | `6` | Cards, floating buttons |
| `elevation.lg` | `12` | Modals, bottom sheets |

### Usage

```tsx
<View style={{ elevation: theme.elevation.md }} />
```

---

## Typography System

Typography tokens live in the `@/utils/typography` module (system font, no custom font loaded).

Use React Native's `Text` with inline styles referencing font sizes from these semantic names:

| Name | Size | Weight | Use Case |
|---|---|---|---|
| largeTitle | 34 | Bold | Hero headers |
| title1 | 28 | Bold | Screen titles |
| title2 | 22 | Bold | Section headers |
| title3 | 20 | Semibold | Card headers |
| body | 17 | Regular | Primary body copy |
| callout | 16 | Regular | List item text |
| subheadline | 15 | Regular | Secondary body |
| footnote | 13 | Regular | Captions, metadata |
| caption | 12 | Regular | Timestamps, labels |

---

## Usage Guidelines

### Do

- Always pull colors, spacing, and roundness from `theme`
- Use `alpha()` for opacity variants instead of hardcoded rgba
- Use `colors.success` for match scores, `colors.warning` for expiry, `colors.error` for failures
- Use `colors.textMuted` for secondary text like timestamps and metadata

### Do Not

- Do not hardcode hex values, dp values, or opacity inline in component styles
- Do not add new one-off color values — extend `theme/index.ts` and document here
- Do not use `colors.secondary` (`#FF6B6B`) for anything other than destructive/alert states

---

## Common Components (use before building)

Check `apps/mobile/src/components/` for existing components before building a new one.

| Component | What it is | Use for |
|---|---|---|
| `LoadingView` | Full-screen spinner | Screen-level loading state |
| `ErrorView` | Error with retry button | Screen-level error state |
| `EmptyView` | Empty illustration + message | Empty list/screen states |
| `JobCard` (mobile) | Mobile job card | Feed list items |
| `SectionHeader` | Titled section with optional action | Screen section titles |
| `Divider` | Thin horizontal rule | Between list items, sections |

### Pattern: Every screen must handle 3 states

```tsx
const { data, loading, error } = useSomeHook();

if (loading) return <LoadingView />;
if (error) return <ErrorView error={error} onRetry={refetch} />;
if (!data?.length) return <EmptyView message="Nothing here yet" />;

return <FlatList data={data} ... />;
```

---

## Migration Guide (Hardcoded → Token)

When fixing hardcoded values, replace with theme tokens.

### Colors

| Hardcoded | Token |
|---|---|
| `#020404` | `theme.colors.background` |
| `#F5F7F8` | `theme.colors.primary` / `theme.colors.text` |
| `rgba(245,247,248,0.05)` | `theme.colors.surface` |
| `rgba(245,247,248,0.7)` | `theme.colors.textMuted` |
| `rgba(245,247,248,0.12)` | `theme.colors.border` |
| `#CF6679` | `theme.colors.error` |
| `#03DAC6` | `theme.colors.success` |
| `#FFB74D` | `theme.colors.warning` |

### Spacing

| Hardcoded (dp) | Token |
|---|---|
| `4` | `theme.spacing.xxs` |
| `8` | `theme.spacing.xs` |
| `12` | `theme.spacing.sm` |
| `16` | `theme.spacing.md` |
| `24` | `theme.spacing.lg` |
| `32` | `theme.spacing.xl` |
| `40` | `theme.spacing.xxl` |

### Border Radius

| Hardcoded (dp) | Token |
|---|---|
| `8` | `theme.roundness.sm` |
| `12` | `theme.roundness.md` |
| `16` | `theme.roundness.lg` |
| `20` | `theme.roundness.xl` |
| `9999` / pill | `theme.roundness.full` |

