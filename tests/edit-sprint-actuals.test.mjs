import test from 'node:test';
import assert from 'node:assert/strict';
import { previewSprintEdit, validateSprintEditPreview, hasSprintEditChanges } from '../src/services/EditSprintActuals.ts';

const history = Object.freeze([29,25,34,28]);
test('5.4.5c updates only the requested sprint in a preview', () => {
  assert.deepEqual(previewSprintEdit(history,1,'40'),[29,40,34,28]);
  assert.deepEqual(history,[29,25,34,28]);
});
test('zero-SP corrections are valid',()=>assert.deepEqual(previewSprintEdit(history,0,'0'),[0,25,34,28]));
test('decimal SP corrections remain precise',()=>assert.equal(previewSprintEdit(history,3,'28.75')[3],28.75));
test('rejects empty input',()=>assert.throws(()=>previewSprintEdit(history,2,' ')));
test('rejects negative input',()=>assert.throws(()=>previewSprintEdit(history,2,'-1')));
test('rejects non-finite input',()=>assert.throws(()=>previewSprintEdit(history,2,'Infinity')));
test('rejects nonexistent sprint',()=>{
  for(const n of [-1,4,1.5,NaN]) assert.throws(()=>previewSprintEdit(history,n,'10'));
});
test('rejects corrupt recorded values',()=>assert.throws(()=>previewSprintEdit([1,-1],0,'2')));
test('preview allows editing multiple existing sprints',()=>{
  const a=previewSprintEdit(history,1,'31');
  const b=previewSprintEdit(a,3,'50');
  assert.deepEqual(b,[29,31,34,50]);
});
test('save validation keeps same number of sprints',()=>{
  assert.deepEqual(validateSprintEditPreview(history,[29,40,34,28]),[29,40,34,28]);
  assert.throws(()=>validateSprintEditPreview(history,[29,40,34]));
  assert.throws(()=>validateSprintEditPreview(history,[29,40,34,28,1]));
});
test('save validation rejects negative and non-finite values',()=>{
  assert.throws(()=>validateSprintEditPreview(history,[29,-1,34,28]));
  assert.throws(()=>validateSprintEditPreview(history,[29,Infinity,34,28]));
});
test('returned save array is independent of preview',()=>{
  const p=[29,41,34,28]; const v=validateSprintEditPreview(history,p);
  p[1]=9;
  assert.equal(v[1],41);
});
test('only changed preview is considered dirty',()=>{
  assert.equal(hasSprintEditChanges(history,null),false);
  assert.equal(hasSprintEditChanges(history,[...history]),false);
  assert.equal(hasSprintEditChanges(history,[29,26,34,28]),true);
  assert.equal(hasSprintEditChanges(history,[29,25,34]),true);
});
test('undoing the edit returns to recorded values without saving',()=>{
  const a=previewSprintEdit(history,2,'33');
  const b=previewSprintEdit(a,2,'34');
  assert.equal(hasSprintEditChanges(history,b),false);
});
