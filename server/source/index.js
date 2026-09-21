// Which data the workbench is looking at.
//
//   AIS_SOURCE=demo                      (default) a private simulated workspace per visitor
//   AIS_SOURCE=project AIS_PROJECT_DIR=… one real project directory, shared by everyone
//
// Demo mode is what the public site runs. Project mode points the same screens
// at a live research project: reads come from the files, and the three human
// decisions (verdict, queue a run, log an action) are written back.
import { makeWorkspace } from '../seed.js';
import * as project from './project.js';

export const MODE = process.env.AIS_SOURCE === 'project' ? 'project' : 'demo';
export const ROOT = process.env.AIS_PROJECT_DIR ? String(process.env.AIS_PROJECT_DIR) : null;
export const READONLY = process.env.AIS_READONLY === '1';

let cached = null; // project mode holds exactly one workspace

export function describe() {
  if (MODE === 'demo') return { mode: 'demo', writable: true, root: null, problems: [], shared: false };
  const d = project.describe(ROOT || '.');
  return { mode: 'project', writable: d.writable && !READONLY, root: d.root, shared: true,
    problems: cached?.problems || [], loadedAt: cached?.ws?.loadedAt || null,
    counts: cached ? { ideas: cached.ws.ideas.length, hyps: Object.keys(cached.ws.hyps).length, papers: Object.keys(cached.ws.papers).length, experiments: Object.keys(cached.ws.experiments).length } : null };
}

// demo: a brand-new simulated workspace. project: the shared one, re-read when
// the files on disk have changed since the last look.
export function workspace() {
  if (MODE === 'demo') return makeWorkspace(Date.now());
  const fp = project.fingerprint(ROOT || '.');
  if (!cached || cached.fp !== fp) {
    const { ws, problems } = project.load(ROOT || '.');
    ws.readonly = READONLY;
    cached = { ws, problems, fp };
  }
  return cached.ws;
}
export const isShared = () => MODE === 'project';
export function invalidate() { cached = null; }

// Human decisions that must survive outside the browser session.
export function persist(ws, change) {
  if (MODE !== 'project' || READONLY || !ROOT) return { written: false };
  try {
    if (change.kind === 'verdict') { const file = project.writeVerdict(ROOT, change.verdict); return { written: true, file }; }
    if (change.kind === 'event') { project.appendEvent(ROOT, change.event); return { written: true }; }
    if (change.kind === 'queue') { project.appendQueue(ROOT, change.exp); return { written: true }; }
  } catch (e) {
    console.error('write-back failed:', e.message);
    return { written: false, error: e.message };
  }
  return { written: false };
}
