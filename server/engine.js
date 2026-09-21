// Derived state + the simulation clock. The workspace object holds facts;
// everything a screen shows that can be computed is computed here, so a mutation
// in one place shows up on every screen (that is the whole point of the product).
import { b } from './seed.js';
import * as source from './source/index.js';

const MIN = 60000, HOUR = 3600000;
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const sum = (a) => a.reduce((x, y) => x + y, 0);

// ---------------------------------------------------------------- indexes
// Hypothesis→idea lookups happen thousands of times per rendered screen. Walking
// every tree each time is fine for a demo and quadratic for a real project, so
// the maps are built once and reused until the tree structure changes.
const memo = new WeakMap();
function idx(ws) {
  const sig = Object.keys(ws.trees).length + ':' + Object.values(ws.trees).reduce((n, t) => n + t.length, 0)
    + ':' + ws.ideas.map((i) => i.status[0]).join('');
  const hit = memo.get(ws);
  if (hit && hit.sig === sig) return hit;
  const byHyp = new Map(), byIdeaHyp = new Map(), kids = new Map();
  for (const [idea, nodes] of Object.entries(ws.trees)) {
    for (const n of nodes) {
      if (!byHyp.has(n.hyp)) byHyp.set(n.hyp, []);
      if (!byHyp.get(n.hyp).includes(idea)) byHyp.get(n.hyp).push(idea);
      byIdeaHyp.set(idea + '\u0000' + n.hyp, n);
      const ck = idea + '\u0000' + (n.parent ?? '');
      if (!kids.has(ck)) kids.set(ck, []);
      kids.get(ck).push(n);
    }
  }
  const live = new Set(ws.ideas.filter((i) => i.status === 'running' || i.status === 'candidate').map((i) => i.id));
  const built = { sig, byHyp, byIdeaHyp, kids, live };
  memo.set(ws, built);
  return built;
}

export function ideasOf(ws, hyp) {
  return (idx(ws).byHyp.get(hyp) || []).slice().sort();
}
export function activeIdeasOf(ws, hyp) {
  const { byHyp, live } = idx(ws);
  return (byHyp.get(hyp) || []).filter((i) => live.has(i)).sort();
}
export function nodesOf(ws, hyp) {
  const { byHyp, byIdeaHyp } = idx(ws);
  return (byHyp.get(hyp) || []).map((idea) => ({ idea, ...byIdeaHyp.get(idea + '\u0000' + hyp) }));
}
export function score(ws, hyp) {
  const h = ws.hyps[hyp];
  return h ? Math.round(sum(h.evidence.map((e) => e.delta)) * 10) / 10 : 0;
}
export function depth(ws, idea, k) {
  const nodes = ws.trees[idea] || [];
  let d = 0, cur = nodes.find((n) => n.k === k);
  while (cur && cur.parent) { d++; cur = nodes.find((n) => n.k === cur.parent); }
  return d;
}
export function childrenOf(ws, idea, k) { return idx(ws).kids.get(idea + '\u0000' + (k ?? '')) || []; }

// role of a hypothesis inside one idea, in words
export function roleIn(ws, idea, hyp) {
  const node = idx(ws).byIdeaHyp.get(idea + '\u0000' + hyp);
  if (!node) return null;
  const d = depth(ws, idea, node.k);
  const leaf = childrenOf(ws, idea, node.k).length === 0;
  const h = ws.hyps[hyp];
  let kind = 'mid';
  if (!node.parent) kind = 'root';
  else if (leaf) kind = 'leaf';
  return { k: node.k, depth: d, leaf, kind, role: node.role, frozen: node.frozen, verified: h.status === 'self_verified' };
}

export function hypStatus(ws, hyp) {
  const h = ws.hyps[hyp];
  if (!h) return 'untested';
  if (h.status === 'closed' || h.status === 'narrow' || h.status === 'pending_review' || h.status === 'lit_supported' || h.status === 'inductive_unverified') return h.status;
  const running = Object.values(ws.experiments).some((e) => e.hyp === hyp && e.status === 'running');
  if (running) return 'testing';
  if (h.status === 'self_verified') return 'self_verified';
  const s = score(ws, hyp);
  if (s >= 1.0) return 'self_verified';
  return h.evidence.length ? 'active' : 'untested';
}

