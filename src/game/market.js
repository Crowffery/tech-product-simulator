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
  flagship: { perf: 25, design: 20, camera: 30, battery: 10, os: 15 },
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
  const ideal = IDEAL[positioningId] || IDEAL.mainstream;
  const sh = shares(slots);
  const dist = SLOTS.reduce((a, s) => a + Math.abs(sh[s.id] - ideal[s.id]), 0);
  const match = Math.max(0, 1 - dist / 100);
  const mult = 0.7 + 0.45 * Math.max(0, Math.min(1, (match - 0.6) / 0.35));
  const verdict = SLOTS.map((s) => {
    const d = sh[s.id] - ideal[s.id];
    return { id: s.id, name: s.name, share: Math.round(sh[s.id]), ideal: ideal[s.id], v: d > 4 ? 'more' : d < -4 ? 'less' : 'ok' };
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
  price: { name: '性价比刺客', test: (st) => st.product.priceId === 'low' },
};

export function promiseCheck(state, phys) {
  return state.product.pointIds.map((id) => {
    const r = POINT_RULES[id];
    return { id, name: r?.name || id, ok: r ? r.test(state, phys) : true };
  });
}

/** 价格 × 定位：合理价带与偏离代价 */
const FIT = { flagship: ['high'], pro: ['high'], mainstream: ['mid'], minimal: ['low', 'mid'] };
const BAND_IDX = { low: 0, mid: 1, high: 2 };

export function priceFit(positioningId, priceId) {
  const ok = FIT[positioningId] || ['mid'];
  if (ok.includes(priceId)) return { d: 0, user: 0, note: '' };
  const best = ok.map((b) => BAND_IDX[b]);
  const p = BAND_IDX[priceId];
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
  const sold = ms.reduce((a, m) => a + (m.sold || 0), 0);
  const titles = [];
  if (firsts >= 5) titles.push({ t: '潮流定义者', d: `首创 ${firsts} 项，竞品都在抄你` });
  if (avgWow >= 55) titles.push({ t: '惊艳制造机', d: `平均惊艳度 ${Math.round(avgWow)}` });
  if (maxBuzz >= 45) titles.push({ t: '出圈狂魔', d: `单代出圈度 ${maxBuzz}` });
  if (state.overstocks >= 2) titles.push({ t: '仓库传说', d: `积压了 ${state.overstocks} 次` });
  if (state.cash >= 400) titles.push({ t: '印钞机', d: `账上躺着 ${state.cash}` });
  if (minors >= Math.max(3, ms.length - 1)) titles.push({ t: '挤牙膏之王', d: `${minors} 代小改款` });
  if (state.rescued && state.cash >= 150) titles.push({ t: '绝地翻盘', d: '差点倒闭，最后把投资人的钱挣回来了' });
  if (!titles.length) titles.push({ t: '稳健经营者', d: '不惊艳，但活下来了' });
  return { titles, stats: { gens: ms.length, firsts, avgWow: Math.round(avgWow), sold, cash: state.cash } };
}

export const RUN_MONTHS = 36;

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
