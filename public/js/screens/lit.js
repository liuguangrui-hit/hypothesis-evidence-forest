// Literature: collection pipeline, trends, sparks, paper detail.
import { html, useState, useScreen, Frame, Card, Table, Kpi, Loading, Empty, Editable, t, L, I, St, Bar, IdeaTag, dur, ago, md, clock } from './common.js';
import { go, qs } from '../app.js';
const F = ({ children }) => children;

export function Survey({ q, onShell }) {
  const { data, act } = useScreen('survey', {}, onShell, 2000);
  const [tab, setTab] = useState('venues');
  if (!data) return html`<${Loading} />`;
  const d = data.survey;
  const job = d.job;
  return html`<${Frame} tools=${html`
    <span class="chip">surveyor · ${data.shell.agents.surveyor}</span>
    <span class="small mut">${L(`上轮 ${clock(d.lastRun)} 完成 · 下次 ${d.nextInDays} 天后`, `Last round ${clock(d.lastRun)} · next in ${d.nextInDays} days`)}</span>
    <div class="grow"></div>
    ${job ? html`<span class="chip acc"><span class="spin"></span>${L(`采集中 · 还剩 ${dur(job.remainMs)}`, `Collecting · ${dur(job.remainMs)} left`)}</span>`
      : html`<button class="btn sm pri" onClick=${() => act('survey.collect', {})}>${I('play', { s: 12 })}${L('立即采集', 'Collect now')}</button>`}`}>

    <div class="kpis">
      <${Kpi} k=${L('来源白名单', 'Sources whitelisted')} v=${d.whitelist} s=${L(`core 全量 ${d.venues.filter((v) => v.scan === 'core').length} · watch ${d.venues.filter((v) => v.scan === 'watch').length}`, `${d.venues.filter((v) => v.scan === 'core').length} core · ${d.venues.filter((v) => v.scan === 'watch').length} watch`)} />
      <${Kpi} k=${L('本轮新增', 'Added this round')} v=${d.thisRound} s=${L('题录 level 1', 'records, level 1')} />
      <${Kpi} k=${L('全文下载', 'Full texts')} v=${d.fulltext + ' / ' + d.fulltextCap} s=${L('命中 track 优先', 'track hits first')} />
      <${Kpi} k=${L('跳过与异常', 'Skipped & failed')} v=${d.skipped} s=${L('全部记录，不静默重试', 'all logged, never retried silently')} />
      <${Kpi} k=${L('文献库', 'Library')} v=${d.library.toLocaleString()} s=${L('累计题录', 'records total')} />
    </div>

    ${job && html`<div class="card" style="margin-top:12px"><div class="bd">
      <div class="row"><span class="spin"></span><span class="b">${L('正在按游标增量拉取…', 'Pulling incrementally from the cursors…')}</span>
        <div class="grow"></div><span class="mono small">${dur(job.remainMs)}</span></div>
      <div style="margin-top:9px"><${Bar} v=${1 - job.remainMs / (job.endsAt - job.startedAt)} /></div>
    </div></div>`}

    <div class="toolbar" style="margin-top:12px;border:1px solid var(--line);border-radius:7px 7px 0 0;border-bottom:none">
      <div class="seg">
        <button class=${tab === 'venues' ? 'on' : ''} onClick=${() => setTab('venues')}>${L('来源白名单', 'Whitelist')} ${d.venues.length}</button>
        <button class=${tab === 'funnel' ? 'on' : ''} onClick=${() => setTab('funnel')}>${L('本轮分级', 'Grading')}</button>
        <button class=${tab === 'cand' ? 'on' : ''} onClick=${() => setTab('cand')}>${L('候选 · 待确认', 'Candidates')} ${d.candidates.length}</button>
      </div>
      <div class="grow"></div>
      <span class="tiny faint">${L('scan 字段决定扫法 · 点一行可切换', 'the scan field decides how a source is read · click a row to switch')}</span>
    </div>

    ${tab === 'venues' && html`<div class="card" style="border-radius:0 0 7px 7px"><div class="bd" style="padding:0">
      <${Table}><thead><tr>
        <th style="width:96px">id</th><th>${L('来源', 'Source')}</th><th style="width:118px">${L('类型 · 等级', 'Type · tier')}</th>
        <th style="width:110px">${L('扫法', 'Scan')}</th><th style="width:170px">${L('入口 · 游标', 'Entry · cursor')}</th><th style="width:100px">${L('本轮', 'This round')}</th>
      </tr></thead><tbody>
        ${d.venues.map((v) => html`<tr class="clickable" onClick=${() => act('survey.venue', { id: v.id, field: 'scan' })}>
          <td class="mono tiny">${v.id}</td>
          <td class="b" style=${{ opacity: v.status === 'parked' ? .5 : 1 }}>${v.name}</td>
          <td class="small mut">${v.type === 'conf' ? L('会议', 'conf') : v.type === 'journal' ? L('期刊', 'journal') : L('预印', 'preprint')} · ${v.level || L('无等级', 'unranked')}</td>
          <td><span class=${'chip ' + (v.scan === 'core' ? 'acc' : '')}>${v.scan === 'core' ? L('core · 全量', 'core · full') : L('watch · 关键词', 'watch · keyword')}</span></td>
          <td class="mono tiny mut">${v.entry}${v.cursor ? ' · ' + v.cursor : ''}</td>
          <td>${v.status === 'broken' ? html`<${St} s="broken" />` : v.status === 'parked' ? html`<${St} s="parked" />` : html`<span class="num" style="color:var(--ok)">+${v.delta}</span>`}</td>
        </tr>`)}
      </tbody><//>
    </div>
    <div class="ft">${L(`其余 ${d.others} 个来源本轮无新增 · 停用清单另存 ${d.parked} 个，采集时不读`, `${d.others} other sources added nothing this round · ${d.parked} parked sources are not read`)}
      <div class="grow"></div><a href="/digest">${L('看一篇入库论文 →', 'Open an indexed paper →')}</a></div></div>`}

    ${tab === 'funnel' && html`<div class="card" style="border-radius:0 0 7px 7px"><div class="bd">
      <div class="cols2">
        <div>
          ${[[L('枚举 / 关键词检索到', 'Enumerated / searched'), d.enumerated, L('core 全量枚举 + watch 按 seeds 检索', 'core enumerated in full + watch searched by seeds'), 1],
            [L('通过 topics.md 判定', 'Passed topics.md'), d.passedTopics, L('命中至少一个 track，可多标', 'matches at least one track; multiple allowed'), d.passedTopics / d.enumerated],
            [L('level 1 · 入库题录 + 摘要原文', 'level 1 · record + abstract'), d.funnel.l1, L('到预算上限即停，游标已写回 state.json', 'stops at the budget cap; cursors written back to state.json'), d.funnel.l1 / d.enumerated],
            [L('level 2 · 下载全文 + digest', 'level 2 · full text + digest'), d.funnel.l2, L(`命中 track 的优先，${d.funnel.l2} / ${d.fulltextCap}`, `track hits first, ${d.funnel.l2} / ${d.fulltextCap}`), d.funnel.l2 / d.enumerated],
            [L('level 3 · brief_zh + full_zh', 'level 3 · brief + full translation'), d.funnel.l3, L('只做 queue_fulltext.txt 里的 id', 'only ids listed in queue_fulltext.txt'), d.funnel.l3 / d.enumerated]].map(([lab, n, note, w]) => html`
            <div style="margin-bottom:13px">
              <div class="row"><span class="small b">${lab}</span><div class="grow"></div><span class="num">${n}</span></div>
              <div style="margin:5px 0"><${Bar} v=${Math.max(0.02, w)} /></div>
              <div class="tiny mut">${note}</div>
            </div>`)}
        </div>
        <div>
          <div class="note"><div class="b" style="margin-bottom:6px">state.json</div>
            <div class="mono tiny" style="line-height:2">
              ${Object.entries(d.state).map(([k, v]) => html`<div><span class="faint">${k}</span> ${v}</div>`)}
            </div></div>
          <div class="note warn" style="margin-top:11px">notes：${t(d.notes)}</div>
          <div class="row" style="margin-top:11px"><span class="chip">${L('库存', 'Stock')} ${d.stock[0]} / ${d.stock[1]} / ${d.stock[2]}</span></div>
        </div>
      </div>
    </div></div>`}

    ${tab === 'cand' && html`<div class="card" style="border-radius:0 0 7px 7px"><div class="bd">
      <div class="tiny faint" style="margin-bottom:9px">${L('agent 只追加，不改白名单', 'the agent only appends; it never edits the whitelist')}</div>
      ${d.candidates.length === 0 && html`<${Empty}>${L('没有待确认的候选。', 'No candidates awaiting confirmation.')}<//>`}
      <div class="col">
        ${d.candidates.map((c) => html`
          <div style="padding:12px;border:1px solid var(--line);border-radius:6px">
            <div class="row"><span class="chip">${c.kind === 'venue' ? L('来源', 'Source') : L('方向', 'Topic')}</span>
              <span class="b">${t(c.name)}</span><span class="tiny faint">${c.date}</span></div>
            <div class="small mut" style="margin-top:7px">${t(c.why)}</div>
            <div class="row" style="margin-top:9px">
              <button class="btn sm acc" onClick=${() => act('survey.candidate', { id: c.id, accept: true })}>${t(c.accept)}</button>
              <button class="btn sm" onClick=${() => act('survey.candidate', { id: c.id, accept: false })}>${L('驳回', 'Reject')}</button>
            </div>
          </div>`)}
      </div>
    </div></div>`}
  <//>`;
}