// A hypothesis is on the frontier when its dependencies are verified, nothing is
// running on it, it is not frozen, and it is not already settled.
export function frontier(ws) {
  const out = [];
  for (const id of Object.keys(ws.hyps)) {
    const st = hypStatus(ws, id);
    const ideas = activeIdeasOf(ws, id);
    if (!ideas.length) continue;
    if (['testing', 'pending_review', 'closed', 'narrow'].includes(st)) continue;
    const h = ws.hyps[id];
    const frozen = nodesOf(ws, id).some((n) => n.frozen && ideas.includes(n.idea));
    if (frozen) continue;
    const queued = Object.values(ws.experiments).some((e) => e.hyp === id && e.status === 'queued');
    const depsOk = (h.depends || []).every((d) => ['self_verified'].includes(hypStatus(ws, d)));
    if (!depsOk) continue;
    if (st === 'self_verified' && !h.rerun && !h.needsDecompose) continue;
    // runnable means a leaf in at least one idea that uses it: a claim with
    // children is settled by its children, not by an experiment of its own
    const leafSomewhere = ideas.some((i) => { const r = roleIn(ws, i, id); return r && (r.leaf || h.needsDecompose); });
    if (!leafSomewhere) continue;
    out.push({ id, ideas, status: st, score: score(ws, id), queued, needsDecompose: h.needsDecompose, rerun: h.rerun, claim: h.claim });
  }
  return out.sort((a, c) => c.ideas.length - a.ideas.length || a.id.localeCompare(c.id));
}

export function pendingVerdicts(ws) {
  return Object.values(ws.hyps).filter((h) => h.status === 'pending_review').map((h) => {
    const ideas = activeIdeasOf(ws, h.id);
    const down = ideas.flatMap((i) => downstream(ws, i, h.id)).length;
    return { id: h.id, claim: h.claim, score: score(ws, h.id), ideas, downstream: down, pivots: h.pivots, at: h.submittedAt || null };
  }).sort((a, c) => c.ideas.length - a.ideas.length);
}

export function downstream(ws, idea, hyp) {
  const nodes = ws.trees[idea] || [];
  const start = nodes.find((n) => n.hyp === hyp);
  if (!start) return [];
  const out = [], stack = [start.k];
  while (stack.length) {
    const k = stack.pop();
    for (const c of nodes.filter((n) => n.parent === k)) { out.push(c); stack.push(c.k); }
  }
  return out;
}

// What happens in each idea if `hyp` is judged to not hold.
export function impact(ws, hyp) {
  return activeIdeasOf(ws, hyp).map((idea) => {
    const r = roleIn(ws, idea, hyp);
    const down = downstream(ws, idea, hyp);
    const all = (ws.trees[idea] || []).length;
    const independent = ws.hyps[hyp].evidence.some((e) => e.idea === idea && e.delta > 0);
    let kind = 'branch', frozen = down.length;
    if (r.kind === 'root') { kind = 'global'; frozen = all; }
    else if (independent && r.leaf) { kind = 'local'; frozen = 0; }
    return { idea, role: r, kind, frozen, chain: [hyp, ...down.map((d) => d.hyp)].slice(0, 4), rewrite: kind === 'global' ? 1 : 0 };
  });
}

// ---------------------------------------------------------------- counters for chrome/nav
export function counts(ws) {
  const exps = Object.values(ws.experiments);
  return {
    library: ws.survey.library,
    sparks: ws.sparks.items.length,
    ideas: ws.ideas.filter((i) => i.status !== 'parked').length,
    ideasRunning: ws.ideas.filter((i) => i.status === 'running').length,
    hyps: Object.keys(ws.hyps).length,
    shared: Object.keys(ws.hyps).filter((h) => activeIdeasOf(ws, h).length > 1).length,
    running: exps.filter((e) => e.status === 'running').length,
    queued: exps.filter((e) => e.status === 'queued').length,
    failed: ws.runs.filter((r) => r.status === 'failed').length,
    pending: pendingVerdicts(ws).length,
    frontier: frontier(ws).length,
    decisions: pendingVerdicts(ws).filter((v) => !ws.snoozed['v:' + v.id]).length + (ws.figures.fig3.measured !== 18.4 && !ws.decisions.fig3 && !ws.snoozed['fig3'] ? 1 : 0),
    claims: ws.claims.items.length + ws.claims.collapsed,
    overclaims: ws.claims.items.filter((c) => c.status === 'overclaim').length,
    insufficient: ws.claims.items.filter((c) => c.status === 'insufficient').length,
  };
}

