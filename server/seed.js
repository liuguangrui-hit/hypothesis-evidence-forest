// Seed data for a fresh visitor workspace. Every user-facing string is bilingual: {zh, en}.
// Times are stored as epoch ms, relative to workspace creation, so the demo always looks "live".

export const b = (zh, en) => ({ zh, en });
const MIN = 60000, HOUR = 3600000;

export const COLORS = { 'P-014': '#2F5FE0', 'P-016': '#A21CAF', 'P-017': '#0F8F7B', 'P-018': '#BE123C', done: '#64748B' };

// ---------------------------------------------------------------- hypotheses
// [id, zh, en, status, evidence[[exp, idea, delta, zh, en]], extras]
const H = [];
const h = (id, zh, en, status = 'untested', ev = [], extra = {}) => H.push({ id, claim: b(zh, en), status, ev, ...extra });

h('H-01', '梯度噪声可用尺度参数刻画', 'Gradient noise can be characterised by a scale parameter', 'self_verified',
  [['e_01', 'P-014', 0.8, '三档 batch 下尺度参数稳定', 'Scale parameter stable across three batch sizes'], ['e_02', 'P-016', 0.6, '换数据集后仍成立', 'Holds after switching dataset']]);
h('H-02', '小 batch 下噪声尺度上升导致有效步长下降', 'Noise scale rises at small batch, shrinking the effective step', 'pending_review', [
  ['e_04', 'P-014', -0.7, '小 batch 三档趋势相反，拟合不显著', 'Trend reverses across three small batches; fit not significant'],
  ['e_09', 'P-016', -0.8, '换数据集后噪声尺度不随 batch 变化', 'Noise scale no longer varies with batch on another dataset'],
  ['e_12', 'P-014', -1.2, '改用二阶估计仍未复现原趋势', 'Second-order estimate still fails to reproduce the trend'],
  ['e_13', 'P-017', 0.3, '低秩子空间上局部成立', 'Holds locally in the low-rank subspace'],
  ['e_14', 'P-016', 0.3, '窄区间内可重复，但外推失效', 'Repeatable in a narrow range; extrapolation fails']],
  { decisions: ['REFINE', 'REFINE', 'PIVOT', 'PIVOT', 'PIVOT'], pivots: 3 });
h('H-03', '二阶项在噪声下被系统性低估', 'Second-order terms are systematically underestimated under noise', 'inductive_unverified',
  [['ind', 'P-014', 0.6, '由 P-014 的 1.2.2 与 P-016 的 2.1 归纳', 'Induced from P-014 1.2.2 and P-016 2.1']], { induced: true });
h('H-05', '修正后有效步长回升', 'Effective step recovers after the correction', 'pending_review', [
  ['e_05', 'P-014', -0.4, '调 batch 后仍未回升', 'No recovery after tuning batch'],
  ['e_06', 'P-014', -0.6, '缩小适用域后无改善', 'No improvement after narrowing the domain'],
  ['e_07', 'P-014', -0.6, '换度量方式后无改善', 'No improvement after switching the metric']],
  { decisions: ['REFINE', 'PIVOT', 'PIVOT', 'PIVOT'], pivots: 3, warrant: b('二阶项在噪声下被系统性低估，补回该项即可还原步长', 'Second-order terms are systematically underestimated under noise; adding them back restores the step') });
h('H-06', 'Hessian 谱在低秩子空间集中', 'The Hessian spectrum concentrates in a low-rank subspace', 'self_verified',
  [['e_10', 'P-017', 0.4, '第 1 层通过', 'Layer 1 passed'], ['e_02b', 'P-017', 0.7, '前 8 个特征方向占 91% 能量', 'Top-8 directions carry 91% of the energy']]);
h('H-07', '修正项在 batch ≤ 128 区间稳定生效', 'The correction holds steadily for batch ≤ 128', 'untested', [], { depends: ['H-05'] });
h('H-09', '早停判据与压缩率共用同一上界', 'The early-stop criterion and compression rate share one bound', 'untested', [], { needsDecompose: true });
h('H-11', '噪声尺度随 batch 减小呈 √ 关系', 'Noise scale follows a √ law as batch shrinks', 'untested', [
  ['e_08', 'P-014', 0.2, '三档 batch 趋势一致', 'Trend consistent across three batch sizes'],
  ['e_11', 'P-016', 0.2, '换数据集后方向不变', 'Direction unchanged on another dataset']]);
h('H-12', '修正项可与梯度计算融合', 'The correction can be fused with the gradient computation', 'untested', [
  ['e_03', 'P-014', 0.5, '融合实现不增加反向传播', 'Fused implementation adds no backward pass'],
  ['e_17', 'P-014', 0.4, '有效步长回升 18.4%（旧口径）', 'Effective step +18.4% (old metric)']], { rerun: true });
h('H-14', '压缩误差在低秩子空间上可界', 'Compression error is bounded in the low-rank subspace');
h('H-16', '三个 idea 共用的 baseline 需在同一种子下重测', 'The baseline shared by three ideas must be re-measured under one seed set', 'untested', [], { rerun: true });
h('H-18', '通信量下降不引入额外偏差', 'Reduced communication introduces no extra bias');
h('H-19', '早停点与修正项的最优区间重合', 'The early-stop point and the correction’s optimal range coincide');
// own nodes of the three running ideas
h('H-30', '几何修正让小 batch 训练收敛更快', 'Geometric correction speeds up small-batch training');
h('H-31', '修正后减少收敛步数', 'The correction reduces steps to converge');
h('H-33', '修正开销可忽略', 'The correction’s overhead is negligible');
h('H-34', '修正误差不会被放大', 'Correction error is not amplified');
h('H-35', '共用上界可由 Hessian 迹估计', 'The shared bound can be estimated from the Hessian trace');
h('H-36', '信噪比阈值可替代固定 patience', 'A signal-to-noise threshold can replace a fixed patience');
h('H-38', '低秩子空间内的梯度压缩不损失收敛', 'Gradient compression in the low-rank subspace keeps convergence');
h('H-32', '修正项对学习率不敏感', 'The correction is insensitive to the learning rate');
h('H-37', '早停不损伤最终精度', 'Early stopping does not hurt final accuracy');
h('H-39', '误差反馈在低秩投影下仍然收敛', 'Error feedback still converges under low-rank projection');
h('H-40', '压缩率与收敛步数呈单调关系', 'Compression rate is monotone in steps to converge');
h('H-04', '投影秩 r 存在拐点', 'The projection rank r has an elbow');
h('H-08', '早停点对 seed 稳健', 'The early-stop point is robust to the seed');
// P-011 learning-rate scheduling (7)
h('H-41', '余弦调度优于阶梯调度', 'Cosine schedules beat step schedules', 'self_verified');
h('H-42', 'warmup 长度与 batch 线性相关', 'Warmup length scales linearly with batch', 'self_verified');
h('H-43', '周期重启在小数据集上无收益', 'Periodic restarts bring no gain on small datasets', 'closed');
h('H-44', '调度对优化器类型不敏感', 'Schedules are insensitive to optimizer type', 'lit_supported');
h('H-45', '末段线性衰减降低方差', 'Linear tail decay lowers variance', 'self_verified');
h('H-10', '峰值学习率需随宽度缩放', 'Peak learning rate must scale with width');
h('H-13', '调度可迁移到微调阶段', 'The schedule transfers to fine-tuning');
// P-013 batch size & generalization (8)
h('H-46', '大 batch 泛化差距源于尖锐极小值', 'The large-batch generalisation gap comes from sharp minima', 'closed');
h('H-47', '线性缩放规则在 ≤ 4k 成立', 'The linear scaling rule holds up to 4k', 'self_verified');
h('H-48', '梯度累积等价于大 batch', 'Gradient accumulation equals a large batch', 'self_verified');
h('H-49', '标签噪声放大 batch 的影响', 'Label noise amplifies the effect of batch size');
h('H-50', '小 batch 的隐式正则化可被显式项替代', 'Implicit regularisation of small batches can be replaced by an explicit term', 'lit_supported');
h('H-51', '泛化差距随训练时长收敛', 'The generalisation gap closes with longer training');
h('H-15', '数据增强缩小 batch 间差距', 'Augmentation narrows the gap between batch sizes', 'closed');
h('H-17', 'BN 统计量是主要混杂因素', 'BatchNorm statistics are the main confounder');
// P-015 adaptive regularisation (9, all verified)
['权重衰减可按层自适应', '正则强度随训练进程衰减', 'dropout 率与层宽成反比', '自适应正则减少过拟合', '正则项梯度可闭式计算',
  '自适应权重衰减不增加超参', '正则强度对 seed 稳健', '与 Adam 兼容', '在三个数据集上复现'].forEach((zh, i) => {
  const en = ['Weight decay can adapt per layer', 'Regularisation strength decays with training', 'Dropout rate is inversely proportional to layer width', 'Adaptive regularisation reduces overfitting',
    'The regulariser gradient has a closed form', 'Adaptive weight decay adds no hyper-parameters', 'Regularisation strength is robust to the seed', 'Compatible with Adam', 'Reproduced on three datasets'][i];
  h('H-' + [52, 53, 54, 55, 56, 57, 58, 59, 20][i], zh, en, 'self_verified');
});
// P-019 distributed sync (5)
h('H-24', '异步更新在延迟 < 3 步时无损', 'Asynchronous updates are lossless when staleness < 3', 'self_verified');
h('H-25', '梯度陈旧度可用一阶补偿', 'Gradient staleness can be compensated to first order', 'self_verified');
h('H-26', '局部 SGD 的同步间隔存在最优值', 'Local SGD has an optimal sync interval', 'closed');
h('H-27', '通信拓扑对收敛影响小于带宽', 'Topology matters less than bandwidth');
h('H-28', '慢节点可被丢弃而不偏置估计', 'Stragglers can be dropped without biasing the estimate');
h('H-29', '环形归约在 64 卡内是最优拓扑', 'Ring all-reduce is optimal within 64 GPUs');

