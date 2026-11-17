import { useEffect, useMemo, useState } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { capacityBuckets } from './mockData';
import { buildReleaseChartDataset } from './services/releaseChartData';
import type { ReleaseInputs } from './models/ReleaseRecord';
import type { WorkspaceSession } from './services/ReleaseWorkspaceOperations';
import { hasUnsavedDraftChanges } from './services/ReleaseWorkspaceOperations';
import { getSprintResults, updateSprintResult, hasSprintResultChanges, type SprintResult } from './models/SprintResult';
import { createDraftBaselineFormInput, parseDraftBaselineFormInput } from './models/DraftBaselineInput';
import { createDraftHistoricalFormInput, parseDraftHistoricalFormInput } from './models/DraftHistoricalInput';
import { commitDraftHistoricalForm } from './models/DraftHistoricalCommit';
import { createDraftSprintCapacityForm, parseDraftSprintCapacityForm } from './models/DraftSprintCapacityInput';
import { addDraftSprintMember, commitDraftSprintCapacityForm, removeDraftSprintMember } from './models/DraftSprintCapacityCommit';
import { ReleaseHistoricalCapacityView } from './components/ReleaseHistoricalCapacityView';
import { summarizeReleaseCapacity } from './services/releaseCapacitySummary';
import { calculateSprintCapacityBalance } from './services/sprintCapacityBalance';
import { establishBaseline, type EstablishedBaseline } from './models/EstablishedBaseline';
import { buildEstablishedBaselineDataset } from './services/establishedBaselineDataset';
import { getBaselineEstablishmentEligibility } from './models/BaselineEstablishmentEligibility';

// Draft BL uses the validated engine; actual progress comes from the selected release.

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
export interface ReleaseWorkspaceProps {
  session: WorkspaceSession;
  onSaveDraft: (inputs: ReleaseInputs) => void;
  onEstablishBaseline: (inputs: ReleaseInputs, baseline: EstablishedBaseline) => void;
  onDirtyChange: (dirty: boolean) => void;
  onRecordSprint: (pointsText: string, seDaysText: string, qaDaysText: string) => void;
  onSaveActualChanges: (results: readonly SprintResult[]) => void;
}

