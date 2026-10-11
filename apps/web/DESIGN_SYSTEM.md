# FresherFlow Web — Design System

The normative contract for UI in `apps/web`. Tokens, rules and component
contracts here **outrank** any component's local habits. When code and this
document disagree, the code is wrong.

---

## 0. Hard rules — read first

1. **Tokens are normative.** Values live in `@theme` in
   [`src/app/globals.css`](src/app/globals.css). This document explains them; it
   does not redefine them.
2. **Component contracts override generic styling preference.** Use
   `<Button>`, not a hand-built button.
3. **Never invent a token** when an existing semantic token fits the meaning.
4. **Never use a raw colour** (hex, `rgb()`, palette class) where a semantic
   token exists.
5. **One primary CTA per surface.** If two things both look like *the* action,
   one of them is wrong.
6. **Orange is never an ordinary application CTA.** `--color-ff-accent` is for
   brand moments only.
7. **Navy is never a surface tint.** `bg-primary/10` paints the *ink* colour onto
   a plane. This is the single most common violation in the codebase.
8. **Selected states use `surface-active` + `surface-active-foreground`** — never
   a tint of the ink colour.
9. **Preserve existing visual hierarchy** unless this document explicitly
   changes it.
10. **When the system is silent, prefer the simplest existing pattern** in
    `src/ui/` over inventing a new one.

---

## 1. Design contract

| Concern | Value |
|---|---|
| Purpose | Normative design + implementation contract for `apps/web` |
| Source of truth | `@theme` in `src/app/globals.css` (values); this file (rules) |
| Precedence | Hard rules → Component contracts → this prose → existing code |
| Dark mode | `.dark` block in `globals.css` overrides `--color-*` directly |
| Config style | Tailwind v4 CSS-first. There is no `tailwind.config.ts` |
| Alpha variants | `oklch(from var(--color-*) l c h / <alpha>)` |

Token flow:

```
@theme (OKLCH)  ->  --color-* CSS vars  ->  Tailwind utilities  ->  .dark overrides
```

---

## 2. Product visual intent

FresherFlow is a job and walk-in opportunity platform for Indian freshers. The
interface is a **reading surface for data**, not a brand showcase.

The UI should feel like **warm newsprint with ink on it** — calm, dense,
legible, trustworthy. A user scanning 90 listings at 9am should feel the page is
keeping up with them, not asking for attention.

**What it must not become:**

- A marketing page with product UI bolted on. The landing hero may be
  expressive; a job detail page may not.
- A card-per-element dashboard. Density beats comfort here.
- A purple/blue SaaS gradient wash. There is one accent and it is not doing
  decoration.

**The hard truth about differentiation:** warm newsprint is a common default, so
it earns its place by being *decided*, not by looking pleasant. It is kept
because it is the established foundation and the whole tonal ladder is built on
hue 85 — **not** because it sets FresherFlow apart. The product's value is the
opportunity and community information on the page. Any future palette change
must clear that bar, not a taste argument.

---

## 3. Locked design decisions

*Decided 2026-10-02.*

### Navy is the action colour

Every CTA, primary button, active nav item and interactive emphasis is navy
(`--color-primary`). Rationale: orange is the highest-chroma colour in the
system; spending it on ordinary CTAs exhausts it and leaves the hero with
nothing to lead with. Navy already owns the ink, so a navy button and navy text
are one visual family and reinforce each other.

### Orange is a brand moment only

`--color-ff-accent` appears in the hero, marquee, logo and brand marks. Never on
an ordinary button. Consequence: `BrandButton`'s `solid` (orange) variant is
**deprecated** — use `neutral` (navy) for actions.

### Warm newsprint stays

See §2. Recorded as a choice, not an accident.

### Restrained visual hierarchy

One accent, one action colour, four surfaces, four signals. Restraint is the
point; if everything is emphasised, nothing is.

---

## 4. Colour tokens

All OKLCH. Dark mode overrides the same names in `.dark`.

### 4.1 Ink and action — one navy, two jobs

`--color-primary` is the single navy. It serves exactly two roles, and which one
is decided by **how** you use it:

| Usage | Role |
|---|---|
| `text-primary`, `bg-foreground` | **Ink** — text and text-bearing surfaces |
| `bg-primary` + `text-primary-foreground` | **Action** — the CTA |
| `bg-primary/10` and similar tints | **Never.** That is ink painted on a plane |

