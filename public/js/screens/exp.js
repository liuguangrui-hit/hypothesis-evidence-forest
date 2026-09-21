// Experiments: single run, four-stage experiment tree, sweep matrix, compute & failures.
import { html, useState, useEffect, useRef, useScreen, Frame, Card, Table, Kpi, Loading, Empty, Editable, Evidence, Meter,
  t, L, I, St, Bar, Score, IdeaTag, ic, dur, ago, hm, clock, stLabel } from './common.js';
import { go, qs } from '../app.js';
const F = ({ children }) => children;

export function Experiments({ q, onShell }) {
  const { data, act } = useScreen('experiments', { e: q.e }, onShell, 1500);
  const [edit, setEdit] = useState(false);
  const logRef = useRef(null);
  const e = data?.experiments?.sel;
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [e?.stream?.length, e?.prog]);
  if (!data) return html`<${Loading} />`;
  const d = data.experiments;
  if (d.empty) return html`<${Frame}><${Card} title=${L('实验', 'Experiments')}>
    <${Empty}>${L('还没有实验记录。真实项目从 experiments.jsonl 读取，排队的实验会写进 queue.jsonl。',
      'No runs yet. A real project reads experiments.jsonl, and anything you queue is written to queue.jsonl.')}<//>
    <div class="row" style="margin-top:11px"><a class="btn sm" href="/main">${L('去 frontier 排实验', 'Queue one from the frontier')}</a></div><//><//>`;
  const live = e.status === 'running';
  return html`<${Frame} tools=${html`
    <span class="chip">${L('运行中', 'Running')} ${d.counts.running}/${d.slots}</span>
    <span class="chip">${L('排队', 'Queued')} ${d.counts.queued}</span>
    <span class="chip">${L('已完成', 'Done')} ${d.counts.done}</span>
    <div class="grow"></div>
    <span class="tiny faint">${L(`GPU 队列 ${d.gpus}×A100 · 空闲 ${Math.max(0, d.slots - d.counts.running)}`, `GPU queue ${d.gpus}×A100 · ${Math.max(0, d.slots - d.counts.running)} free`)}</span>`}>
    <div class="cols2b">
      <${Card} title=${L('实验队列', 'Run queue')} sub=${L('按覆盖 idea 数排序', 'sorted by projects covered')}>
        <div class="list" style="margin:-13px -14px">
          ${d.list.map((x) => html`
            <div class=${'item' + (e.id === x.id ? ' on' : '')} onClick=${() => go(qs({ e: x.id }))}>
              <div style="flex-grow:1">
                <div class="row"><span class="mono b">${x.id}</span><${St} s=${x.status} />
                  ${x.status === 'running' && html`<span class="tiny mut">${Math.round(x.prog * 100)}% · ${dur(x.etaMs)}</span>`}
                  ${x.delta != null && html`<${Score} v=${x.delta} />`}
                  <div class="grow"></div>
                  ${x.ideas.map((i) => html`<span class="dot" style=${{ background: ic(i) }} title=${i}></span>`)}</div>
                <div class="row" style="margin-top:4px"><span class="mono tiny mut">${x.hyp}</span><span class="small" style="flex:1 1 90px">${t(x.claim)}</span></div>
                ${x.status === 'running' && html`<div style="margin-top:6px"><${Bar} v=${x.prog} /></div>`}
              </div>
            </div>`)}
        </div>
      <//>

      <div class="col">
        <${Card} title=${html`<span class="mono">${e.id}</span>`} right=${html`<${St} s=${e.status} />`}
          sub=${L(`目标假设 ${e.hyp}`, `target hypothesis ${e.hyp}`)}>
          <div class="row"><span class="mono b">${e.hyp}</span><span style="flex:1 1 200px">${t(e.claim)}</span></div>
          <div class="row" style="margin-top:7px">
            ${e.places.map((p) => html`<span class="chip mono" style=${{ background: ic(p.idea) + '14', color: ic(p.idea) }}>
              ${p.idea} · ${p.role.kind === 'root' ? L('根', 'root') : p.role.leaf ? L('叶', 'leaf') : L(`第 ${p.role.depth} 层`, `L${p.role.depth}`)}</span>`)}
            ${e.ideas.length > 1 && html`<span class="chip acc">${L(`服务 ${e.ideas.length} 个 idea`, `serves ${e.ideas.length} projects`)}</span>`}
          </div>
        <//>

        <${Card} title=${L('运行配置', 'Run configuration')} sub=${L('改任一项都会记入 decision_log', 'any change is written to decision_log')}
          right=${html`<div class="row">
            <button class="btn xs" onClick=${() => setEdit(!edit)}>${edit ? L('完成', 'Done') : L('修改配置', 'Edit config')}</button>
            <button class="btn xs" onClick=${() => act('exp.copy', { exp: e.id })}>${L('复制为新实验', 'Copy as new')}</button></div>`}>
          <${Table}><tbody>
            ${[['model', L('模型', 'Model')], ['batch', 'batch'], ['seed', 'seed'], ['opt', L('优化器', 'Optimiser')], ['steps', L('步数', 'Steps')], ['measure', L('测量', 'Measure')]].map(([k, lab]) => html`
              <tr><td class="tiny faint" style="width:78px">${lab}</td>
                <td>${edit
                  ? html`<input type="text" value=${e.cfg[k]} onBlur=${(ev) => ev.target.value !== e.cfg[k] && act('exp.config', { exp: e.id, cfg: { [k]: ev.target.value } })} />`
                  : html`<span class="mono small">${e.cfg[k]}</span>`}</td></tr>`)}
          </tbody><//>
        <//>

        <${Card} title=${L('实时输出', 'Live output')} sub="events.jsonl · module=executor"
          right=${html`<div class="row">
            ${live && html`<span class="chip acc"><span class="spin"></span>${Math.round(e.prog * 100)}%</span>`}
            ${live && html`<button class="btn xs" onClick=${() => act('exp.control', { exp: e.id, cmd: 'pause' })}>${I('pause', { s: 11 })}${L('暂停', 'Pause')}</button>`}
            ${e.status === 'paused' && html`<button class="btn xs" onClick=${() => act('exp.control', { exp: e.id, cmd: 'resume' })}>${I('play', { s: 11 })}${L('继续', 'Resume')}</button>`}
            ${(live || e.status === 'paused') && html`<button class="btn xs bad" onClick=${() => act('exp.control', { exp: e.id, cmd: 'abort' })}>${L('中止', 'Abort')}</button>`}
          </div>`}>
          ${e.status === 'queued' ? html`<${Empty}>${L('排队中，等一个空槽位。', 'Queued, waiting for a free slot.')}<//>` : html`
            <div ref=${logRef} class="mono tiny" style="max-height:186px;overflow-y:auto;background:#0F1419;color:#D7DDE5;border-radius:5px;padding:10px;line-height:1.9">
              ${e.stream.map((r) => html`<div style=${{ opacity: r.live ? 1 : .88 }}>
                <span style="color:#6B7482">${hm(r.t)}</span>  ${r.en && L(r.text, r.en) || r.text}${r.live ? html`<span class="pulse"> ▌</span>` : ''}</div>`)}
            </div>`}
          ${e.status === 'running' && html`<div style="margin-top:9px"><${Bar} v=${e.prog} /></div>`}
          ${e.table && html`<${Table} style="margin-top:11px"><thead><tr><th>batch</th><th>noise</th><th>eff_step</th><th></th></tr></thead><tbody>
            ${e.table.map((r) => html`<tr>
              <td class="mono">${r.b}</td><td class="mono">${r.noise ?? '—'}</td><td class="mono">${r.eff ?? '—'}</td>
              <td class="tiny mut">${r.state === 'done' ? '' : r.state === 'running' ? L('运行中', 'running') : L('排队', 'queued')}</td></tr>`)}
          </tbody><//>`}
          ${e.sweep && html`<div class="note" style="margin-top:9px">${L('拟合斜率 −0.49，与 H-11 断言的 −0.5 一致。', 'Fitted slope −0.49, consistent with the −0.5 asserted by H-11.')}
            <a href="/sweep" style="margin-left:6px">${L('看扫描矩阵 →', 'Sweep matrix →')}</a></div>`}
        <//>

        <${Card} title=${L('执行动作', 'Act on the result')}
          sub=${L(`executor 建议 ${e.outcome.rec} · 置信 ${e.outcome.conf}`, `executor suggests ${e.outcome.rec} · confidence ${e.outcome.conf}`)}
          right=${html`<span class="chip">${L('本支连续 PIVOT', 'Consecutive PIVOTs')} ${e.pivots} / 3</span>`}>
          <div class="cols2" style="grid-template-columns:1fr 1fr">
            ${[['PROCEED', L('写入证据并展开', 'Write evidence and expand'), 'acc'], ['REFINE', L('改配置重跑同一假设', 'Change the config, same hypothesis'), ''],
              ['PIVOT', L('换一条子假设', 'Move to another sub-hypothesis'), ''], ['ESCALATE', L('提交裁定，交 reviewer 判断', 'Submit for a verdict'), 'pri']].map(([k, note, cls]) => html`
              <button class=${'btn ' + cls} style="height:auto;padding:9px 11px;flex-direction:column;align-items:flex-start;gap:3px"
                disabled=${e.status === 'queued' || (k === 'PROCEED' && e.status === 'done' && !e.aborted && e.finishedAt)}
                onClick=${() => act('exp.decide', { exp: e.id, kind: k })}>
                <span class="b">${k === 'ESCALATE' ? L('提交裁定', 'Escalate') : k}</span>
                <span class="tiny" style="opacity:.8;font-weight:400">${note}</span>
              </button>`)}
          </div>
          <div class="hr"></div>
          <div class="row"><span class="tiny faint">${L('证据回写', 'Evidence write-back')}</span>
            <span class="small">${e.hyp} · ${L('累积', 'total')} <b class="num">${e.hypScore > 0 ? '+' : ''}${e.hypScore}</b>
              ${e.status !== 'done' && html`<span class="mut">→ ${L('本次后', 'after this')} ${(e.hypScore + e.outcome.delta) > 0 ? '+' : ''}${Math.round((e.hypScore + e.outcome.delta) * 10) / 10}</span>`}</span></div>
          <div style="margin-top:8px"><${Meter} v=${e.hypScore} /></div>
          <div style="margin-top:11px"><${Evidence} list=${e.prior} onExp=${(x) => x.startsWith('e_') && go(qs({ e: x }))} /></div>
        <//>

        <${Card} title=${L('写入后同步更新', 'What updates when it lands')} sub=${L('这一次实验同时结清多个 idea 上的同一条假设', 'One run settles the same hypothesis in several projects at once')}>
          ${e.places.map((p) => html`
            <div class="row" style="padding:7px 0;border-bottom:1px solid var(--line2)">
              <span style=${{ width: '3px', alignSelf: 'stretch', background: ic(p.idea), borderRadius: '2px' }}></span>
              <span class="mono b small">${p.idea}</span>
              <span class="small mut" style="flex:1 1 140px">${p.role.kind === 'root' ? L('根前提 · 直接采纳 · 不再往下拆', 'root premise · adopted as given · not decomposed')
                : p.role.leaf ? L('叶子 · 结清后本支收束', 'leaf · settling it closes this branch')
                : L(`第 ${p.role.depth} 层 · 解锁下游节点 · 进入 frontier`, `layer ${p.role.depth} · unlocks downstream nodes · enters the frontier`)}</span>
              <a class="btn xs" href=${'/tree?idea=' + p.idea + '&h=' + e.hyp}>${L('看树', 'Tree')}</a>
            </div>`)}
        <//>
      </div>
    </div>
  <//>`;
}

