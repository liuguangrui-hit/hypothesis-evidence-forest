// One builder per screen. The client renders whatever it gets; all logic lives here.
import { b } from './seed.js';
import * as E from './engine.js';

const HOUR = 3600000, MIN = 60000;
const hyp = (ws, id) => ({ id, claim: ws.hyps[id].claim, status: E.hypStatus(ws, id), score: E.score(ws, id), ideas: E.activeIdeasOf(ws, id) });

export function shell(ws) {
  return {
    counts: E.counts(ws), agents: ws.agents, settings: ws.settings,
    source: { mode: ws.mode || 'demo', readonly: !!ws.readonly, problems: (ws.problems || []).length },
    ideas: ws.ideas.map((i) => ({ ...i, running: i.status === 'running' })),
    now: Date.now(), createdAt: ws.createdAt,
  };
}

export function home(ws) {
  const c = E.counts(ws);
  const exps = Object.values(ws.experiments);
  const done24 = ws.runs.filter((r) => Date.now() - r.start < 24 * HOUR);
  const failed24 = done24.filter((r) => r.status === 'failed').length;
  const shared = Object.keys(ws.hyps).filter((h) => E.activeIdeasOf(ws, h).length > 1)
    .map((h) => ({ ...hyp(ws, h), places: E.activeIdeasOf(ws, h).map((i) => ({ idea: i, role: E.roleIn(ws, i, h) })) }))
    .sort((a, x) => x.ideas.length - a.ideas.length || (a.status === 'pending_review' ? -1 : 1));
  const star = shared.find((s) => s.status === 'pending_review') || shared[0];
  const decisions = [];
  for (const v of E.pendingVerdicts(ws)) {
    if (ws.snoozed['v:' + v.id]) continue;
    const imp = E.impact(ws, v.id);
    decisions.push({
      kind: 'verdict', id: v.id, title: v.claim, badge: v.ideas[0] || '',
      why: b(`${v.ideas.length} 个 idea 引用；${imp.map((i) => i.kind === 'global' ? `是 ${i.idea} 的根前提` : i.kind === 'local' ? `在 ${i.idea} 已有独立证据` : `${i.idea} 下游 ${i.frozen} 个节点`).join('，')}。`,
        `Referenced by ${v.ideas.length} idea(s); ${imp.map((i) => i.kind === 'global' ? `root premise of ${i.idea}` : i.kind === 'local' ? `independently evidenced in ${i.idea}` : `${i.frozen} downstream nodes in ${i.idea}`).join(', ')}.`),
      go: '/review?h=' + v.id, cta: b('去裁定', 'Rule on it'),
    });
  }
  const f3 = ws.figures.fig3;
  if (ws.figures.items.length && f3.measured && f3.measured !== 18.4 && !ws.decisions.fig3 && !ws.snoozed.fig3) decisions.push({
    kind: 'figure', id: 'fig3', title: b(`图 3　正文 18.4%，实测 ${f3.measured}%`, `Figure 3 — text says 18.4%, measured ${f3.measured}%`), badge: '',
    why: b(`图从 run_2291 重画后数字变了，正文 4.2 节那句话还是旧值。`, 'The figure was redrawn from run_2291 and the number changed; the sentence in §4.2 still has the old value.'),
    go: '/figures', cta: b('去修正', 'Fix it'),
  });
  return {
    time: Date.now(), unattendedMs: Date.now() - (ws.lastHuman || ws.createdAt),
    pipeline: [
      { k: 'library', n: c.library, unit: b('篇', 'papers'), sub: b(`本期 +${ws.survey.thisRound}`, `+${ws.survey.thisRound} this period`), go: '/survey', label: b('文献库', 'Library') },
      { k: 'sparks', n: c.sparks, unit: b('条', ''), sub: b('本期新增', 'new this period'), go: '/sparks', label: b('idea spark', 'idea spark') },
      { k: 'ideas', n: c.ideas, unit: b('个', ''), sub: b(`${c.ideasRunning} 个进行中`, `${c.ideasRunning} in progress`), go: '/ideas', label: 'idea' },
      { k: 'hyps', n: c.hyps, unit: b('条', ''), sub: b(`${c.shared} 条被共享`, `${c.shared} shared`), go: '/panorama', label: b('假设', 'hypotheses') },
      { k: 'exp', n: c.running, unit: b('在跑', 'running'), sub: b(`排队 ${c.queued}`, `${c.queued} queued`), go: '/experiments', label: b('实验', 'experiments') },
      { k: 'verdict', n: c.pending, unit: b('待定', 'pending'), sub: b('等你裁定', 'waiting on you'), go: '/review', label: b('裁定', 'verdicts'), warn: c.pending > 0 },
      { k: 'paper', n: 1, unit: b('篇在写', 'in writing'), sub: b(`${c.claims} 条主张`, `${c.claims} claims`), go: '/paper', label: b('论文', 'paper') },
    ],
    star, decisions,
    last24: last24(ws),
    agents: [
      { id: 'surveyor', model: ws.agents.surveyor, state: ws.survey.job ? b('采集中', 'collecting') : b('空闲', 'idle'), line: b(`上一轮 ${fmt(ws.survey.lastRun)} 完成 · 下一轮 ${ws.survey.nextInDays} 天后`, `Last round finished ${fmt(ws.survey.lastRun)} · next in ${ws.survey.nextInDays} days`), go: '/survey' },
      { id: 'executor', model: ws.agents.executor, state: b(`并行运行 ${c.running} 个实验`, `${c.running} experiments in parallel`), line: b(`${exps.filter((e) => e.status === 'running').map((e) => e.id).join(' ')} · 槽位 ${c.running}/${ws.settings.parallel} 占用，排队 ${c.queued}`, `${exps.filter((e) => e.status === 'running').map((e) => e.id).join(' ')} · slots ${c.running}/${ws.settings.parallel}, ${c.queued} queued`), go: '/experiments' },
      { id: 'reviewer', model: ws.agents.reviewer, state: b(`${c.pending} 项待裁定`, `${c.pending} awaiting verdict`), line: b('只写 verdicts/，不碰 tree.json 的状态', 'Writes only verdicts/, never touches state in tree.json'), go: '/review' },
    ],
    budget: { used: ws.settings.gpuUsed, total: ws.settings.budget },
  };
}
const fmt = (t) => new Date(t).toISOString().slice(5, 16).replace('T', ' ');

