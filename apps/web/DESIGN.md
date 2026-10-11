---
name: FresherFlow
description: A warm-newsprint reading surface for dense opportunity data. Navy is reserved for actions; selected states are neutral.
colors:
  # ═══ INK ═══════════════════════════════════════════════════════════
  # One ink. Warm near-black, NOT navy — navy is reserved for fills.
  # Atlassian's rule: choose tokens by meaning, never because two values
  # happen to look alike.
  primary: "#17181C"
  primary.dark: "#F2EFE8"
  # Atlassian's text ladder: subtle = secondary, subtlest = tertiary.
  text.subtle: "#57544D"
  text.subtle.dark: "#B5B0A6"
  text.subtlest: "#67635B"
  text.subtlest.dark: "#9A958A"
  text.inverse: "#FBF9F4"
  text.inverse.dark: "#14161A"

  # ═══ SURFACES ══════════════════════════════════════════════════════
  # Four planes, separated by LIGHTNESS alone. Never by hue.
  background: "#F4F1EA"
  background.dark: "#0B0C0E"
  background.raised: "#FBF9F4"
  background.raised.dark: "#16181C"
  background.sunken: "#EFECE4"
  background.sunken.dark: "#1E2126"
  # SELECTED IS NEUTRAL. Atlassian shipped exactly this migration: "color
  # tokens for selected states use neutral colors instead of blue." A tinted
  # selection competes with real actions.
  background.selected: "#E6E2D9"
  background.selected.dark: "#2A2E35"
  background.hovered: "#EFECE4"
  background.hovered.dark: "#1E2126"
  background.pressed: "#E6E2D9"
  background.pressed.dark: "#2A2E35"
  # The ONE action fill.
  background.bold: "#1E2A4A"
  background.bold.dark: "#E8E4DA"
  background.bold.hovered: "#141D33"
  background.bold.hovered.dark: "#FFFFFF"
  background.bold.pressed: "#0F1626"
  background.bold.pressed.dark: "#C9C4B8"
  background.input: "#FBF9F4"
  background.input.dark: "#16181C"
  background.input.hovered: "#F4F1EA"
  background.input.hovered.dark: "#1E2126"
  background.disabled: "#EFECE4"
  background.disabled.dark: "#1E2126"
  background.skeleton: "#EFECE4"
  background.skeleton.dark: "#1E2126"
  background.overlay: "#17181C5C"
  background.overlay.dark: "#00000099"
  background.logo: "#0E1420"
  background.logo.dark: "#0E1420"

  # ═══ INTERACTION ══════════════════════════════════════════════════
  # Atlassian: the ONLY mechanism for hover/press when the background
  # cannot change — avatars, logos, a job card's company tile.
  # These are overlays with no text pairing, so they live in the Border &
  # interaction table below rather than in front matter: Google's component
  # schema can only reference a token as a backgroundColor, and an overlay
  # alpha is not a surface anyone puts text on. Declaring them here would
  # only produce orphaned-token warnings.
  # ═══ BORDER ═══════════════════════════════════════════════════════
  # Also table-only, for the same reason: Google's component schema has no
  # `borderColor` property, so a border token can never be referenced by a
  # component. Atlassian's `border.strong` is the one that passes min 3:1.

  # ═══ SEMANTIC ═════════════════════════════════════════════════════
  # Atlassian: semantic means the colour COMMUNICATES something.
  # danger, warning, success, information — one job each, ONE red.
  background.success: "#2E7D52"
  background.success.dark: "#4CAF7D"
  background.warning: "#99610D"
  background.warning.dark: "#D9A24A"
  background.danger: "#B03A2E"
  background.danger.dark: "#E8776A"
  background.information: "#3A6EA5"
  background.information.dark: "#7FAAD6"

  text.success: "#1F6B44"
  text.success.dark: "#8FD3AC"
  text.warning: "#7A4A0A"
  text.warning.dark: "#E8C48A"
  text.danger: "#9B2C22"
  text.danger.dark: "#F2A79E"
  text.information: "#2F5A8A"
  text.information.dark: "#A8C8E8"

  # ═══ ACCENT ═══════════════════════════════════════════════════════
  # Atlassian: accent is for when NO meaning is tied to the colour.
  # Orange is brand-only — hero, marquee, logo, store marks. Never a button.
  background.accent: "#FF571A"
  background.accent.dark: "#FF571A"
  text.accent: "#C2410C"
  text.accent.dark: "#FF8A5C"

  # ═══ INTERACTION ══════════════════════════════════════════════════
  # Atlassian: the ONLY mechanism for hover/press when the background
  # cannot change — avatars, logos, a job card's company tile.
  # These are overlays with no text pairing, so they live in the border &
  # interaction table below rather than in front matter: Google's component
  # schema can only reference a token as a backgroundColor, and an overlay
  # alpha is not a surface anyone puts text on. Declaring them here would
  # only produce orphaned-token warnings.