const CLUSTERS = [['间接注入与工具链投毒', 'Indirect injection & tool-chain poisoning', 46, 'new'], ['越狱与护栏绕过', 'Jailbreak & guardrail bypass', 63, '+18%'],
  ['记忆化与训练数据提取', 'Memorisation & data extraction', 37, '+9%'], ['自动科研系统评测', 'Evaluating automated science', 29, 'new'],
  ['模型窃取与水印', 'Model stealing & watermarking', 24, '−31%'], ['反学习与合规删除', 'Unlearning & compliant deletion', 22, '+2%'], ['多 agent 协作失效', 'Multi-agent coordination failure', 18, 'new']];
const TERMS = [['RAG poisoning', 180], ['guardrail bypass', 140], ['indirect prompt injection', 95], ['automated reproduction', 62], ['deepfake detection', -40], ['model watermarking', -35]];
const GAPS = [
  { id: 'g1', kind: 'gap', zh: '注入点在工具返回值里', en: 'The injection point is in tool return values', bzh: '现有防御都假设注入来自用户输入端，agent 读工具输出这一侧几乎没人设防。6 篇提到，0 篇解决。', ben: 'Existing defences assume injection comes from user input; almost nobody guards the side where an agent reads tool output. Mentioned in 6 papers, solved in 0.', src: 'arxiv-2606-01882, doi-10-1145-3576915-3616600, +4' },
  { id: 'g2', kind: 'contra', zh: '模型规模与越狱成功率', en: 'Model scale vs. jailbreak success', bzh: '两篇在同一基准上给出相反方向的结论，评测口径不同但都没说明。', ben: 'Two papers reach opposite conclusions on the same benchmark; their setups differ and neither says so.', src: 'arxiv-2605-09931, doi-10-1109-sp2026-00142' },
  { id: 'g3', kind: 'gap', zh: '自动科研系统只评「对不对」', en: 'Automated science is judged only on correctness', bzh: '评测都在结果正确性上，没有一篇评测产出能否被第三方复现。', ben: 'Evaluations only check whether results are correct; none checks whether outputs can be reproduced by a third party.', src: 'arxiv-2607-11244, +3' },
];