// What the system did on its own, read back out of the event stream.
const GROUPS = [
  ['collect', b('采集', 'Collection'), ['collect']],
  ['exp', b('实验', 'Experiments'), ['experiment']],
  ['hyp', b('假设与裁定', 'Hypotheses & verdicts'), ['hypothesis', 'verdict']],
  ['idea', b('立项', 'Intake'), ['idea']],
  ['write', b('写作', 'Writing'), ['paper']],
];
function last24(ws) {
  const since = Date.now() - 24 * HOUR;
  const recent = ws.events.filter((e) => e.t >= since);
  const out = [];
  for (const [k, label, kinds] of GROUPS) {
    const mine = recent.filter((e) => kinds.includes(e.kind));
    if (!mine.length) continue;
    const head = mine[0];
    out.push({ k, label, head: head.title, body: mine.length > 1
      ? b(`${t(head.detail, 'zh')}（这段时间共 ${mine.length} 条）`, `${t(head.detail, 'en')} (${mine.length} entries in this window)`)
      : head.detail });
  }
  return out;
}
const t = (v, lang) => (v && typeof v === 'object' ? (v[lang] || '') : String(v || ''));

export function main(ws) {
  const c = E.counts(ws);
  const fr = E.frontier(ws).map((f) => ({ ...f, claim: ws.hyps[f.id].claim }));
  const exps = Object.values(ws.experiments);
  const running = exps.filter((e) => e.status === 'running').map((e) => expBrief(ws, e));
  const queued = exps.filter((e) => e.status === 'queued').map((e) => expBrief(ws, e));
  const evPerIdea = () => {
    const done = exps.filter((e) => e.status === 'done');
    if (!done.length) return 1;
    return Math.round(done.reduce((s, e) => s + Math.max(1, E.activeIdeasOf(ws, e.hyp).length), 0) / done.length * 10) / 10;
  };
  return {
    stats: { parallel: ws.ideas.filter((i) => i.status === 'running').length, candidates: ws.ideas.filter((i) => i.status === 'candidate').length, frontier: fr.length, running: c.running, pending: c.pending, perExp: evPerIdea() },
    frontier: fr, running, queued, slots: ws.settings.parallel,
    pending: E.pendingVerdicts(ws).map((v) => ({ ...v, impact: E.impact(ws, v.id) })),
    events: ws.events.slice(0, 14),
  };
}
function expBrief(ws, e) {
  return { id: e.id, hyp: e.hyp, claim: ws.hyps[e.hyp]?.claim, ideas: E.activeIdeasOf(ws, e.hyp), status: e.status, prog: e.prog, label: e.label,
    etaMs: e.status === 'running' ? Math.max(0, e.startedAt + e.durMs - Date.now()) : null, idea: e.idea };
}

