// Overview (Home), global Workbench (Main), and the full event stream.
import { html, useState, useScreen, Frame, Card, Kpi, Loading, ErrBox, Empty, t, L, I, St, Chip, Bar, Score, IdeaTag, ic, dur, ago, hm, clock, pct, Meter, Evidence } from './common.js';
import { go } from '../app.js';

export function Home({ q, onShell }) {
  const { data, act } = useScreen('home', {}, onShell);
  if (!data) return html`<${Loading} />`;
  const d = data.home, c = data.shell.counts;
  return html`<${Frame}>
    <${Card} title=${L('管线', 'Pipeline')} sub=${L('一条文献进来，到一篇论文出去，中间的每一段都能点开', 'One paper in, one paper out — every segment in between opens')}
      right=${html`<span class="mono tiny faint">${L('数据来自', 'from')} index.jsonl · tree.json · events.jsonl</span>`}>
      <div class="pipe">
        ${d.pipeline.map((p, i) => html`
          ${i > 0 && html`<div class="arrow">${I('arrow', { s: 14, c: 'var(--faint2)' })}</div>`}
          <${Kpi} k=${t(p.label)} v=${html`${p.n.toLocaleString()} <span style="font-size:12px;color:var(--mut2)">${t(p.unit)}</span>`} s=${t(p.sub)} warn=${p.warn} onClick=${() => go(p.go)} />`)}
      </div>
    <//>

    <div class="cols2" style="margin-top:12px">
      <div class="col">
        <${Card} title=${d.star ? L(`一条假设，${d.star.places.length} 个 idea 在用`, `One hypothesis, ${d.star.places.length} projects using it`) : L('共享假设', 'Shared hypotheses')}
          right=${html`<a href=${'/graph?h=' + d.star?.id}>${L('看共享关系 →', 'See shared hypotheses →')}</a>`}>
          ${d.star ? html`<${Fragment}>
            <div class="row" style="margin-bottom:9px">
              <span class="mono b">${d.star.id}</span><${St} s=${d.star.status} /><${Score} v=${d.star.score} />
              <span class="small mut" style="flex:1 1 220px">${t(d.star.claim)}</span>
            </div>
            <div class="cols3">
              ${d.star.places.map((p) => html`
                <div style=${{ padding: '11px 12px', border: '1px solid var(--line)', borderRadius: '6px', borderLeft: '3px solid ' + ic(p.idea), cursor: 'pointer' }}
                  onClick=${() => go('/tree?idea=' + p.idea + '&h=' + d.star.id)}>
                  <${IdeaTag} id=${p.idea} />
                  <div class="small b" style="margin-top:7px">${p.role.kind === 'root' ? L('根前提', 'root premise') : p.role.leaf ? L('叶子', 'leaf') : L(`第 ${p.role.depth} 层`, `layer ${p.role.depth}`)}</div>
                  <div class="tiny mut" style="margin-top:3px">${p.role.role === 'borrowed_assumption' ? L('借用前提，不再展开', 'borrowed premise, not expanded') : L('本 idea 自证', 'proven in this project')}</div>
                </div>`)}
            </div>
            <div class="note" style="margin-top:11px">${L('假设是全局实体，不属于任何一个 idea。一次实验的证据会同时落到所有引用它的 idea 上。',
              'A hypothesis is a global entity. Evidence from one run lands on every project that cites it.')}</div>
          <//>` : html`<${Empty}>${L('目前没有跨 idea 共享的假设。', 'No hypothesis is shared across projects right now.')}<//>`}
        <//>

        <${Card} title=${L('过去 24 小时', 'The last 24 hours')} sub=${L('系统自己做完的部分', 'What the system did on its own')}
          right=${html`<a href="/events">${L('完整事件流 →', 'Full event stream →')}</a>`}>
          <table><tbody>
            ${d.last24.map((x) => html`<tr>
              <td style="width:58px;color:var(--faint)">${t(x.label)}</td>
              <td><div class="b">${t(x.head)}</div><div class="small mut" style="margin-top:3px">${t(x.body)}</div></td>
            </tr>`)}
          </tbody></table>
          <div class="note" style="margin-top:11px">${L(`这 24 小时里没有人操作过。上一次人工介入是 ${clock(Date.now() - d.unattendedMs)}。`,
            `Nobody touched it in those 24 hours. The last manual step was ${clock(Date.now() - d.unattendedMs)}.`)}</div>
        <//>
      </div>

      <div class="col">
        <${Card} title=${L('等你决定的', 'Waiting on you')} right=${html`<span class="chip ${d.decisions.length ? 'warn' : ''}">${d.decisions.length}</span>`}
          sub=${L('系统不会替你决定这些', 'The system will not decide these for you')}>
          ${d.decisions.length === 0 ? html`<${Empty}>${L('目前没有需要你裁定的事。', 'Nothing needs your decision right now.')}<//>` : null}
          <div class="col">
            ${d.decisions.map((x) => html`
              <div style="padding:11px;border:1px solid var(--line);border-radius:6px">
                <div class="row">
                  ${x.kind === 'verdict' && html`<span class="mono b">${x.id}</span>`}
                  <span class="b small" style="flex:1 1 140px">${t(x.title)}</span>
                  ${x.badge && html`<${IdeaTag} id=${x.badge} />`}
                </div>
                <div class="small mut" style="margin-top:6px">${t(x.why)}</div>
                <div class="row" style="margin-top:9px">
                  <a class="btn sm acc" href=${x.go}>${t(x.cta)}</a>
                  <button class="btn sm" onClick=${() => act('decision.snooze', { id: x.kind === 'verdict' ? 'v:' + x.id : x.id })}>${L('先放一放', 'Set aside')}</button>
                </div>
              </div>`)}
          </div>
        <//>

        <${Card} title=${L('三个 agent 在做什么', 'What the three agents are doing')} sub=${L('各自只写自己的文件', 'Each writes only its own files')}>
          <div class="col">
            ${d.agents.map((a) => html`
              <div class="row" style="align-items:flex-start;cursor:pointer" onClick=${() => go(a.go)}>
                <span class="dot" style=${{ background: a.id === 'executor' ? 'var(--ok)' : a.id === 'reviewer' ? 'var(--acc)' : 'var(--faint2)', marginTop: '5px' }}></span>
                <div style="flex-grow:1">
                  <div class="row"><span class="b small">${a.id}</span><span class="mono tiny faint">${a.model}</span>
                    <div class="grow"></div><span class="tiny mut">${t(a.state)}</span></div>
                  <div class="tiny mut" style="margin-top:3px">${t(a.line)}</div>
                </div>
              </div>`)}
          </div>
        <//>

        <${Card} title=${L('本周算力', 'Compute this week')} right=${html`<a href="/runs">${L('算力与失败 →', 'Compute & failures →')}</a>`}>
          <div class="row"><span class="big">${d.budget.used}</span><span class="mut small">/ ${d.budget.total} GPU·h</span></div>
          <div style="margin-top:8px"><${Bar} v=${d.budget.used / d.budget.total} c=${d.budget.used / d.budget.total > 0.9 ? 'var(--bad)' : 'var(--acc)'} /></div>
        <//>
      </div>
    </div>
  <//>`;
}
const Fragment = ({ children }) => children;