typography:
  heading.page:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: 700
  heading.section:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 600
  body:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
  body.meta:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 500
rounded:
  detail: 4px
  supporting: 6px
  interactive: 8px
  containment: 12px
  page: 16px
  full: 9999px
spacing:
  compact: 4px
  tight: 8px
  snug: 12px
  base: 16px
  loose: 24px
  section: 32px
  block: 48px
  hero: 64px
components:
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.primary}"
  page-dark:
    backgroundColor: "{colors.background.dark}"
    textColor: "{colors.primary.dark}"
  nav-rail:
    backgroundColor: "{colors.background}"
    textColor: "{colors.primary}"
  nav-item:
    backgroundColor: "{colors.background}"
    textColor: "{colors.text.subtle}"
  nav-item-selected:
    backgroundColor: "{colors.background.selected}"
    textColor: "{colors.primary}"
  nav-item-selected-hovered:
    backgroundColor: "{colors.background.pressed}"
  nav-item-selected-hovered-dark:
    backgroundColor: "{colors.background.pressed.dark}"
  card:
    backgroundColor: "{colors.background.raised}"
    textColor: "{colors.primary}"
  card-dark:
    backgroundColor: "{colors.background.raised.dark}"
    textColor: "{colors.primary.dark}"
  card-inset:
    backgroundColor: "{colors.background.sunken}"
    textColor: "{colors.primary}"
  card-inset-dark:
    backgroundColor: "{colors.background.sunken.dark}"
    textColor: "{colors.primary.dark}"
  card-hovered:
    backgroundColor: "{colors.background.hovered}"
  text-secondary:
    backgroundColor: "{colors.background.raised}"
    textColor: "{colors.text.subtle}"
  text-secondary-dark:
    backgroundColor: "{colors.background.raised.dark}"
    textColor: "{colors.text.subtle.dark}"
  text-tertiary:
    backgroundColor: "{colors.background.raised}"
    textColor: "{colors.text.subtlest}"
  text-on-bold:
    backgroundColor: "{colors.background.bold}"
    textColor: "{colors.text.inverse}"
  text-on-bold-dark:
    backgroundColor: "{colors.background.bold.dark}"
    textColor: "{colors.text.inverse.dark}"
  button-primary:
    backgroundColor: "{colors.background.bold}"
    textColor: "{colors.text.inverse}"
    rounded: "{rounded.interactive}"
    padding: 12px
  button-primary-hovered:
    backgroundColor: "{colors.background.bold.hovered}"
  button-primary-pressed:
    backgroundColor: "{colors.background.bold.pressed}"
  button-secondary:
    backgroundColor: "{colors.background.sunken}"
    textColor: "{colors.primary}"
    rounded: "{rounded.interactive}"
    padding: 12px
  button-outline:
    backgroundColor: "{colors.background.raised}"
    textColor: "{colors.primary}"
    rounded: "{rounded.interactive}"
    padding: 12px
  button-danger:
    backgroundColor: "{colors.background.danger}"
    textColor: "{colors.text.inverse}"
    rounded: "{rounded.interactive}"
    padding: 12px
  button-accent:
    backgroundColor: "{colors.background.accent}"
    textColor: "{colors.primary}"
    rounded: "{rounded.interactive}"
    padding: 12px
  input:
    backgroundColor: "{colors.background.input}"
    textColor: "{colors.primary}"
    rounded: "{rounded.detail}"
  input-hovered:
    backgroundColor: "{colors.background.input.hovered}"
  input-disabled:
    backgroundColor: "{colors.background.disabled}"
    textColor: "{colors.text.subtlest}"
  badge-default:
    backgroundColor: "{colors.background.sunken}"
    textColor: "{colors.primary}"
  badge-success:
    backgroundColor: "{colors.background.success}"
    textColor: "{colors.text.inverse}"
  badge-warning:
    backgroundColor: "{colors.background.warning}"
    textColor: "{colors.text.inverse}"
  badge-danger:
    backgroundColor: "{colors.background.danger}"
    textColor: "{colors.text.inverse}"
  badge-information:
    backgroundColor: "{colors.background.information}"
    textColor: "{colors.text.inverse}"
  badge-success-dark:
    backgroundColor: "{colors.background.success.dark}"
    textColor: "{colors.text.inverse.dark}"
  badge-warning-dark:
    backgroundColor: "{colors.background.warning.dark}"
    textColor: "{colors.text.inverse.dark}"
  badge-danger-dark:
    backgroundColor: "{colors.background.danger.dark}"
    textColor: "{colors.text.inverse.dark}"
  badge-information-dark:
    backgroundColor: "{colors.background.information.dark}"
    textColor: "{colors.text.inverse.dark}"
  label-success:
    backgroundColor: "{colors.background.raised}"
    textColor: "{colors.text.success}"
  label-warning:
    backgroundColor: "{colors.background.raised}"
    textColor: "{colors.text.warning}"
  label-danger:
    backgroundColor: "{colors.background.raised}"
    textColor: "{colors.text.danger}"
  label-information:
    backgroundColor: "{colors.background.raised}"
    textColor: "{colors.text.information}"
  label-accent:
    backgroundColor: "{colors.background.raised}"
    textColor: "{colors.text.accent}"
  label-success-dark:
    backgroundColor: "{colors.background.raised.dark}"
    textColor: "{colors.text.success.dark}"
  label-danger-dark:
    backgroundColor: "{colors.background.raised.dark}"
    textColor: "{colors.text.danger.dark}"
  skeleton:
    backgroundColor: "{colors.background.skeleton}"
  logo-tile:
    backgroundColor: "{colors.background.logo}"
    textColor: "{colors.text.inverse}"
    rounded: "{rounded.containment}"
  dialog:
    backgroundColor: "{colors.background.raised}"
    textColor: "{colors.primary}"
    rounded: "{rounded.page}"
  dialog-overlay:
    backgroundColor: "{colors.background.overlay}"
    rounded: "{rounded.page}"
  # ── Dark counterparts. Atlassian ships Light|Dark side by side rather
  # than inverting at runtime; Google's flat schema has no theme axis, so the
  # dark value is an explicit `.dark` token and every pairing gets checked.
  page-dark-alt:
    backgroundColor: "{colors.background.dark}"
    textColor: "{colors.text.subtlest.dark}"
  nav-item-selected-dark:
    backgroundColor: "{colors.background.selected.dark}"
    textColor: "{colors.primary.dark}"
  card-hovered-dark:
    backgroundColor: "{colors.background.hovered.dark}"
  text-tertiary-dark:
    backgroundColor: "{colors.background.raised.dark}"
    textColor: "{colors.text.subtlest.dark}"
  button-primary-hovered-dark:
    backgroundColor: "{colors.background.bold.hovered.dark}"
  button-primary-pressed-dark:
    backgroundColor: "{colors.background.bold.pressed.dark}"
  button-accent-dark:
    backgroundColor: "{colors.background.accent.dark}"
    # `primary`, NOT `primary.dark`. The brand orange is theme-independent —
    # it is the same #FF571A in both themes — so its ink must be too. A
    # theme-independent fill needs a theme-independent ink: near-white
    # (primary.dark) on orange is 2.76:1.
    textColor: "{colors.primary}"
  input-dark:
    backgroundColor: "{colors.background.input.dark}"
    textColor: "{colors.primary.dark}"
  input-hovered-dark:
    backgroundColor: "{colors.background.input.hovered.dark}"
  input-disabled-dark:
    backgroundColor: "{colors.background.disabled.dark}"
    textColor: "{colors.text.subtlest.dark}"
  label-warning-dark:
    backgroundColor: "{colors.background.raised.dark}"
    textColor: "{colors.text.warning.dark}"
  label-information-dark:
    backgroundColor: "{colors.background.raised.dark}"
    textColor: "{colors.text.information.dark}"
  label-accent-dark:
    backgroundColor: "{colors.background.raised.dark}"
    textColor: "{colors.text.accent.dark}"
  skeleton-dark:
    backgroundColor: "{colors.background.skeleton.dark}"
  logo-tile-dark:
    backgroundColor: "{colors.background.logo.dark}"
    textColor: "{colors.text.inverse}"
    rounded: "{rounded.containment}"
  dialog-overlay-dark:
    backgroundColor: "{colors.background.overlay.dark}"
    rounded: "{rounded.page}"
