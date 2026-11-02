/**
 * 主循环逻辑（v0.9）
 * 企划 → 设计 → 供应链 → 研发（月度 + 事件）→ 量产 → 发布会 → 销售 → 规划下一代
 * 玩家只管大方向：部门升级代替逐个招人；研发点解锁概念件。
 */
import { SLOTS, POSITIONING, PRICE_BANDS, SUPPLIERS, STOCK_OPTS, EVENTS, DEPTS } from './data.js';
import { emptySlots } from './state.js';
import { IDEAL, matchOf, promiseCheck, priceFit, windowAt, clashAt, expectationBar, RUN_MONTHS } from './market.js';
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
} from '../studio/parts.js';

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
  state.cash -= cost;
  state.depts[id] += 1;
  const d = DEPTS.find((x) => x.id === id);
  return { ok: true, msg: `${d.name}升到 Lv${state.depts[id]}` };
}

// ═════════════════════════ 办公室扩建 ═════════════════════════

export const OFFICES = [
  { lv: 1, name: '车库', icon: '🏚', cost: 0, mp: 0, pay: 0, launch: 0, rp: 0, desc: '一切从这里开始' },
  { lv: 2, name: '小办公室', icon: '🏢', cost: 60, mp: 1, pay: 2, launch: 0, rp: 0, desc: '人力 +1 · 有了会议室' },
  { lv: 3, name: '写字楼', icon: '🏙', cost: 150, mp: 2, pay: 5, launch: 4, rp: 1, desc: '人力 +2 · 发布会 +4 · 研发点 +1' },
  { lv: 4, name: '科技园', icon: '🌳', cost: 300, mp: 3, pay: 8, launch: 7, rp: 2, desc: '人力 +3 · 发布会 +7 · 研发点 +2' },
];
export const office = (state) => OFFICES[(state.office || 1) - 1];
export function nextOffice(state) {
  return OFFICES[state.office || 1] || null;
}
export function upgradeOffice(state) {
  const n = nextOffice(state);
  if (!n) return { ok: false, msg: '已经是科技园了' };
  if (state.cash < n.cost) return { ok: false, msg: '现金不够' };
  state.cash -= n.cost;
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
  return 4 + Object.values(state.depts).reduce((a, b) => a + b, 0) * 2 + office(state).pay;
}

export function prLaunchBonus(state) {
  return [3, 7, 11][deptLevel(state, 'pr') - 1] + office(state).launch;
}

// ═════════════════════════ 自研芯片 ═════════════════════════

export function chipResearchCost(state) {
  const gen = state.chip.gen;
  return { cash: 30 + gen * 20, months: deptLevel(state, 'rnd') >= 3 ? 2 : 3, next: gen + 1 };
}

