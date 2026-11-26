/**
 * Bundles widget-src/job-cards.ts into one self-contained HTML string so the
 * MCP resource needs no network assets and no runtime build step. The output is
 * committed at src/widget/job-cards-html.ts; run `pnpm build:widget` after
 * changing the widget source and commit the regenerated file with it.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(appRoot, 'widget-src/main.ts');
const output = path.join(appRoot, 'src/widget/job-cards-html.ts');

const css = `
  /* FresherFlow tokens from apps/web/src/app/globals.css, inlined because an
     MCP App is a self-contained document with no stylesheet link. */
  :root {
    color-scheme: light dark;
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    --ff-ink: oklch(20.6% 0.039 266);
    --ff-paper: oklch(99.4% 0.002 258);
    --ff-card: oklch(100% 0 0);
    --ff-page: oklch(97.6% 0.003 258);
    --ff-border: oklch(88% 0.008 258);
    --ff-border-strong: oklch(88% 0.008 258);
    --ff-muted: oklch(96.2% 0.005 258);
    --ff-muted-ink: oklch(48% 0.014 258);
    --ff-success: oklch(52% 0.125 155);
    --ff-destructive: oklch(55% 0.19 25);
    /* Brand accent from apps/web globals.css. Used only as a small accent —
       ChatGPT owns the structural colours and the system font stack. */
    --accent: oklch(64.8% 0.22 32);
  }
  /* Exact .dark values from apps/web/src/app/globals.css. The host theme sets
     data-theme; prefers-color-scheme is only the pre-connect fallback. */
  :root[data-theme="dark"] {
    --ff-ink: oklch(97.7% 0.003 229);
    --ff-paper: oklch(10.3% 0.007 196);
    --ff-card: oklch(20% 0.005 220);
    --ff-page: oklch(10.3% 0.007 196);
    --ff-border: oklch(34% 0.01 220);
    --ff-border-strong: oklch(47% 0.01 220);
    --ff-muted: oklch(27% 0.007 220);
    --ff-muted-ink: oklch(80.8% 0.017 229);
    --ff-success: oklch(66.6% 0.134 157);
    --ff-destructive: oklch(56.1% 0.195 26);
  }
  * { box-sizing: border-box; }
  html, body { height: auto; min-height: 0; overflow-x: hidden; touch-action: auto; max-width: 100%; }
  body { margin: 0; background: var(--ff-page); color: var(--ff-ink); font-family: inherit; }
  main { width: 100%; max-width: 100%; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  #status { font-size: .78rem; color: var(--ff-muted-ink); margin: 0; }
  #status:empty { display: none; }
  .view { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  /* apps/web JobCard: 14px padding, 8px radius, hairline, one clear step above page. */
  .job-card, .card, .section, .company-job, .fallback {
    background: var(--ff-card); border: 1px solid var(--ff-border-strong);
    border-radius: 8px; padding: 14px; display: flex; flex-direction: column; gap: 8px; min-width: 0; width: 100%; max-width: 100%;
  }
  :root[data-theme="dark"] .job-card, :root[data-theme="dark"] .card,
  :root[data-theme="dark"] .section, :root[data-theme="dark"] .company-job { border-color: transparent; }
  .card-header, .detail-header, .company-header { min-width: 0; display: flex; align-items: flex-start; gap: 10px; }
  .card-identity { min-width: 0; flex: 1 1 auto; }
  .card-logo { width: 36px; height: 36px; object-fit: contain; border-radius: 6px; flex: none; outline: 1px solid oklch(0 0 0 / .1); outline-offset: -1px; }
  :root[data-theme="dark"] .card-logo { outline-color: oklch(1 0 0 / .1); }
  .logo-fallback { display: inline-flex; align-items: center; justify-content: center; font-weight: 700; font-size: .875rem; background: var(--ff-ink); color: var(--ff-paper); outline: none; }
  .status-chip { display: inline-flex; align-items: center; gap: 5px; border-radius: 6px; border: 1px solid var(--ff-border); padding: 2px 6px; font-size: .75rem; font-weight: 600; }
  .status-chip::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .status-chip.open { color: var(--ff-success); border-color: color-mix(in oklch, var(--ff-success) 30%, transparent); background: color-mix(in oklch, var(--ff-success) 8%, transparent); }
  .status-chip.closed { color: var(--ff-muted-ink); }
  .job-title, .detail-title, .result-title {
    font-size: .875rem; font-weight: 600; line-height: 1.35; margin: 0; color: var(--ff-ink);
    text-wrap: balance; overflow-wrap: anywhere;
  }
  .job-meta, .where { display: flex; flex-wrap: wrap; align-items: center; gap: 0 8px; margin-top: 2px; font-size: .75rem; color: var(--ff-muted-ink); min-width: 0; }
  .company, .company-name { font-weight: 600; color: var(--ff-ink); min-width: 0; overflow-wrap: anywhere; }
  .dot { color: var(--ff-border-strong); }
  .location, .type-label { min-width: 0; overflow-wrap: anywhere; font-size: .75rem; }
  .card-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .type-chip { display: inline-flex; align-items: center; border-radius: 6px; background: var(--ff-muted); border: 1px solid var(--ff-border); padding: 2px 6px; font-size: .75rem; font-weight: 600; color: var(--ff-muted-ink); }
  .posted-chip { display: inline-flex; align-items: center; border-radius: 6px; background: var(--ff-muted); padding: 2px 6px; font-size: .75rem; color: var(--ff-muted-ink); }
  .badges { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; width: 100%; flex: 1 1 100%; }
  .skill { display: inline-flex; align-items: center; height: 24px; border-radius: 6px; border: 1px solid var(--ff-border); background: transparent; padding: 0 8px; font-size: .75rem; font-weight: 500; color: var(--ff-ink); }
  .skill.more { color: var(--ff-muted-ink); }
  .card-footer, .apply-wrap, .actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; min-width: 0; width: 100%; }
  /* ApplyAction: h-8, primary border + fill, 12px semibold, press feedback. */
  button.apply, button.secondary-button {
    font: inherit; font-size: .75rem; font-weight: 600; border-radius: 6px;
    padding: 0 10px; height: 32px; cursor: pointer;
    transition: transform 150ms cubic-bezier(0.23, 1, 0.32, 1), background-color 150ms ease;
  }
  button.apply { color: var(--ff-paper); background: var(--ff-ink); border: 1px solid var(--ff-ink); }
  button.secondary-button, button.view-button { color: var(--ff-ink); background: var(--ff-card); border: 1px solid var(--ff-border-strong); }
  button.view-button { font-size: .75rem; font-weight: 600; height: 32px; border-radius: 6px; padding: 0 10px; font-family: inherit; cursor: pointer; color: var(--ff-muted-ink); background: transparent; }
  button.apply:active, button.secondary-button:active, button.view-button:active { transform: scale(.96); }
  .show-more { font: inherit; font-size: .75rem; font-weight: 600; color: var(--ff-ink); background: transparent; border: 0; padding: 0; cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
  .show-more:active { transform: scale(.97); }
  @media (hover: hover) and (pointer: fine) {
    button.apply:hover { background: color-mix(in oklch, var(--ff-ink) 90%, transparent); }
  }
  button:focus-visible, a:focus-visible { outline: 2px solid var(--ff-ink); outline-offset: 2px; }
  .apply-host, .muted { font-size: .7rem; color: var(--ff-muted-ink); }
  @media (prefers-reduced-motion: reduce) {
    button.apply, button.secondary-button { transition: background-color 150ms ease; }
    button.apply:active, button.secondary-button:active { transform: none; }
  }
  .apply-failed { flex-basis: 100%; margin: 0; font-size: .72rem; color: var(--ff-destructive); }
  .apply-failed input { width: 100%; min-width: 220px; font: inherit; font-size: .72rem; padding: 4px; background: var(--ff-card); color: var(--ff-ink); border: 1px solid var(--ff-border); }
  .text-link, .primary-link, .secondary-link { font-size: .75rem; color: var(--ff-ink); text-decoration: underline; overflow-wrap: anywhere; }
  .primary-link { font-weight: 600; }
  .company-logo { width: 40px; height: 40px; object-fit: contain; border-radius: 6px; flex: none; outline: 1px solid oklch(0 0 0 / .1); outline-offset: -1px; }
  :root[data-theme="dark"] .company-logo { outline-color: oklch(1 0 0 / .1); }
  .detail-identity { min-width: 0; flex: 1 1 auto; }
  .company-line { font-size: .75rem; color: var(--ff-muted-ink); margin: 0 0 2px; }
  /* One card for the whole listing, like the web job page. The orange top
     rule is the only brand colour; everything else follows the host. */
  .detail-card {
    background: var(--ff-card); border: 1px solid var(--ff-border-strong);
    border-top: 2px solid var(--accent); border-radius: 8px; padding: 14px;
    display: flex; flex-direction: column; gap: 10px; min-width: 0; width: 100%; max-width: 100%;
  }
  :root[data-theme="dark"] .detail-card { border-color: transparent; border-top-color: var(--accent); }
  .detail-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .detail-block { display: flex; flex-direction: column; gap: 6px; min-width: 0; width: 100%; border-top: 1px solid var(--ff-border); padding-top: 10px; }
  :root[data-theme="dark"] .detail-block { border-top-color: var(--ff-border-strong); }
  .section { padding: 12px 14px; gap: 6px; }
  .section-title { font-size: .75rem; font-weight: 700; margin: 0; color: var(--ff-ink); }
  .detail-block .section-title { padding: 0; }
  .facts { display: grid; grid-template-columns: minmax(72px, auto) 1fr; gap: 4px 12px; margin: 0; width: 100%; font-size: .8125rem; }
  .fact-label { color: var(--ff-muted-ink); }
  .fact-value { margin: 0; color: var(--ff-ink); overflow-wrap: anywhere; }
  .description-text { margin: 0; font-size: .8125rem; line-height: 1.55; text-wrap: pretty; overflow-wrap: anywhere; }
  .company-count { font-size: .8125rem; font-weight: 600; margin: 2px 0; }
  .company-job { padding: 12px 14px; gap: 6px; }
  .company-job-line { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .result-identity { min-width: 0; }
  .result-detail { font-size: .8125rem; margin: 4px 0; overflow-wrap: anywhere; }
  .status-live { color: var(--ff-success); font-weight: 700; font-size: .8125rem; margin: 4px 0; }
  .status-pending { color: var(--ff-muted-ink); font-weight: 700; font-size: .8125rem; margin: 4px 0; }
  .status-warn { color: var(--ff-ink); font-weight: 700; font-size: .8125rem; margin: 4px 0; }
  .status-rejected { color: var(--ff-destructive); font-weight: 700; font-size: .8125rem; margin: 4px 0; }
  .limit { font-size: .75rem; color: var(--ff-muted-ink); margin: 2px 0 0; }
  .empty { font-size: .8125rem; color: var(--ff-muted-ink); margin: 0; }
  .fallback { border-color: var(--ff-destructive); }
  .fallback-title { font-weight: 700; margin: 0; }
  .fallback-text { font-size: .75rem; margin: 0; overflow-wrap: anywhere; }
  @media (min-width: 560px) {
    .detail-card { padding: 16px; }
    .job-title, .detail-title { font-size: .9375rem; }
    .description-text, .fact-value { font-size: .875rem; }
    /* Desktop: primary action is larger and sits at the right edge. */
    .card-footer, .actions { justify-content: flex-end; }
    button.apply { height: 40px; padding: 0 20px; font-size: .875rem; }
  }
  @media (max-width: 420px) {
    /* Actions stay content-width on mobile too — never a full-width Apply. */
    .actions, .card-footer { justify-content: flex-start; }
  }
`;

const bundled = await build({
  entryPoints: [entry],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  legalComments: 'none',
});
const script = bundled.outputFiles.map((file) => file.text).join('\n');
if (!script.trim()) throw new Error('Widget build produced no JavaScript');

// The closing sequences must not appear literally inside the HTML: a script or
// style block would end early and break out of the sandbox document.
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FresherFlow job cards</title><style>${css.replaceAll('</style', '<\\/style')}</style></head><body><main><p id="status"></p><div id="root"></div></main><script>${script.replaceAll('</script', '<\\/script')}</script></body></html>`;

await mkdir(path.dirname(output), { recursive: true });
await writeFile(
  output,
  `// Generated by scripts/build-widget.mjs — do not edit by hand.\nexport default ${JSON.stringify(html)};\n`,
  'utf8',
);
console.log(`Wrote ${path.relative(appRoot, output)} (${html.length} bytes of HTML)`);