export function survey(ws) {
  return { ...ws.survey, job: ws.survey.job ? { ...ws.survey.job, remainMs: Math.max(0, ws.survey.job.endsAt - Date.now()) } : null, paperIds: Object.keys(ws.papers) };
}
export function trends(ws) { return { gaps: ws.trendGaps, sparks: ws.sparks.items.map((s) => ({ id: s.id, gap: s.gap })) }; }
export function sparks(ws) {
  return { ...ws.sparks, items: ws.sparks.items.map((s) => ({ ...s, ideaOf: s.developedAs || null })) };
}
export function digest(ws, id) {
  const all = Object.values(ws.papers);
  const p = ws.papers[id] || all[0];
  if (!p) return { paper: null, cited: [], all: [] };
  const cited = ws.sparks.items.filter((s) => s.papers.includes(p.id)).map((s) => ({ id: s.id, status: s.status, ask: s.ask }));
  return { paper: p, cited, all: Object.values(ws.papers).map((x) => ({ id: x.id, title: x.title, venue: x.venue, level: x.level })) };
}

export function ideas(ws) {
  const lab = ws.ideaLab;
  if (!lab.cands.length) return {
    empty: true, lit: lab.lit, cand: null, cur: 0, total: 0, launched: lab.launched,
    counts: { candidates: ws.ideas.filter((i) => i.status === 'candidate').length, running: ws.ideas.filter((i) => i.status === 'running').length, done: ws.ideas.filter((i) => i.status === 'done').length },
    extracted: Object.keys(ws.hyps).length, sharedCount: E.counts(ws).shared, sparksAvailable: ws.sparks.items.filter((x) => x.status === 'available').length,
  };
  const cand = lab.cands[lab.cur % lab.cands.length];
  const plan = cand.plan.map((p) => p.hyp ? { ...p, ...hyp(ws, p.hyp), verified: E.hypStatus(ws, p.hyp) === 'self_verified' } : p);
  const reuse = plan.filter((p) => p.mode === 'reuse').length;
  const overlaps = ws.ideas.filter((i) => i.status === 'running').map((i) => {
    const mine = new Set(plan.filter((p) => p.hyp).map((p) => p.hyp));
    const theirs = (ws.trees[i.id] || []).map((n) => n.hyp);
    const sh = theirs.filter((h) => mine.has(h));
    return { idea: i.id, name: i.name, shared: sh, of: plan.length };
  });
  return {
    lit: lab.lit, cand: { ...cand, plan }, cur: lab.cur, total: lab.cands.length, launched: lab.launched,
    counts: { candidates: ws.ideas.filter((i) => i.status === 'candidate').length, running: ws.ideas.filter((i) => i.status === 'running').length, done: ws.ideas.filter((i) => i.status === 'done').length },
    novelty: 0.74, feasibility: 0.86, overlap: Math.round((reuse / plan.length) * 100) / 100,
    reuse, fresh: plan.length - reuse, overlaps, cost: plan.length - reuse, costNoReuse: plan.length,
    extracted: Object.keys(ws.hyps).length, sharedCount: E.counts(ws).shared,
    sparksAvailable: ws.sparks.items.filter((s) => s.status === 'available').length,
  };
}

