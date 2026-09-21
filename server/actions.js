// Every button on every screen lands here. Each op mutates the workspace and
// returns a short bilingual toast; the client then re-fetches the affected views.
import { b } from './seed.js';
import * as E from './engine.js';
import { num, patchText, asText, LIMITS } from './input.js';
import * as source from './source/index.js';

const MIN = 60000, HOUR = 3600000;
const ok = (zh, en, extra = {}) => ({ ok: true, toast: b(zh, en), ...extra });
const err = (zh, en) => ({ ok: false, toast: b(zh, en) });

export const OPS = {};
const op = (name, fn) => (OPS[name] = fn);

// ---------------------------------------------------------------- experiments
op('exp.run', (ws, { hyp, idea, label, cfg, node }) => {
  if (!ws.hyps[hyp]) return err('未知假设', 'Unknown hypothesis');
  if (ws.hyps[hyp].status === 'pending_review') return err('该假设待裁定，executor 不再展开', 'That hypothesis awaits a verdict; the executor will not expand it');
  const ideas = E.activeIdeasOf(ws, hyp);
  const id = 'e_' + ws.seq.exp++;
  const s = E.score(ws, hyp);
  const delta = s < -0.5 ? -0.5 : 0.5;
  ws.experiments[id] = {
    id, hyp, idea: idea || ideas[0] || 'P-014', status: 'queued', prog: 0, queuedAt: Date.now(),
    durMs: (5 + Math.random() * 6) * MIN, hours: 3.2, cost: 56, vcpu: 36,
    cfg: cfg || { model: 'ResNet-50 / CIFAR-100', batch: '128', seed: '0,1,2', opt: 'SGD', steps: '30k', measure: 'eff_step' },
    outcome: { delta, rec: delta > 0 ? 'PROCEED' : 'PIVOT', conf: 0.65 },
    label: label || b('为该假设新排的实验', 'Newly queued for this hypothesis'), node: node || null,
  };
  E.tick(ws);
  source.persist(ws, { kind: 'queue', exp: ws.experiments[id] });
  E.pushEvent(ws, 'human', b(`${id} 入队 · ${hyp}`, `${id} queued · ${hyp}`), b(`服务 ${ideas.length || 1} 个 idea`, `Serves ${ideas.length || 1} idea(s)`), 'experiment', Date.now(), { hyp, exp: id });
  const st = ws.experiments[id].status;
  return ok(st === 'running' ? `${id} 已开跑` : `${id} 已入队，等槽位`, st === 'running' ? `${id} started` : `${id} queued for a slot`, { exp: id });
});

op('exp.runBatch', (ws, { hyps }) => {
  let n = 0;
  for (const h of hyps || []) { const r = OPS['exp.run'](ws, { hyp: h }); if (r.ok) n++; }
  return ok(`已按顺序排入 ${n} 个实验`, `Queued ${n} experiments in order`);
});

op('exp.decide', (ws, { exp, kind }) => {
  const e = ws.experiments[exp];
  if (!e) return err('实验不存在', 'No such experiment');
  const h = ws.hyps[e.hyp];
  const now = Date.now();
  if (kind === 'PROCEED') {
    if (e.status === 'running') E.finishExperiment(ws, e, now);
    else if (e.status !== 'done') return err('实验还没有结果', 'The experiment has no result yet');
    const st = E.hypStatus(ws, e.hyp);
    return ok(`证据已写入 ${e.hyp}，累积 ${E.score(ws, e.hyp)}${st === 'self_verified' ? ' · 转 self_verified' : ''}`, `Evidence written to ${e.hyp}, total ${E.score(ws, e.hyp)}${st === 'self_verified' ? ' · now self_verified' : ''}`);
  }
  if (kind === 'REFINE') {
    e.status = 'queued'; e.prog = 0; e.queuedAt = now; e.outcome.delta = Math.round((e.outcome.delta + 0.1) * 10) / 10;
    h.decisions.push({ kind: 'REFINE', at: now });
    E.tick(ws);
    return ok(`${exp} 改配置后重跑同一假设`, `${exp} re-queued with a changed config on the same hypothesis`);
  }
  if (kind === 'PIVOT') {
    e.status = 'done'; e.prog = 1; e.finishedAt = now; e.outcome.delta = -Math.abs(e.outcome.delta || 0.5);
    h.evidence.push({ exp: e.id, idea: e.idea, delta: e.outcome.delta, note: b('换一条子假设，本支未复现', 'Pivoted to another sub-hypothesis; this branch did not reproduce'), at: now });
    h.pivots = (h.pivots || 0) + 1; h.decisions.push({ kind: 'PIVOT', at: now });
    const esc = E.maybeEscalate(ws, e.hyp, now);
    E.tick(ws);
    return ok(esc ? `${e.hyp} 连续 3 次 PIVOT，已升级到裁定队列` : `已记为 PIVOT，累积 ${E.score(ws, e.hyp)}`, esc ? `${e.hyp} hit 3 PIVOTs and was escalated to the verdict queue` : `Recorded as PIVOT, total ${E.score(ws, e.hyp)}`);
  }
  if (kind === 'ESCALATE') {
    h.status = 'pending_review'; h.submittedAt = now;
    for (const x of Object.values(ws.experiments)) if (x.hyp === e.hyp && x.status === 'queued') x.status = 'withdrawn';
    E.pushEvent(ws, 'human', b(`${e.hyp} 提交裁定`, `${e.hyp} submitted for verdict`), b('由人工提交', 'Submitted manually'), 'verdict', now, { hyp: e.hyp });
    return ok(`${e.hyp} 已进入裁定队列`, `${e.hyp} entered the verdict queue`);
  }
  return err('未知动作', 'Unknown action');
});

