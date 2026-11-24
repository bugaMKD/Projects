import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../src/', import.meta.url);
const main = readFileSync(new URL('main.tsx', root), 'utf8');
const auth = readFileSync(new URL('auth/AuthPreview.tsx', root), 'utf8');
const client = readFileSync(new URL('auth/supabaseAuthClient.ts', root), 'utf8');

test('authentication preview is opt-in; existing PSP remains default', () => {
  assert.match(main, /const authPreview = params\.has\('auth-preview'\)/);
  assert.match(main, /const cloudWorkspace = params\.has\('cloud-workspace'\)/);
  assert.match(main, /cloudWorkspace \? <AuthPreview fullWorkspace \/> : authPreview \? <AuthPreview \/> : <App \/>/);
});
test('sign in, sign out and session restore use Supabase auth', () => {
  assert.match(auth, /auth\.signInWithPassword/);
  assert.match(auth, /auth\.signOut\(\)/);
  assert.match(auth, /auth\.getSession\(\)/);
  assert.match(auth, /onAuthStateChange/);
});
test('only publishable key is accepted as Vite configuration', () => {
  assert.match(client, /VITE_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(client, /startsWith\('sb_publishable_'\)/);
  assert.doesNotMatch(client, /VITE_SUPABASE_SERVICE_ROLE_KEY/);
});