export default function ReleaseWorkspace({ session, onSaveDraft, onEstablishBaseline, onDirtyChange, onRecordSprint, onSaveActualChanges }: ReleaseWorkspaceProps) {
  const initial = session.committed;
  const savedResults = getSprintResults(session.saved);
  const savedActuals = session.saved.completedSprintPoints;
  const established = session.saved.establishedBaseline;
  const [workspaceTab, setWorkspaceTab] = useState<'planning' | 'history'>('planning');
  const [actionError, setActionError] = useState<string | null>(null);
  const [sprintPointsText, setSprintPointsText] = useState('');
  const [sprintSEText, setSprintSEText] = useState('');
  const [sprintQAText, setSprintQAText] = useState('');
  const [sprintError, setSprintError] = useState<string | null>(null);
  const [editingSprintIndex, setEditingSprintIndex] = useState<number | null>(null);
  const [editingSprintText, setEditingSprintText] = useState('');
  const [editingSEText, setEditingSEText] = useState('');
  const [editingQAText, setEditingQAText] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  // Multiple applied corrections can be previewed without persisting.
  const [actualPreview, setActualPreview] = useState<SprintResult[] | null>(null);
  const displayedResults = actualPreview ?? savedResults;
  const completedActuals = displayedResults.map(result => result.completedStoryPoints);
  // The form is free to hold temporarily invalid text, but only a valid draft
  // is ever sent to the validated forecasting engine.
  const [form, setForm] = useState(() => createDraftBaselineFormInput(initial.release));
  const [validDraft, setValidDraft] = useState(() => ({...initial.release}));
  const parsed = useMemo(() => parseDraftBaselineFormInput(form), [form]);
  // Historical text is staged while typing and committed only on blur/Enter.
  // Invalid text cannot replace last valid historical assumptions.
  const [historicalForm, setHistoricalForm] = useState(() => createDraftHistoricalFormInput(initial.historical));
  const [validHistorical, setValidHistorical] = useState(() => ({...initial.historical}));
  const historicalValidation = useMemo(() => parseDraftHistoricalFormInput(historicalForm), [historicalForm]);
  // Future team capacity is PER SPRINT. Form edits are staged until blur/Enter.
  const [capacityForm, setCapacityForm] = useState(() => createDraftSprintCapacityForm(initial.sprintMembers));
  const [validSprintMembers, setValidSprintMembers] = useState(() => initial.sprintMembers.map(m => ({...m})));
  const capacityValidation = useMemo(() => parseDraftSprintCapacityForm(capacityForm), [capacityForm]);
  const draftData = useMemo(() => buildReleaseChartDataset({
    originalScopeStoryPoints: validDraft.scopeStoryPoints,
    historical: validHistorical,
    originalSprintMembers: validSprintMembers,
    variationPercent: validDraft.variationPercent,
    completedSprintPoints: completedActuals,
  }), [validDraft, validHistorical, validSprintMembers, completedActuals]);
  const data = useMemo(() => established
    ? buildEstablishedBaselineDataset(established, completedActuals)
    : draftData, [established, completedActuals, draftData]);
  // Planning summary follows draft inputs until the BL is established, then uses its frozen assumptions.
  const baselineCapacity = useMemo(() => summarizeReleaseCapacity(
    established?.historical ?? validHistorical,
    established?.sprintMembers ?? validSprintMembers,
  ), [established, validHistorical, validSprintMembers]);
  const capacityBalance = baselineCapacity.limitingRole === 'SE' ? 'SE limiting'
    : baselineCapacity.limitingRole === 'QA' ? 'QA limiting'
    : baselineCapacity.limitingRole === 'Unavailable' ? 'Not available'
    : baselineCapacity.realisticStoryPointsPerSprint === 0 ? 'No delivery capacity' : 'Balanced';
  // Comparison isolates future-team changes; historical productivity stays constant.
  // The validated chart dataset remains the source for forecasted completion.
  const referenceCapacity = useMemo(() => summarizeReleaseCapacity(
    established?.historical ?? validHistorical,
    established?.sprintMembers ?? initial.sprintMembers,
  ), [established, validHistorical, initial.sprintMembers]);
  const currentVelocity = baselineCapacity.realisticStoryPointsPerSprint;
  const referenceVelocity = referenceCapacity.realisticStoryPointsPerSprint;
  const velocityDelta = currentVelocity === null || referenceVelocity === null
    ? null : currentVelocity - referenceVelocity;
  const velocityDeltaLabel = velocityDelta === null ? 'Not available'
    : Math.abs(velocityDelta) < 1e-9 ? 'No change'
    : `${velocityDelta > 0 ? '+' : ''}${formatStoryPoints(velocityDelta)} SP/sprint`;
  const displayedRelease = established?.release ?? validDraft;
  const eligibility = getBaselineEstablishmentEligibility(form, validDraft, historicalForm, validHistorical, capacityForm, validSprintMembers);
  const currentInputs = useMemo<ReleaseInputs>(() => ({
    release: validDraft, historical: validHistorical, sprintMembers: validSprintMembers,
  }), [validDraft, validHistorical, validSprintMembers]);
  const dirty = !established && (
    hasUnsavedDraftChanges({ ...session, committed: currentInputs }) || !eligibility.allowed
  );
  const actualPreviewDirty = hasSprintResultChanges(savedResults, actualPreview);
  const pendingSprintEntry = sprintPointsText.trim() !== '' || sprintSEText.trim() !== '' || sprintQAText.trim() !== '';
  const pendingSprintCorrection = editingSprintIndex !== null;
  const canEditActuals = session.persisted && !dirty;
  const parseField = (text: string, label: string): number => {
    if (!text.trim() || !Number.isFinite(Number(text)) || Number(text) < 0) throw new Error(`${label} must be non-negative.`);
    return Number(text);
  };
  const parseNullableField = (text: string, label: string): number | null => text.trim() === '' ? null : parseField(text, label);
  const isNextSprintValid = [sprintPointsText, sprintSEText, sprintQAText].every(text => text.trim() !== '' && Number.isFinite(Number(text)) && Number(text) >= 0);
  const isEditValid = editingSprintText.trim() !== '' && Number.isFinite(Number(editingSprintText)) && Number(editingSprintText) >= 0 &&
    [editingSEText, editingQAText].every(text => text.trim() === '' || (Number.isFinite(Number(text)) && Number(text) >= 0));
  const applySprintPreview = () => {
    if (editingSprintIndex === null) return;
    try {
      const edited = {
        completedStoryPoints: parseField(editingSprintText, 'Completed SP'),
        seEffectiveDays: parseNullableField(editingSEText, 'Actual SE effective days'),
        qaEffectiveDays: parseNullableField(editingQAText, 'Actual QA effective days'),
      };
      // Legacy missing days stay null unless explicitly entered by the user.
      const next = updateSprintResult(displayedResults, editingSprintIndex, edited);
      setActualPreview(hasSprintResultChanges(savedResults, next) ? next : null);
      setEditingSprintIndex(null);
      setEditingSprintText('');
      setEditError(null);
    } catch (error) { setEditError(error instanceof Error ? error.message : 'Invalid sprint correction.'); }
  };
  const discardSprintPreview = () => {
    setActualPreview(null);
    setEditingSprintIndex(null);
    setEditingSprintText('');
    setEditError(null);
  };
  const saveSprintCorrections = () => {
    if (!actualPreviewDirty || !actualPreview || !canEditActuals || pendingSprintCorrection) return;
    try {
      onSaveActualChanges(actualPreview);
      setActualPreview(null);
      setEditError(null);
    } catch (error) { setEditError(error instanceof Error ? error.message : 'Unable to save sprint changes.'); }
  };
  useEffect(() => { onDirtyChange(dirty || pendingSprintEntry || pendingSprintCorrection || actualPreviewDirty); }, [dirty, pendingSprintEntry, pendingSprintCorrection, actualPreviewDirty, onDirtyChange]);
  const recordSprint = () => {
    if (actualPreviewDirty || pendingSprintCorrection) { setSprintError('Save or discard the sprint correction before adding a new sprint.'); return; }
    if (!isNextSprintValid) {
      setSprintError('Enter completed SP and actual SE/QA effective days (all non-negative).');
      return;
    }
    try {
      onRecordSprint(sprintPointsText, sprintSEText, sprintQAText);
      setSprintPointsText('');
      setSprintSEText('');
      setSprintQAText('');
      setSprintError(null);
    } catch (error) {
      setSprintError(error instanceof Error ? error.message : 'Unable to save sprint actuals.');
    }
  };
  const saveDraft = () => {
    if (established || !eligibility.allowed || actualPreviewDirty || pendingSprintCorrection) return;
    try { onSaveDraft(currentInputs); setActionError(null); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'Unable to save draft.'); }
  };
  const establish = () => {
    if (established || !eligibility.allowed || actualPreviewDirty || pendingSprintCorrection) return;
    try {
      const snapshot = establishBaseline(validDraft, validHistorical, validSprintMembers, draftData);
      onEstablishBaseline(currentInputs, snapshot);
      setActionError(null);
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Unable to establish baseline.'); }
  };
  const commitCapacity = (nextForm: typeof capacityForm = capacityForm) => {
    if (established) return;
    const result = commitDraftSprintCapacityForm(nextForm, validSprintMembers);
    if (result.applied) setValidSprintMembers(result.members);
  };
  const updateCapacityMember = (id: string, field: 'name' | 'role' | 'availableDaysText' | 'productivityPercentText', value: string) => {
    if (established) return;
    setCapacityForm(current => current.map(member => member.id === id ? {...member,[field]:value} : member));
  };
  const addCapacityMember = (role: 'SE' | 'QA') => {
    if (established) return;
    const next = addDraftSprintMember(capacityForm, role);
    setCapacityForm(next);
    commitCapacity(next);
  };
  const removeCapacityMember = (id: string) => {
    if (established) return;
    const next = removeDraftSprintMember(capacityForm, id);
    setCapacityForm(next);
    commitCapacity(next);
  };
  const commitHistorical = () => {
    if (established) return;
    const result = commitDraftHistoricalForm(historicalForm, validHistorical);
    if (result.applied) setValidHistorical(result.historical);
  };

  // Scope is edited as text and committed only when the field loses focus.
  // Other controls can update the forecast immediately, but must never
  // accidentally commit a partially typed scope value.
  const updateForm = (nextForm: typeof form) => {
    if (established) return;
    setForm(nextForm);
    const next = parseDraftBaselineFormInput({
      ...nextForm,
      scopeText: String(validDraft.scopeStoryPoints),
    });
    if (next.config) setValidDraft(next.config);
  };
  const commitScope = () => {
    if (established) return;
    const next = parseDraftBaselineFormInput(form);
    if (next.config) setValidDraft(next.config);
  };
  const formHasErrors = Object.keys(parsed.errors).length > 0;
  const count = completedActuals.length;
  const realisticAtCurrentSprint = data.originalAtCurrentSprint.realistic;
  const realGap = realisticAtCurrentSprint === null ? null : data.completed - realisticAtCurrentSprint;
  const totalAllocation = capacityBuckets.reduce((sum,b)=>sum+b.percent,0);
  return <div className="app">
    <header className="topbar"><div className="brand-mark">P</div><div className="brand-title"><strong>PSP</strong><span>Delivery Simulator</span></div><div className="topbar-right"><span className="topbar-dot"/> Local prototype <span className="mock-chip">{established ? 'ESTABLISHED BL' : 'DRAFT BL'}</span></div></header>
    <main className="container">
      <div className="page-intro"><div><div className="eyebrow">Release intelligence / Overview</div><h1>{displayedRelease.releaseName}</h1><p>Review the release baseline and track actual delivery. After establishment, BL assumptions and all three forecasts are locked.</p></div><div className="sprint-pill"><span className="status-dot"/> Completed sprint {count}</div></div>
      <nav aria-label="Release workspace tabs" role="tablist" style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <button id="release-planning-tab" role="tab" type="button" aria-selected={workspaceTab === 'planning'} aria-controls="release-planning-panel" onClick={() => setWorkspaceTab('planning')}
          style={{padding:'10px 18px',borderRadius:8,border:'1px solid #cbd5e1',background:workspaceTab === 'planning' ? '#2563eb' : '#fff',color:workspaceTab === 'planning' ? '#fff' : '#334155',fontWeight:700,cursor:'pointer'}}>Release Planning</button>
        <button id="historical-data-tab" role="tab" type="button" aria-selected={workspaceTab === 'history'} aria-controls="historical-data-panel" onClick={() => setWorkspaceTab('history')}
          style={{padding:'10px 18px',borderRadius:8,border:'1px solid #cbd5e1',background:workspaceTab === 'history' ? '#2563eb' : '#fff',color:workspaceTab === 'history' ? '#fff' : '#334155',fontWeight:700,cursor:'pointer'}}>Historical Data</button>
      </nav>
      <div role="tabpanel" id="release-planning-panel" aria-labelledby="release-planning-tab" hidden={workspaceTab !== 'planning'}>
      <section className="panel" aria-label="BL release configuration" style={{marginBottom:20}}>
        <div className="section-heading"><div className="eyebrow">{established ? '00 / Established baseline · Locked' : '00 / Draft baseline · Not established'}</div><h2>Release Configuration</h2><p>Edit the scope, then leave the field (or press Enter) to update the three BL forecasts. Variation updates immediately. After establishing the baseline, the inputs become read-only.</p></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))',gap:18,alignItems:'start'}}>
          <label style={{display:'grid',gap:7,fontSize:13,fontWeight:600}}>
            Release name
            <input disabled={!!established} aria-label="Release name" type="text" value={form.releaseName} onChange={event => updateForm({...form,releaseName:event.target.value})}
              aria-invalid={!!parsed.errors.releaseName} style={{padding:'10px 12px',border:'1px solid #cbd5e1',borderRadius:8,font:'inherit',width:'100%',boxSizing:'border-box'}} />
            {parsed.errors.releaseName && <small role="alert" style={{color:'#b42318'}}>{parsed.errors.releaseName}</small>}
          </label>
          <label style={{display:'grid',gap:7,fontSize:13,fontWeight:600}}>
            Draft release scope (SP)
            <input disabled={!!established} aria-label="Draft release scope (SP)" type="number" min="0.01" step="any" value={form.scopeText} onChange={event => setForm(current => ({...current,scopeText:event.target.value}))}
              onBlur={commitScope}
              onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              aria-invalid={!!parsed.errors.scopeText} style={{padding:'10px 12px',border:'1px solid #cbd5e1',borderRadius:8,font:'inherit',width:'100%',boxSizing:'border-box'}} />
            {parsed.errors.scopeText && <small role="alert" style={{color:'#b42318'}}>{parsed.errors.scopeText}</small>}
          </label>
          <label style={{display:'grid',gap:7,fontSize:13,fontWeight:600}}>
            Forecast variation: ±{form.variationPercent}%
            <input disabled={!!established} aria-label="Forecast variation percentage" type="range" min="0" max="30" step="5" value={form.variationPercent}
              onChange={event => updateForm({...form,variationPercent:Number(event.target.value)})} style={{width:'100%',margin:'13px 0'}} />
            <small style={{fontWeight:400,color:'#64738b'}}>0% to 30% · Default ±15%</small>
          </label>
        </div>
        <p style={{margin:'14px 0 0',fontSize:12,color:'#64738b'}}>{established ? 'Established BL · Inputs locked and saved in this browser.' : formHasErrors ? 'Invalid form input: the chart retains the last valid draft until all inputs are valid.' : 'Draft BL · Use Save Draft to persist the current inputs.'}</p>
      </section>
      <section className="panel" aria-label="BL future team capacity" style={{marginBottom:20}}>
        <div className="section-heading"><div className="eyebrow">{established ? 'Future capacity / Established BL' : 'Future capacity / Draft BL · Not established'}</div><h2>Future SE/QA Capacity</h2><p>Configure planned available days <strong>per future sprint</strong> and individual productivity. Leave a field or press Enter to apply changes. These are not historical effective days.</p></div>
        <div style={{display:'grid',gap:12}}>
          {capacityForm.map((member,index) => {
            const errors = capacityValidation.errors.members[String(index)] ?? {};
            const fieldStyle = {padding:'10px 12px',border:'1px solid #cbd5e1',borderRadius:8,font:'inherit',width:'100%',boxSizing:'border-box' as const};
            return <div key={member.id} style={{border:'1px solid #e2e8f0',borderRadius:10,padding:12}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))',gap:12,alignItems:'start'}}>
                <label style={{display:'grid',gap:6,fontSize:13,fontWeight:600}}>Member name
                  <input disabled={!!established} aria-label={`Member name ${index+1}`} type="text" value={member.name} onChange={e => updateCapacityMember(member.id,'name',e.target.value)} onBlur={() => commitCapacity()}
                    onKeyDown={e => {if(e.key==='Enter')e.currentTarget.blur();}} aria-invalid={!!errors.name} style={fieldStyle}/>
                  {errors.name && <small role="alert" style={{color:'#b42318'}}>{errors.name}</small>}
                </label>
                <label style={{display:'grid',gap:6,fontSize:13,fontWeight:600}}>Role
                  <select disabled={!!established} aria-label={`Role ${index+1}`} value={member.role} onChange={e => {
                    const next = capacityForm.map(m => m.id === member.id ? {...m,role:e.target.value as 'SE'|'QA'} : m);
                    setCapacityForm(next); commitCapacity(next);
                  }} style={fieldStyle}>
                    <option value="SE">SE</option><option value="QA">QA</option>
                  </select>
                </label>
                <label style={{display:'grid',gap:6,fontSize:13,fontWeight:600}}>Available days / sprint
                  <input disabled={!!established} aria-label={`Available days per sprint ${index+1}`} type="number" min="0" step="any" value={member.availableDaysText}
                    onChange={e=>updateCapacityMember(member.id,'availableDaysText',e.target.value)} onBlur={() => commitCapacity()}
                    onKeyDown={e => {if(e.key==='Enter')e.currentTarget.blur();}} aria-invalid={!!errors.availableDaysText} style={fieldStyle}/>
                  {errors.availableDaysText && <small role="alert" style={{color:'#b42318'}}>{errors.availableDaysText}</small>}
                </label>
                <label style={{display:'grid',gap:6,fontSize:13,fontWeight:600}}>Productivity (%)
                  <input disabled={!!established} aria-label={`Productivity percent ${index+1}`} type="number" min="0" max="100" step="any" value={member.productivityPercentText}
                    onChange={e=>updateCapacityMember(member.id,'productivityPercentText',e.target.value)} onBlur={() => commitCapacity()}
                    onKeyDown={e => {if(e.key==='Enter')e.currentTarget.blur();}} aria-invalid={!!errors.productivityPercentText} style={fieldStyle}/>
                  {errors.productivityPercentText && <small role="alert" style={{color:'#b42318'}}>{errors.productivityPercentText}</small>}
                </label>
                <button disabled={!!established} type="button" onClick={() => removeCapacityMember(member.id)} style={{alignSelf:'center',padding:'9px 12px',border:'1px solid #cbd5e1',borderRadius:8,background:'#fff',cursor:'pointer'}}>Remove</button>
              </div>
            </div>;
          })}
        </div>
        <div style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap'}}>
          <button disabled={!!established} type="button" onClick={() => addCapacityMember('SE')} style={{padding:'9px 14px',borderRadius:8,border:'1px solid #cbd5e1',background:'#f8fafc',cursor:'pointer'}}>+ Add SE</button>
          <button disabled={!!established} type="button" onClick={() => addCapacityMember('QA')} style={{padding:'9px 14px',borderRadius:8,border:'1px solid #cbd5e1',background:'#f8fafc',cursor:'pointer'}}>+ Add QA</button>
        </div>
        <div aria-label="Capacity impact and forecast visibility" style={{marginTop:18,padding:16,border:'1px solid #dbe4ef',borderRadius:12,background:'#f8fafc'}}>
          <div style={{fontWeight:700,fontSize:15,marginBottom:5}}>Capacity impact · Forecast visibility</div>
          <p style={{fontSize:12,color:'#64738b',margin:'0 0 14px'}}>
            {established ? 'Frozen baseline assumptions. This capacity impact summary is read-only.'
              : 'Values update after valid member inputs are applied (leave the field or press Enter). The release burn-up chart uses the same applied inputs.'}
          </p>
          <div className="metric-grid" aria-label="Capacity impact metrics">
            <Metric title="SE potential throughput" value={`${formatStoryPoints(baselineCapacity.se.potentialStoryPointsPerSprint)} SP/sprint`} detail="Historical SE productivity × planned SE effective days" />
            <Metric title="QA potential throughput" value={`${formatStoryPoints(baselineCapacity.qa.potentialStoryPointsPerSprint)} SP/sprint`} detail="Historical QA productivity × planned QA effective days" />
            <Metric title="Forecasted realistic velocity" value={`${formatStoryPoints(currentVelocity)} SP/sprint`} detail={`Capacity balance: ${capacityBalance}`} />
            <Metric title="Expected realistic completion" value={formatFinish(data.forecastFinishes.realistic)} detail={established ? 'Frozen BL completion forecast' : 'Calculated from applied Draft BL inputs'} />
          </div>
          {!established && <p role="status" style={{fontSize:12,color:'#475569',margin:'12px 0 0'}}>
            <strong>Capacity impact vs saved team setup:</strong> {velocityDeltaLabel}.
            {capacityValidation.members === null ? ' Pending capacity inputs are invalid; the chart and metrics still show the last valid configuration.' : ' This isolates changes in future team capacity, keeping historical productivity constant.'}
          </p>}
        </div>
        <p style={{margin:'14px 0 0',fontSize:12,color:capacityValidation.members===null?'#b42318':'#64738b'}} role={capacityValidation.members===null?'alert':undefined}>
          {established ? 'Future team capacity assumptions locked in the established BL.' : capacityValidation.errors.form ?? (capacityValidation.members===null ? 'Invalid future capacity: the graph keeps the last valid team configuration.' : 'Draft per-sprint capacity · Save Draft to persist · Zero capacity means Not forecastable.')}
        </p>
      </section>
      <section className="panel" aria-label="Baseline establishment" style={{marginBottom:20}}>
        <div className="section-heading"><div className="eyebrow">Baseline status</div><h2>{established ? 'Established BL' : 'Draft BL'}</h2>
          <p>{established ? 'Baseline inputs and the BL optimistic, realistic and pessimistic lines are locked. Actual delivery remains independent.' : 'Review and apply all release, historical and capacity edits before establishing the baseline.'}</p></div>
        <div className="metric-grid" aria-label="BL planning capacity" style={{marginBottom:18}}>
          <Metric title="Realistic capacity" value={`${formatStoryPoints(baselineCapacity.realisticStoryPointsPerSprint)} SP/sprint`} detail={established ? 'Frozen BL capacity' : 'Current draft planning capacity'} />
          <Metric title="Capacity balance" value={capacityBalance} detail={established ? 'Frozen BL team balance' : 'Current draft team balance'} />
        </div>
        {!established && <div style={{display:'flex',gap:12,flexWrap:'wrap',alignItems:'center'}}>
          <button type="button" disabled={!eligibility.allowed || actualPreviewDirty || pendingSprintCorrection} onClick={saveDraft}
            style={{padding:'11px 18px',border:'1px solid #2563eb',borderRadius:8,color:'#2563eb',background:'#fff',fontWeight:700,cursor:eligibility.allowed?'pointer':'not-allowed'}}>
            Save Draft
          </button>
          <button type="button" disabled={!eligibility.allowed || actualPreviewDirty || pendingSprintCorrection} onClick={establish}
          style={{padding:'11px 18px',border:0,borderRadius:8,background:eligibility.allowed?'#2563eb':'#94a3b8',color:'white',fontWeight:700,cursor:eligibility.allowed?'pointer':'not-allowed'}}>
          Establish Baseline
          </button>
        </div>}
        {!established && <p role="status" style={{fontSize:13,color:dirty?'#9a6700':'#166534'}}>{dirty ? 'Unsaved changes' : 'All draft changes saved'}</p>}
        {actionError && <p role="alert" style={{color:'#b42318'}}>{actionError}</p>}
        {established && <strong role="status" style={{color:'#166534'}}>Baseline established · Inputs locked</strong>}
        {!established && !eligibility.allowed && <p role="alert" style={{color:'#b42318',fontSize:13}}>{eligibility.reason}</p>}
        <p style={{fontSize:12,color:'#64738b',marginTop:12}}>Save Draft is manual. Establish Baseline automatically saves the immutable snapshot. Saved releases can be reopened from Release Management.</p>
      </section>
      <section className="metric-grid" aria-label="Release metrics">
        <Metric title="Release scope" value={`${formatStoryPoints(displayedRelease.scopeStoryPoints)} SP`} detail={established ? "Established BL scope" : "Editable draft scope"} />
        <Metric title="Actual delivered" value={`${data.completed} SP`} detail={`${Math.round(100*data.completed/displayedRelease.scopeStoryPoints)}% of release scope`} />
        <Metric title="Remaining backlog" value={`${data.remaining} SP`} detail="Scope minus delivered" />
        <Metric title="Against realistic plan" value={realGap === null ? 'N/A' : `${realGap > 0 ? '+' : ''}${formatStoryPoints(realGap)} SP`} detail={realGap === null ? 'BL forecast unavailable' : realGap >= 0 ? 'Ahead of BL' : 'Behind BL'} />
      </section>
      <section className="panel chart-panel"><SectionHeading eyebrow={established ? '01 / Established BL vs reality' : '01 / Draft BL vs reality'} title="Release burn-up" description="All three BL lines begin at Start. After establishment the BL lines are fixed; actual delivery remains separate." />
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={data.chartData} margin={{top:16,right:16,bottom:12,left:0}}>
          <CartesianGrid stroke="#e8edf4" strokeDasharray="3 5" vertical={false}/>
          <XAxis dataKey="sprint" tickLine={false} axisLine={false} tick={{fill:'#64738b',fontSize:12}} dy={10}/>
          <YAxis tickLine={false} axisLine={false} tick={{fill:'#64738b',fontSize:12}} width={42} domain={[0, Math.ceil(Math.max(displayedRelease.scopeStoryPoints, data.completed, 1) / 40) * 40]}/>
          <Tooltip contentStyle={{borderRadius:12,border:'1px solid #e0e6ef'}} />
          <Legend verticalAlign="bottom" height={32} wrapperStyle={{paddingTop:10,fontSize:12}} />
          <ReferenceLine x={count === 0 ? 'Start' : `S${count}`} stroke="#acb9cc" strokeDasharray="3 4" label={{value:'Now',fill:'#64738b',fontSize:12,position:'top'}}/>
          <Line name="Release scope" type="linear" dataKey="scope" stroke="#dc2626" strokeWidth={2} dot={false} isAnimationActive={false}/>
          <Line name="BL Optimistic" type="linear" dataKey="optimistic" stroke="#19986f" strokeWidth={2.5} dot={false} isAnimationActive={false}/>
          <Line name="BL Realistic" type="linear" dataKey="realistic" stroke="#3778e6" strokeWidth={2.5} dot={false} isAnimationActive={false}/>
          <Line name="BL Pessimistic" type="linear" dataKey="pessimistic" stroke="#d79b34" strokeWidth={2.5} dot={false} isAnimationActive={false}/>
          <Line name="Actual delivered" type="linear" dataKey="actual" stroke="#15213b" strokeWidth={3.5} dot={{r:3.5,fill:'#15213b',strokeWidth:1}} connectNulls={false} isAnimationActive={false}/>
        </LineChart></ResponsiveContainer></div>
        <div className="chart-note"><span className="info-circle">i</span> The three BL forecasts come from historical productivity and future per-sprint SE/QA capacity. Established BL lines never change with actuals.</div>
      </section>
      <section className="panel sprint-panel"><SectionHeading eyebrow="02 / Actual delivery" title="Completed sprint history" description="Record completed SP and actual SE/QA effective days for each sprint. Actuals never change the established BL."/>
        <div style={{display:'flex',alignItems:'end',gap:12,flexWrap:'wrap',marginBottom:16}}>
          <label style={{display:'grid',gap:6,fontSize:13,fontWeight:600}}>
            Completed SP for Sprint {savedActuals.length + 1}
            <input type="number" min="0" step="any" aria-label="Completed story points for next sprint"
              value={sprintPointsText} onChange={event => {setSprintPointsText(event.target.value);setSprintError(null);}}
              onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}
              disabled={!session.persisted || dirty || actualPreviewDirty || pendingSprintCorrection}
              style={{padding:'10px 12px',border:'1px solid #cbd5e1',borderRadius:8,width:220}} />
          </label>
          <label style={{display:'grid',gap:6,fontSize:13,fontWeight:600}}>Actual SE effective days
            <input type="number" min="0" step="any" aria-label="Actual SE effective days for next sprint"
              value={sprintSEText} onChange={event => {setSprintSEText(event.target.value);setSprintError(null);}}
              disabled={!session.persisted || dirty || actualPreviewDirty || pendingSprintCorrection}
              style={{padding:'10px 12px',border:'1px solid #cbd5e1',borderRadius:8,width:175}} />
          </label>
          <label style={{display:'grid',gap:6,fontSize:13,fontWeight:600}}>Actual QA effective days
            <input type="number" min="0" step="any" aria-label="Actual QA effective days for next sprint"
              value={sprintQAText} onChange={event => {setSprintQAText(event.target.value);setSprintError(null);}}
              disabled={!session.persisted || dirty || actualPreviewDirty || pendingSprintCorrection}
              style={{padding:'10px 12px',border:'1px solid #cbd5e1',borderRadius:8,width:175}} />
          </label>
          <button type="button" onClick={recordSprint}
            disabled={!session.persisted || dirty || actualPreviewDirty || pendingSprintCorrection || !isNextSprintValid}
            style={{padding:'11px 18px',border:0,borderRadius:8,background:'#2563eb',color:'#fff',fontWeight:700,cursor:'pointer'}}>
            Save Sprint {savedActuals.length + 1}
          </button>
        </div>
        {(!session.persisted || dirty) && <p style={{fontSize:12,color:'#64738b'}}>
          {session.persisted ? 'Save pending Draft BL changes before recording actuals.' : 'Save Draft or Establish Baseline before recording actuals.'}
        </p>}
        {sprintError && <p role="alert" style={{color:'#b42318'}}>{sprintError}</p>}
        {actualPreviewDirty && <div role="status" style={{padding:'12px 14px',margin:'12px 0',borderRadius:8,background:'#fff6dc',border:'1px solid #e7d3a2'}}>
          <strong>Unsaved actuals preview</strong> — the chart, totals and variances reflect your proposed corrections. Saved values are unchanged.
          <div style={{display:'flex',gap:8,marginTop:10}}>
            <button type="button" disabled={!canEditActuals || pendingSprintCorrection} onClick={saveSprintCorrections}>Save Changes</button>
            <button type="button" onClick={discardSprintPreview}>Discard Preview</button>
          </div>
        </div>}
        {editError && <p role="alert" style={{color:'#b42318'}}>{editError}</p>}
        <div className="sprint-table-wrap"><table><thead><tr><th>Sprint</th><th>Completed this sprint</th><th>SE effective days</th><th>QA effective days</th><th>Actual capacity balance</th><th>Cumulative completed</th><th>BL Realistic</th><th>Variance vs BL Realistic</th><th>Action</th></tr></thead><tbody>{completedActuals.map((points,i)=>{
          const cumulative=completedActuals.slice(0,i+1).reduce((s,v)=>s+v,0);
          const expected=data.chartData[i+1]?.realistic ?? null;
          const diff=expected === null ? null : cumulative-expected;
          const sprintResult = displayedResults[i];
          // Use this release's historical reference, frozen once the BL is established.
          const sprintBalance = calculateSprintCapacityBalance(sprintResult, established?.historical ?? validHistorical);
          return <tr key={i}><td>Sprint {i+1}</td><td>
            {editingSprintIndex === i ? <input aria-label={`Edit Sprint ${i+1} completed SP`} type="number" min="0" step="any"
              value={editingSprintText} onChange={event => {setEditingSprintText(event.target.value);setEditError(null);}}
              style={{width:110,padding:7}} /> : `${formatStoryPoints(points)} SP`}
          </td><td>{editingSprintIndex === i ? <input aria-label={`Edit Sprint ${i+1} SE effective days`} type="number" min="0" step="any"
            value={editingSEText} onChange={event => {setEditingSEText(event.target.value);setEditError(null);}}
            style={{width:94,padding:7}} /> : sprintResult.seEffectiveDays === null ? 'Not recorded' : formatStoryPoints(sprintResult.seEffectiveDays)}</td>
          <td>{editingSprintIndex === i ? <input aria-label={`Edit Sprint ${i+1} QA effective days`} type="number" min="0" step="any"
            value={editingQAText} onChange={event => {setEditingQAText(event.target.value);setEditError(null);}}
            style={{width:94,padding:7}} /> : sprintResult.qaEffectiveDays === null ? 'Not recorded' : formatStoryPoints(sprintResult.qaEffectiveDays)}</td>
          <td title={sprintBalance.description}>{sprintBalance.label}</td>
          <td>{formatStoryPoints(cumulative)} SP</td><td>{expected === null ? 'N/A' : `${formatStoryPoints(expected)} SP`}</td>
            <td className={diff === null ? '' : diff >= 0 ? 'positive' : 'negative'}>{diff === null ? 'N/A' : `${diff > 0 ? '+' : ''}${formatStoryPoints(diff)} SP`}</td>
            <td>{editingSprintIndex === i ? <div style={{display:'flex',gap:6}}>
              <button type="button" disabled={!canEditActuals || !isEditValid} onClick={applySprintPreview}>Apply Preview</button>
              <button type="button" onClick={() => {setEditingSprintIndex(null);setEditError(null);}}>Cancel</button>
            </div> : <button type="button" disabled={!canEditActuals || (editingSprintIndex !== null && editingSprintIndex !== i) || pendingSprintEntry}
              onClick={() => {setEditingSprintIndex(i);setEditingSprintText(String(points));setEditingSEText(sprintResult.seEffectiveDays === null ? '' : String(sprintResult.seEffectiveDays));setEditingQAText(sprintResult.qaEffectiveDays === null ? '' : String(sprintResult.qaEffectiveDays));setEditError(null);}}>Edit</button>}</td></tr>;
        })}</tbody></table></div>
      </section>
      <div className="lower-grid">
        <section className="panel"><SectionHeading eyebrow="03 / Capacity planning · Preserved from v1" title="PSP allocation" description="Four original mock buckets shown unchanged. Allocation math is postponed to a later iteration." />
          <div className="allocation-bar">{capacityBuckets.map(b=><div key={b.label} style={{width:`${b.percent}%`,background:b.color}} title={`${b.label}: ${b.percent}%`}/>)}</div>
          <div className="bucket-list">{capacityBuckets.map(b=><div className="bucket" key={b.label}><span className="bucket-color" style={{background:b.color}}/><div className="bucket-text"><strong>{b.label}</strong><small>{b.description}</small></div><span className="bucket-value">{b.percent}%</span></div>)}</div>
          <div className="allocation-total">Original mock allocation total <strong>{totalAllocation}%</strong></div>
        </section>
        <section className="panel"><SectionHeading eyebrow={established ? '04 / Established BL outlook' : '04 / Draft BL delivery outlook'} title={established ? "Established BL completion forecast" : "Draft BL completion forecast"} description="Calculated completion sprints from editable scope, variation and historical productivity, with editable per-sprint SE/QA capacity." />
          <div className="forecast-rows">{[
            {label:'BL Optimistic',sprint:data.forecastFinishes.optimistic,rate:data.scenarioThroughputs.optimistic,color:'#19986f'},
            {label:'BL Realistic',sprint:data.forecastFinishes.realistic,rate:data.scenarioThroughputs.realistic,color:'#3778e6'},
            {label:'BL Pessimistic',sprint:data.forecastFinishes.pessimistic,rate:data.scenarioThroughputs.pessimistic,color:'#d79b34'}
          ].map(f=><div className="forecast-row" key={f.label}><span className="forecast-dot" style={{background:f.color}}/><span className="forecast-name">{f.label}</span><span className="forecast-rate">{formatStoryPoints(f.rate)} SP/sprint</span><strong>{formatFinish(f.sprint)}</strong></div>)}</div>
          <div className="divider"/><p className="outlook-note">These completion estimates are based on the BL inputs. Once established, actual delivery does not recalculate them.</p>
        </section>
      </div>
      <ReleaseHistoricalCapacityView historical={established?.historical ?? validHistorical} sprintMembers={established?.sprintMembers ?? validSprintMembers} established={!!established} mode="future"/>
      </div>
      <div role="tabpanel" id="historical-data-panel" aria-labelledby="historical-data-tab" hidden={workspaceTab !== 'history'}>
        <div className="page-intro"><div><div className="eyebrow">Historical reference / Selected release</div><h2>Historical Data — {displayedRelease.releaseName}</h2><p>The historical assumptions belong to this release. They are frozen when its baseline is established, and never shared or overwritten by another release.</p></div></div>
      <section className="panel" aria-label="BL historical productivity" style={{marginBottom:20}}>
        <div className="section-heading"><div className="eyebrow">{established ? 'Historical inputs / Established BL' : 'Historical inputs / Draft BL · Not established'}</div><h2>Historical Productivity</h2><p>Enter the historical totals (not averages per sprint). Leave a field or press Enter to apply the changes to all three Draft BL forecasts. Future capacity is configured separately below.</p></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))',gap:18,alignItems:'start'}}>
          {([
            {key:'deliveredStoryPointsText' as const, label:'Historical delivered SP'},
            {key:'seEffectiveDaysText' as const, label:'Historical SE effective days'},
            {key:'qaEffectiveDaysText' as const, label:'Historical QA effective days'},
          ]).map(field => <label key={field.key} style={{display:'grid',gap:7,fontSize:13,fontWeight:600}}>
            {field.label}
            <input disabled={!!established} aria-label={field.label} type="number" min="0.000001" step="any" value={historicalForm[field.key]}
              onChange={event => setHistoricalForm(current => ({...current,[field.key]:event.target.value}))}
              onBlur={commitHistorical}
              onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              aria-invalid={!!historicalValidation.errors[field.key]}
              style={{padding:'10px 12px',border:'1px solid #cbd5e1',borderRadius:8,font:'inherit',width:'100%',boxSizing:'border-box'}} />
            {historicalValidation.errors[field.key] && <small role="alert" style={{color:'#b42318'}}>{historicalValidation.errors[field.key]}</small>}
          </label>)}
        </div>
        <p style={{margin:'14px 0 0',fontSize:12,color:'#64738b'}}>{established ? 'Historical assumptions locked in the established BL.' : historicalValidation.historical === null ? 'Invalid historical inputs: the chart retains the last valid historical values.' : 'Draft historical values · Applied on field exit or Enter · Save Draft to persist.'}</p>
      </section>
      <ReleaseHistoricalCapacityView historical={established?.historical ?? validHistorical} sprintMembers={established?.sprintMembers ?? validSprintMembers} established={!!established} mode="historical"/>
      </div>
      <footer>PSP Delivery Simulator · Iteration 5.4.8 · Release-specific historical data</footer>
    </main>
  </div>;
}
