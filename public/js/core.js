// Shared client core: language, API, formatting, small UI atoms.
import { html, render, useState, useEffect, useRef, useMemo, useCallback } from '../vendor/preact-htm.js';
export { html, render, useState, useEffect, useRef, useMemo, useCallback };

// ---------------------------------------------------------------- language
const LS = 'ais.lang';
export let LANG = (() => {
  try { const v = localStorage.getItem(LS); if (v === 'zh' || v === 'en') return v; } catch {}
  return (navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh' : 'en';
})();
const langSubs = new Set();
export function setLang(l) {
  LANG = l === 'zh' ? 'zh' : 'en';
  try { localStorage.setItem(LS, LANG); } catch {}
  document.documentElement.lang = LANG === 'zh' ? 'zh-CN' : 'en';
  langSubs.forEach((f) => f(LANG));
}
export const onLang = (f) => { langSubs.add(f); return () => langSubs.delete(f); };
// t: pick a field out of a {zh,en} pair — the server sends these everywhere
export const t = (v) => (v == null ? '' : typeof v === 'string' ? v : (v[LANG] ?? v.en ?? v.zh ?? ''));
// L: literal pair written inline in the client
export const L = (zh, en) => (LANG === 'zh' ? zh : en);

// ---------------------------------------------------------------- api
export async function view(screen, q = {}) {
  const u = new URL('/api/view', location.origin);
  u.searchParams.set('screen', screen);
  for (const [k, v] of Object.entries(q)) if (v != null) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error('view ' + r.status);
  return r.json();
}
export async function act(op, args = {}, then = [], q = {}) {
  const r = await fetch('/api/act', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ op, args, then, q, lang: LANG }),
  });
  const body = await r.json().catch(() => ({ ok: false, toast: { zh: '网络错误', en: 'Network error' } }));
  toast(t(body.toast), !body.ok);
  return body;
}
export async function reset() { await fetch('/api/reset', { method: 'POST' }); }

// ---------------------------------------------------------------- toasts
let toastSub = null, toastId = 0;
export const onToast = (f) => { toastSub = f; };
export function toast(msg, bad = false) { if (msg && toastSub) toastSub({ id: ++toastId, msg, bad }); }

