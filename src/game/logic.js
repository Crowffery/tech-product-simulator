/**
 * 主循环逻辑（v0.9）
 * 企划 → 设计 → 供应链 → 研发（月度 + 事件）→ 量产 → 发布会 → 销售 → 规划下一代
 * 玩家只管大方向：部门升级代替逐个招人；研发点解锁概念件。
 */
import { SLOTS, POSITIONING, PRICE_BANDS, SUPPLIERS, STOCK_OPTS, EVENTS, DEPTS, MARKET_EVENTS, AFTERMATH_EVENTS, EXPANSIONS, RIVAL_SHARE } from './data.js';
import { emptySlots } from './state.js';
import { IDEAL, matchOf, promiseCheck, priceFit, windowAt, clashAt, expectationBar, RUN_MONTHS, POS_BASE_PRICE, roundPrice, marketSize, marketChipGen, rivalPriceList, bandOf, rivalLaunches } from './market.js';
import {
  defaultDesign,
  slotCaps,
  physical,
  novelty,
  completeness,
  wowGrade,
  RECOMMENDED,
  CONCEPTS,
  conceptName,
  buzzOf,
  unlockStatus,
  chipBench,
  chipName,
  similarity,
} from '../studio/parts.js';

// ═════════════════════════ 账本 ═════════════════════════

/** 所有现金变动都记账：label 为分类（财报按它汇总） */
export function book(state, label, v, note = '') {
  const n = Math.round(v);
  if (!n) return;
  state.cash += n;
  state.ledger ||= [];
  state.ledger.push({ m: state.month, gen: state.generation, label, v: n, note });
  if (state.ledger.length > 160) state.ledger = state.ledger.slice(-160);
}

/** 某一代的分类汇总 */
export function ledgerOf(state, gen = state.generation) {
  const sums = {};
  for (const e of state.ledger || []) if (e.gen === gen) sums[e.label] = (sums[e.label] || 0) + e.v;
  return Object.entries(sums).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
}

// ═════════════════════════ 规模效应 / 战略投资 / 市场份额 ═════════════════════════

/** 规模效应：卖得越多，采购越便宜（最多 -15%） */
export function scaleDiscount(state) {
  return Math.min(0.15, 0.03 * Math.log2(1 + (state.cumSold || 0) / 20));
}

export const hasAsset = (state, id) => (state.assets || []).includes(id);
export function assetMul(state, key) {
  return EXPANSIONS.filter((e) => hasAsset(state, e.id) && e[key]).reduce((a, e) => a * e[key], 1);
}

export function buyExpansion(state, id) {
  const e = EXPANSIONS.find((x) => x.id === id);
  if (!e || hasAsset(state, id)) return { ok: false, msg: '已经有了' };
  if (e.need && !e.need(state)) return { ok: false, msg: `条件不够：${e.needText}` };
  if (state.cash < e.cost) return { ok: false, msg: '现金不够' };
  book(state, '战略投资', -e.cost, e.name);
  state.assets = [...(state.assets || []), id];
  if (e.faith) state.faith = Math.min(100, state.faith + e.faith);
  return { ok: true, msg: `${e.icon} ${e.name}：完成！` };
}

/** 每月固定支出：工资 + 运营费 */
export function monthlyCost(state) {
  return payroll(state) + upkeep(state);
}

/** 战略资产的每月运营费 */
function upkeep(state) {
  return EXPANSIONS.filter((e) => hasAsset(state, e.id)).reduce((a, e) => a + e.upkeep, 0);
}

/** 记录这个月的出货，算市场份额（你 vs 四家竞品） */
export function recordShare(state, myUnits) {
  const m = state.month;
  const rivals = RIVAL_SHARE.map((r) => ({
    brand: r.brand,
    color: r.color,
    v: Math.round(r.base * Math.pow(1 + r.grow, m) * (0.9 + 0.2 * Math.abs(Math.sin(m * 1.7 + r.base)))),
  }));
  state.shareHist = [...(state.shareHist || []), { m, me: Math.round(myUnits * 10) / 10, rivals }].slice(-40);
}

/** 最近三个月的市场份额排名 */
export function shareTable(state, upto = (state.shareHist || []).length) {
  const hist = (state.shareHist || []).slice(Math.max(0, upto - 3), upto);
  if (!hist.length) return null;
  const sum = { 你: 0 };
  for (const h of hist) {
    sum['你'] += h.me;
    for (const r of h.rivals) sum[r.brand] = (sum[r.brand] || 0) + r.v;
  }
  const total = Object.values(sum).reduce((a, b) => a + b, 0) || 1;
  const rows = Object.entries(sum)
    .map(([k, v]) => ({ name: k, v, pct: (v / total) * 100, me: k === '你', color: k === '你' ? '#e67e22' : RIVAL_SHARE.find((r) => r.brand === k)?.color }))
    .sort((a, b) => b.v - a.v);
  return { rows, rank: rows.findIndex((r) => r.me) + 1, pct: rows.find((r) => r.me).pct };
}

// ═════════════════════════ 部门 ═════════════════════════

export const deptLevel = (state, id) => state.depts?.[id] ?? 1;

export function deptUpgradeCost(state, id) {
  const lv = deptLevel(state, id);
  if (lv >= 3) return null;
  return DEPTS.find((d) => d.id === id).costs[lv - 1];
}

export function upgradeDept(state, id) {
  const cost = deptUpgradeCost(state, id);
  if (cost == null) return { ok: false, msg: '已经满级' };
  if (state.cash < cost) return { ok: false, msg: '现金不够' };
  state.depts[id] += 1;
  book(state, '部门升级', -cost, DEPTS.find((x) => x.id === id).name);
  const d = DEPTS.find((x) => x.id === id);
  return { ok: true, msg: `${d.name}升到 Lv${state.depts[id]}` };
}

// ═════════════════════════ 办公室扩建 ═════════════════════════

export const OFFICES = [
  { lv: 1, name: '车库', icon: '🏚', cost: 0, mp: 0, pay: 0, launch: 0, rp: 0, desc: '一切从这里开始' },
  { lv: 2, name: '小办公室', icon: '🏢', cost: 250, mp: 1, pay: 3, launch: 0, rp: 0, desc: '人力 +1 · 有了会议室' },
  { lv: 3, name: '写字楼', icon: '🏙', cost: 600, mp: 2, pay: 8, launch: 4, rp: 1, desc: '人力 +2 · 发布会 +4 · 研发点 +1' },
  { lv: 4, name: '科技园', icon: '🌳', cost: 1200, mp: 3, pay: 12, launch: 7, rp: 2, desc: '人力 +3 · 发布会 +7 · 研发点 +2' },
];
export const office = (state) => OFFICES[(state.office || 1) - 1];
export function nextOffice(state) {
  return OFFICES[state.office || 1] || null;
}
export function upgradeOffice(state) {
  const n = nextOffice(state);
  if (!n) return { ok: false, msg: '已经是科技园了' };
  if (state.cash < n.cost) return { ok: false, msg: '现金不够' };
  book(state, '办公室扩建', -n.cost, n.name);
  state.office = n.lv;
  return { ok: true, msg: `🎉 搬进${n.name}！` };
}

