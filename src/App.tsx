import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { capacityBuckets, getMockData, mockRelease } from './mockData';

const data = getMockData();

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <article className="metric">
      <div className="metric__label">{title}</div>
      <div className="metric__value">{value}</div>
      <div className="metric__detail">{detail}</div>
    </article>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="section-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}

export default function App() {
  const count = mockRelease.sprintCompletedPoints.length;
  const realGap = data.completed - data.originalAtCurrentSprint.realistic;
  const totalAllocation = capacityBuckets.reduce((sum, b) => sum + b.percent, 0);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-mark">P</div>
        <div className="brand-title"><strong>PSP</strong><span>Delivery Simulator</span></div>
        <div className="topbar-right"><span className="topbar-dot" /> Local prototype <span className="mock-chip">MOCK DATA</span></div>
      </header>

      <main className="container">
        <div className="page-intro">
          <div>
            <div className="eyebrow">Release intelligence / Overview</div>
            <h1>{mockRelease.name}</h1>
            <p>Track real sprint delivery against the three original release forecasts. All data is currently defined in <code>src/mockData.ts</code>.</p>
          </div>
          <div className="sprint-pill"><span className="status-dot" /> Completed sprint {count}</div>
        </div>

        <section className="metric-grid" aria-label="Release metrics">
          <Metric title="Release scope" value={`${mockRelease.scopeStoryPoints} SP`} detail="Fixed scope in this prototype" />
          <Metric title="Actual delivered" value={`${data.completed} SP`} detail={`${Math.round(100 * data.completed / mockRelease.scopeStoryPoints)}% of release scope`} />
          <Metric title="Remaining backlog" value={`${data.remaining} SP`} detail="Scope minus delivered" />
          <Metric title="Against realistic plan" value={`${realGap > 0 ? '+' : ''}${realGap} SP`} detail={realGap >= 0 ? 'Ahead of original forecast' : 'Behind original forecast'} />
        </section>

        <section className="panel chart-panel">
          <SectionHeading
            eyebrow="01 / Original plan vs reality"
            title="Release burn-up"
            description="All three forecast lines start at Sprint 0 and stay unchanged as actual delivery becomes available."
          />
          <div className="chart-wrap" role="img" aria-label="Burn-up of actual completed story points against optimistic, realistic and pessimistic projections">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.chartData} margin={{ top: 16, right: 16, bottom: 12, left: 0 }}>
                <CartesianGrid stroke="#e8edf4" strokeDasharray="3 5" vertical={false} />
                <XAxis dataKey="sprint" tickLine={false} axisLine={false} tick={{ fill: '#64738b', fontSize: 12 }} dy={10} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64738b', fontSize: 12 }} width={42} domain={[0, Math.ceil(mockRelease.scopeStoryPoints / 40) * 40]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e0e6ef', boxShadow: '0 12px 30px rgba(30,45,75,.08)' }} formatter={(v: number | string, name: string) => [`${v} SP`, name]} />
                <Legend verticalAlign="bottom" height={32} wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                <ReferenceLine x={`S${count}`} stroke="#acb9cc" strokeDasharray="3 4" label={{ value: 'Now', fill: '#64738b', fontSize: 12, position: 'top' }} />
                <Line name="Release scope" type="linear" dataKey="scope" stroke="#6e7b8e" strokeWidth={2} strokeDasharray="6 5" dot={false} isAnimationActive={false} />
                <Line name="Optimistic" type="linear" dataKey="optimistic" stroke="#19986f" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line name="Realistic" type="linear" dataKey="realistic" stroke="#3778e6" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line name="Pessimistic" type="linear" dataKey="pessimistic" stroke="#d79b34" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line name="Actual delivered" type="linear" dataKey="actual" stroke="#15213b" strokeWidth={3.5} dot={{ r: 3.5, fill: '#15213b', strokeWidth: 1 }} activeDot={{ r: 6 }} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-note"><span className="info-circle">i</span> Forecasts are the <strong>original baseline</strong>, not recalculated projections. The rates are illustrative, not yet derived from your Excel formulas.</div>
        </section>

        <div className="lower-grid">
          <section className="panel">
            <SectionHeading eyebrow="02 / Capacity planning" title="PSP allocation" description="Four buckets, with a single unplanned-work allocation." />
            <div className="allocation-bar" aria-label={`Capacity allocation total ${totalAllocation} percent`}>
              {capacityBuckets.map((b) => <div key={b.label} style={{ width: `${b.percent}%`, background: b.color }} title={`${b.label}: ${b.percent}%`} />)}
            </div>
            <div className="bucket-list">
              {capacityBuckets.map((b) => (
                <div className="bucket" key={b.label}>
                  <span className="bucket-color" style={{ background: b.color }} />
                  <div className="bucket-text"><strong>{b.label}</strong><small>{b.description}</small></div>
                  <span className="bucket-value">{b.percent}%</span>
                </div>
              ))}
            </div>
            <div className={`allocation-total ${totalAllocation !== 100 ? 'invalid' : ''}`}>Total allocated <strong>{totalAllocation}%</strong></div>
          </section>

          <section className="panel">
            <SectionHeading eyebrow="03 / Delivery outlook" title="Original completion forecast" description="Expected completion sprint, based on mock constant throughput." />
            <div className="forecast-rows">
              {[
                { label: 'Optimistic', sprint: data.forecastFinishes.optimistic, rate: mockRelease.originalForecast.optimisticStoryPointsPerSprint, color: '#19986f' },
                { label: 'Realistic', sprint: data.forecastFinishes.realistic, rate: mockRelease.originalForecast.realisticStoryPointsPerSprint, color: '#3778e6' },
                { label: 'Pessimistic', sprint: data.forecastFinishes.pessimistic, rate: mockRelease.originalForecast.pessimisticStoryPointsPerSprint, color: '#d79b34' },
              ].map((f) => (
                <div className="forecast-row" key={f.label}>
                  <span className="forecast-dot" style={{ background: f.color }} />
                  <span className="forecast-name">{f.label}</span>
                  <span className="forecast-rate">{f.rate} SP/sprint</span>
                  <strong>Sprint {f.sprint}</strong>
                </div>
              ))}
            </div>
            <div className="divider" />
            <div className="team-label">Mock capacity per sprint</div>
            <div className="team-stats">
              <div><span>Software Engineers</span><strong>{mockRelease.capacity.softwareEngineers}</strong><small>{mockRelease.capacity.softwareEngineerDaysPerSprint} person-days</small></div>
              <div><span>QA Engineers</span><strong>{mockRelease.capacity.qaEngineers}</strong><small>{mockRelease.capacity.qaEngineerDaysPerSprint} person-days</small></div>
            </div>
          </section>
        </div>

        <section className="panel sprint-panel">
          <SectionHeading eyebrow="04 / Actuals" title="Completed sprint history" description="Mock delivered story points per sprint; cumulative totals feed the burn-up." />
          <div className="sprint-table-wrap">
            <table>
              <thead><tr><th>Sprint</th><th>Completed this sprint</th><th>Cumulative completed</th><th>Original realistic</th><th>Variance vs realistic</th></tr></thead>
              <tbody>
                {mockRelease.sprintCompletedPoints.map((points, i) => {
                  const cumulative = mockRelease.sprintCompletedPoints.slice(0, i + 1).reduce((s, v) => s + v, 0);
                  const expected = Math.min(mockRelease.scopeStoryPoints, (i + 1) * mockRelease.originalForecast.realisticStoryPointsPerSprint);
                  const diff = cumulative - expected;
                  return <tr key={i}><td>Sprint {i + 1}</td><td>{points} SP</td><td>{cumulative} SP</td><td>{expected} SP</td><td className={diff >= 0 ? 'positive' : 'negative'}>{diff > 0 ? '+' : ''}{diff} SP</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
        <footer>PSP Delivery Simulator · Starter v0.1 · No backend, database or workbook integration yet.</footer>
      </main>
    </div>
  );
}
