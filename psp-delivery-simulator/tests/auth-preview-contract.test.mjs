import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../src/', import.meta.url);
const main = readFileSync(new URL('main.tsx', root), 'utf8');
const auth = readFileSync(new URL('auth/AuthPreview.tsx', root), 'utf8');
const client = readFileSync(new URL('auth/supabaseAuthClient.ts', root), 'utf8');

test('cloud workspace is default; local workspace and diagnostic preview are development-only', () => {
  assert.match(main, /showLocalWorkspace = import\.meta\.env\.DEV && params\.has\('local-workspace'\)/);
  assert.match(main, /showAuthPreview = import\.meta\.env\.DEV && params\.has\('auth-preview'\)/);
  assert.match(main, /showLocalWorkspace \? <App \/> : <AuthPreview fullWorkspace=\{!showAuthPreview\} \/>/);
  assert.doesNotMatch(main, /params\.has\('cloud-workspace'\)/);
});
test('sign in, sign out and session restore use Supabase auth', () => {
  assert.match(auth, /auth\.signInWithPassword/);
  assert.match(auth, /auth\.signOut\(\)/);
  assert.match(auth, /auth\.getSession\(\)/);
  assert.match(auth, /onAuthStateChange/);
});
test('local-only link is development gated and correctly targets old workspace', () => {
  assert.match(auth, /import\.meta\.env\.DEV && <p/);
  assert.match(auth, /href="\/\?local-workspace=1"/);
  assert.doesNotMatch(auth, /Back to local PSP/);
});
test('only publishable key is accepted as Vite configuration', () => {
  assert.match(client, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(client, /startsWith\('sb_publishable_'\)/);
  assert.doesNotMatch(client, /VITE_SUPABASE_SERVICE_ROLE_KEY/);
});
