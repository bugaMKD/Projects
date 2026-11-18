import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve('src/ReleaseWorkspace.tsx');
if (!fs.existsSync(target)) throw Error('Run from the psp-delivery-simulator root.');
let s = fs.readFileSync(target, 'utf8');
if (s.includes('psp-planning-compare')) throw Error('5.6.0 layout already applied.');
const original = s;
const required = ['aria-label="BL future team capacity"','aria-label="Capacity impact and forecast visibility"','aria-label="Baseline actions"','aria-label="Baseline status messages"','<section className="panel chart-panel"','onClick={saveDraft}','onClick={establish}', 'const [teamCapacityOpen, setTeamCapacityOpen] = useState(!established);'];
for(const k of required) if(!s.includes(k)) throw Error('Expected 5.5.0 layout marker not found: '+k+'. No files changed.');
const replaceRange=(text,a,b,newValue)=>text.slice(0,a)+newValue+text.slice(b);
function element(text,start,tag) {
  const rex=new RegExp('<'+tag+'(?=[\\s>])[^>]*>|</'+tag+'\\s*>','g');
  rex.lastIndex=start;
  let count=0,m;
  while((m=rex.exec(text))){count+=m[0].startsWith('</')?-1:1;if(count===0)return {start,end:rex.lastIndex,html:text.slice(start,rex.lastIndex)};}
  throw Error('Cannot locate closing '+tag+' tag after '+start);
}
function cut(text,elementRange){return replaceRange(text,elementRange.start,elementRange.end,'');}

const state='  const [teamCapacityOpen, setTeamCapacityOpen] = useState(!established);';
s=s.replace(state,state+'\n  const [editingCapacityMemberId, setEditingCapacityMemberId] = useState<string | null>(null);\n  const [capacityRowError, setCapacityRowError] = useState<string | null>(null);');