op('exp.control', (ws, { exp, cmd }) => {
  const e = ws.experiments[exp];
  if (!e) return err('实验不存在', 'No such experiment');
  const now = Date.now();
  if (cmd === 'pause') {
    if (e.status !== 'running') return err('不在运行中', 'Not running');
    e.status = 'paused'; e.pausedAt = now; e.remainMs = e.startedAt + e.durMs - now;
    E.tick(ws);
    return ok(`${exp} 已暂停，槽位让给队列`, `${exp} paused; its slot goes back to the queue`);
  }
  if (cmd === 'resume') {
    if (e.status !== 'paused') return err('不在暂停中', 'Not paused');
    e.status = 'queued'; e.queuedAt = now; e.durMs = e.remainMs || e.durMs; E.tick(ws);
    return ok(`${exp} 已重新排队`, `${exp} re-queued`);
  }
  if (cmd === 'abort') {
    e.status = 'done'; e.prog = 1; e.finishedAt = now; e.aborted = true; e.outcome.delta = 0;
    ws.runs.unshift({ id: 'run_' + ws.seq.run++, gpu: e.gpu || 0, start: e.startedAt || now, dur: (now - (e.startedAt || now)), idea: e.idea, label: e.label, status: 'failed', cost: 0 });
    E.pushEvent(ws, 'human', b(`${exp} 被中止`, `${exp} aborted`), b('不写入证据', 'No evidence written'), 'experiment', now, { exp });
    E.tick(ws);
    return ok(`${exp} 已中止，没有写入证据`, `${exp} aborted; no evidence written`);
  }
  return err('未知指令', 'Unknown command');
});

op('exp.config', (ws, { exp, cfg }) => {
  const e = ws.experiments[exp];
  if (!e) return err('实验不存在', 'No such experiment');
  e.cfg = { ...e.cfg, ...cfg };
  (ws.hyps[e.hyp].decisions ||= []).push({ kind: 'CONFIG', at: Date.now() });
  E.pushEvent(ws, 'human', b(`${exp} 配置已改`, `${exp} config changed`), b(Object.entries(cfg).map(([k, v]) => `${k}: ${v}`).join(' · '), Object.entries(cfg).map(([k, v]) => `${k}: ${v}`).join(' · ')), 'experiment', Date.now(), { exp });
  return ok('配置已改，并记入 decision_log', 'Config changed and written to decision_log');
});

op('exp.copy', (ws, { exp }) => {
  const e = ws.experiments[exp];
  if (!e) return err('实验不存在', 'No such experiment');
  return OPS['exp.run'](ws, { hyp: e.hyp, idea: e.idea, cfg: { ...e.cfg }, label: b(`复制自 ${exp}`, `Copied from ${exp}`) });
});

op('settings.update', (ws, { parallel, budget }) => {
  if (parallel) ws.settings.parallel = E.clamp(+parallel, 1, 8);
  if (budget) ws.settings.budget = E.clamp(+budget, 10, 1000);
  E.tick(ws);
  return ok(`并行上限 ${ws.settings.parallel} · 预算 ${ws.settings.budget} GPU·h`, `Parallelism ${ws.settings.parallel} · budget ${ws.settings.budget} GPU·h`);
});

// ---------------------------------------------------------------- hypotheses & trees
op('hyp.addChild', (ws, { idea, parentHyp, claim }, lang) => {
  const nodes = ws.trees[idea];
  if (!nodes) return err('未知 idea', 'Unknown idea');
  const p = parentHyp ? nodes.find((n) => n.hyp === parentHyp) : null;
  const sibs = nodes.filter((n) => n.parent === (p ? p.k : null));
  const k = p ? `${p.k}.${sibs.length + 1}` : String(nodes.filter((n) => !n.parent).length + 1);
  const id = 'H-' + ws.seq.hyp++;
  const text = asText(claim, LIMITS.text);
  if (!text || !(text.zh || text.en)) return err('主张不能为空', 'The claim cannot be empty');
  ws.hyps[id] = { id, claim: text, warrant: null, status: 'untested', induced: false, needsDecompose: false, rerun: false, depends: p ? [p.hyp] : [], decisions: [], pivots: 0, evidence: [] };
  nodes.push({ k, hyp: id, parent: p ? p.k : null, role: 'own_to_prove', frozen: false, local: null });
  E.pushEvent(ws, 'human', b(`新增假设 ${id}`, `Added hypothesis ${id}`), b(`挂在 ${idea} 的 ${k}`, `Placed at ${k} in ${idea}`), 'hypothesis', Date.now(), { hyp: id });
  return ok(`${id} 已添加到 ${idea} · ${k}`, `${id} added to ${idea} · ${k}`, { hyp: id });
});