// panorama: force-free deterministic layout, clustered per idea
export function panorama(ws, focus) {
  // Clusters sit on an ellipse, running projects pushed outward a little further
  // so the shared hypotheses that get pulled to the middle have room to breathe.
  const live = ws.ideas.slice().sort((a, c) => (a.status === 'running' ? -1 : 1) - (c.status === 'running' ? -1 : 1));
  const centers = {};
  // a three-idea project should not be spread as wide as a twenty-idea one
  const R = Math.max(210, Math.min(430, 120 + live.length * 46));
  live.forEach((i, n) => {
    const a = (n / live.length) * Math.PI * 2 - Math.PI / 2;
    const k = i.status === 'running' ? 1 : 1.16;
    centers[i.id] = { x: 620 + Math.cos(a) * R * k, y: 470 + Math.sin(a) * R * 0.82 * k };
  });
  const nodes = [], seen = new Map();
  for (const idea of Object.keys(ws.trees)) {
    const list = ws.trees[idea];
    list.forEach((n, i) => {
      const ideasAll = E.activeIdeasOf(ws, n.hyp);
      const key = n.hyp;
      if (seen.has(key)) { seen.get(key).ideas = [...new Set([...seen.get(key).ideas, idea])]; return; }
      const c = centers[idea] || { x: 500, y: 380 };
      const ang = (i / Math.max(4, list.length)) * Math.PI * 2 + idea.charCodeAt(4) * 0.7;
      const rad = 62 + (i % 3) * 30 + (ideasAll.length > 1 ? -26 : 0);
      const node = {
        id: n.hyp, x: Math.round(c.x + Math.cos(ang) * rad), y: Math.round(c.y + Math.sin(ang) * rad * 0.9),
        idea, ideas: ideasAll.length ? ideasAll : [idea], status: E.hypStatus(ws, n.hyp), score: E.score(ws, n.hyp),
        frozen: n.frozen, root: !n.parent, claim: ws.hyps[n.hyp].claim, induced: ws.hyps[n.hyp].induced,
      };
      seen.set(key, node); nodes.push(node);
    });
  }
  // pull shared nodes toward the centroid of the ideas that use them
  for (const n of nodes) if (n.ideas.length > 1) {
    const cs = n.ideas.map((i) => centers[i]).filter(Boolean);
    n.x = Math.round(cs.reduce((s, c) => s + c.x, 0) / cs.length);
    n.y = Math.round(cs.reduce((s, c) => s + c.y, 0) / cs.length);
  }
  const edges = [];
  for (const [idea, list] of Object.entries(ws.trees)) for (const n of list) if (n.parent) {
    const p = list.find((x) => x.k === n.parent);
    if (p && seen.has(p.hyp) && seen.has(n.hyp) && p.hyp !== n.hyp) edges.push({ a: p.hyp, b: n.hyp, kind: 'tree', idea });
  }
  for (const [a, c] of ws.crossDeps) if (seen.has(a) && seen.has(c)) edges.push({ a, b: c, kind: 'cross' });
  for (const h of Object.values(ws.hyps)) if (h.induced) for (const src of ['H-11', 'H-28']) if (seen.has(src)) edges.push({ a: src, b: h.id, kind: 'induced' });
  const byStatus = {};
  for (const n of nodes) byStatus[n.status] = (byStatus[n.status] || 0) + 1;
  const sel = focus && ws.hyps[focus] ? detail(ws, focus) : null;
  const pad = 110; // room for the cluster rings and their labels
  if (!nodes.length) return { nodes: [], edges: [], centers, bounds: { x: 0, y: 0, w: 800, h: 600 }, ideas: ws.ideas, byStatus: {},
    counts: { hyps: 0, edges: 0, shared: 0, ideas: ws.ideas.length }, sel: null, events: ws.events.slice(0, 6), empty: true };
  const bounds = {
    x: Math.min(...nodes.map((n) => n.x)) - pad, y: Math.min(...nodes.map((n) => n.y)) - pad,
    w: Math.max(...nodes.map((n) => n.x)) - Math.min(...nodes.map((n) => n.x)) + pad * 2,
    h: Math.max(...nodes.map((n) => n.y)) - Math.min(...nodes.map((n) => n.y)) + pad * 2,
  };
  return { nodes, edges, centers, bounds, ideas: ws.ideas, byStatus, counts: { hyps: nodes.length, edges: edges.length, shared: nodes.filter((n) => n.ideas.length > 1).length, ideas: ws.ideas.length }, sel, events: ws.events.slice(0, 6) };
}

export function detail(ws, id) {
  const h = ws.hyps[id];
  if (!h) return null;
  const ideas = E.activeIdeasOf(ws, id);
  return {
    id, claim: h.claim, warrant: h.warrant, status: E.hypStatus(ws, id), score: E.score(ws, id), induced: h.induced, needsDecompose: h.needsDecompose, narrow: h.narrow || null,
    ideas: ideas.map((i) => ({ idea: i, name: ws.ideas.find((x) => x.id === i)?.name, role: E.roleIn(ws, i, id) })),
    evidence: h.evidence, decisions: h.decisions, depends: (h.depends || []).map((d) => ({ id: d, status: E.hypStatus(ws, d), claim: ws.hyps[d]?.claim })),
    downstream: ideas.flatMap((i) => E.downstream(ws, i, id).map((n) => ({ idea: i, ...n, claim: ws.hyps[n.hyp]?.claim }))),
    running: Object.values(ws.experiments).filter((e) => e.hyp === id && e.status !== 'done').map((e) => ({ id: e.id, status: e.status, prog: e.prog })),
    verdict: ws.verdicts[id] || null,
  };
}

export function graph(ws, focus) {
  const shared = Object.keys(ws.hyps).filter((h) => E.activeIdeasOf(ws, h).length > 1);
  const list = shared.map((h) => ({ ...hyp(ws, h), places: E.activeIdeasOf(ws, h).map((i) => ({ idea: i, role: E.roleIn(ws, i, h) })) }));
  const sel = focus && ws.hyps[focus] ? detail(ws, focus) : (list[0] ? detail(ws, list[0].id) : null);
  const done = Object.values(ws.experiments).filter((e) => e.status === 'done');
  const perExp = done.length ? Math.round(done.reduce((s, e) => s + Math.max(1, E.activeIdeasOf(ws, e.hyp).length), 0) / done.length * 10) / 10 : 1;
  return { list, sel, perExp, ideas: ws.ideas.filter((i) => i.status === 'running') };
}

