#!/usr/bin/env node

/**
 * Project tree generator for FresherFlow monorepo
 * Generates a clean tree view of the project structure
 * Usage: node scripts/update_tree.js
 */

const fs = require('fs');
const path = require('path');

// Directories/files to exclude from tree
const EXCLUDE_DIRS = new Set([
  'node_modules', '.turbo', '.next', '.vercel', '.expo', 'dist',
  '.cache', '.git', '.github', '.agents', '.artifacts', '.claude',
  '.freebuff', '.ruff_cache', '.zcode', '.pnpm-store', 'public',
  'assets', 'files', 'mock', 'scratch', 'taskss', 'coverage',
  '.idea', '.vscode', 'logs'
]);

const EXCLUDE_FILES = new Set(['package-lock.json', 'pnpm-lock.yaml']);

// Folders to show contents for (we'll show 2 levels deep for these)
const FOLDERS_TO_EXPAND = new Set([
  'apps/web', 'apps/api', 'apps/mobile', 'apps/admin-mobile',
  'apps/worker', 'apps/ingestion', 'apps/mcp',
  'packages/database', 'packages/ui', 'packages/utils', 'packages/types',
  'packages/api-client', 'packages/frontend-core', 'packages/parser',
  'packages/pipeline', 'packages/plugins', 'packages/queue',
  'scripts/job-discovery', 'scripts/job-processor',
  'scripts/search', 'scripts/sweeper'
]);

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

function isExcluded(dirName) {
  return EXCLUDE_DIRS.has(dirName);
}

function isExcludedFile(fileName) {
  return EXCLUDE_FILES.has(fileName);
}

function printTree(dirPath, indent, depth) {
  const lines = [];
  const relPath = normalizePath(path.relative(process.cwd(), dirPath));
  
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const dirs = entries.filter(e => e.isDirectory() && !isExcluded(e.name)).sort((a, b) => a.name.localeCompare(b.name));
    const files = entries.filter(e => e.isFile() && !isExcludedFile(e.name)).sort((a, b) => a.name.localeCompare(b.name));
    
    const folderName = path.basename(dirPath);
    if (depth > 0) {
      lines.push(`${indent}${folderName}/`);
    }
    
    // Show all directories and their contents recursively
    for (const dir of dirs) {
      const subPath = path.join(dirPath, dir.name);
      lines.push(...printTree(subPath, indent + '  ', depth + 1));
    }
    
    // Show all files at this level
    for (const file of files) {
      lines.push(`${indent}${file.name}`);
    }
    
  } catch (e) {}
  
  return lines;
}

function main() {
  const root = process.cwd();
  const outputDir = path.join(root, 'files', 'tree');
  
  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });
  
  console.log('FresherFlow Monorepo Structure');
  console.log('='.repeat(50));
  console.log('');
  
  // Define folders to generate trees for - packages as one folder
  const folders = [
    { name: 'apps', path: path.join(root, 'apps'), fileName: 'apps-tree.md' },
    { name: 'packages', path: path.join(root, 'packages'), fileName: 'packages-tree.md' },
    { name: 'scripts', path: path.join(root, 'scripts'), fileName: 'scripts-tree.md' }
  ];
  
  // Individual app folders with cleaner names
  const appFolders = [
    { name: 'apps/web', path: path.join(root, 'apps', 'web'), fileName: 'web-tree.md' },
    { name: 'apps/api', path: path.join(root, 'apps', 'api'), fileName: 'api-tree.md' },
    { name: 'apps/mobile', path: path.join(root, 'apps', 'mobile'), fileName: 'mobile-tree.md' },
    { name: 'apps/admin-mobile', path: path.join(root, 'apps', 'admin-mobile'), fileName: 'admin-mobile-tree.md' },
    { name: 'apps/worker', path: path.join(root, 'apps', 'worker'), fileName: 'worker-tree.md' },
    { name: 'apps/ingestion', path: path.join(root, 'apps', 'ingestion'), fileName: 'ingestion-tree.md' },
    { name: 'apps/mcp', path: path.join(root, 'apps', 'mcp'), fileName: 'mcp-tree.md' }
  ];
  
  // Individual script folders
  const scriptFolders = [
    { name: 'scripts/job-discovery', path: path.join(root, 'scripts', 'job-discovery'), fileName: 'job-discovery-tree.md' },
    { name: 'scripts/job-processor', path: path.join(root, 'scripts', 'job-processor'), fileName: 'job-processor-tree.md' },
    { name: 'scripts/search', path: path.join(root, 'scripts', 'search'), fileName: 'search-tree.md' },
    { name: 'scripts/sweeper', path: path.join(root, 'scripts', 'sweeper'), fileName: 'sweeper-tree.md' }
  ];
  
  // Generate main folder trees
  for (const folder of folders) {
    console.log(`${folder.name}/`);
    const lines = printTree(folder.path, '  ', 0);
    for (const line of lines) {
      console.log(line);
    }
    console.log('');
    
    // Save to separate file
    const outputLines = [`${folder.name}/`, ...lines];
    const outputPath = path.join(outputDir, folder.fileName);
    fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf8');
  }
  
  // Generate individual app folder trees
  console.log('Individual App Trees:');
  console.log('-'.repeat(50));
  console.log('');
  
  for (const app of appFolders) {
    if (fs.existsSync(app.path)) {
      console.log(`${app.name}/`);
      const lines = printTree(app.path, '  ', 0);
      for (const line of lines) {
        console.log(line);
      }
      console.log('');
      
      const outputLines = [`${app.name}/`, ...lines];
      const outputPath = path.join(outputDir, app.fileName);
      fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf8');
    }
  }
  
  // Generate individual script folder trees
  console.log('Individual Script Trees:');
  console.log('-'.repeat(50));
  console.log('');
  
  for (const script of scriptFolders) {
    if (fs.existsSync(script.path)) {
      console.log(`${script.name}/`);
      const lines = printTree(script.path, '  ', 0);
      for (const line of lines) {
        console.log(line);
      }
      console.log('');
      
      const outputLines = [`${script.name}/`, ...lines];
      const outputPath = path.join(outputDir, script.fileName);
      fs.writeFileSync(outputPath, outputLines.join('\n'), 'utf8');
    }
  }
  
  console.log(`Saved all tree files to: ${outputDir}`);
  console.log('');
  console.log('Generated files:');
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.md')).sort();
  for (const file of files) {
    console.log(`  - ${file}`);
  }
}

main();