// ---------------------------------------------------------------- experiment tree
const STAGES = [['probe', '初探', 'Probe'], ['tune', '调参', 'Tune'], ['main', '主实验', 'Main'], ['ablate', '消融', 'Ablation']];
const NODE_COLOR = { success: '#0F8F7B', running: '#2F5FE0', failed: '#BE123C', pruned: '#98A2B3', queued: '#B6BDC7' };

export function ExpTree({ q, onShell }) {
  const { data, act } = useScreen('exptree', {}, onShell, 2000);
  const [sel, setSel] = useState(null);
  if (!data) return html`<${Loading} />`;
  const d = data.exptree;
  if (d.empty) return html`<${Frame}><${Card} title=${L('实验树 · 四阶段', 'Experiment tree · four stages')}>
    <${Empty}>${L('这个 idea 还没有实验树。实验树记录初探 → 调参 → 主实验 → 消融的每一次尝试，失败节点也留着。',
      'This idea has no experiment tree yet. The tree records every attempt from probe to ablation, failures included.')}<//><//><//>`;
  const cur = d.nodes.find((n) => n.id === sel) || d.nodes.find((n) => n.status === 'running') || d.nodes[0];
  const byStage = (s) => d.nodes.filter((n) => n.stage === s);
  return html`<${Frame} tools=${html`
    <span class="chip">${L('全部', 'All')} ${d.counts.all}</span>
    <span class="chip ok">${L('成功', 'Success')} ${d.counts.success}</span>
    <span class="chip bad">${L('失败', 'Failed')} ${d.counts.failed}</span>
    <span class="chip">${L('剪枝', 'Pruned')} ${d.counts.pruned}</span>
    <div class="grow"></div>
    <span class="chip">${L('并行', 'Parallel')} ${d.parallel}</span>
    <span class="chip">${L('同配置重跑', 'Repeat')} k = ${d.k}</span>
    <span class="chip">${L('本 idea 已用', 'Used')} ${d.budget.used} / ${d.budget.total} GPU·h</span>`}>
    <div class="cols2">
      <${Card} title=${L('实验树 · 四阶段', 'Experiment tree · four stages')} sub=${L('节点类型：新写 / 修错 / 改进 —— 失败节点不删，留着避免重犯', 'Node kinds: new / fix / improve — failed nodes are kept so mistakes are not repeated')}>
        <div class="experiment-stages" style="display:grid;grid-template-columns:repeat(4,1fr);gap:9px">
          ${STAGES.map(([s, zh, en]) => html`
            <div>
              <div class="row" style="margin-bottom:7px"><span class="tiny b faint">${L(zh, en)}</span><span class="tag">${byStage(s).length}</span></div>
              <div class="col" style="gap:6px">
                ${byStage(s).map((n) => html`
                  <div onClick=${() => setSel(n.id)} style=${{ padding: '8px', border: '1px solid ' + (cur?.id === n.id ? 'var(--acc)' : 'var(--line)'), borderLeft: '3px solid ' + NODE_COLOR[n.status], borderRadius: '5px', cursor: 'pointer', background: cur?.id === n.id ? 'var(--accbg)' : 'var(--card)', opacity: n.pruned ? .55 : 1 }}>
                    <div class="row"><span class="mono tiny b">${n.id}</span>
                      ${n.best && html`<span class="chip ok" style="font-size:10px">${L('最优', 'best')}</span>`}
                      <div class="grow"></div>
                      ${n.score != null ? html`<span class="num tiny">${n.score}</span>` : n.status === 'running' ? html`<span class="spin"></span>` : ''}</div>
                    <div class="tiny mut" style="margin-top:4px;line-height:1.5">${t(n.summary).slice(0, 44)}${t(n.summary).length > 44 ? '…' : ''}</div>
                    ${n.status === 'running' && n.prog != null && html`<div style="margin-top:5px"><${Bar} v=${n.prog} h=${4} /></div>`}
                  </div>`)}
              </div>
            </div>`)}
        </div>
        <div class="note" style="margin-top:12px">${L('只有被标成「代表节点」的结果才写回假设树；其余留在树里做记录，不进证据。',
          'Only nodes marked as representative write back to the hypothesis tree; the rest stay as a record and never become evidence.')}</div>
      <//>

      ${cur && html`<div class="col">
        <${Card} title=${html`<span class="mono">${cur.id}</span>`} right=${html`<${St} s=${cur.status} />`}
          sub=${L(`${STAGES.find((s) => s[0] === cur.stage)?.[1]}阶段 · ${cur.type}`, `${STAGES.find((s) => s[0] === cur.stage)?.[2]} stage · ${cur.type}`)}>
          <div style="line-height:1.75">${t(cur.summary)}</div>
          <div class="hr"></div>
          <${Table}><tbody>
            ${cur.parent && html`<tr><td class="tiny faint" style="width:76px">${L('父节点', 'Parent')}</td>
              <td><span class="mono small" style="cursor:pointer;color:var(--acc)" onClick=${() => setSel(cur.parent)}>${cur.parent}</span>
                ${d.nodes.find((n) => n.id === cur.parent)?.score != null && html`<span class="tiny mut"> · ${L('得分', 'score')} ${d.nodes.find((n) => n.id === cur.parent).score}</span>`}</td></tr>`}
            ${cur.change && html`<tr><td class="tiny faint">${L('改动', 'Change')}</td><td class="mono tiny">${cur.change}</td></tr>`}
            ${cur.hyp && html`<tr><td class="tiny faint">${L('目标假设', 'Hypothesis')}</td><td><a class="mono small" href=${'/panorama?h=' + cur.hyp}>${cur.hyp}</a></td></tr>`}
            ${cur.exp && html`<tr><td class="tiny faint">${L('运行', 'Run')}</td><td><a class="mono small" href=${'/experiments?e=' + cur.exp}>${cur.exp}</a>
              ${cur.prog != null && html`<span class="tiny mut"> · ${Math.round(cur.prog * 100)}% · ${dur(cur.etaMs)}</span>`}</td></tr>`}
            <tr><td class="tiny faint">${L('本节点得分', 'Score')}</td><td>${cur.score != null ? html`<span class="num">${cur.score}</span>` : html`<span class="tiny mut">${L('待定 · 需 3 个种子', 'pending · needs 3 seeds')}</span>`}</td></tr>
          </tbody><//>
          <div class="hr"></div>
          <div class="row">
            <button class="btn sm acc" onClick=${() => act('tree.expand', { node: cur.id })}>${L('从这里展开子节点', 'Expand a child here')}</button>
            <button class="btn sm bad" onClick=${() => act('tree.prune', { node: cur.id })}>${cur.pruned ? L('恢复这一支', 'Restore this branch') : L('剪掉这一支', 'Prune this branch')}</button>
            <a class="btn sm" href="/sweep">${L('看扫描矩阵', 'Sweep matrix')}</a>
            ${cur.exp && html`<a class="btn sm" href=${'/experiments?e=' + cur.exp}>${L('打开这次运行', 'Open this run')}</a>`}
          </div>
        <//>
        <${Card} title=${L('兄弟节点', 'Sibling nodes')}>
          ${d.nodes.filter((n) => n.parent === cur.parent && n.id !== cur.id).map((n) => html`
            <div class="row clickable" style="padding:6px 0;cursor:pointer;border-bottom:1px solid var(--line2)" onClick=${() => setSel(n.id)}>
              <span class="dot" style=${{ background: NODE_COLOR[n.status] }}></span>
              <span class="mono small">${n.id}</span><span class="small mut" style="flex:1 1 100px">${t(n.summary).slice(0, 34)}</span>
              <span class="num small">${n.score ?? '—'}</span></div>`)}
          ${d.nodes.filter((n) => n.parent === cur.parent && n.id !== cur.id).length === 0 && html`<span class="tiny faint">${L('没有兄弟节点。', 'No siblings.')}</span>`}
        <//>
      </div>`}
    </div>
  <//>`;
}