op('hyp.decompose', (ws, { hyp, idea }) => {
  const h = ws.hyps[hyp];
  if (!h) return err('未知假设', 'Unknown hypothesis');
  const target = idea && ws.trees[idea] ? idea : E.activeIdeasOf(ws, hyp)[0];
  if (!target) return err('该假设不在任何进行中的 idea 里', 'This hypothesis is in no running idea');
  const parts = [
    b('上界在固定秩下成立', 'The bound holds at a fixed rank'),
    b('上界对秩的选择不敏感', 'The bound is insensitive to the rank choice'),
  ];
  const made = parts.map((c) => OPS['hyp.addChild'](ws, { idea: target, parentHyp: hyp, claim: c }).hyp);
  h.needsDecompose = false;
  return ok(`${hyp} 已拆成 ${made.join(' ')}`, `${hyp} decomposed into ${made.join(' ')}`);
});

op('hyp.edit', (ws, { hyp, claim, warrant, role, idea }, lang) => {
  const h = ws.hyps[hyp];
  if (!h) return err('未知假设', 'Unknown hypothesis');
  if (claim) h.claim = patchText(h.claim, claim, lang);
  if (warrant !== undefined) h.warrant = warrant ? patchText(h.warrant, warrant, lang) : null;
  if (role && idea) { const n = (ws.trees[idea] || []).find((x) => x.hyp === hyp); if (n) n.role = role; }
  E.pushEvent(ws, 'human', b(`${hyp} 已修改`, `${hyp} edited`), b('人工编辑节点', 'Node edited manually'), 'hypothesis', Date.now(), { hyp });
  return ok('已保存', 'Saved');
});

op('hyp.borrow', (ws, { hyp, idea }) => {
  const target = idea && ws.trees[idea] ? idea : E.activeIdeasOf(ws, hyp)[0];
  const n = (ws.trees[target] || []).find((x) => x.hyp === hyp);
  if (!n) return err('该假设不在此树中', 'Not in this tree');
  n.role = n.role === 'borrowed_assumption' ? 'own_to_prove' : 'borrowed_assumption';
  return ok(n.role === 'borrowed_assumption' ? `${hyp} 在 ${target} 中标为借用前提，不再展开` : `${hyp} 在 ${target} 中改回自证`, n.role === 'borrowed_assumption' ? `${hyp} marked as a borrowed premise in ${target}; no longer expanded` : `${hyp} is back to own-to-prove in ${target}`);
});

op('hyp.dep', (ws, { hyp, on }) => {
  const h = ws.hyps[hyp];
  if (!h || !ws.hyps[on]) return err('未知假设', 'Unknown hypothesis');
  h.depends = [...new Set([...(h.depends || []), on])];
  return ok(`${hyp} 现在依赖 ${on}`, `${hyp} now depends on ${on}`);
});

op('hyp.submit', (ws, { hyp }) => {
  const h = ws.hyps[hyp];
  if (!h) return err('未知假设', 'Unknown hypothesis');
  if (h.status === 'pending_review') return err('已经在裁定队列里', 'Already in the verdict queue');
  h.status = 'pending_review'; h.submittedAt = Date.now();
  for (const x of Object.values(ws.experiments)) if (x.hyp === hyp && x.status === 'queued') x.status = 'withdrawn';
  E.pushEvent(ws, 'human', b(`${hyp} 提交裁定`, `${hyp} submitted for verdict`), b('由人工提交', 'Submitted manually'), 'verdict', Date.now(), { hyp });
  return ok(`${hyp} 已进入裁定队列`, `${hyp} entered the verdict queue`);
});

// ---------------------------------------------------------------- verdicts
op('verdict.apply', (ws, { hyp, verdict }) => {
  if (!E.VERDICTS.includes(verdict)) return err('未知裁定', 'Unknown verdict');
  const r = E.applyVerdict(ws, hyp, verdict, Date.now(), ws.agents.reviewer);
  if (!r.ok) return err('裁定失败', 'Verdict failed');
  delete ws.snoozed['v:' + hyp];
  return ok(`${hyp} 已裁定：${E.VERDICT_ZH[verdict]} · 冻结 ${r.frozen} 个节点，撤下 ${r.withdrawn} 个实验`,
    `${hyp} ruled: ${E.VERDICT_EN[verdict]} · froze ${r.frozen} nodes, withdrew ${r.withdrawn} experiments`);
});

op('decision.snooze', (ws, { id }) => { ws.snoozed[id] = Date.now(); return ok('已放到一边，稍后还会出现', 'Set aside; it will come back later'); });

// ---------------------------------------------------------------- survey
op('survey.collect', (ws, {}) => {
  if (ws.survey.job) return err('采集正在进行', 'A collection round is already running');
  ws.survey.job = { startedAt: Date.now(), endsAt: Date.now() + 25000, records: 120 + Math.floor(Math.random() * 120), digests: 30 + Math.floor(Math.random() * 30) };
  E.pushEvent(ws, 'surveyor', b('开始一轮采集', 'Collection round started'), b('按 venues.yaml 的游标增量拉取', 'Incremental pull from the cursors in venues.yaml'), 'collect', Date.now());
  return ok('采集已启动，约 25 秒后写回游标', 'Collection started; cursors are written back in about 25 seconds');
});