export function Trends({ q, onShell }) {
  const { data, act } = useScreen('trends', {}, onShell);
  if (!data) return html`<${Loading} />`;
  const done = data.trends.gaps;
  return html`<${Frame} tools=${html`
    <span class="chip mono">2026-09</span><span class="chip">reviewer · ${data.shell.agents.reviewer}</span>
    <span class="small mut hide-s">${L('触发：到期 · 且新增 core 172 篇 ≥ 阈值 150', 'Trigger: due · and 172 new core papers ≥ threshold 150')}</span>
    <div class="grow"></div><span class="tiny faint">${L('回看窗口 12 个月', '12-month look-back')}</span>`}>
    <div class="kpis">
      <${Kpi} k=${L('本期新增题录', 'New records')} v="612" s=${L('入库 level 1', 'level 1')} />
      <${Kpi} k=${L('新增 digest', 'New digests')} v="148" s="level 2" />
      <${Kpi} k=${L('命中 track', 'Track hits')} v="268" s="191 / 52 / 25" />
      <${Kpi} k=${L('进全文队列', 'To full-text queue')} v="12" s=${L('上限 15', 'cap 15')} />
    </div>
    <div class="cols2" style="margin-top:12px">
      <div class="col">
        <${Card} title=${L('主题簇', 'Topic clusters')} sub=${L('从 digest 的 keywords 聚出来，不是预设分类', 'clustered from digest keywords, not a fixed taxonomy')}>
          ${CLUSTERS.map(([zh, en, n, tag]) => html`
            <div style="margin-bottom:9px">
              <div class="row"><span class="small b" style="flex:1 1 150px">${L(zh, en)}</span>
                <span class=${'chip ' + (tag === 'new' ? 'acc' : tag.startsWith('−') ? 'bad' : '')}>${tag === 'new' ? L('新簇', 'new') : tag}</span>
                <span class="num" style="width:32px;text-align:right">${n}</span></div>
              <div style="margin-top:4px"><${Bar} v=${n / 70} h=${5} c=${tag === 'new' ? 'var(--acc)' : 'var(--faint2)'} /></div>
            </div>`)}
          <div class="note" style="margin-top:10px">${L('本期 3 个新簇；「间接注入与工具链投毒」里有 5 篇做法高度相似，按规则不合并——同期扎堆本身是信号。',
            'Three new clusters this period. Five papers in “indirect injection” look almost alike; by the rules they are not merged — a pile-up in one period is itself a signal.')}</div>
        <//>
        <${Card} title=${L('术语变化', 'Term shifts')} sub=${L('相对上期，keywords 用英文原文', 'versus last period; keywords kept in the original English')}>
          <div class="cols3">
            ${TERMS.map(([term, pctv]) => html`
              <div class="row" style="justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--line2)">
                <span class="mono tiny">${term}</span>
                <span class="num small" style=${{ color: pctv > 0 ? 'var(--ok)' : 'var(--bad)' }}>${pctv > 0 ? '+' : ''}${pctv}%</span></div>`)}
          </div>
          <div class="row" style="margin-top:11px;gap:7px">
            <span class="tiny faint">${L('本期新出现', 'New this period')}:</span>
            ${[['agent hijacking', 14], ['tool poisoning', 9], ['computer-use agent', 7], ['reproduction benchmark', 5]].map(([k, n]) => html`<span class="chip mono">${k} ${n}</span>`)}
          </div>
          <div class="note" style="margin-top:11px">${L('同一现象两个名字：jailbreak 与 guardrail bypass 并存，agent hijacking 与 agent takeover 并存。两边都保留，不做归一化。',
            'One phenomenon, two names: jailbreak and guardrail bypass coexist, as do agent hijacking and agent takeover. Both are kept; nothing is normalised.')}</div>
        <//>
      </div>
      <div class="col">
        <${Card} title=${L('空白与矛盾', 'Gaps and contradictions')} sub=${L('spark 的主要来源', 'the main source of sparks')}>
          <div class="col">
            ${GAPS.map((g) => html`
              <div style=${{ padding: '12px', border: '1px solid var(--line)', borderRadius: '6px', background: done[g.id] ? 'var(--okbg)' : undefined }}>
                <div class="row"><span class=${'chip ' + (g.kind === 'gap' ? 'acc' : 'warn')}>${g.kind === 'gap' ? L('空白', 'gap') : L('矛盾', 'contradiction')}</span>
                  <span class="b small">${L(g.zh, g.en)}</span></div>
                <div class="small mut" style="margin-top:7px">${L(g.bzh, g.ben)}</div>
                <div class="mono tiny faint" style="margin-top:7px">${g.src}</div>
                <div class="row" style="margin-top:9px">
                  ${done[g.id]
                    ? html`<a class="btn sm" href="/sparks">${L('已生成 spark，去看 →', 'Spark generated — open it →')}</a>`
                    : html`<button class="btn sm acc" onClick=${() => act('spark.gen', { gap: g.id })}>${I('zap', { s: 12, c: '#fff' })}${L('生成 spark', 'Generate a spark')}</button>`}
                </div>
              </div>`)}
          </div>
        <//>
        <${Card} title=${L('与上期相比', 'Versus last period')}>
          ${[[L('起来了', 'Rising'), L('间接注入相关工作翻倍，且首次出现在安全四大正会', 'Indirect-injection work doubled and appeared at the four top security venues for the first time'), 'ok'],
            [L('停了', 'Stalled'), L('静态水印鲁棒性连续两期无新增', 'Static watermark robustness added nothing for two periods running'), ''],
            [L('被证伪', 'Falsified'), L('「小模型更难越狱」被 3 篇反例推翻，其中 2 篇用同一基准', '“Smaller models are harder to jailbreak” was overturned by 3 counter-examples, 2 on the same benchmark'), 'bad']].map(([k, v, c]) => html`
            <div style="padding:8px 0;border-bottom:1px solid var(--line2)">
              <span class=${'chip ' + c}>${k}</span><div class="small mut" style="margin-top:5px">${v}</div></div>`)}
        <//>
      </div>
    </div>
  <//>`;
}