| Token | Light | Role |
|---|---|---|
| `--color-primary` | `oklch(20.6% 0.039 266)` | The navy: ink + action |
| `--color-foreground` | → `primary` | Body text |
| `--color-muted-foreground` | `oklch(29.5% 0.034 68)` | Secondary text. 4.9:1 on card, 5.3:1 on muted |

`--color-foreground`, `--color-card-foreground`, `--color-popover-foreground`,
`--color-accent-foreground`, `--color-secondary-foreground`, `--color-ring` and
the sidebar ink tokens **all alias `--color-primary`**. Change the navy in one
place.

> **Dark mode inverts this token.** `--color-primary` is near-white in `.dark`.
> So a `*-foreground` token is only correct when paired with its own surface:
> `bg-primary` → `text-primary-foreground`, `bg-accent` →
> `text-accent-foreground`, `bg-foreground` → `text-background`. Pairing a
> surface with the wrong ink is the most common dark-mode defect.

### 4.2 Surfaces — a four-step ladder

Separated by **lightness, not hue**. Use the role names in new code.

| Role token | Alias | Light | Use for |
|---|---|---|---|
| `--surface-page` | `background` | `#f4f1ea` | The page plane |
| `--surface-raised` | `card` | `oklch(100% 0 0)` | Cards, panels, **the sidebar rail** |
| `--surface-sunken` | `muted` | `oklch(91.5% 0.005 85)` | Inset panels, skeletons, disabled |
| `--surface-active` | `accent` | `oklch(89.5% 0.005 85)` | **Selected / hover — the only active fill** |

Plus `--surface-active-foreground` (→ `accent-foreground`). **Required** with
`--surface-active`: in dark, `accent` is near-white and so is `foreground`, so
`text-foreground` on `bg-surface-active` is invisible.

**Legacy surface aliases.** These still exist and still render correctly, but
they are not part of the ladder. **Do not use them in new code.**

| Legacy token | Migrate to | Used in |
|---|---|---|
| `secondary` | `--surface-sunken` (or `raised` for a lighter fill) | 17 sites |
| `popover` | `--surface-raised` + a border for elevation | 6 sites |
| `paper` | `--surface-raised` / `--surface-page` | 5 sites |
| `surface-warm` | `--surface-sunken` | 9 sites |
| `chip-active` | `--surface-active` | 1 site |
| `dropdown-hover` | `--surface-active` | **0 sites — dead, safe to alias** |

**The sidebar is not a separate palette.** Every `--color-sidebar-*` token
aliases the shared ladder, so the admin shell and the public job pages consume
the same roles:

| Sidebar token | Resolves to |
|---|---|
| `sidebar` | `--surface-raised` |
| `sidebar-border` | `--color-border` |
| `sidebar-accent` | `--surface-active` |
| `sidebar-foreground`, `-primary`, `-ring` | the navy ink |
| `sidebar-accent-foreground` | `--color-accent-foreground` (not `primary`) |

There is also a `--color-logo-bg` for the logo tile only.

**The neutral ramp is warm throughout** — hue 78–88, chroma 0.004–0.013. Chroma
was deliberately dropped from `muted`/`accent`/`chip-active`/`dropdown-hover`
(0.008–0.016 → 0.005): next to the warm page, two warm planes at similar
lightness read as a mismatch, not hierarchy.

**Removed: the second palette.** `globals.css` used to carry `--ff-paper`,
`--ff-paper-raised`, `--ff-rule`, `--ff-ink`, `--ff-ink-soft`, `--ff-ink-faint`,
`--ff-stamp` and `--ff-stamp-lift`. All eight were dead — one reference each,
their own definition. `--ff-ink` (`#17181c`, near-black) competed with the navy
ink and was a primary cause of admin and the job pages reading as two products.
Only `--ff-accent` and the always-dark `--ff-band-*` instrument palette survive;
they are a distinct marketing component, not a competing UI palette.

### 4.3 Lines

`--color-border` and `--color-input` both `oklch(79% 0.013 80)`. One hairline
tone. Warmth on a hairline reads as intentional.

### 4.4 Signals — four jobs, one red