const IDEAS = [
  ['P-011', '学习率调度', 'Learning-rate scheduling', 'done'],
  ['P-013', '批量与泛化', 'Batch size & generalisation', 'done'],
  ['P-014', '几何修正', 'Geometric correction', 'running'],
  ['P-015', '自适应正则', 'Adaptive regularisation', 'done'],
  ['P-016', '早停准则', 'Early-stop criterion', 'running'],
  ['P-017', '梯度压缩', 'Gradient compression', 'running'],
  ['P-018', '低秩共用', 'Shared low-rank', 'candidate'],
  ['P-019', '分布式同步', 'Distributed sync', 'parked'],
];

// tree nodes: [key, hyp, parentKey, role]
const OWN = 'own_to_prove', BOR = 'borrowed_assumption';
const TREES = {
  'P-014': [['1', 'H-30', null, OWN], ['1.1', 'H-01', '1', BOR], ['1.2', 'H-31', '1', OWN], ['1.2.1', 'H-02', '1.2', OWN], ['1.2.2', 'H-11', '1.2', OWN],
    ['1.2.3', 'H-05', '1.2.1', OWN], ['1.2.3.1', 'H-07', '1.2.3', OWN], ['1.2.4', 'H-19', '1.2', OWN], ['1.3', 'H-33', '1', OWN], ['1.3.1', 'H-12', '1.3', OWN],
    ['1.3.2', 'H-34', '1.3', OWN], ['1.I', 'H-03', null, OWN]],
  'P-016': [['1', 'H-02', null, BOR], ['1.1', 'H-01', '1', BOR], ['1.2', 'H-11', '1', OWN], ['1.3', 'H-09', '1', OWN], ['1.3.1', 'H-35', '1.3', OWN],
    ['1.4', 'H-19', '1', OWN], ['1.5', 'H-16', '1', OWN], ['1.6', 'H-36', '1', OWN], ['1.9', 'H-06', '1', BOR], ['1.10', 'H-12', '1', BOR], ['1.I', 'H-03', null, OWN]],
  'P-017': [['1', 'H-38', null, OWN], ['1.1', 'H-06', '1', OWN], ['1.1.1', 'H-02', '1.1', BOR], ['1.2', 'H-14', '1', OWN], ['1.3', 'H-18', '1', OWN],
    ['1.4', 'H-09', '1', OWN], ['1.5', 'H-16', '1', OWN], ['1.6', 'H-39', '1', OWN], ['1.9', 'H-01', '1', BOR], ['1.10', 'H-11', '1', BOR]],
  'P-011': [['1', 'H-41', null, OWN], ['1.1', 'H-42', '1', OWN], ['1.2', 'H-43', '1', OWN], ['1.3', 'H-44', '1', BOR], ['1.4', 'H-45', '1', OWN], ['1.5', 'H-10', '1', OWN], ['1.6', 'H-13', '1', OWN]],
  'P-013': [['1', 'H-46', null, OWN], ['1.1', 'H-47', '1', OWN], ['1.2', 'H-48', '1', OWN], ['1.3', 'H-49', '1', OWN], ['1.4', 'H-50', '1', BOR], ['1.5', 'H-51', '1', OWN], ['1.6', 'H-15', '1', OWN], ['1.7', 'H-17', '1', OWN]],
  'P-015': [['1', 'H-52', null, OWN], ['1.1', 'H-53', '1', OWN], ['1.2', 'H-54', '1', OWN], ['1.3', 'H-55', '1', OWN], ['1.4', 'H-56', '1', OWN], ['1.5', 'H-57', '1', OWN],
    ['1.6', 'H-58', '1', OWN], ['1.7', 'H-59', '1', OWN], ['1.8', 'H-20', '1', OWN]],
  'P-019': [['1', 'H-24', null, OWN], ['1.1', 'H-25', '1', OWN], ['1.2', 'H-26', '1', OWN], ['1.3', 'H-27', '1', OWN], ['1.4', 'H-28', '1', OWN], ['1.5', 'H-29', '1', OWN]],
};
// extra hyps not yet placed in a tree (H-32, H-37, H-40, H-04, H-08) hang under running ideas
TREES['P-014'].push(['1.4', 'H-32', '1', OWN]);
TREES['P-016'].push(['1.7', 'H-37', '1', OWN], ['1.8', 'H-08', '1', OWN]);
TREES['P-017'].push(['1.7', 'H-40', '1', OWN], ['1.8', 'H-04', '1', OWN]);

// ---------------------------------------------------------------- experiments
const cfgOf = (model, batch, seed, opt, steps, measure) => ({ model, batch, seed, opt, steps, measure });
const EXP_DONE = [
  ['e_01', 'H-01', 'P-014', 0.8], ['e_02', 'H-01', 'P-016', 0.6], ['e_03', 'H-12', 'P-014', 0.5], ['e_04', 'H-02', 'P-014', -0.7], ['e_05', 'H-05', 'P-014', -0.4],
  ['e_06', 'H-05', 'P-014', -0.6], ['e_07', 'H-05', 'P-014', -0.6], ['e_08', 'H-11', 'P-014', 0.2], ['e_09', 'H-02', 'P-016', -0.8], ['e_10', 'H-06', 'P-017', 0.4],
  ['e_11', 'H-11', 'P-016', 0.2], ['e_12', 'H-02', 'P-014', -1.2], ['e_13', 'H-02', 'P-017', 0.3], ['e_14', 'H-02', 'P-016', 0.3], ['e_17', 'H-12', 'P-014', 0.4],
];

