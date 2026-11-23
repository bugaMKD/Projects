import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const preview = readFileSync(new URL('../src/auth/CloudReleasesPreview.tsx', import.meta.url), 'utf8');
const auth = readFileSync(new URL('../src/auth/AuthPreview.tsx', import.meta.url), 'utf8');

test('cloud preview fetches only through authenticated repository and clears stale user data', () => {
  assert.match(preview, /new SupabaseReleaseRepository\(client\)/);
  assert.match(preview, /repository\.listReleases\(\)/);
  assert.match(preview, /setReleases\(\[\]\)/);
  assert.match(preview, /return \(\) => \{ active = false; \}/);
  assert.match(preview, /\[repository, userId, generation\]/);
});
test('cloud operations are mounted only for signed-in user; local PSP unaffected', () => {
  assert.match(auth, /CloudReleasesPreview key=\{user\.id\} client=\{client\} userId=\{user\.id\}/);
  assert.doesNotMatch(preview, /createBrowserReleaseRepository|window\.localStorage|localStorage\[/);
  assert.match(preview, /repository\.saveRelease\(/);
  assert.match(preview, /repository\.deleteRelease\(/);
});
