import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const target = path.join(projectRoot, 'src', 'ReleaseWorkspace.tsx');
if (!fs.existsSync(target)) throw Error('Run from psp-delivery-simulator project root.');
const original = fs.readFileSync(target, 'utf8');
let s = original;
if (s.includes('psp-combined-planning')) throw Error('5.6.1 appears to be already applied. No changes made.');

// Verify the recognized 5.6.0 layout before any write.
const markers = [
  'className="psp-planning-compare"',
  'className="panel psp-capacity-pane"',
  'className="panel chart-panel psp-chart-pane"',
  'aria-label="Future team capacity details"',
  'aria-label="Future team capacity table"',
  'aria-label="Capacity impact summary"',
  'aria-label="Baseline actions"',
  'onClick={saveDraft}', 'onClick={establish}',
];
for (const marker of markers) if (!s.includes(marker)) throw Error(`Missing expected 5.6.0 marker: ${marker}. No changes made.`);
const onlyOnce=(search, replacement)=>{
  const first=s.indexOf(search);
  if(first<0 || s.indexOf(search,first+search.length)!==-1)throw Error(`Expected exactly one match for: ${search.slice(0,80)}. No changes made.`);
  s=s.slice(0,first)+replacement+s.slice(first+search.length);
};

// Replace the toggle with a permanently visible heading; preserve its inner content.
const detailStart=s.indexOf('<details open={teamCapacityOpen}');
const detailLabel='aria-label="Future team capacity details">';
const detailOpenEnd=s.indexOf(detailLabel, detailStart)+detailLabel.length-1;
const detailClose=s.indexOf('</details>', detailOpenEnd);
if(detailStart<0||detailOpenEnd<detailStart||detailClose<0)throw Error('Unable to locate 5.6.0 capacity accordion. No changes made.');
const detailContent=s.slice(detailOpenEnd+1,detailClose);
if(detailContent.includes('<details') || !detailContent.includes('aria-label="Future team capacity table"'))throw Error('Capacity details have unexpected structure. No changes made.');
const summaryOpen=detailContent.match(/<summary\b[^>]*>/);
const summaryClose=detailContent.indexOf('</summary>');
if(!summaryOpen || summaryClose<0 || !detailContent.includes('Future SE/QA Capacity'))throw Error('Cannot locate capacity heading. No changes made.');
let contents=detailContent.replace(summaryOpen[0],'<div className="psp-capacity-heading" style={{color:\'#172b4d\',marginBottom:12}}>')
  .replace('</summary>','</div>');
// Ensure the original details inner wrapper is kept; it contains the existing forms.
s=s.slice(0,detailStart)+'<div className="psp-capacity-body">'+contents+'</div>'+s.slice(detailClose+'</details>'.length);
const openState=/^\s*const \[teamCapacityOpen, setTeamCapacityOpen\] = useState\(!established\);\r?\n/m;
if(!openState.test(s))throw Error('Cannot locate obsolete capacity accordion state. No changes made.');
s=s.replace(openState,'\n');

// Wrap BOTH existing panes in ONE visual card. Keep inner classNames so older
// chart/ordering contract tests do not break; CSS removes their individual cards.
const gridStart=s.indexOf('<div className="psp-planning-compare"');
const gridTagEnd=s.indexOf('>',gridStart);
if(gridStart<0 || gridTagEnd<0)throw Error('Cannot find comparison grid. No changes made.');
const gridOpening=s.slice(gridStart,gridTagEnd+1);
if(!gridOpening.includes("alignItems:'start'"))throw Error('Unexpected comparison grid layout. No changes made.');
const sharedOpening='<section className="panel psp-combined-planning" aria-label="Interactive release planning" style={{marginBottom:20}}>\n      '+gridOpening.replace("alignItems:'start'","alignItems:'stretch'").replace('marginBottom:20','marginBottom:0');
s=s.slice(0,gridStart)+sharedOpening+s.slice(gridTagEnd+1);
const summaryStart=s.indexOf('<section className="panel" aria-label="Capacity impact summary"', gridStart);
if(summaryStart<0)throw Error('Cannot find capacity impact summary after comparison grid. No changes made.');
const between=s.slice(gridStart,summaryStart);
const closingGrid=between.lastIndexOf('</div>');
if(closingGrid<0)throw Error('Cannot locate comparison grid closing div. No changes made.');
const location=gridStart+closingGrid+'</div>'.length;
s=s.slice(0,location)+'\n      </section>'+s.slice(location);