// ---------------------------------------------------------------- format
export const pad = (n) => String(n).padStart(2, '0');
export function clock(ms) { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
export function hm(ms) { const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
export function md(ms) { const d = new Date(ms); return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
export function dur(ms) {
  if (ms == null) return '—';
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return L(`${s} 秒`, `${s}s`);
  const m = Math.round(s / 60);
  if (m < 60) return L(`${m} 分钟`, `${m} min`);
  const h = Math.floor(m / 60), r = m % 60;
  return L(`${h} 小时${r ? ` ${r} 分` : ''}`, `${h}h${r ? ` ${r}m` : ''}`);
}
export function ago(ms) {
  const d = Date.now() - ms;
  if (d < 60000) return L('刚刚', 'just now');
  if (d < 3600000) return L(`${Math.round(d / 60000)} 分钟前`, `${Math.round(d / 60000)} min ago`);
  if (d < 86400000) return L(`${Math.round(d / 3600000)} 小时前`, `${Math.round(d / 3600000)}h ago`);
  return md(ms);
}
export const pct = (x) => Math.round((x || 0) * 100) + '%';
export const sgn = (x) => (x > 0 ? '+' : '') + x;

// ---------------------------------------------------------------- labels
export const STATUS = {
  untested: ['未验证', 'untested'], active: ['进行中', 'active'], testing: ['实验中', 'testing'],
  self_verified: ['已自证', 'self_verified'], pending_review: ['待裁定', 'pending_review'],
  closed: ['已关闭', 'closed'], narrow: ['已收窄', 'narrowed'], inductive_unverified: ['归纳生成', 'induced'],
  lit_supported: ['文献支撑', 'lit-supported'],
  running: ['运行中', 'running'], queued: ['排队', 'queued'], done: ['已完成', 'done'], failed: ['失败', 'failed'],
  paused: ['已暂停', 'paused'], withdrawn: ['已撤下', 'withdrawn'], success: ['成功', 'success'], pruned: ['已剪枝', 'pruned'],
  available: ['available', 'available'], selected: ['selected', 'selected'], developed: ['developed', 'developed'],
  merged: ['merged', 'merged'], parked: ['parked', 'parked'], supported: ['已支撑', 'supported'],
  insufficient: ['证据不足', 'insufficient'], overclaim: ['过度声称', 'overclaim'], ok: ['证据充足', 'evidenced'],
  aligned: ['已对齐', 'aligned'], missing: ['缺证据', 'missing evidence'], affected: ['受裁定影响', 'verdict-affected'],
  todo: ['待写', 'to write'], figure: ['待补图', 'figure pending'], rescued: ['已救回', 'rescued'], review: ['待复核', 'needs review'],
  oom: ['OOM', 'OOM'], partial: ['缺种子', 'seed missing'], pending: ['待处理', 'pending'], broken: ['入口失效', 'entry broken'],
};
export const stLabel = (s) => (STATUS[s] ? L(STATUS[s][0], STATUS[s][1]) : s);
export const ROLE = { own_to_prove: ['own_to_prove', 'own_to_prove'], borrowed_assumption: ['borrowed_assumption', 'borrowed_assumption'] };
export const IDEA_COLOR = { 'P-011': '#64748B', 'P-013': '#64748B', 'P-014': '#2F5FE0', 'P-015': '#64748B', 'P-016': '#A21CAF', 'P-017': '#0F8F7B', 'P-018': '#BE123C', 'P-019': '#64748B', 'P-020': '#7C3AED', 'P-021': '#0891B2' };
export const ic = (id) => IDEA_COLOR[id] || '#64748B';

// ---------------------------------------------------------------- atoms
export const Icon = ({ d, s = 15, c = 'currentColor', w = 1.9 }) => html`
  <svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke=${c} stroke-width=${w} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
    dangerouslySetInnerHTML=${{ __html: d }}></svg>`;
export const ICONS = {
  logo: '<circle cx="12" cy="5" r="2.4"/><circle cx="5.5" cy="18" r="2.4"/><circle cx="18.5" cy="18" r="2.4"/><path d="M12 7.4v4.2M10.6 13.4 7 15.8M13.4 13.4 17 15.8"/>',
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z"/><path d="M9.5 21v-6h5v6"/>',
  board: '<path d="M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 8h6V4h-6z"/>',
  book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v16H6.5A2.5 2.5 0 0 0 4 21.5zM20 5.5A2.5 2.5 0 0 0 17.5 3H12v16h5.5a2.5 2.5 0 0 1 2.5 2.5z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 3.5 10.9c-.3.3-.5.7-.5 1.1H9c0-.4-.2-.8-.5-1.1A6 6 0 0 1 12 3z"/>',
  net: '<circle cx="5" cy="7" r="2.1"/><circle cx="5" cy="17" r="2.1"/><circle cx="12" cy="12" r="2.1"/><circle cx="19" cy="7" r="2.1"/><circle cx="19" cy="17" r="2.1"/><path d="M7 8.2 10.2 11M7 15.8 10.2 13M13.8 11 17 8.2M13.8 13 17 15.8"/>',
  flask: '<path d="M9 3v6.5L4.5 18A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.8-3L15 9.5V3M8 3h8M8.5 14h7"/>',
  gavel: '<path d="M4 6h16M4 12h16M4 18h9"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 13h6M9 17h4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  grid: '<path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m21 16-5-5-6 6-2-2-5 5"/>',
  chat: '<path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8z"/>',
  tree: '<path d="M12 3v4M6 21v-6M18 21v-6M6 15h12M12 7v8"/><rect x="9" y="1" width="6" height="4" rx="1"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  pause: '<path d="M8 4v16M16 4v16"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  check: '<path d="M4 12.5 9 17.5 20 6.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  warn: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4M12 17.2v.1"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
};
export const I = (k, p = {}) => html`<${Icon} d=${ICONS[k]} ...${p} />`;

export const Chip = ({ k, children, ...p }) => html`<span class=${'chip ' + (k || '')} ...${p}>${children}</span>`;
export const St = ({ s, label }) => html`<span class=${'status st-' + s}>${label || stLabel(s)}</span>`;
export const Dot = ({ c }) => html`<span class="dot" style=${{ background: c }}></span>`;
export const IdeaTag = ({ id, name, on, onClick }) => html`
  <span class="chip mono" onClick=${onClick} style=${{ cursor: onClick ? 'pointer' : 'default', background: on ? ic(id) + '18' : undefined, color: on ? ic(id) : undefined }}>
    <span class="dot" style=${{ background: ic(id), width: '6px', height: '6px' }}></span>${id}${name ? ' ' + t(name) : ''}</span>`;
export const Bar = ({ v, c, h = 6 }) => html`<div class="bar" style=${{ height: h + 'px' }}><i style=${{ width: Math.round((v || 0) * 100) + '%', background: c || undefined }}></i></div>`;
export const Score = ({ v }) => html`<span class="num" style=${{ color: v > 0 ? 'var(--ok)' : v < 0 ? 'var(--bad)' : 'var(--mut2)' }}>${sgn(v)}</span>`;

export function Modal({ title, children, onClose, actions }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, []);
  return html`<div class="scrim" onClick=${(e) => e.target === e.currentTarget && onClose()}>
    <div class="modal" role="dialog" aria-modal="true">
      <div class="hd">${title}</div>
      <div class="bd">${children}</div>
      ${actions && html`<div class="ft">${actions}</div>`}
    </div></div>`;
}

// tiny confirm-then-run helper for destructive buttons
export function useBusy() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn) => { setBusy(true); try { return await fn(); } finally { setBusy(false); } }, []);
  return [busy, run];
}
