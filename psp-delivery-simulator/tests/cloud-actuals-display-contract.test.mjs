import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/auth/CloudReleasesPreview.tsx', import.meta.url), 'utf8');

test('cloud preview displays saved actual sprint values and delivered total', () => {
  assert.match(source, /Recorded sprint actuals/);
  assert.match(source, /selected\.completedSprintPoints\.map/);
  assert.match(source, /Sprint \{index \+ 1\}: \{points\} SP/);
  assert.match(source, /selected\.completedSprintPoints\.reduce/);
  assert.match(source, /Total delivered:/);
});