// ---------------------------------------------------------------- the clock
// Advances running experiments, finishes them, opens queued ones into free slots,
// and writes the resulting evidence + events. Called before every read.
export function tick(ws, now = Date.now()) {
  // Only the demo has a simulated clock. On a real project the executor owns
  // experiment progress and experiments.jsonl is the truth, so nothing here
  // may invent a finish, a start or a piece of evidence.
  if (ws.mode === 'project') { ws.lastTick = now; return ws; }
  if (now <= ws.lastTick) return ws;
  ws.lastTick = now;
  // Replay the clock event by event, so coming back after an hour away
  // drains the queue exactly as it would have drained while watching.
  for (let guard = 0; guard < 200; guard++) {
    const running = Object.values(ws.experiments).filter((x) => x.status === 'running');
    const due = running.filter((e) => e.startedAt + e.durMs <= now).sort((a, c) => (a.startedAt + a.durMs) - (c.startedAt + c.durMs));
    if (due.length) {
      const e = due[0];
      finishExperiment(ws, e, e.startedAt + e.durMs);
      fillSlots(ws, e.startedAt + e.durMs);
      continue;
    }
    for (const e of running) e.prog = clamp((now - e.startedAt) / e.durMs, 0, 1);
    if (!fillSlots(ws, now)) break;
  }
  if (ws.survey.job && now >= ws.survey.job.endsAt) finishSurvey(ws, now);
  return ws;
}

// Starts queued experiments on free slots; returns true when anything started.
function fillSlots(ws, at) {
  const all = Object.values(ws.experiments);
  const running = all.filter((x) => x.status === 'running');
  let free = ws.settings.parallel - running.length;
  if (free <= 0) return false;
  const usedGpu = new Set(running.map((x) => x.gpu));
  const queue = all.filter((x) => x.status === 'queued').sort((a, c) => (a.queuedAt || 0) - (c.queuedAt || 0));
  let started = false;
  for (const e of queue) {
    if (free <= 0) break;
    let g = 0; while (usedGpu.has(g) && g < ws.settings.gpus) g++;
    usedGpu.add(g);
    e.status = 'running'; e.gpu = g; e.startedAt = at; e.prog = 0; free--; started = true;
    pushEvent(ws, 'executor', b(`${e.id} 开始运行 · ${e.hyp}`, `${e.id} started · ${e.hyp}`), b('槽位空出后自动开跑', 'Auto-started when a slot freed'), 'experiment', at, { hyp: e.hyp, exp: e.id });
  }
  return started;
}

export function finishExperiment(ws, e, now) {
  e.status = 'done'; e.prog = 1; e.finishedAt = now;
  const h = ws.hyps[e.hyp];
  const delta = e.outcome.delta;
  if (h) {
    h.evidence.push({ exp: e.id, idea: e.idea, delta, note: e.label, at: now });
    h.rerun = false;
    if (score(ws, e.hyp) >= 1.0 && h.status !== 'pending_review') h.status = 'self_verified';
    if (delta < 0) { h.pivots = (h.pivots || 0) + 1; h.decisions.push({ kind: 'PIVOT', at: now }); }
    else h.decisions.push({ kind: 'PROCEED', at: now });
    maybeEscalate(ws, e.hyp, now);
  }
  ws.runs.unshift({ id: 'run_' + ws.seq.run++, gpu: e.gpu || 0, start: e.startedAt, dur: (e.hours || 3) * HOUR, idea: e.idea, label: e.label, status: 'done', cost: e.cost || 0 });
  ws.spendByIdea[e.idea] = Math.round(((ws.spendByIdea[e.idea] || 0) + (e.hours || 3)) * 10) / 10;
  ws.settings.gpuUsed = Math.round((ws.settings.gpuUsed + (e.hours || 3)) * 10) / 10;
  const etree = e.node ? (ws.exptree[e.idea] || Object.values(ws.exptree)[0]) : null;
  if (etree) {
    const n = etree.nodes.find((x) => x.id === e.node);
    if (n) { n.status = 'success'; n.score = Math.round((0.7 + delta / 10) * 100) / 100; }
  }
  // paper gaps that were waiting on this experiment
  for (const g of ws.paper.gaps) if (g.exp === e.id) g.done = true;
  for (const f of ws.figures.items) if (f.src === e.id && f.status === 'waiting') { f.status = 'done'; f.ver = 'v1'; }
  for (const k of ws.rebuttal.checklist) if (k.auto === 'fig4' && ws.figures.items[3].status === 'done') k.done = true;
  for (const c of ws.rebuttal.comments) if (c.exp === e.id) c.status = 'done';
  for (const c of ws.claims.items) if (c.ev.includes(e.id) && c.status === 'insufficient' && delta > 0) { c.status = 'supported'; delete c.why; }
  pushEvent(ws, 'executor', b(`${e.id} 完成 · ${e.hyp} 证据 ${delta > 0 ? '+' : ''}${delta}`, `${e.id} done · ${e.hyp} evidence ${delta > 0 ? '+' : ''}${delta}`),
    b(`同步更新 ${activeIdeasOf(ws, e.hyp).join(' ') || e.idea}`, `Updated ${activeIdeasOf(ws, e.hyp).join(' ') || e.idea} together`), 'experiment', now, { hyp: e.hyp, exp: e.id });
}