const mapStart=s.indexOf('{capacityForm.map((member,index) => {');
const mapEnd=s.indexOf('})}',mapStart)+3;
if(mapStart<0||mapEnd<mapStart+20)throw Error('Unexpected 5.5.0 member list; not modifying file.');
const table=String.raw`<p style={{fontSize:11,color:'#64738b',margin:'0 0 8px'}}>ADS = Available days / sprint · PROD = Productivity (%) · SE = Software Engineer · QA = Quality Assurance</p>
        <div role="table" aria-label="Future team capacity table" style={{overflowX:'auto',width:'100%'}}>
          <div role="row" style={{display:'grid',gridTemplateColumns:'minmax(94px,1fr) 38px 49px 52px 65px',minWidth:326,gap:5,padding:'6px 4px',fontSize:11,fontWeight:700,color:'#64738b'}}>
            <span role="columnheader">Name</span><span role="columnheader">Role</span><span role="columnheader">ADS</span><span role="columnheader">PROD</span><span role="columnheader">Actions</span>
          </div>
          {capacityForm.map((member,index) => {
            const errors = capacityValidation.errors.members[String(index)] ?? {};
            const editing = editingCapacityMemberId === member.id && !established;
            const compact: React.CSSProperties = {width:'100%',minWidth:0,boxSizing:'border-box',padding:'5px 3px',border:'1px solid #cbd5e1',borderRadius:5,font:'inherit',fontSize:12};
            return <div role="row" key={member.id} style={{display:'grid',gridTemplateColumns:'minmax(94px,1fr) 38px 49px 52px 65px',minWidth:326,gap:5,alignItems:'center',padding:'6px 4px',borderTop:'1px solid #e2e8f0'}}>
              <div role="cell" style={{minWidth:0}}>{editing ? <input type="text" aria-label={'Member name '+(index+1)} maxLength={20} value={member.name} style={compact} onChange={e=>updateCapacityMember(member.id,'name',e.target.value.slice(0,20))}/> : <span title={member.name} style={{display:'block',fontSize:12,whiteSpace:'nowrap',textOverflow:'ellipsis',overflow:'hidden'}}>{member.name}</span>}</div>
              <div role="cell">{editing ? <select aria-label={'Role '+(index+1)} value={member.role} style={{...compact,padding:'5px 0'}} onChange={e=>setCapacityForm(current=>current.map(m=>m.id===member.id?{...m,role:e.target.value as 'SE'|'QA'}:m))}><option value="SE">SE</option><option value="QA">QA</option></select> : <span style={{fontSize:12}}>{member.role}</span>}</div>
              <div role="cell">{editing ? <input type="number" min="0" step="any" aria-label={'Available days per sprint '+(index+1)} aria-invalid={!!errors.availableDaysText} value={member.availableDaysText} style={compact} onChange={e=>updateCapacityMember(member.id,'availableDaysText',e.target.value)}/> : <span style={{fontSize:12}}>{member.availableDaysText}</span>}</div>
              <div role="cell">{editing ? <input type="number" min="0" max="100" step="any" aria-label={'Productivity percent '+(index+1)} aria-invalid={!!errors.productivityPercentText} value={member.productivityPercentText} style={compact} onChange={e=>updateCapacityMember(member.id,'productivityPercentText',e.target.value)}/> : <span style={{fontSize:12}}>{member.productivityPercentText}%</span>}</div>
              <div role="cell" style={{display:'flex',gap:3,justifyContent:'flex-end'}}>{editing ? <>
                <button type="button" title="Apply row" aria-label={'Apply changes for '+member.name} style={{padding:'3px 5px',border:'1px solid #cbd5e1',borderRadius:5,background:'#ecfdf5',cursor:'pointer'}} onClick={()=>{
                  const result = commitDraftSprintCapacityForm(capacityForm,validSprintMembers);
                  if(!member.name.trim() || member.name.length>20) {setCapacityRowError('Name must have 1–20 characters.');return;}
                  if(result.applied) {setValidSprintMembers(result.members);setEditingCapacityMemberId(null);setCapacityRowError(null);}
                  else setCapacityRowError('Correct invalid values before applying.');
                }}>✓</button>
                <button type="button" title="Cancel edit" aria-label={'Cancel edits for '+member.name} style={{padding:'3px 5px',border:'1px solid #cbd5e1',borderRadius:5,background:'#fff',cursor:'pointer'}} onClick={()=>{setCapacityForm(createDraftSprintCapacityForm(validSprintMembers));setEditingCapacityMemberId(null);setCapacityRowError(null);}}>✕</button>
              </> : <>
                <button type="button" disabled={!!established} title="Edit member" aria-label={'Edit '+member.name} style={{padding:'3px 5px',border:'1px solid #cbd5e1',borderRadius:5,background:'#fff',cursor:'pointer'}} onClick={()=>{setEditingCapacityMemberId(member.id);setCapacityRowError(null);}}>✎</button>
                <button type="button" disabled={!!established} title="Remove member" aria-label={'Remove '+member.name} style={{padding:'3px 5px',border:'1px solid #cbd5e1',borderRadius:5,background:'#fff',cursor:'pointer'}} onClick={()=>{if(window.confirm('Remove '+member.name+' from future capacity?'))removeCapacityMember(member.id);}}>🗑</button>
              </>}</div>
              {editing && (capacityRowError || Object.values(errors).some(Boolean)) && <div role="alert" style={{gridColumn:'1/-1',fontSize:11,color:'#b42318'}}>{capacityRowError ?? Object.values(errors).filter(Boolean).join(' · ')}</div>}
            </div>;
          })}
        </div>`;
s=replaceRange(s,mapStart,mapEnd,table);

