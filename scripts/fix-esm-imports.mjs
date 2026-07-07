import fs from 'node:fs/promises';
import path from 'node:path';

const targetDir = process.argv[2];

if (!targetDir) {
  console.error('Usage: node scripts/fix-esm-imports.mjs <dir>');
  process.exit(1);
}

const importPattern =
  /((?:import|export)\s+(?:[^'"]+?\s+from\s+)?|import\s*\()\s*(['"])(\.\.?\/[^'"]+?)(\2)/g;

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
      continue;
    }

    if (!entry.isFile() || !fullPath.endsWith('.js')) continue;

    const source = await fs.readFile(fullPath, 'utf8');
    const next = source.replace(importPattern, (match, prefix, quote, specifier, suffix) => {
      if (specifier.endsWith('.js') || specifier.endsWith('.json') || specifier.endsWith('.mjs')) {
        return match;
      }
      return `${prefix}${quote}${specifier}.js${suffix}`;
    });

    if (next !== source) {
      await fs.writeFile(fullPath, next, 'utf8');
    }
  }
}

await walk(path.resolve(targetDir));
