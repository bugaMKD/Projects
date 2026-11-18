import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const workspacePath = path.join(root, 'src', 'ReleaseWorkspace.tsx');
if (!fs.existsSync(workspacePath)) throw new Error('Run from PSP project root. No files changed.');
const workspace = fs.readFileSync(workspacePath, 'utf8');
for (const marker of [
  'className="panel psp-combined-planning"',
  'className="panel chart-panel psp-chart-pane"',
  'aria-label="Baseline status messages"',
  'aria-label="Future team capacity table"',
]) if (!workspace.includes(marker)) throw new Error(`Expected 5.6.1 marker missing: ${marker}. No files changed.`);
if (workspace.includes('teamCapacityOpen') || workspace.includes('aria-label="Future team capacity details"')) {
  throw new Error('Capacity accordion still present. No files changed.');
}

const changes = [
  {
    file: 'baseline-status-consolidation.test.mjs',
    oldName: 'draft, established, and error status survive independent of collapsed inputs',
    newTest: String.raw`test('baseline status remains outside capacity inputs in shared planning layout', () => {
  const s = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');
  const shared = s.indexOf('className="panel psp-combined-planning"');
  const capacity = s.indexOf('aria-label="Future team capacity table"', shared);
  const chart = s.indexOf('className="panel chart-panel psp-chart-pane"', capacity);
  const actions = s.indexOf('aria-label="Baseline actions"', chart);
  const status = s.indexOf('aria-label="Baseline status messages"', actions);
  assert.ok(shared >= 0 && capacity > shared && chart > capacity && actions > chart && status > actions);
  assert.doesNotMatch(s, /aria-label="Future team capacity details"/);
  for (const marker of ['All draft changes saved', 'Unsaved changes', 'Baseline established · Inputs locked', 'actionError', 'eligibility.reason']) {
    assert.ok(s.indexOf(marker, status) > status, 'Missing baseline status: ' + marker);
  }
});`,
  },
  {
    file: 'workspace-collapsible-panels.test.mjs',
    oldName: 'three complete panel accordions with independently managed state',
    newTest: String.raw`test('only release configuration and historical productivity are collapsible', () => {
  const s = readFileSync(new URL('../src/ReleaseWorkspace.tsx', import.meta.url), 'utf8');
  assert.match(s, /const \[releaseConfigOpen, setReleaseConfigOpen\] = useState\(!established\)/);
  assert.match(s, /const \[historicalOpen, setHistoricalOpen\] = useState\(!established\)/);
  assert.match(s, /open=\{releaseConfigOpen\}/);
  assert.match(s, /open=\{historicalOpen\}/);
  assert.doesNotMatch(s, /teamCapacityOpen|aria-label="Future team capacity details"/);
  assert.match(s, /className="panel psp-combined-planning"/);
  assert.match(s, /aria-label="Future team capacity table"/);
});`,
  },
];
const staged = [];
for (const item of changes) {
  const target = path.join(root, 'tests', item.file);
  const backup = target + '.before-5.6.1-contract-fix.bak';
  if (!fs.existsSync(target)) throw new Error(`Missing test: ${target}. No files changed.`);
  if (fs.existsSync(backup)) throw new Error(`Backup already exists: ${backup}. No files changed.`);
  const original = fs.readFileSync(target, 'utf8');
  const testRegex = /^test\(\s*(['"])(.*?)\1\s*,/gm;
  const matches = [...original.matchAll(testRegex)];
  const selected = matches.filter(match => match[2] === item.oldName);
  if (selected.length !== 1) throw new Error(`Expected one test named "${item.oldName}" in ${item.file}; found ${selected.length}. No files changed.`);
  const current = selected[0];
  const next = matches.find(match => match.index > current.index);
  const end = next ? next.index : original.length;
  const rewritten = original.slice(0, current.index) + item.newTest + '\n\n' + original.slice(end);
  staged.push({target, backup, original, rewritten});
}
for (const item of staged) {
  fs.writeFileSync(item.backup, item.original);
  fs.writeFileSync(item.target, item.rewritten);
  console.log('Updated:', path.relative(root, item.target));
}
console.log('Updated exactly two obsolete assertions. Application source unchanged.');
