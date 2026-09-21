// AI Scientist workbench — HTTP server (no framework, no runtime dependencies).
// © 2026 Nanyang Technological University, Singapore.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from './store.js';
import * as V from './views.js';
import { apply } from './actions.js';
import * as source from './source/index.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(ROOT, 'public');
const PORT = process.env.PORT || 8080;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8' };

// screens the SPA owns; anything else under / falls through to static or 404
const SCREENS = new Set(['', 'home', 'main', 'survey', 'trends', 'sparks', 'digest', 'ideas', 'panorama', 'graph', 'tree', 'experiments', 'exptree', 'sweep', 'runs', 'review', 'paper', 'claims', 'figures', 'rebuttal', 'events', 'about']);

const json = (res, code, body) => {
  const s = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(s);
};

function sidOf(req, res) {
  const cookie = req.headers.cookie || '';
  const m = /(?:^|;\s*)ais=([a-f0-9-]{8,64})/i.exec(cookie);
  if (m) return m[1];
  const sid = store.newSid();
  res.setHeader('set-cookie', `ais=${sid}; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax; HttpOnly`);
  return sid;
}

function buildView(ws, screen, q) {
  const base = { shell: V.shell(ws) };
  switch (screen) {
    case 'home': return { ...base, home: V.home(ws) };
    case 'main': return { ...base, main: V.main(ws) };
    case 'survey': return { ...base, survey: V.survey(ws) };
    case 'trends': return { ...base, trends: V.trends(ws) };
    case 'sparks': return { ...base, sparks: V.sparks(ws) };
    case 'digest': return { ...base, digest: V.digest(ws, q.id) };
    case 'ideas': return { ...base, ideas: V.ideas(ws) };
    case 'panorama': return { ...base, panorama: V.panorama(ws, q.h) };
    case 'graph': return { ...base, graph: V.graph(ws, q.h) };
    case 'tree': return { ...base, tree: V.tree(ws, q.idea, q.h) };
    case 'experiments': return { ...base, experiments: V.experiments(ws, q.e) };
    case 'exptree': return { ...base, exptree: V.exptree(ws, q.idea) };
    case 'sweep': return { ...base, sweep: V.sweep(ws) };
    case 'runs': return { ...base, runs: V.runs(ws) };
    case 'review': return { ...base, review: V.review(ws, q.h) };
    case 'paper': return { ...base, paper: V.paper(ws) };
    case 'claims': return { ...base, claims: V.claims(ws, q.c) };
    case 'figures': return { ...base, figures: V.figures(ws) };
    case 'rebuttal': return { ...base, rebuttal: V.rebuttal(ws) };
    case 'events': return { ...base, events: V.events(ws, q.kind) };
    default: return base;
  }
}

async function readBody(req, limit = 1e6) {
  let size = 0; const chunks = [];
  for await (const c of req) { size += c.length; if (size > limit) throw new Error('body too large'); chunks.push(c); }
  return Buffer.concat(chunks).toString('utf8');
}

async function serveStatic(req, res, url) {
  const rel = normalize(decodeURIComponent(url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const file = join(PUB, rel);
  if (!file.startsWith(PUB)) { res.writeHead(403).end('forbidden'); return true; }
  try {
    const st = await stat(file);
    if (!st.isFile()) return false;
    const ext = extname(file).toLowerCase();
    // Without a validator a browser keeps serving stale ES modules out of its
    // memory cache even under no-cache, so every asset carries an ETag.
    const etag = `W/"${st.size.toString(36)}-${Math.round(st.mtimeMs).toString(36)}"`;
    const headers = {
      'content-type': MIME[ext] || 'application/octet-stream',
      'cache-control': ['.png', '.jpg', '.svg', '.woff2', '.pdf'].includes(ext) ? 'public, max-age=86400' : 'no-cache',
      etag, 'last-modified': new Date(st.mtimeMs).toUTCString(),
    };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers); res.end(); return true; }
    const body = await readFile(file);
    res.writeHead(200, { ...headers, 'content-length': body.length });
    if (req.method === 'HEAD') res.end(); else res.end(body);
    return true;
  } catch { return false; }
}

const server = createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const path = u.pathname;

    // ---- API
    if (path.startsWith('/api/')) {
      const sid = sidOf(req, res);
      if (path === '/api/view' && req.method === 'GET') {
        const ws = store.get(sid);
        const screen = (u.searchParams.get('screen') || 'home').toLowerCase();
        if (!SCREENS.has(screen)) return json(res, 404, { error: 'unknown screen' });
        const q = Object.fromEntries(u.searchParams.entries());
        return json(res, 200, buildView(ws, screen, q));
      }
      if (path === '/api/act' && req.method === 'POST') {
        const ws = store.get(sid);
        let body;
        try { body = JSON.parse(await readBody(req)); } catch { return json(res, 400, { error: 'bad json' }); }
        const r = apply(ws, String(body.op || '').slice(0, 40), body.args || {}, body.lang === 'en' ? 'en' : 'zh');
        store.save(sid, ws);
        const screens = Array.isArray(body.then) ? body.then : [];
        const views = {};
        for (const s of screens) if (SCREENS.has(s)) Object.assign(views, buildView(ws, s, body.q || {}));
        return json(res, r.ok ? 200 : 409, { ...r, views: { ...views, shell: V.shell(ws) } });
      }
      if (path === '/api/reset' && req.method === 'POST') {
        store.reset(sid);
        return json(res, 200, { ok: true });
      }
      if (path === '/api/source' && req.method === 'GET') { store.get(sidOf(req, res)); return json(res, 200, source.describe()); }
      if (path === '/api/health') return json(res, 200, { ok: true, uptime: process.uptime(), source: source.MODE });
      return json(res, 404, { error: 'not found' });
    }

    // ---- static assets
    if (path !== '/' && await serveStatic(req, res, path)) return;

    // ---- SPA entry (any screen route)
    const first = path.split('/')[1] || '';
    if (SCREENS.has(first.toLowerCase())) {
      sidOf(req, res);
      const html = await readFile(join(PUB, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' });
      return res.end(html);
    }
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('server error');
  }
});

store.sweepOld();
setInterval(store.sweepOld, 6 * 3600 * 1000).unref?.();

server.listen(PORT, () => {
  console.log(`AI Scientist workbench → http://localhost:${PORT}`);
});
