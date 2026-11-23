import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createDraftRelease, replaceReleaseActuals, type ReleaseRecord } from '../models/ReleaseRecord';
import { getInitialDraftBaselineConfig } from '../data/originalReleaseDataset';
import { DEFAULT_SPRINT_CAPACITY_MEMBERS } from '../models/DraftSprintCapacityInput';
import { historicalMock } from '../mockData';
import { releaseSummary } from '../navigation/ReleaseNavigation';
import { ReleaseConflictError, SupabaseReleaseRepository } from '../repositories/SupabaseReleaseRepository';

const buttonStyle = { padding: '7px 11px', cursor: 'pointer' };
const inputStyle = { padding: '7px', maxWidth: '100%', boxSizing: 'border-box' as const };

/** Step 3C.2: explicitly isolated cloud write test surface. Never reads or modifies localStorage.
 * The main PSP workspace is still local-only; no automatic migration/sync occurs here.
 */
export function CloudReleasesPreview({ client, userId }: { client: SupabaseClient; userId: string }) {
  const repository = useMemo(() => new SupabaseReleaseRepository(client), [client]);
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createName, setCreateName] = useState('PSP cloud test release');
  const [createScope, setCreateScope] = useState('100');
  const [editName, setEditName] = useState('');
  const [editScope, setEditScope] = useState('');
  const [actualText, setActualText] = useState('');
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  const selected = releases.find(record => record.id === selectedId) ?? null;

  const refresh = useCallback(() => setGeneration(value => value + 1), []);
  useEffect(() => {
    let active = true;
    setReleases([]);
    setSelectedId(null);
    setLoading(true);
    setError(null);
    setNotice(null);
    void repository.listReleases().then(records => {
      if (active) { setReleases(records); setLoading(false); }
    }).catch((caught: unknown) => {
      if (active) {
        setError(caught instanceof Error ? caught.message : 'Unable to load cloud releases.');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [repository, userId, generation]);

  const select = (record: ReleaseRecord) => {
    if (pending || loading) return;
    setSelectedId(record.id);
    setEditName(record.draft.release.releaseName);
    setEditScope(String(record.draft.release.scopeStoryPoints));
    setActualText('');
    setError(null);
    setNotice(null);
  };

  const runWrite = async (message: string, operation: () => Promise<void>) => {
    if (pending || loading) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      await operation();
      // Re-read the canonical server data; do not report success unless confirmed.
      const fresh = await repository.listReleases();
      setReleases(fresh);
      setNotice(message);
    } catch (caught) {
      const detail = caught instanceof Error ? caught.message : 'Cloud operation failed.';
      setError(caught instanceof ReleaseConflictError
        ? `${detail} Use “Refresh cloud releases” before retrying; your changes were not confirmed.`
        : detail);
    } finally { setPending(false); }
  };

  const createTestDraft = () => runWrite('Cloud draft created and verified.', async () => {
    const scope = Number(createScope);
    if (!createName.trim() || !Number.isFinite(scope) || scope <= 0) {
      throw new Error('Enter a name and a positive, finite scope.');
    }
    const inputs = {
      release: { ...getInitialDraftBaselineConfig(), releaseName: createName.trim(), scopeStoryPoints: scope },
      historical: { ...historicalMock },
      sprintMembers: DEFAULT_SPRINT_CAPACITY_MEMBERS.map(member => ({ ...member })),
    };
    const now = new Date().toISOString();
    const record = createDraftRelease(crypto.randomUUID(), now, inputs);
    await repository.saveRelease(record);
    setSelectedId(record.id);
    setEditName(record.draft.release.releaseName);
    setEditScope(String(scope));
  });

  const saveDraft = () => runWrite('Cloud draft changes saved and verified.', async () => {
    if (!selected || selected.baselineStatus !== 'draft') throw new Error('Select a draft release first.');
    const scope = Number(editScope);
    if (!editName.trim() || !Number.isFinite(scope) || scope <= 0) {
      throw new Error('Enter a name and a positive, finite scope.');
    }
    await repository.saveRelease({
      ...selected,
      updatedAt: new Date().toISOString(),
      draft: { ...selected.draft, release: { ...selected.draft.release, releaseName: editName.trim(), scopeStoryPoints: scope } },
    });
  });

  const saveActual = () => runWrite('Completed sprint actuals saved and verified.', async () => {
    if (!selected) throw new Error('Select a cloud release first.');
    if (!actualText.trim()) throw new Error('Enter completed story points.');
    const points = Number(actualText);
    if (!Number.isFinite(points) || points < 0) throw new Error('Completed story points must be finite and non-negative.');
    const updated = replaceReleaseActuals(selected, new Date().toISOString(), [...selected.completedSprintPoints, points]);
    await repository.saveRelease(updated);
    setActualText('');
  });

  const remove = async () => {
    if (!selected || pending || loading) return;
    if (!window.confirm(`Permanently delete cloud release “${selected.draft.release.releaseName}”? This cannot be undone.`)) return;
    const id = selected.id;
    await runWrite('Cloud release deleted and verified.', async () => {
      const removed = await repository.deleteRelease(id);
      if (!removed) throw new ReleaseConflictError('Release no longer exists remotely.');
      setSelectedId(null);
    });
  };

  return <section aria-label="Supabase releases" style={{ borderTop: '1px solid #e0e6ef', marginTop: 24, paddingTop: 16 }}>
    <h2 style={{ fontSize: 18 }}>My Supabase releases — cloud operations test</h2>
    <p style={{ fontSize: 13, color: '#52627a', lineHeight: 1.5 }}>
      This is a <strong>separate cloud test workspace</strong>. It creates real records in your Supabase project.
      Your normal PSP workspace, saved local releases and established local baselines are unchanged.
      Use disposable test releases only; delete them after validation. No import or automatic sync is enabled.
    </p>
    <button type="button" disabled={loading || pending} onClick={refresh} style={buttonStyle}>
      {loading ? 'Loading…' : 'Refresh cloud releases'}
    </button>
    {loading ? <p role="status">Loading releases for this account…</p> : <>
      {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
      {notice && <p role="status" style={{ color: '#176d43' }}>{notice}</p>}
      <div style={{ marginTop: 16, padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }}>
        <h3 style={{ fontSize: 15, marginTop: 0 }}>Create disposable cloud draft</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          <label>Release name <input style={inputStyle} disabled={pending} value={createName} onChange={event => setCreateName(event.target.value)}/></label>
          <label>Scope (SP) <input type="number" min="0.01" step="any" style={inputStyle} disabled={pending} value={createScope} onChange={event => setCreateScope(event.target.value)}/></label>
          <button type="button" style={buttonStyle} disabled={pending} onClick={() => void createTestDraft()}>{pending ? 'Working…' : 'Create cloud draft'}</button>
        </div>
      </div>
      <h3 style={{ fontSize: 15 }}>Cloud releases ({releases.length})</h3>
      {releases.length === 0 ? <p role="status">No cloud releases for this account yet.</p> :
        <ul style={{ paddingLeft: 20 }}>
          {releases.map(record => {
            const summary = releaseSummary(record);
            return <li key={summary.id} style={{ margin: '12px 0' }}>
              <button type="button" disabled={pending} onClick={() => select(record)} style={{ ...buttonStyle, fontWeight: selectedId === record.id ? 700 : 400 }}>
                {summary.name}
              </button> — {summary.status}, {summary.scope} SP
              <div style={{ fontSize: 12, color: '#52627a' }}>Updated {new Date(summary.updatedAt).toLocaleString()}</div>
            </li>;
          })}
        </ul>}
      {selected && <div style={{ padding: 12, marginTop: 16, border: '1px solid #cbd5e1', borderRadius: 8 }}>
        <h3 style={{ fontSize: 15, marginTop: 0 }}>Selected cloud release</h3>
        <p style={{ fontSize: 13 }}>Status: <strong>{selected.baselineStatus}</strong>. Recorded sprints: {selected.completedSprintPoints.length}.
          {selected.baselineStatus === 'established' && ' Established baseline and draft inputs are locked.'}</p>
        <div aria-label="Recorded cloud sprint actuals" style={{ marginBottom: 16 }}>
          <strong style={{ fontSize: 13 }}>Recorded sprint actuals</strong>
          {selected.completedSprintPoints.length === 0 ?
            <p style={{ fontSize: 13 }}>No completed sprint actuals recorded yet.</p> :
            <>
              <ol style={{ margin: '8px 0', paddingLeft: 24 }}>
                {selected.completedSprintPoints.map((points, index) =>
                  <li key={index} style={{ fontSize: 13 }}>Sprint {index + 1}: {points} SP</li>
                )}
              </ol>
              <p style={{ fontSize: 13 }}>
                Total delivered: <strong>{selected.completedSprintPoints.reduce((sum, points) => sum + points, 0)} SP</strong>
              </p>
            </>}
        </div>
        {selected.baselineStatus === 'draft' && <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
          <label>Name <input style={inputStyle} disabled={pending} value={editName} onChange={event => setEditName(event.target.value)}/></label>
          <label>Scope (SP) <input type="number" min="0.01" step="any" style={inputStyle} disabled={pending} value={editScope} onChange={event => setEditScope(event.target.value)}/></label>
          <button type="button" style={buttonStyle} disabled={pending} onClick={() => void saveDraft()}>Save cloud draft changes</button>
        </div>}
        <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
          <label>Next completed sprint — actual SP <input type="number" min="0" step="any" style={inputStyle} disabled={pending} value={actualText} onChange={event => setActualText(event.target.value)}/></label>
          <button type="button" style={buttonStyle} disabled={pending} onClick={() => void saveActual()}>Record cloud sprint actuals</button>
        </div>
        <button type="button" disabled={pending} style={{ ...buttonStyle, color: '#b42318' }} onClick={() => void remove()}>Delete selected cloud release</button>
      </div>}
    </>}
  </section>;
}
