// Reads a real project directory into a workspace, and writes human decisions
// back into it. The directory is the source of truth; the workbench never edits
// files an agent owns (tree.json, index.jsonl, artifacts/) — it appends to
// events.jsonl, writes verdicts/<hyp>.json and queues runs in queue.jsonl.
import { readFileSync, readdirSync, statSync, existsSync, appendFileSync, writeFileSync, mkdirSync, unlinkSync, accessSync, constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { blankWorkspace, b } from '../seed.js';
import * as S from './schema.js';

export const FILES = {
  tree: 'tree.json', index: 'index.jsonl', events: 'events.jsonl', experiments: 'experiments.jsonl',
  verdicts: 'verdicts', venues: 'venues.yaml', topics: 'topics.md', queue: 'queue.jsonl', paper: 'paper',
};

const readText = (f) => { try { return readFileSync(f, 'utf8'); } catch { return null; } };
function readJsonl(file, p, name, cap = 20000) {
  const txt = readText(file);
  if (txt == null) return null;
  const out = [];
  txt.split('\n').forEach((line, i) => {
    const s = line.trim();
    if (!s || s.startsWith('#')) return;
    if (out.length >= cap) return;
    try { out.push({ raw: JSON.parse(s), line: i + 1 }); } catch { p.add(name, `line ${i + 1}: not valid JSON`); }
  });
  return out;
}

// venues.yaml is a flat list of simple scalars — enough of YAML for this one file
function parseVenues(txt, p) {
  const out = [];
  let cur = null;
  for (const raw of txt.split('\n')) {
    const line = raw.replace(/\t/g, '  ');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const item = /^\s*-\s*(.*)$/.exec(line);
    if (item) { cur = {}; out.push(cur); if (!item[1].trim()) continue; }
    const kv = /^\s*-?\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
    if (kv && cur) {
      const v = kv[2].trim().replace(/^["']|["']$/g, '');
      cur[kv[1]] = v === 'true' ? true : v === 'false' ? false : v;
    } else if (!kv && !item) p.add(FILES.venues, `cannot read line: ${line.trim().slice(0, 40)}`);
  }
  return out.filter((v) => v.id || v.name).map((v) => ({
    id: String(v.id ?? v.name).slice(0, 24), name: String(v.name ?? v.id),
    type: String(v.type ?? 'conf'), level: String(v.level ?? ''), scan: v.scan === 'watch' ? 'watch' : 'core',
    entry: String(v.entry ?? ''), cursor: String(v.cursor ?? ''), delta: Number(v.added ?? 0) || 0,
    status: v.status === 'broken' || v.status === 'parked' ? v.status : 'ok',
  }));
}

export function load(root) {
  const p = new S.Problems();
  const ws = blankWorkspace(Date.now());
  ws.mode = 'project';
  ws.root = root;
  if (!existsSync(root)) { p.add('', `project directory not found: ${root}`); return { ws, problems: p.list, ok: false }; }

  // ---- ideas, hypotheses, trees
  const treeTxt = readText(join(root, FILES.tree));
  if (treeTxt == null) p.add(FILES.tree, 'missing — the hypothesis network will be empty');
  else {
    let tree = null;
    try { tree = JSON.parse(treeTxt); } catch (e) { p.add(FILES.tree, 'not valid JSON', e.message); }
    if (tree) {
      for (const raw of tree.ideas || []) { const i = S.normIdea(raw, p); if (i) ws.ideas.push(i); }
      for (const raw of tree.hypotheses || tree.hyps || []) { const h = S.normHypothesis(raw, p); if (h) ws.hyps[h.id] = h; }
      const trees = tree.trees || {};
      for (const [idea, rows] of Object.entries(trees)) {
        if (!ws.ideas.some((i) => i.id === idea)) { p.add(FILES.tree, `tree for unknown idea ${idea}, ignored`); continue; }
        ws.trees[idea] = S.normTree(idea, rows, ws.hyps, p);
      }
      for (const i of ws.ideas) if (!ws.trees[i.id]) { ws.trees[i.id] = []; p.add(FILES.tree, `idea ${i.id} has no tree`); }
      if (Array.isArray(tree.cross_deps)) ws.crossDeps = tree.cross_deps.filter((x) => Array.isArray(x) && x.length === 2);
      if (tree.settings) Object.assign(ws.settings, {
        parallel: Number(tree.settings.parallel) || ws.settings.parallel,
        budget: Number(tree.settings.budget) || ws.settings.budget,
        gpus: Number(tree.settings.gpus) || ws.settings.gpus,
      });
      if (tree.agents) Object.assign(ws.agents, tree.agents);
    }
  }

  // ---- experiments and runs
  const exps = readJsonl(join(root, FILES.experiments), p, FILES.experiments);
  if (exps) for (const { raw, line } of exps) {
    const e = S.normExperiment(raw, p, line);
    if (!e) continue;
    if (e.hyp && !ws.hyps[e.hyp]) p.add(FILES.experiments, `line ${line}: experiment ${e.id} points at unknown hypothesis ${e.hyp}`);
    ws.experiments[e.id] = e;
    if (e.status === 'done' || e.status === 'failed') {
      ws.runs.push({ id: e.id, gpu: e.gpu, start: e.startedAt, dur: e.durMs, idea: e.idea, label: e.label, status: e.status === 'failed' ? 'failed' : 'done', cost: e.cost });
      ws.spendByIdea[e.idea] = Math.round(((ws.spendByIdea[e.idea] || 0) + e.hours) * 10) / 10;
      ws.settings.gpuUsed = Math.round((ws.settings.gpuUsed + e.hours) * 10) / 10;
    }
  }
  ws.runs.sort((a, c) => c.start - a.start);

  // ---- events
  const evs = readJsonl(join(root, FILES.events), p, FILES.events, 2000);
  if (evs) {
    for (const { raw, line } of evs) { const e = S.normEvent(raw, p, line); if (e) ws.events.push(e); }
    ws.events.sort((a, c) => c.t - a.t);
    ws.events = ws.events.slice(0, 300);
    ws.seq.event = ws.events.length;
    const human = ws.events.find((e) => e.mod === 'human');
    if (human) ws.lastHuman = human.t;
  }

  // ---- verdicts
  const vdir = join(root, FILES.verdicts);
  if (existsSync(vdir)) {
    for (const f of readdirSync(vdir).filter((x) => x.endsWith('.json')).slice(0, 2000)) {
      let raw = null;
      try { raw = JSON.parse(readFileSync(join(vdir, f), 'utf8')); } catch (e) { p.add(`verdicts/${f}`, 'not valid JSON', e.message); continue; }
      const v = S.normVerdict(raw, `verdicts/${f}`, p);
      if (!v) continue;
      ws.verdicts[v.hyp] = v;
      ws.verdictHistory.push({ hyp: v.hyp, verdict: v.verdict, idea: v.affected_ideas[0] || '', at: v.at });
    }
    ws.verdictHistory.sort((a, c) => c.at - a.at);
  }

  // ---- literature
  const idx = readJsonl(join(root, FILES.index), p, FILES.index);
  if (idx) {
    for (const { raw, line } of idx) { const rec = S.normPaperRecord(raw, p, line); if (rec) ws.papers[rec.id] = rec; }
    const all = Object.values(ws.papers);
    ws.survey.library = all.length;
    ws.survey.funnel = { l1: all.filter((x) => x.level >= 1).length, l2: all.filter((x) => x.level >= 2).length, l3: all.filter((x) => x.level >= 3).length };
    ws.survey.stock = [ws.survey.funnel.l1, ws.survey.funnel.l2, ws.survey.funnel.l3];
    ws.survey.records = ws.survey.funnel.l1;
    ws.survey.fulltext = ws.survey.funnel.l2;
  }

  const venuesTxt = readText(join(root, FILES.venues));
  if (venuesTxt) { ws.survey.venues = parseVenues(venuesTxt, p); ws.survey.whitelist = ws.survey.venues.length; }
  const topicsTxt = readText(join(root, FILES.topics));
  if (topicsTxt) ws.survey.topics = [...topicsTxt.matchAll(/^#{1,3}\s+(.+)$/gm)].map((m) => m[1].trim()).slice(0, 24);

  // ---- optional writing artefacts
  const paperDir = join(root, FILES.paper);
  const manuscript = readText(join(paperDir, 'manuscript.json'));
  if (manuscript) {
    try {
      const m = JSON.parse(manuscript);
      ws.paper.idea = m.idea ?? null;
      ws.paper.ideaTitle = S.bi(m.title, m.idea ?? '');
      ws.paper.sections = (m.sections || []).map((s) => ({
        k: String(s.k ?? ''), title: S.bi(s.title, ''), hyps: Array.isArray(s.hyps) ? s.hyps.map(String) : [],
        status: String(s.status ?? 'ok'), paras: (s.paras || []).map((x) => S.bi(x)), stale: !!s.stale, fig: s.fig ?? null,
      })).filter((s) => s.k);
    } catch (e) { p.add('paper/manuscript.json', 'not valid JSON', e.message); }
  }
  const claims = readText(join(paperDir, 'claims.json'));
  if (claims) {
    try {
      const rows = JSON.parse(claims);
      ws.claims.items = (Array.isArray(rows) ? rows : rows.items || []).map((c, i) => ({
        id: String(c.id ?? 'c' + i), sec: String(c.sec ?? ''), text: S.bi(c.text, ''), hyp: c.hyp ?? null,
        ev: Array.isArray(c.ev) ? c.ev.map(String) : [], status: ['supported', 'insufficient', 'overclaim'].includes(c.status) ? c.status : 'supported',
        why: c.why ? S.bi(c.why) : undefined, find: c.find ? { zh: String(c.find.zh ?? c.find), en: String(c.find.en ?? c.find) } : undefined,
        soften: c.soften ? { zh: String(c.soften.zh ?? c.soften), en: String(c.soften.en ?? c.soften) } : undefined,
        chain: Array.isArray(c.chain) ? c.chain.map((x) => S.bi(x)) : undefined,
      }));
    } catch (e) { p.add('paper/claims.json', 'not valid JSON', e.message); }
  }

  ws.loadedAt = Date.now();
  ws.problems = p.list;
  return { ws, problems: p.list, ok: true };
}

// ---------------------------------------------------------------- write-back
// Only three things leave the workbench, and each is an append or a new file.
export function writeVerdict(root, verdict) {
  const dir = join(root, FILES.verdicts);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${String(verdict.hyp).replace(/[^\w.-]/g, '_')}.json`);
  writeFileSync(file, JSON.stringify({ ...verdict, at: new Date(verdict.at).toISOString() }, null, 2));
  return file;
}
export function appendEvent(root, ev) {
  const line = JSON.stringify({ t: new Date(ev.t).toISOString(), module: ev.mod, kind: ev.kind, title: ev.title, detail: ev.detail, hyp: ev.hyp, exp: ev.exp });
  appendFileSync(join(root, FILES.events), line + '\n');
}
export function appendQueue(root, exp) {
  const line = JSON.stringify({ queued_at: new Date().toISOString(), id: exp.id, hyp: exp.hyp, idea: exp.idea, cfg: exp.cfg, label: exp.label });
  appendFileSync(join(root, FILES.queue), line + '\n');
}

export function fingerprint(root) {
  // cheap change detector: mtimes of the files we read
  const parts = [];
  for (const f of [FILES.tree, FILES.index, FILES.events, FILES.experiments, FILES.venues, FILES.topics]) {
    try { parts.push(f + ':' + Math.round(statSync(join(root, f)).mtimeMs)); } catch { parts.push(f + ':0'); }
  }
  try { parts.push('verdicts:' + readdirSync(join(root, FILES.verdicts)).length); } catch { parts.push('verdicts:0'); }
  return parts.join('|');
}

export const describe = (root) => ({ mode: 'project', root: resolve(root), writable: canWrite(root) });
function canWrite(root) {
  try { accessSync(root, constants.W_OK); return true; } catch { return false; }
}
