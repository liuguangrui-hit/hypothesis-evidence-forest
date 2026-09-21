// Hypotheses: idea intake, the global panorama graph, shared-hypothesis view, single-idea tree.
import { html, useState, useEffect, useRef, useMemo, useScreen, Frame, Card, Kpi, Loading, Empty, Editable, Evidence, Meter,
  t, L, I, St, Chip, Bar, Score, IdeaTag, ic, dur, ago, clock, stLabel } from './common.js';
import { go, qs } from '../app.js';
const F = ({ children }) => children;

// ---------------------------------------------------------------- idea intake
export function Ideas({ q, onShell }) {
  const { data, act } = useScreen('ideas', {}, onShell);
  if (!data) return html`<${Loading} />`;
  const d = data.ideas, c = d.cand;
  if (d.empty) return html`<${Frame}>
    <${Card} title=${L('Idea 立项', 'Idea intake')} sub=${L(`进行中 ${d.counts.running} · 已收束 ${d.counts.done}`, `${d.counts.running} running · ${d.counts.done} wrapped up`)}>
      <${Empty}>${L('当前没有待立项的候选。候选来自 spark：在趋势页从空白或矛盾生成 spark，选中后回到这里展开成假设树。',
        'No candidate is waiting. Candidates come from sparks: generate one from a gap or contradiction on the trends screen, select it, then expand it into a hypothesis tree here.')}<//>
      <div class="row" style="margin-top:11px"><a class="btn sm" href="/sparks">${L('去看 spark', 'Open sparks')}</a>
        <a class="btn sm" href="/panorama">${L(`已有 ${d.extracted} 条假设在网`, `${d.extracted} hypotheses in the network`)}</a></div>
    <//><//>`;
  return html`<${Frame} tools=${html`
    <span class="chip">${L('候选', 'Candidates')} ${d.counts.candidates}</span>
    <span class="chip">${L('进行中', 'Running')} ${d.counts.running}</span>
    <span class="chip">${L('已收束', 'Wrapped up')} ${d.counts.done}</span>
    <div class="grow"></div>
    <a class="btn sm" href="/sparks">${L(`从 spark 立项 · ${d.sparksAvailable} 条 available`, `From a spark · ${d.sparksAvailable} available`)}</a>
    <button class="btn sm" onClick=${() => act('idea.pick', { dir: 'next' })}>${L('换一批候选', 'Another candidate')}</button>`}>
    <div class="cols2">
      <div class="col">
        <${Card} title=${html`<span class="mono">${c.id}</span> <span style="font-weight:400">${t(c.name)}</span>`}
          sub=${L('候选 · 未立项', 'candidate · not launched')} right=${html`<span class="chip mono">${c.spark}</span>`}>
          <div class="tiny faint" style="margin-bottom:5px">${L('主张 · 可直接编辑', 'Claim · editable')}</div>
          <${Editable} value=${t(c.claim)} multiline=${true} cls="note" style=${{ fontSize: '13px', lineHeight: 1.8 }}
            onSave=${(v) => act('idea.claim', { claim: v })} />
          <div class="cols3" style="margin-top:12px">
            <${Kpi} k=${L('新颖性', 'Novelty')} v=${d.novelty} />
            <${Kpi} k=${L('可行性', 'Feasibility')} v=${d.feasibility} />
            <${Kpi} k=${L('与在跑 idea 重叠', 'Overlap with running')} v=${d.overlap} />
          </div>
        <//>

        <${Card} title=${L('立项时的假设清单', 'Hypotheses at launch')} sub=${L('已在网络里的假设可直接挂上，不重复验证', 'Anything already in the network can be attached instead of re-verified')}
          right=${html`<span class="chip">${L(`复用 ${d.reuse} · 新建 ${d.fresh}`, `${d.reuse} reused · ${d.fresh} new`)}</span>`}
          foot=${html`
            <button class="btn sm acc" onClick=${async () => { const r = await act('idea.launch', {}); if (r.ok) go('/tree?idea=' + (r.idea || c.id)); }}>
              ${L('立项并展开为假设树', 'Launch and expand into a tree')}</button>
            <button class="btn sm" onClick=${() => act('idea.park', {})}>${L('存为候选', 'Save as candidate')}</button>
            <div class="grow"></div>
            <span class="tiny faint">${L('立项后并行执行，与现有 idea 共用 executor 槽位', 'Once launched it runs in parallel, sharing the executor slots')}</span>`}>
          <table><tbody>
            ${c.plan.map((p, i) => html`<tr>
              <td style="width:52px" class="mono b">${p.hyp || L('新', 'new')}</td>
              <td>${t(p.hyp ? p.claim : p.claim)}
                ${p.hyp && html`<div class="row" style="margin-top:4px">
                  ${(p.ideas || []).map((x) => html`<${IdeaTag} id=${x} />`)}
                  ${p.verified ? html`<span class="chip ok">${L(`已自证 ${p.score > 0 ? '+' : ''}${p.score}`, `self_verified ${p.score > 0 ? '+' : ''}${p.score}`)}</span>`
                    : html`<${St} s=${p.status} />`}
                </div>`}</td>
              <td style="width:190px;text-align:right">
                <div class="seg">
                  ${[['reuse', L('复用', 'Reuse')], ['new', L('新建', 'New')], ['skip', L('跳过', 'Skip')]].map(([m, lab]) => html`
                    <button class=${p.mode === m ? 'on' : ''} disabled=${m === 'reuse' && !p.hyp}
                      onClick=${() => act('idea.plan', { i, mode: m })}>${lab}</button>`)}
                </div>
              </td>
            </tr>`)}
          </tbody></table>
        <//>

        <${Card} title=${L('文献池', 'Literature pool')} sub=${L('与当前候选相关 · 勾选后可抽假设', 'related to this candidate · tick to extract hypotheses')}
          right=${html`<button class="btn xs" onClick=${() => act('idea.extract', {})}>${L('从选中文献抽假设', 'Extract from selected')}</button>`}>
          <table><tbody>
            ${d.lit.map((p) => html`<tr class="clickable" onClick=${() => act('idea.lit', { id: p.id })}>
              <td style="width:26px">${p.selected ? I('check', { s: 14, c: 'var(--acc)' }) : html`<span style="display:inline-block;width:13px;height:13px;border:1px solid var(--line);border-radius:3px"></span>`}</td>
              <td>${t(p.title)}</td>
              <td style="width:100px" class="tiny faint">${p.venue}</td>
              <td style="width:130px">${p.extracted ? html`<span class="chip ok">${L(`已抽出 ${p.hyps.length} 条`, `${p.hyps.length} extracted`)}<br/></span>` : html`<span class="chip">${L('待抽取', 'to extract')}</span>`}
                <div class="mono tiny faint">${p.hyps.join(' ')}</div></td>
            </tr>`)}
          </tbody></table>
        <//>
      </div>

      <div class="col">
        <${Card} title=${L('与在跑 idea 的关系', 'Relation to running projects')}>
          ${d.overlaps.map((o) => html`
            <div style="padding:9px 0;border-bottom:1px solid var(--line2)">
              <div class="row"><${IdeaTag} id=${o.idea} name=${o.name} /><div class="grow"></div>
                <span class="tiny mut">${L(`重叠 ${o.shared.length} / ${o.of} 条`, `${o.shared.length} / ${o.of} overlap`)}</span></div>
              <div class="mono tiny mut" style="margin-top:4px">${o.shared.join(' ') || L('无共享', 'none shared')}</div>
            </div>`)}
        <//>
        <${Card} title=${L('立项成本估计', 'Cost to start')}>
          <div class="row"><span class="big">${d.cost}</span><span class="mut">${L('个新实验', 'new experiments')}</span></div>
          <div class="note" style="margin-top:9px">${L(`若不复用已有证据，同样的主张需要 ${d.costNoReuse} 个实验。复用的 ${d.reuse} 条假设已被其他 idea 验证过。`,
            `Without reuse the same claim would need ${d.costNoReuse} experiments. The ${d.reuse} reused hypotheses were already verified by other projects.`)}</div>
        <//>
        <${Card} title=${L('展开后的形态', 'Shape after expansion')}>
          <pre class="mono tiny" style="margin:0;line-height:1.9;color:var(--ink2);white-space:pre-wrap">${c.id}
${c.plan.filter((p) => p.mode !== 'skip').map((p, i, a) => `${i === a.length - 1 ? '└─' : '├─'} ${p.hyp || 'H-new'} ${p.mode === 'reuse' ? '✓ ' + L('借用', 'borrowed') : L('untested', 'untested')}`).join('\n')}</pre>
          <div class="note" style="margin-top:9px">${L('同一条假设在不同 idea 中的层级，由各自的论证结构决定。',
            'Where a hypothesis sits in a tree is decided by that project’s own argument, not by the hypothesis.')}</div>
        <//>
        <${Card} title=${L('已建库', 'Extracted so far')}>
          <div class="row"><span class="big">${d.extracted}</span><span class="mut small">${L('条假设在网', 'hypotheses in the network')}</span></div>
          <div class="row" style="margin-top:6px"><span class="num">${d.sharedCount}</span><span class="mut small">${L('条被 2 个以上 idea 引用', 'cited by 2+ projects')}</span></div>
        <//>
      </div>
    </div>
  <//>`;
}

