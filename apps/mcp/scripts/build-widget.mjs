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
const entry = path.join(appRoot, 'widget-src/job-cards.ts');
const output = path.join(appRoot, 'src/widget/job-cards-html.ts');

const css = `
  /* FresherFlow tokens from apps/web/src/app/globals.css, inlined because an
     MCP App is a self-contained document with no stylesheet link. */
  :root {
    color-scheme: light dark;
    font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;
    --ff-ink: oklch(20.6% 0.039 266);
    --ff-paper: oklch(98.5% 0.002 258);
    --ff-card: oklch(100% 0 0);
    --ff-page: oklch(97.6% 0.003 258);
    --ff-border: oklch(88% 0.008 258);
    --ff-muted: oklch(96.2% 0.005 258);
    --ff-muted-ink: oklch(48% 0.014 258);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --ff-ink: oklch(94% 0.01 258);
      --ff-paper: oklch(20% 0.02 266);
      --ff-card: oklch(24% 0.02 266);
      --ff-page: oklch(18% 0.018 266);
      --ff-border: oklch(36% 0.015 258);
      --ff-muted: oklch(28% 0.015 258);
      --ff-muted-ink: oklch(70% 0.02 258);
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--ff-page); color: var(--ff-ink); }
  main { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  #status { font-size: .78rem; color: var(--ff-muted-ink); margin: 0; }
  #status:empty { display: none; }

  /* Mirrors JobCard.tsx: white card, hairline border, compact row, 8px radius. */
  .card {
    background: var(--ff-card);
    border: 1px solid var(--ff-border);
    border-radius: .5rem; /* rounded-lg */
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .title-row { min-width: 0; }
  .job-title {
    font-size: .875rem; font-weight: 600; line-height: 1.35;
    margin: 0; color: var(--ff-ink);
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .where {
    display: flex; flex-wrap: wrap; align-items: center; gap: 0 8px;
    margin-top: 5px; font-size: .75rem; color: var(--ff-muted-ink);
    min-width: 0;
  }
  .company-name { font-weight: 600; color: color-mix(in oklch, var(--ff-ink) 80%, var(--ff-muted-ink)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
  .dot { color: color-mix(in oklch, var(--ff-muted-ink) 40%, transparent); }
  .dot.dim { color: color-mix(in oklch, var(--ff-muted-ink) 30%, transparent); }
  .location { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .type-label { font-size: .7rem; font-weight: 600; letter-spacing: .025em; }

  /* Feed fields a reader needs: mode, pay, experience, dates, degree. */
  .meta {
    display: flex; flex-wrap: wrap; gap: 4px 14px;
    margin-top: 8px; padding-top: 8px;
    border-top: 1px solid var(--ff-border);
    font-size: .72rem; color: var(--ff-muted-ink);
  }
  .meta-item { display: inline-flex; gap: 4px; min-width: 0; }
  .meta-label { color: color-mix(in oklch, var(--ff-muted-ink) 80%, transparent); }
  .meta-value { color: var(--ff-ink); font-weight: 600; overflow-wrap: anywhere; }

  /* Single action row: up to two skills + +N, then one navy Apply CTA. */
  .card-footer { display: flex; align-items: center; gap: 8px; padding-top: 2px; }
  .badges { display: flex; flex-wrap: wrap; gap: 4px; min-width: 0; flex: 1; }
  .skill {
    font-size: .7rem; line-height: 1.2; padding: 2px 7px; border-radius: .25rem;
    background: var(--ff-muted); color: var(--ff-ink);
    border: 1px solid var(--ff-border);
    overflow-wrap: anywhere;
  }
  .skill.more { background: transparent; color: var(--ff-muted-ink); }
  button.apply {
    margin-left: auto; flex: none;
    font: inherit; font-size: .75rem; font-weight: 700;
    color: var(--ff-paper);
    background: var(--ff-ink);       /* navy action, never orange */
    border: 1px solid var(--ff-ink);
    border-radius: .375rem;
    padding: 6px 12px; min-height: 28px;
    cursor: pointer;
  }
  button.apply:hover { opacity: .9; }
  button.apply:focus-visible { outline: 2px solid var(--ff-ink); outline-offset: 2px; }
  .empty { font-size: .8rem; color: var(--ff-muted-ink); margin: 0; }
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
