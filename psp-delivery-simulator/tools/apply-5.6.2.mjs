import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const source = path.join(root,'src','ReleaseWorkspace.tsx');
const util = path.join(root,'src','services','capacityBalanceInsight.ts');
const packageUtil = path.join(path.dirname(fileURLToPath(import.meta.url)), 'capacityBalanceInsight.ts');
if (!fs.existsSync(source)) throw Error('Run from the PSP application root (where src/ReleaseWorkspace.tsx exists).');
if (!fs.existsSync(packageUtil)) throw Error('Missing tools/capacityBalanceInsight.ts next to the updater. Copy both tools files from the ZIP.');
if (fs.existsSync(util)) throw Error('capacityBalanceInsight.ts already exists. No changes applied.');
const original = fs.readFileSync(source,'utf8');
if (original.includes('calculateCapacityBalanceInsight')) throw Error('5.6.2 appears to be applied already. No changes made.');
for (const marker of ['className="panel psp-combined-planning"','aria-label="Capacity impact summary"','title="Capacity balance"','summarizeReleaseCapacity','aria-label="Baseline actions"']) {
  if (!original.includes(marker)) throw Error(`Unexpected 5.6.1 workspace structure: missing ${marker}. No changes made.`);
}
const once = (str, search, replacement) => {
  const i = str.indexOf(search);
  if (i < 0 || str.indexOf(search,i+search.length)>=0) throw Error(`Expected exactly one source match: ${search.slice(0,70)}. No changes made.`);
  return str.slice(0,i) + replacement + str.slice(i+search.length);
};
let s=original;
s=once(s,"import { summarizeReleaseCapacity } from './services/releaseCapacitySummary';", "import { summarizeReleaseCapacity } from './services/releaseCapacitySummary';\nimport { calculateCapacityBalanceInsight, formatCapacityGapPercent, formatCapacityShortfall } from './services/capacityBalanceInsight';");

const balancePattern=/  const capacityBalance = baselineCapacity\.limitingRole === 'SE' \? 'SE limiting'[\s\S]*?: baselineCapacity\.realisticStoryPointsPerSprint === 0 \? 'No delivery capacity' : 'Balanced';/g;
if ([...s.matchAll(balancePattern)].length!==1) throw Error('Unexpected capacityBalance declaration. No changes made.');
s=s.replace(balancePattern,`  // Presentation only: 5% tolerance does NOT alter SE/QA-constrained delivery forecasts.
  const capacityInsight = calculateCapacityBalanceInsight({
    sePotentialStoryPointsPerSprint: baselineCapacity.se.potentialStoryPointsPerSprint,
    qaPotentialStoryPointsPerSprint: baselineCapacity.qa.potentialStoryPointsPerSprint,
    historicalDeliveredStoryPoints: (established?.historical ?? validHistorical).deliveredStoryPoints,
    historicalSeEffectiveDays: (established?.historical ?? validHistorical).seEffectiveDays,
    historicalQaEffectiveDays: (established?.historical ?? validHistorical).qaEffectiveDays,
  });
  const capacityBalance = capacityInsight.label;`);

const boxPattern=/<div title=\{capacityBalance === "Balanced"[\s\S]*?<Metric title="Capacity balance" value=\{capacityBalance\} detail=[^>]*\/>\s*<\/div>/g;
if ([...s.matchAll(boxPattern)].length!==1) throw Error('Unexpected Capacity Balance metric wrapper. No changes made.');
const newBox=`<div aria-label="Capacity balance insight" title={capacityInsight.severity === 'balanced' ? 'Within 5% capacity tolerance' : 'Capacity difference by potential SP throughput'}
            style={{borderLeft:capacityInsight.severity === 'balanced' ? '3px solid #16a34a' : capacityInsight.severity === 'moderate' ? '3px solid #d97706' : capacityInsight.severity === 'high' ? '3px solid #b45309' : '3px solid #94a3b8', borderRadius:9, background:capacityInsight.severity === 'balanced' ? '#f0fdf4' : capacityInsight.severity === 'moderate' ? '#fffbeb' : capacityInsight.severity === 'high' ? '#fff7ed' : '#f8fafc'}}>
            <Metric title="Capacity balance" value={capacityBalance} detail={formatCapacityGapPercent(capacityInsight.gapPercent)} />
            <div style={{fontSize:12,color:'#64738b',padding:'0 12px 12px',lineHeight:1.4}}>{formatCapacityShortfall(capacityInsight)}</div>
          </div>`;
s=s.replace(boxPattern,newBox);
if (s.includes('onClick={saveDraft}')===false || s.includes('onClick={establish}')===false || !s.includes('buildEstablishedBaselineDataset(established, completedActuals)')) throw Error('Expected save/BL/chart invariant missing; no changes written.');
const backup = source+'.before-5.6.2.bak';
if(fs.existsSync(backup)) throw Error('5.6.2 backup already exists. No changes made.');
fs.writeFileSync(backup,original);
fs.writeFileSync(source,s);
fs.copyFileSync(packageUtil,util);
console.log('5.6.2 applied: display-only Capacity Balance Insight. Forecast engine untouched.');
console.log('Backup:',backup);