// Scoped CSS: two equal-height columns, one shared border, internal scroll for
// long capacity tables. Existing Recharts sizing/markup remains unchanged.
const css=`<style>{\`\n  .psp-combined-planning .psp-planning-compare { align-items: stretch; }\n  .psp-combined-planning .psp-planning-compare > .panel {\n    min-width: 0; min-height: 440px; height: 100%; box-sizing: border-box;\n    border: 0; box-shadow: none; background: transparent; padding: 0; margin: 0 !important;\n    display: flex; flex-direction: column;\n  }\n  .psp-combined-planning .psp-capacity-pane .psp-capacity-body { display: flex; flex-direction: column; flex: 1; min-height: 0; }\n  .psp-combined-planning .psp-capacity-pane [role="table"] { max-height: 365px; overflow-y: auto !important; overflow-x: auto; }\n  .psp-combined-planning .psp-chart-pane .chart-wrap { flex: 1 1 auto; min-height: 365px; }\n  @media (max-width: 900px) {\n    .psp-combined-planning .psp-planning-compare > .panel { min-height: 0; height: auto; }\n    .psp-combined-planning .psp-chart-pane .chart-wrap { min-height: 365px; }\n  }\n\`}</style>\n      `;
const wrapper=s.indexOf('<section className="panel psp-combined-planning"');
s=s.slice(0,wrapper)+css+s.slice(wrapper);

if ((s.match(/onClick=\{saveDraft\}/g)||[]).length!==1 || (s.match(/onClick=\{establish\}/g)||[]).length!==1)throw Error('Baseline actions changed unexpectedly. No files written.');
if(s.includes('aria-label="Future team capacity details"') || s.includes('teamCapacityOpen'))throw Error('Capacity accordion remains. No files written.');
if(!s.includes('buildEstablishedBaselineDataset(established, completedActuals)'))throw Error('Unexpected baseline engine. No files written.');

// Keep this updater all-or-nothing: validate test source before writing either file.
const contractPath=path.join(projectRoot,'tests','workspace-collapsible-panels.test.mjs');
let contractNew=null;
if(fs.existsSync(contractPath)) {
  const current=fs.readFileSync(contractPath,'utf8');
  const oldTestName="capacity accordion contains compact editable table, while impact summary is full-width";
  if(current.includes(oldTestName)) {
    const start=current.indexOf(`test('${oldTestName}'`);
    const next=current.indexOf("\ntest(",start+5);
    if(start<0||next<0)throw Error('Cannot safely locate old accordion contract test. No changes made.');
    const replacement=`test('team capacity is always visible in shared planning card', () => {\n  const source = readPspSource(resolvePspPath(process.cwd(), 'src/ReleaseWorkspace.tsx'),'utf8');\n  assertPsp.match(source,/className="panel psp-combined-planning"/);\n  assertPsp.match(source,/aria-label="Future team capacity table"/);\n  assertPsp.match(source,/capacityForm\\.map/);\n  assertPsp.match(source,/className="panel chart-panel psp-chart-pane"/);\n  assertPsp.doesNotMatch(source,/aria-label="Future team capacity details"/);\n  assertPsp.ok(source.indexOf('aria-label="Capacity impact and forecast visibility"')>source.indexOf('className="panel chart-panel psp-chart-pane"'));\n});\n`;
    contractNew=current.slice(0,start)+replacement+current.slice(next);
  }
}
const backup=path.join(projectRoot,'src','ReleaseWorkspace.before-5.6.1.tsx.bak');
if(fs.existsSync(backup))throw Error('Backup from 5.6.1 already exists. No changes made.');
if(contractNew!==null && fs.existsSync(contractPath+'.before-5.6.1.bak'))throw Error('Test backup already exists. No changes made.');
fs.writeFileSync(backup,original);
fs.writeFileSync(target,s);
if(contractNew!==null){fs.writeFileSync(contractPath+'.before-5.6.1.bak',fs.readFileSync(contractPath));fs.writeFileSync(contractPath,contractNew);}
console.log('5.6.1 applied: single shared planning card, equal-height panes, no capacity accordion.');
console.log('Source backup:',backup);
if(contractNew!==null)console.log('Updated obsolete capacity accordion test.');
