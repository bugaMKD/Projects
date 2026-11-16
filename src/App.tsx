import { useCallback, useEffect, useMemo, useState } from 'react';
import { ReleaseManagement } from './components/ReleaseManagement';
import { createBrowserReleaseRepository } from './repositories/LocalStorageReleaseRepository';
import type { ReleaseRecord } from './models/ReleaseRecord';
import { INITIAL_NAVIGATION, navigateToManagement, navigateToNewRelease, navigateToSavedRelease, reconcileDeletedRelease, type NavigationState } from './navigation/ReleaseNavigation';
import ReleaseWorkspace from './ReleaseWorkspace';

/** Iteration 5.3: navigation and list/delete only. Persistence of workspace input is 5.4. */
export default function App() {
  const [navigation, setNavigation] = useState<NavigationState>(INITIAL_NAVIGATION);
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const repository = useMemo(() => {
    try { return createBrowserReleaseRepository(); }
    catch { return null; }
  }, []);

  const refresh = useCallback(() => {
    if (!repository) { setStorageError('Browser storage is unavailable. No saved records were modified.'); return; }
    try { setReleases(repository.listReleases()); setStorageError(null); }
    catch (error) { setStorageError(error instanceof Error ? error.message : 'Cannot read releases.'); setReleases([]); }
  }, [repository]);

  useEffect(() => { refresh(); }, [refresh]);

  const goToManagement = () => {
    setNavigation(state => navigateToManagement(state));
    refresh();
  };

  const deleteRelease = (id: string) => {
    const record = releases.find(item => item.id === id);
    if (!record || !repository) return;
    if (!window.confirm(`Delete "${record.draft.release.releaseName}"? This cannot be undone.`)) return;
    try { repository.deleteRelease(id); setNavigation(state => reconcileDeletedRelease(state, id)); refresh(); }
    catch (error) { setStorageError(error instanceof Error ? error.message : 'Cannot delete release.'); }
  };

  const openRelease = (id: string) => {
    if (storageError) return;
    try { setNavigation(navigateToSavedRelease(id, releases)); }
    catch (error) { setStorageError(error instanceof Error ? error.message : 'Cannot open release.'); }
  };

  const selectedReleaseId = navigation.selection.kind === 'saved' ? navigation.selection.releaseId : null;
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
          onClick={() => setNavigation(state => ({ ...state, tab: 'workspace' }))}
          style={{ ...navButton, background: navigation.tab === 'workspace' ? '#dceafd' : '#fff', fontWeight: navigation.tab === 'workspace' ? 700 : 400 }}>Release Workspace</button>
      </nav>
    </div>
    {navigation.tab === 'management' ? <main style={{ maxWidth: 1100, margin: '0 auto', padding: '26px 24px' }}>
      <ReleaseManagement releases={releases} error={storageError} onRefresh={refresh}
        onNew={() => setNavigation(navigateToNewRelease())} onOpen={openRelease} onDelete={deleteRelease} />
    </main> : <div>
      <aside role="status" style={{ maxWidth: 1100, margin: '18px auto', padding: '14px 20px', border: '1px solid #d4c598', borderRadius: 10, background: '#fff9e8', color: '#574419' }}>
        {navigation.selection.kind === 'saved'
          ? <>Selected saved release: <strong>{releases.find(r => r.id === selectedReleaseId)?.draft.release.releaseName ?? 'Unknown release'}</strong>. The workspace below is the existing simulator preview; loading this release's saved inputs and BL is implemented in Iteration 5.4.</>
          : navigation.selection.kind === 'new'
            ? <>New release workspace preview. The existing simulator below is unchanged; connecting it to a new unsaved release and Save Draft is planned for Iteration 5.4.</>
            : <>No release selected. Choose a release from Release Management or start a new one. The existing simulator below is a preview only.</>}
      </aside>
      <ReleaseWorkspace />
    </div>}
  </div>;
}
