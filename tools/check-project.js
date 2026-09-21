#!/usr/bin/env node
// Reads a project directory the way the server would and reports what it found.
//   node tools/check-project.js /path/to/project
import { load } from '../server/source/project.js';
import * as V from '../server/views.js';
import * as E from '../server/engine.js';

const root = process.argv[2];
if (!root) { console.error('usage: node tools/check-project.js <project-dir>'); process.exit(2); }

const { ws, problems, ok } = load(root);
if (!ok) { console.error('cannot read ' + root); problems.forEach((p) => console.error('  ' + p.message)); process.exit(2); }

const n = (x) => String(x).padStart(6);
console.log(`\nproject: ${root}\n`);
console.log(`${n(ws.ideas.length)}  ideas          ${ws.ideas.map((i) => i.id + ':' + i.status).join(' ') || '—'}`);
console.log(`${n(Object.keys(ws.hyps).length)}  hypotheses     ${E.counts(ws).shared} shared by more than one running idea`);
console.log(`${n(Object.keys(ws.experiments).length)}  experiments    ${E.counts(ws).running} running · ${E.counts(ws).queued} queued`);
console.log(`${n(Object.keys(ws.papers).length)}  papers         levels ${ws.survey.funnel.l1}/${ws.survey.funnel.l2}/${ws.survey.funnel.l3}`);
console.log(`${n(ws.survey.venues.length)}  venues         ${ws.survey.topics.length} topics`);
console.log(`${n(ws.events.length)}  events         ${Object.keys(ws.verdicts).length} verdicts on file`);
console.log(`${n(ws.paper.sections.length)}  sections       ${ws.claims.items.length} claims`);
console.log(`${n(E.frontier(ws).length)}  on frontier    ${E.pendingVerdicts(ws).length} awaiting a verdict`);

const SCREENS = ['home', 'main', 'survey', 'trends', 'sparks', 'digest', 'ideas', 'panorama', 'graph', 'tree',
  'experiments', 'exptree', 'sweep', 'runs', 'review', 'paper', 'claims', 'figures', 'rebuttal', 'events'];
let broken = 0;
for (const s of SCREENS) {
  try { s === 'digest' ? V.digest(ws, Object.keys(ws.papers)[0]) : V[s](ws); }
  catch (e) { broken++; console.log(`\n  screen "${s}" failed: ${e.message}`); }
}
console.log(`\n${n(SCREENS.length - broken)}  screens render` + (broken ? `  (${broken} failed — please report)` : ''));

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ${(p.file || '—').padEnd(22)} ${p.message}${p.detail ? ' — ' + p.detail : ''}`);
} else console.log('\nno problems found');

const empty = Object.keys(ws.hyps).length === 0 && Object.keys(ws.papers).length === 0;
console.log('');
process.exit(empty || broken ? 1 : 0);
