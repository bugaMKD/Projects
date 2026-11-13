import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SPRINT_CAPACITY_MEMBERS,
  createDraftSprintCapacityForm,
  parseDraftSprintCapacityForm,
} from '../src/models/DraftSprintCapacityInput.ts';

const initial = createDraftSprintCapacityForm(DEFAULT_SPRINT_CAPACITY_MEMBERS);

test('default draft preserves validated 10 SE days and 5 QA days per sprint', () => {
  const result = parseDraftSprintCapacityForm(initial);
  assert.deepEqual(result.members, DEFAULT_SPRINT_CAPACITY_MEMBERS);
  assert.deepEqual(result.errors, { members: {} });
});

test('individual percentages are converted to fractions without early rounding', () => {
  const form = [{...initial[0], availableDaysText: '12.5', productivityPercentText: '75.25'}, initial[1]];
  const result = parseDraftSprintCapacityForm(form);
  assert.equal(result.members[0].availableDays, 12.5);
  assert.equal(result.members[0].productivity, 0.7525);
});

test('multiple engineers and testers are supported without aggregating prematurely', () => {
  const form = [...initial, {id:'se-2',name:'Engineer 2',role:'SE',availableDaysText:'8',productivityPercentText:'80'}];
  const result = parseDraftSprintCapacityForm(form);
  assert.equal(result.members.length,3);
  assert.equal(result.members[2].productivity,0.8);
  assert.deepEqual(result.members.map(m=>m.role),['SE','QA','SE']);
});

test('blank, negative, non-numeric and infinite capacity is rejected', () => {
  for (const value of ['', '  ', '-1', 'NaN', 'Infinity', '1e999', 'abc']) {
    const result = parseDraftSprintCapacityForm([{...initial[0],availableDaysText:value}, initial[1]]);
    assert.equal(result.members,null);
    assert.ok(result.errors.members['0'].availableDaysText);
  }
});

test('productivity range 0–100 inclusive; invalid percentages rejected', () => {
  for (const value of ['0','100','33.333']) {
    assert.ok(parseDraftSprintCapacityForm([{...initial[0],productivityPercentText:value},initial[1]]).members);
  }
  for (const value of ['','-0.1','100.01','Infinity','x']) {
    const result = parseDraftSprintCapacityForm([{...initial[0],productivityPercentText:value},initial[1]]);
    assert.equal(result.members,null);
    assert.ok(result.errors.members['0'].productivityPercentText);
  }
});

test('zero available days and zero productivity are allowed as unforecastable capacity', () => {
  const result = parseDraftSprintCapacityForm([{...initial[0],availableDaysText:'0',productivityPercentText:'0'}, initial[1]]);
  assert.equal(result.members[0].availableDays,0);
  assert.equal(result.members[0].productivity,0);
});

test('empty team, missing names, invalid roles and duplicate IDs are rejected', () => {
  assert.equal(parseDraftSprintCapacityForm([]).members,null);
  assert.ok(parseDraftSprintCapacityForm([]).errors.form);
  const result = parseDraftSprintCapacityForm([
    {...initial[0],name:'  ',role:'Other'},
    {...initial[1],id:initial[0].id},
  ]);
  assert.equal(result.members,null);
  assert.ok(result.errors.members['0'].name);
  assert.ok(result.errors.members['0'].role);
  assert.ok(result.errors.members['1'].id);
});

test('parsing does not mutate drafts or original team members', () => {
  const snapshot = JSON.stringify(initial);
  const baseline = JSON.stringify(DEFAULT_SPRINT_CAPACITY_MEMBERS);
  const parsed = parseDraftSprintCapacityForm(initial);
  parsed.members[0].name = 'Edited copy';
  assert.equal(JSON.stringify(initial),snapshot);
  assert.equal(JSON.stringify(DEFAULT_SPRINT_CAPACITY_MEMBERS),baseline);
});
