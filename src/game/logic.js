import {
  ROLES,
  SLOTS,
  POSITIONING,
  SELL_POINTS,
  PRICE_BANDS,
  SUPPLIERS,
  STOCK_OPTS,
  EVENTS,
  LAUNCH_PREP,
  LAUNCH_BEATS,
} from './data.js';
import { emptySlots } from './state.js';

export function getRole(id) {
  return ROLES.find((r) => r.id === id);
}

export function hiredIds(state) {
  return new Set(state.staff.map((s) => s.roleId));
}

export function hire(state, roleId) {
  const role = getRole(roleId);
  if (!role || hiredIds(state).has(roleId)) return { ok: false, msg: '无法招聘' };
  if (state.cash < role.cost) return { ok: false, msg: '现金不足' };
  state.cash -= role.cost;
  state.staff.push({ roleId, assigned: 'idle' });
  return { ok: true, msg: `已招聘：${role.title}` };
}

export function assignStaff(state, roleId, target) {
  const s = state.staff.find((x) => x.roleId === roleId);
  if (!s) return;
  s.assigned = target;
}

export function staffBoostForSlot(state, slotId) {
  let mul = 1;
  for (const s of state.staff) {
    if (s.assigned !== slotId) continue;
    const role = getRole(s.roleId);
    if (role?.boost?.[slotId]) mul *= role.boost[slotId];
  }
  return mul;
}

export function hasSupplyManager(state) {
  return state.staff.some((s) => s.roleId === 'supply');
}

export function hasPr(state) {
  return state.staff.some((s) => s.roleId === 'pr' && (s.assigned === 'launch' || s.assigned === 'idle'));
}

export function prLaunchBonus(state) {
  const pr = state.staff.find((s) => s.roleId === 'pr');
  if (!pr) return 0;
  if (pr.assigned === 'launch') return 10;
  return 3;
}

export function finishPlan(state, { positioningId, pointIds, priceId, bindEco }) {
  const pos = POSITIONING.find((p) => p.id === positioningId);
  const price = PRICE_BANDS.find((p) => p.id === priceId);
  const points = SELL_POINTS.filter((p) => pointIds.includes(p.id));
  if (!pos || !price || points.length < 1 || points.length > 3) {
    return { ok: false, msg: '请选择定位、1～3 个卖点、售价带' };
  }
  state.product = {
    name: `${state.companyName} Phone ${state.generation}`,
    category: '手机',
    positioningId,
    pointIds,
    priceId,
    bindEco: !!bindEco && state.generation > 1,
    expMul: pos.exp,
    costMul: pos.cost,
    baseMonths: pos.months,
  };
  state.monthsLeft = pos.months;
  state.slots = emptySlots();
  state.phase = 'logistics';
  return { ok: true };
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

export function pickSupplier(state, supplierId) {
  return pickLogistics(state, supplierId, state.stockId || 'normal');
}

/** 供应商 + 备货同一决策 */
export function pickLogistics(state, supplierId, stockId = 'normal') {
  if (!SUPPLIERS.some((s) => s.id === supplierId)) return { ok: false };
  if (!STOCK_OPTS.some((s) => s.id === stockId)) return { ok: false };
  state.supplierId = supplierId;
  state.stockId = stockId;
  state.phase = 'dev';
  return { ok: true };
}

export function recommendedPlan(generation = 1) {
  return {
    positioningId: 'mainstream',
    pointIds: ['fast', 'thin'],
    priceId: 'mid',
    bindEco: generation > 1,
  };
}

/** 推荐班底：PM + 工业设计 + 公关，自动分派 */
export function quickHireTeam(state) {
  const want = [
    { id: 'pm', assign: 'perf' },
    { id: 'id', assign: 'design' },
    { id: 'pr', assign: 'launch' },
  ];
  const msgs = [];
  for (const w of want) {
    if (!hiredIds(state).has(w.id)) {
      const r = hire(state, w.id);
      if (!r.ok) break;
      msgs.push(r.msg);
    }
    assignStaff(state, w.id, w.assign);
  }
  return { ok: state.staff.length > 0, msg: msgs.join('；') || '班底已就绪' };
}

export function balancedAllocation(state) {
  const cap = manpowerCap(state);
  const n = SLOTS.length;
  const base = Math.floor(cap / n);
  let rem = cap - base * n;
  const alloc = {};
  for (const s of SLOTS) {
    alloc[s.id] = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem -= 1;
  }
  // bias to assigned staff slots
  for (const st of state.staff) {
    if (SLOTS.some((s) => s.id === st.assigned) && alloc[st.assigned] !== undefined) {
      // steal 1 from a random other if possible
      const donor = SLOTS.find((s) => s.id !== st.assigned && alloc[s.id] > 0);
      if (donor && alloc[st.assigned] < cap) {
        alloc[donor.id] -= 1;
        alloc[st.assigned] += 1;
      }
    }
  }
  return alloc;
}

/** 事件：选「最稳」选项（优先不加赌、少扣槽） */
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
    if (s > score) { score = s; best = i; }
  });
  return best;
}

