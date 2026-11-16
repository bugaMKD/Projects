import test from 'node:test';
import assert from 'node:assert/strict';
import {appendCompletedSprint,parseCompletedSprintPoints} from '../src/services/ActualSprintEntry.ts';

test('positive fractional SP is valid',()=>assert.equal(parseCompletedSprintPoints(' 4.5 '),4.5));
test('zero is a valid completed sprint',()=>assert.equal(parseCompletedSprintPoints('0'),0));
test('empty input rejected, rather than converted to zero',()=>assert.equal(parseCompletedSprintPoints('  '),null));
test('negative completed SP rejected',()=>assert.equal(parseCompletedSprintPoints('-1'),null));
test('NaN and Infinity rejected',()=>{assert.equal(parseCompletedSprintPoints('NaN'),null);assert.equal(parseCompletedSprintPoints('Infinity'),null);});
test('adds only the next increment, never cumulative total',()=>assert.deepEqual(appendCompletedSprint([10,20],'5'),[10,20,5]));
test('append does not mutate the prior history',()=>{const history=[29,25];const next=appendCompletedSprint(history,'0');assert.deepEqual(history,[29,25]);assert.notEqual(next,history);});
test('invalid input leaves history unchanged',()=>{const history=[10];assert.throws(()=>appendCompletedSprint(history,'-2'));assert.deepEqual(history,[10]);});
test('existing invalid history rejected before appending',()=>assert.throws(()=>appendCompletedSprint([1,-1],'2')));
test('decimals remain precise in the saved history',()=>assert.deepEqual(appendCompletedSprint([1.1],'2.25'),[1.1,2.25]));