// ---------------------------------------------------------------- sweep matrix
export function Sweep({ q, onShell }) {
  const { data, act } = useScreen('sweep', {}, onShell, 2500);
  if (!data) return html`<${Loading} />`;
  const d = data.sweep;
  if (d.empty) return html`<${Frame}><${Card} title=${L('扫描矩阵', 'Sweep matrix')}>
    <${Empty}>${L('还没有扫描矩阵。一次 batch × seed 的扫描完成后，整张矩阵只产生一条证据。',
      'No sweep yet. Once a batch × seed sweep finishes, the whole matrix yields exactly one piece of evidence.')}<//><//><//>`;
  const vals = d.cells.map((c) => (d.metric === 'eff' ? c.eff : c.noise)).filter((v) => v != null);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const shade = (v) => v == null ? 'transparent' : `rgba(47,95,224,${0.08 + 0.62 * ((v - lo) / Math.max(1e-6, hi - lo))})`;
  return html`<${Frame} tools=${html`
    <span class="tiny faint">${L('指标', 'Metric')}</span>
    <div class="seg"><button class=${d.metric === 'eff' ? 'on' : ''} onClick=${() => act('sweep.metric', { metric: 'eff' })}>${L('有效步长', 'Effective step')}</button>
      <button class=${d.metric === 'noise' ? 'on' : ''} onClick=${() => act('sweep.metric', { metric: 'noise' })}>${L('噪声尺度', 'Noise scale')}</button></div>
    <div class="seg"><button class=${d.mode === 'single' ? 'on' : ''} onClick=${() => act('sweep.mode', { mode: 'single' })}>${L('单元格=单次', 'Cell = single run')}</button>
      <button class=${d.mode === 'mean' ? 'on' : ''} onClick=${() => act('sweep.mode', { mode: 'mean' })}>${L('单元格=均值', 'Cell = mean')}</button></div>
    <div class="grow"></div>
    <span class="tiny faint">${L(`${d.cells.length} 格 · 配对 t 检验 α = ${d.alpha}`, `${d.cells.length} cells · paired t-test α = ${d.alpha}`)}</span>`}>
    <div class="cols2">
      <${Card} title=${L('运行矩阵', 'Run matrix')} sub=${L('每格一次运行，颜色深浅＝取值', 'one run per cell; shade = value')}>
        <${Table}><thead><tr><th>batch</th><th>seed 0</th><th>seed 1</th><th>seed 2</th><th>${L('均值', 'Mean')}</th><th>${L('标准差', 'SD')}</th><th>${L('状态', 'State')}</th></tr></thead>
          <tbody>
            ${d.rows.map((r) => html`<tr>
              <td class="mono b">${r.b}</td>
              ${r.cells.map((c) => {
                const v = d.metric === 'eff' ? c.eff : c.noise;
                return html`<td style=${{ background: d.mode === 'single' ? shade(v) : shade(r.mean), textAlign: 'center' }} class="mono">
                  ${d.mode === 'single' ? (v ?? (c.state === 'oom' ? 'OOM' : '—')) : (r.mean ?? '—')}</td>`;
              })}
              <td class="mono b">${r.mean ?? '—'}</td>
              <td class="mono tiny mut">${r.sd != null ? '±' + r.sd : '—'}</td>
              <td>${r.state === 'done' ? html`<${St} s="done" />` : r.state === 'oom' ? html`<span class="chip bad">${L('OOM · 重试中', 'OOM · retrying')}</span>` : html`<${St} s=${r.state} />`}</td>
            </tr>`)}
          </tbody><//>
        <div class="note warn" style="margin-top:11px">${d.filled
          ? L('batch = 2048 一行已补满，参与拟合。', 'The batch = 2048 row is now filled and joins the fit.')
          : L('batch = 2048 三格全部 OOM，已按自动策略降到 1024 重试；缺格不参与拟合，也不写进证据。', 'All three cells at batch = 2048 hit OOM and were retried at 1024. Missing cells do not join the fit and never become evidence.')}
          <a href="/runs" style="margin-left:6px">${L('看失败详情 →', 'Failure details →')}</a></div>
      <//>

      <div class="col">
        <${Card} title=${L('拟合与显著性', 'Fit and significance')} sub=${L('种子间方差先算，再谈趋势', 'seed variance first, then the trend')}>
          <div class="row"><span class="chip acc">${L('幂律拟合', 'Power-law fit')}</span>
            <span class="mono small">slope ${d.filled ? '−0.50' : '−0.50'} · R² ${d.filled ? '0.999' : '0.999'}</span></div>
          <div class="tiny mut" style="margin-top:5px">${L('与 H-11 断言的 −0.5 一致', 'consistent with the −0.5 asserted by H-11')}</div>
          <div class="hr"></div>
          ${d.tests.map((x) => html`
            <div class="row" style="padding:6px 0;border-bottom:1px solid var(--line2)">
              <span class="mono small" style="width:96px">${x.pair[0]} vs ${x.pair[1]}</span>
              <span class="mono small">p = ${x.p}</span><div class="grow"></div>
              <span class=${'chip ' + (x.sig ? 'ok' : '')}>${x.sig ? L('差异显著', 'significant') : L('相邻档不可分', 'indistinguishable')}</span>
            </div>`)}
          <div class="note" style="margin-top:10px">${L('别把相邻档写成逐档提升——只有跨度大的比较显著。',
            'Do not write adjacent tiers up as a step-by-step gain — only the wide comparison is significant.')}</div>
        <//>

        <${Card} title=${L('写回证据', 'Write back evidence')} sub=${L('整张矩阵只产生一条证据', 'the whole matrix yields exactly one piece of evidence')}>
          <div class="note">${L('写进 H-11 的是这一句：趋势成立、相邻档不可分。不是 18 个数。',
            'What lands on H-11 is one sentence: the trend holds, adjacent tiers are indistinguishable. Not 18 numbers.')}</div>
          <div class="row" style="margin-top:10px"><span class="mono b">${d.hyp}</span><${St} s=${d.hypStatus} />
            <div class="grow"></div><span class="tiny mut">${L('本次', 'this run')}</span><${Score} v=${0.6} /></div>
          <div style="margin-top:8px"><${Meter} v=${d.hypScore} /></div>
          <div class="row" style="margin-top:11px">
            <button class="btn sm acc" disabled=${d.written} onClick=${() => act('sweep.write', {})}>
              ${d.written ? L('已写入证据', 'Evidence written') : L('写入证据并标为代表节点', 'Write evidence and mark representative')}</button>
            <a class="btn sm" href=${'/panorama?h=' + d.hyp}>${L('看假设', 'Open the hypothesis')}</a>
          </div>
        <//>

        <${Card} title=${L('代表配置', 'Representative config')}>
          <${Table}><tbody>
            ${[['batch', d.rep.b], ['seed', d.rep.s], ['lr', d.rep.lr], [L('运行 id', 'run id'), d.rep.run], [L('产物', 'Artifacts'), 'fig_3.png · metrics.csv']].map(([k, v]) => html`
              <tr><td class="tiny faint" style="width:70px">${k}</td><td class="mono small">${v}</td></tr>`)}
          </tbody><//>
          <div class="note" style="margin-top:9px">${L('图 3 用的就是这一格；换代表配置会同时重画图 3 并标记 4.2 节待更新。',
            'Figure 3 comes from this cell. Changing the representative config redraws Figure 3 and flags §4.2 for update.')}
            <a href="/figures" style="margin-left:6px">${L('图表工作台 →', 'Figures →')}</a></div>
        <//>

        <${Card} title=${L('这张矩阵要花多少', 'What this matrix costs')}>
          <${Table}><tbody>
            <tr><td class="tiny faint">${L('已用 GPU·h', 'GPU·h spent')}</td><td class="num">${d.gpuh}</td></tr>
            <tr><td class="tiny faint">${L('剩余格预计', 'Remaining cells')}</td><td class="num">${d.filled ? 0 : d.remain}</td></tr>
            <tr><td class="tiny faint">${L('本 idea 预算', 'Project budget')}</td><td class="num">${d.budget.total}</td></tr>
            <tr><td class="tiny faint">${L('补满 2048 三格', 'Filling the 2048 row')}</td><td class="num">${d.filled ? L('已补', 'done') : '+11.0'}</td></tr>
          </tbody><//>
          <div class="note warn" style="margin-top:9px">${L('补满 2048 会吃掉近一成预算，而它只影响外推那一段的措辞。executor 的建议是先不补，把那句改成推测语气。',
            'Filling 2048 eats nearly a tenth of the budget and only affects the wording of one extrapolated sentence. The executor suggests softening the sentence instead.')}</div>
          <div class="row" style="margin-top:10px">
            <button class="btn sm" disabled=${d.filled} onClick=${() => act('sweep.fill', {})}>${d.filled ? L('已补满', 'Already filled') : L('补满这一行', 'Fill the row')}</button>
            <a class="btn sm" href="/claims?c=c3">${L('去改那句话', 'Go fix the sentence')}</a>
          </div>
        <//>
      </div>
    </div>
  <//>`;
}

