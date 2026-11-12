import { historicalMock, currentTeamMock, capacityExampleScopeStoryPoints } from '../mockData';
import { calculateHistoricalProductivity } from '../services/historicalCalculator';
import { calculateTeamCapacity, calculateDeliveryCapacity } from '../services/capacityCalculator';

const historical = calculateHistoricalProductivity(historicalMock);
const team = calculateTeamCapacity(currentTeamMock);
const delivery = calculateDeliveryCapacity(capacityExampleScopeStoryPoints, historical, team);
const format = (n: number) => Number.isFinite(n) ? Number(n.toFixed(2)).toString() : 'N/A';

export function HistoricalCapacityView() {
  return <section className="panel" id="historical-capacity">
    <div className="section-heading">
      <div className="eyebrow">05 / Iteration 2 · Independent calculation</div>
      <h2>Historical productivity &amp; delivery capacity</h2>
      <p>New release-level SE/QA model using effective days. This panel is <strong>not yet linked</strong> to the original release forecast or burn-up.</p>
    </div>
    <div className="capacity-note"><strong>Validation scenario:</strong> Prior release 100 SP from 100 SE + 50 QA effective days; current 100 SE + 25 QA effective days; scope 100 SP. Expected deliverable: 50 SP.</div>
    <div className="capacity-results">
      <div><span>Historical SE productivity</span><strong>{format(historical.seStoryPointsPerEffectiveDay)} SP/day</strong></div>
      <div><span>Historical QA productivity</span><strong>{format(historical.qaStoryPointsPerEffectiveDay)} SP/day</strong></div>
      <div><span>Historical SE : QA effective-day ratio</span><strong>{format(historical.historicalSeToQaEffectiveDayRatio)} : 1</strong></div>
      <div><span>Current SE : QA effective-day ratio</span><strong>{format(team.seToQaEffectiveDayRatio)} : 1</strong></div>
    </div>
    <div className="delivery-grid">
      <article className="delivery-card"><span>SE coding capacity</span><strong>{format(delivery.seCodingCapacityStoryPoints)} SP</strong><small>{format(team.seEffectiveDays)} effective SE days</small></article>
      <article className="delivery-card"><span>QA testing capacity</span><strong>{format(delivery.qaTestingCapacityStoryPoints)} SP</strong><small>{format(team.qaEffectiveDays)} effective QA days</small></article>
      <article className="delivery-card delivery-card--accent"><span>Release-level deliverable</span><strong>{format(delivery.deliverableStoryPoints)} SP</strong><small>Constraint: {delivery.constrainedBy}</small></article>
    </div>
    <h3 className="subheading">Individual capacity input · Mock data</h3>
    <div className="sprint-table-wrap"><table><thead><tr><th>Team member</th><th>Role</th><th>Available days</th><th>Productivity</th><th>Effective days</th></tr></thead><tbody>
      {team.members.map(m => <tr key={m.id}><td>{m.name}</td><td>{m.role}</td><td>{format(m.availableDays)}</td><td>{format(m.productivity*100)}%</td><td><strong>{format(m.effectiveDays)}</strong></td></tr>)}
      <tr className="totals-row"><td>Total SE</td><td>SE</td><td>{format(team.seAvailableDays)}</td><td>—</td><td>{format(team.seEffectiveDays)}</td></tr>
      <tr className="totals-row"><td>Total QA</td><td>QA</td><td>{format(team.qaAvailableDays)}</td><td>—</td><td>{format(team.qaEffectiveDays)}</td></tr>
    </tbody></table></div>
    <p className="model-footnote">Effective days = available days × individual productivity. Historical role productivity = historically delivered SP ÷ role's historical effective days. Deliverable SP = min(scope, SE coding capacity, QA testing capacity). All quantities shown here are illustrative.</p>
  </section>;
}
