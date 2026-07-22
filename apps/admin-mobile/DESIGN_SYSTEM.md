# FresherFlow Admin Mobile — Design System

This document is the single source of truth for all UI tokens, spacing, typography, colors, and component patterns in the admin mobile app. All agents and contributors must reference this before building or editing any UI.

---

## Table of Contents

1. [Overview](#overview)
2. [Color System](#color-system)
3. [Spacing System](#spacing-system)
4. [Radius System](#radius-system)
5. [Typography System](#typography-system)
6. [Component Sizes](#component-sizes)
7. [Usage Guidelines](#usage-guidelines)

---

## Overview

Theme tokens are split across focused files:

- **Colors**: [`src/theme/colors.ts`](src/theme/colors.ts)
- **Dimensions & Spacing**: [`src/theme/dimensions.ts`](src/theme/dimensions.ts)
- **Typography**: [`src/theme/typography.ts`](src/theme/typography.ts)
- **Component Sizes**: [`src/theme/componentSizes.ts`](src/theme/componentSizes.ts)
- **Entry point**: [`src/theme/index.ts`](src/theme/index.ts)

Dimensions use responsive scaling based on a 375×812 baseline (iPhone 11/12):

```tsx
import { SPACING, RADIUS } from '@/theme/dimensions';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';
```

---

## Color System

Base: dark mode only. Same base palette as the user mobile app with admin-specific extensions.

### Core Colors

| Token | Value | Use Case |
|---|---|---|
| `colors.primary` | `#F5F7F8` | Primary text, icons, active states |
| `colors.secondary` | `#FF6B6B` | Destructive actions, reject buttons |
| `colors.background` | `#020404` | Screen backgrounds |
| `colors.surface` | `rgba(245,247,248,0.05)` | Cards, review item backgrounds |
| `colors.surfaceMuted` | `rgba(245,247,248,0.03)` | Subtle section fills |
| `colors.text` | `#F5F7F8` | Primary body text |
| `colors.textMuted` | `rgba(245,247,248,0.7)` | Secondary labels, timestamps |
| `colors.border` | `rgba(245,247,248,0.12)` | Dividers, card borders |
| `colors.muted` | `rgba(245,247,248,0.38)` | Disabled states |
| `colors.overlay` | `rgba(2,4,4,0.7)` | Modal backdrops |
| `colors.inverseText` | `#0F172A` | Text on light surfaces |

### Semantic Colors

| Token | Value | Use Case |
|---|---|---|
| `colors.error` | `#CF6679` | Reject action, validation errors |
| `colors.success` | `#03DAC6` | Approve action, published status |
| `colors.warning` | `#FFB74D` | Review required, flagged content |
| `colors.info` | `#D2E8F7` | Info banners, tips |

### Admin-Specific Colors

| Token | Value | Use Case |
|---|---|---|
| `colors.urgent.background` | `#451A03` | Urgent job badge background |
| `colors.urgent.border` | `#92400E` | Urgent job badge border |
| `colors.urgent.text` | `#FCD34D` | Urgent job badge text |
| `colors.rating.background` | `#FEF9C3` | Rating chip background |
| `colors.rating.text` | `#92400E` | Rating chip text |

### Brand Colors

| Token | Value | Use Case |
|---|---|---|
| `colors.brands.telegram` | `#229ED9` | Telegram share/link button |
| `colors.brands.whatsapp` | `#25D366` | WhatsApp share button |
| `colors.brands.linkedin` | `#0A66C2` | LinkedIn link button |

---

## Spacing System

Spacing uses `mScale()` — a moderate responsive scale that avoids extreme stretching on large screens.

| Token | Base Value | Scales With Screen | Use Case |
|---|---|---|---|
| `SPACING.xxs` | `4` | No | Hairline gaps |
| `SPACING.xs` | `~4` | Yes | Icon gaps, chip inner padding |
| `SPACING.sm` | `~8` | Yes | Compact padding, inline gaps |
| `SPACING.md` | `~16` | Yes | Standard horizontal screen padding |
| `SPACING.lg` | `~24` | Yes | Section padding, card gaps |
| `SPACING.xl` | `~32` | Yes | Between major sections |
| `SPACING.xxl` | `~48` | Yes | Screen-level top/bottom padding |

### Usage

```tsx
import { SPACING } from '@/theme/dimensions';

// Standard card
<View style={{ padding: SPACING.lg, gap: SPACING.sm }} />

// Screen horizontal padding
<View style={{ paddingHorizontal: SPACING.md }} />

// Tight inline row
<View style={{ gap: SPACING.xs }} />
```

---

## Radius System

| Token | Value | Use Case |
|---|---|---|
| `RADIUS.xs` | `4` | Micro elements, inner badges |
| `RADIUS.sm` | `8` | Tags, chips, status pills |
| `RADIUS.md` | `12` | Buttons, input fields |
| `RADIUS.lg` | `16` | Cards, list tiles |
| `RADIUS.xl` | `32` | Large pill buttons |
| `RADIUS.xxl` | `24` | Bottom sheets |
| `RADIUS.full` | `9999` | Avatars, circular icons |

### Usage

```tsx
import { RADIUS } from '@/theme/dimensions';

// Status chip
<View style={{ borderRadius: RADIUS.sm }} />

// Action card
<View style={{ borderRadius: RADIUS.lg }} />

// Approve/reject pill button
<View style={{ borderRadius: RADIUS.xl }} />
```

---

## Typography System

All typography tokens are pre-composed `TextStyle` objects. Import and spread directly.

**File**: [`src/theme/typography.ts`](src/theme/typography.ts)

### Type Scale

| Token | Size | Weight | Line Height | Use Case |
|---|---|---|---|---|
| `typography.largeTitle` | 30 | Heavy (800) | ~33 | Dashboard headers |
| `typography.title1` | 24 | Heavy (800) | ~28 | Screen titles |
| `typography.title2` | 20 | Bold (700) | ~24 | Section headers |
| `typography.title3` | 18 | Bold (700) | ~22 | Card titles |
| `typography.body` | 16 | Regular (400) | ~21 | Primary body copy |
| `typography.bodyStrong` | 16 | Semibold (600) | ~21 | Emphasized body |
| `typography.callout` | 15 | Regular (400) | ~20 | List item text |
| `typography.subheadline` | 14 | Regular (400) | ~18 | Secondary labels |
| `typography.subheadlineStrong` | 14 | Semibold (600) | ~18 | Bold secondary labels |
| `typography.footnote` | 12 | Regular (400) | ~16 | Metadata, timestamps |
| `typography.footnoteStrong` | 12 | Semibold (600) | ~16 | Bold footnotes |
| `typography.caption` | 11 | Regular (400) | ~14 | Fine print |
| `typography.caption2` | 10 | Regular (400) | ~13 | Tiny badges |
| `typography.eyebrow` | 10 | Black (900) | ~13 | Uppercase section labels |
| `typography.button` | 14 | Bold (700) | — | Button labels |
| `typography.tabLabel` | 10 | Heavy (800) | — | Tab bar labels |

### Usage

```tsx
import { typography } from '@/theme/typography';
import { colors } from '@/theme/colors';

// Screen title
<Text style={[typography.title1, { color: colors.text }]}>Pending Review</Text>

// Metadata row
<Text style={[typography.footnote, { color: colors.textMuted }]}>2 hours ago</Text>

// Section eyebrow
<Text style={[typography.eyebrow, { color: colors.textMuted }]}>ATS JOBS</Text>

// Action button
<Text style={[typography.button, { color: colors.background }]}>Approve</Text>
```

---

## Component Sizes

Defined in [`src/theme/componentSizes.ts`](src/theme/componentSizes.ts). Reference before setting fixed heights on buttons, list items, or avatar containers.

---

## Usage Guidelines

### Do

- Import from `@/theme/colors`, `@/theme/dimensions`, `@/theme/typography` — never from sub-paths
- Use `typography.*` tokens for all `Text` components — do not write inline `fontSize`/`fontWeight`
- Use `SPACING.*` for all padding/margin/gap values
- Use `RADIUS.*` for all `borderRadius` values
- Use `colors.success` for approve, `colors.error` for reject — consistently across all admin screens

### Do Not

- Do not hardcode hex values, pixel sizes, or font weights inline
- Do not add one-off colors in component files — add to `colors.ts` and document here
- Do not use `colors.secondary` (`#FF6B6B`) for positive/approve actions
- Do not bypass `mScale` for new dimension tokens — all spatial values must be responsive