export function manpowerCap(state) {
  return 4 + deptLevel(state, 'rnd') * 2 + office(state).mp;
}

export function maxConcepts(state) {
  return deptLevel(state, 'design');
}

function slotBoost(state, slotId) {
  if (slotId === 'design') return 1 + 0.15 * (deptLevel(state, 'design') - 1);
  return 1 + 0.08 * (deptLevel(state, 'rnd') - 1);
}

function payroll(state) {
  // 研发团队月薪（单位 ¥100 万）
  return 6 + Object.values(state.depts).reduce((a, b) => a + b, 0) * 3 + office(state).pay;
}

export function prLaunchBonus(state) {
  return [3, 7, 11][deptLevel(state, 'pr') - 1] + office(state).launch;
}

// ═════════════════════════ 自研芯片 ═════════════════════════

export function chipResearchCost(state) {
  const gen = state.chip.gen;
  const lab = hasAsset(state, 'chiplab');
  return { cash: Math.round((100 + gen * 40) * (lab ? 0.65 : 1)), months: (deptLevel(state, 'rnd') >= 3 ? 2 : 3) - (lab ? 1 : 0), next: gen + 1 };
}

export function startChipResearch(state) {
  if (state.chip.research) return { ok: false, msg: '已经在流片了' };
  const c = chipResearchCost(state);
  if (state.cash < c.cash) return { ok: false, msg: '现金不够' };
  book(state, '芯片流片', -c.cash, `X${c.next}`);
  state.chip.research = { gen: c.next, months: c.months, total: c.months };
  return { ok: true, msg: `🧪 ${chipName(state.chip.series, c.next, 1).replace(/ Pro$/, '')} 开始流片（${c.months} 个月）` };
}

/** 研发期间每月推进芯片流片 */
function tickChip(state) {
  const r = state.chip?.research;
  if (!r) return null;
  r.months -= 1;
  if (r.months > 0) return null;
  const prev = chipBench(state.chip.gen, 1);
  state.chip.gen = r.gen;
  state.chip.research = null;
  const bench = chipBench(r.gen, 1);
  state.chip.history.push({ gen: r.gen, bench, month: state.month });
  return { gen: r.gen, name: chipName(state.chip.series, r.gen, 1).replace(/ Pro$/, ''), up: Math.round((bench / prev - 1) * 100) };
}

export function renameChip(state, name) {
  const n = String(name || '').trim().slice(0, 4);
  if (n) state.chip.series = n;
  if (state.designDraft) state.designDraft.chipSeries = state.chip.series;
}

// ═════════════════════════ 企划 ═════════════════════════

export function recommendedPlan() {
  return { positioningId: 'mainstream', pointIds: ['fast', 'thin'], priceId: 'mid', bindEco: false };
}

export function trianglePreview(positioningId, priceId) {
  const pos = POSITIONING.find((p) => p.id === positioningId) || POSITIONING[1];
  const price = PRICE_BANDS.find((p) => p.id === priceId) || PRICE_BANDS[1];
  return {
    experience: Math.round(50 * pos.exp),
    costPressure: Math.round(40 * pos.cost * (price.price / 3999)),
    months: pos.months,
  };
}

export function finishPlan(state, { positioningId, pointIds, priceId, bindEco }) {
  if (state.pendingMarket) return { ok: false, msg: '先处理行业大事' };
  const pos = POSITIONING.find((p) => p.id === positioningId);
  const price = PRICE_BANDS.find((p) => p.id === priceId);
  if (!pos || !price || pointIds.length < 1 || pointIds.length > 3) return { ok: false, msg: '请选择定位、1～3 个卖点、售价带' };
  state.product = {
    name: `${state.companyName} Phone ${state.generation}`,
    positioningId,
    pointIds: [...pointIds],
    priceId,
    bandId: priceId,
    price: null,
    bindEco: !!bindEco && state.generation > 1,
    expMul: pos.exp,
    baseMonths: pos.months,
  };
  state.monthsLeft = pos.months;
  state.slots = emptySlots();
  if (!state.designDraft) {
    const d = defaultDesign();
    d.parts = { ...RECOMMENDED[positioningId] };
    d.modelName = `${state.companyName.slice(0, 4)} ${state.generation}`.slice(0, 8);
    state.designDraft = d;
  }
  state.designDraft.position = positioningId;
  state.designDraft.chipGen = state.chip.gen;
  state.designDraft.chipSeries = state.chip.series;
  state.designDraft.chipSrc = 'own';
  state.designDraft.company = state.companyName.slice(0, 10);
  state.phase = 'design';
  return { ok: true };
}

// ═════════════════════════ 设计 ═════════════════════════

export function confirmDesign(state, design) {
  state.design = design;
  state.designDraft = design;
  state.product.name = design.modelName || state.product.name;
  if (design.redesign === 'major' && state.models.length) {
    book(state, '模具开发', -80, '大改款');
    state.monthsLeft += 1;
    state.eventLog.push('大改款：模具费 ¥8,000 万，工期 +1 月');
  }
  state.phase = 'supply';
  return { ok: true };
}

export function unlockConcept(state, id) {
  const st = unlockStatus(id, state);
  if (st.unlocked) return { ok: false, msg: '已经解锁' };
  if (!st.prereqOk) return { ok: false, msg: st.prereqText };
  if (state.rp < st.cost) return { ok: false, msg: `研发点不够（需要 ${st.cost}）` };
  state.rp -= st.cost;
  state.unlocked.push(id);
  return { ok: true, msg: `已解锁「${conceptName(id)}」，可以装备了` };
}

// ═════════════════════════ 供应链 ═════════════════════════

/** 外购芯片的厂商名 */
export const EXT_CHIP = '联芯';

export function pickLogistics(state, supplierId, stockId = 'normal', chipSrc = 'own') {
  if (!SUPPLIERS.some((s) => s.id === supplierId) || !STOCK_OPTS.some((s) => s.id === stockId)) return { ok: false };
  state.supplierId = supplierId;
  state.stockId = stockId;
  if (chipSrc === 'ext' && marketMod(state, 'extBan')) chipSrc = 'own';
  if (state.design) {
    state.design.chipSrc = chipSrc;
    state.design.chipGen = chipSrc === 'ext' ? marketChipGen(state.month) : state.chip.gen;
    state.design.chipSeries = chipSrc === 'ext' ? EXT_CHIP : state.chip.series;
  }
  state.phase = 'dev';
  return { ok: true };
}

