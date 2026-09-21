// The public homepage: one long scrolling page that explains the system,
// then hands the visitor a live workbench.
import { html, useState, useEffect, useRef, LANG, setLang, t, L, I, view } from './core.js';

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const show = (e) => e.classList.add('in');
    const all = () => ref.current?.querySelectorAll('.reveal:not(.in)') || [];
    if (!('IntersectionObserver' in window)) { all().forEach(show); return; }
    const io = new IntersectionObserver((rows) => rows.forEach((r) => r.isIntersecting && (show(r.target), io.unobserve(r.target))), { rootMargin: '-40px' });
    all().forEach((e) => io.observe(e));
    // A fast scroll can outrun the observer; sweep anything already on screen.
    const sweep = () => { for (const e of all()) { const r = e.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) show(e); } };
    addEventListener('scroll', sweep, { passive: true });
    const t = setTimeout(sweep, 300);
    return () => { io.disconnect(); removeEventListener('scroll', sweep); clearTimeout(t); };
  }, []);
  return ref;
}

const Section = ({ id, cls = '', children, style }) => html`<section id=${id} class=${'band ' + cls} style=${style}><div class="sec reveal">${children}</div></section>`;

export function Landing({ about }) {
  const ref = useReveal();
  const [live, setLive] = useState(null);
  useEffect(() => { view('home').then((d) => setLive(d)).catch(() => {}); }, []);
  useEffect(() => { document.title = L('AI Scientist 工作台 · 南洋理工大学', 'AI Scientist Workbench · NTU Singapore'); }, [LANG]);
  const c = live?.shell?.counts;
  const stats = [
    [c ? c.library.toLocaleString() : '1,207', L('已建库文献', 'papers indexed')],
    [c ? c.hyps : '56', L('假设在网', 'hypotheses live')],
    [c ? c.running + c.queued : '7', L('实验在跑 / 排队', 'runs live & queued')],
    ['9h12m', L('昨夜无人值守', 'unattended last night')],
  ];
  return html`<div class="lp" ref=${ref}>
    <a class="sr" href="#main">${L('跳到正文', 'Skip to content')}</a>
    <nav class="lnav">
      <a class="brand" href="/" style="color:#fff">${I('logo', { s: 21, c: '#fff', w: 1.8 })}<span style="font-size:15px;font-weight:600;color:#fff">AI Scientist</span></a>
      <div class="grow"></div>
      <a href="#pipeline" class="hide-s">${L('管线', 'Pipeline')}</a>
      <a href="#network" class="hide-s">${L('假设网络', 'Network')}</a>
      <a href="#screens" class="hide-s">${L('全部界面', 'All screens')}</a>
      <a href="/panorama" class="hide-s">${L('假设图', 'Graph')}</a>
      <button class="btn xs" style="background:transparent;color:#98A2B3;border-color:rgba(255,255,255,.18)" onClick=${() => setLang(LANG === 'zh' ? 'en' : 'zh')}>${LANG === 'zh' ? 'EN' : '中文'}</button>
      <a class="cta" href="/home">${L('进入系统', 'Open the system')}</a>
    </nav>

    <header class="hero" id="main">
      <span class="pill"><span style="width:6px;height:6px;border-radius:50%;background:#7DA2FF"></span>${L('自动化科研系统', 'Autonomous research system')}</span>
      ${(!live || live.shell?.source?.mode === 'demo') && html`<p>${L('公开演示：演示数据与模拟实验，不调用真实模型或实验执行器。每位访客独立工作区，试玩记录可能重置。', 'Public demo: demo data and simulated experiments, with no live models or experiment executors. Each visitor has a private workspace; trial data may reset.')}</p>`}
      <h1>${L(html`读文献、提假设、跑实验、写论文<br/>整条科研链路，<em>它自己跑完</em>`, html`From reading papers to writing one —<br/>the whole research chain, <em>on its own</em>`)}</h1>
      <p>${L('8 个课题并行推进，56 条假设共用同一张网络。人只做三件事：给方向、裁定假设、拍板投稿。',
        'Eight projects run in parallel over one shared network of 56 hypotheses. You do three things: set the direction, rule on hypotheses, and decide when to submit.')}</p>
      <div class="hbtns">
        <a class="hbtn" href="/home">${L('进入系统 →', 'Open the system →')}</a>
        <a class="hbtn ghost" href="/panorama">${L('看假设网络', 'See the hypothesis network')}</a>
      </div>
      <div class="hstats">${stats.map(([v, k], i) => html`
        ${i > 0 && html`<span class="sep"></span>`}
        <div class="s"><div class="v">${v}</div><div class="k">${k}</div></div>`)}</div>
      <div class="shot">
        <div class="shotframe">
          <div class="shotbar"><i></i><i></i><i></i><span class="u">app.ai-scientist · ${L('总览', 'overview')}</span></div>
          <img src=${LANG === 'zh' ? '/assets/hero-zh.png' : '/assets/hero-en.png'} width="1060" height="662" alt=${L('总览界面：管线实时数字、共享假设关系、过去 24 小时与待裁定事项', 'Overview: live pipeline counts, shared hypotheses, the last 24 hours and what awaits a verdict')} />
        </div>
      </div>
    </header>

    <${Section} id="pipeline" cls="">
      <div class="eyebrow">${L('管线', 'Pipeline')}</div>
      <h2>${L('一条文献进来，到一篇论文出去', 'One paper in, one paper out')}</h2>
      <p class="lead">${L('中间的每一段都能点开：来源白名单、趋势里的空白、spark、立项时复用了哪些假设、每次实验写回了哪条证据、哪一句话还没有证据撑住。',
        'Every segment in between opens up: the source whitelist, the gaps in the trends, the sparks, which hypotheses a new project reused, which piece of evidence each run wrote back, and which sentence is still unsupported.')}</p>
      <div class="steps">
        ${[[1, '采集', 'Collect', '62 个来源按游标增量拉取，三级分级到全文。', '62 sources pulled incrementally by cursor, graded in three levels down to full text.'],
          [2, '趋势', 'Trends', '主题簇、术语变化、空白与矛盾——spark 从这里长出来。', 'Topic clusters, term shifts, gaps and contradictions — sparks grow from here.'],
          [3, '立项', 'Intake', '一条主张展开成假设树，能复用的假设不重复验证。', 'A claim expands into a hypothesis tree; anything reusable is not re-verified.'],
          [4, '实验', 'Experiments', '四阶段实验树，失败节点留着，避免重犯。', 'A four-stage experiment tree; failed nodes stay, so mistakes are not repeated.'],
          [5, '裁定', 'Verdicts', '证据矛盾升级到人，后果按 idea 分别算清楚。', 'Contradictions escalate to a human, with consequences computed per idea.'],
          [6, '写作', 'Writing', '章节由假设树映射，缺证据的地方高亮。', 'Sections map from the hypothesis tree; unsupported spots are highlighted.']].map(([i, zh, en, dzh, den]) => html`
          <div class="step"><div class="i">0${i}</div><h4>${L(zh, en)}</h4><p>${L(dzh, den)}</p></div>`)}
      </div>
    <//>

    <${Section} id="network" cls="alt">
      <div class="eyebrow">${L('核心设计', 'The core idea')}</div>
      <h2>${L('假设是全局实体，不属于任何一个 idea', 'A hypothesis is a global entity — it belongs to no single project')}</h2>
      <p class="lead">${L('同一条假设在不同 idea 里可以是根前提，也可以是中层节点或已证叶子。所以一次实验的证据，会同时落到所有引用它的 idea 上——一次重测能结清三个课题里的同一个问题。',
        'The same hypothesis can be a root premise in one project, a middle node in another and a proven leaf in a third. So the evidence from one run lands on every project that cites it — one re-measurement settles the same question in three places at once.')}</p>
      <div class="feat">
        ${[['net', '共享与传播', 'Shared and propagated', '一次写入，所有引用方状态一并更新；推翻它的后果也按各自层级分别算。', 'One write updates every citing project; if it is overturned, the damage is computed per project by its role there.'],
          ['gavel', '裁定只写 verdicts/', 'Verdicts write only verdicts/', '节点状态由裁定派生，reviewer 不直接改树，责任边界是清楚的。', 'Node state derives from the verdict. The reviewer never edits the tree, so responsibility stays clean.'],
          ['flask', '证据带方向', 'Evidence carries a sign', '每次实验写回一个带符号的增量，累积到阈值才转 self_verified。', 'Each run writes back a signed delta; a hypothesis turns self_verified only once the total crosses the threshold.']].map(([ic, zh, en, dzh, den]) => html`
          <div class="f">${I(ic, { s: 20, c: 'var(--acc)' })}<h3>${L(zh, en)}</h3><p>${L(dzh, den)}</p></div>`)}
      </div>
      <div style="margin-top:34px" class="card">
        <div class="hd"><h2>${L('例：H-02 在三个 idea 里的不同身份', 'Example: H-02 wears three different hats')}</h2><span class="sub2">${L('同一条假设，三种后果', 'One hypothesis, three consequences')}</span></div>
        <div class="bd"><div class="cols3">
          ${[['P-014', L('第 2 层', 'layer 2'), L('分支失效 · 冻结 2 个节点', 'branch fails · 2 nodes frozen'), 'var(--acc)'],
            ['P-016', L('根前提', 'root premise'), L('全局失效 · 整个 idea 需重开', 'global failure · the whole project reopens'), 'var(--pur)'],
            ['P-017', L('叶子 · 已证', 'leaf · verified'), L('已有独立证据，不受影响', 'has independent evidence, unaffected'), 'var(--ok)']].map(([id, role, eff, col]) => html`
            <div style=${{ padding: '13px', border: '1px solid var(--line)', borderRadius: '7px', borderLeft: '3px solid ' + col }}>
              <div class="mono b">${id}</div><div class="small mut" style="margin-top:3px">${role}</div>
              <div style="margin-top:9px;font-size:12.5px;line-height:1.6">${eff}</div></div>`)}
        </div></div>
        <div class="ft"><a href="/graph">${L('在共享关系页打开 →', 'Open it on the shared-hypotheses screen →')}</a></div>
      </div>
    <//>

    <${Section} cls="">
      <div class="eyebrow">${L('人在什么位置', 'Where the human sits')}</div>
      <h2>${L('系统不会替你决定三件事', 'Three things the system will not decide for you')}</h2>
      <div class="feat">
        ${[['给方向', 'Set the direction', '白名单、topics、立项批准——采集和立项的边界由人划。', 'The whitelist, the topics, the go-ahead on a new project — you draw the boundary.'],
          ['裁定假设', 'Rule on hypotheses', '证据互相矛盾、或连续三次 PIVOT 无改善时，agent 停下来等人。', 'When evidence contradicts itself, or three PIVOTs bring no improvement, the agent stops and waits.'],
          ['拍板投稿', 'Decide to submit', '过度声称没改完，导出会停下并列出是哪几条。', 'If overclaims remain, the export halts and names them.']].map(([zh, en, dzh, den], i) => html`
          <div class="f"><div class="mono" style="color:var(--acc);font-size:11px">0${i + 1}</div><h3>${L(zh, en)}</h3><p>${L(dzh, den)}</p></div>`)}
      </div>
      <p class="lead" style="margin-top:28px">${L('其余部分——采集、分级、归纳、排实验、剪枝、重试、画图、查主张——系统自己做完，并把每一步记进 events.jsonl。',
        'Everything else — collecting, grading, inducing, queueing runs, pruning, retrying, plotting, auditing claims — the system does on its own, and writes every step into events.jsonl.')}</p>
    <//>

    <${Section} id="screens" cls="alt">
      <div class="eyebrow">${L('全部界面', 'All screens')}</div>
      <h2>${L('18 屏，每一屏都能操作', '18 screens, every one of them live')}</h2>
      <p class="lead">${L('这不是静态样稿：按钮真的会改状态，实验真的会跑完并把证据写回假设，裁定真的会冻结下游节点。你的改动存在自己的会话里。',
        'This is not a static mockup: the buttons really change state, runs really finish and write evidence back, and a verdict really freezes downstream nodes. Your changes live in your own session.')}</p>
      <div class="screens">
        ${[['home', '总览', 'Overview', '管线实时数字、过去 24 小时、等你决定的', 'Live pipeline counts, the last 24 hours, what awaits you'],
          ['main', '工作台 · 全局', 'Workbench · global', '全局 frontier、执行槽位与活动流', 'Global frontier, execution slots and the activity stream'],
          ['survey', '采集管线', 'Collection pipeline', '来源白名单、游标预算、三级分级', 'Source whitelist, cursor budget, three grading levels'],
          ['trends', '趋势分析', 'Trend analysis', '月度纵深、主题簇、术语变化、空白与矛盾', 'Monthly depth, clusters, term shifts, gaps and contradictions'],
          ['sparks', 'idea spark', 'Idea sparks', '四行格式、三道自检、状态流转', 'Four-line format, three self-checks, state flow'],
          ['digest', '论文详情', 'Paper detail', 'meta.json、digest 固定字段、三种衍生文本', 'meta.json, fixed digest fields, three derived texts'],
          ['ideas', 'Idea 立项', 'Idea intake', '候选主张、复用已有假设、立项成本', 'Candidate claims, reuse of hypotheses, cost to start'],
          ['panorama', '假设全景', 'Hypothesis panorama', '8 个 idea、56 条假设的全局网络', 'The global network: 8 ideas, 56 hypotheses'],
          ['graph', '共享关系', 'Shared hypotheses', '同一条假设在三个 idea 里的不同层级', 'One hypothesis at three levels in three projects'],
          ['tree', '单 idea 树', 'Single-idea tree', '节点编辑、依赖、证据与裁定', 'Node editing, dependencies, evidence and verdicts'],
          ['experiments', '单次实验', 'Single experiment', '配置、实时流、PROCEED / REFINE / PIVOT', 'Config, live stream, PROCEED / REFINE / PIVOT'],
          ['exptree', '实验树 · 四阶段', 'Experiment tree', '初探 → 调参 → 主实验 → 消融', 'Probe → tune → main → ablation'],
          ['sweep', '扫描矩阵', 'Sweep matrix', 'batch × seed、方差与显著性', 'batch × seed, variance and significance'],
          ['runs', '算力与失败', 'Compute & failures', '占用时间线、失败分类与自动处置', 'Occupancy timeline, failure classes and auto-handling'],
          ['review', '裁定队列', 'Verdict queue', '失效传播在三个 idea 里的不同后果', 'How one failure plays out differently in three projects'],
          ['paper', '论文正文', 'Manuscript', '章节由假设树映射，缺证据处高亮', 'Sections map from the tree; gaps are highlighted'],
          ['claims', '主张 · 证据对照', 'Claims vs evidence', '证据不足与过度声称逐条列出', 'Unsupported and overclaimed sentences, one by one'],
          ['figures', '图表工作台', 'Figure workbench', '发表级图、来源可追溯、审图意见', 'Publication figures, traceable sources, review comments'],
          ['rebuttal', '审稿与修订', 'Review & rebuttal', '三位评审、复现自评、投稿清单', 'Three reviewers, a reproducibility self-score, the checklist']].map(([k, zh, en, dzh, den]) => html`
          <a href=${'/' + k}><div class="t">${L(zh, en)}</div><div class="d">${L(dzh, den)}</div><div class="k">${k.replace(/^\w/, (x) => x.toUpperCase())}</div></a>`)}
      </div>
    <//>

    <${Section} cls="" style=${{ background: 'var(--dark)' }}>
      <div class="dark" style="text-align:center">
        <h2 style="color:#fff">${L('数据从哪里来', 'Where the data comes from')}</h2>
        <p class="lead" style="margin-inline:auto;text-align:center">${L('演示用的是占位数据，接上真实项目后来自同一组文件：index.jsonl（题录）、tree.json（假设树）、verdicts/（裁定）、events.jsonl（事件流）、artifacts/（产物）。界面不额外存状态，读的就是这些。',
          'The demo runs on placeholder data. Wired to a real project it reads the same files: index.jsonl (records), tree.json (hypothesis trees), verdicts/ (rulings), events.jsonl (the event stream) and artifacts/. The interface keeps no state of its own.')}</p>
        <div class="mono" style="margin-top:26px;color:#7DA2FF;font-size:12.5px;line-height:2.1">
          index.jsonl · tree.json · verdicts/ · events.jsonl · artifacts/ · venues.yaml · topics.md
        </div>
        <div class="hbtns"><a class="hbtn" href="/home">${L('打开工作台', 'Open the workbench')}</a>
          <a class="hbtn ghost" href="/survey">${L('从采集管线看起', 'Start at the collection pipeline')}</a></div>
      </div>
    <//>

    <footer class="foot">
      <div class="in">
        <div style="max-width:330px">
          <div class="row" style="color:#fff">${I('logo', { s: 20, c: '#fff', w: 1.8 })}<span style="font-weight:600">AI Scientist</span></div>
          <div style="margin-top:10px">${L('自动化科研系统的界面实现。文献、假设、实验、裁定与写作在同一张网络上。',
            'An interface for an autonomous research system: literature, hypotheses, experiments, verdicts and writing on one shared network.')}</div>
        </div>
        <div><div style="color:#98A2B3;font-weight:600;margin-bottom:6px">${L('工作流', 'Workflow')}</div>
          <div><a href="/survey">${L('文献调研', 'Literature')}</a></div><div><a href="/panorama">${L('假设网络', 'Hypotheses')}</a></div>
          <div><a href="/experiments">${L('实验', 'Experiments')}</a></div><div><a href="/review">${L('裁定队列', 'Verdicts')}</a></div><div><a href="/paper">${L('论文', 'Paper')}</a></div></div>
        <div><div style="color:#98A2B3;font-weight:600;margin-bottom:6px">${L('界面', 'Screens')}</div>
          <div><a href="/home">${L('总览', 'Overview')}</a></div><div><a href="/main">${L('工作台', 'Workbench')}</a></div>
          <div><a href="/runs">${L('算力与失败', 'Compute')}</a></div><div><a href="/claims">${L('主张对照', 'Claims')}</a></div><div><a href="/rebuttal">${L('审稿与修订', 'Rebuttal')}</a></div></div>
        <div><div style="color:#98A2B3;font-weight:600;margin-bottom:6px">${L('关于', 'About')}</div>
          <div>${L('演示数据 · 每个访客一份独立会话', 'Demo data · one private session per visitor')}</div>
          <div>${L('语言', 'Language')}: <a href="#" onClick=${(e) => { e.preventDefault(); setLang(LANG === 'zh' ? 'en' : 'zh'); }}>${LANG === 'zh' ? 'English' : '中文'}</a></div>
          <div><a href="#" onClick=${async (e) => { e.preventDefault(); await fetch('/api/reset', { method: 'POST' }); location.reload(); }}>${L('重置我的会话数据', 'Reset my session data')}</a></div></div>
      </div>
      <div class="cr">
        <div class="ntu">
          <img src="/assets/ntu-mark.svg" alt="" width="34" height="34" aria-hidden="true" />
          <div>
            <div class="ntu-n">${L('南洋理工大学', 'Nanyang Technological University')}</div>
            <div class="ntu-s">${L('新加坡', 'Singapore')}</div>
          </div>
        </div>
        <div style="margin-top:14px">© 2026 ${L('新加坡南洋理工大学　版权所有。', 'Nanyang Technological University, Singapore. All rights reserved.')}</div>
      </div>
    </footer>
  </div>`;
}
