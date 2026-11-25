import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../pspSidebar.css';
import '../pspWorkspacePicker.css';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReleaseInputs, ReleaseRecord } from '../models/ReleaseRecord';
import { saveDraftRelease, establishRelease, replaceReleaseSprintResults } from '../models/ReleaseRecord';
import type { EstablishedBaseline } from '../models/EstablishedBaseline';
import { getSprintResults, parseSprintResult, validateSprintResults, type SprintResult } from '../models/SprintResult';
import { historicalMock } from '../mockData';
import { getInitialDraftBaselineConfig } from '../data/originalReleaseDataset';
import { DEFAULT_SPRINT_CAPACITY_MEMBERS } from '../models/DraftSprintCapacityInput';
import { ReleaseManagement } from '../components/ReleaseManagement';
import ReleaseWorkspace from '../ReleaseWorkspace';
import { INITIAL_NAVIGATION, navigateToManagement, navigateToNewRelease, navigateToSavedRelease, reconcileDeletedRelease, type NavigationState } from '../navigation/ReleaseNavigation';
import { duplicateReleaseToNewSession } from '../services/DuplicateRelease';
import { editWorkspaceSession, hasUnsavedDraftChanges, newWorkspaceSession, type WorkspaceSession } from '../services/ReleaseWorkspaceOperations';
import { RELEASE_SCHEMA_VERSION } from '../models/ReleaseRecord';
import { PSP_BACKUP_FORMAT, PSP_BACKUP_VERSION, serializeReleaseBackup } from '../services/ReleaseBackup';
import { parseReleaseCollection } from '../repositories/LocalStorageReleaseRepository';
import { ReleaseConflictError, SupabaseReleaseRepository } from '../repositories/SupabaseReleaseRepository';