op('survey.venue', (ws, { id, field, value }) => {
  const v = ws.survey.venues.find((x) => x.id === id);
  if (!v) return err('来源不存在', 'No such source');
  if (field === 'scan') v.scan = v.scan === 'core' ? 'watch' : 'core';
  if (field === 'status') v.status = v.status === 'ok' ? 'parked' : 'ok';
  return ok(`${v.name} · ${field === 'scan' ? (v.scan === 'core' ? '改为全量扫' : '改为关键词进入') : (v.status === 'ok' ? '已启用' : '已停用')}`,
    `${v.name} · ${field === 'scan' ? (v.scan === 'core' ? 'now scanned in full' : 'now keyword-gated') : (v.status === 'ok' ? 'enabled' : 'parked')}`);
});

op('survey.candidate', (ws, { id, accept }) => {
  const i = ws.survey.candidates.findIndex((c) => c.id === id);
  if (i < 0) return err('候选不存在', 'No such candidate');
  const c = ws.survey.candidates[i];
  ws.survey.candidates.splice(i, 1);
  if (accept) {
    if (c.kind === 'venue') { ws.survey.venues.push({ id: 'NMETH', name: typeof c.name === 'string' ? c.name : c.name.en, type: 'journal', level: 'top', scan: 'core', entry: 'issn:1548-7091', cursor: '2026-09', delta: 0, status: 'ok' }); ws.survey.whitelist++; }
    else ws.survey.topics.push('tool-chain');
    E.pushEvent(ws, 'human', b('并入白名单', 'Merged into the whitelist'), c.why, 'collect', Date.now());
  }
  return accept ? ok('已并入，下一轮采集生效', 'Merged; it takes effect next round') : ok('已驳回，记录保留', 'Rejected; the record is kept');
});

op('paper.queue', (ws, { id }) => {
  const p = ws.papers[id];
  if (!p) return err('论文不存在', 'No such paper');
  p.queued = !p.queued;
  if (p.queued) ws.survey.funnel.l3++;
  else ws.survey.funnel.l3--;
  return ok(p.queued ? `${id} 已加入全文队列` : `${id} 已移出全文队列`, p.queued ? `${id} added to the full-text queue` : `${id} removed from the full-text queue`);
});

op('paper.level3', (ws, { id }) => {
  const p = ws.papers[id];
  if (!p) return err('论文不存在', 'No such paper');
  p.level = 3; p.brief = true; p.full = true;
  ws.survey.funnel.l3++;
  E.pushEvent(ws, 'surveyor', b(`${id} 升到 level 3`, `${id} promoted to level 3`), b('生成 brief_zh 与 full_zh', 'Generated brief_zh and full_zh'), 'collect', Date.now());
  return ok('已升到 level 3，brief_zh 与 full_zh 已生成', 'Promoted to level 3; brief_zh and full_zh generated');
});

op('paper.regen', (ws, { id }) => {
  const p = ws.papers[id];
  if (!p) return err('论文不存在', 'No such paper');
  p.regenAt = Date.now();
  return ok('digest 已按固定字段重新生成', 'Digest regenerated with the fixed field set');
});

// ---------------------------------------------------------------- sparks
op('spark.gen', (ws, { gap }) => {
  if (ws.trendGaps[gap]) return err('该空白已生成过 spark', 'A spark was already generated for this gap');
  ws.trendGaps[gap] = true;
  const n = ws.sparks.items.length + 1;
  const texts = {
    g1: [b('注入点在工具返回值里，把防御放在用户输入端，是不是一开始就选错了位置？', 'If the injection point is in tool return values, was putting the defence at the user-input side wrong from the start?'), b('现有防御都假设注入来自用户输入端，agent 读工具输出这一侧几乎没人设防。', 'Existing defences assume injection comes from the user input side; almost nobody guards the side where an agent reads tool output.')],
    g2: [b('同一基准上出现相反的规模—越狱关系时，被测量的到底是模型还是基准？', 'When one benchmark gives opposite scale–jailbreak relations, is the model or the benchmark being measured?'), b('两篇在同一基准上给出相反方向的结论。', 'Two papers reach opposite conclusions on the same benchmark.')],
    g3: [b('自动科研系统的产出，第三方能复现的比例是多少？', 'What share of an automated-science system’s output can a third party reproduce?'), b('评测都在结果正确性上，没有一篇评测产出能否被复现。', 'Evaluations look only at correctness; none checks reproducibility.')],
  }[gap] || [b('新的问题', 'A new question'), b('来自趋势页', 'From the trends screen')];
  const id = `SPARK-2026-09-0${String(ws.seq.spark + 1).padStart(2, '0')}`;
  ws.seq.spark++;
  ws.sparks.items.push({ id, month: '2026-09', status: 'available', ask: texts[0], papers: ['arxiv-2606-01882', 'arxiv-2607-11244'], basis: texts[1], from: b('来自趋势页的空白/矛盾', 'From a gap or contradiction on the trends screen'), createdAt: Date.now(), gap });
  E.pushEvent(ws, 'surveyor', b(`生成 ${id}`, `Generated ${id}`), texts[0], 'idea', Date.now());
  return ok(`${id} 已生成，状态 available`, `${id} generated with status available`, { spark: id });
});

