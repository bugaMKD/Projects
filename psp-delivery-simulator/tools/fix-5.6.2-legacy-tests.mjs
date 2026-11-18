import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Run from psp-delivery-simulator root; modifies only the two legacy test files.
const workspace = readFileSync(resolve('src/ReleaseWorkspace.tsx'), 'utf8');
if (!workspace.includes('const capacityBalance = capacityInsight.label;') ||
    !workspace.includes('calculateCapacityBalanceInsight({')) {
  throw new Error('5.6.2 Capacity Balance Insight not detected; refusing to update tests.');
}
const changes = [
  ['tests/bl-capacity-status-ui.test.mjs', /baselineCapacity\\\.limitingRole|baselineCapacity\.limitingRole/, 
   (variable, indent) => `${indent}assert.match(${variable}, /const capacityBalance = capacityInsight\\.label/);`],
  ['tests/capacity-impact-ui.test.mjs', /realisticStoryPointsPerSprint === 0/, 
   (variable, indent) => `${indent}assert.match(${variable}, /calculateCapacityBalanceInsight\\(\\{/);\n${indent}assert.match(${variable}, /const capacityBalance = capacityInsight\\.label/);`]
];
for (const [path, needle, makeReplacement] of changes) {
  const full = resolve(path);
  const source = readFileSync(full, 'utf8');
  const lines = source.split(/\r?\n/);
  const matches = lines.map((line,i) => needle.test(line) ? i : -1).filter(i => i>=0);
  if (matches.length !== 1) throw new Error(`${path}: expected exactly one old assertion, found ${matches.length}. No changes made to this file.`);
  const i = matches[0];
  const line = lines[i];
  const varMatch = line.match(/assert\.match\(\s*([A-Za-z_$][\w$]*)\s*,/);
  if (!varMatch || !line.includes('assert.match(')) throw new Error(`${path}: unsupported assertion shape; not modified.`);
  const indent = line.match(/^\s*/)[0];
  lines[i] = makeReplacement(varMatch[1],indent);
  copyFileSync(full, full+'.before-5.6.2-test-fix.bak');
  writeFileSync(full, lines.join(source.includes('\r\n')?'\r\n':'\n'));
  console.log(`Updated ${path}`);
}
console.log('Only two legacy contract assertions were updated; no app source modified.');