// ---------------------------------------------------------------- panorama graph
const STATUS_COLOR = {
  untested: '#FFFFFF', active: '#2F5FE0', testing: '#2F5FE0', self_verified: '#0F8F7B', pending_review: '#FFFFFF',
  closed: '#FFFFFF', narrow: '#0F8F7B', inductive_unverified: '#FFFFFF', lit_supported: '#FFFFFF',
};
const STATUS_STROKE = {
  untested: '#B6BDC7', active: '#2F5FE0', testing: '#2F5FE0', self_verified: '#0F8F7B', pending_review: '#D97706',
  closed: '#D0D5DD', narrow: '#0F8F7B', inductive_unverified: '#4338CA', lit_supported: '#A21CAF',
};

export function Panorama({ q, onShell }) {
  const { data, act } = useScreen('panorama', { h: q.h }, onShell);
  const [color, setColor] = useState('status');
  const [hidden, setHidden] = useState({});
  const [labels, setLabels] = useState(true);
  if (!data) return html`<${Loading} />`;
  const d = data.panorama;
  const sel = d.sel;
  if (d.empty) return html`<${Frame}><${Card} title=${L('假设网络', 'Hypothesis network')}>
    <${Empty}>${L('还没有假设。接入真实项目后，这里显示 tree.json 里的全部 idea 与假设。',
      'No hypotheses yet. Wired to a real project this shows every idea and hypothesis in tree.json.')}<//><//><//>`;
  return html`<${Frame} tools=${html`
    <span class="tiny faint">${L('着色', 'Colour')}</span>
    <div class="seg"><button class=${color === 'status' ? 'on' : ''} onClick=${() => setColor('status')}>${L('按状态', 'By status')}</button>
      <button class=${color === 'idea' ? 'on' : ''} onClick=${() => setColor('idea')}>${L('按 idea', 'By project')}</button></div>
    <button class=${'btn sm' + (labels ? ' acc' : '')} onClick=${() => setLabels(!labels)}>${L('节点标签', 'Labels')}</button>
    <div class="grow"></div>
    <span class="tiny faint hide-s">${L('滚轮缩放 · 拖拽平移 · 拖节点可移动', 'Scroll to zoom · drag to pan · drag a node to move it')}</span>`}>
    <div class="cols2">
      <${Graph} d=${d} color=${color} hidden=${hidden} labels=${labels} sel=${sel?.id} key="g" 
        onPick=${(id) => go(qs({ h: id }))} />
      <div class="col">
        <div class="kpis">
          <${Kpi} k=${L('假设', 'Hypotheses')} v=${d.counts.hyps} /><${Kpi} k=${L('边', 'Edges')} v=${d.counts.edges} />
          <${Kpi} k=${L('共享', 'Shared')} v=${d.counts.shared} /><${Kpi} k="idea" v=${d.counts.ideas} />
        </div>
        <${Card} title=${L('状态', 'Status')} sub=${L('点一行可隐藏该类', 'click a row to hide that class')}>
          ${Object.entries(d.byStatus).sort((a, b) => b[1] - a[1]).map(([s, n]) => html`
            <div class="row" style=${{ padding: '4px 0', cursor: 'pointer', opacity: hidden[s] ? .4 : 1 }} onClick=${() => setHidden({ ...hidden, [s]: !hidden[s] })}>
              <span style=${{ width: '11px', height: '11px', borderRadius: '50%', background: STATUS_COLOR[s], border: '2px solid ' + STATUS_STROKE[s] }}></span>
              <span class="small">${stLabel(s)}</span><div class="grow"></div><span class="num small">${n}</span></div>`)}
          <div class="tiny faint" style="margin-top:8px">${L('粗圈＝被多个 idea 引用 · 蓝虚线＝归纳边 · 灰虚线＝跨 idea 依赖',
            'Thick ring = cited by several projects · blue dashes = induced edge · grey dashes = cross-project dependency')}</div>
        <//>
        ${sel ? html`<${HypPanel} sel=${sel} act=${act} />` : html`<${Card} title=${L('选择一个节点', 'Pick a node')}><${Empty}>${L('点图里的任意节点查看详情。', 'Click any node in the graph.')}<//><//>`}
        <${Card} title=${L('活动', 'Activity')}>
          ${d.events.map((e) => html`<div class="row" style="padding:4px 0">
            <span class="mono tiny faint" style="width:40px">${clock(e.t).slice(11)}</span><span class="small">${t(e.title)}</span></div>`)}
        <//>
      </div>
    </div>
  <//>`;
}

