import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftHistoricalFormInput, parseDraftHistoricalFormInput } from '../src/models/DraftHistoricalInput.ts';

const original = { deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 };
const form = { deliveredStoryPointsText: '100', seEffectiveDaysText: '100', qaEffectiveDaysText: '50' };

test('editable historical draft is initialized from existing historical values', () => {
  assert.deepEqual(createDraftHistoricalFormInput(original), form);
  assert.deepEqual(original, {deliveredStoryPoints:100,seEffectiveDays:100,qaEffectiveDays:50});
});

test('valid historical totals parse without rounding or historical sprint counts', () => {
  const value = parseDraftHistoricalFormInput({...form, deliveredStoryPointsText:'85.75', qaEffectiveDaysText:'12.5'});
  assert.deepEqual(value.historical, {deliveredStoryPoints:85.75,seEffectiveDays:100,qaEffectiveDays:12.5});
  assert.deepEqual(value.errors, {});
});

test('blank and whitespace-only input cannot be committed', () => {
  assert.equal(parseDraftHistoricalFormInput({...form,seEffectiveDaysText:''}).historical, null);
  assert.ok(parseDraftHistoricalFormInput({...form,qaEffectiveDaysText:'   '}).errors.qaEffectiveDaysText);
});

test('zero and negative totals are rejected', () => {
  for (const input of ['0','-1']) {
    assert.ok(parseDraftHistoricalFormInput({...form,deliveredStoryPointsText:input}).errors.deliveredStoryPointsText);
    assert.ok(parseDraftHistoricalFormInput({...form,seEffectiveDaysText:input}).errors.seEffectiveDaysText);
    assert.ok(parseDraftHistoricalFormInput({...form,qaEffectiveDaysText:input}).errors.qaEffectiveDaysText);
  }
});

test('non-finite and non-numeric inputs are rejected', () => {
  for (const input of ['NaN','Infinity','not a number','1e999']) {
    assert.equal(parseDraftHistoricalFormInput({...form, deliveredStoryPointsText:input}).historical, null);
  }
});

test('reports errors for every invalid field, not just the first', () => {
  const value = parseDraftHistoricalFormInput({deliveredStoryPointsText:'',seEffectiveDaysText:'0',qaEffectiveDaysText:'-5'});
  assert.equal(Object.keys(value.errors).length, 3);
  assert.equal(value.historical, null);
});

test('parsing and editing do not mutate original historical data or input form', () => {
  const immutableForm = Object.freeze({...form});
  const immutableHistorical = Object.freeze({...original});
  const parsed = parseDraftHistoricalFormInput(immutableForm);
  parsed.historical.deliveredStoryPoints = 80;
  assert.deepEqual(immutableForm, form);
  assert.deepEqual(immutableHistorical, original);
});
