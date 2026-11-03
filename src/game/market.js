import { packOf, productEraOf } from './eras/index.js';
import { modeOf, KEYPAD_DEMAND_FORMS, worldEraOf } from './eras/timeline.js';
import { KEYPAD_POINT_RULES, KEYPAD_IDEAL, KEYPAD_POS_BASE } from './eras/keypad.js';
/**
 * V4 市场规则（GAME_DESIGN §3.4）：纯函数，便于调平衡
 * - 理想配比与匹配度：研发怎么分配真正有影响
 * - 卖点承诺：说了就要做到
 * - 价格 × 定位：没有永远最优的价带
 * - 档期与竞品撞档：时间是真代价
 * - 期望线：每一代都要更好
 * - 3 年结局称号
 */
import { SLOTS } from './data.js';

/** 各定位的理想配比（%）：性能 / 外观 / 影像 / 续航 / 系统 */
export const IDEAL = {
  flagship: { perf: 22, design: 16, camera: 24, battery: 20, os: 18 },
  mainstream: { perf: 20, design: 20, camera: 20, battery: 25, os: 15 },
  minimal: { perf: 10, design: 35, camera: 10, battery: 30, os: 15 },
  pro: { perf: 30, design: 10, camera: 35, battery: 15, os: 10 },
};

export function shares(slots) {
  const total = SLOTS.reduce((a, s) => a + slots[s.id].progress, 0);
  if (!total) return Object.fromEntries(SLOTS.map((s) => [s.id, 20]));
  return Object.fromEntries(SLOTS.map((s) => [s.id, (slots[s.id].progress / total) * 100]));
}

/** 匹配度 0～1，与倍率 ×0.7～×1.15 */
export function matchOf(slots, positioningId) {
  const ideal = IDEAL[positioningId] || KEYPAD_IDEAL[positioningId] || IDEAL.mainstream;
  const sh = shares(slots);
  const dist = SLOTS.reduce((a, s) => a + Math.abs(sh[s.id] - (ideal[s.id] || 20)), 0);
  const match = Math.max(0, 1 - dist / 100);
  const mult = 0.7 + 0.45 * Math.max(0, Math.min(1, (match - 0.6) / 0.35));
  const verdict = SLOTS.map((s) => {
    const d = sh[s.id] - (ideal[s.id] || 20);
    return { id: s.id, name: s.name, share: Math.round(sh[s.id]), ideal: ideal[s.id] || 20, v: d > 4 ? 'more' : d < -4 ? 'less' : 'ok' };
  });
  return { match, mult, verdict };
}

/** 卖点承诺检查 */
export const POINT_RULES = {
  fast: { name: '性能猛兽', test: (st) => st.slots.perf.progress >= 70 },
  photo: { name: '影像叙事', test: (st) => st.slots.camera.progress >= 70 },
  battery: { name: '续航焦虑终结者', test: (st) => st.slots.battery.progress >= 70 },
  thin: { name: '极致轻薄', test: (st, phys) => phys.thickness <= 7.8 },
  eco: { name: '生态闭环', test: (st) => st.product.bindEco && st.slots.os.progress >= 60 },
  price: { name: '性价比刺客', test: (st) => (st.product.price && st.product.fair ? st.product.price <= st.product.fair * 0.92 : st.product.priceId === 'low') },
};

export function promiseCheck(state, phys) {
  const era = productEraOf(state.design || state.product?.formFactor);
  const rules = era === 'keypad' ? { ...POINT_RULES, ...KEYPAD_POINT_RULES } : POINT_RULES;
  return state.product.pointIds.map((id) => {
    const r = rules[id];
    return { id, name: r?.name || id, ok: r ? r.test(state, phys) : true };
  });
}

/** 价格 × 定位：合理价带与偏离代价 */
const FIT = { flagship: ['high'], pro: ['high'], mainstream: ['mid'], minimal: ['low', 'mid'] };
const BAND_IDX = { low: 0, mid: 1, high: 2 };

const FIT_KEYPAD = { parents: ['entry'], student: ['entry', 'mid'], biz: ['mid', 'high'], fashion: ['mid', 'high'] };
const BAND_IDX_K = { entry: 0, mid: 1, high: 2, low: 0 };

