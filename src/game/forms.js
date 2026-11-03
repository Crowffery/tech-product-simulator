import { formUnlockMonth, modeOf, TIMELINES, WORLD_ERAS, worldEraOf } from './eras/timeline.js';

/**
 * v0.11 开罗式形态时间轴：按游戏月份解锁机身形态，开局不是全家桶。
 * 现阶段只做手机；平板 / 电脑后置。
 */

export const FORM_ERAS = [
  { id: 'early', name: '起步年代', from: 1, to: 9, blurb: '功能机与厚砖头，先把成本讲清楚' },
  { id: 'smart', name: '智能机时代', from: 10, to: 21, blurb: '直板智能机成为主流' },
  { id: 'fold', name: '折叠兴起', from: 22, to: 36, blurb: '铰链与柔性屏上场' },
];

/**
 * 机身形态（chassis）。unlockMonth = 首次可点选的游戏月。
 * mods 影响 physical / slotCaps；fold 形态会驱动 3D 开合。
 */
export const FORM_FACTORS = [
  {
    id: 'feature',
    name: '功能机',
    icon: '📟',
    era: 'early',
    unlockMonth: 1,
    tag: '按键机',
    desc: '小屏、实体键盘、便宜耐用。打电话发短信就够了。',
    hint: '开局就能做',
    sizePrefer: 0,
    screenPrefer: 'bezel',
    thickAdd: 1.8,
    costMul: 0.72,
    caps: { camera: -18, design: -8, battery: 6, os: -12 },
    fold: false,
    buzz: 2,
  },
  {
    id: 'elder',
    name: '老年机',
    icon: '🧓',
    era: 'early',
    unlockMonth: 1,
    tag: '大按键',
    desc: '字大、键大、声音大，待机长。买给爸妈的手机。',
    hint: '开局就能做',
    sizePrefer: 1,
    screenPrefer: 'bezel',
    thickAdd: 2.2,
    costMul: 0.68,
    caps: { camera: -22, design: -10, battery: 12, os: -16 },
    fold: false,
    buzz: 1,
  },
  {
    id: 'flip',
    name: '翻盖',
    icon: '📱',
    era: 'early',
    unlockMonth: 2,
    tag: '翻盖',
    desc: '上半是屏幕，下半是键盘。合上护着屏幕，翻开就能接听。',
    hint: '约第 2 月解锁',
    sizePrefer: 1,
    screenPrefer: 'bezel',
    thickAdd: 1.2,
    costMul: 0.85,
    caps: { design: 10, camera: -10, battery: 2, os: -6 },
    fold: false,
    keypadArchetype: 'flip',
    buzz: 5,
  },
  {
    id: 'slider',
    name: '滑盖',
    icon: '↕️',
    era: 'early',
    unlockMonth: 5,
    tag: '滑盖',
    desc: '屏幕往上一推，露出键盘。比直板厚一点，但更有派头。',
    hint: '约第 5 月解锁',
    sizePrefer: 1,
    screenPrefer: 'bezel',
    thickAdd: 1.6,
    costMul: 0.88,
    caps: { design: 8, camera: -8, battery: 0, os: -4 },
    fold: false,
    keypadArchetype: 'slider',
    buzz: 4,
  },
  {
    id: 'swivel',
    name: '旋转屏',
    icon: '🔄',
    era: 'early',
    unlockMonth: 8,
    tag: '旋转屏',
    desc: '屏幕能转 180 度。外观最抢眼，做工也最难。',
    hint: '约第 8 月解锁',
    sizePrefer: 1,
    screenPrefer: 'bezel',
    thickAdd: 1.0,
    costMul: 0.95,
    caps: { design: 12, camera: -6, battery: -2, os: -4 },
    fold: false,
    keypadArchetype: 'swivel',
    buzz: 8,
  },
  {
    id: 'thick',
    name: '厚直板',
    icon: '🧱',
    era: 'early',
    unlockMonth: 1,
    tag: '厚直板',
    desc: '第一代触屏智能机：机身厚，但电池和散热都稳。',
    hint: '默认起步形态',
    sizePrefer: 1,
    screenPrefer: 'bezel',
    thickAdd: 1.4,
    costMul: 0.9,
    caps: { camera: -4, design: -2, battery: 4 },
    fold: false,
    buzz: 0,
  },
  {
    id: 'bar',
    name: '直板智能机',
    icon: '📱',
    era: 'smart',
    unlockMonth: 10,
    tag: '主流',
    desc: '直板、全触控、各方面均衡——大多数手机的样子。',
    hint: '约第 1 年末解锁',
    sizePrefer: 1,
    screenPrefer: 'punch',
    thickAdd: 0,
    costMul: 1,
    caps: {},
    fold: false,
    buzz: 0,
  },
  {
    id: 'wide',
    name: '阔直板',
    icon: '▭',
    era: 'smart',
    unlockMonth: 14,
    tag: '大屏',
    desc: '更宽更重的直板，看视频舒服，单手不好拿。',
    hint: '约第 2 年中解锁',
    sizePrefer: 2,
    sizeMin: 1,
    screenPrefer: 'punch',
    thickAdd: 0.2,
    costMul: 1.05,
    caps: { design: 4, battery: -2 },
    fold: false,
    buzz: 1,
  },
  {
    id: 'fold_s',
    name: '小折',
    icon: '📖',
    era: 'fold',
    unlockMonth: 22,
    tag: '书本折',
    desc: '合上像一台厚一点的手机，打开是一块小平板。铰链是难点。',
    hint: '约第 2 年末解锁',
    sizePrefer: 0,
    screenPrefer: 'full',
    thickAdd: 0,
    costMul: 1.35,
    caps: { design: 10, battery: -6 },
    fold: true,
    foldKind: 'fold',
    buzz: 8,
  },
  {
    id: 'fold_l',
    name: '阔折',
    icon: '📕',
    era: 'fold',
    unlockMonth: 28,
    tag: '大折',
    desc: '展开就是平板。卖点最强，良品率也最难做。',
    hint: '约第 3 年中解锁',
    sizePrefer: 2,
    sizeMin: 1,
    screenPrefer: 'full',
    thickAdd: 0.4,
    costMul: 1.55,
    caps: { design: 16, battery: -10 },
    fold: true,
    foldKind: 'fold',
    buzz: 11,
  },
];