/** Authenticated PSP workspace; all persistence goes to Supabase, never localStorage. */
export function CloudWorkspaceApp({ client, userId, userEmail, onSignOut, signingOut = false }: {
  client: SupabaseClient;
  userId: string;
  userEmail?: string;
  onSignOut?: () => void;
  signingOut?: boolean;
}) {
  const repository = useMemo(() => new SupabaseReleaseRepository(client), [client, userId]);
  // Keep listing separate from the open release's revision snapshot. A list refresh
  // must never advance the save revision of a stale workspace.
  const listRepository = useMemo(() => new SupabaseReleaseRepository(client), [client, userId]);
  const [navigation, setNavigation] = useState<NavigationState>(INITIAL_NAVIGATION);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [session, setSession] = useState<WorkspaceSession | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const dirtyRef = useRef(false);

  const refresh = useCallback(async () => {
    const rows = await listRepository.listReleases();
    setReleases(rows);
    setError(null);
    return rows;
  }, [listRepository]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    void listRepository.listReleases().then(rows => {
      if (active) { setReleases(rows); setError(null); setLoading(false); }
    }).catch((caught: unknown) => {
      if (active) { setError(caught instanceof Error ? caught.message : 'Unable to load cloud releases.'); setLoading(false); }
    });
    return () => { active = false; };
  }, [listRepository]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current || pendingRef.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const acceptLeave = () => !pendingRef.current && (!dirtyRef.current || window.confirm('This release has unsaved changes. Discard them?'));
  const explain = (caught: unknown) => caught instanceof ReleaseConflictError
    ? `${caught.message} Changes were not confirmed. Refresh and reopen the release before retrying.`
    : caught instanceof Error ? caught.message : 'Cloud operation failed.';

  // Pending guard must be synchronous: a double-click before React re-render cannot issue two writes.
  const run = async (operation: () => Promise<void>) => {
    if (pendingRef.current || loading) throw new Error('Cloud operation already in progress.');
    pendingRef.current = true;
    setPending(true);
    setError(null);
    try { await operation(); }
    catch (caught) { setError(explain(caught)); throw caught; }
    finally { pendingRef.current = false; setPending(false); }
  };
  const runButton = (operation: () => Promise<void>) => { void run(operation).catch(() => {}); };

  const goManagement = () => {
    if (!acceptLeave()) return;
    dirtyRef.current = false;
    setNavigation(navigateToManagement);
    runButton(async () => { await refresh(); });
  };
  const newRelease = () => {
    if (!acceptLeave() || error || loading) return;
    const inputs: ReleaseInputs = {
      release: getInitialDraftBaselineConfig(),
      historical: { ...historicalMock },
      sprintMembers: DEFAULT_SPRINT_CAPACITY_MEMBERS.map(item => ({ ...item })),
    };
    setSession(newWorkspaceSession(crypto.randomUUID(), new Date().toISOString(), inputs));
    setEpoch(value => value + 1);
    dirtyRef.current = true;
    setNavigation(navigateToNewRelease());
  };
  const openRelease = (id: string) => {
    if (!acceptLeave() || error) return;
    runButton(async () => {
      const record = await repository.getRelease(id);
      if (!record) throw new Error('Release not found. Refresh the cloud release list.');
      setSession({ saved: record, committed: structuredClone(record.draft), persisted: true });
      setEpoch(value => value + 1);
      dirtyRef.current = false;
      setNavigation(navigateToSavedRelease(id, [record]));
    });
  };
  const duplicate = (id: string) => {
    if (!acceptLeave() || error) return;
    runButton(async () => {
      const record = await repository.getRelease(id);
      if (!record) throw new Error('Source release not found. Refresh.');
      setSession(duplicateReleaseToNewSession(record, crypto.randomUUID(), new Date().toISOString()));
      setEpoch(value => value + 1);
      dirtyRef.current = true;
      setNavigation(navigateToNewRelease());
    });
  };
  const remove = (id: string) => {
    const record = releases.find(item => item.id === id);
    if (!record || !acceptLeave()) return;
    if (!window.confirm(`Delete cloud release "${record.draft.release.releaseName}"? This cannot be undone.`)) return;
    runButton(async () => {
      await repository.deleteRelease(id);
      setNavigation(current => reconcileDeletedRelease(current, id));
      if (session?.saved.id === id) { setSession(null); dirtyRef.current = false; }
      await refresh();
    });
  };
  const downloadBackup = () => {
    if (pendingRef.current || loading || error) return;
    runButton(async () => {
      // Export from a fresh validated server snapshot, not a possibly stale UI list.
      const rows = await listRepository.listReleases();
      const backup = {
        format: PSP_BACKUP_FORMAT,
        backupVersion: PSP_BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        collection: parseReleaseCollection({ schemaVersion: RELEASE_SCHEMA_VERSION, releases: rows }),
      };
      const blob = new Blob([serializeReleaseBackup(backup)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `psp-cloud-backup-${backup.exportedAt.slice(0, 10)}.json`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  };

  const persist = (create: (active: WorkspaceSession) => ReleaseRecord) => run(async () => {
    if (!session) throw new Error('No active release.');
    const next = create(session);
    // Leave the UI/session unchanged until Supabase confirms the write.
    await repository.saveRelease(next);
    setSession({ saved: next, committed: structuredClone(next.draft), persisted: true });
    dirtyRef.current = false;
    // A list-refresh failure must not be mistaken for a failed write.
    try { await refresh(); }
    catch { setError('Release saved, but the cloud list could not refresh. Refresh the list before continuing.'); }
  });
  const saveDraft = (inputs: ReleaseInputs) => persist(active => {
    if (active.saved.baselineStatus !== 'draft') throw new Error('Established baseline inputs are locked.');
    const edited = editWorkspaceSession(active, inputs);
    return saveDraftRelease(active.saved, new Date().toISOString(), edited.committed);
  });
  const establish = (inputs: ReleaseInputs, snapshot: EstablishedBaseline) => persist(active => {
    if (active.saved.baselineStatus !== 'draft') throw new Error('Baseline already established.');
    const edited = editWorkspaceSession(active, inputs);
    const draft = saveDraftRelease(active.saved, new Date().toISOString(), edited.committed);
    return establishRelease(draft, new Date().toISOString(), snapshot);
  });
  const saveResults = (results: readonly SprintResult[]) => persist(active => {
    if (!active.persisted || hasUnsavedDraftChanges(active)) throw new Error('Save Draft before recording actuals.');
    validateSprintResults(results);
    const previous = getSprintResults(active.saved);
    if (results.length !== previous.length && results.length !== previous.length + 1) {
      throw new Error('Sprint results may update entries or append exactly one sprint.');
    }
    return replaceReleaseSprintResults(active.saved, new Date().toISOString(), results);
  });
  const recordSprint = (points: string, se: string, qa: string) => {
    if (!session) return Promise.reject(new Error('No release selected.'));
    return saveResults([...getSprintResults(session.saved), parseSprintResult(points, se, qa)]);
  };
  const correctSprint = (results: readonly SprintResult[]) => {
    if (!session || results.length !== getSprintResults(session.saved).length) {
      return Promise.reject(new Error('Sprint corrections cannot add or remove sprints.'));
    }
    return saveResults(results);
  };

  const goWorkspace = () => {
    if (pendingRef.current || loading) return;
    // An active session is optional: the workspace can first offer release selection.
    setNavigation(value => ({ ...value, tab: 'workspace' }));
  };

  return <main className={`psp-shell ${sidebarOpen ? '' : 'psp-shell--collapsed'}`}>
    <aside className="psp-sidebar" aria-label="PSP navigation">
      <div className="psp-sidebar__top">
        <div className="psp-sidebar__brand" title="PSP Delivery Simulator">
          <span className="psp-sidebar__mark" aria-hidden="true">P</span>
          {sidebarOpen && <span className="psp-sidebar__brand-name">PSP <small>Delivery Simulator</small></span>}
        </div>
        <button type="button" className="psp-sidebar__toggle" aria-label={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
          aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(open => !open)} title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
          {sidebarOpen ? '‹' : '›'}
        </button>
      </div>
      <div className="psp-sidebar__account" title={userEmail || 'Signed-in account'}>
        <span className="psp-sidebar__avatar" aria-hidden="true">{(userEmail || 'U').charAt(0).toUpperCase()}</span>
        {sidebarOpen && <span className="psp-sidebar__identity"><strong>Signed in</strong><small>{userEmail || 'Authenticated user'}</small></span>}
      </div>
      <nav className="psp-sidebar__nav" aria-label="Workspace sections">
        <button type="button" className={`psp-sidebar__item ${navigation.tab === 'management' ? 'psp-sidebar__item--active' : ''}`}
          aria-current={navigation.tab === 'management' ? 'page' : undefined} title="Release Management" disabled={pending || loading}
          onClick={goManagement}>
          <span className="psp-sidebar__item-icon" aria-hidden="true">▤</span>{sidebarOpen && <span>Release Management</span>}
        </button>
        <button type="button" className={`psp-sidebar__item ${navigation.tab === 'workspace' ? 'psp-sidebar__item--active' : ''}`}
          aria-current={navigation.tab === 'workspace' ? 'page' : undefined} title="Workspace"
          disabled={pending || loading} onClick={goWorkspace}>
          <span className="psp-sidebar__item-icon" aria-hidden="true">▦</span>{sidebarOpen && <span>Workspace</span>}
        </button>
      </nav>
      {onSignOut && <button type="button" className="psp-sidebar__signout" title="Sign out"
        disabled={pending || signingOut} onClick={() => { if (acceptLeave()) onSignOut(); }}>
        <span aria-hidden="true" className="psp-sidebar__item-icon">⇥</span>{sidebarOpen && <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>}
      </button>}
    </aside>
    <section className="psp-shell__main">
      <div className="psp-shell__body">
        {loading && <p role="status">Loading cloud releases…</p>}
        {pending && <p role="status">Cloud operation in progress…</p>}
        {error && <p role="alert" style={{ color: '#b42318' }}>{error}</p>}
        {!loading && navigation.tab === 'management' && <ReleaseManagement releases={releases} error={error} onRefresh={() => runButton(async () => { await refresh(); })}
          onNew={newRelease} onOpen={openRelease} onDelete={remove} onDuplicate={duplicate} onExportBackup={downloadBackup} />}
        {!loading && navigation.tab === 'workspace' && !session && <section className="psp-workspace-picker" aria-label="Choose release for Workspace">
          <h2>Choose a release</h2>
          <p>Select a saved release to open its Workspace. No release is selected automatically.</p>
          {releases.length === 0 ? <p>No saved releases yet. Create your first release in Release Management.</p> :
            <div className="psp-workspace-picker__list">
              {releases.map(release => <button key={release.id} type="button" disabled={pending}
                className="psp-workspace-picker__release" onClick={() => openRelease(release.id)}>
                <span>{release.draft.release.releaseName}</span>
                <small>{release.baselineStatus === 'established' ? 'Established baseline' : 'Draft'}</small>
              </button>)}
            </div>}
          <button type="button" className="psp-workspace-picker__manage" disabled={pending} onClick={goManagement}>
            Go to Release Management
          </button>
        </section>}
        {!loading && navigation.tab === 'workspace' && session && <ReleaseWorkspace key={`${session.saved.id}:${epoch}`} session={session}
          onSaveDraft={saveDraft} onEstablishBaseline={establish} onRecordSprint={recordSprint}
          onSaveActualChanges={correctSprint} onDirtyChange={value => { dirtyRef.current = value; }} />}
      </div>
    </section>
  </main>;
}
