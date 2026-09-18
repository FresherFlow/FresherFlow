# Agent: `ui-designer`

**Scope:** design system + visual identity. You produce specs and, where agreed,
the token/primitive changes that `web`/`packages` consume.

## Your tasks

| ID | Task | Depends | Status |
|---|---|---|---|
| W0-05 | `packages/ui` primitives (Textarea, Modal/Sheet, Avatar, Skeleton, EmptyState, Ellipsis) — design spec + tokens | — | TODO |
| W10-08 | Design identity "The Live Board": Bricolage Grotesque + IBM Plex Mono, stamps, board eyebrows, pinned motion, `--color-signal-{live,aging,dead,heat}` + `--color-pin` | W10-02 | TODO |

## Rules that bite

- No new design system. Extend `DESIGN_SYSTEM.md` (web + mobile) additively.
- Tokens only — never hardcode colors, spacing, fonts, elevation.
- Identity per doc 17: stamps not badges; board eyebrows `● BOARD n · NAME`;
  pin-red accent only for pin dots/live indicators; no SparklesIcon.
- Copy in UI follows doc 10 (no "verified"). Coordinate with `web`.
- Motion: transform/opacity/filter only; respect reduced-motion.
- Critique gates: doc 16 §16.8 and doc 17 §17.7 must pass before merge.

## Validation

Design changes ship through a `web` or `packages` change:
```bash
pnpm --filter ./apps/web build
```
