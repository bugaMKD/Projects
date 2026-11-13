import test from 'node:test';
import assert from 'node:assert/strict';
import { commitDraftHistoricalForm } from '../src/models/DraftHistoricalCommit.ts';
import { createDraftHistoricalFormInput } from '../src/models/DraftHistoricalInput.ts';

const initial = {deliveredStoryPoints: 100, seEffectiveDays:100, qaEffectiveDays:50};
const input = createDraftHistoricalFormInput(initial);
test('default inputs commit without any changes', () => {
  const result=commitDraftHistoricalForm(input,initial);
  assert.equal(result.applied,true);
  assert.deepEqual(result.historical,initial);
});
test('changing delivered SP commits historical sample',()=>{
  const result=commitDraftHistoricalForm({...input,deliveredStoryPointsText:'200'},initial);
  assert.equal(result.historical.deliveredStoryPoints,200);
  assert.equal(result.applied,true);
});
test('SE effective days can be updated independently',()=>{
  const result=commitDraftHistoricalForm({...input,seEffectiveDaysText:'75.5'},initial);
  assert.equal(result.historical.seEffectiveDays,75.5);
});
test('QA effective days can be updated independently',()=>{
  const result=commitDraftHistoricalForm({...input,qaEffectiveDaysText:'25.25'},initial);
  assert.equal(result.historical.qaEffectiveDays,25.25);
});
test('blank input leaves previously committed historical sample intact',()=>{
  const result=commitDraftHistoricalForm({...input,qaEffectiveDaysText:''},initial);
  assert.equal(result.applied,false);
  assert.deepEqual(result.historical,initial);
  assert.ok(result.errors.qaEffectiveDaysText);
});
test('negative and nonnumeric values cannot overwrite historical data',()=>{
  for(const value of ['-3','NaN','Infinity','0']){
    const result=commitDraftHistoricalForm({...input,seEffectiveDaysText:value},initial);
    assert.equal(result.applied,false);
    assert.deepEqual(result.historical,initial);
  }
});
test('all fields must be valid before historical data is committed',()=>{
  const result=commitDraftHistoricalForm({...input,deliveredStoryPointsText:'300',qaEffectiveDaysText:''},initial);
  assert.equal(result.applied,false);
  assert.equal(result.historical.deliveredStoryPoints,100);
  assert.ok(result.errors.qaEffectiveDaysText);
});