op('spark.state', (ws, { id, status }) => {
  const s = ws.sparks.items.find((x) => x.id === id);
  if (!s) return err('spark 不存在', 'No such spark');
  const flow = { available: ['selected', 'parked'], selected: ['developed', 'available'], developed: [], parked: ['available'] };
  if (!flow[s.status]?.includes(status)) return err(`${s.status} 不能直接转到 ${status}`, `${s.status} cannot go straight to ${status}`);
  s.status = status;
  ws.sparks.actions.unshift({ at: Date.now(), zh: `${id.slice(-3)} 转 ${status}`, en: `${id.slice(-3)} → ${status}` });
  return ok(`${id} 转为 ${status}`, `${id} is now ${status}`);
});

op('spark.merge', (ws, { id, into }) => {
  const s = ws.sparks.items.find((x) => x.id === id);
  if (!s) return err('spark 不存在', 'No such spark');
  s.status = 'merged'; s.mergedInto = into || ws.sparks.items[0].id;
  return ok(`${id} 已并入 ${s.mergedInto}`, `${id} merged into ${s.mergedInto}`);
});

// ---------------------------------------------------------------- idea intake
op('idea.pick', (ws, { dir }) => { ws.ideaLab.cur = (ws.ideaLab.cur + (dir === 'prev' ? -1 : 1) + ws.ideaLab.cands.length) % ws.ideaLab.cands.length; return ok('已换一批候选', 'Switched to another candidate'); });
op('idea.plan', (ws, { i, mode }) => {
  const c = ws.ideaLab.cands[ws.ideaLab.cur % ws.ideaLab.cands.length];
  if (!c.plan[i]) return err('不存在该行', 'No such row');
  c.plan[i].mode = mode;
  return ok(`第 ${i + 1} 条改为 ${mode}`, `Row ${i + 1} set to ${mode}`);
});
op('idea.claim', (ws, { claim }, lang) => {
  const c = ws.ideaLab.cands[ws.ideaLab.cur % ws.ideaLab.cands.length];
  c.claim = patchText(c.claim, claim, lang);
  return ok('主张已保存', 'Claim saved');
});
op('idea.launch', (ws, {}) => {
  const lab = ws.ideaLab;
  const c = lab.cands[lab.cur % lab.cands.length];
  if (ws.trees[c.id]) return err('该 idea 已立项', 'This idea is already launched');
  const nodes = [];
  const rootId = 'H-' + ws.seq.hyp++;
  ws.hyps[rootId] = { id: rootId, claim: c.claim, warrant: null, status: 'untested', induced: false, needsDecompose: false, rerun: false, depends: [], decisions: [], pivots: 0, evidence: [] };
  nodes.push({ k: '1', hyp: rootId, parent: null, role: 'own_to_prove', frozen: false, local: null });
  c.plan.forEach((p, i) => {
    let id = p.hyp;
    if (!id) { id = 'H-' + ws.seq.hyp++; ws.hyps[id] = { id, claim: p.claim, warrant: null, status: 'untested', induced: false, needsDecompose: false, rerun: false, depends: [rootId], decisions: [], pivots: 0, evidence: [] }; }
    if (p.mode === 'skip') return;
    nodes.push({ k: `1.${i + 1}`, hyp: id, parent: '1', role: p.mode === 'reuse' ? 'borrowed_assumption' : 'own_to_prove', frozen: false, local: null });
  });
  ws.trees[c.id] = nodes;
  const existing = ws.ideas.find((x) => x.id === c.id);
  if (existing) existing.status = 'running';
  else ws.ideas.push({ id: c.id, name: c.name, status: 'running', color: '#7C3AED' });
  lab.launched.push(c.id);
  lab.cur = (lab.cur + 1) % lab.cands.length;
  ws.lastHuman = Date.now();
  E.pushEvent(ws, 'human', b(`${c.id} 立项 · 复用 ${c.plan.filter((p) => p.mode === 'reuse').map((p) => p.hyp).join(' ')}`, `${c.id} launched · reuses ${c.plan.filter((p) => p.mode === 'reuse').map((p) => p.hyp).join(' ')}`),
    b(`新增 ${c.plan.filter((p) => p.mode === 'new').length} 条自有假设`, `${c.plan.filter((p) => p.mode === 'new').length} own hypotheses added`), 'idea', Date.now());
  return ok(`${c.id} 已立项，展开为 ${nodes.length} 个节点`, `${c.id} launched and expanded into ${nodes.length} nodes`, { idea: c.id });
});
op('idea.park', (ws, {}) => { const c = ws.ideaLab.cands[ws.ideaLab.cur % ws.ideaLab.cands.length]; ws.ideaLab.cur = (ws.ideaLab.cur + 1) % ws.ideaLab.cands.length; return ok(`${c.id} 存为候选`, `${c.id} saved as a candidate`); });
op('idea.lit', (ws, { id }) => { const p = ws.ideaLab.lit.find((x) => x.id === id); if (p) p.selected = !p.selected; return ok(p?.selected ? '已选入抽取集合' : '已移出抽取集合', p?.selected ? 'Added to the extraction set' : 'Removed from the extraction set'); });
op('idea.extract', (ws, {}) => {
  const sel = ws.ideaLab.lit.filter((p) => p.selected && p.extracted == null);
  if (!sel.length) return err('先勾选未抽取的文献', 'Select unextracted papers first');
  const made = [];
  for (const p of sel) {
    const id = 'H-' + ws.seq.hyp++;
    ws.hyps[id] = { id, claim: b(`从《${p.title.zh}》抽出的候选假设`, `Candidate hypothesis extracted from “${p.title.en}”`), warrant: null, status: 'lit_supported', induced: false, needsDecompose: false, rerun: false, depends: [], decisions: [], pivots: 0, evidence: [{ exp: 'lit', idea: '', delta: 0.2, note: b('文献支撑', 'Literature support'), at: Date.now() }] };
    p.extracted = 1; p.hyps = [id]; made.push(id);
  }
  return ok(`抽出 ${made.join(' ')}`, `Extracted ${made.join(' ')}`);
});

