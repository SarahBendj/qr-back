#!/usr/bin/env node
/** Copy Noto fonts next to compiled embed-fonts.js (dist/lib/pdf/fonts). */
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..', 'lib', 'pdf', 'fonts');
const destDir = path.join(__dirname, '..', 'dist', 'lib', 'pdf', 'fonts');

if (!fs.existsSync(srcDir)) {
  console.warn('[copy-pdf-fonts] skip — source missing:', srcDir);
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

for (const name of fs.readdirSync(srcDir)) {
  if (!name.endsWith('.ttf')) continue;
  fs.copyFileSync(path.join(srcDir, name), path.join(destDir, name));
}

console.log('[copy-pdf-fonts] copied fonts to', destDir);