export const formOf = (id) => FORM_FACTORS.find((f) => f.id === id) || FORM_FACTORS.find((f) => f.id === 'thick');

/** @param {number|object} monthOrState */
export function eraOfMonth(monthOrState = 1) {
  if (monthOrState && typeof monthOrState === 'object') {
    const we = worldEraOf(monthOrState);
    const map = { keypad: 'early', smart_dawn: 'early', smart: 'smart', fold: 'fold' };
    const id = map[we.id] || 'early';
    return FORM_ERAS.find((e) => e.id === id) || FORM_ERAS[0];
  }
  const m = Math.max(1, monthOrState | 0);
  return FORM_ERAS.find((e) => m >= e.from && m <= e.to) || FORM_ERAS[FORM_ERAS.length - 1];
}

function resolveMonthMode(monthOrState, mode) {
  if (monthOrState && typeof monthOrState === 'object') {
    return { month: monthOrState.month || 1, mode: mode || modeOf(monthOrState) };
  }
  return { month: monthOrState || 1, mode: mode || 'quick' };
}

export function formUnlocked(id, monthOrState = 1, mode) {
  const { month, mode: m } = resolveMonthMode(monthOrState, mode);
  const unlock = formUnlockMonth(id, m);
  return month >= unlock;
}

export function availableForms(monthOrState = 1, mode) {
  return FORM_FACTORS.filter((f) => formUnlocked(f.id, monthOrState, mode));
}

/** 默认形态：编年早期功能机；快速局仍偏厚直板；已解锁直板则默认直板 */
export function defaultFormId(monthOrState = 1, mode) {
  const { month, mode: m } = resolveMonthMode(monthOrState, mode);
  if (formUnlocked('bar', month, m)) return 'bar';
  if (m === 'chronicle' && month < formUnlockMonth('thick', 'chronicle')) return 'feature';
  return 'thick';
}