// ---------------------------------------------------------------- exp tree / sweep
op('tree.expand', (ws, { node }) => {
  const t = ws.exptree['P-014'];
  const p = t.nodes.find((n) => n.id === node);
  if (!p) return err('节点不存在', 'No such node');
  const id = 'n_' + ws.seq.node++;
  const r = OPS['exp.run'](ws, { hyp: p.hyp || 'H-11', label: b('从实验树展开的子节点', 'Child node expanded from the experiment tree'), node: id });
  t.nodes.push({ id, type: 'improve', status: 'queued', score: null, parent: node, summary: b('新展开：在父节点最优配置上改一项', 'New: change one thing on the parent’s best config'), stage: p.stage, exp: r.exp });
  return ok(`${id} 已展开，绑定 ${r.exp}`, `${id} expanded, bound to ${r.exp}`);
});
op('tree.prune', (ws, { node }) => {
  const t = ws.exptree['P-014'];
  const n = t.nodes.find((x) => x.id === node);
  if (!n) return err('节点不存在', 'No such node');
  n.pruned = !n.pruned; n.status = n.pruned ? 'pruned' : 'success';
  if (n.pruned && n.exp && ws.experiments[n.exp]?.status === 'queued') ws.experiments[n.exp].status = 'withdrawn';
  return ok(n.pruned ? `${node} 已剪掉，记录保留` : `${node} 已恢复`, n.pruned ? `${node} pruned; the record is kept` : `${node} restored`);
});

op('sweep.metric', (ws, { metric }) => { ws.sweep.metric = metric === 'noise' ? 'noise' : 'eff'; return ok('已切换指标', 'Metric switched'); });
op('sweep.mode', (ws, { mode }) => { ws.sweep.mode = mode === 'mean' ? 'mean' : 'single'; return ok(mode === 'mean' ? '单元格显示均值' : '单元格显示单次', mode === 'mean' ? 'Cells show the mean' : 'Cells show single runs'); });
op('sweep.fill', (ws, {}) => {
  const s = ws.sweep;
  if (s.filled) return err('已经补过这一行', 'This row was already filled');
  s.filled = true;
  for (const c of s.cells) if (c.b === 2048) { c.state = 'done'; c.eff = 0.94 + c.s * 0.01; c.noise = 0.55 - c.s * 0.01; }
  ws.settings.gpuUsed = Math.round((ws.settings.gpuUsed + 11) * 10) / 10;
  E.pushEvent(ws, 'human', b('补满 batch=2048 一行', 'Filled the batch=2048 row'), b('花掉 11 GPU·h', 'Spent 11 GPU·h'), 'experiment', Date.now());
  return ok('已补满 2048 行，花掉 11 GPU·h', 'The 2048 row is filled; 11 GPU·h spent');
});
op('sweep.write', (ws, {}) => {
  const s = ws.sweep;
  if (s.written) return err('这张矩阵已写过证据', 'This matrix already wrote its evidence');
  s.written = true;
  const h = ws.hyps[s.hyp];
  h.evidence.push({ exp: 'run_2291', idea: 'P-014', delta: 0.6, note: b('7 档拟合 R²=0.999，趋势成立但相邻档不可分', 'Seven-tier fit R²=0.999; the trend holds but adjacent tiers are indistinguishable'), at: Date.now() });
  if (E.score(ws, s.hyp) >= 1.0) h.status = 'self_verified';
  E.pushEvent(ws, 'human', b(`扫描矩阵写入 ${s.hyp} 证据 +0.6`, `Sweep matrix wrote +0.6 evidence to ${s.hyp}`), b('整张矩阵只产生一条证据', 'The whole matrix yields exactly one piece of evidence'), 'experiment', Date.now(), { hyp: s.hyp });
  return ok(`已写入 ${s.hyp}，累积 ${E.score(ws, s.hyp)}`, `Written to ${s.hyp}, total ${E.score(ws, s.hyp)}`);
});

