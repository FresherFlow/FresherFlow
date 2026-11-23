/**
 * Values for the OG card template.
 *
 * satori cannot read CSS variables or Tailwind classes, so the brand values
 * from `DESIGN_SYSTEM.md` / `globals.css` are mirrored here. Keep this file in
 * sync when those tokens change. Server-only: OG routes are never bundled to
 * the client.
 */

export const OG_TONES = {
    /** Warm off-white paper — deliberately not the light-blue SaaS wash. */
    paper: '#F7F7F5',
    ink: '#151B2B',
    muted: '#5B6270',
    hairline: 'rgba(17,24,39,0.16)',
    /** The one brand accent, used as a thin rule only — never a CTA. */
    orange: '#ff571a',
    white: '#FFFFFF',
    font: 'Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
} as const;