export function Main({ q, onShell }) {
  const { data, act } = useScreen('main', {}, onShell);
  const [sort, setSort] = useState('ideas');
  if (!data) return html`<${Loading} />`;
  const d = data.main;
  const fr = [...d.frontier].sort((a, b) => sort === 'ideas' ? b.ideas.length - a.ideas.length : a.id.localeCompare(b.id));
  return html`<${Frame} tools=${html`
    <span class="chip">${L('执行槽位', 'Slots')} ${d.running.length}/${d.slots}</span>
    <span class="chip">${L('排队', 'Queued')} ${d.queued.length}</span>
    <div class="grow"></div>
    <a class="btn sm" href="/ideas">${I('plus', { s: 13 })}${L('新建 idea', 'New idea')}</a>`}>
    <div class="kpis">
      <${Kpi} k=${L('并行 idea', 'Parallel ideas')} v=${d.stats.parallel} s=${L(`${d.stats.candidates} 个待启动`, `${d.stats.candidates} to start`)} onClick=${() => go('/ideas')} />
      <${Kpi} k=${L('全局 frontier', 'Global frontier')} v=${d.stats.frontier} s=${L('可直接开跑', 'ready to run')} />
      <${Kpi} k=${L('运行中实验', 'Running')} v=${d.stats.running} s=${d.running.map((r) => r.id).join(' ')} onClick=${() => go('/experiments')} />
      <${Kpi} k=${L('待裁定', 'Pending verdicts')} v=${d.stats.pending} warn=${d.stats.pending > 0} s=${L('等你处理', 'waiting on you')} onClick=${() => go('/review')} />
      <${Kpi} k=${L('一次实验平均服务', 'Ideas served per run')} v=${d.stats.perExp} s=${L('个 idea', 'ideas')} />
    </div>

    <div class="cols2" style="margin-top:12px">
      <${Card} title=${L('全局 frontier', 'Global frontier')} sub=${L('依赖已就绪、可直接开跑的假设 · 跨全部 idea', 'Hypotheses whose dependencies are ready · across all projects')}
        right=${html`<div class="row"><span class="tiny faint">${L('排序', 'Sort')}</span>
          <div class="seg"><button class=${sort === 'ideas' ? 'on' : ''} onClick=${() => setSort('ideas')}>${L('覆盖 idea 数', 'Ideas covered')}</button>
          <button class=${sort === 'id' ? 'on' : ''} onClick=${() => setSort('id')}>ID</button></div></div>`}
        foot=${html`<button class="btn sm pri" onClick=${() => act('exp.runBatch', { hyps: fr.filter((f) => !f.queued).slice(0, 3).map((f) => f.id) })}>
            ${L('按顺序批量开跑前 3 条', 'Queue the top 3 in order')}</button>
          <span class="tiny faint">${L('服务多个 idea 的优先', 'Multi-project hypotheses go first')}</span>`}>
        <table><tbody>
          ${fr.map((f) => html`<tr class="clickable" onClick=${() => go('/panorama?h=' + f.id)}>
            <td style="width:112px">${f.ideas.map((i) => html`<${IdeaTag} id=${i} />`)}</td>
            <td style="width:52px" class="mono b">${f.id}</td>
            <td>${t(f.claim)}${f.ideas.length > 1 && html`<span class="chip acc" style="margin-left:7px">${L(`服务 ${f.ideas.length} 个 idea`, `serves ${f.ideas.length} ideas`)}</span>`}</td>
            <td style="width:88px"><${St} s=${f.needsDecompose ? 'untested' : f.status} label=${f.needsDecompose ? L('待拆解', 'to decompose') : f.rerun ? L('需复跑', 'needs re-run') : undefined} /></td>
            <td style="width:92px;text-align:right" onClick=${(e) => e.stopPropagation()}>
              ${f.needsDecompose
                ? html`<button class="btn xs" onClick=${() => act('hyp.decompose', { hyp: f.id })}>${L('拆解', 'Decompose')}</button>`
                : f.queued ? html`<span class="chip">${L('已入队', 'queued')}</span>`
                : html`<button class="btn xs acc" onClick=${() => act('exp.run', { hyp: f.id })}>${L('运行实验', 'Run')}</button>`}
            </td>
          </tr>`)}
        </tbody></table>
      <//>

      <div class="col">
        <${Card} title=${L('执行槽位', 'Execution slots')} sub=${L(`${d.running.length} / ${d.slots} 占用 · 排队 ${d.queued.length}`, `${d.running.length} / ${d.slots} busy · ${d.queued.length} queued`)}
          right=${html`<a href="/experiments">${L('进实验页 →', 'Experiments →')}</a>`}>
          <div class="col">
            ${d.running.map((r) => html`
              <div style="padding:10px;border:1px solid var(--line);border-radius:6px;cursor:pointer" onClick=${() => go('/experiments?e=' + r.id)}>
                <div class="row">${r.ideas.map((i) => html`<${IdeaTag} id=${i} />`)}<span class="mono b">${r.id}</span>
                  <span class="mono tiny mut">${r.hyp}</span><div class="grow"></div>
                  <span class="tiny mut">${dur(r.etaMs)}</span></div>
                <div class="small mut" style="margin:6px 0">${t(r.claim)}</div>
                <${Bar} v=${r.prog} />
              </div>`)}
            ${d.queued.map((r) => html`
              <div class="row" style="padding:8px 10px;border:1px dashed var(--line);border-radius:6px;cursor:pointer" onClick=${() => go('/experiments?e=' + r.id)}>
                <span class="mono b small">${r.id}</span><span class="mono tiny mut">${r.hyp}</span>
                <span class="small mut" style="flex:1 1 90px">${t(r.label)}</span><${St} s="queued" /></div>`)}
          </div>
        <//>

        <${Card} title=${L('待裁定', 'Awaiting a verdict')} sub=${L('executor 不再往下展开', 'the executor stops expanding here')}>
          <div class="col">
            ${d.pending.length === 0 && html`<${Empty}>${L('队列是空的。', 'The queue is empty.')}<//>`}
            ${d.pending.map((v) => html`
              <div style="padding:10px;border:1px solid var(--warnln);background:var(--warnbg);border-radius:6px;cursor:pointer" onClick=${() => go('/review?h=' + v.id)}>
                <div class="row"><span class="mono b">${v.id}</span><span class="small" style="flex:1 1 120px">${t(v.claim)}</span><${Score} v=${v.score} /></div>
                <div class="row" style="margin-top:7px">${v.ideas.map((i) => html`<${IdeaTag} id=${i} />`)}</div>
                <div class="tiny mut" style="margin-top:6px">${v.impact.map((i) => i.kind === 'global' ? L(`${i.idea} 的根前提，裁定后整棵树重估`, `root premise of ${i.idea} — the whole tree is re-estimated`)
                  : i.kind === 'local' ? L(`${i.idea} 有独立证据，不受影响`, `${i.idea} has independent evidence`)
                  : L(`${i.idea} 下游 ${i.frozen} 个节点冻结`, `${i.frozen} downstream nodes freeze in ${i.idea}`)).join(' · ')}</div>
              </div>`)}
          </div>
        <//>

        <${Card} title=${L('活动', 'Activity')} sub="events.jsonl" right=${html`<a href="/events">${L('全部 →', 'All →')}</a>`}>
          <div class="list">
            ${d.events.map((e) => html`<div class="item" style="cursor:default;padding:8px 0">
              <span class="mono tiny faint" style="width:42px;flex-shrink:0">${hm(e.t)}</span>
              <div><div class="small">${t(e.title)}</div><div class="tiny mut" style="margin-top:2px">${t(e.detail)}</div></div>
            </div>`)}
          </div>
        <//>
      </div>
    </div>
  <//>`;
}

