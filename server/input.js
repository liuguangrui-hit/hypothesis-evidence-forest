// Argument hygiene for /api/act. Everything a visitor can type lands in their
// workspace file, so it is length-capped, type-checked and never trusted raw.
import { b } from './seed.js';

export const LIMITS = { text: 2000, short: 200, id: 64, list: 64 };

export const str = (v, max = LIMITS.short) => (typeof v === 'string' ? v.slice(0, max).trim() : '');
// ids are keys into the workspace, never paths: no slashes, no dot segments
export const id = (v) => (typeof v === 'string' && /^[\w:-]{1,64}$/.test(v) && !v.includes('..') ? v : '');
export const num = (v, lo, hi, dflt = lo) => {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};
export const bool = (v) => v === true || v === 'true';
export const list = (v, f = id) => (Array.isArray(v) ? v.slice(0, LIMITS.list).map(f).filter(Boolean) : []);

// A bilingual field edited in one language keeps the other side, marked as
// out of date, instead of silently overwriting a translation with a copy.
export function patchText(prev, value, lang = 'zh', max = LIMITS.text) {
  const text = typeof value === 'string' ? value.slice(0, max) : null;
  if (text == null) {
    // an object {zh, en} may be supplied wholesale (imports, tests)
    if (value && typeof value === 'object') return b(str(value.zh, max), str(value.en, max));
    return prev;
  }
  const other = lang === 'zh' ? 'en' : 'zh';
  const base = prev && typeof prev === 'object' ? prev : b('', '');
  const out = { zh: base.zh || '', en: base.en || '' };
  out[lang] = text;
  if (!out[other] || out[other] === base[lang]) out[other] = text; // never leave a side empty
  return out;
}

export const asText = (v, max = LIMITS.text) => {
  if (typeof v === 'string') { const t = v.slice(0, max).trim(); return t ? b(t, t) : null; }
  if (v && typeof v === 'object') { const zh = str(v.zh, max), en = str(v.en, max); return zh || en ? b(zh || en, en || zh) : null; }
  return null;
};
