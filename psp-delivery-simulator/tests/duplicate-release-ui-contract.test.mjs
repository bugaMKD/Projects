import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const management = readFileSync(new URL('../src/components/ReleaseManagement.tsx', import.meta.url), 'utf8');

test('5.4.4 Release Management exposes Duplicate as a per-release action', () => {
  assert.match(management, /onDuplicate: \(id: string\) => void/);
  assert.match(management, /onClick=\{\(\) => onDuplicate\(record.id\)\}/);
});
test('Duplicate opens an unsaved workspace session using newly generated identity', () => {
  assert.match(app, /duplicateReleaseToNewSession\(original, crypto\.randomUUID\(\), new Date\(\)\.toISOString\(\)\)/);
  assert.match(app, /setSession\(next\)/);
  assert.match(app, /setNavigation\(navigateToNewRelease\(\)\)/);
  assert.match(app, /dirtyRef\.current = true/);
});
test('Duplicate follows unsaved change warning and reads persisted source', () => {
  assert.match(app, /const duplicateRelease = \(id: string\) => \{\s*if \(!acceptLeave\(\)\) return/);
  assert.match(app, /repository\.getRelease\(id\)/);
});
