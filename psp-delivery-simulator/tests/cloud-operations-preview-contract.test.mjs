import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/auth/CloudReleasesPreview.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('cloud operations preview is isolated from local PSP workspace', () => {
  assert.match(source, /SupabaseReleaseRepository/);
  assert.match(source, /repository\.saveRelease\(/);
  assert.match(source, /repository\.deleteRelease\(/);
  assert.match(source, /repository\.listReleases\(/);
  assert.doesNotMatch(source, /window\.localStorage|createBrowserReleaseRepository/);
  assert.match(app, /createBrowserReleaseRepository/);
});

test('cloud test actions are explicit and show outcomes only after server confirmation', () => {
  assert.match(source, /await operation\(\)/);
  assert.match(source, /await repository\.listReleases\(\)/);
  assert.match(source, /catch \(caught\)/);
  assert.match(source, /ReleaseConflictError/);
  assert.match(source, /window\.confirm/);
  assert.match(source, /disabled=\{pending\}/);
});