export function tree(ws, idea, focus) {
  idea = ws.trees[idea] ? idea : (ws.ideas.find((i) => i.status === 'running' && ws.trees[i.id])?.id || Object.keys(ws.trees)[0] || null);
  if (!idea) return { idea: null, ideas: [], nodes: [], sel: null, empty: true };
  const nodes = (ws.trees[idea] || []).map((n) => ({
    ...n, claim: ws.hyps[n.hyp].claim, status: E.hypStatus(ws, n.hyp), score: E.score(ws, n.hyp),
    refs: E.activeIdeasOf(ws, n.hyp).length, depth: E.depth(ws, idea, n.k), leaf: E.childrenOf(ws, idea, n.k).length === 0,
  })).sort((a, c) => a.k.localeCompare(c.k, undefined, { numeric: true }));
  const selId = focus && nodes.some((n) => n.hyp === focus) ? focus : (nodes.find((n) => E.hypStatus(ws, n.hyp) === 'pending_review') || nodes[0])?.hyp;
  return { idea, ideas: ws.ideas.filter((i) => ws.trees[i.id]), nodes, sel: selId ? { ...detail(ws, selId), node: nodes.find((n) => n.hyp === selId) } : null };
}

export function experiments(ws, focus) {
  const all = Object.values(ws.experiments);
  if (!all.length) return { empty: true, list: [], sel: null, counts: { running: 0, queued: 0, done: 0 }, slots: ws.settings.parallel, gpus: ws.settings.gpus };
  const live = all.filter((e) => e.status !== 'done' && e.status !== 'withdrawn');
  const selId = focus && ws.experiments[focus] ? focus : (live.find((e) => e.status === 'running') || all[all.length - 1]).id;
  const e = ws.experiments[selId];
  const streamLines = stream(ws, e);
  const h = ws.hyps[e.hyp];
  return {
    list: all.filter((x) => x.status !== 'withdrawn').sort((a, c) => order(a) - order(c)).slice(0, 14).map((x) => ({ ...expBrief(ws, x), delta: x.status === 'done' ? x.outcome.delta : null, finishedAt: x.finishedAt })),
    sel: { ...e, claim: h?.claim, ideas: E.activeIdeasOf(ws, e.hyp), etaMs: e.status === 'running' ? Math.max(0, e.startedAt + e.durMs - Date.now()) : null,
      stream: streamLines, table: sweepTable(ws, e), hypScore: E.score(ws, e.hyp), hypStatus: E.hypStatus(ws, e.hyp),
      prior: (h?.evidence || []).map((x) => ({ exp: x.exp, idea: x.idea, delta: x.delta, note: x.note })),
      places: E.activeIdeasOf(ws, e.hyp).map((i) => ({ idea: i, role: E.roleIn(ws, i, e.hyp) })), pivots: h?.pivots || 0 },
    counts: { running: all.filter((x) => x.status === 'running').length, queued: all.filter((x) => x.status === 'queued').length, done: all.filter((x) => x.status === 'done').length },
    slots: ws.settings.parallel, gpus: ws.settings.gpus,
  };
}
const order = (e) => ({ running: 0, queued: 1, done: 2, withdrawn: 3 }[e.status] ?? 4);

function stream(ws, e) {
  if (e.status === 'queued') return [];
  const t0 = e.startedAt || Date.now();
  const p = e.prog;
  const rows = [];
  const bs = [32, 64, 128, 512, 1024, 2048];
  const noise = [4.21, 3.02, 2.06, 1.04, 0.74, null], eff = [0.38, 0.47, 0.61, 0.83, 0.91, null];
  const steps = Math.floor(p * 7);
  for (let i = 0; i < Math.min(steps, 5); i++) rows.push({ t: t0 + i * (e.durMs / 7), text: `batch=${String(bs[i]).padEnd(4)} noise_scale=${String(noise[i]).padEnd(5)} eff_step=${eff[i]}` });
  if (steps >= 4) rows.push({ t: t0 + 4.4 * (e.durMs / 7), text: `fit  noise_scale ∝ batch^-0.49  R²=0.981` });
  if (steps >= 5) rows.push({ t: t0 + 4.6 * (e.durMs / 7), text: `断言方向与 ${e.hyp} 一致，等待 batch=2048 收尾`, en: `direction matches ${e.hyp}; waiting on batch=2048` });
  if (e.status === 'running') rows.push({ t: Date.now(), text: `batch=${bs[Math.min(5, steps)]} 运行中 · step ${Math.round(p * 40)}k / 40k`, en: `batch=${bs[Math.min(5, steps)]} running · step ${Math.round(p * 40)}k / 40k`, live: true });
  if (e.status === 'done') rows.push({ t: e.finishedAt, text: `done · evidence ${e.outcome.delta > 0 ? '+' : ''}${e.outcome.delta}`, live: false });
  return rows;
}
function sweepTable(ws, e) {
  if (!e.sweep) return null;
  const bs = [32, 64, 128, 512, 1024, 2048];
  const noise = [4.21, 3.02, 2.06, 1.04, null, null], eff = [0.38, 0.47, 0.61, 0.83, null, null];
  const upto = Math.floor(e.prog * 7);
  return bs.map((bt, i) => ({ b: bt, noise: i < upto ? noise[i] : null, eff: i < upto ? eff[i] : null, state: i < upto ? 'done' : i === upto ? 'running' : 'queued' }));
}

