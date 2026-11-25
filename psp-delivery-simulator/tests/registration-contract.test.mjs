import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const auth = readFileSync(new URL('../src/auth/AuthPreview.tsx', import.meta.url), 'utf8');
const client = readFileSync(new URL('../src/auth/supabaseAuthClient.ts', import.meta.url), 'utf8');

test('signup is email and password only, with a production-safe confirmation redirect', () => {
  assert.match(auth, /auth\.signUp\(\{/);
  assert.match(auth, /email: email\.trim\(\)/);
  assert.match(auth, /password,/);
  assert.match(auth, /emailRedirectTo: window\.location\.origin/);
  assert.match(client, /detectSessionInUrl: true/);
});

test('registration does not claim a signed-in session when confirmation is required', () => {
  assert.match(auth, /result\.data\.session\?\.user/);
  assert.match(auth, /setNotice\(/);
  assert.match(auth, /setMode\('sign-in'\)/);
  assert.match(auth, /setPassword\(''\)/);
});

test('existing sign-in, session restoration, logout and workspace remain', () => {
  assert.match(auth, /auth\.signInWithPassword/);
  assert.match(auth, /auth\.getSession\(\)/);
  assert.match(auth, /onAuthStateChange/);
  assert.match(auth, /auth\.signOut\(\)/);
  assert.match(auth, /<CloudWorkspaceApp key=\{user\.id\}/);
  assert.match(auth, /mode === 'register' \? register\(event\) : signIn\(event\)/);
});