// ---------------------------------------------------------------- paper / claims / figures
op('paper.save', (ws, { k, i, text }, lang) => {
  const s = ws.paper.sections.find((x) => x.k === k);
  if (!s) return err('章节不存在', 'No such section');
  const at = num(i, 0, s.paras.length - 1, 0);
  s.paras[at] = patchText(s.paras[at], text, lang);
  s.stale = false;
  ws.paper.savedAt = Date.now();
  return ok(`${k} 已保存`, `Section ${k} saved`);
});
op('paper.regen', (ws, {}) => {
  ws.paper.version++;
  for (const s of ws.paper.sections) s.stale = false;
  E.pushEvent(ws, 'executor', b('按当前证据重生成草稿', 'Draft regenerated from current evidence'), b(`版本 v${ws.paper.version}`, `Version v${ws.paper.version}`), 'paper', Date.now());
  return ok(`草稿已重生成 · v${ws.paper.version}`, `Draft regenerated · v${ws.paper.version}`);
});
op('paper.gap', (ws, { id }) => {
  const g = ws.paper.gaps.find((x) => x.id === id);
  if (!g) return err('缺口不存在', 'No such gap');
  if (g.exp) return ok(`正在跑 ${g.exp}`, `${g.exp} is running`);
  const r = OPS['exp.run'](ws, { hyp: g.hyp, label: g.label });
  g.exp = r.exp;
  return ok(`${r.exp} 已入队，完成后本段可改为结论性表述`, `${r.exp} queued; the paragraph can be stated conclusively once it finishes`);
});
op('paper.insertFig', (ws, { k }) => {
  const s = ws.paper.sections.find((x) => x.k === k);
  if (s) s.fig = 'fig3';
  return ok('图 3 已插入本节', 'Figure 3 inserted into this section');
});

op('claim.fix', (ws, { id, how }) => {
  const c = ws.claims.items.find((x) => x.id === id);
  if (!c) return err('断言不存在', 'No such claim');
  if (how === 'soften') {
    c.status = 'supported'; c.softened = true;
    const sec = ws.paper.sections.find((s) => s.k === c.sec);
    if (sec && c.find) { const i = sec.paras.findIndex((p) => p.zh.includes(c.find.zh.slice(0, 12))); if (i >= 0) sec.paras[i] = b(c.soften.zh, c.soften.en); }
    c.text = b(c.soften.zh, c.soften.en);
    return ok('已改成推测语气，正文同步更新', 'Softened; the manuscript is updated in place');
  }
  if (how === 'delete') {
    const sec = ws.paper.sections.find((s) => s.k === c.sec);
    if (sec && c.find) { const i = sec.paras.findIndex((p) => p.zh.includes(c.find.zh.slice(0, 12))); if (i >= 0) sec.paras.splice(i, 1); }
    ws.claims.items = ws.claims.items.filter((x) => x.id !== id);
    return ok('该句已从正文删除', 'The sentence was removed from the manuscript');
  }
  if (how === 'experiment') {
    if (!c.fixExp) return err('这条断言没有可补的实验', 'No experiment to add for this claim');
    const r = OPS['exp.run'](ws, { hyp: c.fixExp.hyp, label: b(c.fixExp.zh, c.fixExp.en) });
    c.ev = [...c.ev, r.exp];
    return ok(`${r.exp} 已入队，完成后这条断言自动转为已支撑`, `${r.exp} queued; this claim becomes supported when it finishes`);
  }
  return err('未知修法', 'Unknown fix');
});
op('claim.batchSoften', (ws, {}) => {
  const over = ws.claims.items.filter((c) => c.status === 'overclaim');
  for (const c of over) OPS['claim.fix'](ws, { id: c.id, how: 'soften' });
  return ok(`已批量降级 ${over.length} 条措辞`, `Softened ${over.length} claims`);
});

op('fig.review', (ws, { id }) => {
  const f = ws.figures.fig3;
  const r = f.reviews.find((x) => x.id === id);
  if (!r) return err('意见不存在', 'No such review comment');
  if (r.st === 'done') return err('已采纳', 'Already applied');
  r.st = 'done';
  if (r.fix === 'yZero') f.yZero = true;
  if (r.fix === 'bandTo') f.bandTo = 1024;
  if (r.fix === 'sameAxis') f.sameAxis = true;
  f.ver++;
  f.versions.unshift({ v: 'v' + f.ver, at: Date.now(), zh: '采纳审图意见：' + r.zh, en: 'Applied review comment: ' + r.en });
  const sec = ws.paper.sections.find((s) => s.k === '4.2');
  if (sec) sec.stale = true;
  return ok(`已采纳并重绘到 v${f.ver}，4.2 节标为待复核`, `Applied and redrawn as v${f.ver}; §4.2 flagged for re-check`);
});
op('fig.caption', (ws, { text }, lang) => {
  ws.figures.fig3.caption = patchText(ws.figures.fig3.caption, text, lang);
  ws.figures.fig3.captionEdited = true;
  return ok('图注已保存', 'Caption saved');
});
op('fig.align', (ws, {}) => {
  const m = ws.figures.fig3.measured;
  const sec = ws.paper.sections.find((s) => s.k === '4.2');
  if (sec) sec.paras = sec.paras.map((p) => b(p.zh.replace('18.4%', m + '%'), p.en.replace('18.4%', m + '%')));
  ws.decisions.fig3 = true;
  delete ws.snoozed.fig3;
  E.pushEvent(ws, 'human', b('按数据改正文', 'Text aligned to the data'), b(`4.2 节 18.4% → ${m}%`, `§4.2 18.4% → ${m}%`), 'paper', Date.now());
  return ok(`正文已改为 ${m}%`, `The text now reads ${m}%`);
});

