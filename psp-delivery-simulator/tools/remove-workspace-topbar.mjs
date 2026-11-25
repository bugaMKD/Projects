import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../src/ReleaseWorkspace.tsx', import.meta.url);
const original = readFileSync(file, 'utf8');
const pattern = /^[ \t]*<header className="topbar"><div className="brand-mark">P<\/div>.*?<\/header>\r?\n/mg;
const matches = [...original.matchAll(pattern)];
if (matches.length !== 1 || !matches[0][0].includes('Local prototype') || !matches[0][0].includes('mock-chip')) {
  console.error('Expected one known legacy workspace header. No files changed.');
  process.exitCode = 1;
} else {
  const updated = original.replace(pattern, '');
  writeFileSync(file, updated, 'utf8');
  console.log('Removed the redundant Release Workspace top bar.');
}