export function Sparks({ q, onShell }) {
  const { data, act } = useScreen('sparks', {}, onShell);
  const [sel, setSel] = useState(q.s || null);
  const [filter, setFilter] = useState('all');
  if (!data) return html`<${Loading} />`;
  const d = data.sparks;
  const cur = d.items.find((x) => x.id === (sel || q.s)) || d.items[0];
  const shown = filter === 'all' ? d.items : d.items.filter((x) => x.status === filter);
  const byStatus = (s) => d.items.filter((x) => x.status === s).length;
  return html`<${Frame} tools=${html`
    <div class="seg">
      <button class=${filter === 'all' ? 'on' : ''} onClick=${() => setFilter('all')}>${L('本期', 'This period')} ${d.items.length}</button>
      ${['available', 'selected', 'developed'].map((s) => html`<button class=${filter === s ? 'on' : ''} onClick=${() => setFilter(s)}>${s} ${byStatus(s)}</button>`)}
    </div>
    <span class="vr"></span><span class="tiny faint">${L(`配额 ${d.quota[0]}–${d.quota[1]} · 历史 ${d.history} 条`, `quota ${d.quota[0]}–${d.quota[1]} · ${d.history} historical`)}</span>
    <div class="grow"></div>
    <span class="small mut hide-s">${L('状态只有 available / selected / developed', 'States are only available / selected / developed')}</span>`}>
    <div class="cols2b">
      <${Card} title=${L('本期 spark', 'Sparks this period')} sub=${L('ID 按月编号，不复用', 'IDs are numbered per month and never reused')}>
        <div class="list" style="margin:-13px -14px">
          ${shown.map((s) => html`
            <div class=${'item' + (cur?.id === s.id ? ' on' : '')} onClick=${() => setSel(s.id)}>
              <div style="flex-grow:1">
                <div class="row"><span class="mono tiny b">${s.id.replace('SPARK-2026-09-', '')}</span><${St} s=${s.status} />
                  ${s.ideaOf && html`<${IdeaTag} id=${s.ideaOf} />`}</div>
                <div class="small" style="margin-top:5px">${t(s.ask)}</div>
                <div class="tiny faint" style="margin-top:4px">${L(`证 ${s.papers.length} 篇`, `${s.papers.length} papers`)}</div>
              </div>
            </div>`)}
        </div>
        <div class="ft" style="margin:0 -14px -13px">${L(`本期起草 ${d.drafted} 条，自检删掉 ${d.dropped} 条，没有凑满配额`, `${d.drafted} drafted this period, ${d.dropped} dropped by the self-checks — the quota was not padded`)}</div>
      <//>

      ${cur && html`<div class="col">
        <${Card} title=${cur.id} sub=${t(cur.from)} right=${html`<${St} s=${cur.status} />`}>
          ${[[L('问', 'Ask'), t(cur.ask)], [L('据', 'Basis'), t(cur.basis)]].map(([k, v]) => html`
            <div class="row" style="align-items:flex-start;margin-bottom:9px">
              <span class="chip" style="width:34px;justify-content:center">${k}</span>
              <div style="flex:1 1 200px;line-height:1.75">${v}</div></div>`)}
          <div class="row" style="align-items:flex-start">
            <span class="chip" style="width:34px;justify-content:center">${L('证', 'Cites')}</span>
            <div class="row" style="flex:1 1 200px">${cur.papers.map((p) => html`<a class="chip mono" href=${'/digest?id=' + p}>${p}</a>`)}</div>
          </div>
          ${cur.search && html`<div class="row" style="align-items:flex-start;margin-top:9px">
            <span class="chip" style="width:34px;justify-content:center">${L('查', 'Search')}</span>
            <div class="small mut" style="flex:1 1 200px">${t(cur.search)}</div></div>`}
        <//>
        ${cur.checks && html`<${Card} title=${L('三道自检', 'Three self-checks')}>
          ${cur.checks.map((c) => html`<div class="row" style="align-items:flex-start;margin-bottom:7px">
            ${I('check', { s: 14, c: 'var(--ok)' })}<span class="small" style="flex:1 1 200px">${t(c)}</span></div>`)}
          <div class="note" style="margin-top:9px">${L(`被删的 ${d.dropped} 条：2 条读起来是方案，1 条说不出谁会因此改变决定。`, `The ${d.dropped} dropped: two read as solutions, one could not name anyone who would change a decision.`)}</div>
        <//>`}
        <${Card} title=${L('交接', 'Hand-off')} sub=${L('Codex 选中后只改这一行的状态', 'Codex only changes this row’s state when it picks one up')}>
          <div class="row">
            ${cur.status === 'available' && html`<button class="btn sm pri" onClick=${() => act('spark.state', { id: cur.id, status: 'selected' })}>${L('标为 selected · 交给 Codex', 'Mark selected · hand to Codex')}</button>`}
            ${cur.status === 'selected' && html`<${F}>
              <a class="btn sm acc" href="/ideas">${L('去立项页展开成假设', 'Expand into hypotheses →')}</a>
              <button class="btn sm" onClick=${() => act('spark.state', { id: cur.id, status: 'developed' })}>${L('标为 developed', 'Mark developed')}</button><//>`}
            ${cur.status === 'developed' && html`<a class="btn sm" href=${'/tree?idea=' + (cur.ideaOf || 'P-014')}>${L('看展开出来的假设树 →', 'Open the tree it grew into →')}</a>`}
            <button class="btn sm" onClick=${() => act('spark.merge', { id: cur.id })}>${L('合并到…', 'Merge into…')}</button>
            ${cur.status === 'available' && html`<button class="btn sm" onClick=${() => act('spark.state', { id: cur.id, status: 'parked' })}>${L('暂存 parked', 'Park it')}</button>`}
          </div>
          <div class="note" style="margin-top:10px">${L(`没有 rejected：这期没被选中的留在 available，下期连同新 spark 一起给 Codex 挑。`,
            'There is no rejected state: whatever is not picked stays available and goes back to Codex next period with the new sparks.')}</div>
        <//>
        <${Card} title=${L('近期动作', 'Recent actions')}>
          ${d.actions.slice(0, 6).map((a) => html`<div class="row" style="padding:5px 0;border-bottom:1px solid var(--line2)">
            <span class="mono tiny faint" style="width:44px">${md(a.at)}</span><span class="small">${L(a.zh, a.en)}</span></div>`)}
        <//>
      </div>`}
    </div>
  <//>`;
}