op('rebuttal.comment', (ws, { id, act }) => {
  const c = ws.rebuttal.comments.find((x) => x.id === id);
  if (!c) return err('意见不存在', 'No such comment');
  if (act === 'done') { c.status = 'done'; return ok('已标记为处理完', 'Marked as handled'); }
  if (act === 'exp') {
    if (c.exp && ws.experiments[c.exp]) return ok(`${c.exp} 已在队列中`, `${c.exp} is already queued`);
    const r = OPS['exp.run'](ws, { hyp: 'H-30', label: c.fix });
    c.exp = r.exp;
    return ok(`${r.exp} 已入队应对该意见`, `${r.exp} queued to answer this comment`);
  }
  return err('未知动作', 'Unknown action');
});
op('rebuttal.repro', (ws, {}) => {
  const r = ws.rebuttal.repro;
  r.runs++; r.at = Date.now();
  const fig4 = ws.figures.items[3];
  r.match = fig4.status === 'done' ? 0.88 : Math.min(0.75, r.match + 0.05);
  r.run = Math.min(0.95, r.run + 0.03);
  return ok(`干净机器重跑完成 · 结果吻合 ${r.match}`, `Clean-machine re-run done · result match ${r.match}`);
});
op('rebuttal.pack', (ws, {}) => {
  const over = ws.claims.items.filter((c) => c.status === 'overclaim');
  if (over.length) return err(`导出停下：还有 ${over.length} 条过度声称`, `Export halted: ${over.length} overclaims remain`);
  // 'anon' runs as part of the export itself, so it never blocks it
  const undone = ws.rebuttal.checklist.filter((k) => !(k.auto === 'claims' || k.auto === 'anon' ? true : k.auto === 'fig4' ? ws.figures.items[3]?.status === 'done' : k.done));
  if (undone.length) return err(`投稿清单还有 ${undone.length} 项未完成`, `${undone.length} checklist items are unfinished`);
  for (const k of ws.rebuttal.checklist) if (k.auto === 'anon') k.done = true;
  ws.rebuttal.packed = Date.now();
  E.pushEvent(ws, 'human', b('打包投稿版', 'Submission package built'), b('匿名化脚本已跑过并给出 diff', 'The anonymisation script ran and produced a diff'), 'paper', Date.now());
  return ok('投稿版已打包（匿名化 diff 已生成）', 'Submission package built (anonymisation diff generated)');
});
op('rebuttal.rewrite', (ws, {}) => {
  const done = ws.rebuttal.comments.filter((c) => c.status === 'done');
  for (const c of done) { const s = ws.paper.sections.find((x) => x.k === '4.2'); if (s) s.stale = false; }
  ws.paper.version++;
  return ok(`按 ${done.length} 条处理结果重写了相关小节`, `Rewrote the affected sections from ${done.length} handled comments`);
});

op('agent.bind', (ws, { role, model }) => {
  if (!['surveyor', 'executor', 'reviewer'].includes(role)) return err('未知角色', 'Unknown role');
  ws.agents[role] = model;
  return ok(`${role} 已绑定 ${model}`, `${role} now bound to ${model}`);
});

// On a real project the workbench is a decision surface, not a writer: it may
// rule on a hypothesis, queue a run and log what a human did. Everything else
// belongs to an agent and is refused rather than silently kept in memory.
const PROJECT_OPS = new Set(['verdict.apply', 'exp.run', 'exp.runBatch', 'hyp.submit', 'decision.snooze']);

export function apply(ws, opName, args, lang = 'zh') {
  const fn = OPS[opName];
  if (!fn) return { ok: false, toast: b('未知操作', 'Unknown operation') };
  if (ws.mode === 'project' && !PROJECT_OPS.has(opName)) {
    return { ok: false, toast: b('接入真实项目时，这一步由 agent 写入：工作台只写裁定、排队与人工事件。',
      'On a live project this step is written by an agent: the workbench only writes verdicts, queue entries and human events.') };
  }
  if (ws.readonly) return { ok: false, toast: b('当前为只读模式', 'This workspace is read-only') };
  let r;
  try {
    r = fn(ws, args && typeof args === 'object' ? args : {}, lang === 'en' ? 'en' : 'zh');
  } catch (e) {
    console.error('action failed:', opName, e);
    return { ok: false, toast: b('操作失败，状态未改变', 'The action failed; nothing was changed') };
  }
  ws.updatedAt = Date.now();
  E.tick(ws);
  return r;
}