| Job | Token | Light |
|---|---|---|
| Confirmed live | `signal-live` → `success` | `oklch(61.1% 0.147 154)` |
| Aging / unconfirmed | `signal-aging` → `warning` | `oklch(75.5% 0.17 64)` |
| Dead / error / destructive | `signal-dead` → `destructive` | `oklch(63.6% 0.208 25)` |
| Discussion heat | `signal-heat` | `oklch(60% 0.145 240)` |

`--color-error` and `--color-pin` both alias `--color-destructive`. There is
**one red**; three near-identical reds previously made "which red?" unanswerable.

`signal-heat` was byte-identical to `--color-brand-telegram`. A semantic token
and a third-party brand token are different jobs and must never share a value.

### 4.5 Brand accent

`--color-ff-accent` = `oklch(64.8% 0.22 32)` (≈ `#ff571a`). Marketing surfaces only.

**Measured contrast:** paper on accent is **3.2:1** and fails AA at small sizes.
Navy (`--color-ff-accent-ink`) on accent is **4.97:1** and passes. So every solid
accent CTA pairs `bg-ff-accent` with `text-ff-accent-ink`.

`text-ff-accent` **as text on paper** is still only 3.2:1 and remains an open
problem below the 4.5:1 threshold at small sizes. Do not "fix" it by editing
`--ff-accent` — that changes the fill and the logo-adjacent marks too. Fix the
*text usage*.

### 4.6 Third-party

`brand-telegram`, `brand-whatsapp(+hover)`, `brand-linkedin`, `brand-discord`,
`brand-facebook`, `brand-company-blue`, `brand-google-*`. These exist only for
social/brand marks. **Never** use them for UI state.

---

## 5. Typography

Inter via `next/font/google`, applied as `font-sans`.

| Class | Size | Use |
|---|---|---|
| `text-micro` | 11px | Micro-labels |
| `text-xs` | 12px | Badges, timestamps, fine print |
| `text-meta` | 13px | Metadata rows, compact meta |
| `text-sm` | 14px | Secondary text, form labels |
| `text-base` | 16px | Body copy |
| `text-lg` | 18px | Card titles |
| `text-xl` | 20px | Section headers |
| `text-2xl` | 24px | Sub-headers |
| `text-3xl` | 30px | Page titles, hero |

Do not add font sizes outside this scale without extending `@theme` **and** this
table.

---

## 6. Spacing & layout

Tailwind's 4-point scale. Extended: `p-18` / `m-18` = 4.5rem, `p-22` / `m-22` =
5.5rem (hero/section scale only).

Standard: `p-1` 4px · `p-2` 8px · `p-3` 12px · `p-4` 16px · `p-6` 24px ·
`p-8` 32px. Page gutter `px-4`.

Density beats comfort on listing surfaces. A job card is a **wide** row on
desktop, **compact** on mobile — never a full-screen card on either.

---

## 7. Shape & depth

| Token | Value |
|---|---|
| `--radius` | `10px` |
| `--radius-xl` | `10px` |
| `--radius-2xl` | `14px` |
| `--radius-3xl` | `18px` |

`rounded-sm/md/lg` are inherited from the shadcn base import. Buttons own
`rounded-md`; pills use `rounded-full`; `BrandButton` uses `rounded-[2px]`
(near-square, brand geometry).

**There are no shadow tokens.** Elevation is expressed by hairline borders and
surface steps. Do not introduce ad-hoc `box-shadow` values; if a surface needs
lift, add a token first.

---

## 8. Interaction states

| State | Treatment |
|---|---|
| Hover | `[@media(hover:hover)_and_(pointer:fine)]:` guard — never on touch |
| Pressed | `active:scale-[0.97]` + `motion-reduce:transform-none` |
| Selected | `bg-surface-active text-surface-active-foreground` |
| Focus | `focus-visible:ring-2 ring-ring ring-offset-2` |
| Disabled | `disabled:opacity-50 disabled:pointer-events-none` |
| Loading | `Skeleton` or `aria-busy`; never a spinner-only button |
| Error | `text-destructive` on a surface, or `ErrorMessage` |

Hover must be wrapped in the pointer-fine media query so it cannot stick on
touch devices.

---

## 9. Component contracts

### 9.1 `Button` — `src/ui/Button.tsx`

