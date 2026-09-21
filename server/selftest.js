// End-to-end check: every screen builds, every action applies, and the
// consequences of an action show up on the other screens. Run: npm test
import { makeWorkspace } from './seed.js';
import * as V from './views.js';
import * as E from './engine.js';
import { apply, OPS } from './actions.js';

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { if (cond) { pass++; } else { fail++; console.log('  FAIL  ' + name + (extra ? ' — ' + extra : '')); } };
const SCREENS = ['home', 'main', 'survey', 'trends', 'sparks', 'ideas', 'panorama', 'graph', 'tree', 'experiments', 'exptree', 'sweep', 'runs', 'review', 'paper', 'claims', 'figures', 'rebuttal', 'events'];
const buildAll = (ws) => { const out = {}; for (const s of SCREENS) out[s] = V[s](ws); out.digest = V.digest(ws, 'arxiv-2606-01882'); return out; };

// every bilingual leaf must carry both languages
function checkLang(node, path, seen = new Set()) {
  if (!node || typeof node !== 'object' || seen.has(node)) return;
  seen.add(node);
  const k = Object.keys(node);
  if (k.length === 2 && k.includes('zh') && k.includes('en')) {
    // a unit word may legitimately be empty on one side ("6 条" vs plain "6")
    ok('bilingual ' + path, typeof node.zh === 'string' && typeof node.en === 'string' && (node.zh + node.en).length > 0, JSON.stringify(node).slice(0, 60));
    return;
  }
  for (const key of k) checkLang(node[key], path + '.' + key, seen);
}

console.log('\n1. every screen builds');
{
  const ws = makeWorkspace();
  const all = buildAll(ws);
  for (const [s, v] of Object.entries(all)) ok('view ' + s, v && JSON.stringify(v).length > 100);
  checkLang(all.home, 'home'); checkLang(all.review, 'review'); checkLang(all.rebuttal, 'rebuttal');
}

console.log('2. every op is reachable and returns a bilingual toast');
{
  const ws = makeWorkspace();
  const calls = [
    ['exp.run', { hyp: 'H-09' }], ['exp.runBatch', { hyps: ['H-19', 'H-18'] }], ['exp.decide', { exp: 'e_15', kind: 'PROCEED' }],
    ['exp.decide', { exp: 'e_16', kind: 'REFINE' }], ['exp.decide', { exp: 'e_18', kind: 'PIVOT' }], ['exp.control', { exp: 'e_19', cmd: 'resume' }],
    ['exp.config', { exp: 'e_19', cfg: { batch: '64' } }], ['exp.copy', { exp: 'e_19' }], ['settings.update', { parallel: 4, budget: 150 }],
    ['hyp.addChild', { idea: 'P-014', parentHyp: 'H-11', claim: 'test child' }], ['hyp.decompose', { hyp: 'H-09' }],
    ['hyp.edit', { hyp: 'H-11', claim: 'edited', warrant: 'because' }], ['hyp.borrow', { hyp: 'H-11', idea: 'P-014' }],
    ['hyp.dep', { hyp: 'H-19', on: 'H-11' }], ['hyp.submit', { hyp: 'H-12' }],
    ['verdict.apply', { hyp: 'H-12', verdict: 'return_active' }], ['decision.snooze', { id: 'fig3' }],
    ['survey.collect', {}], ['survey.venue', { id: 'CCS', field: 'scan' }], ['survey.candidate', { id: 'c1', accept: true }],
    ['survey.candidate', { id: 'c2', accept: false }], ['paper.queue', { id: 'arxiv-2607-11244' }], ['paper.level3', { id: 'arxiv-2607-11244' }],
    ['paper.regen', { id: 'arxiv-2606-01882' }], ['spark.gen', { gap: 'g1' }], ['spark.state', { id: 'SPARK-2026-09-001', status: 'selected' }],
    ['spark.merge', { id: 'SPARK-2026-09-002' }], ['idea.pick', { dir: 'next' }], ['idea.plan', { i: 0, mode: 'new' }],
    ['idea.claim', { claim: 'a new claim' }], ['idea.lit', { id: 'l5' }], ['idea.extract', {}], ['idea.launch', {}], ['idea.park', {}],
    ['tree.expand', { node: 'n_124' }], ['tree.prune', { node: 'n_118' }], ['sweep.metric', { metric: 'noise' }], ['sweep.mode', { mode: 'mean' }],
    ['sweep.fill', {}], ['sweep.write', {}], ['paper.save', { k: '4.2', i: 0, text: 'rewritten' }], ['paper.regen', {}],
    ['paper.gap', { id: 'gap1' }], ['paper.insertFig', { k: '5' }], ['claim.fix', { id: 'c5', how: 'soften' }],
    ['claim.fix', { id: 'c3', how: 'experiment' }], ['claim.batchSoften', {}], ['fig.review', { id: 'r1' }],
    ['fig.caption', { text: 'new caption' }], ['fig.align', {}], ['rebuttal.comment', { id: 'C1', act: 'exp' }],
    ['rebuttal.comment', { id: 'B1', act: 'done' }], ['rebuttal.repro', {}], ['agent.bind', { role: 'reviewer', model: 'gpt' }],
    ['rebuttal.rewrite', {}], ['rebuttal.pack', {}],
  ];
  for (const [op, args] of calls) {
    const r = apply(ws, op, args);
    ok('op ' + op, r && r.toast && typeof r.toast.zh === 'string' && typeof r.toast.en === 'string', JSON.stringify(r).slice(0, 80));
  }
  const declared = new Set(Object.keys(OPS)), used = new Set(calls.map((c) => c[0]));
  for (const op of declared) ok('covered ' + op, used.has(op));
  const all = buildAll(ws);
  for (const [s, v] of Object.entries(all)) ok('view after ops: ' + s, v && JSON.stringify(v).length > 80);
}

