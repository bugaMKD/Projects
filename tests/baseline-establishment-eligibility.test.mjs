import test from 'node:test';
import assert from 'node:assert/strict';
import { getBaselineEstablishmentEligibility } from '../src/models/BaselineEstablishmentEligibility.ts';

const release={releaseName:'Release Alpha',scopeStoryPoints:240,variationPercent:15};
const releaseForm={releaseName:'Release Alpha',scopeText:'240',variationPercent:15};
const historical={deliveredStoryPoints:100,seEffectiveDays:100,qaEffectiveDays:50};
const historicalForm={deliveredStoryPointsText:'100',seEffectiveDaysText:'100',qaEffectiveDaysText:'50'};
const members=[{id:'a',name:'SE',role:'SE',availableDays:10,productivity:1},{id:'b',name:'QA',role:'QA',availableDays:5,productivity:1}];
const memberForm=[{id:'a',name:'SE',role:'SE',availableDaysText:'10',productivityPercentText:'100'},{id:'b',name:'QA',role:'QA',availableDaysText:'5',productivityPercentText:'100'}];
const check=(r=releaseForm, h=historicalForm, m=memberForm)=>getBaselineEstablishmentEligibility(r,release,h,historical,m,members);
test('valid committed inputs can establish BL',()=>assert.deepEqual(check(),{allowed:true,reason:null}));
test('unapplied scope change cannot accidentally establish previous scope',()=>assert.equal(check({...releaseForm,scopeText:'250'}).allowed,false));
test('invalid scope cannot establish BL',()=>assert.equal(check({...releaseForm,scopeText:''}).allowed,false));
test('unapplied historical change cannot be silently discarded',()=>assert.equal(check(releaseForm,{...historicalForm,qaEffectiveDaysText:'40'}).allowed,false));
test('invalid historical form prevents establishment',()=>assert.equal(check(releaseForm,{...historicalForm,qaEffectiveDaysText:''}).allowed,false));
test('unapplied future capacity prevents establishment',()=>assert.equal(check(releaseForm,historicalForm,memberForm.map((m,i)=>i===0?{...m,availableDaysText:'7'}:m)).allowed,false));
test('invalid future capacity prevents establishment',()=>assert.equal(check(releaseForm,historicalForm,memberForm.map((m,i)=>i===0?{...m,productivityPercentText:'200'}:m)).allowed,false));
test('different member count prevents establishing stale team',()=>assert.equal(check(releaseForm,historicalForm,memberForm.slice(1)).allowed,false));
