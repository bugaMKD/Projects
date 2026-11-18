import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Run from the PSP app root. Updates only legacy source-contract assertions.
const workspace = readFileSync(resolve('src/ReleaseWorkspace.tsx'), 'utf8');
if (!workspace.includes('const capacityBalance = capacityInsight.label;') ||
    !workspace.includes('calculateCapacityBalanceInsight({')) {
  throw new Error('5.6.2 Capacity Balance Insight not detected; no files changed.');
}

const targets = [
  {
    path: 'tests/bl-capacity-status-ui.test.mjs',
    marker: /baselineCapacity(?:\\\\)?\\?\.limitingRole|baselineCapacity\\\.limitingRole/,
    replacement: [
      String.raw`/calculateCapacityBalanceInsight\(\{/`,
      String.raw`/const capacityBalance = capacityInsight\.label/`,
    ],
  },
  {
    path: 'tests/capacity-impact-ui.test.mjs',
    marker: /realisticStoryPointsPerSprint === 0/,
    replacement: [
      String.raw`/calculateCapacityBalanceInsight\(\{/`,
      String.raw`/const capacityBalance = capacityInsight\.label/`,
    ],
  },
];

// Validate BOTH files before changing either (no partial updates).
const changes = targets.map(target => {
  const full = resolve(target.path);
  const content = readFileSync(full, 'utf8');
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  const indices = lines.flatMap((line, i) =>
    line.includes('assert.match(') && target.marker.test(line) ? [i] : []);
  if (indices.length < 1) {
    // Already fixed is also a valid state.
    if (content.includes('capacityInsight') && content.includes('capacityBalance')) {
      return { ...target, full, content, newline, lines, indices, skip: true };
    }
    throw new Error(`${target.path}: no known old contract assertion found. No files changed.`);
  }
  for (const i of indices) {
    if (!/assert\.match\(\s*[A-Za-z_$][\w$]*\s*,/.test(lines[i])) {
      throw new Error(`${target.path}:${i+1}: unsupported assert.match shape. No files changed.`);
    }
  }
  return { ...target, full, content, newline, lines, indices, skip: false };
});

for (const change of changes) {
  if (change.skip) {
    console.log(`Already updated: ${change.path}`);
    continue;
  }
  const variableFor = (line) => line.match(/assert\.match\(\s*([A-Za-z_$][\w$]*)\s*,/)[1];
  const first = change.indices[0];
  const firstLine = change.lines[first];
  const indent = firstLine.match(/^\s*/)[0];
  const variable = variableFor(firstLine);
  const assertions = change.replacement.map(regex => `${indent}assert.match(${variable}, ${regex});`);
  const toRemove = new Set(change.indices.slice(1));
  const updatedLines = change.lines.flatMap((line, i) => {
    if (i === first) return assertions;
    if (toRemove.has(i)) return [];
    return [line];
  });
  copyFileSync(change.full, `${change.full}.before-5.6.2-test-fix-v2.bak`);
  writeFileSync(change.full, updatedLines.join(change.newline));
  console.log(`Updated ${change.path}: replaced ${change.indices.length} legacy assertion(s)`);
}
console.log('Done. No application code was modified.');