export function makeWorkspace(now = Date.now()) {
  const ws = { v: 1, createdAt: now, updatedAt: now, lastTick: now, seq: { exp: 26, run: 2310, hyp: 60, node: 145, spark: 6, idea: 20, event: 0, cand: 0 } };

  ws.settings = { parallel: 3, budget: 120, gpuUsed: 84, gpus: 4 };
  ws.agents = { surveyor: 'deepseek', executor: 'codex', reviewer: 'claude' };

  // ---- ideas & hypotheses & trees
  ws.ideas = IDEAS.map(([id, zh, en, status]) => ({ id, name: b(zh, en), status, color: COLORS[id] || COLORS.done }));
  ws.hyps = {};
  for (const x of H) {
    ws.hyps[x.id] = {
      id: x.id, claim: x.claim, warrant: x.warrant || null, status: x.status, induced: !!x.induced, needsDecompose: !!x.needsDecompose, rerun: !!x.rerun,
      depends: x.depends || [], decisions: (x.decisions || []).map((k, i) => ({ kind: k, at: now - (600 - i * 60) * MIN })), pivots: x.pivots || 0,
      evidence: x.ev.map(([exp, idea, delta, zh, en], i) => ({ exp, idea, delta, note: b(zh, en), at: now - (3000 - i * 200) * MIN })),
    };
  }
  ws.trees = {};
  for (const [idea, nodes] of Object.entries(TREES)) ws.trees[idea] = nodes.map(([k, hyp, parent, role]) => ({ k, hyp, parent, role, frozen: false, local: null }));
  ws.hyps['H-02'].depends = [];
  ws.hyps['H-05'].depends = ['H-02', 'H-11'];
  ws.crossDeps = [['H-19', 'H-12'], ['H-09', 'H-06'], ['H-16', 'H-11'], ['H-35', 'H-06'], ['H-36', 'H-01'], ['H-14', 'H-06'], ['H-18', 'H-14']];
  ws.candidateNote = {};

  // ---- experiments
  ws.experiments = {};
  const mk = (e) => (ws.experiments[e.id] = e);
  EXP_DONE.forEach(([id, hyp, idea, delta], i) => mk({
    id, hyp, idea, status: 'done', prog: 1, startedAt: now - (2600 - i * 140) * MIN, durMs: 10 * MIN, gpu: i % 4, cfg: cfgOf('ResNet-50 / CIFAR-100', '32 → 512', '0,1,2', 'SGD', '40k', 'noise / eff_step'),
    outcome: { delta, rec: delta >= 0 ? 'PROCEED' : 'PIVOT', conf: 0.7 }, decision: { kind: delta >= 0 ? 'PROCEED' : 'PIVOT', at: now - (2590 - i * 140) * MIN, auto: true }, hours: 3.2, cost: 56, label: b('已完成实验', 'Completed experiment'),
  }));
  mk({
    id: 'e_15', hyp: 'H-11', idea: 'P-014', node: 'n_142', status: 'running', prog: 0.62, startedAt: now - 3.7 * MIN, durMs: 6 * MIN, gpu: 0, hours: 6.4, cost: 112, vcpu: 36,
    cfg: cfgOf('ResNet-50 / CIFAR-100', '32 → 2048 (7)', '0,1,2', 'SGD + correction', '40k · early-stop off', 'eff_step / noise_scale'),
    outcome: { delta: 0.6, rec: 'PROCEED', conf: 0.72 }, label: b('n_142 换数据集复核', 'n_142 dataset re-check'), sweep: true,
  });
  mk({
    id: 'e_16', hyp: 'H-16', idea: 'P-014', status: 'running', prog: 0.31, startedAt: now - 3.1 * MIN, durMs: 10 * MIN, gpu: 1, hours: 8.0, cost: 140, vcpu: 36,
    cfg: cfgOf('ResNet-50 / CIFAR-100', '128', '0,1,2', 'SGD baseline', '40k', 'final acc'), outcome: { delta: 0.5, rec: 'PROCEED', conf: 0.81 }, label: b('共用 baseline 同种子重测', 'Shared baseline re-run, same seeds'),
  });
  mk({
    id: 'e_18', hyp: 'H-14', idea: 'P-017', status: 'running', prog: 0.08, startedAt: now - 0.9 * MIN, durMs: 11 * MIN, gpu: 2, hours: 3.5, cost: 61, vcpu: 18,
    cfg: cfgOf('ResNet-50 / CIFAR-100', '256', '0,1', 'SGD + rank-r projection', '30k', 'compression error'), outcome: { delta: 0.4, rec: 'PROCEED', conf: 0.66 }, label: b('低秩误差界', 'Low-rank error bound'),
  });
  const q = (id, hyp, idea, zh, en, d, rec) => mk({
    id, hyp, idea, status: 'queued', prog: 0, durMs: 7 * MIN, hours: 3, cost: 52, cfg: cfgOf('ResNet-50 / CIFAR-100', '128', '0,1,2', 'SGD', '30k', 'eff_step'),
    outcome: { delta: d, rec, conf: 0.6 }, label: b(zh, en), queuedAt: now - 30 * MIN,
  });
  q('e_19', 'H-12', 'P-014', '修正项与梯度融合', 'Correction fused with gradients', 0.5, 'PROCEED');
  q('e_20', 'H-18', 'P-017', '通信量不引入偏差', 'Communication adds no bias', 0.4, 'PROCEED');
  q('e_22', 'H-30', 'P-014', '补两条近期基线对比', 'Head-to-head vs. two recent baselines', 0.5, 'PROCEED');
  q('e_23', 'H-33', 'P-014', 'profiler 实测开销', 'Profiler-measured overhead', 0.4, 'PROCEED');
  ws.experiments.e_22.fromComment = 'B1'; ws.experiments.e_23.fromComment = 'C1';

  // ---- exp tree (per idea, P-014 detailed)
  ws.exptree = { 'P-014': makeExpTree(now) };

  // ---- runs history (timeline). start = ms before now, dur = ms
  const R = (id, gpu, agoH, durH, idea, zh, en, status = 'done', cost = 0) => ({ id, gpu, start: now - agoH * HOUR, dur: durH * HOUR, idea, label: b(zh, en), status, cost });
  ws.runs = [
    R('run_2286', 0, 23.4, 4.2, 'P-014', '调参', 'tuning'), R('run_2291', 0, 17.6, 5.0, 'P-014', '7 档扫描', '7-batch sweep'), R('run_2302', 0, 11.7, 2.6, 'P-016', '判', 'verdict check'),
    R('run_2288', 1, 23.3, 2.4, 'P-017', '', ''), R('run_2289', 1, 20.2, 1.8, 'P-014', '', '', 'failed'), R('run_2295', 1, 17.7, 5.6, 'P-016', '共享 baseline', 'shared baseline'),
    R('run_2293', 2, 21.3, 4.0, 'P-018', '方差界初探', 'variance-bound probe', 'done'), R('run_2290', 2, 16.9, 1.8, 'P-016', '', '', 'failed'), R('run_2298', 2, 13.6, 6.0, 'P-014', '三种子重复', '3-seed repeat'),
    R('run_2287', 3, 23.3, 3.6, 'P-016', '早停判', 'early-stop check'), R('run_2292', 3, 19.3, 2.0, 'P-014', '', '', 'failed'), R('run_2297', 3, 15.2, 5.6, 'P-017', '通信量测量', 'communication probe'),
    R('run_2301', 3, 8.4, 2.0, 'P-014', 'H-52 方差界 · batch 2048', 'H-52 variance bound · batch 2048', 'failed', 35),
  ];
  ws.failures = [
    { id: 'f1', kind: 'oom', n: 3, rescued: 3, status: 'rescued', title: b('显存不足 OOM', 'Out of memory (OOM)'), cause: b('batch 2048 在单卡上放不下，agent 没有估算显存就直接提交。', 'Batch 2048 does not fit on one card; the agent submitted without estimating memory.'), action: b('降到 1024 重试，并把上限写进该节点配置', 'Retry at 1024 and write the ceiling into the node config') },
    { id: 'f2', kind: 'timeout', n: 2, rescued: 2, status: 'rescued', title: b('超时', 'Timeout'), cause: b('单次运行超过 6 小时上限被杀，日志停在 22k / 40k 步。', 'A run exceeded the 6-hour cap and was killed; the log stops at 22k / 40k steps.'), action: b('拆成两段续跑，检查点每 5k 步落盘', 'Split into two segments and resume; checkpoint every 5k steps') },
    { id: 'f3', kind: 'format', n: 1, rescued: 0, status: 'review', title: b('产物格式不对', 'Malformed artifact'), cause: b('metrics.csv 少了 seed 列，下游画图脚本读不到。', 'metrics.csv lacks a seed column; the plotting script cannot read it.'), action: b('按 artifacts 规范重写并回填，已通知 executor', 'Rewrite per the artifacts spec and backfill; executor notified') },
    { id: 'f4', kind: 'data', n: 1, rescued: 0, status: 'review', title: b('数据缺失', 'Missing data'), cause: b('tiny-imagenet 挂载路径在新节点上不存在。', 'The tiny-imagenet mount path does not exist on the new node.'), action: b('重新拉取并缓存到共享盘，任务重排队', 'Re-fetch and cache on shared disk; task re-queued') },
  ];
  ws.spendByIdea = { 'P-014': 38.2, 'P-016': 23.4, 'P-017': 16.1, 'P-018': 6.3 };
  ws.failBurn = 7.1;

  // ---- sweep for e_15 / H-11
  ws.sweep = makeSweep();

  // ---- verdicts
  ws.verdicts = {};
  ws.verdictHistory = [
    ['H-46', 'close', 'P-013', 26], ['H-43', 'close', 'P-011', 30], ['H-15', 'close', 'P-013', 34], ['H-26', 'close', 'P-019', 41],
    ['H-44', 'downgrade', 'P-011', 44], ['H-50', 'downgrade', 'P-013', 47], ['H-07', 'return_active', 'P-014', 3], ['H-42', 'narrow_scope', 'P-011', 52], ['H-25', 'narrow_scope', 'P-019', 58],
  ].map(([hyp, verdict, idea, agoH]) => ({ hyp, verdict, idea, at: now - agoH * HOUR }));

  // ---- events
  ws.events = [];
  const ev = (agoMin, mod, zh, en, dzh, den, kind = 'info', extra = {}) => ws.events.push({ id: ws.events.length + 1, t: now - agoMin * MIN, mod, title: b(zh, en), detail: b(dzh, den), kind, ...extra });
  ev(60 * 23, 'surveyor', '采集完成 · 200 题录 / 48 digest', 'Collection done · 200 records / 48 digests', '预算到顶，游标已写回；TDSC 入口失效 3 篇跳过', 'Budget reached, cursors written back; TDSC entry broken, 3 papers skipped', 'collect');
  ev(60 * 20, 'surveyor', '2026-09 期趋势综述 + 6 条 spark', '2026-09 trend review + 6 sparks', '3 个新簇；1 条 spark 已被展开为 idea', '3 new clusters; 1 spark expanded into an idea', 'collect');
  ev(60 * 17.5, 'executor', 'e_14 完成 · H-02 证据 +0.3', 'e_14 done · H-02 evidence +0.3', '同步更新 P-014 P-016 P-017', 'P-014 P-016 P-017 updated together', 'experiment', { hyp: 'H-02' });
  ev(60 * 16.8, 'reviewer', 'H-05 提交裁定', 'H-05 submitted for verdict', '连续 3 次 PIVOT 无改善', '3 consecutive PIVOTs, no improvement', 'verdict', { hyp: 'H-05' });
  ev(60 * 16.4, 'human', 'P-017 立项 · 复用 H-01 H-02 H-06', 'P-017 launched · reuses H-01 H-02 H-06', '仅新增 3 条自有假设', 'Only 3 own hypotheses added', 'idea');
  ev(60 * 16, 'executor', '归纳出 H-03', 'H-03 induced', '来自 P-014 的 1.2.2 与 P-016 的 2.1', 'From P-014 1.2.2 and P-016 2.1', 'hypothesis', { hyp: 'H-03' });
  ev(60 * 15, 'reviewer', 'reviewer 巡检 · 处理 1 项', 'Reviewer sweep · 1 item handled', 'H-07 退回 active', 'H-07 returned to active', 'verdict');
  ev(60 * 14.5, 'executor', 'P-015 收束 · 生成论文草稿', 'P-015 wrapped up · draft generated', '9 节点全部 self_verified', 'All 9 nodes self_verified', 'paper');
  ev(60 * 13.5, 'executor', 'e_10 完成 · H-06 证据 +0.4', 'e_10 done · H-06 evidence +0.4', 'P-017 第 1 层通过', 'P-017 layer 1 passed', 'experiment', { hyp: 'H-06' });
  ev(60 * 10, 'human', '批准 P-017 立项', 'Approved P-017 launch', '人工介入', 'Manual intervention', 'idea');
  ws.events.sort((a, c) => c.t - a.t);
  ws.seq.event = ws.events.length;
  ws.lastHuman = now - 60 * 16.4 * MIN;

  // ---- survey
  ws.survey = makeSurvey(now);
  ws.trends = null; // static
  ws.papers = makePapers(now);
  ws.sparks = makeSparks(now);
  ws.trendGaps = { g1: false, g2: false, g3: false }; // gap -> spark generated
  ws.ideaLab = makeIdeaLab();
  ws.paper = makePaper(now);
  ws.claims = makeClaims();
  ws.figures = makeFigures(now);
  ws.rebuttal = makeRebuttal();
  ws.exports = { claimsGate: null };
  ws.decisions = { fig3: false }; // human decision cards on Home
  ws.snoozed = {};
  return ws;
}