export function maybeEscalate(ws, hyp, now) {
  const h = ws.hyps[hyp];
  if (!h || h.status === 'pending_review' || h.status === 'closed' || h.status === 'narrow') return false;
  const s = score(ws, hyp);
  const recent = h.decisions.slice(-3);
  const threePivots = recent.length === 3 && recent.every((d) => d.kind === 'PIVOT');
  if (s <= -1.0 || threePivots) {
    h.status = 'pending_review'; h.submittedAt = now;
    pushEvent(ws, 'reviewer', b(`${hyp} 提交裁定`, `${hyp} submitted for verdict`),
      threePivots ? b('连续 3 次 PIVOT 无改善', '3 consecutive PIVOTs, no improvement') : b(`累积证据 ${s}，低于 −1.0`, `Cumulative evidence ${s}, below −1.0`), 'verdict', now, { hyp });
    // executor stops expanding: freeze the queue entries on this hypothesis
    for (const e of Object.values(ws.experiments)) if (e.hyp === hyp && e.status === 'queued') { e.status = 'withdrawn'; e.withdrawnAt = now; }
    return true;
  }
  return false;
}

export function pushEvent(ws, mod, title, detail, kind, now = Date.now(), extra = {}) {
  const ev = { id: ++ws.seq.event + 1000, t: now, mod, title, detail, kind, ...extra };
  ws.events.unshift(ev);
  if (mod === 'human') source.persist(ws, { kind: 'event', event: ev });
  if (ws.events.length > 300) ws.events.length = 300;
  ws.updatedAt = now;
}

function finishSurvey(ws, now) {
  const j = ws.survey.job;
  ws.survey.job = null;
  ws.survey.lastRun = now;
  ws.survey.library += j.records;
  ws.survey.thisRound = j.records;
  ws.survey.records = j.records;
  ws.survey.fulltext = j.digests;
  for (const v of ws.survey.venues) if (v.status === 'ok') v.delta = Math.max(1, Math.round(v.delta * (0.6 + Math.random() * 0.8)));
  pushEvent(ws, 'surveyor', b(`采集完成 · ${j.records} 题录 / ${j.digests} digest`, `Collection done · ${j.records} records / ${j.digests} digests`),
    b('预算到顶，游标已写回；TDSC 入口仍然失效', 'Budget reached, cursors written back; the TDSC entry is still broken'), 'collect', now);
}

