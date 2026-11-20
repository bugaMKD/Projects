import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const migration = readFileSync(
  new URL('../supabase/migrations/20261119130000_create_psp_releases.sql', import.meta.url),
  'utf8',
);

test('PSP release storage retains full v1 payload with composite ownership key', () => {
  assert.match(migration, /payload jsonb not null/i);
  assert.match(migration, /primary key \(owner_id, id\)/i);
  assert.match(migration, /references auth\.users\(id\)/i);
  assert.match(migration, /payload -> 'schemaVersion' = '1'::jsonb/i);
});

test('RLS gates each operation to authenticated owner', () => {
  assert.match(migration, /enable row level security/i);
  for (const operation of ['select', 'insert', 'update', 'delete']) {
    assert.match(migration, new RegExp(`for ${operation} to authenticated`, 'i'));
  }
  assert.equal((migration.match(/\(select auth\.uid\(\)\) = owner_id/g) ?? []).length, 5);
  assert.match(migration, /revoke all on public\.psp_releases from anon/i);
});

test('established BL cannot be overwritten or downgraded', () => {
  assert.match(migration, /old\.payload ->> 'baselineStatus' = 'established'/);
  assert.match(migration, /new\.payload -> 'establishedBaseline' is distinct from old\.payload -> 'establishedBaseline'/);
  assert.match(migration, /new\.payload -> 'draft' is distinct from old\.payload -> 'draft'/);
  assert.match(migration, /raise exception 'Established PSP baseline is immutable'/);
});

test('database updates preserve identity and increment revision', () => {
  assert.match(migration, /new\.owner_id is distinct from old\.owner_id/);
  assert.match(migration, /new\.revision := old\.revision \+ 1/);
});