// ---------------------------------------------------------------- compute & failures
export function Runs({ q, onShell }) {
  const { data, act } = useScreen('runs', {}, onShell, 2000);
  const [tab, setTab] = useState('runs');
  if (!data) return html`<${Loading} />`;
  const d = data.runs;
  const tl = d.timeline;
  return html`<${Frame} tools=${html`
    <div class="seg">
      <button class=${tab === 'runs' ? 'on' : ''} onClick=${() => setTab('runs')}>${L('运行中', 'Running')} ${d.stats.running}</button>
      <button class=${tab === 'queue' ? 'on' : ''} onClick=${() => setTab('queue')}>${L('排队', 'Queued')} ${d.stats.queued}</button>
      <button class=${tab === 'fail' ? 'on' : ''} onClick=${() => setTab('fail')}>${L('失败', 'Failed')} ${d.stats.failed}</button>
    </div>
    <span class="vr"></span>
    <span class="chip">${L('平均排队', 'Avg queue')} ${d.stats.avgQueueMin} ${L('分钟', 'min')}</span>
    <span class="chip">${L('成功率', 'Success')} ${d.stats.rate}%</span>
    <span class="chip">${L('自动重试救回', 'Auto-rescued')} ${d.stats.rescued[0]}/${d.stats.rescued[1]}</span>
    <div class="grow"></div>
    <span class="tiny faint hide-s">${L('executor 只能写 events.jsonl 与 artifacts/', 'the executor may write only events.jsonl and artifacts/')}</span>`}>
    <div class="cols2">
      <div class="col">
        <${Card} title=${L('近 24 小时占用', 'Occupancy, last 24 hours')} sub=${L('颜色＝所属 idea，实心＝正在跑，琥珀＝失败', 'colour = project, solid = running, amber = failed')}>
          <div class="tl">
            ${tl.lanes.map((row, g) => html`
              <div class="tl-row"><span class="mono tiny faint tl-g">GPU ${g}</span>
                <div class="tl-track">
                  ${row.map((r) => {
                    const col = r.status === 'failed' ? '#F59E0B' : ic(r.idea);
                    const solid = r.status === 'running';
                    return html`<div class=${'tl-bar' + (r.clippedLeft ? ' clip-l' : '')} title=${`${r.id} · ${t(r.label)} · ${r.hours}h`}
                      style=${{ left: r.left + '%', width: r.width + '%', background: solid ? col : col + '1f',
                        border: '1px solid ' + col + (solid ? '' : '66'), color: solid ? '#fff' : col }}
                      onClick=${() => r.id.startsWith('e_') && go('/experiments?e=' + r.id)}>
                      <span class="tl-lab">${r.id}${t(r.label) ? ' · ' + t(r.label) : ''}</span>
                    </div>`;
                  })}
                </div></div>`)}
            <div class="tl-row"><span class="tl-g"></span>
              <div class="tl-track tl-axis">${tl.ticks.map((x) => html`<span class="mono tiny faint" style=${{ left: x.pct + '%' }}>${x.label}</span>`)}</div></div>
          </div>
          <div class="note" style="margin-top:9px">${d.stats.queued
            ? L(`空闲率 ${tl.idle}%——还有 ${d.stats.queued} 个任务在等空槽位，并行上限是 ${d.settings.parallel}。`,
                `${tl.idle}% idle — ${d.stats.queued} task(s) still waiting for a slot, with a parallel cap of ${d.settings.parallel}.`)
            : L(`空闲率 ${tl.idle}%——队列已排空。`, `${tl.idle}% idle — the queue is empty.`)}</div>
        <//>

        <${Card} title=${L('运行', 'Runs')} sub=${L('每一行都可以追到节点、假设和产物', 'every row traces back to a node, a hypothesis and its artifacts')}
          right=${html`<span class="tiny faint">${L('时长 / 成本为实测', 'duration / cost measured')}</span>`}>
          <${Table}><thead><tr><th style="width:92px">id</th><th>${L('目标', 'Target')}</th><th style="width:118px">${L('资源', 'Resources')}</th><th style="width:60px">${L('时长', 'Time')}</th><th style="width:60px">${L('成本', 'Cost')}</th><th style="width:76px">${L('状态', 'State')}</th></tr></thead>
            <tbody>
              ${(tab === 'queue' ? d.queued : tab === 'fail' ? d.history.filter((r) => r.status === 'failed') : [...d.live, ...d.history.filter((r) => r.status !== 'failed')]).slice(0, 14).map((r) => html`
                <tr class="clickable" onClick=${() => r.id.startsWith('e_') && go('/experiments?e=' + r.id)}>
                  <td style="white-space:nowrap"><span class="dot" style=${{ background: ic(r.idea), display: 'inline-block', marginRight: '5px' }}></span><span class="mono">${r.id}</span></td>
                  <td>${r.hyp ? html`<span class="mono tiny mut">${r.hyp} </span>` : ''}${t(r.label) || '—'}</td>
                  <td class="tiny mut">${r.status === 'queued' ? L('待分配', 'unassigned') : `1×A100${r.vcpu ? ' · ' + r.vcpu + ' vCPU' : ''}`}</td>
                  <td class="mono tiny">${r.hours ? r.hours + 'h' : r.dur ? (r.dur / 3600000).toFixed(1) + 'h' : '—'}</td>
                  <td class="mono tiny">${r.cost ? '¥ ' + r.cost : '—'}</td>
                  <td><${St} s=${r.status} /></td>
                </tr>`)}
            </tbody><//>
        <//>
      </div>

      <div class="col">
        <${Card} title=${L('失败分类', 'Failure classes')} sub=${L(`近 24 小时 ${d.failures.reduce((s, f) => s + f.n, 0)} 次`, `${d.failures.reduce((s, f) => s + f.n, 0)} in the last 24 hours`)}>
          <div class="col">
            ${d.failures.map((f) => html`
              <div style="padding:11px;border:1px solid var(--line);border-radius:6px">
                <div class="row"><span class="b small">${t(f.title)}</span><span class="tag">×${f.n}</span>
                  <div class="grow"></div><${St} s=${f.status} /></div>
                <div class="small mut" style="margin-top:6px">${t(f.cause)}</div>
                <div class="note acc" style="margin-top:7px">${L('自动处置：', 'Auto-handling: ')}${t(f.action)}</div>
              </div>`)}
          </div>
        <//>
        <${Card} title=${L('这周花在哪', 'Where the week went')}>
          ${Object.entries(d.spend).map(([idea, h]) => html`
            <div style="margin-bottom:7px">
              <div class="row"><${IdeaTag} id=${idea} /><div class="grow"></div><span class="num small">${h} h</span></div>
              <div style="margin-top:4px"><${Bar} v=${h / 45} c=${ic(idea)} h=${5} /></div>
            </div>`)}
          <div class="hr"></div>
          <div class="row"><span class="small">${L('失败烧掉', 'Burned on failures')}</span><div class="grow"></div>
            <span class="num small">${d.failBurn} h</span><span class="chip bad">${Math.round(d.failBurn / Object.values(d.spend).reduce((a, b) => a + b, 0) * 1000) / 10}%</span></div>
        <//>
        <${Card} title=${L('并行与预算', 'Parallelism and budget')} sub=${L('提高上限会让排队变短，但预算消耗更快', 'a higher cap shortens the queue but spends the budget faster')}>
          <div class="row"><span class="tiny faint" style="width:80px">${L('并行上限', 'Parallel cap')}</span>
            <input type="range" min="1" max="6" value=${d.settings.parallel} style="flex:1 1 80px"
              onChange=${(e) => act('settings.update', { parallel: +e.target.value })} />
            <span class="num" style="width:20px">${d.settings.parallel}</span></div>
          <div class="row" style="margin-top:9px"><span class="tiny faint" style="width:80px">${L('周预算', 'Weekly budget')}</span>
            <input type="range" min="40" max="300" step="10" value=${d.settings.budget} style="flex:1 1 80px"
              onChange=${(e) => act('settings.update', { budget: +e.target.value })} />
            <span class="num" style="width:40px">${d.settings.budget}</span></div>
          <div style="margin-top:11px"><${Bar} v=${d.settings.gpuUsed / d.settings.budget} c=${d.settings.gpuUsed / d.settings.budget > .9 ? 'var(--bad)' : 'var(--acc)'} /></div>
          <div class="tiny mut" style="margin-top:5px">${d.settings.gpuUsed} / ${d.settings.budget} GPU·h</div>
        <//>
        <${Card} title=${L('审计', 'Audit')}>
          <div class="small mut">${L('每次运行都记下镜像 digest、代码 commit、数据版本与随机种子，复现页可以据此在干净机器上重跑。',
            'Every run records the image digest, code commit, data version and random seed, so the reproducibility page can re-run it on a clean machine.')}</div>
          <div class="row" style="margin-top:9px"><a class="btn sm" href="/sweep">${L('回扫描矩阵', 'Sweep matrix')}</a>
            <a class="btn sm" href="/exptree">${L('回实验树', 'Experiment tree')}</a>
            <a class="btn sm" href="/rebuttal">${L('复现自评', 'Reproducibility')}</a></div>
        <//>
      </div>
    </div>
  <//>`;
}