console.log('3. a finished run writes evidence everywhere at once');
{
  const ws = makeWorkspace();
  const before = E.score(ws, 'H-11');
  const ideas = E.activeIdeasOf(ws, 'H-11');
  ok('H-11 is shared', ideas.length >= 2, ideas.join(','));
  const e = ws.experiments.e_15;
  E.finishExperiment(ws, e, Date.now());
  ok('score moved', E.score(ws, 'H-11') === Math.round((before + e.outcome.delta) * 10) / 10);
  ok('evidence is visible from every citing project', E.activeIdeasOf(ws, 'H-11').every((i) => V.tree(ws, i, 'H-11').sel.score === E.score(ws, 'H-11')));
  ok('an event was written', ws.events[0].kind === 'experiment');
}

console.log('4. escalation: repeated PIVOTs stop the executor');
{
  const ws = makeWorkspace();
  // three PIVOTs in a row escalate even when each one is individually small
  for (let i = 0; i < 3 && E.hypStatus(ws, 'H-14') !== 'pending_review'; i++) {
    const r = apply(ws, 'exp.run', { hyp: 'H-14' });
    ok('run ' + i + ' accepted', r.ok, JSON.stringify(r.toast));
    const ex = ws.experiments[r.exp];
    ex.outcome.delta = -0.3;
    apply(ws, 'exp.decide', { exp: r.exp, kind: 'PIVOT' });
  }
  ok('H-14 escalated', E.hypStatus(ws, 'H-14') === 'pending_review', E.hypStatus(ws, 'H-14'));
  ok('no further run is accepted while it waits', apply(ws, 'exp.run', { hyp: 'H-14' }).ok === false);
  ok('it shows in the verdict queue', V.review(ws).pending.some((p) => p.id === 'H-14'));
  ok('it left the frontier', !E.frontier(ws).some((f) => f.id === 'H-14'));
}