Material heights are a hard floor: **default `h-12` (48px), `sm` `h-10` (40px),
`lg` `h-14` (56px)**, icon 48×48. Minimum text `text-sm`.

**Variants**

| Variant | Treatment |
|---|---|
| `default` | `bg-primary text-primary-foreground` — **the** action |
| `secondary` | `bg-secondary text-secondary-foreground` |
| `outline` | `border border-border bg-background` |
| `ghost` | Transparent, hover `bg-muted` |
| `ghostDanger` | Muted → red on hover (row deletes) |
| `destructive` | `bg-destructive` — destructive confirmation only |
| `admin` | `bg-muted/50` + input border |
| `link` | Underlined text action |

**Sizes** `default`(48) · `sm`(40) · `lg`(56) · `xs`(32) · `icon`(48) ·
`iconSm`(32) · `chip`(40) · `cta`(48) · `ctaCompact`(44) · `ctaSmall`(40) ·
`avatar`(32 circle) · `linkSm`(auto). **Label** `caps` for uppercase tracking.

`ghost`/`admin` hover uses `muted`, **not** `accent` — in dark `accent` is
near-white and would fill the button solid white.

No arbitrary values outside this file.

### 9.2 `BrandButton` — `src/ui/BrandButton.tsx`

Landing/brand geometry: `rounded-[2px]`, semibold. Use only where brand
geometry is wanted — job CTAs use `Button`.

| Variant | Treatment |
|---|---|
| `neutral` | `bg-foreground text-background` — **the** action. Use this. |
| `outline` | Hairline that darkens on hover |
| `selected` | `bg-surface-active text-surface-active-foreground` — saved/toggled-on |
| `ghost` | Icon-only, same height as labelled |
| `solid` | **Deprecated** — orange. Was a second primary CTA. Use `neutral`. |

`asChild` renders the child (e.g. a real `<a>`) so focus and semantics survive.

### 9.3 `Badge` — `src/ui/Badge.tsx`

A badge is **informational, not selected** — it takes a neutral surface, never
`surface-active`.

| Variant | Treatment |
|---|---|
| `default` | `bg-muted text-foreground` — category/tag/count |
| `secondary` | `bg-secondary` — lighter neutral |
| `muted` | Text + hairline only — de-emphasised context |
| `outline` | Text + hairline |
| `success` / `warning` / `destructive` | Signal fills |
| `discord` | `brand-discord` — Discord only |

**Sizes** `xs` · `sm` · `md`.

### 9.4 Remaining primitives

| Component | Path | Contract |
|---|---|---|
| `Card` | `ui/Card.tsx` | `CardHeader/Title/Description/Content/Footer`. Owns padding + border |
| `Input` | `ui/Input.tsx` | Variants `default/search/searchGlow/form/mono`. Owns focus ring |
| `Textarea` | `ui/Textarea.tsx` | Canonical textarea |
| `Select` | `ui/Select.tsx` | Simple native-ish select. Use `Combobox` for search |
| `NativeSelect` | `ui/NativeSelect.tsx` | Native `<select>`; `variant="compact"` for inline |
| `Field` | `ui/Field.tsx` | Label/help/error wrapper for any input |
| `Tabs` | `ui/Tabs.tsx` | Radix. `SimpleTabs`/`TabBar` for `items[]` APIs |
| `Dialog` / `AlertDialog` | `ui/Dialog.tsx` | `AlertDialog` strictly for destructive confirmation |
| `Sheet` | `ui/Sheet.tsx` | Mobile bottom / desktop side drawer |
| `DropdownMenu` / `Popover` | `ui/` | Use `ResponsivePopover` for both breakpoints |
| `Tooltip` | `ui/Tooltip.tsx` | Icon buttons, badges, truncated text |
| `EmptyState` / `ErrorMessage` | `ui/` | Every data surface needs all three states |
| `Skeleton` | `ui/Skeleton.tsx` | Preferred loading state |
| `CompanyLogo` | `features/companies/components/CompanyLogo.tsx` | CDN → Google favicon → initials |
| `JobCard` | `features/jobs/components/JobCard/` | `JobCardResponsive` switches wide/compact |

Icon libraries: **Lucide** for new UI, **Heroicons** for existing code only — do
not mass-migrate.

---

## 10. Patterns

