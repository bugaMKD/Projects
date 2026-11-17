import { useMemo } from 'react';
import type { HistoricalData } from '../models/HistoricalData';
import type { TeamMember } from '../models/TeamMember';
import { summarizeReleaseCapacity } from '../services/releaseCapacitySummary';

export interface ReleaseHistoricalCapacityViewProps {
  historical: HistoricalData;
  sprintMembers: readonly TeamMember[];
  established: boolean;
  mode?: 'all' | 'historical' | 'future';
}

const fmt = (n: number | null): string => n === null ? 'N/A' : Number(n.toFixed(2)).toString();

/** Selected release's *committed* inputs. Purely presentational: no forecasting calls or mock data. */
export function ReleaseHistoricalCapacityView({ historical, sprintMembers, established, mode = 'all' }: ReleaseHistoricalCapacityViewProps) {
  const summary = useMemo(() => summarizeReleaseCapacity(historical, sprintMembers), [historical, sprintMembers]);
  const cell: React.CSSProperties = { padding: '12px 10px', textAlign: 'right', borderBottom: '1px solid #e5eaf1' };
  return <section className="panel" aria-label={mode === 'historical' ? 'Historical productivity statistics' : mode === 'future' ? 'Future SE/QA capacity breakdown' : 'Historical productivity and delivery capacity'}>
    <div className="section-heading">
      <div className="eyebrow">05 / Selected release · {established ? 'Established BL assumptions' : 'Committed Draft BL inputs'}</div>
      <h2>{mode === 'historical' ? 'Historical Productivity Statistics' : mode === 'future' ? 'Future SE/QA Capacity Breakdown' : 'Historical Productivity & Delivery Capacity'}</h2>
      <p>{mode === 'historical' ? 'Historical totals and productivity used for this release’s baseline.' : mode === 'future' ? 'Future effort per sprint and potential SE/QA throughput; summary indicators are in Baseline status.' : 'Historical effort totals, productivity and future capacity breakdown for this release.'}</p>
    </div>
    {mode !== 'future' && <div className="metric-grid" style={{ marginBottom: 18 }}>
      <div className="metric"><div className="metric__label">Historical delivery</div><div className="metric__value">{fmt(summary.historicalDeliveredStoryPoints)} SP</div><div className="metric__detail">Total completed in reference history</div></div>
      <div className="metric"><div className="metric__label">Historical SE effective days</div><div className="metric__value">{fmt(summary.se.historicalEffectiveDays)}</div><div className="metric__detail">Historical total, not per sprint</div></div>
      <div className="metric"><div className="metric__label">Historical QA effective days</div><div className="metric__value">{fmt(summary.qa.historicalEffectiveDays)}</div><div className="metric__detail">Historical total, not per sprint</div></div>
    </div>}
    {mode !== 'historical' && <div className="sprint-table-wrap">
      <table>
        <thead><tr><th>Role</th><th style={{textAlign:'right'}}>Members</th>{mode === 'all' && <th style={{textAlign:'right'}}>Historical SP / effective day</th>}<th style={{textAlign:'right'}}>Available days / sprint</th><th style={{textAlign:'right'}}>Effective days / sprint</th><th style={{textAlign:'right'}}>Potential SP / sprint</th></tr></thead>
        <tbody>{[summary.se, summary.qa].map(r => <tr key={r.role}>
          <td><strong>{r.role}</strong></td><td style={cell}>{r.memberCount}</td>{mode === 'all' && <td style={cell}>{fmt(r.historicalStoryPointsPerEffectiveDay)}</td>}
          <td style={cell}>{fmt(r.futureAvailableDaysPerSprint)}</td><td style={cell}>{fmt(r.futureEffectiveDaysPerSprint)}</td><td style={cell}>{fmt(r.potentialStoryPointsPerSprint)}</td>
        </tr>)}</tbody>
      </table>
    </div>}
    {mode === 'historical' && <div className="sprint-table-wrap"><table><thead><tr><th>Role</th><th style={{textAlign:'right'}}>Historical SP / effective day</th></tr></thead><tbody>{[summary.se, summary.qa].map(r => <tr key={r.role}><td><strong>{r.role}</strong></td><td style={cell}>{fmt(r.historicalStoryPointsPerEffectiveDay)}</td></tr>)}</tbody></table></div>}
    <p style={{fontSize:12,color:'#64738b',marginTop:10}}>{mode === 'historical' ? 'Historical productivity is derived from delivered story points and SE/QA historical effective days. These reference values remain associated with the selected release.' : 'Effective future days = available days × productivity. The realistic delivery rate is constrained by the lower SE/QA potential. When potentials match above zero, capacity is balanced relative to historical productivity: neither role is the bottleneck. This panel is read-only.'}</p>
  </section>;
}