function Graph({ d, color, hidden, labels, sel, onPick }) {
  const wrap = useRef(null);
  const box = d.bounds;
  const [vb, setVb] = useState({ x: box.x, y: box.y, w: box.w });
  const [pos, setPos] = useState({});
  const drag = useRef(null);
  const [h, setH] = useState(660);
  const [w, setW] = useState(900);
  useEffect(() => {
    const f = () => { setH(Math.max(420, innerHeight - 190)); setW(wrap.current?.clientWidth || 900); };
    f(); addEventListener('resize', f); return () => removeEventListener('resize', f);
  }, []);
  const fitted = useRef(false);
  useEffect(() => {
    if (fitted.current || !w || !h) return;
    fitted.current = true;
    const aspect = h / Math.max(1, w);
    const width = Math.max(box.w, box.h / Math.max(0.2, aspect));
    setVb({ x: box.x - (width - box.w) / 2, y: box.y - ((width * aspect) - box.h) / 2, w: width });
  }, [w, h, box.w, box.h]);
  const at = (n) => pos[n.id] || { x: n.x, y: n.y };
  const nodes = d.nodes.filter((n) => !hidden[n.status]);
  const ids = new Set(nodes.map((n) => n.id));
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const onWheel = (e) => {
    e.preventDefault();
    const k = e.deltaY > 0 ? 1.12 : 1 / 1.12;
    const r = wrap.current.getBoundingClientRect();
    const mx = vb.x + ((e.clientX - r.left) / r.width) * vb.w, my = vb.y + ((e.clientY - r.top) / r.height) * vbh();
    const nw = Math.min(3600, Math.max(240, vb.w * k));
    setVb({ ...vb, w: nw, x: mx - (mx - vb.x) * (nw / vb.w), y: my - (my - vb.y) * (nw / vb.w) });
  };
  const vbh = () => vb.w * (h / Math.max(1, w));
  const pt = (e) => {
    const r = wrap.current.getBoundingClientRect();
    return { x: vb.x + ((e.clientX - r.left) / r.width) * vb.w, y: vb.y + ((e.clientY - r.top) / r.height) * vbh() };
  };
  const down = (e, node) => {
    e.preventDefault();
    const p = pt(e);
    drag.current = node ? { node, dx: p.x - at(node).x, dy: p.y - at(node).y, moved: false } : { pan: true, x: e.clientX, y: e.clientY, vb: { ...vb }, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    const g = drag.current;
    if (!g) return;
    g.moved = true;
    if (g.pan) {
      const r = wrap.current.getBoundingClientRect();
      setVb({ ...g.vb, x: g.vb.x - ((e.clientX - g.x) / r.width) * g.vb.w, y: g.vb.y - ((e.clientY - g.y) / r.height) * (g.vb.w * (h / Math.max(1, w))) });
    } else {
      const p = pt(e);
      setPos((s) => ({ ...s, [g.node.id]: { x: p.x - g.dx, y: p.y - g.dy } }));
    }
  };
  const up = (e) => {
    const g = drag.current; drag.current = null;
    if (g && g.node && !g.moved) onPick(g.node.id);
  };
  // contain the whole graph: widen the view when the content is taller than the pane
  const fit = () => {
    const aspect = h / Math.max(1, w);
    const width = Math.max(box.w, box.h / Math.max(0.2, aspect));
    setVb({ x: box.x - (width - box.w) / 2, y: box.y - ((width * aspect) - box.h) / 2, w: width });
  };
  const zoom = (k) => setVb((v) => ({ ...v, w: v.w * k, x: v.x + (v.w * (1 - k)) / 2, y: v.y + (v.w * (h / Math.max(1, w)) * (1 - k)) / 2 }));

  return html`<div class="canvas" ref=${wrap} style=${{ height: h + 'px' }} onWheel=${onWheel}>
    <svg viewBox=${`${vb.x} ${vb.y} ${vb.w} ${vb.w * (h / Math.max(1, w))}`} width="100%" height=${h} class=${drag.current?.pan ? 'drag' : ''}
      onPointerDown=${(e) => down(e, null)} onPointerMove=${move} onPointerUp=${up} onPointerLeave=${up} role="img"
      aria-label=${L('假设网络图', 'Hypothesis network graph')}>
      <g>${d.ideas.filter((i) => d.centers[i.id]).map((i) => {
        const c = d.centers[i.id];
        const mine = nodes.filter((n) => n.ideas.includes(i.id));
        if (!mine.length) return null;
        const cx = mine.reduce((s, n) => s + at(n).x, 0) / mine.length, cy = mine.reduce((s, n) => s + at(n).y, 0) / mine.length;
        const r = Math.max(70, Math.max(...mine.map((n) => Math.hypot(at(n).x - cx, at(n).y - cy))) + 34);
        return html`<g><circle cx=${cx} cy=${cy} r=${r} fill=${ic(i.id) + '0c'} stroke=${ic(i.id) + '22'} stroke-dasharray=${i.status === 'running' ? '' : '5 5'} />
          <text x=${cx} y=${cy + r - 9} text-anchor="middle" font-size="12" font-weight="600" fill=${ic(i.id)} style="pointer-events:none">${i.id} ${t(i.name)}</text></g>`;
      })}</g>
      <g>${d.edges.filter((e) => ids.has(e.a) && ids.has(e.b)).map((e) => {
        const a = at(byId[e.a]), b2 = at(byId[e.b]);
        const st = e.kind === 'induced' ? { stroke: '#4338CA', 'stroke-dasharray': '4 4', 'stroke-width': 1.2 }
          : e.kind === 'cross' ? { stroke: '#98A2B3', 'stroke-dasharray': '3 5', 'stroke-width': 1 }
          : { stroke: '#C4CAD4', 'stroke-width': 1.3 };
        return html`<line x1=${a.x} y1=${a.y} x2=${b2.x} y2=${b2.y} ...${st} />`;
      })}</g>
      <g>${nodes.map((n) => {
        const p = at(n), shared = n.ideas.length > 1, r = n.root ? 9 : shared ? 8 : 6.5;
        const fill = color === 'idea' ? ic(n.ideas[0]) : STATUS_COLOR[n.status] || '#fff';
        const stroke = color === 'idea' ? ic(n.ideas[0]) : STATUS_STROKE[n.status] || '#98A2B3';
        const on = sel === n.id;
        return html`<g class="gnode" transform=${`translate(${p.x},${p.y})`} onPointerDown=${(e) => { e.stopPropagation(); down(e, n); }}
          onPointerMove=${move} onPointerUp=${up} tabIndex="0" onKeyDown=${(e) => e.key === 'Enter' && onPick(n.id)}>
          ${on && html`<circle r=${r + 6} fill="none" stroke="#2F5FE0" stroke-width="1.6" opacity=".55" />`}
          ${n.root
            ? html`<rect x=${-r} y=${-r} width=${r * 2} height=${r * 2} rx="2.5" fill=${fill} stroke=${stroke} stroke-width=${shared ? 3 : 2} />`
            : html`<circle r=${r} fill=${fill} stroke=${stroke} stroke-width=${shared ? 3 : 2} stroke-dasharray=${n.induced ? '3 2' : ''} />`}
          ${n.status === 'testing' && html`<circle r=${r + 3.5} fill="none" stroke="#2F5FE0" stroke-width="1" opacity=".6" class="pulse" />`}
          ${labels && html`<text y=${r + 11} text-anchor="middle" font-size="9.5" fill="#667085" style="pointer-events:none;user-select:none">${n.id}</text>`}
          <title>${n.id} · ${t(n.claim)}</title>
        </g>`;
      })}</g>
    </svg>
    <div class="zoomer">
      <button class="btn xs" onClick=${() => zoom(1.25)} aria-label="zoom out">−</button>
      <button class="btn xs" onClick=${() => zoom(0.8)} aria-label="zoom in">+</button>
      <button class="btn xs" onClick=${fit}>${L('适配', 'Fit')}</button>
      <button class="btn xs" onClick=${() => setPos({})}>${L('复位', 'Reset')}</button>
    </div>
  </div>`;
}

// shared right-hand panel for a hypothesis
export function HypPanel({ sel, act, compact }) {
  const [adding, setAdding] = useState(false);
  const [txt, setTxt] = useState('');
  return html`<${Card} title=${html`<span class="mono">${sel.id}</span>`} right=${html`<${Score} v=${sel.score} />`}
    sub=${html`<${St} s=${sel.status} />`}>
    <div style="line-height:1.7">${t(sel.claim)}</div>
    ${sel.warrant && html`<div class="note" style="margin-top:8px"><span class="chip">WARRANT</span> ${t(sel.warrant)}</div>`}
    ${sel.narrow && html`<div class="note acc" style="margin-top:8px">${L('裁定已收窄适用范围：', 'The verdict narrowed its scope: ')}${t(sel.narrow)}</div>`}
    <div class="hr"></div>
    <div class="tiny faint">${L(`被 ${sel.ideas.length} 个 idea 引用 · 下游 ${sel.downstream.length}`, `cited by ${sel.ideas.length} project(s) · ${sel.downstream.length} downstream`)}</div>
    ${sel.ideas.map((p) => html`
      <a class="row" href=${'/tree?idea=' + p.idea + '&h=' + sel.id} style="padding:6px 0;color:inherit;border-bottom:1px solid var(--line2)">
        <span style=${{ width: '3px', alignSelf: 'stretch', background: ic(p.idea), borderRadius: '2px' }}></span>
        <span class="mono b small">${p.idea}</span><span class="small mut">${t(p.name)}</span>
        <div class="grow"></div>
        <span class="tiny mut">${p.role.kind === 'root' ? L('根前提', 'root premise') : p.role.leaf ? L(`第 ${p.role.depth} 层 · 叶子`, `layer ${p.role.depth} · leaf`) : L(`第 ${p.role.depth} 层`, `layer ${p.role.depth}`)}</span>
        ${p.role.frozen && html`<span class="chip bad">${L('已冻结', 'frozen')}</span>`}
      </a>`)}
    ${sel.evidence.length > 0 && html`<${F}>
      <div class="hr"></div>
      <div class="row"><span class="tiny faint">${L('证据 · 跨 idea 累积', 'Evidence · accumulated across projects')}</span><div class="grow"></div><${Score} v=${sel.score} /></div>
      <div style="margin-top:7px"><${Evidence} list=${sel.evidence} onExp=${(e) => e.startsWith('e_') && go('/experiments?e=' + e)} /></div>
      <div style="margin-top:9px"><${Meter} v=${sel.score} /></div>
    <//>`}
    ${sel.running.length > 0 && html`<div class="note acc" style="margin-top:9px">
      ${sel.running.map((r) => html`<div class="row"><span class="spin"></span><span class="mono small">${r.id}</span><span class="small">${stLabel(r.status)}</span>
        <div class="grow"></div><span class="small">${Math.round((r.prog || 0) * 100)}%</span></div>`)}</div>`}
    <div class="hr"></div>
    <div class="row">
      ${sel.status !== 'pending_review' && html`<button class="btn sm acc" onClick=${() => act('exp.run', { hyp: sel.id })}>${L('运行实验', 'Run an experiment')}</button>`}
      <button class="btn sm" onClick=${() => setAdding(!adding)}>${L('添加子假设', 'Add a sub-hypothesis')}</button>
      ${sel.status === 'pending_review'
        ? html`<a class="btn sm pri" href=${'/review?h=' + sel.id}>${L('去裁定', 'Rule on it')}</a>`
        : html`<button class="btn sm" onClick=${() => act('hyp.submit', { hyp: sel.id })}>${L('提交裁定', 'Submit for verdict')}</button>`}
      <button class="btn sm" onClick=${() => act('hyp.borrow', { hyp: sel.id, idea: sel.ideas[0]?.idea })}>${L('标为借用前提', 'Mark as borrowed')}</button>
      <a class="btn sm" href=${'/tree?idea=' + (sel.ideas[0]?.idea || 'P-014') + '&h=' + sel.id}>${L('树视图', 'Tree view')}</a>
    </div>
    ${adding && html`<div class="row" style="margin-top:9px">
      <input type="text" value=${txt} placeholder=${L('新假设的主张…', 'The new hypothesis’ claim…')} onInput=${(e) => setTxt(e.target.value)}
        onKeyDown=${async (e) => { if (e.key === 'Enter' && txt.trim()) { await act('hyp.addChild', { idea: sel.ideas[0]?.idea, parentHyp: sel.id, claim: txt.trim() }); setTxt(''); setAdding(false); } }} />
      <button class="btn sm acc" disabled=${!txt.trim()} onClick=${async () => { await act('hyp.addChild', { idea: sel.ideas[0]?.idea, parentHyp: sel.id, claim: txt.trim() }); setTxt(''); setAdding(false); }}>${L('添加', 'Add')}</button>
    </div>`}
  <//>`;
}

// ---------------------------------------------------------------- shared hypotheses
export function GraphScreen({ q, onShell }) {
  const { data, act } = useScreen('graph', { h: q.h }, onShell);
  const [only, setOnly] = useState(true);
  if (!data) return html`<${Loading} />`;
  const d = data.graph, sel = d.sel;
  return html`<${Frame} tools=${html`
    <span class="tiny faint">${L('显示', 'Show')}</span>
    ${d.ideas.map((i) => html`<${IdeaTag} id=${i.id} name=${i.name} on=${true} />`)}
    <span class="vr"></span><span class="chip acc">${L('仅显示共享假设', 'Shared hypotheses only')}</span>
    <div class="grow"></div>
    <span class="chip">${L('一次实验平均服务', 'Ideas served per run')} ${d.perExp}</span>`}>
    <div class="cols2b">
      <${Card} title=${L('共享假设清单', 'Shared hypotheses')} sub=${L(`被两个以上 idea 引用的 ${d.list.length} 条`, `${d.list.length} cited by two or more projects`)}>
        <div class="list" style="margin:-13px -14px">
          ${d.list.map((h) => html`
            <div class=${'item' + (sel?.id === h.id ? ' on' : '')} onClick=${() => go(qs({ h: h.id }))}>
              <div style="flex-grow:1">
                <div class="row"><span class="mono b">${h.id}</span><${Score} v=${h.score} /><div class="grow"></div><${St} s=${h.status} /></div>
                <div class="small" style="margin:5px 0">${t(h.claim)}</div>
                <div class="row">${h.places.map((p) => html`
                  <span class="chip mono" style=${{ background: ic(p.idea) + '14', color: ic(p.idea) }}>${p.idea} · ${p.role.kind === 'root' ? L('根', 'root') : p.role.leaf ? L('叶', 'leaf') : L(`第 ${p.role.depth} 层`, `L${p.role.depth}`)}</span>`)}</div>
              </div>
            </div>`)}
        </div>
      <//>
      ${sel ? html`<div class="col">
        <${Card} title=${html`<span class="mono">${sel.id}</span> <span class="chip acc">${L(`共享 · ${sel.ideas.length} idea`, `shared · ${sel.ideas.length} projects`)}</span>`}
          sub=${html`<${St} s=${sel.status} />`} right=${html`<${Score} v=${sel.score} />`}>
          <div style="font-size:14px;line-height:1.7">${t(sel.claim)}</div>
          <div class="hr"></div>
          <div class="tiny faint" style="margin-bottom:7px">${L('在各 idea 中的位置 · 层级各不相同', 'Its place in each project — different every time')}</div>
          <div class="cols3">
            ${sel.ideas.map((p) => html`
              <div style=${{ padding: '12px', border: '1px solid var(--line)', borderRadius: '6px', borderLeft: '3px solid ' + ic(p.idea) }}>
                <div class="row"><span class="mono b">${p.idea}</span><span class="tiny mut">${t(p.name)}</span></div>
                <div class="b small" style="margin-top:7px">${p.role.kind === 'root' ? L('根前提', 'root premise') : p.role.leaf ? L('叶子', 'leaf') : L(`第 ${p.role.depth} 层`, `layer ${p.role.depth}`)}${p.role.verified ? L(' · 已证', ' · verified') : ''}</div>
                <div class="tiny mut" style="margin-top:5px">${p.role.role === 'borrowed_assumption'
                  ? (p.role.kind === 'root' ? L('直接采纳，不再往下拆 · 本 idea 的出发点', 'Adopted as given, never decomposed — this project’s starting point')
                    : L('作为已验证前提引用，无需重跑实验', 'Cited as a verified premise; no re-run needed'))
                  : L('本 idea 自证', 'Proven inside this project')}</div>
                <a class="btn xs" style="margin-top:9px" href=${'/tree?idea=' + p.idea + '&h=' + sel.id}>${L('在树中定位', 'Locate in the tree')}</a>
              </div>`)}
          </div>
        <//>
        <${Card} title=${L('证据 · 跨 idea 累积', 'Evidence · accumulated across projects')} right=${html`<${Score} v=${sel.score} />`}>
          <${Evidence} list=${sel.evidence} onExp=${(e) => e.startsWith('e_') && go('/experiments?e=' + e)} />
          <div style="margin-top:11px"><${Meter} v=${sel.score} /></div>
          ${sel.status === 'pending_review' && html`<div class="note warn" style="margin-top:10px">
            ${L('三个 idea 的实验都写在这一条假设上，结论互相矛盾，已升级到裁定。', 'Runs from every project wrote onto this one hypothesis and the conclusions contradict; it was escalated to a verdict.')}</div>`}
          <div class="row" style="margin-top:11px">
            ${sel.status === 'pending_review' && html`<a class="btn sm pri" href=${'/review?h=' + sel.id}>${L('去裁定 →', 'Rule on it →')}</a>`}
            <button class="btn sm acc" onClick=${() => act('exp.run', { hyp: sel.id })}>${L('为此假设排实验', 'Queue an experiment')}</button>
            <a class="btn sm" href=${'/panorama?h=' + sel.id}>${L('在网络中查看', 'See it in the network')}</a>
          </div>
        <//>
      </div>` : html`<${Empty}>${L('没有跨 idea 共享的假设。', 'No hypothesis is shared across projects.')}<//>`}
    </div>
  <//>`;
}

// ---------------------------------------------------------------- single-idea tree
export function Tree({ q, onShell }) {
  const { data, act } = useScreen('tree', { idea: q.idea, h: q.h }, onShell);
  const [view2, setView2] = useState('tree');
  if (!data) return html`<${Loading} />`;
  const d = data.tree, sel = d.sel;
  const rows = d.nodes;
  return html`<${Frame} tools=${html`
    <select style="width:auto" value=${d.idea} onChange=${(e) => go('/tree?idea=' + e.target.value)}>
      ${d.ideas.map((i) => html`<option value=${i.id}>${i.id} · ${t(i.name)}</option>`)}
    </select>
    <div class="seg"><button class=${view2 === 'tree' ? 'on' : ''} onClick=${() => setView2('tree')}>${L('树', 'Tree')}</button>
      <button class=${view2 === 'table' ? 'on' : ''} onClick=${() => setView2('table')}>${L('表', 'Table')}</button></div>
    <span class="chip">${L('节点', 'Nodes')} ${rows.length}</span>
    <div class="grow"></div>
    <button class="btn sm" onClick=${() => act('hyp.addChild', { idea: d.idea, parentHyp: null, claim: { zh: '新的根假设', en: 'A new root hypothesis' } })}>
      ${I('plus', { s: 12 })}${L('在根下添加假设', 'Add a root hypothesis')}</button>`}>
    <div class="cols2">
      <${Card} title=${L('假设树', 'Hypothesis tree')} sub=${L('右列 = 引用 idea 数', 'right column = projects citing it')}>
        ${view2 === 'tree' ? html`<div>
          ${rows.map((n) => html`
            <div class=${'row' + (sel?.id === n.hyp ? ' on' : '')} style=${{ padding: '7px 8px', paddingLeft: (8 + n.depth * 22) + 'px', borderRadius: '5px', cursor: 'pointer', background: sel?.id === n.hyp ? 'var(--accbg)' : undefined, opacity: n.frozen ? .5 : 1 }}
              onClick=${() => go(qs({ h: n.hyp }))}>
              <span class="mono tiny faint" style="width:44px">${n.k}</span>
              <span class="mono small b">${n.hyp}</span>
              <span class="small" style="flex:1 1 140px">${t(n.claim)}</span>
              ${n.role === 'borrowed_assumption' && html`<span class="chip">${L('借用', 'borrowed')}</span>`}
              ${n.frozen && html`<span class="chip bad">${L('冻结', 'frozen')}</span>`}
              <${St} s=${n.status} />
              ${n.score !== 0 && html`<${Score} v=${n.score} />`}
              ${n.refs > 1 && html`<span class="chip acc mono">${n.refs}</span>`}
            </div>`)}
        </div>` : html`<table><thead><tr><th>k</th><th>id</th><th>${L('主张', 'Claim')}</th><th>${L('角色', 'Role')}</th><th>${L('状态', 'Status')}</th><th>${L('证据', 'Evidence')}</th><th>idea</th></tr></thead>
          <tbody>${rows.map((n) => html`<tr class="clickable" onClick=${() => go(qs({ h: n.hyp }))}>
            <td class="mono tiny">${n.k}</td><td class="mono b">${n.hyp}</td><td>${t(n.claim)}</td>
            <td class="tiny mut">${n.role === 'borrowed_assumption' ? L('借用前提', 'borrowed') : L('自证', 'own')}</td>
            <td><${St} s=${n.status} /></td><td><${Score} v=${n.score} /></td><td class="mono tiny">${n.refs}</td></tr>`)}</tbody></table>`}
      <//>
      <div class="col">
        ${sel ? html`<${F}>
          <${HypPanel} sel=${sel} act=${act} />
          <${Card} title=${L('论证角色与依赖', 'Argument role and dependencies')}>
            <div class="row">
              <span class="tiny faint" style="width:76px">${L('论证角色', 'Role')}</span>
              <div class="seg">
                <button class=${sel.node?.role === 'own_to_prove' ? 'on' : ''} onClick=${() => act('hyp.edit', { hyp: sel.id, role: 'own_to_prove', idea: d.idea })}>own_to_prove</button>
                <button class=${sel.node?.role === 'borrowed_assumption' ? 'on' : ''} onClick=${() => act('hyp.edit', { hyp: sel.id, role: 'borrowed_assumption', idea: d.idea })}>borrowed</button>
              </div>
            </div>
            <div class="row" style="margin-top:9px;align-items:flex-start">
              <span class="tiny faint" style="width:76px">depends_on</span>
              <div style="flex:1 1 150px">
                ${sel.depends.length === 0 && html`<span class="tiny faint">${L('无', 'none')}</span>`}
                ${sel.depends.map((x) => html`<a class="row" href=${qs({ h: x.id })} style="padding:3px 0;color:inherit">
                  <span class="mono small b">${x.id}</span><span class="small mut" style="flex:1 1 60px">${t(x.claim)}</span><${St} s=${x.status} /></a>`)}
                <select style="margin-top:6px" onChange=${(e) => e.target.value && act('hyp.dep', { hyp: sel.id, on: e.target.value })}>
                  <option value="">${L('+ 添加依赖…', '+ add a dependency…')}</option>
                  ${rows.filter((n) => n.hyp !== sel.id).map((n) => html`<option value=${n.hyp}>${n.hyp} · ${t(n.claim).slice(0, 30)}</option>`)}
                </select>
              </div>
            </div>
            <div class="note" style="margin-top:10px">${sel.downstream.length
              ? L(`下游依赖 ${sel.downstream.length} 个 · 推翻时路由范围为「分支」`, `${sel.downstream.length} downstream · overturning it routes to “branch”`)
              : L('下游依赖 0 个 · 推翻时路由范围为「局部」', 'No downstream · overturning it routes to “local”')}</div>
          <//>
          ${sel.decisions.length > 0 && html`<${Card} title=${L('决策记录', 'Decision log')}>
            <div class="row">${sel.decisions.slice(-6).map((x) => html`<span class=${'chip ' + (x.kind === 'PIVOT' ? 'bad' : x.kind === 'PROCEED' ? 'ok' : '')}>${x.kind}</span>`)}</div>
          <//>`}
        <//>` : html`<${Empty}>${L('选择一个节点。', 'Select a node.')}<//>`}
      </div>
    </div>
  <//>`;
}