export function priceFit(positioningId, priceId, formFactor) {
  const keypad = formFactor && ['feature', 'elder', 'flip', 'slider', 'swivel'].includes(formFactor);
  const okMap = keypad ? FIT_KEYPAD : FIT;
  const idxMap = keypad ? BAND_IDX_K : BAND_IDX;
  const ok = okMap[positioningId] || (keypad ? ['mid'] : ['mid']);
  if (ok.includes(priceId)) return { d: 0, user: 0, note: '' };
  const best = ok.map((b) => idxMap[b]);
  const p = idxMap[priceId];
  if (p == null || !best.length) return { d: 0, user: 0, note: '' };
  const nearest = best.reduce((a, b) => (Math.abs(b - p) < Math.abs(a - p) ? b : a));
  const d = p - nearest;
  if (d > 0) return { d, user: -6 * d, note: d > 1 ? '贵得离谱' : '有点贵' };
  return { d, user: 2 * -d, note: '价格屠夫：口碑好，利润薄' };
}

/** 档期（按一年中的月份） */
export const WINDOWS = [
  { name: '年货季', months: [1, 2], mul: 1.2 },
  { name: '开学季', months: [9], mul: 1.25 },
  { name: '购物节', months: [11], mul: 1.35 },
  { name: '淡季', months: [6, 7], mul: 0.8 },
];

export const monthOfYear = (m) => ((m - 1) % 12) + 1;

export function windowAt(month) {
  const mo = monthOfYear(month);
  return WINDOWS.find((w) => w.months.includes(mo)) || null;
}

/** 下一个旺季档期（不含淡季） */
export function nextWindow(month) {
  for (let k = 0; k < 12; k++) {
    const w = windowAt(month + k);
    if (w && w.mul > 1) return { ...w, inMonths: k, month: month + k };
  }
  return null;
}

/** 竞品发布排期：每家约 6 个月一代，强度逐年上升 */
export const RIVAL_PLAN = [
  { brand: '蓝莓科技', pos: 'flagship', first: 5, every: 6, base: 62 },
  { brand: '方块数码', pos: 'pro', first: 3, every: 7, base: 58 },
  { brand: '极光移动', pos: 'mainstream', first: 8, every: 6, base: 55 },
];

export function rivalLaunches(fromMonth, toMonth) {
  const out = [];
  for (const r of RIVAL_PLAN) {
    for (let m = r.first; m <= toMonth; m += r.every) {
      if (m >= fromMonth) out.push({ ...r, month: m, power: r.base + Math.floor((m - 1) / 12) * 5, gen: Math.floor((m - r.first) / r.every) + 1 });
    }
  }
  return out.sort((a, b) => a.month - b.month);
}

/** 撞档：同定位、相差 ≤1 个月 */
export function clashAt(month, positioningId) {
  return rivalLaunches(month - 1, month + 1).find((r) => r.pos === positioningId) || null;
}

/** 期望线：上一代体验 / 年份通胀 */
export function expectationBar(state) {
  const year = Math.floor((state.month - 1) / 12);
  return Math.round(Math.max(42 + year * 4, (state.lastExp || 0) * 0.95));
}