| Pattern | Rule |
|---|---|
| **Job card** | One wide row desktop / compact mobile. `JobCardResponsive` owns the switch. Never a full-screen card |
| **Filters** | Active pill = `pillActive` in `JobFilterBar` → `surface-active`. Inactive = muted |
| **Navigation** | Active item = neutral fill + `font-medium`, per `sidebar.tsx` `data-[active=true]` |
| **Empty / error / loading** | All three required wherever data loads |
| **Detail pages** | Apply CTA names its real destination (`Apply on {ATS}`), never "company website" |
| **Forms** | `Field` + `Input`. Never a bare `<label>` + `<input>` pair |

---

## 11. Accessibility

| Concern | Rule |
|---|---|
| Contrast | Body ≥ 4.5:1, large text/UI ≥ 3:1. Verify in **both** modes |
| Ink pairing | A `*-foreground` token only works with its own surface (§4.1) |
| Focus | Always `focus-visible`. Never `outline-none` without a replacement |
| Target size | ≥ 40px for secondary actions, 48px default (see `Button`) |
| Reduced motion | `motion-reduce:transform-none motion-reduce:transition-none` |
| Colour is never the only signal | Status needs text or an icon too |

---

## 12. Do / Don't

**Do**

```tsx
<div className="bg-card border border-border text-card-foreground" />       // semantic
<div className="bg-surface-active text-surface-active-foreground" />        // selected
<Button variant="default">Apply</Button>                                     // one action
oklch(from var(--color-primary) l c h / 0.35)                                // alpha
```

**Don't**

```tsx
<div className="bg-primary/10 text-primary" />   // ink painted on a plane — rule 7
<div style={{ backgroundColor: '#1a1a1a' }} />   // raw colour — rule 4
<BrandButton variant="solid">Apply</BrandButton> // orange CTA — rule 6
<div className="bg-amber-500/10 text-amber-600" /> // palette class, not a token
```

### Migration map (hardcoded → token)

| Hardcoded | Token |
|---|---|
| `#f5f5f5` | `--surface-sunken` |
| `#6b7280` / `gray-500` | `--color-muted-foreground` |
| `#e5e7eb` / `gray-200` | `--color-border` |
| `bg-[#229ED9]` | `--color-brand-telegram` |
| `bg-[#25D366]` | `--color-brand-whatsapp` |
| `bg-slate-*` / `text-zinc-*` / `bg-stone-*` | Semantic tokens |
| old active chip surface | `--surface-active` |
| old dropdown hover | `--surface-active` |
| old muted surface | `--surface-sunken` |
| old card / paper | `--surface-raised` (or `--surface-page` for the page plane) |
| old sidebar accent | `--surface-active` |
| old `secondary` surface | `--surface-sunken` |

---

## 13. Implementation

| Concern | Rule |
|---|---|
| Config | Tailwind v4 CSS-first. No `tailwind.config.ts` |
| Where things live | Generic → `src/ui/`. Product → `src/features/<domain>/`. Route-only → `src/app/<route>/_components/` |
| Styling | Tailwind utilities. Inline `style` only for dynamic values (e.g. CDN signature) |
| Icons | Lucide (new), Heroicons (existing) |
| Adding a shadcn primitive | Check `src/ui/` first; never install a duplicate |
| Creating a primitive | Not before checking `Field`, `Select`, `Button`, `Badge` |

---

## 14. Changelog

Full migration detail lives in the git history. Batches are independently
reversible; verify contrast in both modes before starting the next.

- **2026-10-02 — Decision recorded.** Navy action, orange brand-only, warm
  newsprint retained. `--surface-*` role tokens added. Four warm-neutral chroma
  values corrected (0.008–0.016 → 0.005). 23 duplicated navy definitions
  collapsed to `var(--color-primary)`. Three reds collapsed to one.
  `signal-heat` unlinked from Telegram. Dark-mode signal tokens added.
- **Batch 1 done.** `Badge.default`, `ModerationNav` active pills and `TopNav`
  "Post a Job" moved onto the ladder; `BrandButton.selected` off `bg-primary/10`.
- **Pending.** Filter pills → settings toggles → detail chips → `BrandButton.solid`
  retirement (3 call sites) → nav icon containers.

---

*Single source of truth for values: [`src/app/globals.css`](src/app/globals.css).*
*This file is the contract for how they may be used.*