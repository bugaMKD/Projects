import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ReleaseManagement } from './components/ReleaseManagement';
import { createBrowserReleaseRepository } from './repositories/LocalStorageReleaseRepository';
import type { ReleaseRecord, ReleaseInputs } from './models/ReleaseRecord';
import type { EstablishedBaseline } from './models/EstablishedBaseline';
import { historicalMock } from './mockData';
import { getInitialDraftBaselineConfig } from './data/originalReleaseDataset';
import { DEFAULT_SPRINT_CAPACITY_MEMBERS } from './models/DraftSprintCapacityInput';
import { INITIAL_NAVIGATION, navigateToManagement, navigateToNewRelease, navigateToSavedRelease, reconcileDeletedRelease, type NavigationState } from './navigation/ReleaseNavigation';
import { newWorkspaceSession, openWorkspaceSession, editWorkspaceSession, persistWorkspaceDraft, persistWorkspaceBaseline, persistWorkspaceSprintResults, type WorkspaceSession } from './services/ReleaseWorkspaceOperations';
import ReleaseWorkspace from './ReleaseWorkspace';
import { duplicateReleaseToNewSession } from './services/DuplicateRelease';
import { getSprintResults, parseSprintResult, validateSprintResults, type SprintResult } from './models/SprintResult';

