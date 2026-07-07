import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const parserDistDir = path.join(repoRoot, 'packages', 'parser', 'dist');
const apiVendorDir = path.join(repoRoot, 'apps', 'api', 'dist', '_vendor', 'parser');

async function copyDir(sourceDir, targetDir) {
    await fs.mkdir(targetDir, { recursive: true });
    const entries = await fs.readdir(sourceDir, { withFileTypes: true });

    await Promise.all(entries.map(async (entry) => {
        const sourcePath = path.join(sourceDir, entry.name);
        const targetPath = path.join(targetDir, entry.name);

        if (entry.isDirectory()) {
            await copyDir(sourcePath, targetPath);
            return;
        }

        await fs.copyFile(sourcePath, targetPath);
    }));
}

await copyDir(parserDistDir, apiVendorDir);