export function Digest({ q, onShell }) {
  const { data, act } = useScreen('digest', { id: q.id }, onShell);
  if (!data) return html`<${Loading} />`;
  const d = data.digest, p = d.paper;
  const FIELDS = [['problem', '问题', 'Problem'], ['threat', '威胁模型', 'Threat model'], ['method', '方法', 'Method'], ['eval', '评测', 'Evaluation'], ['conclusion', '结论', 'Conclusion'], ['limits', '局限｜读者观察', 'Limitations / reader notes']];
  return html`<${Frame} tools=${html`
    <a class="btn xs" href="/survey">${I('back', { s: 12 })}${L('采集管线', 'Collection')}</a>
    <select style="width:auto;max-width:280px" value=${p.id} onChange=${(e) => go('/digest?id=' + e.target.value)}>
      ${d.all.map((x) => html`<option value=${x.id}>${x.id} · ${t(x.title).slice(0, 40)}</option>`)}
    </select>
    <span class="chip">level ${p.level}</span>
    ${p.tracks.map((tr) => html`<span class="chip acc">${tr}</span>`)}
    <div class="grow"></div>
    <button class="btn sm" onClick=${() => act('paper.queue', { id: p.id })}>${p.queued ? L('移出全文队列', 'Remove from queue') : L('加入全文队列', 'Add to full-text queue')}</button>
    ${p.level < 3 && html`<button class="btn sm pri" onClick=${() => act('paper.level3', { id: p.id })}>${L('升到 level 3', 'Promote to level 3')}</button>`}`}>
    <div class="cols2">
      <div class="col">
        <${Card} title="digest.md" sub=${L('字段固定、顺序固定、缺项写「未提及」——趋势分析只读这一份', 'Fixed fields in a fixed order; missing ones say “not mentioned”. Trend analysis reads only this.')}
          right=${html`<button class="btn xs" onClick=${() => act('paper.regen', { id: p.id })}>${L('重新生成 digest', 'Regenerate digest')}</button>`}>
          ${p.digest ? html`<${F}>
            <div class="b" style="font-size:14px;margin-bottom:11px">${t(p.digest.title)}</div>
            ${FIELDS.map(([k, zh, en]) => html`
              <div class="row" style="align-items:flex-start;margin-bottom:10px">
                <span class="chip" style="width:84px;flex-shrink:0;justify-content:center">${L(zh, en)}</span>
                <div style="flex:1 1 200px;line-height:1.8">${t(p.digest[k])}</div></div>`)}
            <div class="hr"></div>
            <div class="row wrap"><span class="chip" style="width:84px;justify-content:center">${L('关键词', 'Keywords')}</span>
              ${p.keywords.map((k) => html`<span class="chip mono">${k}</span>`)}</div>
            <div class="tiny faint" style="margin-top:7px">${L('英文原文术语，不做中译也不归一化——跨批次聚类要对得上。', 'Terms stay in the original English, untranslated and un-normalised, so clustering matches across batches.')}</div>
            ${p.regenAt && html`<div class="note acc" style="margin-top:10px">${L(`digest 已于 ${clock(p.regenAt)} 重新生成。`, `Digest regenerated at ${clock(p.regenAt)}.`)}</div>`}
          <//>` : html`<${Empty}>${L('这篇还没有 digest（level 1）。', 'No digest yet (level 1).')}<//>`}
        <//>
      </div>
      <div class="col">
        <${Card} title="meta.json" sub=${L('题录与状态', 'record and state')}>
          <${Table}><tbody>
            ${[['title', t(p.title)], ['authors', p.authors], ['venue', p.venue], ['year', p.year], ['doi', p.doi || 'null'], ['arxiv_id', p.arxiv || '—'],
              ['status', p.status], ['level', p.level], ['tracks', p.tracks.join(', ')]].map(([k, v]) => html`
              <tr><td class="mono tiny faint" style="width:76px">${k}</td><td class="small">${v}</td></tr>`)}
          </tbody><//>
          <div class="note" style="margin-top:10px">${L('include_reason：', 'include_reason: ')}${t(p.reason)}</div>
        <//>
        <${Card} title=${L('落盘目录', 'On disk')} sub=${'sources/papers/' + p.id + '/'}>
          ${[['meta.json', L('题录与状态', 'record and state'), true], ['raw.pdf', L(`原文 ${p.size}`, `source, ${p.size}`), true],
            ['digest.md', L('结构化摘要', 'structured summary'), !!p.digest], ['brief_zh.md', p.brief ? L('已生成', 'generated') : L('未生成', 'not generated'), p.brief],
            ['full_zh.md', p.full ? L('已生成', 'generated') : L('未生成', 'not generated'), p.full]].map(([f, note, on]) => html`
            <div class="row" style=${{ padding: '5px 0', opacity: on ? 1 : .45 }}>
              <span class="mono small" style="width:96px">${f}</span><span class="tiny mut">${note}</span></div>`)}
          <div class="note" style="margin-top:9px">${L('预印转正后只改 doi / venue / status，目录名不变，已有引用不会断。',
            'When a preprint is published only doi / venue / status change; the directory name stays, so existing citations do not break.')}</div>
        <//>
        ${d.cited.length > 0 && html`<${Card} title=${L('被引用于', 'Cited by')}>
          ${d.cited.map((s) => html`<a class="item" href="/sparks" style="text-decoration:none;color:inherit">
            <div><div class="row"><span class="mono tiny b">${s.id}</span><${St} s=${s.status} /></div>
              <div class="small mut" style="margin-top:4px">${t(s.ask)}</div></div></a>`)}
        <//>`}
        ${p.similar?.length > 0 && html`<${Card} title=${L('相近论文 · embedding', 'Nearest papers · embedding')}>
          ${p.similar.map(([id, s]) => html`<a class="row" href=${'/digest?id=' + id} style="padding:6px 0;color:inherit;border-bottom:1px solid var(--line2)">
            <span class="mono tiny" style="width:150px;overflow:hidden;text-overflow:ellipsis">${id}</span>
            <span class="small mut" style="flex:1 1 60px">${t(d.all.find((x) => x.id === id)?.title) || ''}</span>
            <span class="num small">${s}</span></a>`)}
        <//>`}
      </div>
    </div>
  <//>`;
}
