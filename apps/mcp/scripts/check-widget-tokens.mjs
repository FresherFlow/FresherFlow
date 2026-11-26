import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Every widget token must map to a web token; unmapped tokens fail the build. */
export const TOKEN_MAP = Object.freeze({
  '--ff-ink': '--color-foreground',
  '--ff-paper': '--color-primary-foreground',
  '--ff-card': '--color-card',
  '--ff-page': '--color-background',
  '--ff-border': '--color-border',
  '--ff-border-strong': '--color-border-strong',
  '--ff-muted': '--color-muted',
  '--ff-muted-ink': '--color-muted-foreground',
  '--ff-success': '--color-success',
  '--ff-destructive': '--color-destructive',
});

const normalize = (value) => value.trim().toLowerCase().replace(/\s+/g, ' ');

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Return the contents of a CSS block, tracking brace depth so nested rules are safe. */
export function extractBlock(css, header) {
  const start = css.indexOf(header);
  if (start < 0) return null;
  const open = css.indexOf('{', start + header.length);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return null;
}

function extractBlockRegex(css, regex) {
  const match = regex.exec(css);
  if (!match) return null;
  return extractBlock(css.slice(match.index), match[0].replace(/\s*\{$/, ''));
}

function declarations(block) {
  const out = new Map();
  if (!block) return out;
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) {
    out.set(match[1], match[2].trim());
  }
  return out;
}

function resolve(value, all, seen = new Set()) {
  const match = /^var\((--[\w-]+)\)$/.exec(value.trim());
  if (!match || seen.has(match[1])) return value;
  const next = all.get(match[1]);
  return next === undefined ? value : resolve(next, all, new Set([...seen, match[1]]));
}

export function checkWidgetTokens(widgetCss, globalCss) {
  const problems = [];
  const cleanWidget = stripComments(widgetCss);
  const cleanGlobal = stripComments(globalCss);
  const widgetLight = declarations(extractBlockRegex(cleanWidget, /:root\s*\{/));
  const widgetDark = declarations(extractBlockRegex(cleanWidget, /:root\[data-theme="dark"\]\s*\{/));
  const globalLightRaw = declarations(extractBlockRegex(cleanGlobal, /@theme\s*\{/));
  const globalDarkRaw = declarations(extractBlockRegex(cleanGlobal, /\.dark\s*\{/));

  const resolveLight = new Map([...globalLightRaw].map(([k, v]) => [k, resolve(v, globalLightRaw)]));
  const resolveDark = new Map(
    [...globalLightRaw, ...globalDarkRaw].map(([k, v]) => [k, resolve(v, new Map([...globalLightRaw, ...globalDarkRaw]))]),
  );

  for (const [ff, color] of Object.entries(TOKEN_MAP)) {
    const hasLightGlobal = resolveLight.has(color);
    const hasDarkGlobal = resolveDark.has(color);
    const hasLightWidget = widgetLight.has(ff);
    const hasDarkWidget = widgetDark.has(ff);
    if (!hasLightWidget && !hasDarkWidget && !hasLightGlobal && !hasDarkGlobal) continue;
    if (!Object.hasOwn(TOKEN_MAP, ff)) {
      problems.push(`${ff}: no token mapping`);
      continue;
    }
    if (hasLightGlobal && !hasLightWidget) {
      problems.push(`${ff}: missing light value (expected ${color})`);
      continue;
    }
    if (hasDarkGlobal && !hasDarkWidget) {
      problems.push(`${ff}: missing dark value (expected ${color})`);
      continue;
    }
    if (hasLightWidget && !hasLightGlobal) {
      problems.push(`${ff}: no light mapping in globals.css (${color})`);
      continue;
    }
    if (hasDarkWidget && !hasDarkGlobal) {
      problems.push(`${ff}: no dark mapping in globals.css (${color})`);
      continue;
    }
    if (hasLightWidget && hasLightGlobal && normalize(widgetLight.get(ff)) !== normalize(resolveLight.get(color))) {
      problems.push(`${ff}: light mismatch (widget ${widgetLight.get(ff)} vs ${color} ${resolveLight.get(color)})`);
    }
    if (hasDarkWidget && hasDarkGlobal && normalize(widgetDark.get(ff)) !== normalize(resolveDark.get(color))) {
      problems.push(`${ff}: dark mismatch (widget ${widgetDark.get(ff)} vs ${color} ${resolveDark.get(color)})`);
    }
  }

  for (const ff of [...widgetLight.keys(), ...widgetDark.keys()].filter((k) => k.startsWith('--ff-'))) {
    if (!Object.hasOwn(TOKEN_MAP, ff) && !problems.some((p) => p.startsWith(`${ff}:`))) {
      problems.push(`${ff}: no token mapping`);
    }
  }
  return problems;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const repoRoot = path.resolve(appRoot, '../..');
  const [widgetCss, globalCss] = await Promise.all([
    readFile(path.join(appRoot, 'scripts/build-widget.mjs'), 'utf8'),
    readFile(path.join(repoRoot, 'apps/web/src/app/globals.css'), 'utf8'),
  ]);
  const problems = checkWidgetTokens(widgetCss, globalCss);
  if (problems.length) {
    console.error('TOKEN PARITY FAILED');
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log('PARITY OK');
}