export function exptree(ws, idea) {
  const key = ws.exptree[idea] ? idea : Object.keys(ws.exptree)[0];
  const t = key ? ws.exptree[key] : null;
  if (!t) return { empty: true, idea: null, nodes: [], counts: { all: 0, success: 0, failed: 0, pruned: 0 },
    budget: { used: ws.settings.gpuUsed, total: ws.settings.budget }, parallel: ws.settings.parallel, k: 1 };
  const nodes = t.nodes.map((n) => {
    const e = n.exp ? ws.experiments[n.exp] : null;
    return { ...n, status: e ? (e.status === 'done' ? 'success' : e.status === 'queued' ? 'queued' : 'running') : n.status, prog: e?.prog ?? null, etaMs: e && e.status === 'running' ? Math.max(0, e.startedAt + e.durMs - Date.now()) : null };
  });
  const counts = { all: 55, success: nodes.filter((n) => n.status === 'success').length + 24, failed: nodes.filter((n) => n.status === 'failed').length + 7, pruned: nodes.filter((n) => n.pruned).length + 12 };
  return { idea: key, nodes, counts, budget: { used: ws.settings.gpuUsed, total: ws.settings.budget }, parallel: ws.settings.parallel, k: t.k };
}

export function sweep(ws) {
  const s = ws.sweep;
  if (!s) return { empty: true, rows: [], cells: [], tests: [], metric: 'eff', mode: 'single', alpha: 0.05,
    hyp: null, hypScore: 0, hypStatus: 'untested', written: false, filled: false, gpuh: 0, remain: 0,
    rep: { b: '—', s: '—', lr: '—', run: '—' }, budget: { used: ws.settings.gpuUsed, total: ws.settings.budget } };
  const e = ws.experiments.e_15;
  const cells = s.cells.map((c) => ({ ...c }));
  const rows = [...new Set(cells.map((c) => c.b))].map((bt) => {
    const cs = cells.filter((c) => c.b === bt);
    const vals = cs.map((c) => (s.metric === 'eff' ? c.eff : c.noise)).filter((v) => v != null);
    const mean = vals.length ? vals.reduce((a, x) => a + x, 0) / vals.length : null;
    const sd = vals.length > 1 ? Math.sqrt(vals.reduce((a, x) => a + (x - mean) ** 2, 0) / (vals.length - 1)) : null;
    return { b: bt, cells: cs, mean: mean == null ? null : Math.round(mean * 100) / 100, sd: sd == null ? null : Math.round(sd * 1000) / 1000,
      state: cs.some((c) => c.state === 'oom') ? 'oom' : vals.length < 3 ? (vals.length ? 'partial' : 'pending') : 'done' };
  });
  const t = (a, c) => {
    const A = cells.filter((x) => x.b === a).map((x) => (s.metric === 'eff' ? x.eff : x.noise)).filter((v) => v != null);
    const B = cells.filter((x) => x.b === c).map((x) => (s.metric === 'eff' ? x.eff : x.noise)).filter((v) => v != null);
    if (A.length < 2 || B.length < 2) return null;
    const m = (z) => z.reduce((p, q) => p + q, 0) / z.length, v = (z) => z.reduce((p, q) => p + (q - m(z)) ** 2, 0) / (z.length - 1);
    const tv = Math.abs(m(A) - m(B)) / Math.sqrt(v(A) / A.length + v(B) / B.length);
    const p = Math.max(0.0001, Math.min(0.9, 2 * Math.exp(-0.717 * tv - 0.416 * tv * tv)));
    return { pair: [a, c], t: Math.round(tv * 100) / 100, p: Math.round(p * 1000) / 1000, sig: p < s.alpha };
  };
  return { ...s, rows, tests: [t(...s.cmp), t(...s.cmp2)].filter(Boolean), hypScore: E.score(ws, s.hyp), hypStatus: E.hypStatus(ws, s.hyp), expProg: e?.prog ?? 1, budget: { used: ws.settings.gpuUsed, total: ws.settings.budget } };
}

