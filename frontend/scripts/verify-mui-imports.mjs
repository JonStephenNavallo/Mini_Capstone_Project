#!/usr/bin/env node
/**
 * verify-mui-imports.mjs
 *
 * Fast (< 300ms) validator for `@mui/icons-material` v9 subpath & named imports
 * against the strict `exports` map in `node_modules/@mui/icons-material/package.json`.
 *
 * Prevents Vite 8 `[plugin:builtin:vite-resolve] "./IconName" is not exported`
 * runtime/build errors before they ever hit the browser.
 *
 * Usage:
 *   npm run verify:icons                          # Scan all src/**\/*.{js,jsx}
 *   npm run verify:icons -- src/path/to/File.jsx  # Scan specific file(s)
 *   npm run verify:icons -- --search CheckCircle  # Search valid icon exports
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(APP_ROOT, 'src');
const ICONS_PKG_PATH = path.join(APP_ROOT, 'node_modules', '@mui', 'icons-material', 'package.json');

if (!fs.existsSync(ICONS_PKG_PATH)) {
  console.error(`[verify-mui-imports] Could not find ${ICONS_PKG_PATH}. Run npm install first.`);
  process.exit(1);
}

const iconsPkg = JSON.parse(fs.readFileSync(ICONS_PKG_PATH, 'utf8'));
const validIcons = new Set(
  Object.keys(iconsPkg.exports || {})
    .filter((key) => key.startsWith('./') && !key.includes('/') && key !== './package.json' && key !== './utils')
    .map((key) => key.slice(2))
);
// Note: exports keys look like "./CheckCircleOutlined" -> single slash at index 1
const allValidIconNames = Object.keys(iconsPkg.exports || {})
  .filter((key) => /^\.\/[A-Za-z0-9_]+$/.test(key) && key !== './utils')
  .map((key) => key.slice(2));

for (const name of allValidIconNames) {
  validIcons.add(name);
}

/**
 * Find closest matching valid icon names for fast autofix suggestions.
 */
function suggestIcons(query, limit = 6) {
  const lower = query.toLowerCase();
  const base = lower.replace(/(outlined|outline|rounded|sharp|twotone|icon)$/i, '');

  const exactPrefix = [];
  const containsBase = [];

  for (const name of allValidIconNames) {
    const nLower = name.toLowerCase();
    if (nLower.startsWith(lower) || (base.length >= 3 && nLower.startsWith(base))) {
      exactPrefix.push(name);
    } else if (base.length >= 4 && nLower.includes(base)) {
      containsBase.push(name);
    }
  }

  return [...exactPrefix, ...containsBase].slice(0, limit);
}

/**
 * Recursively collect .js and .jsx files under a directory.
 */
function collectSourceFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      collectSourceFiles(fullPath, results);
    } else if (entry.isFile() && /\.(js|jsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

// Parse CLI arguments
const args = process.argv.slice(2);
const searchIdx = args.indexOf('--search');
if (searchIdx !== -1) {
  const query = args[searchIdx + 1];
  if (!query) {
    console.error('Usage: npm run verify:icons -- --search <IconKeyword>');
    process.exit(1);
  }
  const matches = suggestIcons(query, 20);
  if (matches.length === 0) {
    console.log(`No @mui/icons-material exports matching "${query}".`);
  } else {
    console.log(`Valid @mui/icons-material exports matching "${query}":`);
    for (const m of matches) {
      console.log(`  @mui/icons-material/${m}`);
    }
  }
  process.exit(0);
}

const targetFiles =
  args.length > 0
    ? args.map((arg) => path.resolve(APP_ROOT, arg)).filter((p) => fs.existsSync(p))
    : collectSourceFiles(SRC_ROOT);

// Matches: import Foo from '@mui/icons-material/Bar'
const SUBPATH_IMPORT_RE = /import\s+(?:[^'"]+\s+from\s+)?['"]@mui\/icons-material\/([^'"]+)['"]/g;
// Matches: import { A, B as C } from '@mui/icons-material'
const NAMED_IMPORT_RE = /import\s*\{([^}]+)\}\s*from\s*['"]@mui\/icons-material['"]/g;

const errors = [];

for (const filePath of targetFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(APP_ROOT, filePath).replace(/\\/g, '/');

  // Helper to compute 1-based line number from match index
  const getLineNumber = (index) => content.slice(0, index).split('\n').length;

  // 1. Validate subpath imports: @mui/icons-material/<IconName>
  for (const match of content.matchAll(SUBPATH_IMPORT_RE)) {
    const iconName = match[1].trim();
    if (!validIcons.has(iconName)) {
      errors.push({
        file: relPath,
        line: getLineNumber(match.index),
        iconName,
        suggestions: suggestIcons(iconName),
      });
    }
  }

  // 2. Validate named imports: import { X, Y as Z } from '@mui/icons-material'
  for (const match of content.matchAll(NAMED_IMPORT_RE)) {
    const specifiers = match[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    for (const spec of specifiers) {
      const importedName = spec.split(/\s+as\s+/)[0].trim();
      if (importedName && !validIcons.has(importedName)) {
        errors.push({
          file: relPath,
          line: getLineNumber(match.index),
          iconName: importedName,
          suggestions: suggestIcons(importedName),
        });
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`\n[verify-mui-imports] Found ${errors.length} invalid @mui/icons-material import(s):\n`);
  for (const err of errors) {
    console.error(`  ✖ ${err.file}:${err.line} -> "@mui/icons-material/${err.iconName}" is NOT exported`);
    if (err.suggestions.length > 0) {
      console.error(`    Did you mean: ${err.suggestions.join(', ')}`);
    }
  }
  console.error('');
  process.exit(1);
}

console.log(`[verify-mui-imports] ✔ Verified ${targetFiles.length} file(s) — all @mui/icons-material imports are valid.`);
