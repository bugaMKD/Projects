import type { ReleaseRecord } from '../models/ReleaseRecord';
import { releaseSummary } from '../navigation/ReleaseNavigation';

export interface ReleaseManagementProps {
  releases: readonly ReleaseRecord[];
  error: string | null;
  onRefresh: () => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

const card: React.CSSProperties = { border: '1px solid #dbe3ee', borderRadius: 12, padding: 18, background: '#fff' };
const button: React.CSSProperties = { border: '1px solid #b8c6d8', borderRadius: 8, padding: '9px 14px', font: 'inherit', cursor: 'pointer', background: '#fff', color: '#23364f' };

export function ReleaseManagement({ releases, error, onRefresh, onNew, onOpen, onDelete }: ReleaseManagementProps) {
  return <section aria-label="Release Management" style={{ display: 'grid', gap: 16 }}>
    <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
      <div><h1 style={{ marginBottom: 4 }}>Release Management</h1><p style={{ marginTop: 0, color: '#617188' }}>Saved releases and baseline forecasts</p></div>
      <button type="button" onClick={onNew} style={{ ...button, background: '#2767cf', color: '#fff', borderColor: '#2767cf' }}>+ New Release</button>
    </div>
    {error && <div role="alert" style={{ ...card, borderColor: '#d56767', color: '#9c2929' }}>
      <strong>Unable to read or update saved releases.</strong><p>{error}</p>
      <p>Saved storage was not reset. Check the issue before making further changes.</p>
      <button style={button} type="button" onClick={onRefresh}>Retry</button>
    </div>}
    {!error && releases.length === 0 && <div style={{ ...card, padding: '36px 18px', textAlign: 'center' }}>
      <h2>No saved releases yet</h2><p>New releases can be configured in Release Workspace. Saving a draft will be connected in Iteration 5.4.</p>
      <button type="button" style={button} onClick={onNew}>Configure a release</button>
    </div>}
    {!error && releases.map(record => {
      const summary = releaseSummary(record);
      return <article key={record.id} style={card}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div><h2 style={{ margin: '0 0 6px' }}>{summary.name}</h2><small style={{ color: '#617188' }}>Updated {new Date(summary.updatedAt).toLocaleString()}</small></div>
          <span style={{ color: '#42546e', fontWeight: 600 }}>{summary.status}</span>
        </div>
        <div style={{ display: 'flex', gap: 25, margin: '18px 0', flexWrap: 'wrap' }}>
          <div><small>Scope</small><div><strong>{summary.scope} SP</strong></div></div>
          <div><small>Actual delivered</small><div><strong>{summary.actualStoryPoints} SP</strong></div></div>
          <div><small>BL Realistic</small><div><strong>{summary.status === 'Draft BL' ? 'Not established' : summary.realisticFinishSprint === null ? 'Not forecastable' : `Sprint ${summary.realisticFinishSprint}`}</strong></div></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" style={button} onClick={() => onDelete(record.id)} aria-label={`Delete ${summary.name}`}>Delete</button>
          <button type="button" style={{ ...button, background: '#eef4ff' }} onClick={() => onOpen(record.id)} aria-label={`Open ${summary.name}`}>Open release</button>
        </div>
      </article>;
    })}
  </section>;
}