// Occupancy timeline. The geometry is computed here, not in the browser: a GPU
// runs one job at a time, so each lane is packed left to right and anything that
// still overlaps (or starts before the window) is clipped to the window.
export const TIMELINE_H = 24 * HOUR;
export function timeline(ws, now = Date.now()) {
  const from = now - TIMELINE_H;
  const segs = [];
  for (const r of ws.runs) segs.push({ id: r.id, gpu: r.gpu, from: r.start, to: r.start + r.dur, idea: r.idea, label: r.label, status: r.status, cost: r.cost });
  for (const e of Object.values(ws.experiments)) {
    if (e.status !== 'running') continue;
    // a live run is drawn from "now" backwards by however much of its measured
    // wall-clock duration has elapsed, so the bar grows as the run progresses
    const elapsed = Math.max(0.25, (e.hours || 3) * (e.prog || 0)) * HOUR;
    segs.push({ id: e.id, gpu: e.gpu || 0, from: now - elapsed, to: now, idea: e.idea, label: e.label, status: 'running', hyp: e.hyp, cost: e.cost });
  }
  const lanes = [];
  for (let g = 0; g < ws.settings.gpus; g++) {
    const mine = segs.filter((s) => s.gpu === g && s.to > from).sort((a, c) => a.from - c.from);
    const row = [];
    let cursor = from;
    for (const s of mine) {
      const a = Math.max(s.from, from, cursor), b = Math.min(s.to, now);
      if (b - a < 60000) continue; // fully covered by the previous job, or off-window
      cursor = b;
      const left = ((a - from) / TIMELINE_H) * 100, width = ((b - a) / TIMELINE_H) * 100;
      row.push({ ...s, left: Math.round(left * 100) / 100, width: Math.round(Math.min(width, 100 - left) * 100) / 100,
        clippedLeft: s.from < from, hours: Math.round(((b - a) / HOUR) * 10) / 10 });
    }
    lanes.push(row);
  }
  const busy = lanes.flat().reduce((s, x) => s + x.width, 0) / Math.max(1, ws.settings.gpus);
  const ticks = [];
  for (let i = 0; i <= 4; i++) { const t = from + (TIMELINE_H / 4) * i; ticks.push({ at: t, pct: i * 25, label: new Date(t).toTimeString().slice(0, 5) }); }
  return { lanes, ticks, from, to: now, idle: Math.max(0, Math.round((100 - busy) * 10) / 10) };
}

export function runs(ws) {
  const exps = Object.values(ws.experiments);
  const live = exps.filter((e) => e.status === 'running').map((e) => ({ id: e.id, gpu: e.gpu, start: e.startedAt, dur: e.durMs, idea: e.idea, label: e.label, status: 'running', hours: e.hours, cost: e.cost, vcpu: e.vcpu, hyp: e.hyp }));
  const r24 = ws.runs.filter((r) => Date.now() - r.start < 26 * HOUR);
  const failed = r24.filter((r) => r.status === 'failed').length;
  return {
    timeline: timeline(ws), live,
    history: ws.runs.filter((r) => Date.now() - r.start < 26 * HOUR).sort((a, c) => c.start - a.start)
      .map((r) => ({ ...r, hours: Math.round((r.dur / HOUR) * 10) / 10 })),
    queued: exps.filter((e) => e.status === 'queued').map((e) => ({ id: e.id, hyp: e.hyp, label: e.label, idea: e.idea, status: 'queued' })),
    failures: ws.failures, spend: ws.spendByIdea, failBurn: ws.failBurn,
    stats: { running: live.length, queued: exps.filter((e) => e.status === 'queued').length, failed, all: r24.length + live.length, rate: Math.round((1 - failed / Math.max(1, r24.length)) * 100), rescued: [5, 7], avgQueueMin: 6 },
    settings: ws.settings, gpus: ws.settings.gpus,
  };
}

export function review(ws, focus) {
  const pend = E.pendingVerdicts(ws);
  // a hypothesis that has just been ruled on drops out of the queue: fall back
  // to the next pending one rather than showing a settled panel
  const selId = focus && pend.some((p) => p.id === focus) ? focus : pend[0]?.id;
  const sel = selId ? { ...detail(ws, selId), impact: E.impact(ws, selId), advice: E.reviewerAdvice(ws, selId) } : null;
  if (sel) {
    const totals = sel.impact.reduce((a, i) => ({ frozen: a.frozen + i.frozen, rewrite: a.rewrite + i.rewrite, broken: a.broken + (i.kind === 'local' ? 0 : 1) }), { frozen: 0, rewrite: 0, broken: 0 });
    sel.totals = { ...totals, ideas: sel.impact.length };
    sel.queueAfter = { reopen: sel.impact.reduce((a, i) => a + (i.kind === 'local' ? 0 : i.frozen), 0), withdraw: Object.values(ws.experiments).filter((e) => e.status === 'queued' && e.hyp === selId).length, unaffected: sel.impact.filter((i) => i.kind === 'local').length };
    sel.preview = { hyp: selId, verdict: sel.advice.action, scope: sel.advice.action === 'narrow_scope' ? 'narrowed' : null, affected_ideas: sel.ideas.map((i) => i.idea), next_action: sel.advice.action === 'close' ? 'freeze' : 'reopen', reviewer: ws.agents.reviewer, at: new Date().toISOString() };
  }
  return { pending: pend, done: ws.verdictHistory.slice(0, 12), sel, threshold: { score: 1.0, pivots: 3 } };
}

