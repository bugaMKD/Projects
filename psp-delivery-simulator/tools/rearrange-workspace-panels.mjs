/**
 * PSP v2.1.x: purely presentational workspace panel layout adjustment.
 * Run from the psp-delivery-simulator directory:
 *   node tools/rearrange-workspace-panels.mjs
 * Safe against partial edits: computes both files before writing either.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function updateWorkspace(source) {
  const marker = '      <div className="lower-grid">\n';
  const forecastStart = `        <section className="panel"><SectionHeading eyebrow={established ? '04 / Established BL outlook' : '04 / Draft BL delivery outlook'}`;
  const capacity = '      <ReleaseHistoricalCapacityView historical={established?.historical ?? validHistorical} sprintMembers={established?.sprintMembers ?? validSprintMembers} established={!!established} mode="future"/>';
  const start = source.indexOf(marker);
  if (start < 0) throw Error('Cannot find the existing lower-grid layout. No files changed.');
  const allocationStart = start + marker.length;
  const forecastIndex = source.indexOf(forecastStart, allocationStart);
  if (forecastIndex < 0) throw Error('Cannot find the BL completion forecast panel. No files changed.');
  const allocation = source.slice(allocationStart, forecastIndex);
  if (!allocation.includes('title="PSP allocation"') || !allocation.trimEnd().endsWith('</section>')) {
    throw Error('Unexpected PSP allocation markup. No files changed.');
  }
  const capacityIndex = source.indexOf(capacity, forecastIndex);
  if (capacityIndex < 0) throw Error('Cannot find future SE/QA breakdown panel. No files changed.');
  const between = source.slice(forecastIndex, capacityIndex);
  if (!between.endsWith('      </div>\n')) {
    throw Error('Unexpected forecast/summary panel boundary. No files changed.');
  }
  const forecast = between.slice(0, -'      </div>\n'.length);
  if (!forecast.trimEnd().endsWith('</section>')) throw Error('Invalid forecast panel boundary. No files changed.');
  const afterCapacity = source.slice(capacityIndex + capacity.length);
  if (!afterCapacity.startsWith('\n      </div>\n')) throw Error('Unexpected workspace container boundary. No files changed.');
  const replacement = `${marker}${forecast}${capacity.replace(/^      /, '        ')}\n      </div>\n${allocation}`;
  return source.slice(0, start) + replacement + afterCapacity;
}

export function updateCapacityView(source) {
  const header = `<th style={{textAlign:'right'}}>Available days / sprint</th>`;
  const cell = `<td style={cell}>{fmt(r.futureAvailableDaysPerSprint)}</td>`;
  if (source.split(header).length !== 2 || source.split(cell).length !== 2) {
    throw Error('Future capacity table markup has changed. No files changed.');
  }
  return source.replace(header, `{mode !== 'future' && ${header}}`)
    .replace(cell, `{mode !== 'future' && ${cell}}`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  const workspacePath = resolve('src/ReleaseWorkspace.tsx');
  const summaryPath = resolve('src/components/ReleaseHistoricalCapacityView.tsx');
  const workspace = readFileSync(workspacePath, 'utf8');
  const summary = readFileSync(summaryPath, 'utf8');
  // Match independent of the platform's line endings, but preserve each file's style.
  const normalize = text => text.replace(/\r\n/g, '\n');
  const preserve = (updated, original) => original.includes('\r\n') ? updated.replace(/\n/g, '\r\n') : updated;
  let nextWorkspace;
  let nextSummary;
  try {
    nextWorkspace = updateWorkspace(normalize(workspace));
    nextSummary = updateCapacityView(normalize(summary));
  } catch (error) {
    console.error('\x1b[31mPSP LAYOUT PATCH FAILED:\x1b[0m', error instanceof Error ? error.message : error);
    process.exitCode = 1;
    throw error;
  }
  writeFileSync(workspacePath, preserve(nextWorkspace, workspace));
  writeFileSync(summaryPath, preserve(nextSummary, summary));
  console.log('\x1b[32mSUCCESS:\x1b[0m forecast left, capacity right, PSP allocation below; available days hidden in summary.');
}
