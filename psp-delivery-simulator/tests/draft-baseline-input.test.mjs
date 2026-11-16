import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftBaselineFormInput, parseDraftBaselineFormInput } from '../src/models/DraftBaselineInput.ts';

const form = {releaseName:'Release Alpha',scopeText:'240',variationPercent:15};
test('default form round trips to a valid draft',()=>{
 const initial={releaseName:'Release Alpha',scopeStoryPoints:240,variationPercent:15};
 assert.deepEqual(parseDraftBaselineFormInput(createDraftBaselineFormInput(initial)).config,initial);
});
test('valid release scope updates preserve decimals and full precision',()=>{
 assert.equal(parseDraftBaselineFormInput({...form,scopeText:'125.75'}).config.scopeStoryPoints,125.75);
});
test('blank scope is invalid rather than interpreted as zero',()=>{
 const parsed=parseDraftBaselineFormInput({...form,scopeText:'  '});
 assert.equal(parsed.config,null); assert.ok(parsed.errors.scopeText);
});
test('scope cannot be negative, infinity or nonnumeric',()=>{
 for(const scopeText of ['-3','Infinity','xyz','0']) assert.equal(parseDraftBaselineFormInput({...form,scopeText}).config,null);
});
test('blank release name is rejected',()=>{
 assert.equal(parseDraftBaselineFormInput({...form,releaseName:'  '}).config,null);
});
test('variation boundaries 0 and 30 are permitted',()=>{
 for(const variationPercent of [0,30]) assert.equal(parseDraftBaselineFormInput({...form,variationPercent}).config.variationPercent,variationPercent);
});
test('variation outside 0..30 is rejected',()=>{
 for(const variationPercent of [-1,31,NaN]) assert.equal(parseDraftBaselineFormInput({...form,variationPercent}).config,null);
});
test('invalid form does not mutate values used for last valid forecast',()=>{
 const initial={...form};
 parseDraftBaselineFormInput({...form,scopeText:''});
 assert.deepEqual(form,initial);
});
