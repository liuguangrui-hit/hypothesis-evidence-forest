// Helpers every screen uses.
import { html, useState, useEffect, useCallback, useRef, view, act as rawAct, t, L, I, LANG, onLang } from '../core.js';
export * from '../core.js';

// Loads a screen view, re-loads it after any action, and polls while something is live.
export function useScreen(name, q = {}, onShell, poll = 3000) {
  const key = name + JSON.stringify(q);
  const [data, setData] = useState(null);
  const [err, setErr] = useState(null);
  const [, bump] = useState(0);
  useEffect(() => onLang(() => bump((x) => x + 1)), []);
  const load = useCallback(async () => {
    try { const d = await view(name, q); setData(d); onShell?.(d.shell); setErr(null); } catch (e) { setErr(e.message); }
  }, [key]);
  useEffect(() => { let live = true; view(name, q).then((d) => { if (!live) return; setData(d); onShell?.(d.shell); }).catch((e) => live && setErr(e.message)); return () => { live = false; }; }, [key]);
  const live = !!data && hasLive(data);
  useEffect(() => {
    if (!live) return;
    let id = null;
    const start = () => { if (!id) id = setInterval(load, poll); };
    const stop = () => { if (id) { clearInterval(id); id = null; } };
    // a hidden tab stops polling and catches up once on return
    const vis = () => { if (document.hidden) stop(); else { load(); start(); } };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', vis);
    return () => { stop(); document.removeEventListener('visibilitychange', vis); };
  }, [live, load, poll]);
  const act = useCallback(async (op, args) => { const r = await rawAct(op, args); await load(); return r; }, [load]);
  return { data, act, load, err };
}
function hasLive(d) {
  const s = d.shell?.counts;
  if (s && (s.running > 0 || s.queued > 0)) return true;
  return !!(d.survey?.job);
}

export const Loading = () => html`<div class="scroll"><div class="card"><div class="bd row" style="gap:10px;color:var(--mut2)"><span class="spin"></span>${L('载入中…', 'Loading…')}</div></div></div>`;
export const ErrBox = ({ msg }) => html`<div class="scroll"><div class="note warn">${L('读取失败：', 'Failed to load: ')}${msg}</div></div>`;

// standard screen frame: toolbar + scrolling body
export const Frame = ({ tools, children }) => html`
  <${Fr}>${tools && html`<div class="toolbar">${tools}</div>`}<div class="scroll">${children}</div><//>`;
const Fr = ({ children }) => children;
export const Fragment = Fr;

// Keep wide data tables scrollable without moving the whole phone viewport.
export const Table = ({ children, ...props }) => html`<div class="table-scroll" role="region" aria-label=${L('数据表格，可横向滑动', 'Data table, scroll horizontally')} tabIndex="0"><div class="table-hint">${L('← 左右滑动查看完整表格 →', '← Swipe to see the full table →')}</div><table ...${props}>${children}</table></div>`;

export const Card = ({ title, sub, right, children, foot, style }) => html`
  <div class="card" style=${style}>
    ${(title || right) && html`<div class="hd"><h2>${title}</h2>${sub && html`<span class="sub2">${sub}</span>`}<div class="grow"></div>${right}</div>`}
    <div class="bd">${children}</div>
    ${foot && html`<div class="ft">${foot}</div>`}
  </div>`;

export const Kpi = ({ k, v, s, warn, onClick }) => html`
  <div class=${'kpi' + (warn ? ' warn' : '') + (onClick ? ' click' : '')} onClick=${onClick} role=${onClick ? 'button' : undefined} tabIndex=${onClick ? 0 : undefined}
    onKeyDown=${onClick ? (e) => e.key === 'Enter' && onClick() : undefined}>
    <div class="k">${k}</div><div class="v">${v}</div>${s && html`<div class="s">${s}</div>`}</div>`;

export const Empty = ({ children }) => html`<div class="note" style="text-align:center;padding:22px">${children}</div>`;

// inline editable text — click to edit, blur/⌘↵ to save
export function Editable({ value, onSave, multiline, placeholder, style, cls }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState('');
  const ref = useRef(null);
  useEffect(() => { if (edit) { ref.current?.focus(); ref.current?.select?.(); } }, [edit]);
  if (!edit) return html`<div class=${cls} style=${{ cursor: 'text', minHeight: '1.4em', ...style }} title=${L('点击编辑', 'Click to edit')}
    onClick=${() => { setV(value || ''); setEdit(true); }}>${value || html`<span class="faint">${placeholder || L('点击编辑', 'Click to edit')}</span>`}</div>`;
  const save = async () => { setEdit(false); if (v !== value) await onSave(v); };
  const El = multiline ? 'textarea' : 'input';
  return html`<${El} ref=${ref} value=${v} rows=${multiline ? 4 : undefined} style=${style}
    onInput=${(e) => setV(e.target.value)} onBlur=${save}
    onKeyDown=${(e) => { if (e.key === 'Escape') setEdit(false); if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) save(); }} />`;
}

export const Row = ({ children, style }) => html`<div class="row wrap" style=${style}>${children}</div>`;
export const Evidence = ({ list, onExp }) => html`
  <div class="list" style="border:1px solid var(--line);border-radius:5px;overflow:hidden">
    ${list.length === 0 && html`<div class="item" style="cursor:default"><span class="faint small">${L('还没有证据', 'No evidence yet')}</span></div>`}
    ${list.map((e) => html`<div class="item" style=${{ cursor: onExp ? 'pointer' : 'default' }} onClick=${() => onExp?.(e.exp)}>
      <span class="mono tiny" style="width:54px;flex-shrink:0;color:var(--faint)">${e.exp}</span>
      <span class="small" style="flex-grow:1">${t(e.note)}</span>
      ${e.idea && html`<span class="tag">${e.idea}</span>`}
      <span class="num small" style=${{ color: e.delta > 0 ? 'var(--ok)' : e.delta < 0 ? 'var(--bad)' : 'var(--mut2)' }}>${e.delta > 0 ? '+' : ''}${e.delta}</span>
    </div>`)}
  </div>`;

// evidence meter, −2 … +2 with the 1.0 threshold marked
export const Meter = ({ v }) => {
  const x = Math.max(0, Math.min(1, (v + 2) / 4));
  return html`<div>
    <div style="position:relative;height:8px;background:var(--line2);border-radius:4px">
      <div style=${{ position: 'absolute', left: '50%', top: '-3px', bottom: '-3px', width: '1px', background: 'var(--faint2)' }}></div>
      <div style=${{ position: 'absolute', left: '75%', top: '-3px', bottom: '-3px', width: '1px', background: 'var(--ok)', opacity: .6 }}></div>
      <div style=${{ position: 'absolute', left: (x * 100) + '%', top: '-3px', width: '3px', height: '14px', borderRadius: '2px', background: v > 0 ? 'var(--ok)' : v < 0 ? 'var(--bad)' : 'var(--ink)', transform: 'translateX(-1.5px)' }}></div>
    </div>
    <div class="row tiny faint" style="justify-content:space-between;margin-top:4px"><span>−2.0</span><span>${L('阈值 +1.0 转 self_verified', 'threshold +1.0 → self_verified')}</span><span>+2.0</span></div>
  </div>`;
};