export function paper(ws) {
  const p = ws.paper;
  const sections = p.sections.map((s) => ({ ...s, hypInfo: s.hyps.map((h) => hyp(ws, h)), status: sectionStatus(ws, s) }));
  const supported = ws.claims.items.filter((c) => c.status === 'supported').length + ws.claims.collapsed;
  const total = ws.claims.items.length + ws.claims.collapsed || 1;
  return {
    ...p, sections, coverage: Math.round((supported / total) * 100), gaps: p.gaps.map((g) => ({ ...g, exp: g.exp, expStatus: g.exp ? ws.experiments[g.exp]?.status : null, prog: g.exp ? ws.experiments[g.exp]?.prog : null })),
    pendingHyps: p.sections.flatMap((s) => s.hyps).filter((h, i, a) => a.indexOf(h) === i && E.hypStatus(ws, h) === 'pending_review'),
    fig3: { measured: ws.figures.fig3.measured, ver: ws.figures.fig3.ver }, claimsFlagged: ws.claims.items.filter((c) => c.status !== 'supported').length,
  };
}
function sectionStatus(ws, s) {
  if (s.stale) return 'affected';
  if (s.hyps.some((h) => E.hypStatus(ws, h) === 'pending_review')) return 'affected';
  const related = ws.claims.items.filter((c) => c.sec === s.k);
  if (related.some((c) => c.status === 'insufficient')) return 'missing';
  if (related.some((c) => c.status === 'overclaim')) return 'overclaim';
  return s.status === 'todo' ? 'todo' : s.status === 'figure' ? 'figure' : 'ok';
}

export function claims(ws, focus) {
  const items = ws.claims.items.map((c) => ({ ...c, hypStatus: c.hyp ? E.hypStatus(ws, c.hyp) : null }));
  if (!items.length) return { empty: true, items: [], collapsed: ws.claims.collapsed, sel: null,
    stats: { all: ws.claims.collapsed, supported: ws.claims.collapsed, insufficient: 0, over: 0, coverage: 100, perClaim: 0 }, gate: false };
  const selId = focus && items.some((c) => c.id === focus) ? focus : (items.find((c) => c.status !== 'supported') || items[0]).id;
  const supported = items.filter((c) => c.status === 'supported').length + ws.claims.collapsed;
  return {
    items, collapsed: ws.claims.collapsed, sel: items.find((c) => c.id === selId),
    stats: { all: items.length + ws.claims.collapsed, supported, insufficient: items.filter((c) => c.status === 'insufficient').length, over: items.filter((c) => c.status === 'overclaim').length,
      coverage: Math.round((supported / (items.length + ws.claims.collapsed)) * 100), perClaim: 1.4 },
    gate: items.some((c) => c.status === 'overclaim'),
  };
}

export function figures(ws) {
  const f = ws.figures;
  const items = f.items.map((x) => {
    const e = ws.experiments[x.src];
    return { ...x, status: e ? (e.status === 'done' ? 'done' : 'waiting') : x.status, prog: e?.prog ?? null };
  });
  return { items, fig3: f.fig3, textValue: 18.4, mismatch: f.fig3.measured !== 18.4 && !ws.decisions.fig3, traceable: items.length };
}

export function rebuttal(ws) {
  const r = ws.rebuttal;
  const comments = r.comments.map((c) => ({ ...c, expStatus: c.exp ? ws.experiments[c.exp]?.status : null, prog: c.exp ? ws.experiments[c.exp]?.prog : null }));
  const checklist = r.checklist.map((k) => ({ ...k, done: k.auto === 'claims' ? !ws.claims.items.some((c) => c.status === 'overclaim') : k.auto === 'fig4' ? (figures(ws).items[3]?.status === 'done') : k.done }));
  // the anonymisation pass runs during export, so it is not part of "ready"
  const blocking = checklist.filter((k) => k.auto !== 'anon');
  const mean = r.reviewers.length ? Math.round((r.reviewers.reduce((s, x) => s + x.score, 0) / r.reviewers.length) * 10) / 10 : 0;
  return { ...r, comments, checklist, mean, pending: comments.filter((c) => c.status === 'pending').length, doneN: comments.filter((c) => c.status === 'done').length + r.collapsed, all: comments.length + r.collapsed,
    ready: blocking.every((k) => k.done), gpuNeeded: comments.filter((c) => c.status === 'pending').length * 4.5 };
}

export function events(ws, kind) {
  let list = ws.events;
  if (kind && kind !== 'all') list = list.filter((e) => e.kind === kind);
  return { list: list.slice(0, 80), kinds: [...new Set(ws.events.map((e) => e.kind))] };
}