// ═════════════════════════ 研发 ═════════════════════════

export function capsMap(state) {
  if (!state.design) return { perf: 100, design: 100, camera: 100, battery: 100, os: 100 };
  return Object.fromEntries(slotCaps(state.design).map((c) => [c.id, c.cap]));
}

export function devRatio(state) {
  const caps = capsMap(state);
  const vals = SLOTS.map((s) => Math.min(1, state.slots[s.id].progress / Math.max(1, caps[s.id])));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function avgSlotProgress(state) {
  return SLOTS.reduce((a, s) => a + state.slots[s.id].progress, 0) / SLOTS.length;
}

/** 按上限比例分配：离上限越远的槽分得越多 */
export function balancedAllocation(state, focus = []) {
  const cap = manpowerCap(state);
  const caps = capsMap(state);
  const pos = state.product?.positioningId;
  // 团队直觉：半程贴近定位的理想配比；记下企划笔记后完全贴近
  const ideal = pos ? IDEAL[pos] : null;
  const k = pos && state.notes?.[pos] ? 1 : 0.5;
  const need = SLOTS.map((s) => ({
    id: s.id,
    gap: Math.max(0, caps[s.id] - state.slots[s.id].progress) * (focus.includes(s.id) ? 2.5 : 1) * (ideal ? 1 + (ideal[s.id] / 20 - 1) * k : 1),
  }));
  const total = need.reduce((a, b) => a + b.gap, 0) || 1;
  const alloc = Object.fromEntries(need.map((n) => [n.id, Math.floor((n.gap / total) * cap)]));
  let rem = cap - Object.values(alloc).reduce((a, b) => a + b, 0);
  need.sort((a, b) => b.gap - a.gap);
  for (let i = 0; rem > 0; i++, rem--) alloc[need[i % need.length].id] += 1;
  return alloc;
}

const COMMENTS = {
  perf: ['晶体管在加班', '发热还行', '更流畅了', '跑分党会点头', '性能位面展开'],
  design: ['直角爱好者吵起来了', '手感过关', '外形有点信仰', '灯厂预备役', '拿出去不丢人'],
  camera: ['白天能看', '夜景还在修炼', '样张能发朋友圈了', '影像叙事成型', '媒体专场有了'],
  battery: ['午后掉电警告', '能撑一天', '半夜不用趴着充电', '续航稳了', '省电圣体'],
  os: ['卡顿偶发', '动画顺了', '软硬一体有那么点意思', '生态钩子挂上', '系统味对了'],
};

export function commentFor(slotId, progress) {
  const arr = COMMENTS[slotId];
  return arr[Math.min(arr.length - 1, Math.floor(progress / 20))];
}

/** 推进一个月；返回本月各槽的增量（给场景做火花） */
export function advanceMonth(state, allocation) {
  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  if (total > manpowerCap(state)) return { ok: false, msg: `本月人力最多 ${manpowerCap(state)} 点` };
  const pay = payroll(state);
  book(state, '团队工资', -pay);
  const up = upkeep(state);
  if (up) book(state, '海外与门店运营', -up);
  state.monthDelta = -pay - up;
  const caps = capsMap(state);
  const gains = {};
  for (const [slotId, pts] of Object.entries(allocation)) {
    if (!pts) continue;
    const slot = state.slots[slotId];
    const before = slot.progress;
    slot.progress = Math.min(caps[slotId], slot.progress + Math.round(pts * 14 * slotBoost(state, slotId)));
    slot.comment = commentFor(slotId, slot.progress);
    gains[slotId] = slot.progress - before;
  }
  const tail = sellTail(state);
  const chipDone = tickChip(state);
  state.monthsLeft = Math.max(0, state.monthsLeft - 1);
  state.month += 1;

  const sup = SUPPLIERS.find((s) => s.id === state.supplierId) || SUPPLIERS[1];
  // 第一代是新手期：事故减半
  const chance = sup.eventChance * [1, 0.8, 0.6][deptLevel(state, 'supply') - 1] * (state.generation === 1 ? 0.5 : 1);
  if (Math.random() < chance) {
    const pool = EVENTS.filter((e) => e.id !== state.lastEventId && (!e.when || e.when(state)));
    const ev = pool[Math.floor(Math.random() * pool.length)];
    state.pendingEvent = ev.id;
    state.phase = 'event';
    return { ok: true, event: true, gains, tail, chipDone };
  }
  return { ...afterDevCheck(state), gains, tail, chipDone };
}

// ═════════════════════════ 产品生命周期 ═════════════════════════

/**
 * 每台在售机型都有自己的生命周期：
 *   爬坡（口碑好会越卖越多）→ 热销 → 成熟 → 衰退 → 退市（约 12 个月）
 * 每月销量 = 市场热度 × 生命周期曲线 × 口碑 × 竞品冲击 × 降价刺激，再加上排队补货，受产能限制。
 */
export const LIFE_MONTHS = 12;

export function lifeStage(m) {
  const a = m.age;
  if (a <= 1) return { id: 'ramp', name: '首发爬坡', cls: 'ramp' };
  if (a <= 3) return { id: 'hot', name: m.wom > 0.03 ? '口碑热销' : '热销期', cls: 'hot' };
  if (a <= 6) return { id: 'mature', name: '成熟期', cls: 'mature' };
  if (a < LIFE_MONTHS - 1) return { id: 'decline', name: '衰退期', cls: 'decline' };
  return { id: 'eol', name: '即将退市', cls: 'eol' };
}

/** 这个月的自然需求（万台） */
function naturalDemand(m) {
  const a = m.age;
  const curve = (0.6 + m.wom * Math.min(a, 3)) * Math.pow(0.8, Math.max(0, a - 1));
  return Math.max(0, m.d0 * curve * m.comp * m.boost);
}

/** 每月结算一次在售机型 */
export function sellTail(state) {
  let units = 0;
  let income = 0;
  let restock = 0;
  const lines = [];
  const rivals = rivalLaunches(state.month, state.month);
  for (const m of state.onSale || []) {
    m.age = (m.age || 0) + 1;
    const hit = rivals.find((r) => r.pos === m.pos);
    if (hit) {
      m.comp *= 0.85;
      m.hits = [...(m.hits || []), hit.brand];
    }
    const nat = naturalDemand(m);
    const want = nat + (m.backlog || 0);
    const u = Math.min(want, m.cap);
    const fromBacklog = Math.max(0, u - nat);
    m.backlog = Math.max(0, (m.backlog || 0) - fromBacklog) * 0.85; // 等太久的人会走
    const inc = u * m.unitMargin;
    units += u;
    restock += fromBacklog;
    income += inc;
    m.total = (m.total || 0) + u;
    m.profit = (m.profit || 0) + inc;
    m.history = [...(m.history || []), Math.round(u * 10) / 10].slice(-LIFE_MONTHS);
    m.months = LIFE_MONTHS - m.age;
    lines.push({ name: m.name, units: Math.round(u * 10) / 10, stage: lifeStage(m).name, hit: hit?.brand });
    const rec = (state.models || []).find((x) => x.gen === m.gen);
    if (rec) {
      rec.lifeSold = Math.round((rec.sold || 0) + m.total);
      rec.lifeProfit = Math.round((m.firstProfit || 0) + m.profit);
    }
  }
  const retired = (state.onSale || []).filter((m) => m.age >= LIFE_MONTHS || (naturalDemand({ ...m, age: m.age + 1 }) < 0.3 && (m.backlog || 0) < 0.3));
  state.onSale = (state.onSale || []).filter((m) => !retired.includes(m));
  income = Math.round(income);
  if (income) book(state, restock > 0.5 ? '在售机型（含补货）' : '在售机型', income);
  state.tailTotal = (state.tailTotal || 0) + income;
  state.cumSold = (state.cumSold || 0) + units;
  recordShare(state, units);
  return { units: Math.round(units), income, restock: Math.round(restock), lines, retired: retired.map((m) => m.name) };
}

/** 生命周期剩余价值预估（给清仓 / 以旧换新做参考） */
export function tailValue(state) {
  let v = 0;
  for (const m0 of state.onSale || []) {
    const m = { ...m0 };
    let backlog = m.backlog || 0;
    for (let a = (m.age || 0) + 1; a <= LIFE_MONTHS; a++) {
      m.age = a;
      const nat = naturalDemand(m);
      const u = Math.min(nat + backlog, m.cap);
      backlog = Math.max(0, backlog - Math.max(0, u - nat)) * 0.85;
      v += u * m.unitMargin;
    }
  }
  return Math.round(v);
}

/** 预测一条生命周期曲线（首月之后每个月的销量），给战报画图 */
export function lifeForecast(m0) {
  const m = { ...m0 };
  let backlog = m.backlog || 0;
  const out = [];
  for (let a = (m.age || 0) + 1; a <= LIFE_MONTHS; a++) {
    m.age = a;
    const nat = naturalDemand(m);
    const u = Math.min(nat + backlog, m.cap);
    backlog = Math.max(0, backlog - Math.max(0, u - nat)) * 0.85;
    out.push(Math.round(u * 10) / 10);
  }
  return out;
}

/** 降价促销：每台少赚，但销量回春；首发 3 个月内降价会让早买的人觉得被背刺 */
export function cutPrice(state, idx) {
  const m = (state.onSale || [])[idx];
  if (!m) return { ok: false, msg: '这款已经退市了' };
  if ((m.cuts || 0) >= 3) return { ok: false, msg: '已经降过三次了，再降就是清仓' };
  const newPrice = roundPrice(m.price * 0.9);
  m.price = newPrice;
  m.unitMargin = (newPrice - m.unitCost - Math.round(newPrice * 0.15)) / 100;
  m.boost *= 1.35;
  m.cuts = (m.cuts || 0) + 1;
  let msg = `${m.name} 降到 ¥${newPrice}，销量会回升`;
  if (m.age < 3) {
    state.faith = Math.max(0, state.faith - 4);
    state.reputation = Math.max(0, state.reputation - 2);
    msg += '；首发用户觉得被背刺了（信仰 -4）';
  }
  return { ok: true, msg };
}

export const OLD_POLICIES = [
  { id: 'keep', name: '继续卖', desc: '同定位旧款销量砍半，其他 ×0.85' },
  { id: 'clear', name: '降价清仓', desc: '一次性回款约 5 成，口碑 -1' },
  { id: 'tradein', name: '以旧换新', desc: '补贴 ¥4,000 万，信仰 +3，新品首月 +12%' },
];

export function recommendedEventChoice(eventId) {
  const ev = EVENTS.find((e) => e.id === eventId);
  if (!ev) return 0;
  let best = 0;
  let score = -999;
  ev.choices.forEach((c, i) => {
    const e = c.effect;
    let s = 0;
    if (e.gambleFail) s -= 5;
    if (e.months) s -= e.months;
    if (e.cash) s += e.cash / 80;
    if (e.slotPenalty) s -= Object.values(e.slotPenalty).reduce((a, b) => a + b, 0) / 5;
    if (e.hype) s += e.hype / 10;
    if (s > score) {
      score = s;
      best = i;
    }
  });
  return best;
}

export function resolveEvent(state, choiceIndex) {
  const ev = EVENTS.find((e) => e.id === state.pendingEvent);
  if (!ev) {
    state.phase = 'dev';
    return afterDevCheck(state);
  }
  const choice = ev.choices[choiceIndex];
  const eff = choice.effect;
  if (eff.cash) book(state, '突发事件', eff.cash, ev.type);
  if (eff.months) state.monthsLeft += eff.months;
  if (eff.hype) state.hype += eff.hype;
  if (eff.faith) state.faith += eff.faith;
  for (const [k, v] of Object.entries(eff.slotPenalty || {})) {
    if (state.slots[k]) {
      state.slots[k].progress = Math.max(0, Math.min(capsMap(state)[k] ?? 100, state.slots[k].progress - v));
      state.slots[k].comment = commentFor(k, state.slots[k].progress);
    }
  }
  if (eff.gambleFail && Math.random() < (state.generation === 1 ? 0.25 : 0.45)) {
    state.monthsLeft += 1;
    state.eventLog.push(`${ev.type}：赌输了，又拖一个月`);
  } else {
    state.eventLog.push(`${ev.type}：${choice.label}`);
  }
  state.lastEventId = ev.id;
  state.pendingEvent = null;
  state.phase = 'dev';
  return afterDevCheck(state);
}

/**
 * 现金为负：第一次有天使投资人兜底，第二次才真的倒闭
 * back = 救助后回到哪个阶段
 */
export const RESCUE_CASH = 300;
function goBroke(state, reason, back) {
  if (!state.rescued) {
    const amount = RESCUE_CASH - state.cash;
    state.rescued = true;
    book(state, '天使投资', amount);
    state.rescue = { reason, back, amount };
    state.phase = 'rescue';
    return { ok: true, rescue: true };
  }
  state.phase = 'bust';
  state.bustReason = reason;
  return { ok: true, bust: true };
}

export function leaveRescue(state) {
  const back = state.rescue?.back || 'dev';
  state.rescue = null;
  state.phase = back;
  if (back === 'dev') return afterDevCheck(state);
  return { ok: true };
}

export function afterDevCheck(state) {
  if (state.cash < 0) return goBroke(state, '研发期间账上的钱烧光了：工资、事故和扩张一起压了上来。', 'dev');
  const r = devRatio(state);
  if (state.monthsLeft <= 0 || r >= 0.97) {
    state.phase = 'factory';
    return { ok: true, toFactory: true };
  }
  state.phase = 'dev';
  return { ok: true };
}

/** 提前量产：完成度 ≥60% 时可以抢档期，代价是完成度 */
export function canEarlyLaunch(state) {
  return state.phase === 'dev' && devRatio(state) >= 0.6;
}
export function earlyLaunch(state) {
  if (!canEarlyLaunch(state)) return { ok: false };
  state.eventLog.push(`提前量产：还剩 ${state.monthsLeft} 月工期`);
  state.phase = 'factory';
  return { ok: true };
}

// ═════════════════════════ 量产 / 发布会 ═════════════════════════

export function toLaunch(state) {
  state.phase = 'launch';
}

export const LAUNCH_STYLES = [
  { id: 'safe', label: '稳妥发布', desc: '少翻车，分数中上', score: 22, risk: 0.08 },
  { id: 'wow', label: '惊喜彩蛋', desc: '高打满也易翻车', score: 34, risk: 0.32 },
  { id: 'specs', label: '参数轰炸', desc: '务实党点头', score: 26, risk: 0.12 },
];

export function resolveLaunchStyle(state, styleId) {
  const style = LAUNCH_STYLES.find((s) => s.id === styleId) || LAUNCH_STYLES[0];
  let score = prLaunchBonus(state) + style.score;
  state.launchFlop = false;
  if (Math.random() < style.risk) {
    score -= 14;
    state.launchFlop = true;
    state.eventLog.push(`发布会：${style.label} 翻车了一下`);
  } else {
    state.eventLog.push(`发布会：${style.label}`);
  }
  state.launchScore = score;
  finalizeScores(state);
  state.phase = 'score';
  return { ok: true };
}

export function experienceScore(state) {
  const sup = SUPPLIERS.find((s) => s.id === state.supplierId) || SUPPLIERS[1];
  const m = matchOf(state.slots, state.product.positioningId);
  // 用户按定位的期待来打分：旗舰要求高，入门机要求低
  const posExp = POSITIONING.find((p) => p.id === state.product.positioningId)?.exp || 1;
  let score = (avgSlotProgress(state) / posExp) * sup.quality * m.mult;
  if (state.product.bindEco) score += 4;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** 惊艳度：完成度 = 研发完成度 + 工艺成熟度修正 */
export function wowNow(state) {
  const d = state.design;
  if (!d) return null;
  const n = novelty(d, state.models);
  const c = completeness(d, state.models);
  const penalty = c.items.reduce((a, b) => a + b.v, 0);
  const comp = Math.max(30, Math.min(100, Math.round(devRatio(state) * 100 + penalty)));
  const score = Math.round((Math.min(100, n.score * 1.3) * comp) / 100);
  const buzz = Math.round(buzzOf(d, state.models) * [1, 1.2, 1.4][deptLevel(state, 'pr') - 1]);
  let headline;
  const st = staleness(state);
  if (st >= 0.85) headline = '「找不同」——这和上一代有什么区别？';
  else if (buzz >= 40 && comp < 65) headline = '「做工翻车，但全网都在讨论」';
  else if (n.score >= 55 && comp >= 85) headline = Math.random() < 0.5 ? `「Only ${state.companyName} can do」——外媒罕见点赞` : '「这才叫创新！」——科技媒体集体起立';
  else if (chipLag(state) < 0 && comp >= 80) headline = '「遥遥领先」——自研芯片让友商连夜改 PPT';
  else if (n.score >= 55) headline = '「概念满分，做工还差口气」';
  else if (n.score >= 30) headline = '「有新意，但不够炸」';
  else if (!state.models.length) headline = '「中规中矩的首秀」——先活下来再说';
  else if (comp >= 80) headline = Math.random() < 0.5 ? '「稳，但又是挤牙膏的一年」' : '「这是我们最好的一代」——媒体：确实，就是有点眼熟';
  else headline = '「既不新，也不稳」——评论区沉默了';
  const firsts = n.items.filter((i) => i.first).map((i) => i.label.replace(/^.*「|」$/g, ''));
  return { score, grade: wowGrade(score), novelty: n.score, completeness: comp, headline, firsts, buzz };
}

export function finalizeScores(state) {
  const exp = experienceScore(state);
  const W = wowNow(state);
  state.wowResult = W;
  state.hype = Math.max(0, state.hype + Math.round((W?.buzz || 0) / 4) - Math.round(Math.max(0, staleness(state) - 0.5) * 30));
  const phys = physical(state.design);
  const m = matchOf(state.slots, state.product.positioningId);
  const promises = promiseCheck(state, phys);
  const price = state.product.price || PRICE_BANDS.find((p) => p.id === state.product.priceId)?.price || 3999;
  const pe = priceEffect(state, price);
  const pf = { user: pe.user, note: [pe.note, pe.anchorNote].filter(Boolean).join('；') };
  const bar = expectationBar(state);
  const promiseUser = promises.reduce((a, p) => a + (p.ok ? 3 : -6), 0);
  const lag = chipLag(state);
  const chipMedia = lag > 0 ? -6 * lag : lag < 0 && state.design?.chipSrc !== 'ext' ? 4 : 0;
  const chipUser = lag > 0 ? -4 * lag : 0;
  // 换汤不换药：和上一代越像，越没人买账
  const stale = staleness(state);
  const staleMedia = stale > 0.5 ? -Math.round((stale - 0.5) * 18) : 0;
  const staleUser = stale > 0.6 ? -Math.round((stale - 0.6) * 12) : 0;
  const media = Math.max(
    15,
    Math.min(98, Math.round(16 + exp * 0.45 + state.launchScore * 0.3 + state.hype * 0.1 + (W ? W.score * 0.25 : 10) + (exp - bar) * 0.35 + chipMedia + staleMedia + (Math.random() * 6 - 3))),
  );
  const user = Math.max(
    15,
    Math.min(98, Math.round(8 + exp * 0.7 + state.faith * 0.1 + (W ? (W.completeness - 80) * 0.2 : 0) + promiseUser + pf.user + chipUser + staleUser + (Math.random() * 8 - 4))),
  );
  const pos = state.product.positioningId;
  const newNote = m.match >= 0.85 && !state.notes[pos];
  if (m.match >= 0.85) state.notes[pos] = true;
  state.review = { exp, bar, match: Math.round(m.match * 100), mult: m.mult, verdict: m.verdict, promises, priceNote: pf.note, priceUser: pf.user, newNote, priceRatio: pe.ratio, anchorLast: pe.anchorLast, chipLag: lag, stale };
  state.lastExp = exp;
  if (lag < 0) state.chipLeads = (state.chipLeads || 0) + 1;
  state.mediaScore = media;
  state.userScore = user;
  state.headline = W ? W.headline : '中规中矩';
  // 研发点
  const gain = Math.round(2 + media / 12 + (W ? W.score / 15 + W.firsts.length * 2 : 0) + (deptLevel(state, 'rnd') - 1) + office(state).rp);
  state.rp += gain;
  state.lastRp = gain;
}

// ═════════════════════════ 审美疲劳 ═════════════════════════

/** 和上一代的相似度（0～1）；越像，媒体越无聊、用户越不想换 */
export function staleness(state, design = state.design) {
  const last = (state.models || [])[state.models.length - 1];
  return last ? similarity(design, last.design) : 0;
}

// ═════════════════════════ 芯片代差 ═════════════════════════

/** 你的芯片比行业主流落后几代（负数 = 领先） */
export function chipLag(state, design = state.design) {
  return marketChipGen(state.month) - (design?.chipGen || state.chip.gen);
}

// ═════════════════════════ 定价 ═════════════════════════

const priceWarOn = (state) => !!state.priceWar && state.month <= state.priceWar.until;

/** 用户心理价位：定位基准 × 体验 × 新颖 × 芯片代差 × 品牌溢价 × 价格战 */
export function fairPrice(state) {
  const pos = state.product.positioningId;
  const exp = experienceScore(state);
  const n = state.design ? novelty(state.design, state.models).score : 0;
  const lag = chipLag(state);
  const chipK = lag > 0 ? 1 - 0.12 * lag : lag < 0 ? 1.06 : 1;
  const w = state.design ? wowNow(state).score : 0;
  const v = POS_BASE_PRICE[pos] * (0.72 + (exp / 100) * 0.5) * (1 + Math.min(60, n) / 300 + w / 300) * chipK * (state.brand || 1) * (priceWarOn(state) ? 0.94 : 1);
  return roundPrice(v);
}

/** 售价的连锁反应：需求、口碑、上一代价格锚 */
export function priceEffect(state, price) {
  const V = state.product.fair || fairPrice(state);
  const ratio = price / V;
  // 惊艳度越高，用户越不在乎价格（「贵，但值」）
  const wow = (state.wowResult || (state.design ? wowNow(state) : null))?.score || 0;
  const elastic = Math.max(0.8, 1.8 - wow / 70);
  const demandMul = Math.max(0.25, Math.min(2.6, Math.pow(V / price, elastic))) * marketSize(price);
  let user = Math.max(-18, Math.min(8, Math.round((1 - ratio) * 45)));
  const last = state.lastPrices?.[state.product.positioningId];
  let anchorNote = '';
  let anchorLast = 0;
  if (last && price > last * 1.15) {
    user -= 5;
    anchorNote = `比上一代贵了 ¥${price - last}，老用户不太高兴`;
    anchorLast = last;
  } else if (last && price < last * 0.9) {
    user += 2;
    anchorNote = `比上一代便宜了 ¥${last - price}`;
  }
  const note =
    ratio <= 0.8 ? '价格屠夫：口碑爆棚，但利润很薄，友商可能跟进降价'
      : ratio <= 0.92 ? '良心价：用户觉得很值'
        : ratio <= 1.08 ? '价格合理，和用户心理价位差不多'
          : ratio <= 1.2 ? '有点贵：一部分人会等降价'
            : '贵得离谱：大部分人只看不买';
  return { V, ratio, demandMul, user, note, anchorNote, anchorLast };
}

/** 首批备货量（万台），按企划时的价位段决定 */
export function stockedUnits(state) {
  const stock = STOCK_OPTS.find((s) => s.id === state.stockId) || STOCK_OPTS[1];
  const band = PRICE_BANDS.find((p) => p.id === (state.product.bandId || state.product.priceId)) || PRICE_BANDS[1];
  return Math.round(20 * stock.mul * (0.5 + marketSize(band.price) * 0.5));
}

/** 单台毛利（游戏内现金单位 / 万台） */
export function unitMargin(state, price) {
  const unitCost = Math.round((state.design ? physical(state.design).unitCost : 2400) * (deptLevel(state, 'supply') === 3 ? 0.95 : 1) * marketMod(state, 'cost') * (1 - scaleDiscount(state)) * assetMul(state, 'costMul'));
  const channel = Math.round(price * 0.15); // 渠道 + 营销
  // 每卖 1 万台进账（单位 ¥100 万）
  return { unitCost, channel, perUnit: price - unitCost - channel, margin: (price - unitCost - channel) / 100 };
}

/** 需求公式（销售与预测共用） */
function demandUnits(state, { price, media, user, W, tradeBoost = 1 }) {
  const win = windowAt(state.month);
  const clash = clashAt(state.month, state.product.positioningId);
  const clashF = clash ? Math.max(0.6, Math.min(1.15, (media / (media + clash.power)) * 1.7)) : 1;
  const pe = priceEffect(state, price);
  // 芯片代差：落后的机器卖不动，领先的有话题
  const lag = chipLag(state);
  const chipD = lag > 0 ? Math.max(0.6, 1 - 0.12 * lag) : lag < 0 ? 1.06 : 1;
  // 品质对销量很敏感：好评如潮的机器能卖到平庸机的好几倍
  // 旗舰用户看评测下单；入门机用户更看重「值不值」
  const qe = { flagship: 1.8, pro: 1.8, mainstream: 1.5, minimal: 1.1 }[state.product.positioningId] || 1.5;
  const quality = Math.pow(media / 65, qe) * Math.pow(user / 65, qe) * (1 + (W?.score || 20) / 100) * (1 + (W?.buzz || 0) / 60);
  // 和上一代几乎一样：老用户没理由换，新用户也没新鲜感
  const st = staleness(state);
  const fatigue = st > 0.5 ? 1 - Math.min(0.3, (st - 0.5) * 0.6) : 1;
  const demand = assetMul(state, 'demand') * fatigue * chipD * (win?.mul || 1) * clashF * pe.demandMul * quality * (state.reputation / 55) * tradeBoost * (state.generation === 1 ? 1.15 : 1) * marketMod(state, 'demand');
  return { units: Math.round(17 * demand), win, clash, clashF, pe, fatigue };
}

/** 定价面板的实时预测：用当前研发结果估算评分，不含发布会运气 */
export function salesForecast(state, price) {
  const W = wowNow(state);
  const exp = experienceScore(state);
  const bar = expectationBar(state);
  const pe = priceEffect(state, price);
  const promises = promiseCheck({ ...state, product: { ...state.product, price, fair: pe.V } }, physical(state.design));
  const lag = chipLag(state);
  const media = Math.max(15, Math.min(98, Math.round(16 + exp * 0.45 + 25 * 0.3 + state.hype * 0.1 + W.score * 0.25 + (exp - bar) * 0.35 - Math.max(0, lag) * 6)));
  const user = Math.max(15, Math.min(98, Math.round(8 + exp * 0.7 + state.faith * 0.1 + (W.completeness - 80) * 0.2 + promises.reduce((a, p) => a + (p.ok ? 3 : -6), 0) + pe.user - Math.max(0, lag) * 4)));
  const { units } = demandUnits(state, { price, media, user, W });
  const stocked = stockedUnits(state);
  const sold = Math.min(stocked, units);
  const { unitCost, margin, perUnit, channel } = unitMargin(state, price);
  const over = stocked > sold * 1.25 ? overstockLoss(stocked - sold, unitCost) : 0;
  const profit = Math.round(sold * margin - over);
  const backlog = Math.max(0, units - stocked) * 0.7;
  return { units, stocked, sold, profit, unitCost, perUnit, channel, user, media, pe, backlog, later: Math.round(backlog * margin) };
}

/** 积压：降价清货的损失（单位 ¥100 万） */
export const overstockLoss = (units, unitCost) => Math.round((units * unitCost * 0.1) / 100);

/** 行业事件对市场的修正（见 marketEvents） */
export function marketMod(state, key) {
  const on = (state.mods || []).filter((m) => m.until >= state.month && m.key === key);
  if (key === 'extBan') return on.length > 0;
  return on.reduce((a, m) => a * m.val, 1);
}

// ═════════════════════════ 行业大事件 ═════════════════════════

/** 每代开局掷一次：先看上一代有没有「物理代价」，再看行业大事 */
export function rollMarketEvent(state, last) {
  if (last) {
    const a = AFTERMATH_EVENTS.find((e) => e.test(last.design, last));
    if (a && Math.random() < 0.7) return (state.pendingMarket = a.id);
  }
  if (state.generation < 2 || Math.random() > 0.6) return (state.pendingMarket = null);
  const seen = state.seenMarket || [];
  const pool = MARKET_EVENTS.filter((e) => (!e.when || e.when(state)) && !seen.slice(-3).includes(e.id));
  if (!pool.length) return (state.pendingMarket = null);
  return (state.pendingMarket = pool[Math.floor(Math.random() * pool.length)].id);
}

export const marketEventById = (id) => MARKET_EVENTS.find((e) => e.id === id) || AFTERMATH_EVENTS.find((e) => e.id === id);

function applyMarketEffect(state, eff, label) {
  if (eff.gamble) {
    const win = Math.random() < eff.gamble.p;
    applyMarketEffect(state, win ? eff.gamble.win : eff.gamble.lose, label);
    return win ? '赢了' : '输了';
  }
  if (eff.cash) book(state, '行业事件', eff.cash, label);
  if (eff.cashPct) book(state, '行业事件', Math.round(Math.max(0, state.cash) * eff.cashPct), label);
  if (eff.rep) state.reputation = Math.max(0, Math.min(100, state.reputation + eff.rep));
  if (eff.faith) state.faith = Math.max(0, Math.min(100, state.faith + eff.faith));
  if (eff.hype) state.hype = Math.max(0, state.hype + eff.hype);
  if (eff.priceWar) state.priceWar = { until: state.month + eff.priceWar };
  if (eff.mod) (state.mods ||= []).push({ key: eff.mod.key, val: eff.mod.val, until: state.month + eff.mod.months, label });
  return '';
}

export function resolveMarketEvent(state, i) {
  const ev = marketEventById(state.pendingMarket);
  if (!ev) return { ok: false };
  const c = ev.choices[i] || ev.choices[0];
  const res = applyMarketEffect(state, c.effect, ev.title);
  state.seenMarket = [...(state.seenMarket || []), ev.id].slice(-6);
  state.pendingMarket = null;
  state.eventLog.push(`${ev.title}：${c.label}${res ? `（${res}）` : ''}`);
  return { ok: true, msg: res ? `${c.label}——${res}了` : c.label };
}

/** 当前生效的市场修正（给 UI 展示） */
export function activeMods(state) {
  return (state.mods || []).filter((m) => m.until >= state.month);
}

/** 发布前拍板售价 */
export function setPrice(state, price) {
  const p = Math.max(999, Math.min(12999, Math.round(price)));
  state.product.fair = fairPrice(state);
  state.product.price = p;
  state.product.priceId = bandOf(p);
  return { ok: true };
}

// ═════════════════════════ 销售 ═════════════════════════

export function runSales(state) {
  // 新品上市：先处理在售旧款（自相蚕食）
  const policy = state.oldPolicy || 'keep';
  let oldNote = '';
  let tradeBoost = 1;
  if ((state.onSale || []).length) {
    if (policy === 'clear') {
      const v = Math.round(tailValue(state) * 0.5);
      book(state, '旧款清仓', v);
      state.reputation = Math.max(0, state.reputation - 1);
      oldNote = `旧款降价清仓，回款 ${v}`;
      state.onSale = [];
    } else if (policy === 'tradein') {
      book(state, '以旧换新补贴', -40);
      state.faith = Math.min(100, state.faith + 3);
      tradeBoost = 1.12;
      oldNote = '以旧换新：老用户换新机，信仰 +3';
      state.onSale = [];
    } else {
      for (const m of state.onSale) m.comp *= m.pos === state.product.positioningId ? 0.5 : 0.85;
      oldNote = '新旧同台：旧款销量被新品蚕食';
    }
  }
  state.oldPolicy = 'keep';
  const priceVal = state.product.price || PRICE_BANDS.find((p) => p.id === state.product.priceId).price;
  const W = state.wowResult;
  const { units: baseUnits, win, clash, clashF, pe } = demandUnits(state, { price: priceVal, media: state.mediaScore, user: state.userScore, W, tradeBoost });
  const stocked = stockedUnits(state);
  const sold = Math.min(stocked, baseUnits);
  const { unitCost, margin, perUnit, channel } = unitMargin(state, priceVal);
  // 首月进账 = 卖出万台 × 单台利润（售价 − 成本 − 渠道营销）
  const revenue = Math.round(sold * margin);
  const cogs = 0;
  let inventoryFee = 0;
  let stockNote;
  let stockState;
  if (sold >= stocked && baseUnits > stocked * 1.05) {
    stockNote = '缺货！黄牛微笑，口碑微损。';
    stockState = 'short';
    state.reputation = Math.max(0, state.reputation - 4);
    state.faith = Math.max(0, state.faith - 2);
  } else if (stocked > sold * 1.25) {
    inventoryFee = overstockLoss(stocked - sold, unitCost);
    stockNote = `仓库积压 ${stocked - sold} 万台，只能降价清货。`;
    stockState = 'over';
    state.overstocks = (state.overstocks || 0) + 1;
    book(state, '库存积压', -inventoryFee);
  } else {
    stockNote = '备货大致合适，供应链松了口气。';
    stockState = 'ok';
  }
  const profit = revenue - cogs - inventoryFee;
  book(state, '首月销售', revenue - cogs, state.design?.modelName);
  state.cumSold = (state.cumSold || 0) + sold;
  recordShare(state, sold + (state.onSale || []).reduce((a, m) => a + ((m.history || []).slice(-1)[0] || 0) * 0.5, 0));
  // 没买到的人：一部分会等补货（追加生产，之后几个月按产能交付）
  const backlog = Math.max(0, baseUnits - stocked) * 0.7;
  // 进入长尾：之后每月继续卖（受口碑影响）
  state.onSale = state.onSale || [];
  state.onSale.push({
    name: state.design?.modelName || state.product.name,
    color: state.design?.color || '#5aa9d6',
    pos: state.product.positioningId,
    gen: state.generation,
    d0: baseUnits, // 首月的市场热度（不受备货限制）
    wom: (state.userScore - 65) / 150, // 口碑：好口碑会让后面几个月越卖越多
    comp: 1,
    boost: 1,
    age: 0,
    price: priceVal,
    unitCost,
    unitMargin: margin,
    months: LIFE_MONTHS,
    backlog,
    cap: Math.max(8, stocked * 0.9) * assetMul(state, 'cap'), // 每月最大产能
    firstProfit: revenue - inventoryFee,
    history: [sold],
  });
  state.monthDelta = profit;
  state.reputation = Math.max(0, Math.min(100, state.reputation + Math.round((state.mediaScore - 60) / 10)));
  state.faith = Math.max(0, Math.min(100, state.faith + Math.round((state.userScore - 60) / 12)));
  if (state.product.bindEco) state.faith = Math.min(100, state.faith + 3);
  // —— 定价的连锁反应 ——
  const pos = state.product.positioningId;
  const chain = [];
  const prevBrand = state.brand || 1;
  if (pe.ratio <= 0.85) state.brand = Math.max(0.8, prevBrand - 0.03);
  else if (pe.ratio >= 1.0 && state.userScore >= 65 && stockState !== 'over') state.brand = Math.min(1.35, prevBrand + 0.04);
  if (state.brand !== prevBrand) chain.push(state.brand > prevBrand ? `品牌溢价上升到 ×${state.brand.toFixed(2)}：卖得贵也有人买单` : `品牌溢价降到 ×${state.brand.toFixed(2)}：用户开始把你当「便宜货」`);
  if (pe.ratio <= 0.8) {
    state.priceWar = { until: state.month + 8 };
    chain.push('友商宣布跟进降价：接下来 8 个月是价格战，大家的心理价位都会被压低');
  }
  if (stockState === 'short' && pe.ratio <= 0.9) chain.push('黄牛加价 ¥500 倒卖，二手平台一机难求');
  state.lastPrices = { ...(state.lastPrices || {}), [pos]: priceVal };
  state.salesResult = {
    sold, stocked, demand: baseUnits, revenue, cogs, inventoryFee, profit, stockNote, stockState, price: priceVal, unitCost, chain, priceRatio: pe.ratio,
    perUnit, channel, backlog: Math.round(backlog), backlogValue: Math.round(backlog * margin),
    window: win?.name || '', windowMul: win?.mul || 1, clash: clash ? `${clash.brand} 同月发布，瓜分了需求` : '', clashF, oldNote,
  };
  state.phase = 'sales';
  if (state.cash < 0) goBroke(state, '首月结算后现金为负：售价、成本和备货没谈拢。', 'sales');
}

// ═════════════════════════ 规划下一代 ═════════════════════════

function bumpName(name, n) {
  const m = String(name || '').match(/^(.*?)(\d+)$/);
  if (m) return `${m[1]}${Number(m[2]) + 1}`.slice(0, 8);
  return `${name || '新机'} ${n}`.slice(0, 8);
}

/** 销售结束 → 入馆，进入「规划下一代」 */
export function enterNext(state) {
  if (state.design && !state.archived) {
    const W = state.wowResult;
    state.models.push({
      design: state.design,
      wow: W?.score ?? 0,
      grade: W?.grade ?? '',
      firsts: W?.firsts ?? [],
      buzz: W?.buzz ?? 0,
      media: state.mediaScore,
      sold: state.salesResult?.sold ?? 0,
      lifeSold: state.salesResult?.sold ?? 0,
      lifeProfit: state.salesResult?.profit ?? 0,
      thumb: state.lastThumb || '',
      cut: state.lastCut || '',
      gen: state.generation,
      supplierId: state.supplierId,
      price: state.product?.price,
    });
    if (state.models.length > 12) state.models = state.models.slice(-12);
    state.archived = true;
  }
  const sh = shareTable(state);
  if (sh) {
    state.lastRank = state.rank || sh.rank;
    state.rank = sh.rank;
    state.bestRank = Math.min(state.bestRank || 9, sh.rank);
  }
  state.phase = state.month >= RUN_MONTHS ? 'ending' : 'next';
}

export function goNextGen(state) {
  if (state.design) {
    state.designDraft = { ...structuredClone(state.design), redesign: 'major', modelName: bumpName(state.design.modelName, state.generation + 1) };
  }
  state.design = null;
  state.archived = false;
  state.wowResult = null;
  state.lastThumb = '';
  state.lastCut = '';
  state.generation += 1;
  state.product = null;
  state.supplierId = null;
  state.stockId = 'normal';
  state.slots = emptySlots();
  state.monthsLeft = 4;
  state.pendingEvent = null;
  state.launchScore = 0;
  state.mediaScore = 0;
  state.userScore = 0;
  state.headline = '';
  state.salesResult = null;
  state.hype = Math.max(0, Math.round(state.hype * 0.3));
  state.phase = 'plan';
  const last = state.models[state.models.length - 1];
  rollMarketEvent(state, last ? { design: last.design, thickness: physical(last.design).thickness, supplierId: last.supplierId } : null);
}

export const PHASE_STEPS = [
  { id: 'plan', label: '企划', icon: 'clipboard' },
  { id: 'design', label: '设计', icon: 'paint' },
  { id: 'supply', label: '供应', icon: 'handshake' },
  { id: 'dev', label: '研发', icon: 'flask' },
  { id: 'factory', label: '量产', icon: 'factory' },
  { id: 'launch', label: '发布', icon: 'mic' },
  { id: 'sales', label: '销售', icon: 'cart' },
];

export function stepIndex(phase) {
  const map = { event: 'dev', score: 'launch', next: 'sales', bust: 'sales', ending: 'sales', rescue: 'sales' };
  return PHASE_STEPS.findIndex((s) => s.id === (map[phase] || phase));
}

export { CONCEPTS };