// ---------------------------------------------------------------- experiment tree (P-014)
function makeExpTree(now) {
  const n = (id, type, status, score, parent, zh, en, extra = {}) => ({ id, type, status, score, parent, summary: b(zh, en), ...extra });
  return {
    budget: { used: 84, total: 120 }, parallel: 3, k: 3,
    nodes: [
      n('n_101', 'new', 'success', 0.52, null, '初探：三档 batch 上跑出原始趋势', 'Probe: reproduce the raw trend on three batch sizes', { stage: 'probe' }),
      n('n_108', 'improve', 'success', 0.63, 'n_101', '初探：加入修正项，观察有效步长', 'Probe: add the correction and watch the effective step', { stage: 'probe' }),
      n('n_112', 'fix', 'failed', null, 'n_108', '修错：显存溢出，batch 2048 放不下', 'Fix: OOM — batch 2048 does not fit', { stage: 'probe', pruned: true }),
      n('n_115', 'improve', 'success', 0.68, 'n_108', '调参：学习率 × 修正系数网格', 'Tune: learning-rate × correction grid', { stage: 'tune' }),
      n('n_118', 'improve', 'pruned', 0.55, 'n_108', '调参：cosine 调度（不优于常数）', 'Tune: cosine schedule (no better than constant)', { stage: 'tune', pruned: true }),
      n('n_124', 'improve', 'success', 0.81, 'n_115', '主实验：最优配置 lr=0.1, α=0.35', 'Main: best config lr=0.1, α=0.35', { stage: 'main', best: true }),
      n('n_141', 'improve', 'success', 0.79, 'n_124', '7 档 batch 扫描', '7-batch sweep', { stage: 'main' }),
      n('n_142', 'improve', 'running', null, 'n_124', '换数据集复核：把 n_124 的最优配置原样搬到 CIFAR-100 之外的第二个数据集，只改数据不改超参。', 'Dataset re-check: carry n_124’s best config to a second dataset beyond CIFAR-100, changing only the data.', {
        stage: 'main', exp: 'e_15', change: 'dataset: cifar100 → tiny-imagenet', hyp: 'H-11',
      }),
      n('n_145', 'improve', 'success', 0.74, 'n_124', '三种子重复', 'Three-seed repeat', { stage: 'main' }),
      n('n_151', 'improve', 'queued', null, 'n_141', '消融：去掉修正项', 'Ablation: drop the correction', { stage: 'ablate', exp: 'e_19' }),
      n('n_152', 'improve', 'success', 0.66, 'n_141', '消融：去掉融合，改独立反向传播', 'Ablation: replace fusion with a separate backward pass', { stage: 'ablate' }),
      n('n_153', 'fix', 'failed', null, 'n_145', '修错：metrics.csv 缺 seed 列', 'Fix: metrics.csv missing seed column', { stage: 'main', pruned: true }),
    ],
  };
}

// ---------------------------------------------------------------- sweep
function makeSweep() {
  const batches = [32, 64, 128, 512, 1024, 2048];
  const eff = { 32: [0.38, 0.35, 0.4], 64: [0.47, 0.5, 0.45], 128: [0.61, 0.6, 0.64], 512: [0.83, 0.79, 0.85], 1024: [0.91, 0.87, null], 2048: [null, null, null] };
  const noise = { 32: [4.21, 4.35, 4.08], 64: [3.02, 2.96, 3.1], 128: [2.06, 2.1, 2.01], 512: [1.04, 1.01, 1.08], 1024: [0.74, 0.72, null], 2048: [null, null, null] };
  const cells = [];
  for (const bt of batches) for (let s = 0; s < 3; s++) {
    const e = eff[bt][s];
    cells.push({ b: bt, s, eff: e, noise: noise[bt][s], state: e == null ? (bt === 2048 ? 'oom' : 'running') : 'done' });
  }
  return { hyp: 'H-11', metric: 'eff', mode: 'single', alpha: 0.05, cells, cmp: [32, 512], cmp2: [32, 64], rep: { b: 128, s: 1, lr: '0.1 · cosine', run: 'run_2291' }, written: false, gpuh: 18.4, remain: 2.6, filled: false };
}

// ---------------------------------------------------------------- survey
function makeSurvey(now) {
  const V = (id, name, type, level, scan, entry, cursor, delta, st = 'ok') => ({ id, name, type, level, scan, entry, cursor, delta, status: st });
  return {
    lastRun: now - 26 * HOUR, nextInDays: 7, job: null, records: 200, fulltext: 48, fulltextCap: 60, library: 1207, whitelist: 62, thisRound: 200, skipped: 79,
    venues: [
      V('CCS', 'ACM CCS', 'conf', 'CCF-A', 'core', 'dblp:conf/ccs', '2024', 18), V('IEEE-SP', 'IEEE S&P (Oakland)', 'conf', 'CCF-A', 'core', 'dblp:conf/sp', '2025', 12),
      V('USENIX-SEC', 'USENIX Security', 'conf', 'CCF-A', 'core', 'byname/108', '2025', 21), V('NDSS', 'NDSS', 'conf', 'CCF-A', 'core', 'ndss', '2026', 9),
      V('SATML', 'IEEE SaTML', 'conf', '', 'core', 'satml.org', '2026', 14), V('POPETS', 'PoPETs / PETS', 'journal', 'CCF-B', 'core', 'popets', '2026-Q3', 7),
      V('TDSC', 'IEEE TDSC', 'journal', 'CCF-A', 'core', 'issn:1545-5971', '', 0, 'broken'), V('NMI', 'Nature Machine Intelligence', 'journal', 'top', 'core', 'issn:2522-5839', '09', 3),
      V('NATURE', 'Nature', 'journal', 'top', 'core', 'issn:0028-0836', '09-12', 1), V('ARXIV-CR', 'arXiv cs.CR', 'preprint', '', 'core', 'arxiv:cs.CR', '2026-09-18', 96),
      V('NEURIPS', 'NeurIPS', 'conf', 'CCF-A', 'watch', 'papers.nips.cc', '2025', 14), V('ICLR', 'ICLR', 'conf', '', 'watch', 'openreview', '2026', 11),
      V('ARXIV-MA', 'arXiv cs.MA', 'preprint', '', 'watch', 'arxiv:cs.MA', '09-18', 8), V('ACL', 'ACL', 'conf', 'CCF-A', 'watch', 'aclanthology', '2026', 6),
      V('TIFS', 'IEEE TIFS', 'journal', 'CCF-A', 'core', 'issn:1556-6013', '08', 5), V('ARXIV-LG', 'arXiv cs.LG', 'preprint', '', 'watch', 'arxiv:cs.LG', '09-18', 4),
      V('RECSYS', 'RecSys', 'conf', 'CCF-B', 'watch', 'recsys.acm.org', '2026', 2),
    ],
    others: 48, parked: 12, enumerated: 3182, passedTopics: 268, funnel: { l1: 200, l2: 48, l3: 12 }, stock: [1207, 486, 38],
    state: { 'dblp:conf/ccs': '2024', 'arxiv:cs.CR': '2026-09-18', 'no-doi': 14, 'auth-failed': 3, 'not-in-scope': 62 },
    notes: b('TDSC 入口改版，本轮 3 篇登录失败已跳过并记录，未重试；已追加到 candidates 等确认。', 'TDSC changed its entry page; 3 login failures this round were skipped and logged, not retried; appended to candidates for confirmation.'),
    candidates: [
      { id: 'c1', kind: 'venue', name: 'Nature Methods', date: '09-14', why: b('登了一套可迁移的自动发现框架，符合 ai-scientist 纳入定义 · 触发 arxiv-2608-04417', 'Published a transferable automated-discovery framework that fits the ai-scientist inclusion rule · triggered by arxiv-2608-04417'), accept: b('并入 venues.yaml', 'Add to venues.yaml') },
      { id: 'c2', kind: 'topic', name: b('agent 工具链投毒', 'agent tool-chain poisoning'), date: '09-16', why: b('攻击面在 agent 调用的外部工具上，落点仍在 AI 系统本身 · 触发 4 篇', 'The attack surface is the external tools an agent calls; the impact still lands on the AI system itself · triggered by 4 papers'), accept: b('并入 topics.md', 'Add to topics.md') },
    ],
    topics: ['security', 'ai-scientist'],
  };
}