// ---------------------------------------------------------------- verdict application
export const VERDICTS = ['close', 'return_active', 'narrow_scope', 'downgrade'];
export function applyVerdict(ws, hyp, verdict, now = Date.now(), reviewer = 'claude', scope = null) {
  const h = ws.hyps[hyp];
  if (!h) return { ok: false, error: 'unknown hypothesis' };
  const before = impact(ws, hyp);
  const affected = activeIdeasOf(ws, hyp);
  h.status = verdict === 'close' ? 'closed' : verdict === 'narrow_scope' ? 'self_verified' : verdict === 'downgrade' ? 'untested' : 'active';
  h.pivots = 0; h.decisions = [];
  h.narrow = verdict === 'narrow_scope' ? b('适用范围已收窄', 'Scope narrowed') : null;
  if (verdict === 'narrow_scope') h.evidence = h.evidence.filter((e) => e.delta > 0);
  if (verdict === 'return_active') h.evidence.push({ exp: 'verdict', idea: affected[0] || '', delta: 0.5, note: b('裁定退回 active，附新方向', 'Returned to active with a new direction'), at: now });
  let frozen = 0, reopened = 0;
  for (const idea of affected) {
    const r = roleIn(ws, idea, hyp);
    const down = downstream(ws, idea, hyp);
    const independent = h.evidence.some((e) => e.idea === idea && e.delta > 0);
    if (verdict === 'close') {
      if (r.kind === 'root') { for (const n of ws.trees[idea]) { n.frozen = true; frozen++; } }
      else if (!(independent && r.leaf)) { for (const n of down) { n.frozen = true; frozen++; } }
    } else {
      for (const n of ws.trees[idea]) if (n.frozen) { n.frozen = false; reopened++; }
    }
  }
  // withdraw experiments on frozen hypotheses; requeue for reopened ones
  let withdrawn = 0;
  for (const e of Object.values(ws.experiments)) {
    if (e.status !== 'queued') continue;
    const frozenNow = nodesOf(ws, e.hyp).some((n) => n.frozen);
    if (frozenNow) { e.status = 'withdrawn'; e.withdrawnAt = now; withdrawn++; }
  }
  if (verdict !== 'close') for (const e of Object.values(ws.experiments)) if (e.status === 'withdrawn' && !nodesOf(ws, e.hyp).some((n) => n.frozen)) { e.status = 'queued'; e.queuedAt = now; }
  // sections that quote this hypothesis get flagged
  for (const s of ws.paper.sections) if (s.hyps.includes(hyp)) s.stale = verdict !== 'return_active';
  ws.verdicts[hyp] = { hyp, verdict, scope: verdict === 'narrow_scope' ? (scope || 'narrowed') : null, affected_ideas: affected, next_action: verdict === 'close' ? 'freeze' : 'reopen', reviewer, at: now };
  source.persist(ws, { kind: 'verdict', verdict: ws.verdicts[hyp] });
  ws.verdictHistory.unshift({ hyp, verdict, idea: affected[0] || '', at: now });
  pushEvent(ws, 'human', b(`${hyp} 裁定 · ${VERDICT_ZH[verdict]}`, `${hyp} verdict · ${VERDICT_EN[verdict]}`),
    b(`影响 ${affected.join(' ') || '—'} · 冻结 ${frozen} · 撤下 ${withdrawn}`, `Affects ${affected.join(' ') || '—'} · froze ${frozen} · withdrew ${withdrawn}`), 'verdict', now, { hyp });
  ws.lastHuman = now;
  return { ok: true, frozen, reopened, withdrawn, before, verdict: ws.verdicts[hyp] };
}
export const VERDICT_ZH = { close: '判定不成立并关闭', return_active: '退回 active', narrow_scope: '改写 claim 后重开', downgrade: '降级为借用前提' };
export const VERDICT_EN = { close: 'Does not hold — close', return_active: 'Return to active', narrow_scope: 'Rewrite the claim and reopen', downgrade: 'Downgrade to borrowed premise' };

// reviewer's own recommendation, derived from the evidence split
export function reviewerAdvice(ws, hyp) {
  const h = ws.hyps[hyp];
  const pos = h.evidence.filter((e) => e.delta > 0), neg = h.evidence.filter((e) => e.delta < 0);
  const roots = activeIdeasOf(ws, hyp).filter((i) => roleIn(ws, hyp ? i : i, hyp)?.kind === 'root');
  if (pos.length && neg.length) return { action: 'narrow_scope', why: b(
    `三次 PIVOT 都在换估计方式，没有换测量口径。${pos.map((e) => e.exp).join(' 与 ')} 显示断言在局部成立，建议改写 claim 缩小适用范围，而不是整体关闭${roots.length ? ` —— 否则 ${roots.join(' ')} 整棵树要重开` : ''}。`,
    `Every PIVOT changed the estimator, none changed the measurement. ${pos.map((e) => e.exp).join(' and ')} show the claim holds locally, so narrow the claim rather than closing it${roots.length ? ` — otherwise the whole ${roots.join(' ')} tree reopens` : ''}.`) };
  if (!pos.length && neg.length >= 3) return { action: 'close', why: b('全部证据为负，且没有局部成立的迹象。', 'All evidence is negative with no sign of local validity.') };
  return { action: 'return_active', why: b('证据不足以判定，附新方向后重回 frontier。', 'Evidence is not decisive; return it to the frontier with a new direction.') };
}
