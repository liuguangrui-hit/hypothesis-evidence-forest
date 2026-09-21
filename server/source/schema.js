// Normalising external project records into the shape the views expect.
// Anything malformed is reported as a problem instead of throwing: a real
// project directory is written by other tools and will be imperfect.
import { b } from '../seed.js';

export const HYP_STATUS = new Set(['untested', 'active', 'self_verified', 'pending_review', 'closed', 'inductive_unverified', 'lit_supported']);
export const EXP_STATUS = new Set(['queued', 'running', 'done', 'failed', 'paused', 'withdrawn']);
export const IDEA_STATUS = new Set(['running', 'candidate', 'done', 'parked']);
export const ROLES = new Set(['own_to_prove', 'borrowed_assumption']);
export const VERDICTS = new Set(['close', 'return_active', 'narrow_scope', 'downgrade']);

// A real project is usually written in one language. Either a plain string or a
// {zh, en} pair is accepted; a string shows as-is on both sides of the switch.
export function bi(v, fallback = '') {
  if (v == null) return b(fallback, fallback);
  if (typeof v === 'string') return b(v, v);
  if (typeof v === 'object') {
    const zh = typeof v.zh === 'string' ? v.zh : null, en = typeof v.en === 'string' ? v.en : null;
    return b(zh ?? en ?? fallback, en ?? zh ?? fallback);
  }
  return b(String(v), String(v));
}

export const asMs = (v) => {
  if (typeof v === 'number') return v > 1e12 ? v : v * 1000; // seconds or millis
  if (typeof v === 'string') { const t = Date.parse(v); if (!Number.isNaN(t)) return t; }
  return null;
};
const numOr = (v, d) => (Number.isFinite(+v) ? +v : d);

export class Problems {
  constructor() { this.list = []; }
  add(file, message, detail) { if (this.list.length < 200) this.list.push({ file, message, detail: detail == null ? null : String(detail).slice(0, 200) }); }
  get count() { return this.list.length; }
}

export function normIdea(raw, p) {
  const id = String(raw?.id || '').trim();
  if (!id) { p.add('tree.json', 'an idea has no id'); return null; }
  const status = IDEA_STATUS.has(raw.status) ? raw.status : 'running';
  if (raw.status && !IDEA_STATUS.has(raw.status)) p.add('tree.json', `idea ${id}: unknown status "${raw.status}", treated as running`);
  return { id, name: bi(raw.name ?? raw.title, id), status, color: typeof raw.color === 'string' ? raw.color : null };
}

export function normHypothesis(raw, p) {
  const id = String(raw?.id || '').trim();
  if (!id) { p.add('tree.json', 'a hypothesis has no id'); return null; }
  const status = HYP_STATUS.has(raw.status) ? raw.status : 'untested';
  if (raw.status && !HYP_STATUS.has(raw.status)) p.add('tree.json', `hypothesis ${id}: unknown status "${raw.status}", treated as untested`);
  const evidence = Array.isArray(raw.evidence) ? raw.evidence.map((e) => ({
    exp: String(e?.exp ?? e?.run ?? '').slice(0, 64) || '—',
    idea: String(e?.idea ?? '').slice(0, 64),
    delta: numOr(e?.delta, 0),
    note: bi(e?.note ?? e?.summary, ''),
    at: asMs(e?.at ?? e?.time) ?? Date.now(),
  })) : [];
  if (raw.evidence && !Array.isArray(raw.evidence)) p.add('tree.json', `hypothesis ${id}: evidence is not a list, ignored`);
  return {
    id, claim: bi(raw.claim ?? raw.statement, id), warrant: raw.warrant ? bi(raw.warrant) : null,
    status, induced: !!raw.induced, needsDecompose: !!raw.needs_decompose, rerun: !!raw.rerun,
    depends: Array.isArray(raw.depends ?? raw.depends_on) ? (raw.depends ?? raw.depends_on).map(String).slice(0, 32) : [],
    decisions: Array.isArray(raw.decisions) ? raw.decisions.map((d) => ({ kind: String(d?.kind ?? d).slice(0, 16), at: asMs(d?.at) ?? Date.now() })) : [],
    pivots: numOr(raw.pivots, 0), evidence,
    submittedAt: asMs(raw.submitted_at) ?? undefined, narrow: raw.narrow ? bi(raw.narrow) : null,
  };
}

export function normTree(idea, rows, hyps, p) {
  const out = [];
  const seen = new Set();
  for (const raw of Array.isArray(rows) ? rows : []) {
    const hyp = String(raw?.hyp ?? raw?.id ?? '').trim();
    const k = String(raw?.k ?? raw?.key ?? '').trim();
    if (!hyp || !k) { p.add('tree.json', `${idea}: a node is missing k or hyp`); continue; }
    if (!hyps[hyp]) { p.add('tree.json', `${idea}: node ${k} points at unknown hypothesis ${hyp}`); continue; }
    if (seen.has(k)) { p.add('tree.json', `${idea}: duplicate node key ${k}`); continue; }
    seen.add(k);
    out.push({ k, hyp, parent: raw.parent == null || raw.parent === '' ? null : String(raw.parent),
      role: ROLES.has(raw.role) ? raw.role : 'own_to_prove', frozen: !!raw.frozen, local: null });
  }
  for (const n of out) if (n.parent && !seen.has(n.parent)) { p.add('tree.json', `${idea}: node ${n.k} has missing parent ${n.parent}, attached at the root`); n.parent = null; }
  return out;
}

