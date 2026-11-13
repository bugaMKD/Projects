import { useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { capacityBuckets, historicalMock, mockRelease } from './mockData';
import { getIntegratedMockData, getInitialDraftBaselineConfig } from './data/originalReleaseDataset';
import { createDraftBaselineFormInput, parseDraftBaselineFormInput } from './models/DraftBaselineInput';
import { createDraftHistoricalFormInput, parseDraftHistoricalFormInput } from './models/DraftHistoricalInput';
import { commitDraftHistoricalForm } from './models/DraftHistoricalCommit';
import { DEFAULT_SPRINT_CAPACITY_MEMBERS, createDraftSprintCapacityForm, parseDraftSprintCapacityForm } from './models/DraftSprintCapacityInput';
import { addDraftSprintMember, commitDraftSprintCapacityForm, removeDraftSprintMember } from './models/DraftSprintCapacityCommit';
import { HistoricalCapacityView } from './components/HistoricalCapacityView';

// Draft BL is recalculated from valid inputs; actuals remain independent.

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
  // The form is free to hold temporarily invalid text, but only a valid draft
  // is ever sent to the validated forecasting engine.
  const [form, setForm] = useState(() => createDraftBaselineFormInput(getInitialDraftBaselineConfig()));
  const [validDraft, setValidDraft] = useState(getInitialDraftBaselineConfig);
  const parsed = useMemo(() => parseDraftBaselineFormInput(form), [form]);
  // Historical text is staged while typing and committed only on blur/Enter.
  // Invalid text cannot replace last valid historical assumptions.
  const [historicalForm, setHistoricalForm] = useState(() => createDraftHistoricalFormInput(historicalMock));
  const [validHistorical, setValidHistorical] = useState(() => ({...historicalMock}));
  const historicalValidation = useMemo(() => parseDraftHistoricalFormInput(historicalForm), [historicalForm]);
  // Future team capacity is PER SPRINT. Form edits are staged until blur/Enter.
  const [capacityForm, setCapacityForm] = useState(() => createDraftSprintCapacityForm(DEFAULT_SPRINT_CAPACITY_MEMBERS));
  const [validSprintMembers, setValidSprintMembers] = useState(() => DEFAULT_SPRINT_CAPACITY_MEMBERS.map(m => ({...m})));
  const capacityValidation = useMemo(() => parseDraftSprintCapacityForm(capacityForm), [capacityForm]);
  const data = useMemo(() => getIntegratedMockData(validDraft, validHistorical, validSprintMembers), [validDraft, validHistorical, validSprintMembers]);
  const commitCapacity = (nextForm: typeof capacityForm = capacityForm) => {
    const result = commitDraftSprintCapacityForm(nextForm, validSprintMembers);
    if (result.applied) setValidSprintMembers(result.members);
  };
  const updateCapacityMember = (id: string, field: 'name' | 'role' | 'availableDaysText' | 'productivityPercentText', value: string) => {
    setCapacityForm(current => current.map(member => member.id === id ? {...member,[field]:value} : member));
  };
  const addCapacityMember = (role: 'SE' | 'QA') => {
    const next = addDraftSprintMember(capacityForm, role);
    setCapacityForm(next);
    commitCapacity(next);
  };
  const removeCapacityMember = (id: string) => {
    const next = removeDraftSprintMember(capacityForm, id);
    setCapacityForm(next);
    commitCapacity(next);
  };
  const commitHistorical = () => {
    const result = commitDraftHistoricalForm(historicalForm, validHistorical);
    if (result.applied) setValidHistorical(result.historical);
  };

  // Scope is edited as text and committed only when the field loses focus.
  // Other controls can update the forecast immediately, but must never
  // accidentally commit a partially typed scope value.
  const updateForm = (nextForm: typeof form) => {
    setForm(nextForm);
    const next = parseDraftBaselineFormInput({
      ...nextForm,
      scopeText: String(validDraft.scopeStoryPoints),
    });
    if (next.config) setValidDraft(next.config);
  };
  const commitScope = () => {
    const next = parseDraftBaselineFormInput(form);
    if (next.config) setValidDraft(next.config);
  };
  const formHasErrors = Object.keys(parsed.errors).length > 0;
  const count = mockRelease.sprintCompletedPoints.length;
  const realisticAtCurrentSprint = data.originalAtCurrentSprint.realistic;
  const realGap = realisticAtCurrentSprint === null ? null : data.completed - realisticAtCurrentSprint;
  const totalAllocation = capacityBuckets.reduce((sum,b)=>sum+b.percent,0);
  return <div className="app">
    <header className="topbar"><div className="brand-mark">P</div><div className="brand-title"><strong>PSP</strong><span>Delivery Simulator</span></div><div className="topbar-right"><span className="topbar-dot"/> Local prototype <span className="mock-chip">ITERATION 4.3 · DRAFT BL</span></div></header>
    <main className="container">
      <div className="page-intro"><div><div className="eyebrow">Release intelligence / Overview</div><h1>{validDraft.releaseName}</h1><p>Experiment with the draft baseline using editable historical productivity and future per-sprint team capacity. Completed sprint results stay independent.</p></div><div className="sprint-pill"><span className="status-dot"/> Completed sprint {count}</div></div>
      <section className="panel" aria-label="Draft BL release configuration" style={{marginBottom:20}}>
        <div className="section-heading"><div className="eyebrow">00 / Draft baseline · Not established</div><h2>Release Configuration</h2><p>Edit the scope, then leave the field (or press Enter) to update the three BL forecasts. Variation updates immediately. Establishing a baseline is planned for Iteration 4.3.</p></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))',gap:18,alignItems:'start'}}>
          <label style={{display:'grid',gap:7,fontSize:13,fontWeight:600}}>
            Release name
            <input aria-label="Release name" type="text" value={form.releaseName} onChange={event => updateForm({...form,releaseName:event.target.value})}
              aria-invalid={!!parsed.errors.releaseName} style={{padding:'10px 12px',border:'1px solid #cbd5e1',borderRadius:8,font:'inherit',width:'100%',boxSizing:'border-box'}} />
            {parsed.errors.releaseName && <small role="alert" style={{color:'#b42318'}}>{parsed.errors.releaseName}</small>}
          </label>
          <label style={{display:'grid',gap:7,fontSize:13,fontWeight:600}}>
            Draft release scope (SP)
            <input aria-label="Draft release scope (SP)" type="number" min="0.01" step="any" value={form.scopeText} onChange={event => setForm(current => ({...current,scopeText:event.target.value}))}
              onBlur={commitScope}
              onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              aria-invalid={!!parsed.errors.scopeText} style={{padding:'10px 12px',border:'1px solid #cbd5e1',borderRadius:8,font:'inherit',width:'100%',boxSizing:'border-box'}} />
            {parsed.errors.scopeText && <small role="alert" style={{color:'#b42318'}}>{parsed.errors.scopeText}</small>}
          </label>
          <label style={{display:'grid',gap:7,fontSize:13,fontWeight:600}}>
            Forecast variation: ±{form.variationPercent}%
            <input aria-label="Forecast variation percentage" type="range" min="0" max="30" step="5" value={form.variationPercent}
              onChange={event => updateForm({...form,variationPercent:Number(event.target.value)})} style={{width:'100%',margin:'13px 0'}} />
            <small style={{fontWeight:400,color:'#64738b'}}>0% to 30% · Default ±15%</small>
          </label>
        </div>
        <p style={{margin:'14px 0 0',fontSize:12,color:'#64738b'}}>{formHasErrors ? 'Invalid form input: the chart retains the last valid draft until all inputs are valid.' : 'Draft BL preview · Not frozen · Values are not saved after reloading.'}</p>
      </section>
      <section className="panel" aria-label="Draft BL historical productivity" style={{marginBottom:20}}>
        <div className="section-heading"><div className="eyebrow">Historical inputs / Draft BL · Not established</div><h2>Historical Productivity</h2><p>Enter the historical totals (not averages per sprint). Leave a field or press Enter to apply the changes to all three Draft BL forecasts. Future capacity is configured separately below.</p></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))',gap:18,alignItems:'start'}}>
          {([
            {key:'deliveredStoryPointsText' as const, label:'Historical delivered SP'},
            {key:'seEffectiveDaysText' as const, label:'Historical SE effective days'},
            {key:'qaEffectiveDaysText' as const, label:'Historical QA effective days'},
          ]).map(field => <label key={field.key} style={{display:'grid',gap:7,fontSize:13,fontWeight:600}}>
            {field.label}
            <input aria-label={field.label} type="number" min="0.000001" step="any" value={historicalForm[field.key]}
              onChange={event => setHistoricalForm(current => ({...current,[field.key]:event.target.value}))}
              onBlur={commitHistorical}
              onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              aria-invalid={!!historicalValidation.errors[field.key]}
              style={{padding:'10px 12px',border:'1px solid #cbd5e1',borderRadius:8,font:'inherit',width:'100%',boxSizing:'border-box'}} />
            {historicalValidation.errors[field.key] && <small role="alert" style={{color:'#b42318'}}>{historicalValidation.errors[field.key]}</small>}
          </label>)}
        </div>
        <p style={{margin:'14px 0 0',fontSize:12,color:'#64738b'}}>{historicalValidation.historical === null ? 'Invalid historical inputs: the chart retains the last valid historical values.' : 'Draft historical values · Applied on field exit or Enter · Not saved after reloading.'}</p>
      </section>
      <section className="panel" aria-label="Draft BL future team capacity" style={{marginBottom:20}}>
        <div className="section-heading"><div className="eyebrow">Future capacity / Draft BL · Not established</div><h2>Future SE/QA Capacity</h2><p>Configure planned available days <strong>per future sprint</strong> and individual productivity. Leave a field or press Enter to apply changes. These are not historical effective days.</p></div>
        <div style={{display:'grid',gap:12}}>
          {capacityForm.map((member,index) => {
            const errors = capacityValidation.errors.members[String(index)] ?? {};
            const fieldStyle = {padding:'10px 12px',border:'1px solid #cbd5e1',borderRadius:8,font:'inherit',width:'100%',boxSizing:'border-box' as const};
            return <div key={member.id} style={{border:'1px solid #e2e8f0',borderRadius:10,padding:12}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))',gap:12,alignItems:'start'}}>
                <label style={{display:'grid',gap:6,fontSize:13,fontWeight:600}}>Member name
                  <input aria-label={`Member name ${index+1}`} type="text" value={member.name} onChange={e => updateCapacityMember(member.id,'name',e.target.value)} onBlur={() => commitCapacity()}
                    onKeyDown={e => {if(e.key==='Enter')e.currentTarget.blur();}} aria-invalid={!!errors.name} style={fieldStyle}/>
                  {errors.name && <small role="alert" style={{color:'#b42318'}}>{errors.name}</small>}
                </label>
                <label style={{display:'grid',gap:6,fontSize:13,fontWeight:600}}>Role
                  <select aria-label={`Role ${index+1}`} value={member.role} onChange={e => {
                    const next = capacityForm.map(m => m.id === member.id ? {...m,role:e.target.value as 'SE'|'QA'} : m);
                    setCapacityForm(next); commitCapacity(next);
                  }} style={fieldStyle}>
                    <option value="SE">SE</option><option value="QA">QA</option>
                  </select>
                </label>
                <label style={{display:'grid',gap:6,fontSize:13,fontWeight:600}}>Available days / sprint
                  <input aria-label={`Available days per sprint ${index+1}`} type="number" min="0" step="any" value={member.availableDaysText}
                    onChange={e=>updateCapacityMember(member.id,'availableDaysText',e.target.value)} onBlur={() => commitCapacity()}
                    onKeyDown={e => {if(e.key==='Enter')e.currentTarget.blur();}} aria-invalid={!!errors.availableDaysText} style={fieldStyle}/>
                  {errors.availableDaysText && <small role="alert" style={{color:'#b42318'}}>{errors.availableDaysText}</small>}
                </label>
                <label style={{display:'grid',gap:6,fontSize:13,fontWeight:600}}>Productivity (%)
                  <input aria-label={`Productivity percent ${index+1}`} type="number" min="0" max="100" step="any" value={member.productivityPercentText}
                    onChange={e=>updateCapacityMember(member.id,'productivityPercentText',e.target.value)} onBlur={() => commitCapacity()}
                    onKeyDown={e => {if(e.key==='Enter')e.currentTarget.blur();}} aria-invalid={!!errors.productivityPercentText} style={fieldStyle}/>
                  {errors.productivityPercentText && <small role="alert" style={{color:'#b42318'}}>{errors.productivityPercentText}</small>}
                </label>
                <button type="button" onClick={() => removeCapacityMember(member.id)} style={{alignSelf:'center',padding:'9px 12px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',cursor:'pointer'}}>Remove</button>
              </div>
            </div>;
          })}
        </div>
        <div style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap'}}>
          <button type="button" onClick={() => addCapacityMember('SE')} style={{padding:'9px 14px',borderRadius:8,border:'1px solid #cbd5e1',background:'#f8fafc',cursor:'pointer'}}>+ Add SE</button>
          <button type="button" onClick={() => addCapacityMember('QA')} style={{padding:'9px 14px',borderRadius:8,border:'1px solid #cbd5e1',background:'#f8fafc',cursor:'pointer'}}>+ Add QA</button>
        </div>
        <p style={{margin:'14px 0 0',fontSize:12,color:capacityValidation.members===null?'#b42318':'#64738b'}} role={capacityValidation.members===null?'alert':undefined}>
          {capacityValidation.errors.form ?? (capacityValidation.members===null ? 'Invalid future capacity: the graph keeps the last valid team configuration.' : 'Draft per-sprint capacity · Not saved after reloading · A zero-capacity role makes the forecast not forecastable.')}
        </p>
      </section>
      <section className="metric-grid" aria-label="Release metrics">
        <Metric title="Release scope" value={`${formatStoryPoints(validDraft.scopeStoryPoints)} SP`} detail="Editable draft scope" />
        <Metric title="Actual delivered" value={`${data.completed} SP`} detail={`${Math.round(100*data.completed/validDraft.scopeStoryPoints)}% of release scope`} />
        <Metric title="Remaining backlog" value={`${data.remaining} SP`} detail="Scope minus delivered" />
        <Metric title="Against realistic plan" value={realGap === null ? 'N/A' : `${realGap > 0 ? '+' : ''}${formatStoryPoints(realGap)} SP`} detail={realGap === null ? 'BL forecast unavailable' : realGap >= 0 ? 'Ahead of draft BL' : 'Behind draft BL'} />
      </section>
      <section className="panel chart-panel"><SectionHeading eyebrow="01 / Draft BL vs reality" title="Release burn-up" description="All three draft BL lines begin at Start. Scope changes apply when you leave the field; actual delivery stays separate." />
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.chartData} margin={{top:16,right:16,bottom:12,left:0}}>
          <CartesianGrid stroke="#e8edf4" strokeDasharray="3 5" vertical={false}/>
          <XAxis dataKey="sprint" tickLine={false} axisLine={false} tick={{fill:'#64738b',fontSize:12}} dy={10}/>
          <YAxis tickLine={false} axisLine={false} tick={{fill:'#64738b',fontSize:12}} width={42} domain={[0, Math.ceil(Math.max(validDraft.scopeStoryPoints, data.completed, 1) / 40) * 40]}/>
          <Tooltip contentStyle={{borderRadius:12,border:'1px solid #e0e6ef'}} />
          <Legend verticalAlign="bottom" height={32} wrapperStyle={{paddingTop:10,fontSize:12}} />
          <ReferenceLine x={count === 0 ? 'Start' : `S${count}`} stroke="#acb9cc" strokeDasharray="3 4" label={{value:'Now',fill:'#64738b',fontSize:12,position:'top'}}/>
          <Line name="Release scope" type="linear" dataKey="scope" stroke="#6e7b8e" strokeWidth={2} strokeDasharray="6 5" dot={false} isAnimationActive={false}/>
          <Line name="BL Optimistic" type="linear" dataKey="optimistic" stroke="#19986f" strokeWidth={2.5} dot={false} isAnimationActive={false}/>
          <Line name="BL Realistic" type="linear" dataKey="realistic" stroke="#3778e6" strokeWidth={2.5} dot={false} isAnimationActive={false}/>
          <Line name="BL Pessimistic" type="linear" dataKey="pessimistic" stroke="#d79b34" strokeWidth={2.5} dot={false} isAnimationActive={false}/>
          <Line name="Actual delivered" type="linear" dataKey="actual" stroke="#15213b" strokeWidth={3.5} dot={{r:3.5,fill:'#15213b',strokeWidth:1}} connectNulls={false} isAnimationActive={false}/>
        </LineChart></ResponsiveContainer></div>
        <div className="chart-note"><span className="info-circle">i</span> Draft BL forecasts use editable historical productivity and future per-sprint SE/QA capacity. Scope applies on field exit; actuals never recalculate the draft.</div>
      </section>
      <div className="lower-grid">
        <section className="panel"><SectionHeading eyebrow="02 / Capacity planning · Preserved from v1" title="PSP allocation" description="Four original mock buckets shown unchanged. Allocation math is postponed to a later iteration." />
          <div className="allocation-bar">{capacityBuckets.map(b=><div key={b.label} style={{width:`${b.percent}%`,background:b.color}} title={`${b.label}: ${b.percent}%`}/>)}</div>
          <div className="bucket-list">{capacityBuckets.map(b=><div className="bucket" key={b.label}><span className="bucket-color" style={{background:b.color}}/><div className="bucket-text"><strong>{b.label}</strong><small>{b.description}</small></div><span className="bucket-value">{b.percent}%</span></div>)}</div>
          <div className="allocation-total">Original mock allocation total <strong>{totalAllocation}%</strong></div>
        </section>
        <section className="panel"><SectionHeading eyebrow="03 / Draft BL delivery outlook" title="Draft BL completion forecast" description="Calculated completion sprints from editable scope, variation and historical productivity, with editable per-sprint SE/QA capacity." />
          <div className="forecast-rows">{[
            {label:'BL Optimistic',sprint:data.forecastFinishes.optimistic,rate:data.scenarioThroughputs.optimistic,color:'#19986f'},
            {label:'BL Realistic',sprint:data.forecastFinishes.realistic,rate:data.scenarioThroughputs.realistic,color:'#3778e6'},
            {label:'BL Pessimistic',sprint:data.forecastFinishes.pessimistic,rate:data.scenarioThroughputs.pessimistic,color:'#d79b34'}
          ].map(f=><div className="forecast-row" key={f.label}><span className="forecast-dot" style={{background:f.color}}/><span className="forecast-name">{f.label}</span><span className="forecast-rate">{formatStoryPoints(f.rate)} SP/sprint</span><strong>{formatFinish(f.sprint)}</strong></div>)}</div>
          <div className="divider"/><p className="outlook-note">These completion estimates are a draft preview. Scope changes apply on field exit; variation updates immediately. Actual delivery does not recalculate them.</p>
        </section>
      </div>
      <section className="panel sprint-panel"><SectionHeading eyebrow="04 / Actuals · Preserved from v1" title="Completed sprint history" description="Mock delivered story points per sprint; cumulative totals feed the burn-up."/>
        <div className="sprint-table-wrap"><table><thead><tr><th>Sprint</th><th>Completed this sprint</th><th>Cumulative completed</th><th>BL Realistic</th><th>Variance vs BL Realistic</th></tr></thead><tbody>{mockRelease.sprintCompletedPoints.map((points,i)=>{
          const cumulative=mockRelease.sprintCompletedPoints.slice(0,i+1).reduce((s,v)=>s+v,0);
          const expected=data.chartData[i+1]?.realistic ?? null;
          const diff=expected === null ? null : cumulative-expected;
          return <tr key={i}><td>Sprint {i+1}</td><td>{points} SP</td><td>{cumulative} SP</td><td>{expected === null ? 'N/A' : `${formatStoryPoints(expected)} SP`}</td><td className={diff === null ? '' : diff >= 0 ? 'positive' : 'negative'}>{diff === null ? 'N/A' : `${diff > 0 ? '+' : ''}${formatStoryPoints(diff)} SP`}</td></tr>;
        })}</tbody></table></div>
      </section>
      <HistoricalCapacityView/>
      <footer>PSP Delivery Simulator · Iteration 4.3 · Draft BL, historical productivity and future per-sprint capacity · No persistence yet</footer>
    </main>
  </div>;
}