/** 5.4.2: the app shell selects one persisted or new release; the simulator owns editable form text. */
export default function App() {
  const [navigation, setNavigation] = useState<NavigationState>(INITIAL_NAVIGATION);
  const [session, setSession] = useState<WorkspaceSession | null>(null);
  const [workspaceEpoch, setWorkspaceEpoch] = useState(0);
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
  const repository = useMemo(() => {
    try { return createBrowserReleaseRepository(); }
    catch { return null; }
  }, []);

  const refresh = useCallback(() => {
    if (!repository) { setStorageError('Browser storage is unavailable. Saved records were not modified.'); return; }
    try { setReleases(repository.listReleases()); setStorageError(null); }
    catch (error) { setStorageError(error instanceof Error ? error.message : 'Cannot read releases.'); setReleases([]); }
  }, [repository]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const acceptLeave = (): boolean => !dirtyRef.current || window.confirm('This release has unsaved changes. Discard changes and continue?');
  const onDirtyChange = useCallback((dirty: boolean) => { dirtyRef.current = dirty; }, []);
  const goToManagement = () => {
    if (navigation.tab !== 'management' && !acceptLeave()) return;
    dirtyRef.current = false;
    setNavigation(state => navigateToManagement(state));
    refresh();
  };
  const startNewRelease = () => {
    if (!acceptLeave()) return;
    if (!repository || storageError) { setStorageError('Cannot create release while storage is unavailable.'); return; }
    const id = crypto.randomUUID();
    const inputs: ReleaseInputs = {
      release: getInitialDraftBaselineConfig(),
      historical: { ...historicalMock },
      sprintMembers: DEFAULT_SPRINT_CAPACITY_MEMBERS.map(member => ({ ...member })),
    };
    setSession(newWorkspaceSession(id, new Date().toISOString(), inputs));
    setWorkspaceEpoch(n => n + 1);
    dirtyRef.current = true;
    setNavigation(navigateToNewRelease());
  };
  const openRelease = (id: string) => {
    if (!acceptLeave()) return;
    if (!repository || storageError) return;
    try {
      const next = openWorkspaceSession(repository, id);
      setSession(next);
      setWorkspaceEpoch(n => n + 1);
      dirtyRef.current = false;
      setNavigation(navigateToSavedRelease(id, releases));
      setStorageError(null);
    } catch (error) { setStorageError(error instanceof Error ? error.message : 'Cannot open release.'); }
  };
  const duplicateRelease = (id: string) => {
    if (!acceptLeave()) return;
    if (!repository || storageError) return;
    try {
      // Read the current persisted source, not a possibly stale list snapshot.
      const original = repository.getRelease(id);
      if (!original) throw new Error('Release not found. Refresh the list.');
      const next = duplicateReleaseToNewSession(original, crypto.randomUUID(), new Date().toISOString());
      setSession(next);
      setWorkspaceEpoch(n => n + 1);
      dirtyRef.current = true; // The duplicated draft intentionally has NOT been saved.
      setNavigation(navigateToNewRelease());
      setStorageError(null);
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Cannot duplicate release.');
    }
  };
  const deleteRelease = (id: string) => {
    const record = releases.find(item => item.id === id);
    if (!record || !repository || storageError) return;
    if (session?.saved.id === id && !acceptLeave()) return;
    if (!window.confirm(`Delete "${record.draft.release.releaseName}"? This cannot be undone.`)) return;
    try {
      repository.deleteRelease(id);
      setNavigation(state => reconcileDeletedRelease(state, id));
      if (session?.saved.id === id) { setSession(null); dirtyRef.current = false; }
      refresh();
    } catch (error) { setStorageError(error instanceof Error ? error.message : 'Cannot delete release.'); }
  };

  const saveDraft = (inputs: ReleaseInputs) => {
    if (!repository || !session) throw new Error('No active release or storage repository.');
    // Persist only after explicit action, and keep the session unchanged on failure.
    const updated = persistWorkspaceDraft(repository, editWorkspaceSession(session, inputs), new Date().toISOString());
    setSession(updated);
    dirtyRef.current = false;
    refresh();
  };
  const establish = (inputs: ReleaseInputs, snapshot: EstablishedBaseline) => {
    if (!repository || !session) throw new Error('No active release or storage repository.');
    const updated = persistWorkspaceBaseline(repository, editWorkspaceSession(session, inputs), new Date().toISOString(), snapshot);
    setSession(updated);
    dirtyRef.current = false;
    refresh();
  };

  const recordSprint = (pointsText: string, seDaysText: string, qaDaysText: string) => {
    if (!repository || !session) throw new Error('No active release or storage repository.');
    const row = parseSprintResult(pointsText, seDaysText, qaDaysText);
    const next = [...getSprintResults(session.saved), row];
    const updated = persistWorkspaceSprintResults(repository, session, new Date().toISOString(), next);
    setSession(updated);
    refresh();
  };

  const saveActualChanges = (preview: readonly SprintResult[]) => {
    if (!repository || !session) throw new Error('No active release or storage repository.');
    const saved = getSprintResults(session.saved);
    if (preview.length !== saved.length) throw new Error('Corrections cannot add or remove completed sprints.');
    validateSprintResults(preview);
    const updated = persistWorkspaceSprintResults(repository, session, new Date().toISOString(), preview);
    setSession(updated);
    refresh();
  };

  const navButton: React.CSSProperties = { padding: '11px 18px', borderRadius: 8, border: '1px solid #c9d4e2', cursor: 'pointer', font: 'inherit' };
  return <div style={{ minHeight: '100vh', background: '#f5f7fb', color: '#18273d' }}>
    <div style={{ background: '#fff', borderBottom: '1px solid #e0e6ef' }}>
      <header style={{ maxWidth: 1200, margin: 'auto', padding: '18px 24px 12px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ background: '#2767cf', color: '#fff', borderRadius: 8, padding: '8px 12px', fontWeight: 800 }}>P</div>
        <div><strong>PSP Delivery Simulator</strong><div style={{ fontSize: 12, color: '#617188' }}>Release planning and forecasting</div></div>
      </header>
      <nav aria-label="Application tabs" style={{ maxWidth: 1200, margin: 'auto', display: 'flex', gap: 8, padding: '0 24px 14px', flexWrap: 'wrap' }}>
        <button type="button" aria-current={navigation.tab === 'management' ? 'page' : undefined} onClick={goToManagement}
          style={{ ...navButton, background: navigation.tab === 'management' ? '#dceafd' : '#fff', fontWeight: navigation.tab === 'management' ? 700 : 400 }}>Release Management</button>
        <button type="button" aria-current={navigation.tab === 'workspace' ? 'page' : undefined}
          onClick={() => { if (session) setNavigation(state => ({ ...state, tab: 'workspace' })); }}
          style={{ ...navButton, background: navigation.tab === 'workspace' ? '#dceafd' : '#fff', fontWeight: navigation.tab === 'workspace' ? 700 : 400 }}>Release Workspace</button>
      </nav>
    </div>
    {navigation.tab === 'management' ? <main style={{ maxWidth: 1100, margin: '0 auto', padding: '26px 24px' }}>
      <ReleaseManagement releases={releases} error={storageError} onRefresh={refresh}
        onNew={startNewRelease} onOpen={openRelease} onDelete={deleteRelease} onDuplicate={duplicateRelease} />
    </main> : session ? <ReleaseWorkspace
      key={`${session.saved.id}:${workspaceEpoch}`}
      session={session}
      onSaveDraft={saveDraft}
      onEstablishBaseline={establish}
      onDirtyChange={onDirtyChange}
      onRecordSprint={recordSprint}
      onSaveActualChanges={saveActualChanges}
    /> : <main style={{ maxWidth: 1100, margin: '30px auto', padding: 24 }}>
      Choose a saved release or create a new release in Release Management.
    </main>}
  </div>;
}
