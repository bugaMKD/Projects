import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SPRINT_CAPACITY_MEMBERS, createDraftSprintCapacityForm } from '../src/models/DraftSprintCapacityInput.ts';
import { addDraftSprintMember, commitDraftSprintCapacityForm, removeDraftSprintMember } from '../src/models/DraftSprintCapacityCommit.ts';

const initial = () => createDraftSprintCapacityForm(DEFAULT_SPRINT_CAPACITY_MEMBERS);
const before = () => DEFAULT_SPRINT_CAPACITY_MEMBERS.map(m=>({...m}));

test('4.3.3 initial commit preserves validated 10 SE and 5 QA days/sprint',()=>{
  const result=commitDraftSprintCapacityForm(initial(),before());
  assert.equal(result.applied,true);
  assert.deepEqual(result.members,before());
});
test('valid changes are committed as effective decimal productivity, not rounded',()=>{
  const form=initial();
  form[0].availableDaysText='8.5'; form[0].productivityPercentText='72.25';
  const result=commitDraftSprintCapacityForm(form,before());
  assert.equal(result.applied,true);
  assert.equal(result.members[0].availableDays,8.5);
  assert.equal(result.members[0].productivity,0.7225);
});
test('invalid staged text does not modify previously committed capacity',()=>{
  const form=initial();form[1].availableDaysText='';
  const original=before(); const result=commitDraftSprintCapacityForm(form,original);
  assert.equal(result.applied,false);
  assert.deepEqual(result.members,original);
  assert.ok(result.errors.members['1'].availableDaysText);
});
test('can add several SE and QA members with unique stable IDs',()=>{
  const form=addDraftSprintMember(addDraftSprintMember(addDraftSprintMember(initial(),'SE'),'SE'),'QA');
  assert.equal(form.length,5);
  assert.equal(new Set(form.map(m=>m.id)).size,5);
  assert.deepEqual(form.slice(2).map(m=>m.role),['SE','SE','QA']);
  assert.equal(commitDraftSprintCapacityForm(form,before()).applied,true);
});
test('remove preserves other members and allows valid commit',()=>{
  const form=removeDraftSprintMember(initial(),'baseline-qa');
  const result=commitDraftSprintCapacityForm(form,before());
  assert.equal(result.applied,true);
  assert.deepEqual(result.members.map(m=>m.role),['SE']);
});
test('removing all members keeps previous capacity and reports a validation error',()=>{
  const original=before();
  const result=commitDraftSprintCapacityForm([],original);
  assert.equal(result.applied,false);
  assert.ok(result.errors.form);
  assert.deepEqual(result.members,original);
});
test('zero days or zero productivity is accepted for not-forecastable scenarios',()=>{
  const form=initial();form[1].productivityPercentText='0';
  const result=commitDraftSprintCapacityForm(form,before());
  assert.equal(result.applied,true);
  assert.equal(result.members[1].productivity,0);
});
test('helpers never mutate original draft or previous valid team',()=>{
  const form=initial();const original=before();
  const snapshot=JSON.stringify({form,original});
  addDraftSprintMember(form,'SE');removeDraftSprintMember(form,form[0].id);
  commitDraftSprintCapacityForm(form,original);
  assert.equal(JSON.stringify({form,original}),snapshot);
});