console.log('5. a verdict propagates by role, not uniformly');
{
  const ws = makeWorkspace();
  const im = E.impact(ws, 'H-02');
  ok('three different consequences', new Set(im.map((x) => x.kind)).size === 3, im.map((x) => x.idea + ':' + x.kind).join(' '));
  const root = im.find((x) => x.kind === 'global');
  const r = apply(ws, 'verdict.apply', { hyp: 'H-02', verdict: 'close' });
  ok('verdict applied', r.ok);
  ok('root project froze whole tree', ws.trees[root.idea].every((n) => n.frozen));
  const local = im.find((x) => x.kind === 'local');
  ok('independently evidenced project untouched', ws.trees[local.idea].some((n) => !n.frozen));
  ok('verdicts/ written', !!ws.verdicts['H-02'] && ws.verdicts['H-02'].verdict === 'close');
  ok('sections flagged', V.paper(ws).sections.some((s) => s.status === 'affected'));
  ok('queued runs withdrawn', Object.values(ws.experiments).some((e) => e.status === 'withdrawn'));
}
{
  const ws = makeWorkspace();
  apply(ws, 'verdict.apply', { hyp: 'H-02', verdict: 'narrow_scope' });
  ok('narrow_scope keeps positive evidence only', ws.hyps['H-02'].evidence.every((e) => e.delta > 0));
  ok('narrow_scope freezes nothing', Object.values(ws.trees).every((t) => t.every((n) => !n.frozen)));
  ok('it left the queue', V.review(ws).pending.every((p) => p.id !== 'H-02'));
}

console.log('6. writing reacts to the evidence underneath it');
{
  const ws = makeWorkspace();
  ok('export gate is shut while overclaims stand', V.claims(ws).gate === true);
  ok('pack refuses', apply(ws, 'rebuttal.pack', {}).ok === false);
  apply(ws, 'claim.batchSoften', {});
  ok('gate opens after softening', V.claims(ws).gate === false);
  const fig4 = V.figures(ws).items[3];
  ok('figure 4 waits on its run', fig4.status === 'waiting');
  E.finishExperiment(ws, ws.experiments.e_16, Date.now());
  ok('figure 4 appears when e_16 lands', V.figures(ws).items[3].status === 'done');
  ok('checklist auto-ticks', V.rebuttal(ws).checklist.find((k) => k.auto === 'fig4').done);
  const r = apply(ws, 'rebuttal.pack', {});
  ok('pack succeeds once the list is clean', r.ok, JSON.stringify(r.toast));
}
{
  const ws = makeWorkspace();
  const before = V.paper(ws).sections.find((s) => s.k === '4.2').paras.map((p) => p.zh);
  apply(ws, 'fig.align', {});
  const after = V.paper(ws).sections.find((s) => s.k === '4.2').paras.map((p) => p.zh);
  ok('aligning the figure edits the manuscript', before.join() !== after.join() && after.join().includes('17.6%'));
  ok('the decision leaves the home queue', !V.home(ws).decisions.some((d) => d.kind === 'figure'));
}

console.log('7. queue, slots and the clock');
{
  const ws = makeWorkspace(Date.now() - 60000);
  ws.settings.parallel = 3;
  const running = () => Object.values(ws.experiments).filter((e) => e.status === 'running').length;
  E.tick(ws, Date.now());
  ok('never exceeds the slot count', running() <= 3, String(running()));
  const future = Date.now() + 40 * 60000;
  E.tick(ws, future);
  ok('runs finish when their time comes', Object.values(ws.experiments).filter((e) => e.status === 'done').length > 15);
  ok('the queue drained into free slots', Object.values(ws.experiments).filter((e) => e.status === 'queued').length === 0);
  ok('still within the slot count', running() <= 3, String(running()));
}

console.log('8. survey round');
{
  const ws = makeWorkspace();
  const lib = ws.survey.library;
  apply(ws, 'survey.collect', {});
  ok('a second round is refused while one runs', apply(ws, 'survey.collect', {}).ok === false);
  E.tick(ws, Date.now() + 30000);
  ok('library grew', ws.survey.library > lib);
  ok('job cleared', ws.survey.job === null);
}