// ---------------------------------------------------------------- papers
function makePapers(now) {
  const P = {};
  const add = (id, o) => (P[id] = { id, doi: null, status: 'preprint', level: 1, tracks: ['security'], fetched: '2026-09-1' + (Object.keys(P).length % 9), size: '1.8 MB', queued: false, brief: false, full: false, keywords: [], digest: null, similar: [], ...o });
  add('arxiv-2606-01882', {
    title: b('Tool-Returned Content as an Injection Surface in LLM Agents', 'Tool-Returned Content as an Injection Surface in LLM Agents'), authors: 'L. Ren, M. Okabe, S. Iyer, +2', venue: 'ARXIV-CR', year: 2026, arxiv: '2606.01882', level: 2,
    tracks: ['security', 'ai-scientist'], fetched: '2026-09-14', size: '2.4 MB', regenAt: null,
    reason: b('攻击面在 agent 读取的工具返回值上，失效后果落在 AI 系统自身；同时提出可复用的自动评测流程。', 'The attack surface is the tool-return value an agent reads, with failure landing on the AI system itself; it also proposes a reusable automated evaluation pipeline.'),
    keywords: ['indirect prompt injection', 'tool poisoning', 'agent hijacking', 'LLM agent', 'black-box attack', 'automated evaluation'],
    digest: {
      title: b('工具返回值：LLM agent 中被忽略的注入面', 'Tool return values: the overlooked injection surface in LLM agents'),
      problem: b('当 agent 把外部工具的返回值直接读进上下文时，这段内容是否构成一条独立的注入路径；现有防御集中在用户输入与系统提示，这一侧几乎没有覆盖。', 'When an agent reads external tool return values straight into its context, do they form an independent injection path? Existing defences focus on user input and system prompts; this side is almost uncovered.'),
      threat: b('攻击者不接触模型与用户，只控制 agent 会调用的某个第三方工具（搜索结果页、文档服务、MCP 工具）的返回内容；无梯度、无权重访问，可多轮返回。', 'The attacker never touches the model or the user; they only control the return content of a third-party tool the agent calls (search page, document service, MCP tool). No gradients, no weight access, multi-turn returns allowed.'),
      method: b('把工具返回值建模成不可信通道，构造 5 类载荷（指令改写、目标替换、工具链跳转、权限升级、静默数据外泄），在 3 个开源 agent 框架上做黑盒注入，并用一个自动化流水线批量生成与判定。', 'Model tool returns as an untrusted channel, craft 5 payload classes (instruction rewrite, goal substitution, tool-chain hop, privilege escalation, silent exfiltration), inject black-box into 3 open-source agent frameworks, and use an automated pipeline to generate and judge at scale.'),
      eval: b('3 个框架 × 4 个基座模型 × 5 类载荷，共 1,240 次会话；成功率 34.7%（指令改写最高 51.2%，静默外泄最低 9.8%）；输入端净化基线把成功率从 34.7% 降到 31.1%，几乎无效。', '3 frameworks × 4 base models × 5 payload classes, 1,240 sessions; success rate 34.7% (instruction rewrite highest at 51.2%, silent exfiltration lowest at 9.8%); an input-side sanitising baseline only lowers it from 34.7% to 31.1%, almost no effect.'),
      conclusion: b('注入面的位置比载荷形式更关键；把防御放在工具返回值入口处，同样的规则集可把成功率降到 6.4%。', 'The location of the injection surface matters more than the payload form; putting the defence at the tool-return entry drops the success rate to 6.4% with the same rule set.'),
      limits: b('只测了三个开源框架，闭源产品未覆盖；判定依赖自动裁判，作者报告 4.1% 误判率。多轮场景下只做了 3 轮，更长的会话可能让静默外泄的成功率上升。', 'Only three open-source frameworks were tested; closed products are not covered. Judging relies on an automated judge with a reported 4.1% error rate. Multi-turn tests stop at 3 rounds; longer sessions may raise silent-exfiltration success.'),
    },
    similar: [['arxiv-2608-04417', 0.89], ['doi-10-1145-3576915-3616600', 0.84], ['arxiv-2605-09931', 0.71]],
    cluster: b('间接注入与工具链投毒 · 开簇的头一篇', 'Indirect injection & tool-chain poisoning · first paper of the cluster'),
  });
  const mini = (id, zh, en, venue, year, kw, prob, meth, concl, extra = {}) => add(id, {
    title: b(zh, en), authors: 'A. Author, B. Author, +1', venue, year, keywords: kw, level: 2, tracks: ['security'], reason: b('命中 security track。', 'Matches the security track.'),
    digest: { title: b(zh, en), problem: prob, threat: b('未提及', 'Not mentioned'), method: meth, eval: b('未提及', 'Not mentioned'), conclusion: concl, limits: b('未提及', 'Not mentioned') }, ...extra,
  });
  mini('arxiv-2608-04417', '工具链跳转的静态检测', 'Static detection of tool-chain hops', 'ARXIV-CR', 2026, ['tool poisoning', 'static analysis', 'agent hijacking'],
    b('agent 在多个工具之间跳转时，恶意返回值能否被静态发现。', 'Can malicious return values be found statically when an agent hops between tools?'), b('对工具调用图做污点传播分析。', 'Taint-propagation analysis over the tool-call graph.'), b('静态检测能发现 71% 的跳转，但只做检测、不改变防御位置。', 'Static analysis finds 71% of hops, but it only detects — it does not move the defence.'));
  mini('doi-10-1145-3576915-3616600', 'RAG 检索结果投毒', 'RAG retrieval-result poisoning', 'CCS', 2024, ['RAG poisoning', 'retrieval', 'indirect prompt injection'],
    b('在检索结果里塞入指令，能否劫持生成。', 'Can instructions inserted into retrieval results hijack generation?'), b('构造带指令的文档并注入语料。', 'Craft instruction-bearing documents and inject them into the corpus.'), b('少量投毒文档即可显著改变输出。', 'A handful of poisoned documents significantly change the output.'));
  mini('arxiv-2605-09931', '越狱成功率与模型规模', 'Jailbreak success versus model scale', 'ARXIV-CR', 2026, ['jailbreak', 'guardrail bypass', 'scaling'],
    b('模型越大越难越狱吗。', 'Are larger models harder to jailbreak?'), b('在同一基准上测 7 个规模的模型。', 'Evaluate models at 7 scales on one benchmark.'), b('小模型反而更难被越狱，与常识相反。', 'Smaller models are harder to jailbreak — the opposite of conventional wisdom.'));
  mini('doi-10-1109-sp2026-00142', '智能体工具输出的隐式信任', 'Implicit trust in agent tool outputs', 'IEEE-SP', 2026, ['tool poisoning', 'agent hijacking', 'trust'],
    b('agent 对工具输出的信任假设是否合理。', 'Is an agent’s trust assumption on tool outputs reasonable?'), b('形式化信任边界并做黑盒实验。', 'Formalise the trust boundary and run black-box experiments.'), b('隐式信任使注入几乎零成本。', 'Implicit trust makes injection nearly free.'));
  mini('arxiv-2607-11244', '自动科研系统的可复现性评测', 'Reproducibility evaluation for automated-science systems', 'ARXIV-MA', 2026, ['automated reproduction', 'benchmark', 'ai scientist'],
    b('自动科研系统的产出能否被第三方复现。', 'Can a third party reproduce what automated-science systems produce?'), b('构建复现基准并在干净环境重跑。', 'Build a reproduction benchmark and re-run in clean environments.'), b('只有一小部分产出可被复现。', 'Only a small share of outputs can be reproduced.'), { tracks: ['ai-scientist'] });
  return P;
}