/** 3 年结局称号 */
export function endingTitles(state) {
  const ms = state.models;
  const firsts = ms.reduce((a, m) => a + (m.firsts?.length || 0), 0);
  const avgWow = ms.length ? ms.reduce((a, m) => a + (m.wow || 0), 0) / ms.length : 0;
  const maxBuzz = Math.max(0, ...ms.map((m) => m.buzz || 0));
  const minors = ms.filter((m) => m.design.redesign === 'minor').length;
  const sold = ms.reduce((a, m) => a + (m.lifeSold || m.sold || 0), 0);
  const titles = [];
  if (firsts >= 5) titles.push({ t: '潮流定义者', d: `首创 ${firsts} 项，竞品都在抄你` });
  if (avgWow >= 55) titles.push({ t: '惊艳制造机', d: `平均惊艳度 ${Math.round(avgWow)}` });
  if (maxBuzz >= 45) titles.push({ t: '出圈狂魔', d: `单代出圈度 ${maxBuzz}` });
  if (state.overstocks >= 2) titles.push({ t: '仓库传说', d: `积压了 ${state.overstocks} 次` });
  if (state.cash >= 3000) titles.push({ t: '印钞机', d: `账上躺着 ¥${(state.cash / 100).toFixed(1)} 亿` });
  if (minors >= Math.max(3, ms.length - 1)) titles.push({ t: '挤牙膏之王', d: `${minors} 代小改款` });
  if (state.bestRank === 1) titles.unshift({ t: '市场第一', d: '从车库做到了国内出货量第一' });
  else if (state.bestRank && state.bestRank <= 3) titles.push({ t: '一线品牌', d: `出货量最高冲到第 ${state.bestRank}` });
  if ((state.assets || []).length >= 4) titles.push({ t: '全球化', d: `布局了 ${(state.assets || []).length} 项战略投资` });
  if ((state.chipLeads || 0) >= 2) titles.push({ t: '遥遥领先', d: `${state.chipLeads} 代产品的芯片领先行业` });
  if ((state.brand || 1) >= 1.2) titles.push({ t: 'Pro Max 定价大师', d: `品牌溢价 ×${state.brand.toFixed(2)}，卖得贵还有人排队` });
  if ((state.brand || 1) <= 0.85) titles.push({ t: '交个朋友', d: '价格屠夫，用户心中的「厚道」代名词' });
  if (state.rescued && state.cash >= 800) titles.push({ t: '绝地翻盘', d: '差点倒闭，最后把投资人的钱挣回来了' });
  // v0.15 编年称号
  const elderSold = ms.filter((m) => m.design?.formFactor === 'elder').reduce((a, m) => a + (m.lifeSold || m.sold || 0), 0);
  if (elderSold >= 300) titles.push({ t: '老年机之王', d: `老年机累计出货 ${Math.round(elderSold)} 万台` });
  if (state.revolution === 'pivot' && (state.flags?.pivotedSmart || ms.some((m) => m.month >= 19 && !['feature','elder','flip','slider','swivel'].includes(m.design?.formFactor)))) {
    titles.push({ t: '时代的弄潮儿', d: '智能机革命后迅速转型并站住脚跟' });
  }
  if (state.revolution === 'hold' && state.cash >= 400) titles.push({ t: '最后的按键机', d: '坚守按键机路线，仍然活到了结局' });
  const erasHit = new Set((state.chronicle || []).map((c) => c.era).filter(Boolean));
  if (erasHit.size >= 4 || (modeOf(state) === 'chronicle' && new Set(ms.map((m) => m.era).filter(Boolean)).size >= 3)) {
    titles.push({ t: '全时代玩家', d: '在多个世界时代都推出过产品' });
  }
  if (!titles.length) titles.push({ t: '稳健经营者', d: '不惊艳，但活下来了' });
  const years = modeOf(state) === 'chronicle' ? 5 : 3;
  return { titles, stats: { gens: ms.length, firsts, avgWow: Math.round(avgWow), sold, cash: state.cash, years, chronicle: state.chronicle || [] } };
}

export const RUN_MONTHS = 36; // quick 默认；编年请用 runMonths(state)
export function runMonths(state) {
  return modeOf(state) === 'chronicle' ? 60 : 36;
}

/** 同期竞品机型的跑分（跑分榜 / 发布会对比用） */
export function rivalPhones(month) {
  const year = Math.floor((month - 1) / 12);
  const rb = Math.round((1150000 * Math.pow(1.22, year)) / 1000) * 1000;
  return [
    { n: `蓝莓 ${15 + year}`, v: rb },
    { n: `方块 ${7 + year} Pro`, v: Math.round(rb * 0.82) },
    { n: `极光 ${4 + year}`, v: Math.round(rb * 0.6) },
    { n: `青橙 ${9 + year}`, v: Math.round(rb * 0.42) },
  ];
}

// ═════════════════════════ 定价 / 芯片竞争 ═════════════════════════

/** 各定位的基准心理价位（体验、新颖度、品牌、芯片会在此基础上浮动） */
export const POS_BASE_PRICE = { flagship: 5999, pro: 6499, mainstream: 3799, minimal: 2799 };

/** 价格尾数取 99 */
export const roundPrice = (v) => Math.max(999, Math.round(v / 100) * 100 - 1);

/** 价格越低，愿意掏钱的人群越大 */
export function marketSize(price) {
  return Math.max(0.45, Math.min(3.2, Math.pow(3999 / price, 1.3)));
}

/** 行业主流芯片代数：约 10 个月进一代 */
export const marketChipGen = (month) => 1 + Math.floor((month - 1) / 10);

/** 竞品在售机型价格（价格战期间友商降价） */
export function rivalPriceList(month, priceWar = false) {
  const year = Math.floor((month - 1) / 12);
  const k = Math.pow(1.03, year) * (priceWar ? 0.92 : 1);
  return [
    { brand: '蓝莓', model: `蓝莓 ${15 + year}`, pos: 'flagship', price: roundPrice(6999 * k) },
    { brand: '方块', model: `方块 ${7 + year} Pro`, pos: 'pro', price: roundPrice(6499 * k) },
    { brand: '极光', model: `极光 ${4 + year}`, pos: 'mainstream', price: roundPrice(3299 * k) },
    { brand: '青橙', model: `青橙 ${9 + year}`, pos: 'minimal', price: roundPrice(1999 * k) },
  ];
}

/** 实际售价 → 价位带（兼容旧逻辑） */
export const bandOf = (price) => (price < 2800 ? 'low' : price < 5200 ? 'mid' : 'high');