export function startChipResearch(state) {
  if (state.chip.research) return { ok: false, msg: '已经在流片了' };
  const c = chipResearchCost(state);
  if (state.cash < c.cash) return { ok: false, msg: '现金不够' };
  state.cash -= c.cash;
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
  const pos = POSITIONING.find((p) => p.id === positioningId);
  const price = PRICE_BANDS.find((p) => p.id === priceId);
  if (!pos || !price || pointIds.length < 1 || pointIds.length > 3) return { ok: false, msg: '请选择定位、1～3 个卖点、售价带' };
  state.product = {
    name: `${state.companyName} Phone ${state.generation}`,
    positioningId,
    pointIds: [...pointIds],
    priceId,
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
    state.cash -= 20;
    state.monthsLeft += 1;
    state.eventLog.push('大改款：模具费 -20，工期 +1 月');
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
  return { ok: true, msg: `🔓 解锁「${conceptName(id)}」` };
}

// ═════════════════════════ 供应链 ═════════════════════════

export function pickLogistics(state, supplierId, stockId = 'normal') {
  if (!SUPPLIERS.some((s) => s.id === supplierId) || !STOCK_OPTS.some((s) => s.id === stockId)) return { ok: false };
  state.supplierId = supplierId;
  state.stockId = stockId;
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
  state.cash -= pay;
  state.monthDelta = -pay;
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

/** 在售旧款：每月卖一点，逐月衰减（长尾） */
export function sellTail(state) {
  let units = 0;
  let income = 0;
  for (const m of state.onSale || []) {
    const u = Math.round(m.monthly);
    units += u;
    income += Math.round(u * m.unitMargin);
    m.monthly *= 0.6;
    m.months -= 1;
  }
  state.onSale = (state.onSale || []).filter((m) => m.months > 0 && m.monthly >= 1);
  state.cash += income;
  state.tailTotal = (state.tailTotal || 0) + income;
  return { units, income };
}

/** 旧款预计还能挣多少（给清仓 / 以旧换新做参考） */
export function tailValue(state) {
  return Math.round((state.onSale || []).reduce((a, m) => a + (m.monthly / 0.4) * m.unitMargin, 0));
}

export const OLD_POLICIES = [
  { id: 'keep', name: '继续卖', desc: '同定位旧款销量砍半，其他 ×0.85' },
  { id: 'clear', name: '降价清仓', desc: '一次性回款约 5 成，口碑 -1' },
  { id: 'tradein', name: '以旧换新', desc: '花 10，信仰 +3，新品首月 +12%' },
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
    if (e.cash) s += e.cash / 20;
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
  if (eff.cash) state.cash += eff.cash;
  if (eff.months) state.monthsLeft += eff.months;
  if (eff.hype) state.hype += eff.hype;
  if (eff.faith) state.faith += eff.faith;
  for (const [k, v] of Object.entries(eff.slotPenalty || {})) {
    if (state.slots[k]) {
      state.slots[k].progress = Math.max(0, state.slots[k].progress - v);
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
export const RESCUE_CASH = 100;
function goBroke(state, reason, back) {
  if (!state.rescued) {
    const amount = RESCUE_CASH - state.cash;
    state.rescued = true;
    state.cash += amount;
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
  let score = avgSlotProgress(state) * state.product.expMul * sup.quality * m.mult;
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
  if (buzz >= 40 && comp < 65) headline = '「做工翻车，但全网都在讨论」';
  else if (n.score >= 55 && comp >= 85) headline = '「这才叫创新！」——科技媒体集体起立';
  else if (n.score >= 55) headline = '「概念满分，做工还差口气」';
  else if (n.score >= 30) headline = '「有新意，但不够炸」';
  else if (!state.models.length) headline = '「中规中矩的首秀」——先活下来再说';
  else if (comp >= 80) headline = '「稳，但又是挤牙膏的一年」';
  else headline = '「既不新，也不稳」——评论区沉默了';
  const firsts = n.items.filter((i) => i.first).map((i) => i.label.replace(/^.*「|」$/g, ''));
  return { score, grade: wowGrade(score), novelty: n.score, completeness: comp, headline, firsts, buzz };
}

export function finalizeScores(state) {
  const exp = experienceScore(state);
  const W = wowNow(state);
  state.wowResult = W;
  state.hype += Math.round((W?.buzz || 0) / 4);
  const phys = physical(state.design);
  const m = matchOf(state.slots, state.product.positioningId);
  const promises = promiseCheck(state, phys);
  const pf = priceFit(state.product.positioningId, state.product.priceId);
  const bar = expectationBar(state);
  const promiseUser = promises.reduce((a, p) => a + (p.ok ? 3 : -6), 0);
  const media = Math.max(
    15,
    Math.min(98, Math.round(16 + exp * 0.45 + state.launchScore * 0.3 + state.hype * 0.1 + (W ? W.score * 0.25 : 10) + (exp - bar) * 0.35 + (Math.random() * 6 - 3))),
  );
  const user = Math.max(
    15,
    Math.min(98, Math.round(8 + exp * 0.7 + state.faith * 0.1 + (W ? (W.completeness - 80) * 0.2 : 0) + promiseUser + pf.user + (Math.random() * 8 - 4))),
  );
  const pos = state.product.positioningId;
  const newNote = m.match >= 0.85 && !state.notes[pos];
  if (m.match >= 0.85) state.notes[pos] = true;
  state.review = { exp, bar, match: Math.round(m.match * 100), mult: m.mult, verdict: m.verdict, promises, priceNote: pf.note, priceUser: pf.user, newNote };
  state.lastExp = exp;
  state.mediaScore = media;
  state.userScore = user;
  state.headline = W ? W.headline : '中规中矩';
  // 研发点
  const gain = Math.round(2 + media / 12 + (W ? W.score / 15 + W.firsts.length * 2 : 0) + (deptLevel(state, 'rnd') - 1) + office(state).rp);
  state.rp += gain;
  state.lastRp = gain;
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
      state.cash += v;
      state.reputation = Math.max(0, state.reputation - 1);
      oldNote = `旧款降价清仓，回款 ${v}`;
      state.onSale = [];
    } else if (policy === 'tradein') {
      state.cash -= 10;
      state.faith = Math.min(100, state.faith + 3);
      tradeBoost = 1.12;
      oldNote = '以旧换新：老用户换新机，信仰 +3';
      state.onSale = [];
    } else {
      for (const m of state.onSale) m.monthly *= m.pos === state.product.positioningId ? 0.5 : 0.85;
      oldNote = '新旧同台：旧款销量被新品蚕食';
    }
  }
  state.oldPolicy = 'keep';
  const price = PRICE_BANDS.find((p) => p.id === state.product.priceId);
  const stock = STOCK_OPTS.find((s) => s.id === state.stockId);
  const W = state.wowResult;
  const win = windowAt(state.month);
  const clash = clashAt(state.month, state.product.positioningId);
  const clashF = clash ? Math.max(0.6, Math.min(1.15, (state.mediaScore / (state.mediaScore + clash.power)) * 1.7)) : 1;
  const demand =
    (win?.mul || 1) *
    clashF *
    price.demand *
    (0.55 + state.mediaScore / 120) *
    (0.65 + state.userScore / 160) *
    (state.reputation / 55) *
    (0.82 + (W?.score || 20) / 140) *
    (1 + (W?.buzz || 0) / 60) *
    tradeBoost *
    (state.generation === 1 ? 1.2 : 1); // 第一款产品：尝鲜红利
  const baseUnits = Math.round(28 * demand);
  const stocked = Math.round(30 * stock.mul * (0.5 + price.demand * 0.5));
  const sold = Math.min(stocked, baseUnits);
  const unitCost = Math.round((state.design ? physical(state.design).unitCost : 2400) * (deptLevel(state, 'supply') === 3 ? 0.95 : 1));
  // 单台毛利率 × 价位：高价利润厚但量小，低价走量但薄
  const margin = Math.max(0.15, (price.price - unitCost) / 1000);
  const revenue = Math.round(sold * margin * 1.45);
  const cogs = Math.round(sold * 0.3 * (SUPPLIERS.find((x) => x.id === state.supplierId)?.costMul || 1));
  let inventoryFee = 0;
  let stockNote;
  let stockState;
  if (sold >= stocked && baseUnits > stocked * 1.05) {
    stockNote = '缺货！黄牛微笑，口碑微损。';
    stockState = 'short';
    state.reputation = Math.max(0, state.reputation - 4);
    state.faith = Math.max(0, state.faith - 2);
  } else if (stocked > sold * 1.25) {
    inventoryFee = Math.round((stocked - sold) * 0.6);
    stockNote = '仓库有点吃灰，现金被压住了。';
    stockState = 'over';
    state.overstocks = (state.overstocks || 0) + 1;
    state.cash -= inventoryFee;
  } else {
    stockNote = '备货大致合适，供应链松了口气。';
    stockState = 'ok';
  }
  const profit = revenue - cogs - inventoryFee;
  state.cash += revenue - cogs;
  // 进入长尾：之后每月继续卖（受口碑影响）
  state.onSale = state.onSale || [];
  state.onSale.push({
    name: state.design?.modelName || state.product.name,
    color: state.design?.color || '#5aa9d6',
    pos: state.product.positioningId,
    monthly: sold * 0.3 * (0.7 + state.userScore / 200) * (0.8 + (W?.score || 0) / 120),
    unitMargin: margin * 1.45,
    months: 6,
  });
  state.monthDelta = profit;
  state.reputation = Math.max(0, Math.min(100, state.reputation + Math.round((state.mediaScore - 60) / 10)));
  state.faith = Math.max(0, Math.min(100, state.faith + Math.round((state.userScore - 60) / 12)));
  if (state.product.bindEco) state.faith = Math.min(100, state.faith + 3);
  state.salesResult = {
    sold, stocked, demand: baseUnits, revenue, cogs, inventoryFee, profit, stockNote, stockState, price: price.price, unitCost,
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
      thumb: state.lastThumb || '',
      cut: state.lastCut || '',
      gen: state.generation,
    });
    if (state.models.length > 12) state.models = state.models.slice(-12);
    state.archived = true;
  }
  state.phase = state.month >= RUN_MONTHS ? 'ending' : 'next';
}

export function goNextGen(state) {
  if (state.design) {
    state.designDraft = { ...structuredClone(state.design), redesign: 'minor', modelName: bumpName(state.design.modelName, state.generation + 1) };
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
}

export const PHASE_STEPS = [
  { id: 'plan', label: '企划', icon: '📋' },
  { id: 'design', label: '设计', icon: '🎨' },
  { id: 'supply', label: '供应', icon: '🤝' },
  { id: 'dev', label: '研发', icon: '🔬' },
  { id: 'factory', label: '量产', icon: '🏭' },
  { id: 'launch', label: '发布', icon: '🎤' },
  { id: 'sales', label: '销售', icon: '🛒' },
];

export function stepIndex(phase) {
  const map = { event: 'dev', score: 'launch', next: 'sales', bust: 'sales', ending: 'sales', rescue: 'sales' };
  return PHASE_STEPS.findIndex((s) => s.id === (map[phase] || phase));
}

export { CONCEPTS };