export function normExperiment(raw, p, line) {
  const id = String(raw?.id || '').trim();
  if (!id) { p.add('experiments.jsonl', `line ${line}: no id`); return null; }
  const status = EXP_STATUS.has(raw.status) ? raw.status : 'done';
  const hours = numOr(raw.duration_h ?? raw.hours, 3);
  const started = asMs(raw.started_at ?? raw.start) ?? Date.now() - hours * 3600000;
  const cfg = raw.cfg && typeof raw.cfg === 'object' ? raw.cfg : {};
  return {
    id, hyp: String(raw.hyp ?? raw.hypothesis ?? '').trim(), idea: String(raw.idea ?? '').trim(),
    status, prog: status === 'done' ? 1 : Math.min(1, Math.max(0, numOr(raw.progress, 0))),
    startedAt: started, finishedAt: status === 'done' ? (asMs(raw.finished_at) ?? started + hours * 3600000) : undefined,
    durMs: Math.max(60000, hours * 3600000), hours, cost: numOr(raw.cost, 0), gpu: numOr(raw.gpu, 0), vcpu: numOr(raw.vcpu, 0) || undefined,
    cfg: {
      model: String(cfg.model ?? '—'), batch: String(cfg.batch ?? '—'), seed: String(cfg.seed ?? '—'),
      opt: String(cfg.opt ?? cfg.optimizer ?? '—'), steps: String(cfg.steps ?? '—'), measure: String(cfg.measure ?? '—'),
    },
    outcome: { delta: numOr(raw.outcome?.delta, 0), rec: String(raw.outcome?.rec ?? 'PROCEED'), conf: numOr(raw.outcome?.conf, 0.5) },
    label: bi(raw.label ?? raw.summary, id), node: raw.node ? String(raw.node) : null,
    queuedAt: asMs(raw.queued_at) ?? started,
  };
}

export function normEvent(raw, p, line) {
  const t = asMs(raw?.t ?? raw?.at ?? raw?.time);
  if (t == null) { p.add('events.jsonl', `line ${line}: no timestamp`); return null; }
  return {
    id: line, t, mod: String(raw.module ?? raw.mod ?? 'system').slice(0, 24),
    title: bi(raw.title ?? raw.message, ''), detail: bi(raw.detail ?? raw.body, ''),
    kind: String(raw.kind ?? 'info').slice(0, 24),
    hyp: raw.hyp ? String(raw.hyp) : undefined, exp: raw.exp ? String(raw.exp) : undefined,
  };
}

export function normPaperRecord(raw, p, line) {
  const id = String(raw?.id || '').trim();
  if (!id) { p.add('index.jsonl', `line ${line}: no id`); return null; }
  const d = raw.digest && typeof raw.digest === 'object' ? raw.digest : null;
  return {
    id, title: bi(raw.title, id), authors: String(raw.authors ?? (Array.isArray(raw.author) ? raw.author.join(', ') : '') ?? ''),
    venue: String(raw.venue ?? ''), year: numOr(raw.year, null), doi: raw.doi ?? null, arxiv: raw.arxiv_id ?? null,
    status: String(raw.status ?? 'published'), level: numOr(raw.level, 1),
    tracks: Array.isArray(raw.tracks) ? raw.tracks.map(String).slice(0, 8) : [],
    keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String).slice(0, 32) : [],
    fetched: String(raw.fetched_at ?? '').slice(0, 10), size: String(raw.size ?? '—'),
    queued: !!raw.queued, brief: !!raw.brief_zh, full: !!raw.full_zh,
    reason: bi(raw.include_reason, ''), similar: Array.isArray(raw.similar) ? raw.similar.slice(0, 8) : [],
    digest: d ? {
      title: bi(d.title ?? raw.title, ''), problem: bi(d.problem, '—'), threat: bi(d.threat ?? d.threat_model, '—'),
      method: bi(d.method, '—'), eval: bi(d.eval ?? d.evaluation, '—'), conclusion: bi(d.conclusion, '—'), limits: bi(d.limits, '—'),
    } : null,
    abstract: typeof raw.abstract === 'string' ? raw.abstract.slice(0, 4000) : null,
  };
}

export function normVerdict(raw, file, p) {
  const hyp = String(raw?.hyp ?? raw?.hypothesis ?? '').trim();
  if (!hyp) { p.add(file, 'no hyp field'); return null; }
  if (!VERDICTS.has(raw.verdict)) { p.add(file, `unknown verdict "${raw.verdict}"`); return null; }
  return {
    hyp, verdict: raw.verdict, scope: raw.scope ?? null,
    affected_ideas: Array.isArray(raw.affected_ideas) ? raw.affected_ideas.map(String) : [],
    next_action: raw.next_action ?? null, reviewer: String(raw.reviewer ?? 'reviewer'), at: asMs(raw.at) ?? Date.now(),
  };
}
