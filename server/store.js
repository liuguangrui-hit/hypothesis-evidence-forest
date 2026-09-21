// One workspace per visitor session, persisted as JSON on disk so a reload keeps
// whatever the visitor did. No database, no accounts — a session cookie is the key.
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeWorkspace } from './seed.js';
import { tick } from './engine.js';
import * as source from './source/index.js';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'sessions');
mkdirSync(DIR, { recursive: true });

const cache = new Map(); // sid -> ws, insertion-ordered, used as an LRU
const MAX_AGE = 7 * 24 * 3600 * 1000;
const MAX_LIVE = 400;
function touch(sid, ws) {
  cache.delete(sid); cache.set(sid, ws);
  while (cache.size > MAX_LIVE) cache.delete(cache.keys().next().value); // evict least-recently-used
}

const safe = (sid) => /^[a-f0-9-]{8,64}$/i.test(sid) ? sid : null;
const pathOf = (sid) => join(DIR, createHash('sha256').update(sid).digest('hex').slice(0, 32) + '.json');

export function newSid() { return randomUUID(); }

export function load(sid) {
  if (!safe(sid)) return null;
  if (cache.has(sid)) { const ws = cache.get(sid); touch(sid, ws); return ws; }
  try {
    const ws = JSON.parse(readFileSync(pathOf(sid), 'utf8'));
    if (ws && ws.v === 1) { touch(sid, ws); return ws; }
  } catch { /* fresh session */ }
  return null;
}

export function create(sid) {
  const ws = source.workspace();
  touch(sid, ws);
  save(sid, ws);
  return ws;
}

export function reset(sid) {
  if (source.isShared()) { source.invalidate(); return source.workspace(); }
  cache.delete(sid);
  try { unlinkSync(pathOf(sid)); } catch {}
  return create(sid);
}

let pending = new Map(), timer = null;
export function save(sid, ws) {
  if (source.isShared()) return; // the project directory is the store
  pending.set(sid, ws);
  if (timer) return;
  timer = setTimeout(() => {
    const batch = pending; pending = new Map(); timer = null;
    for (const [s, w] of batch) { try { writeFileSync(pathOf(s), JSON.stringify(w)); } catch (e) { console.error('save failed', e.message); } }
  }, 400);
}

// get-or-create + advance the clock, which is what every request wants
export function get(sid) {
  // One shared workspace when the workbench points at a real project: there is
  // only one truth on disk, and it is re-read whenever the files change.
  if (source.isShared()) {
    const ws = source.workspace();
    tick(ws);
    return ws;
  }
  let ws = load(sid);
  if (!ws) ws = create(sid);
  const before = ws.lastTick;
  tick(ws);
  if (ws.lastTick !== before) save(sid, ws);
  return ws;
}

export function sweepOld() {
  try {
    for (const f of readdirSync(DIR)) {
      const p = join(DIR, f);
      if (Date.now() - statSync(p).mtimeMs > MAX_AGE) unlinkSync(p);
    }
  } catch {}
}