console.log('9. idea launch wires a new tree into the shared network');
{
  const ws = makeWorkspace();
  const hypsBefore = Object.keys(ws.hyps).length;
  const r = apply(ws, 'idea.launch', {});
  ok('launched', r.ok, JSON.stringify(r.toast));
  const id = r.idea;
  ok('tree exists', (ws.trees[id] || []).length > 1);
  ok('reused hypotheses gained a citing project', E.activeIdeasOf(ws, 'H-01').includes(id));
  ok('only new hypotheses were created', Object.keys(ws.hyps).length > hypsBefore);
  ok('it shows up in the sidebar', V.shell(ws).ideas.find((i) => i.id === id).status === 'running');
  ok('its nodes reach the frontier', E.frontier(ws).some((f) => f.ideas.includes(id)));
}



console.log('10. a real project directory loads and every screen renders from it');
{
  const P = await import('./source/project.js');
  const { ws, problems } = P.load('fixtures/project-sample');
  ok('ideas loaded', ws.ideas.length === 3, ws.ideas.map((i) => i.id).join(','));
  ok('hypotheses loaded', Object.keys(ws.hyps).length === 4);
  ok('trees wired to hypotheses', ws.trees['P-001'].length === 3 && ws.trees['P-002'].length === 2);
  ok('a hypothesis shared by two ideas is detected', E.activeIdeasOf(ws, 'H-2').join(',') === 'P-001,P-002');
  ok('its role differs per idea', E.roleIn(ws, 'P-001', 'H-2').kind === 'mid' && E.roleIn(ws, 'P-002', 'H-2').kind === 'root');
  ok('evidence accumulates across ideas', E.score(ws, 'H-2') === -0.5, String(E.score(ws, 'H-2')));
  ok('it lands in the verdict queue', V.review(ws).pending.some((x) => x.id === 'H-2'));
  ok('experiments loaded', Object.keys(ws.experiments).length === 5);
  ok('finished runs became history', ws.runs.length === 2);
  ok('papers loaded', Object.keys(ws.papers).length === 2);
  ok('venues parsed from yaml', ws.survey.venues.length === 3 && ws.survey.venues.find((v) => v.id === 'BROKEN').status === 'broken');
  ok('topics parsed from markdown', ws.survey.topics.join(',') === 'optimisation,generalisation');
  ok('events loaded', ws.events.length === 3 && ws.events[0].t > ws.events[2].t);
  ok('existing verdicts loaded', !!ws.verdicts['H-9']);
  ok('manuscript loaded', ws.paper.sections.length === 2);
  ok('claims loaded', ws.claims.items.length === 2 && V.claims(ws).gate === true);
  ok('bad rows are reported, not fatal', problems.length === 3, JSON.stringify(problems));
  ok('a plain string becomes both languages', ws.hyps['H-1'].claim.zh === ws.hyps['H-1'].claim.en);
  ok('a supplied pair is kept', ws.hyps['H-2'].claim.zh !== ws.hyps['H-2'].claim.en);

  for (const s of SCREENS) {
    try { const v = V[s](ws); ok('project view ' + s, !!v); } catch (e) { ok('project view ' + s, false, e.message); }
  }
  try { ok('project view digest', !!V.digest(ws, 'arxiv-2601-00001').paper); } catch (e) { ok('project view digest', false, e.message); }

  // the sections a project has not filled in must render as empty, not crash
  ok('empty sweep is flagged', V.sweep(ws).empty === true);
  ok('empty experiment tree is flagged', V.exptree(ws).empty === true);
  ok('empty idea intake is flagged', V.ideas(ws).empty === true);
  ok('panorama has nodes', V.panorama(ws).nodes.length === 4);
  ok('no bogus figure decision on home', !V.home(ws).decisions.some((d) => d.kind === 'figure'));

  // a verdict still propagates by role when the data came from disk
  const before = E.impact(ws, 'H-2');
  ok('impact differs per idea', before.find((i) => i.idea === 'P-002').kind === 'global' && before.find((i) => i.idea === 'P-001').kind === 'branch');
}

console.log('11. a blank workspace renders every screen');
{
  const { blankWorkspace } = await import('./seed.js');
  const ws = blankWorkspace();
  for (const s of SCREENS) {
    try { V[s](ws); ok('blank view ' + s, true); } catch (e) { ok('blank view ' + s, false, e.message); }
  }
  try { V.digest(ws, 'nothing'); ok('blank view digest', true); } catch (e) { ok('blank view digest', false, e.message); }
  ok('counts survive emptiness', E.counts(ws).hyps === 0);
}