// ---------------------------------------------------------------- sparks
function makeSparks(now) {
  const S = (n, status, zh, en, papers, basisZh, basisEn, from, extra = {}) => ({
    id: 'SPARK-2026-09-00' + n, month: '2026-09', status, ask: b(zh, en), papers, basis: b(basisZh, basisEn), from: b(from[0], from[1]), createdAt: now - (7 - n) * HOUR * 6, ...extra,
  });
  const common = ['arxiv-2606-01882', 'doi-10-1145-3576915-3616600', 'arxiv-2608-04417', 'doi-10-1109-sp2026-00142', 'arxiv-2607-11244', 'arxiv-2605-09931'];
  return {
    quota: [5, 8], drafted: 9, dropped: 3, history: 47, carried: 12,
    items: [
      S(1, 'available', '注入点在工具返回值里，把防御放在用户输入端，是不是一开始就选错了位置？', 'If the injection point is in tool return values, was putting the defence at the user-input side the wrong place from the start?', common,
        '已有工作都在净化用户输入与系统提示；agent 读取工具输出这一侧，6 篇提到风险、0 篇给出防御，也没有人测过这条路径的实际成功率。', 'Existing work sanitises user input and system prompts; on the side where an agent reads tool output, 6 papers mention the risk, 0 give a defence, and nobody has measured the real success rate on this path.',
        ['来自本期「空白：注入点在工具返回值里」', 'From this period’s gap: “the injection point is in tool return values”'],
        { search: b('本地 index 无同问法；历史最近邻 SPARK-2026-07-003（已 merged，问的是输入端）；网络两组查询各取前 20，最近邻 2 篇只做检测、不改位置。', 'No same question in the local index; nearest historical neighbour SPARK-2026-07-003 (merged, about the input side); two web queries, top 20 each, the 2 nearest papers only detect and do not move the defence.'),
          checks: [b('说得出现实后果：部署方会把净化层从输入端挪到工具返回值处，覆盖面与代价都不同。', 'Has a real-world consequence: deployers would move the sanitising layer from the input side to the tool-return side, with different coverage and cost.'),
            b('删掉方法名、模型结构、指标、数据集之后仍然成立——它问的是位置，不是方案。', 'Still holds after removing method names, model structures, metrics and datasets — it asks about location, not a solution.'),
            b('不是「把 A 方法用到 B 数据集」：既没指定方法，也没指定数据集。', 'Not “apply method A to dataset B”: it specifies neither a method nor a dataset.')], gap: 'g1' }),
      S(2, 'available', '同一基准上出现相反的「规模—越狱」关系时，被测量的到底是模型还是基准？', 'When one benchmark yields opposite “scale–jailbreak” relations, is it the model or the benchmark being measured?', common.slice(4, 6),
        '两篇在同一基准上给出相反方向的结论，评测口径不同但都没说明。', 'Two papers reach opposite conclusions on the same benchmark; the evaluation setups differ and neither says so.', ['来自本期「矛盾：模型规模与越狱成功率」', 'From this period’s contradiction: “model scale vs. jailbreak success”'], { gap: 'g2' }),
      S(3, 'developed', '自动科研系统的产出，第三方能复现的比例是多少？没人测过这件事本身说明什么？', 'What share of an automated-science system’s output can a third party reproduce? What does it say that nobody has measured it?', ['arxiv-2607-11244'],
        '评测都在结果正确性上，没有一篇评测产出能否被第三方复现。', 'Evaluations look only at correctness of results; none checks whether outputs are reproducible by a third party.', ['来自本期「空白：自动科研系统只评“对不对”」', 'From this period’s gap: “automated-science systems are only judged on correctness”'], { gap: 'g3', developedAs: 'P-018' }),
      S(4, 'selected', '把「确认某类攻击不存在」当作结论，评测成本会不会反而更低？', 'If “confirming a class of attack does not exist” counts as a result, is evaluation actually cheaper?', ['arxiv-2606-01882', 'arxiv-2608-04417', 'arxiv-2605-09931'],
        '负结果的评测只需要覆盖上界，而不是穷举。', 'Negative results only need to cover an upper bound rather than enumerate.', ['来自历史 spark 的追问', 'A follow-up on a historical spark']),
      S(5, 'available', '知道一条越狱链路成功之后，部署方实际会改哪一个配置？没改的原因是什么？', 'Once a jailbreak chain is known to work, which configuration does the deployer actually change? Why do they not?', common.slice(0, 5),
        '现有工作止于「能成功」，没有追踪部署方的下一步动作。', 'Existing work stops at “it succeeds” and does not follow the deployer’s next move.', ['来自本期趋势的「起来了」', 'From this period’s “rising” signals']),
      S(6, 'available', '一个现象被叫两个名字时，两边社区的检索是不是已经互相看不见了？', 'When one phenomenon has two names, have the two communities’ searches already become invisible to each other?', common.concat(['x']).slice(0, 6),
        'jailbreak 与 guardrail bypass、agent hijacking 与 agent takeover 并存。', 'jailbreak and guardrail bypass coexist; so do agent hijacking and agent takeover.', ['来自本期术语变化', 'From this period’s term shifts']),
    ],
    actions: [
      { at: now - 26 * HOUR, zh: '003 被展开为一个 idea，状态转 developed', en: '003 expanded into an idea, status → developed' },
      { at: now - 50 * HOUR, zh: '004 转 selected，等待展开', en: '004 → selected, waiting to be expanded' },
      { at: now - 74 * HOUR, zh: '07-003 与本期 001 判为不同问法，未合并', en: '07-003 and this period’s 001 judged different questions, not merged' },
      { at: now - 98 * HOUR, zh: '12 篇写入全文队列，surveyor 已取走', en: '12 papers written to the full-text queue; surveyor picked them up' },
    ],
  };
}

// ---------------------------------------------------------------- idea lab (candidates)
function makeIdeaLab() {
  const P = (id, zh, en, venue, ex, ids) => ({ id, title: b(zh, en), venue, extracted: ex, hyps: ids, selected: false });
  const lit = [
    P('l1', 'Gradient noise scale predicts critical batch size', 'Gradient noise scale predicts critical batch size', 'NeurIPS 2019', 2, ['H-02', 'H-11']),
    P('l2', 'Low-rank structure of the Hessian in deep nets', 'Low-rank structure of the Hessian in deep nets', 'ICML 2020', 2, ['H-06', 'H-14']),
    P('l3', 'Communication-efficient SGD with error feedback', 'Communication-efficient SGD with error feedback', 'ICLR 2021', 1, ['H-18']),
    P('l4', 'Early stopping via gradient signal-to-noise ratio', 'Early stopping via gradient signal-to-noise ratio', 'TMLR 2024', 1, ['H-09']),
    P('l5', 'Sharpness-aware minimization under small batches', 'Sharpness-aware minimization under small batches', 'arXiv 2026', null, []),
    P('l6', 'Second-order corrections without Hessian products', 'Second-order corrections without Hessian products', 'arXiv 2026', null, []),
  ];
  const plan = (rows) => rows.map(([hyp, mode, zh, en]) => ({ hyp, mode, claim: hyp ? null : b(zh, en) }));
  return {
    lit, cur: 0, launched: [],
    cands: [
      { id: 'P-018', spark: 'SPARK-2026-09-003', name: b('低秩共用', 'Shared low-rank'), src: 'arXiv cs.LG + 12', claim: b('用低秩 Hessian 结构同时给出小 batch 修正项与早停判据，两者共用同一噪声尺度估计，无需额外反向传播。', 'Use low-rank Hessian structure to produce both a small-batch correction and an early-stop criterion from one shared noise-scale estimate, with no extra backward pass.'),
        plan: plan([['H-01', 'reuse'], ['H-06', 'reuse'], ['H-09', 'reuse'], [null, 'new', '两个判据可共用同一次噪声估计', 'The two criteria can share a single noise estimate'], [null, 'new', '共用估计不引入额外偏差', 'The shared estimate adds no extra bias'], [null, 'new', '该组合在大 batch 下退化为原方法', 'In large batch the combination degenerates to the original method']]) },
      { id: 'P-020', spark: 'SPARK-2026-09-004', name: b('负结果早停', 'Negative-result early stop'), src: 'arXiv cs.LG + 8', claim: b('把“确认某类改动无效”当作可提前终止的结论：用同一噪声估计判定何时停止扫描，节省评测成本。', 'Treat “confirming a change is ineffective” as an early-terminable result: use the shared noise estimate to decide when to stop a sweep and save evaluation cost.'),
        plan: plan([['H-01', 'reuse'], ['H-19', 'reuse'], ['H-36', 'reuse'], [null, 'new', '无效改动的上界可在 3 个种子内确认', 'The upper bound of an ineffective change can be confirmed within 3 seeds'], [null, 'new', '提前终止不放过有效改动', 'Early termination does not miss effective changes']]) },
      { id: 'P-021', spark: 'SPARK-2026-09-005', name: b('通信—精度折中', 'Communication–accuracy trade-off'), src: 'ICLR + 5', claim: b('在低秩子空间内联合选择压缩率与同步间隔，使通信量下降的同时精度损失落在噪声范围内。', 'Jointly choose compression rate and sync interval in the low-rank subspace so that communication drops while the accuracy loss stays within the noise.'),
        plan: plan([['H-06', 'reuse'], ['H-14', 'reuse'], ['H-18', 'reuse'], ['H-27', 'reuse'], [null, 'new', '联合选择优于分别选择', 'Joint selection beats separate selection'], [null, 'new', '折中点对 seed 稳健', 'The trade-off point is robust to the seed']]) },
    ],
  };
}

