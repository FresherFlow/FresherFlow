import { build } from 'esbuild';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Bundle a widget-src TypeScript module for node:test. Uses a unique temp dir
 * so the tests work on any machine and on CI, not just one developer's box.
 */
export async function loadModule(relativePath, base = 'widget-src') {
  const dir = await mkdtemp(path.join(tmpdir(), 'ff-widget-'));
  const outfile = path.join(dir, 'module.mjs');
  const result = await build({
    entryPoints: [path.join(process.cwd(), base, relativePath)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    logLevel: 'silent',
  });
  await writeFile(outfile, result.outputFiles[0].contents);
  return import(pathToFileURL(outfile).href);
}

/** Backwards-compatible name for the browser-source default base directory. */
export function loadWidgetModule(relativePath) {
  return loadModule(relativePath, 'widget-src');
}
