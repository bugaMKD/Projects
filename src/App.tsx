import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { capacityBuckets, mockRelease } from './mockData';
import { getIntegratedMockData } from './data/originalReleaseDataset';
import { HistoricalCapacityView } from './components/HistoricalCapacityView';

// Original forecast baseline comes from historical productivity and fixed sprint capacity.
// Actual progress remains independent; the adapter extends the chart if actuals run longer.
const data = getIntegratedMockData();

const formatStoryPoints = (points: number | null): string =>
  points === null ? 'N/A' : `${Number(points.toFixed(2))}`;

const formatFinish = (sprint: number | null): string =>
  sprint === null ? 'Not forecastable' : sprint === 0 ? 'Start' : `Sprint ${sprint}`;

function Metric({ title, value, detail }: { title: string; value: string; detail: string }) {
  return <article className="metric"><div className="metric__label">{title}</div><div className="metric__value">{value}</div><div className="metric__detail">{detail}</div></article>;
}
function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="section-heading"><div className="eyebrow">{eyebrow}</div><h2>{title}</h2>{description && <p>{description}</p>}</div>;
}
export default function App() {
  const count = mockRelease.sprintCompletedPoints.length;
  const realisticAtCurrentSprint = data.originalAtCurrentSprint.realistic;
  const realGap = realisticAtCurrentSprint === null ? null : data.completed - realisticAtCurrentSprint;
  const totalAllocation = capacityBuckets.reduce((sum,b)=>sum+b.percent,0);
  return <div className="app">
    <header className="topbar"><div className="brand-mark">P</div><div className="brand-title"><strong>PSP</strong><span>Delivery Simulator</span></div><div className="topbar-right"><span className="topbar-dot"/> Local prototype <span className="mock-chip">ITERATION 3.4 · MOCK INPUTS</span></div></header>
    <main className="container">
      <div className="page-intro"><div><div className="eyebrow">Release intelligence / Overview</div><h1>{mockRelease.name}</h1><p>Track sprint delivery against the three original release forecasts. Original forecasts use the validated historical productivity and fixed per-sprint capacity baseline.</p></div><div className="sprint-pill"><span className="status-dot"/> Completed sprint {count}</div></div>
      <section className="metric-grid" aria-label="Release metrics">
        <Metric title="Release scope" value={`${mockRelease.scopeStoryPoints} SP`} detail="Fixed scope in this prototype" />
        <Metric title="Actual delivered" value={`${data.completed} SP`} detail={`${mockRelease.scopeStoryPoints === 0 ? 100 : Math.round(100*data.completed/mockRelease.scopeStoryPoints)}% of release scope`} />
        <Metric title="Remaining backlog" value={`${data.remaining} SP`} detail="Scope minus delivered" />
        <Metric title="Against realistic plan" value={realGap === null ? 'N/A' : `${realGap > 0 ? '+' : ''}${formatStoryPoints(realGap)} SP`} detail={realGap === null ? 'Original forecast unavailable' : realGap >= 0 ? 'Ahead of original forecast' : 'Behind original forecast'} />
      </section>
      <section className="panel chart-panel"><SectionHeading eyebrow="01 / Original plan vs reality" title="Release burn-up" description="All three original forecast lines begin at Start and remain unchanged as actual delivery becomes available." />
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.chartData} margin={{top:16,right:16,bottom:12,left:0}}>
          <CartesianGrid stroke="#e8edf4" strokeDasharray="3 5" vertical={false}/>
          <XAxis dataKey="sprint" tickLine={false} axisLine={false} tick={{fill:'#64738b',fontSize:12}} dy={10}/>
          <YAxis tickLine={false} axisLine={false} tick={{fill:'#64738b',fontSize:12}} width={42} domain={[0, Math.ceil(Math.max(mockRelease.scopeStoryPoints, data.completed, 1) / 40) * 40]}/>
          <Tooltip contentStyle={{borderRadius:12,border:'1px solid #e0e6ef'}} />
          <Legend verticalAlign="bottom" height={32} wrapperStyle={{paddingTop:10,fontSize:12}} />
          <ReferenceLine x={count === 0 ? 'Start' : `S${count}`} stroke="#acb9cc" strokeDasharray="3 4" label={{value:'Now',fill:'#64738b',fontSize:12,position:'top'}}/>
          <Line name="Release scope" type="linear" dataKey="scope" stroke="#6e7b8e" strokeWidth={2} strokeDasharray="6 5" dot={false} isAnimationActive={false}/>
          <Line name="Optimistic" type="linear" dataKey="optimistic" stroke="#19986f" strokeWidth={2.5} dot={false} isAnimationActive={false}/>
          <Line name="Realistic" type="linear" dataKey="realistic" stroke="#3778e6" strokeWidth={2.5} dot={false} isAnimationActive={false}/>
          <Line name="Pessimistic" type="linear" dataKey="pessimistic" stroke="#d79b34" strokeWidth={2.5} dot={false} isAnimationActive={false}/>
          <Line name="Actual delivered" type="linear" dataKey="actual" stroke="#15213b" strokeWidth={3.5} dot={{r:3.5,fill:'#15213b',strokeWidth:1}} connectNulls={false} isAnimationActive={false}/>
        </LineChart></ResponsiveContainer></div>
        <div className="chart-note"><span className="info-circle">i</span> Original forecast is calculated from historical productivity and fixed per-sprint team capacity. Actuals do not alter the baseline.</div>
      </section>
      <div className="lower-grid">
        <section className="panel"><SectionHeading eyebrow="02 / Capacity planning · Preserved from v1" title="PSP allocation" description="Four original mock buckets shown unchanged. Allocation math is postponed to a later iteration." />
          <div className="allocation-bar">{capacityBuckets.map(b=><div key={b.label} style={{width:`${b.percent}%`,background:b.color}} title={`${b.label}: ${b.percent}%`}/>)}</div>
          <div className="bucket-list">{capacityBuckets.map(b=><div className="bucket" key={b.label}><span className="bucket-color" style={{background:b.color}}/><div className="bucket-text"><strong>{b.label}</strong><small>{b.description}</small></div><span className="bucket-value">{b.percent}%</span></div>)}</div>
          <div className="allocation-total">Original mock allocation total <strong>{totalAllocation}%</strong></div>
        </section>
        <section className="panel"><SectionHeading eyebrow="03 / Delivery outlook · Preserved from v1" title="Original completion forecast" description="Calculated completion sprints based on the original SE/QA-constrained throughput baseline." />
          <div className="forecast-rows">{[
            {label:'Optimistic',sprint:data.forecastFinishes.optimistic,rate:data.scenarioThroughputs.optimistic,color:'#19986f'},
            {label:'Realistic',sprint:data.forecastFinishes.realistic,rate:data.scenarioThroughputs.realistic,color:'#3778e6'},
            {label:'Pessimistic',sprint:data.forecastFinishes.pessimistic,rate:data.scenarioThroughputs.pessimistic,color:'#d79b34'}
          ].map(f=><div className="forecast-row" key={f.label}><span className="forecast-dot" style={{background:f.color}}/><span className="forecast-name">{f.label}</span><span className="forecast-rate">{formatStoryPoints(f.rate)} SP/sprint</span><strong>{formatFinish(f.sprint)}</strong></div>)}</div>
          <div className="divider"/><p className="outlook-note">These completion estimates are calculated from the fixed original forecast baseline; changing actual delivery does not revise them.</p>
        </section>
      </div>
      <section className="panel sprint-panel"><SectionHeading eyebrow="04 / Actuals · Preserved from v1" title="Completed sprint history" description="Mock delivered story points per sprint; cumulative totals feed the burn-up."/>
        <div className="sprint-table-wrap"><table><thead><tr><th>Sprint</th><th>Completed this sprint</th><th>Cumulative completed</th><th>Original realistic</th><th>Variance vs realistic</th></tr></thead><tbody>{mockRelease.sprintCompletedPoints.map((points,i)=>{
          const cumulative=mockRelease.sprintCompletedPoints.slice(0,i+1).reduce((s,v)=>s+v,0);
          const expected=data.chartData[i+1]?.realistic ?? null;
          const diff=expected === null ? null : cumulative-expected;
          return <tr key={i}><td>Sprint {i+1}</td><td>{points} SP</td><td>{cumulative} SP</td><td>{expected === null ? 'N/A' : `${formatStoryPoints(expected)} SP`}</td><td className={diff === null ? '' : diff >= 0 ? 'positive' : 'negative'}>{diff === null ? 'N/A' : `${diff > 0 ? '+' : ''}${formatStoryPoints(diff)} SP`}</td></tr>;
        })}</tbody></table></div>
      </section>
      <HistoricalCapacityView/>
      <footer>PSP Delivery Simulator · Iteration 3.4 · Original forecast integrated with capacity · Mock inputs · No Excel integration yet</footer>
    </main>
  </div>;
}