// ---------------------------------------------------------------- manuscript
function makePaper(now) {
  const S = (k, zh, en, hyps, status, paras, extra = {}) => ({ k, title: b(zh, en), hyps, status, paras, stale: false, ...extra });
  return {
    idea: 'P-014', ideaTitle: b('P-014 几何修正', 'P-014 Geometric correction'),
    sections: [
      S('1', '引言 · 问题与主张', 'Introduction · problem and claim', ['H-30'], 'ok', [
        b('小 batch 训练在噪声下有效步长退化，本文提出一个几何修正项，并证明它可与梯度计算融合而不增加反向传播。', 'Small-batch training suffers a degraded effective step under noise. We propose a geometric correction term and show it fuses with the gradient computation without an extra backward pass.')]),
      S('2', '相关工作', 'Related work', ['H-01'], 'aligned', [b('已有工作把噪声尺度视为标量，并借用其作为 batch 选择依据（借用前提 4 条）。', 'Prior work treats the noise scale as a scalar and uses it to choose batch sizes (4 borrowed premises).')]),
      S('3', '方法 · 几何修正项', 'Method · geometric correction', ['H-11', 'H-12', 'H-16'], 'ok', [b('修正项可与梯度计算融合，不增加反向传播 [H-12, e_17, e_03]。', 'The correction term fuses with the gradient computation and adds no backward pass [H-12, e_17, e_03].'),
        b('该修正对任何一阶优化器都成立。', 'The correction holds for any first-order optimiser.')]),
      S('4.1', '实验设置', 'Experimental setup', ['H-16'], 'figure', [b('所有实验使用同一随机种子集合与同一 baseline。', 'All experiments use the same seed set and the same baseline.')]),
      S('4.2', '有效步长随 batch 的变化', 'Effective step versus batch size', ['H-11', 'H-02'], 'missing', [
        b('图 3(a) 给出六档 batch 下的噪声尺度测量，2048 档因显存不足未完成。拟合显示噪声尺度与 batch 大小近似满足 −0.49 次幂关系，95% 置信带覆盖 −1/2 [e_15]，与 H-11 的断言一致；该趋势在两个独立数据集上重复出现 [e_08, e_11]。',
          'Fig. 3(a) shows the noise-scale measurement at six batch sizes; the 2048 tier did not finish because of insufficient memory. The fit shows the noise scale follows roughly a −0.49 power of batch size, with a 95% band covering −1/2 [e_15], consistent with H-11; the trend repeats on two independent datasets [e_08, e_11].'),
        b('加入修正项后，有效步长在 batch ≤ 128 区间回升 18.4% [e_17]，且修正项与梯度计算可融合，不增加额外反向传播 [H-12, e_03]。', 'With the correction, the effective step recovers by 18.4% in the batch ≤ 128 range [e_17], and the correction fuses with the gradient computation, adding no extra backward pass [H-12, e_03].'),
        b('在 batch = 2048 时趋势出现拐点，我们认为这是噪声尺度估计本身在大 batch 下方差增大所致。', 'At batch = 2048 the trend shows an inflection, which we attribute to the noise-scale estimate itself having higher variance at large batch.'),
        b('该结论的适用范围取决于 H-02 的最终判定：若其被限定在低秩情形，本节结论需相应收窄。', 'The scope of this conclusion depends on the final verdict on H-02: if it is limited to the low-rank case, the conclusion here must narrow accordingly.')],
        { fig: 'fig3' }),
      S('4.3', '消融 · 去掉修正项', 'Ablation · removing the correction', ['H-12'], 'ok', [b('去掉修正项后有效步长回落到基线。', 'Removing the correction drops the effective step back to the baseline.')]),
      S('5', '讨论 · 适用边界', 'Discussion · scope of applicability', ['H-02'], 'affected', [b('本方法在小 batch 场景下普遍更优。', 'The method is generally better in small-batch settings.')]),
      S('6', '结论', 'Conclusion', [], 'todo', [b('（待写）', '(to be written)')]),
    ],
    gaps: [
      { id: 'gap1', done: false, title: b('batch = 2048 需第 2、3 个种子', 'Batch = 2048 needs seeds 2 and 3'), body: b('当前拐点结论只有单次运行支撑。补跑后本段可改为结论性表述。', 'The inflection conclusion rests on a single run. After re-running, this paragraph can be stated conclusively.'), hyp: 'H-11', label: b('batch 2048 补两个种子', 'Batch 2048, two extra seeds'), btn: b('建成 e_21 并入队', 'Create e_21 and queue it') },
      { id: 'gap2', done: false, title: b('图 4 缺 baseline 曲线', 'Figure 4 lacks the baseline curve'), body: b('H-16 的共用 baseline 重测正在跑（e_16），完成后自动生成图 4。', 'The shared-baseline re-run for H-16 is in progress (e_16); Figure 4 is generated automatically when it finishes.'), exp: 'e_16', btn: b('查看 e_16', 'Open e_16') },
    ],
    version: 1, savedAt: now,
  };
}

function makeClaims() {
  const C = (id, sec, zh, en, hyp, ev, status, extra = {}) => ({ id, sec, text: b(zh, en), hyp, ev, status, ...extra });
  return {
    collapsed: 39,
    items: [
      C('c1', '4.2', '噪声尺度与 batch 近似满足 −0.49 次幂关系', 'Noise scale follows roughly a −0.49 power of batch size', 'H-11', ['e_15', 'e_08'], 'supported'),
      C('c2', '4.2', '该趋势在两个独立数据集上重复出现', 'The trend repeats on two independent datasets', 'H-11', ['e_08', 'e_11'], 'supported'),
      C('c3', '4.2', '在 batch = 2048 时趋势出现拐点', 'At batch = 2048 the trend shows an inflection', null, [], 'insufficient', {
        why: b('只跑了 1 个种子，且该档三格全部 OOM', 'Only 1 seed was run, and all three cells at this tier hit OOM'), find: { zh: '在 batch = 2048 时趋势出现拐点，我们认为这是噪声尺度估计本身在大 batch 下方差增大所致。', en: 'At batch = 2048 the trend shows an inflection, which we attribute to the noise-scale estimate itself having higher variance at large batch.' },
        chain: [b('断言 → 没有绑定假设', 'Claim → no bound hypothesis'), b('最近的假设 H-11 · 只覆盖 32–1024', 'Nearest hypothesis H-11 · covers only 32–1024'), b('相关运行 run_2301 · OOM 未完成', 'Related run run_2301 · OOM, not finished')],
        soften: { zh: '在 batch = 2048 时我们观察到单次运行出现拐点；受显存限制该档未做重复，此处仅作为待验证的现象记录。', en: 'At batch = 2048 we observe an inflection in a single run; because of memory limits this tier was not repeated, so it is recorded here only as a phenomenon to be verified.' }, fixExp: { hyp: 'H-11', zh: 'batch 2048 补两个种子', en: 'Batch 2048, two extra seeds' } }),
      C('c4', '3.1', '修正项可与梯度计算融合，不增加反向传播', 'The correction fuses with the gradient computation, adding no backward pass', 'H-12', ['e_17', 'e_03'], 'supported'),
      C('c5', '3.1', '该修正对任何一阶优化器都成立', 'The correction holds for any first-order optimiser', 'H-12', ['e_17'], 'overclaim', {
        why: b('只在 SGD 与 Adam 上测过，"任何" 无证据', 'Only tested on SGD and Adam; “any” has no evidence'), find: { zh: '该修正对任何一阶优化器都成立。', en: 'The correction holds for any first-order optimiser.' },
        chain: [b('断言 → 绑定 H-12', 'Claim → bound to H-12'), b('证据 e_17 · 仅 SGD / Adam', 'Evidence e_17 · SGD / Adam only'), b('“任何”超出证据范围', '“any” exceeds the evidence')],
        soften: { zh: '该修正在 SGD 与 Adam 上成立。', en: 'The correction holds on SGD and Adam.' } }),
      C('c6', '4.3', '去掉修正项后有效步长回落到基线', 'Removing the correction drops the effective step back to the baseline', 'H-12', ['e_19'], 'supported'),
      C('c7', '5', '本方法在小 batch 场景下普遍更优', 'The method is generally better in small-batch settings', 'H-02', ['e_04'], 'overclaim', {
        why: b('H-02 正在裁定，且 e_04 是反例证据', 'H-02 is under verdict and e_04 is counter-evidence'), find: { zh: '本方法在小 batch 场景下普遍更优。', en: 'The method is generally better in small-batch settings.' },
        chain: [b('断言 → 绑定 H-02', 'Claim → bound to H-02'), b('H-02 状态 pending_review', 'H-02 status pending_review'), b('e_04 −0.7 为反例', 'e_04 −0.7 is a counter-example')],
        soften: { zh: '在 batch ≤ 128 的低秩情形下，本方法更优；更一般的小 batch 场景待 H-02 裁定。', en: 'In the low-rank case with batch ≤ 128 the method is better; more general small-batch settings await the verdict on H-02.' } }),
      C('c8', '4.1', '所有实验使用同一随机种子集合与同一 baseline', 'All experiments use the same seed set and the same baseline', 'H-16', ['e_16'], 'insufficient', {
        why: b('e_16 仍在跑，完成前不能这么写', 'e_16 is still running; this cannot be written before it finishes'), find: { zh: '所有实验使用同一随机种子集合与同一 baseline。', en: 'All experiments use the same seed set and the same baseline.' },
        chain: [b('断言 → 绑定 H-16', 'Claim → bound to H-16'), b('证据 e_16 · 运行中', 'Evidence e_16 · running')],
        soften: { zh: '实验使用共用 baseline；同种子重测正在进行（e_16）。', en: 'Experiments use a shared baseline; the same-seed re-run is in progress (e_16).' } }),
    ],
  };
}

