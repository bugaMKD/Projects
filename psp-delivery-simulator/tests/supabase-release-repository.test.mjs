import test from 'node:test';
import assert from 'node:assert/strict';
import { createDraftRelease, establishRelease, replaceReleaseActuals } from '../src/models/ReleaseRecord.ts';
import { SupabaseReleaseRepository, ReleaseConflictError } from '../src/repositories/SupabaseReleaseRepository.ts';

const inputs = {
  release: { releaseName: 'Remote release', scopeStoryPoints: 100, variationPercent: 10 },
  historical: { deliveredStoryPoints: 100, seEffectiveDays: 100, qaEffectiveDays: 50 },
  sprintMembers: [{ id: 'se', name: 'Engineer', role: 'SE', availableDays: 10, productivity: 1 }],
};
const now = '2026-11-23T12:00:00.000Z';
const draft = () => createDraftRelease('release-1', now, inputs);
const clone = v => structuredClone(v);

// Small PostgREST-like stub: exercises ownership, validation, stale revisions and no localStorage access.
function backend() {
  const rows = new Map();
  const context = { user: 'user-a', rows };
  const client = {
    auth: { getUser: async () => ({data:{user:context.user ? {id:context.user} : null}, error:null}) },
    from(table) {
      assert.equal(table, 'psp_releases');
      let verb = 'select', values = {}, filters = [];
      const query = {
        select() { return query; },
        insert(row) { verb = 'insert'; values = row; return query; },
        update(row) { verb = 'update'; values = row; return query; },
        delete() { verb = 'delete'; return query; },
        eq(key, value) { filters.push([key,value]); return query; },
        maybeSingle() { return Promise.resolve(run(true)); },
        single() { return Promise.resolve(run(true)); },
        then(resolve, reject) { return Promise.resolve(run(false)).then(resolve, reject); },
      };
      function run(single) {
        const matches = () => [...rows.values()].filter(r => r.owner_id === context.user && filters.every(([k,v]) => r[k] === v));
        if (verb === 'insert') {
          const key = `${values.owner_id}:${values.id}`;
          if (rows.has(key)) return {data:null,error:{code:'23505',message:'duplicate key'}};
          if (values.owner_id !== context.user) return {data:null,error:{message:'RLS rejected'}};
          const row = {...clone(values),revision:1};rows.set(key,row);
          return {data:clone(row), error:null};
        }
        if (verb === 'update') {
          const row = matches()[0];
          if (!row) return {data:null,error:null};
          row.payload=clone(values.payload);row.revision++;
          return {data:clone(row),error:null};
        }
        if (verb === 'delete') {
          const list=matches();for(const row of list) rows.delete(`${row.owner_id}:${row.id}`);
          return {data:list.map(r=>({id:r.id})),error:null};
        }
        const data=matches().map(clone);
        return {data:single ? (data[0]??null) : data,error:null};
      }
      return query;
    },
  };
  return { context, client };
}

test('new release saves and loads with isolated owner; list is copy-safe', async () => {
  const { context, client } = backend();
  const repo = new SupabaseReleaseRepository(client);
  assert.deepEqual(await repo.listReleases(), []);
  await repo.saveRelease(draft());
  const records = await repo.listReleases();
  assert.equal(records.length,1);
  records[0].draft.release.releaseName='mutated';
  assert.equal((await repo.getRelease('release-1')).draft.release.releaseName, 'Remote release');
  context.user='user-b';
  assert.deepEqual(await repo.listReleases(), []);
  assert.equal(await repo.getRelease('release-1'),null);
  context.user='user-a';
  assert.equal((await repo.listReleases()).length,1);
});

test('existing records require revision; stale concurrent update rejects', async () => {
  const { client } = backend();
  const a = new SupabaseReleaseRepository(client);
  const b = new SupabaseReleaseRepository(client);
  await a.saveRelease(draft());
  await b.getRelease('release-1');
  await a.saveRelease({...draft(),updatedAt:'2026-11-23T13:00:00.000Z'});
  await assert.rejects(b.saveRelease({...draft(),updatedAt:'2026-11-23T14:00:00.000Z'}), ReleaseConflictError);
  await assert.rejects(b.deleteRelease('release-1'), ReleaseConflictError);
  assert.equal((await a.getRelease('release-1')).updatedAt, '2026-11-23T13:00:00.000Z');
});

test('reject invalid payload; enforce baseline immutability and allow actuals', async () => {
  const { client } = backend();
  const repo = new SupabaseReleaseRepository(client);
  await assert.rejects(repo.saveRelease({...draft(),completedSprintPoints:[-1]}), /malformed/);
  await repo.saveRelease(draft());
  const baseline = {
    ...inputs,
    forecast:{forecastStatus:'forecastable',forecastFinishes:{optimistic:1,realistic:2,pessimistic:3},
      scenarioThroughputs:{optimistic:100,realistic:50,pessimistic:25},
      points:[{sprintNumber:0,sprint:'Start',scope:100,optimistic:0,realistic:0,pessimistic:0}]},
  };
  const established = establishRelease(draft(), now, baseline);
  await repo.saveRelease(established);
  //await assert.rejects(repo.saveRelease({...established,establishedBaseline:{...baseline,release:{...baseline.release,scopeStoryPoints:200}}}), /Cannot modify/);
  const modifiedBaseline = {
    ...established,
    draft: {
      ...established.draft,
      release: {
        ...established.draft.release,
        scopeStoryPoints: 200,
      },
    },
    establishedBaseline: {
      ...established.establishedBaseline,
      release: {
        ...established.establishedBaseline.release,
        scopeStoryPoints: 200,
      },
      forecast: {
        ...established.establishedBaseline.forecast,
        points: established.establishedBaseline.forecast.points.map(
          point => ({ ...point, scope: 200 })
        ),
      },
    },
  };
  await assert.rejects(
    repo.saveRelease(modifiedBaseline),
    /Cannot modify/
  );
  const withActuals=replaceReleaseActuals(established,'2026-11-23T15:00:00.000Z',[15]);
  await repo.saveRelease(withActuals);
  assert.deepEqual((await repo.getRelease('release-1')).completedSprintPoints,[15]);
});

test('duplicate release IDs never silently overwrite; deletes are revision checked', async () => {
  const { client }=backend();
  const a=new SupabaseReleaseRepository(client), b=new SupabaseReleaseRepository(client);
  await a.saveRelease(draft());
  await assert.rejects(b.saveRelease(draft()),ReleaseConflictError);
  assert.equal(await a.deleteRelease('release-1'),true);
  assert.equal(await a.deleteRelease('release-1'),false);
});

test('without authentication, all operations fail before querying',async()=>{
  const {client,context}=backend();context.user=null;
  const repo=new SupabaseReleaseRepository(client);
  await assert.rejects(repo.listReleases(), /Sign in/);
  await assert.rejects(repo.saveRelease(draft()), /Sign in/);
});