export function Events({ q, onShell }) {
  const [kind, setKind] = useState(q.kind || 'all');
  const { data } = useScreen('events', { kind }, onShell);
  if (!data) return html`<${Loading} />`;
  const d = data.events;
  const KINDS = { all: L('全部', 'All'), collect: L('采集', 'Collection'), experiment: L('实验', 'Experiments'), hypothesis: L('假设', 'Hypotheses'), verdict: L('裁定', 'Verdicts'), idea: 'Idea', paper: L('写作', 'Writing') };
  return html`<${Frame} tools=${html`<div class="seg">
      ${Object.entries(KINDS).map(([k, lab]) => html`<button class=${kind === k ? 'on' : ''} onClick=${() => setKind(k)}>${lab}</button>`)}
    </div><div class="grow"></div><span class="mono tiny faint">events.jsonl · ${d.list.length} ${L('行', 'lines')}</span>`}>
    <${Card} title=${L('事件流', 'Event stream')} sub=${L('每个 agent 只写自己的行，人工动作也记在这里', 'Each agent writes only its own lines; manual actions are logged too')}>
      <table><tbody>
        ${d.list.map((e) => html`<tr>
          <td style="width:88px" class="mono tiny faint">${hm(e.t)}<div>${ago(e.t)}</div></td>
          <td style="width:74px"><span class="tag">${e.mod}</span></td>
          <td><div class="b small">${t(e.title)}</div><div class="tiny mut" style="margin-top:2px">${t(e.detail)}</div></td>
          <td style="width:80px;text-align:right">
            ${e.hyp && html`<a class="mono tiny" href=${'/panorama?h=' + e.hyp}>${e.hyp}</a>`}
            ${e.exp && html`<a class="mono tiny" href=${'/experiments?e=' + e.exp} style="margin-left:6px">${e.exp}</a>`}
          </td>
        </tr>`)}
      </tbody></table>
    <//>
  <//>`;
}