function makeFigures(now) {
  const F = (n, zh, en, status, src, ver) => ({ n, title: b(zh, en), status, src, ver });
  return {
    items: [F(1, '方法示意', 'Method overview', 'done', 'draw.io · ' + 'hand-drawn', 'v2'), F(2, '噪声尺度分布', 'Noise-scale distribution', 'done', 'run_2286', 'v1'), F(3, '噪声尺度与有效步长', 'Noise scale and effective step', 'redraw', 'run_2291', 'v4'),
      F(4, 'baseline 对照', 'Baseline comparison', 'waiting', 'e_16', '—'), F(5, '消融：去掉修正项', 'Ablation: correction removed', 'waiting', 'e_19', '—'), F(6, '开销分解', 'Overhead breakdown', 'done', 'run_2297', 'v1')],
    fig3: {
      caption: b('图 3：(a) 梯度噪声尺度随 batch 满足 B^-0.50（3 个种子均值，阴影为 95% 置信带）；(b) 加入修正项前后的有效步长，小 batch 区间平均提升 17.6%。2048 档因显存不足未跑。', 'Figure 3: (a) Gradient noise scale follows B^-0.50 (mean of 3 seeds, shaded area is the 95% band); (b) effective step with and without the correction, +17.6% on average in the small-batch range. The 2048 tier was not run for lack of memory.'),
      captionEdited: false, measured: 17.6, ver: 4, yZero: false, bandTo: 2048, sameAxis: false,
      versions: [{ v: 'v4', at: now - 2 * HOUR, zh: '改成双栏 (a)(b)，加 95% 置信带与基线对比', en: 'Two-panel (a)(b), add 95% band and baseline comparison' }, { v: 'v2', at: now - 76 * HOUR, zh: '误差棒改成三种子极差', en: 'Error bars now show the 3-seed range' }, { v: 'v1', at: now - 119 * HOUR, zh: '首版，只有 4 档', en: 'First version, only 4 tiers' }],
      reviews: [
        { id: 'r1', st: 'open', zh: '(b) 的 y 轴从 0.26 起', en: '(b) y-axis starts at 0.26', bzh: '截断把两条曲线的差距放大了，建议从 0 起，或在图注里写明截断', ben: 'The truncation exaggerates the gap between the two curves; start at 0 or state the truncation in the caption', fix: 'yZero' },
        { id: 'r2', st: 'open', zh: '(a) 的置信带外推到了 2048', en: '(a) confidence band is extrapolated to 2048', bzh: '那一档没有数据，建议把置信带截止到 1024，避免读成有测量', ben: 'That tier has no data; cut the band at 1024 so it is not read as measured', fix: 'bandTo' },
        { id: 'r3', st: 'open', zh: '两栏横轴范围不同', en: 'The two panels have different x ranges', bzh: '(a) 到 2048、(b) 到 1024，并排看容易误以为是同一区间', ben: '(a) goes to 2048 and (b) to 1024; side by side they look like the same range', fix: 'sameAxis' },
      ],
    },
  };
}

function makeRebuttal() {
  const R = (id, rv, kind, zh, en, fzh, fen, status, extra = {}) => ({ id, rv, kind, text: b(zh, en), fix: b(fzh, fen), status, ...extra });
  return {
    reviewers: [
      { id: 'A', model: 'claude', score: 6, conf: 4, note: b('方法清楚，但大 batch 那段结论超出数据范围', 'The method is clear, but the large-batch conclusion goes beyond the data') },
      { id: 'B', model: 'gpt', score: 5, conf: 3, note: b('缺与两条近期基线的直接对比，创新性难判断', 'No direct comparison with two recent baselines; novelty is hard to judge') },
      { id: 'C', model: 'deepseek', score: 7, conf: 4, note: b('消融充分；希望给出开销的真实测量而非估计', 'Ablation is thorough; please give measured overhead, not an estimate') },
    ],
    prevMean: 5.0, collapsed: 8,
    comments: [
      R('B1', 'B', 'exp', '实验不足', 'Insufficient experiments', '缺与 Chen 2025 / Park 2026 两条基线的直接对比，无法判断提升幅度。', 'No direct comparison with the Chen 2025 / Park 2026 baselines, so the size of the gain cannot be judged.', '补 e_22：同 setting 下跑两条基线', 'Add e_22: run both baselines under the same setting', 'pending', { exp: 'e_22' }),
      R('A1', 'A', 'scope', '超出范围', 'Out of scope', '4.2 节第 3 段用单次运行下结论，2048 档未重复。', 'Section 4.2 paragraph 3 draws a conclusion from a single run; the 2048 tier is not repeated.', '已改成推测语气并标注单次运行', 'Rewritten as a tentative statement and marked as a single run', 'done'),
      R('C1', 'C', 'measure', '测量口径', 'Measurement basis', '开销 3% 是估计值还是实测？', 'Is the 3% overhead an estimate or a measurement?', '补 e_23：用 profiler 实测三种 batch 下的开销', 'Add e_23: measure overhead with a profiler at three batch sizes', 'pending', { exp: 'e_23' }),
      R('B2', 'B', 'related', '相关工作', 'Related work', '漏了工具链投毒方向的两篇近期工作。', 'Two recent works on tool-chain poisoning are missing.', '从文献库直接引 2 篇，已插入 2 节', 'Cited 2 papers straight from the library; inserted in Section 2', 'done'),
      R('A2', 'A', 'repro', '复现', 'Reproducibility', '没说随机种子与环境版本。', 'Random seeds and environment versions are not stated.', '附录 A 加环境表，种子写进表 2', 'Environment table added to Appendix A; seeds written into Table 2', 'done'),
      R('C2', 'C', 'wording', '表述', 'Wording', '"任何一阶优化器" 与实验范围不符。', '“any first-order optimiser” does not match the experiments’ scope.', '改为 "在 SGD 与 Adam 上"', 'Changed to “on SGD and Adam”', 'done'),
    ],
    repro: { code: 0.92, run: 0.85, match: 0.61, runs: 1, at: null },
    checklist: [
      { id: 'k1', done: true, zh: '正文 8 页内，附录另页', en: 'Main text within 8 pages, appendix separate' },
      { id: 'k2', done: true, zh: '参考文献格式统一', en: 'Reference format is consistent' },
      { id: 'k3', done: true, zh: '所有实验附随机种子与环境版本', en: 'Every experiment lists seeds and environment versions' },
      { id: 'k4', done: false, auto: 'fig4', zh: '图 4 已生成（等 e_16 跑完）', en: 'Figure 4 is generated (waits for e_16)' },
      { id: 'k5', done: false, auto: 'anon', zh: '匿名化：作者、单位、致谢、自引均已处理', en: 'Anonymised: authors, affiliations, acknowledgements, self-citations handled' },
      { id: 'k6', done: true, zh: '无「过度声称」（主张对照已通过）', en: 'No overclaims (claim-evidence check passed)', auto: 'claims' },
    ],
    packed: null,
  };
}

// ---------------------------------------------------------------- blank workspace
// The same shape as makeWorkspace with nothing in it. A real project fills the
// parts it actually has; every screen must render an empty section without
// crashing, so all containers exist from the start.
export function blankWorkspace(now = Date.now()) {
  return {
    v: 1, createdAt: now, updatedAt: now, lastTick: now,
    seq: { exp: 1, run: 1, hyp: 1, node: 1, spark: 1, idea: 1, event: 0, cand: 0 },
    settings: { parallel: 3, budget: 120, gpuUsed: 0, gpus: 4 },
    agents: { surveyor: 'deepseek', executor: 'codex', reviewer: 'claude' },
    ideas: [], hyps: {}, trees: {}, crossDeps: [], candidateNote: {},
    experiments: {}, exptree: {}, runs: [], failures: [], spendByIdea: {}, failBurn: 0,
    sweep: null, verdicts: {}, verdictHistory: [], events: [], lastHuman: now,
    survey: {
      lastRun: now, nextInDays: 7, job: null, records: 0, fulltext: 0, fulltextCap: 0, library: 0,
      whitelist: 0, thisRound: 0, skipped: 0, venues: [], others: 0, parked: 0, enumerated: 0, passedTopics: 0,
      funnel: { l1: 0, l2: 0, l3: 0 }, stock: [0, 0, 0], state: {}, notes: b('', ''), candidates: [], topics: [],
    },
    trends: null, papers: {}, sparks: { quota: [5, 8], drafted: 0, dropped: 0, history: 0, carried: 0, items: [], actions: [] },
    trendGaps: {}, ideaLab: { lit: [], cur: 0, cands: [], launched: [] },
    paper: { idea: null, ideaTitle: b('', ''), sections: [], gaps: [], version: 1, savedAt: now },
    claims: { collapsed: 0, items: [] },
    figures: { items: [], fig3: { caption: b('', ''), captionEdited: false, measured: 0, ver: 1, yZero: true, bandTo: 0, sameAxis: true, versions: [], reviews: [] } },
    rebuttal: { reviewers: [], prevMean: 0, collapsed: 0, comments: [], repro: { code: 0, run: 0, match: 0, runs: 0, at: null }, checklist: [], packed: null },
    exports: { claimsGate: null }, decisions: {}, snoozed: {},
  };
}