const impactStart=s.indexOf('<div aria-label="Capacity impact and forecast visibility"');
if(impactStart<0)throw Error('Impact panel absent.');
const impact=element(s,impactStart,'div');
if(!impact.html.includes('aria-label="Capacity impact metrics"'))throw Error('5.5.0 impact metrics structure is different.');
s=cut(s,impact);
let impactHtml=impact.html;
const balance=impactHtml.match(/<Metric title="Capacity balance"[^\n]*\/>/);
if(!balance||!impactHtml.includes('<Metric title="SE potential throughput"'))throw Error('Cannot identify five metric tiles.');
impactHtml=impactHtml.replace(balance[0],'');
const emphasized='<div title={capacityBalance === "Balanced" ? "Balanced SE and QA capacity" : "Capacity bottleneck"} style={{borderLeft:capacityBalance === "Balanced" ? "3px solid #16a34a" : "3px solid #d97706",borderRadius:9,background:capacityBalance === "Balanced" ? "#f0fdf4" : "#fffbeb"}}>'+balance[0]+'</div>';
impactHtml=impactHtml.replace('<Metric title="SE potential throughput"',emphasized+'\n              <Metric title="SE potential throughput"');

// In 5.5.0 the baseline buttons are siblings AFTER Capacity Impact, not children of it.
// Extract them separately so that the new full-width summary contains both actions.
const actionsStart=s.indexOf('<div aria-label="Baseline actions"');
if(actionsStart<0)throw Error('5.5.0 baseline actions are missing. No files changed.');
const actions=element(s,actionsStart,'div');
s=cut(s,actions);
// The manual-save explanation also sits directly after the action row.
const explanationPattern=/<p[^>]*>Save Draft is manual\.[\s\S]*?Saved releases can be reopened from Release Management\.<\/p>/;
const explanation=s.match(explanationPattern);
if(!explanation)throw Error('5.5.0 baseline actions explanation not found. No files changed.');
s=s.replace(explanation[0],'');

const statusStart=s.indexOf('<div aria-label="Baseline status messages"');
const status=element(s,statusStart,'div');
s=cut(s,status);
const chartIndex=s.indexOf('<section className="panel chart-panel"');
const chart=element(s,chartIndex,'section');
s=cut(s,chart);
const teamIndex=s.indexOf('<section className="panel" aria-label="BL future team capacity"');
const team=element(s,teamIndex,'section');
let teamHtml=team.html.replace('<section className="panel" aria-label="BL future team capacity"','<section className="panel psp-capacity-pane" aria-label="BL future team capacity"');
teamHtml=teamHtml.replace('onClick={() => addCapacityMember(\'SE\')}','onClick={() => {if(editingCapacityMemberId===null) addCapacityMember(\'SE\');}}').replace('onClick={() => addCapacityMember(\'QA\')}','onClick={() => {if(editingCapacityMemberId===null) addCapacityMember(\'QA\');}}');
const chartHtml=chart.html.replace('<section className="panel chart-panel"','<section className="panel chart-panel psp-chart-pane"');
const layout=`<style>{'@media (max-width: 900px) { .psp-planning-compare { grid-template-columns: minmax(0, 1fr) !important; } } .psp-planning-compare > * { min-width:0; } .psp-planning-compare .psp-chart-pane .chart-wrap { min-height:350px; }'}</style>
      <div className="psp-planning-compare" style={{display:'grid',gridTemplateColumns:'minmax(0, 2fr) minmax(0, 3fr)',gap:16,alignItems:'start',marginBottom:20}}>
      ${teamHtml}
      ${chartHtml}
      </div>
      <section className="panel" aria-label="Capacity impact summary" style={{marginBottom:20}}>${impactHtml}{!established && <>${actions.html}${explanation[0]}</>}${status.html}</section>`;
s=replaceRange(s,team.start,team.end,layout);
if(s.includes('aria-label="Baseline establishment"')||!s.includes('buildEstablishedBaselineDataset(established, completedActuals)'))throw Error('Unexpected legacy workspace version. No files changed.');
if(s.match(/onClick=\{saveDraft\}/g)?.length!==1 || s.match(/onClick=\{establish\}/g)?.length!==1)throw Error('BL action preservation failed. No files changed.');
const backup=path.resolve('src/ReleaseWorkspace.before-5.6.0.tsx.bak');
if(fs.existsSync(backup)) throw Error('Backup already exists; no changes made.');
fs.writeFileSync(backup,original);
fs.writeFileSync(target,s);
console.log('Applied 5.6.0 layout. Backup:',backup);
