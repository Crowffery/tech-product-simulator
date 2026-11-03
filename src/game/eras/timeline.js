/**
 * v0.15 世界时代时间轴：完整编年（60 月）与快速局（36 月）。
 */
export const WORLD_ERAS = {
  keypad: { id: 'keypad', name: '按键时代', color: '#9bbc0f', blurb: '走量、耐用、铃声与营业厅。先把大家买得起、摔不坏的手机做出来。' },
  smart_dawn: { id: 'smart_dawn', name: '智能机萌芽', color: '#5dade2', blurb: '触屏开始改写规则。厚直板智能机登场，转型还是坚守？' },
  smart: { id: 'smart', name: '智能机时代', color: '#f5b041', blurb: '直板触控成为主流。芯片代差决定心理价位。' },
  fold: { id: 'fold', name: '折叠兴起', color: '#e67e22', blurb: '铰链与柔性屏上场。高端突破，良率也跟着上场。' },
};

/** @type {{ chronicle: object[], quick: object[] }} */
export const TIMELINES = {
  chronicle: [
    { id: 'keypad', from: 1, to: 18 },
    { id: 'smart_dawn', from: 19, to: 30 },
    { id: 'smart', from: 31, to: 48 },
    { id: 'fold', from: 49, to: 60 },
  ],
  quick: [
    { id: 'keypad', from: 1, to: 9 },
    { id: 'smart', from: 10, to: 21 },
    { id: 'fold', from: 22, to: 36 },
  ],
};

/** 形态解锁月（按模式） */
export const FORM_UNLOCK = {
  chronicle: {
    feature: 1, elder: 1, flip: 3, slider: 7, swivel: 13,
    thick: 19, bar: 31, wide: 36, fold_s: 49, fold_l: 54,
  },
  quick: {
    feature: 1, elder: 1, flip: 2, slider: 5, swivel: 8,
    thick: 1, bar: 10, wide: 14, fold_s: 22, fold_l: 28,
  },
};

export function modeOf(state) {
  return state?.mode === 'chronicle' ? 'chronicle' : 'quick';
}

export function runMonths(state) {
  return modeOf(state) === 'chronicle' ? 60 : 36;
}

export function worldEraIdOf(stateOrMonth, mode) {
  const month = typeof stateOrMonth === 'object' ? stateOrMonth.month || 1 : stateOrMonth;
  const m = mode || (typeof stateOrMonth === 'object' ? modeOf(stateOrMonth) : 'quick');
  const row = TIMELINES[m].find((e) => month >= e.from && month <= e.to) || TIMELINES[m][TIMELINES[m].length - 1];
  return row.id;
}

export function worldEraOf(state) {
  const id = worldEraIdOf(state);
  return WORLD_ERAS[id] || WORLD_ERAS.keypad;
}

export function formUnlockMonth(formId, mode = 'quick') {
  const table = FORM_UNLOCK[mode] || FORM_UNLOCK.quick;
  return table[formId] ?? 999;
}

/** 制式世界档位：0 GSM 1 GPRS 2 EDGE 3 3G */
export function networkWorldLevel(month, mode = 'quick', flags = {}) {
  if (mode === 'chronicle') {
    if (month >= 19 && flags.license3g !== false) return 3;
    if (month >= 12) return 2;
    if (month >= 6) return 1;
    return 0;
  }
  if (month >= 10) return 3; // quick：第 10 月起切芯片竞赛，制式视为已过
  if (month >= 7) return 2;
  if (month >= 4) return 1;
  return 0;
}

export function eraAllowsEvent(eras, worldEraId) {
  if (!eras || !eras.length) return true;
  // smart_dawn 同时可出 keypad 残留与 smart 萌芽事件
  if (worldEraId === 'smart_dawn') {
    return eras.includes('keypad') || eras.includes('smart') || eras.includes('smart_dawn');
  }
  return eras.includes(worldEraId);
}

export const KEYPAD_DEMAND_FORMS = ['feature', 'flip', 'slider', 'swivel'];

/**
 * 行业时钟：现代内容（芯片代数、竞品跑分 / 价格、现代概念件出现时间）都是按快速局 36 个月校准的。
 * 编年模式下把「当前月」换算成快速局的等效月份，智能机萌芽 ≈ 快速局第 9 月，折叠兴起 ≈ 第 22 月。
 */
const CHRONICLE_TO_QUICK = [
  [1, 1],
  [19, 9],
  [31, 10],
  [36, 14],
  [49, 22],
  [54, 28],
  [60, 36],
];
export function industryMonth(stateOrMonth, mode) {
  const month = typeof stateOrMonth === 'object' ? stateOrMonth?.month || 1 : stateOrMonth || 1;
  const m = mode || (typeof stateOrMonth === 'object' ? modeOf(stateOrMonth) : 'quick');
  if (m !== 'chronicle') return month;
  const P = CHRONICLE_TO_QUICK;
  if (month >= P[P.length - 1][0]) return P[P.length - 1][1] + (month - P[P.length - 1][0]);
  for (let i = 1; i < P.length; i++) {
    const [a0, b0] = P[i - 1];
    const [a1, b1] = P[i];
    if (month <= a1) return Math.round(b0 + ((month - a0) / (a1 - a0)) * (b1 - b0));
  }
  return month;
}

/** 按键时钟：按键概念件按编年第 1–18 月校准；快速局按键时代只有 9 个月，换算成编年等效月份 */
export function keypadMonth(stateOrMonth, mode) {
  const month = typeof stateOrMonth === 'object' ? stateOrMonth?.month || 1 : stateOrMonth || 1;
  const m = mode || (typeof stateOrMonth === 'object' ? modeOf(stateOrMonth) : 'quick');
  return m === 'chronicle' ? month : month * 2;
}