---

## Overview

FresherFlow is a job and walk-in opportunity platform for Indian freshers. This
file is the **normative token set**: Google's `DESIGN.md` format (YAML front
matter of machine-readable tokens, plus prose rationale) written in Atlassian's
naming anatomy — `color.<property>.<role>.<emphasis>.<state>`.

Values are implemented as Tailwind v4 `@theme` tokens in
[`src/app/globals.css`](src/app/globals.css). `globals.css` may name things
differently; the **pairing and meaning declared here are normative**.

Validate with `designmd lint DESIGN.md`. Every text-on-surface pair below is
declared as a component precisely so the linter can check it.

The interface is a **reading surface for dense data**, not a brand showcase. A
user scanning ninety listings at 9am should feel the page keeping up, not asking
for attention.

Warm newsprint is retained by decision, not by default. Warm cream is a common
starting point, so it earns its place by being chosen — it is the established
foundation and the whole neutral ramp is built on one warm hue. **The product's
value is the opportunity and community information on the page.** Any future
palette change must clear that bar, not a taste argument.

## Colors

**One ink.** `primary` is warm near-black `#17181C`. Every text run resolves to
it, `text.subtle` (secondary — navigation, labels, captions), or `text.subtlest`
(tertiary — metadata, placeholders, helper text). It is deliberately not navy.