export const LAUNCH_STYLES = [
  { id: 'safe', label: '稳稳发布', desc: '少翻车，分数中上', score: 22, risk: 0.08 },
  { id: 'wow', label: '整点惊喜', desc: '可能爆火也可能翻车', score: 34, risk: 0.32 },
  { id: 'specs', label: '把卖点讲清楚', desc: '务实玩家会点头', score: 26, risk: 0.12 },
];

/** 一键发布会：2～3 个大策略直接出分 */
export function resolveLaunchStyle(state, styleId) {
  const style = LAUNCH_STYLES.find((s) => s.id === styleId) || LAUNCH_STYLES[0];
  state.launchPrepIds = styleId === 'safe' ? ['demo_stable'] : styleId === 'wow' ? ['easter'] : ['spec_sheet'];
  let score = prLaunchBonus(state) + style.score;
  if (Math.random() < style.risk) {
    score -= 14;
    state.eventLog.push(`发布会：${style.label} 翻车了一下`);
  } else {
    state.eventLog.push(`发布会：${style.label}`);
  }
  state.launchScore = score;
  finalizeScores(state);
  state.phase = 'score';
  return { ok: true };
}



export function avgSlotProgress(state) {
  const vals = SLOTS.map((s) => state.slots[s.id].progress);
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

export function experienceScore(state) {
  const avg = avgSlotProgress(state);
  const sup = SUPPLIERS.find((s) => s.id === state.supplierId) || SUPPLIERS[1];
  let score = avg * state.product.expMul * sup.quality;
  if (state.product.bindEco) score += 4;
  // sell point alignment soft bonus
  if (state.product.pointIds.includes('fast')) score += state.slots.perf.progress * 0.05;
  if (state.product.pointIds.includes('photo')) score += state.slots.camera.progress * 0.05;
  if (state.product.pointIds.includes('thin')) score += state.slots.design.progress * 0.04;
  return Math.max(0, Math.min(100, Math.round(score)));
}

const COMMENTS = {
  perf: ['有点卡', '还行吧', '顺多了', '用着真爽', '快到飞起'],
  design: ['有点土', '凑合能看', '有点好看', '挺有面子', '回头率不错'],
  camera: ['白天凑合', '夜景一般', '能发朋友圈', '拍得挺好看', '出片了'],
  battery: ['下午就慌', '能撑一天', '晚上也不慌', '很耐用', '一天两天随便'],
  os: ['偶尔卡一下', '顺一点了', '用着舒服', '越用越顺', '手感拉满'],
};

export function commentFor(slotId, progress) {
  const arr = COMMENTS[slotId];
  const idx = Math.min(arr.length - 1, Math.floor(progress / 20));
  return arr[idx];
}

/** 玩家本月给各槽分配的点数 map slotId -> points */
export function advanceMonth(state, allocation) {
  const total = Object.values(allocation).reduce((a, b) => a + b, 0);
  const maxPoints = 5 + state.staff.filter((s) => s.assigned !== 'idle' && s.assigned !== 'launch').length;
  if (total > maxPoints) return { ok: false, msg: `本月人力点最多 ${maxPoints}` };
  if (total < 1) return { ok: false, msg: '至少分配 1 点' };

  // payroll
  const payroll = 4 + state.staff.length * 2;
  state.cash -= payroll;
  state.monthDelta = -payroll;

  for (const [slotId, pts] of Object.entries(allocation)) {
    if (!pts) continue;
    const boost = staffBoostForSlot(state, slotId);
    const gain = Math.round(pts * 10 * boost);
    const slot = state.slots[slotId];
    slot.progress = Math.min(100, slot.progress + gain);
    slot.comment = commentFor(slotId, slot.progress);
  }

  state.monthsLeft = Math.max(0, state.monthsLeft - 1);
  state.month += 1;

  // event?
  const sup = SUPPLIERS.find((s) => s.id === state.supplierId);
  let chance = sup.eventChance;
  if (hasSupplyManager(state)) chance *= 0.75;
  const roll = Math.random();
  if (roll < chance) {
    const pool = EVENTS.filter((e) => e.id !== state.lastEventId);
    const ev = pool[Math.floor(Math.random() * pool.length)];
    state.pendingEvent = ev.id;
    state.phase = 'event';
    return { ok: true, event: true };
  }

  return afterDevCheck(state);
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
  if (eff.slotPenalty) {
    for (const [k, v] of Object.entries(eff.slotPenalty)) {
      if (state.slots[k]) {
        state.slots[k].progress = Math.max(0, state.slots[k].progress - v);
        state.slots[k].comment = commentFor(k, state.slots[k].progress);
      }
    }
  }
  if (eff.gambleFail && Math.random() < 0.45) {
    state.monthsLeft += 1;
    state.eventLog.push(`${ev.type}：赌输了，又晚一个月`);
  } else {
    state.eventLog.push(`${ev.type}：${choice.label}`);
  }
  state.lastEventId = ev.id;
  state.pendingEvent = null;
  state.phase = 'dev';
  return afterDevCheck(state);
}

export function afterDevCheck(state) {
  if (state.cash < 0) {
    state.phase = 'bust';
    state.bustReason = '钱花光了。要么太贵太慢，要么突发状况砸太狠。';
    return { ok: true, bust: true };
  }
  const ready = avgSlotProgress(state) >= 55 && state.monthsLeft <= 1;
  const forced = state.monthsLeft <= 0;
  if (ready || forced || avgSlotProgress(state) >= 80) {
    if (!state.stockId) state.stockId = 'normal';
    state.phase = 'launch';
    return { ok: true, toLaunch: true };
  }
  // 月报改为自动跳过，减少点击
  state.phase = 'dev';
  return { ok: true, report: false };
}

export function continueFromReport(state) {
  state.phase = 'dev';
}

export function pickStock(state, stockId) {
  if (!STOCK_OPTS.some((s) => s.id === stockId)) return { ok: false };
  state.stockId = stockId;
  state.phase = 'launch';
  return { ok: true };
}

export function togglePrep(state, prepId) {
  const prep = LAUNCH_PREP.find((p) => p.id === prepId);
  if (!prep) return;
  const i = state.launchPrepIds.indexOf(prepId);
  if (i >= 0) {
    state.launchPrepIds.splice(i, 1);
    state.cash += prep.cost;
  } else {
    if (state.cash < prep.cost) return { ok: false, msg: '现金不足' };
    if (state.launchPrepIds.length >= 2) return { ok: false, msg: '最多选 2 项准备' };
    state.cash -= prep.cost;
    state.launchPrepIds.push(prepId);
  }
  return { ok: true };
}

export function startLaunch(state) {
  state.launchBeatIndex = 0;
  state.launchScore = prLaunchBonus(state);
  for (const id of state.launchPrepIds) {
    const p = LAUNCH_PREP.find((x) => x.id === id);
    if (!p) continue;
    state.launchScore += p.launch;
    if (p.risk && Math.random() < p.risk) state.launchScore -= 8;
  }
  state.phase = 'launch';
}

export function pickLaunchBeat(state, choiceIndex) {
  const beat = LAUNCH_BEATS[state.launchBeatIndex];
  const choice = beat.choices[choiceIndex];
  let add = choice.score;
  if (Math.random() < choice.risk) {
    add -= 12;
    state.eventLog.push(`发布会：${beat.prompt} 翻车了`);
  } else {
    state.eventLog.push(`发布会：${choice.label}`);
  }
  state.launchScore += add;
  state.launchBeatIndex += 1;
  if (state.launchBeatIndex >= LAUNCH_BEATS.length) {
    finalizeScores(state);
    state.phase = 'score';
  }
}

export function finalizeScores(state) {
  const exp = experienceScore(state);
  const media = Math.max(
    20,
    Math.min(98, Math.round(exp * 0.55 + state.launchScore * 0.35 + state.hype * 0.15 + (Math.random() * 6 - 3))),
  );
  const user = Math.max(
    20,
    Math.min(98, Math.round(exp * 0.7 + state.faith * 0.1 + (Math.random() * 8 - 4))),
  );
  state.mediaScore = media;
  state.userScore = user;
  if (media >= 85) state.headline = '「这代有点东西」——小报集体复读';
  else if (media >= 70) state.headline = '稳稳当当，论坛没大战';
  else if (media >= 55) state.headline = '中规中矩，中规中矩';
  else state.headline = '发布会翻车合集出来了（别点开）';
}

export function runSales(state) {
  const price = PRICE_BANDS.find((p) => p.id === state.product.priceId);
  const stock = STOCK_OPTS.find((s) => s.id === state.stockId);
  const demand =
    price.demand *
    (0.55 + state.mediaScore / 120) *
    (0.65 + state.userScore / 160) *
    (state.reputation / 55);
  // 抽象「销量点」与现金同一量级，避免首月暴富
  const baseUnits = Math.round(28 * demand);
  const stocked = Math.round(32 * stock.mul);
  const sold = Math.min(stocked, baseUnits);
  const margin = Math.max(0.8, (price.price / 3999) * 1.1 - state.product.costMul * 0.35);
  const revenue = Math.round(sold * margin * 3.2);
  const cogs = Math.round(sold * 0.7 * (SUPPLIERS.find((x) => x.id === state.supplierId)?.costMul || 1));
  let inventoryFee = 0;
  let stockNote = '';
  if (sold >= stocked && baseUnits > stocked * 1.05) {
    stockNote = '卖断货了！有人开心，有人骂街。';
    state.reputation = Math.max(0, state.reputation - 4);
    state.faith = Math.max(0, state.faith - 2);
  } else if (stocked > sold * 1.25) {
    inventoryFee = Math.round((stocked - sold) * 0.6);
    stockNote = '货压在仓库里，钱周转不动。';
    state.cash -= inventoryFee;
  } else {
    stockNote = '备货刚刚好，进货高手松了口气。';
  }
  const profit = revenue - cogs - inventoryFee;
  state.cash += revenue - cogs;
  state.monthDelta = profit;
  state.reputation = Math.max(0, Math.min(100, state.reputation + Math.round((state.mediaScore - 60) / 10)));
  state.faith = Math.max(0, Math.min(100, state.faith + Math.round((state.userScore - 60) / 12)));
  if (state.product.bindEco) state.faith = Math.min(100, state.faith + 3);

  state.salesResult = {
    sold,
    stocked,
    revenue,
    cogs,
    inventoryFee,
    profit,
    stockNote,
    price: price.price,
  };
  state.phase = 'sales';
  if (state.cash < 0) {
    state.phase = 'bust';
    state.bustReason = '卖完一个月还是欠钱。价格、成本和备货没算明白。';
  }
}

export function goNextGen(state) {
  state.generation += 1;
  state.product = null;
  state.supplierId = null;
  state.stockId = null;
  state.slots = emptySlots();
  state.monthsLeft = 4;
  state.pendingEvent = null;
  state.launchPrepIds = [];
  state.launchBeatIndex = 0;
  state.launchScore = 0;
  state.mediaScore = 0;
  state.userScore = 0;
  state.headline = '';
  state.salesResult = null;
  state.hype = Math.max(0, Math.round(state.hype * 0.3));
  state.tip = `规划第 ${state.generation} 代：可选择是否绑定上代生态。`;
  state.phase = 'plan';
  // soft cannibalization hint via reputation already; faith carries over
}

export function manpowerCap(state) {
  return 5 + state.staff.filter((s) => s.assigned !== 'idle' && s.assigned !== 'launch').length;
}