console.log('12. input hygiene');
{
  const { patchText, str, num, id: vid } = await import('./input.js');
  const ws = makeWorkspace();
  const before = ws.hyps['H-11'].claim.en;
  apply(ws, 'hyp.edit', { hyp: 'H-11', claim: '只改中文' }, 'zh');
  ok('editing one language keeps the other', ws.hyps['H-11'].claim.zh === '只改中文' && ws.hyps['H-11'].claim.en === before);
  apply(ws, 'hyp.edit', { hyp: 'H-11', claim: 'english only' }, 'en');
  ok('and the other way round', ws.hyps['H-11'].claim.en === 'english only' && ws.hyps['H-11'].claim.zh === '只改中文');
  const long = 'x'.repeat(50000);
  apply(ws, 'paper.save', { k: '4.2', i: 0, text: long }, 'zh');
  ok('long input is capped', ws.paper.sections.find((s) => s.k === '4.2').paras[0].zh.length <= 2000);
  ok('an out-of-range paragraph index is clamped', apply(ws, 'paper.save', { k: '4.2', i: 999, text: 'x' }, 'zh').ok);
  ok('an empty claim is refused', apply(ws, 'hyp.addChild', { idea: 'P-014', parentHyp: 'H-11', claim: '   ' }).ok === false);
  ok('a throwing action does not take the server down', apply(ws, 'exp.decide', { exp: 'e_15', kind: null }).ok === false);
  ok('num clamps', num(999, 1, 8, 3) === 8 && num('nope', 1, 8, 3) === 3);
  ok('id rejects junk', vid('../etc/passwd') === '' && vid('H-11') === 'H-11');
  ok('str trims and caps', str('  hi  ') === 'hi' && str('y'.repeat(500)).length === 200);
}

console.log('13. project mode is a decision surface, not a simulator');
{
  const P = await import('./source/project.js');
  const { ws } = P.load('fixtures/project-sample');
  const running = ws.experiments.x_03;
  const progBefore = running.prog;
  E.tick(ws, Date.now() + 48 * 3600000);
  ok('the clock does not finish a real run', running.status === 'running' && running.prog === progBefore);
  ok('and does not start a queued one', ws.experiments.x_04.status === 'queued');
  ok('evidence is untouched', E.score(ws, 'H-1') === 1.2);

  ok('ruling is allowed', apply(ws, 'verdict.apply', { hyp: 'H-2', verdict: 'narrow_scope' }).ok);
  ok('queueing is allowed', apply(ws, 'exp.run', { hyp: 'H-4' }).ok);
  const refused = apply(ws, 'paper.save', { k: '1', i: 0, text: 'rewritten by hand' });
  ok('writing an agent-owned file is refused', refused.ok === false, JSON.stringify(refused.toast));
  ok('the refusal explains why', /agent/.test(refused.toast.en));
  const ro = P.load('fixtures/project-sample').ws;
  ro.readonly = true;
  ok('read-only refuses everything', apply(ro, 'verdict.apply', { hyp: 'H-2', verdict: 'close' }).ok === false);
  ok('a narrowed verdict is not demo-specific', ws.verdicts['H-2'].scope === 'narrowed');
}

console.log('14. nothing on screen is narrated rather than derived');
{
  const P = await import('./source/project.js');
  const { ws } = P.load('fixtures/project-sample');
  const h = V.home(ws);
  const text = JSON.stringify(h.last24);
  ok('the 24h summary comes from real events', !/P-015|H-03/.test(text), text.slice(0, 120));
  ok('it only reports groups that happened', h.last24.every((g) => g.head && (g.head.zh || g.head.en)));
  const demo = V.home(makeWorkspace());
  ok('and still fills up on the demo', demo.last24.length >= 2, String(demo.last24.length));
  ok('a verdict preview is not demo-specific', V.review(ws).sel?.preview?.scope !== 'low_rank_only');
  ok('the single-idea tree defaults to a real idea', V.tree(ws).idea === 'P-001', String(V.tree(ws).idea));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