**One action colour.** `background.bold` (navy `#1E2A4A`) is the only
interactive fill. Tinting it to fake a selection is the single most common
violation in this codebase: it paints the action colour onto a plane, so a
selected row reads as a button.

**Selected is neutral, and that rule has precedent.** Atlassian shipped exactly
this migration — *"color tokens for selected states use neutral colors instead
of blue"* — because a tinted selection competes with real actions.

**Four planes, separated by lightness, never hue.**

| Role | Light | Use |
|---|---|---|
| `background` | `#F4F1EA` | The page, and the sidebar rail |
| `background.raised` | `#FBF9F4` | Cards, menus, dialogs, inputs |
| `background.sunken` | `#EFECE4` | Inset panels, skeletons, disabled, secondary buttons |
| `background.selected` | `#E6E2D9` | Selected and hover — the only active fill |

`#FBF9F4` rather than `#FFFFFF` is deliberate. Pure white is a decision, and
against warm newsprint it reads clinical; the page-to-card step is carried by
lightness, so the hierarchy survives without the cold cast.

**Accent versus semantic.** Atlassian's organising distinction, adopted here:
**accent** is for when *no meaning* is tied to the colour; **semantic** is for
when the colour *communicates* something. `background.accent` (orange) is brand
only. `success` / `warning` / `danger` / `information` each carry exactly one
meaning. There is **one red** — the codebase previously had three
near-identical ones (`error`, `destructive`, `pin`) and "which red?" had no
answer.

**Interaction overlays.** Atlassian scopes these deliberately narrow: hover and
press for elements whose background *cannot* change — a company logo tile, an
avatar, a job card's mark. Everywhere else, the background itself changes.

**Border & interaction — table only.** These carry no text pairing, so they sit
here in Atlassian's Light|Dark form rather than in the front matter. Google's
component schema has no `borderColor` property, and an overlay alpha is not a
surface anyone puts text on, so neither can be referenced by a component.