export function formUnlockText(f, monthOrState = 1, mode) {
  const { month, mode: m } = resolveMonthMode(monthOrState, mode);
  const unlock = formUnlockMonth(f.id, m);
  if (month >= unlock) return '已解锁';
  const y = Math.floor((unlock - 1) / 12) + 1;
  const mo = ((unlock - 1) % 12) + 1;
  return `第 ${unlock} 个月出现（第 ${y} 年 ${mo} 月）`;
}

/** 选中形态时，把尺寸 / 开孔偏好落到设计稿（不硬改概念件，折叠由 applyFoldConcept 处理） */
export function applyFormToDesign(design, formId) {
  const f = formOf(formId);
  if (!design || !f) return design;
  design.formFactor = f.id;
  if (f.sizePrefer != null && design.parts) {
    const min = f.sizeMin ?? 0;
    design.parts.size = Math.max(min, f.sizePrefer);
  }
  if (f.screenPrefer) design.screenForm = f.screenPrefer;
  return design;
}

/** 折叠形态自动带上 fold 概念；离开折叠则卸下 fold/trifold/rollable（保留玩家其它概念） */
export function syncFoldConcepts(design) {
  const f = formOf(design?.formFactor);
  const foldIds = new Set(['fold', 'trifold', 'rollable']);
  let concepts = [...(design.concepts || [])];
  if (f?.fold) {
    if (!concepts.some((c) => foldIds.has(c) || c === 'slider' || c === 'swivel')) {
      concepts = [...concepts.filter((c) => !foldIds.has(c)), 'fold'];
    } else if (!concepts.includes('fold') && !concepts.includes('trifold') && !concepts.includes('rollable')) {
      concepts.push('fold');
    }
  } else {
    concepts = concepts.filter((c) => !foldIds.has(c));
  }
  design.concepts = concepts;
  return design;
}

/** 形态是否允许装备某概念（折叠类必须先解锁对应形态） */
export function formAllowsConcept(formId, conceptId, monthOrState = 1, mode) {
  const { month, mode: m } = resolveMonthMode(monthOrState, mode);
  const foldish = new Set(['fold', 'trifold', 'rollable', 'slider', 'swivel', 'wrap']);
  if (!foldish.has(conceptId)) return true;
  const f = formOf(formId);
  if (conceptId === 'fold' || conceptId === 'trifold' || conceptId === 'rollable') {
    return !!(f?.fold && formUnlocked(formId, month, m));
  }
  if (f?.id === 'feature' || f?.id === 'elder') return false;
  if (conceptId === 'slider' || conceptId === 'swivel') return formUnlocked('bar', month, m) && month >= (m === 'chronicle' ? 31 : 16);
  if (conceptId === 'wrap') return formUnlocked('fold_s', month, m);
  return true;
}

/** 时间轴 UI 用的节点（含锁定态）。可传 state 以读 mode。 */
export function formTimeline(monthOrState = 1, mode) {
  const { month, mode: m } = resolveMonthMode(monthOrState, mode);
  const era = eraOfMonth(monthOrState && typeof monthOrState === 'object' ? monthOrState : month);
  const erasSrc = m === 'chronicle'
    ? TIMELINES.chronicle.map((e) => ({ id: e.id, name: (WORLD_ERAS[e.id] || {}).name || e.id, from: e.from, to: e.to, blurb: (WORLD_ERAS[e.id] || {}).blurb || '' }))
    : FORM_ERAS;
  const activeId = era?.id || (m === 'chronicle' ? worldEraOf({ month, mode: m }).id : eraOfMonth(month).id);
  return {
    era: m === 'chronicle' ? { id: activeId, name: (WORLD_ERAS[activeId] || {}).name, from: 0, to: 0, blurb: (WORLD_ERAS[activeId] || {}).blurb } : era,
    eras: erasSrc.map((e) => ({
      ...e,
      active: e.id === activeId || (activeId === 'smart_dawn' && e.id === 'early'),
      reached: month >= e.from,
    })),
    forms: FORM_FACTORS.map((f) => ({
      ...f,
      unlockMonth: formUnlockMonth(f.id, m),
      unlocked: formUnlocked(f.id, month, m),
      unlockText: formUnlockText(f, month, m),
    })),
  };
}