| Role | Light | Dark |
|---|---|---|
| `border` | `#DED8CB` | `#2E3239` |
| `border.subtle` | `#E6E2D9` | `#23272D` |
| `border.strong` — passes min 3:1 | `#C4BDAE` | `#4A5058` |
| `border.input` | `#C4BDAE` | `#4A5058` |
| `border.selected` | `#1E2A4A` | `#E8E4DA` |
| `border.focused` | `#1E2A4A` | `#E8E4DA` |
| `border.disabled` | `#E6E2D9` | `#23272D` |
| `interaction.hovered` | `#17181C14` | `#FFFFFF14` |
| `interaction.pressed` | `#17181C29` | `#FFFFFF29` |

**Selection is also a width, not only a colour.** Atlassian carries
`border.width` 1px, `border.width.selected` 2px, `border.width.focused` 2px —
selection and focus are expressed as a heavier stroke as well as a fill, so
neither depends on colour alone.

## Typography

Five roles, no more: `heading.page` 30px, `heading.section` 20px, `body` 16px,
`body.meta` 13px, `caption` 11px. Weight budget follows Atlassian: regular for
body, medium beside iconography, semibold only where fallback fonts will not
degrade it. A new size is added here first, or not at all.

## Layout

Spacing is tiered, not arithmetic: `compact` 4px · `tight` 8px · `snug` 12px ·
`base` 16px · `loose` 24px · `section` 32px · `block` 48px · `hero` 64px.

Density beats comfort on listing surfaces. A job row is wide on desktop, compact
on mobile, never a full-screen card on either.

## Elevation & Depth

Surface and shadow are **paired**, never used apart — Atlassian states this
rule explicitly for both `raised` and `overlay`.

```css
/* overlay: modals, dropdowns, popovers */
box-shadow: 0 8px 12px oklch(from var(--color-primary) l c h / 0.15),
            0 0 1px oklch(from var(--color-primary) l c h / 0.31);

/* raised: a lifted card */
box-shadow: 0 1px 1px oklch(from var(--color-primary) l c h / 0.25),
            0 0 1px oklch(from var(--color-primary) l c h / 0.31);
```

The codebase currently has four ad-hoc `rgba(0, 0, 0, N)` values and no tokens
at all; they collapse into these two recipes.

## Shapes

Radius is chosen by **role**, following Atlassian — not by size, which is why
`rounded-lg` and `rounded-md` drifted into synonyms here.

| Role | Value | Applies to |
|---|---|---|
| `detail` | 4px | Badges, checkboxes, inputs, avatar labels |
| `supporting` | 6px | Tags, tooltips, timestamps |
| `interactive` | 8px | Buttons, selects, nav items |
| `containment` | 12px | Cards, dropdowns, floating UI |
| `page` | 16px | Modals, large containers |
| `full` | 9999px | Avatars, pills |

One radius per element class, never mixed within a row.

## Components

Each entry is a role, not an implementation. Note that states are separate
tokens — `button-primary`, `button-primary-hovered`, `button-primary-pressed` —
so a state can never drift from its base, which is what happens when states are
expressed as opacity over a shared fill.

Note also that Atlassian's state vocabulary is `hovered`, `pressed`, `selected`,
`disabled`, `focused`, `visited`. There is no `active` token: **`active:` in CSS
means pressed**, which is a different thing from selected.

**A theme-independent fill needs a theme-independent ink.** The brand orange is
the same `#FF571A` in both themes, so its label is `primary` (near-black) in
both — not `primary.dark`. The linter caught this: near-white on orange is
2.76:1. This generalises — any token that does not flip with the theme must not
be paired with a token that does.

## Do's and Don'ts

**Do**

```tsx
<div className="bg-background" />                  // the page plane
<div className="bg-background-raised border" />   // a card
<div className="bg-background-selected" />         // selected, nothing else
<Button variant="default">Apply</Button>           // navy, the one action
```

**Don't**

```tsx
<div className="bg-primary/10" />          // action colour painted on a plane
<div style={{ backgroundColor: '#1a1a1a' }} />   // raw colour, not a token
<Button variant="accent">Apply</Button>    // orange is brand-only
<div className="bg-amber-500/10" />        // palette class, not a token
<div className="bg-white" />               // pure white is not a surface here
```

Pick tokens by **meaning**, never because two values happen to look alike — a
value-based pick has no defined behaviour when the theme inverts.