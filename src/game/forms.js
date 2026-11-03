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
    tag: '按键党',
    desc: '实体键盘、小屏、便宜耐造。影像别指望。',
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
    desc: '字大、键大、续航长。不是潮流，是刚需。',
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
    tag: '啪一声',
    desc: '上盖主屏、下盖键盘。合盖护屏，开盖仪式感。',
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
    tag: '咔哒',
    desc: '屏幕上滑露出键盘。厚一点，但很酷。',
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
    tag: '彩蛋',
    desc: '屏幕绕轴转 180°。时尚定位加成，良率随缘。',
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
    tag: '砖头',
    desc: '厚实直板智能机雏形。电池和散热都老实。',
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
    desc: '你认知里的「手机」：直板、触控、均衡。',
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
    desc: '更宽更沉的直板，看片杀器，单手党退散。',
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
    desc: '合盖半宽厚砖，展开双宽。铰链会说话。',
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
    desc: '更大的折叠平板感。卖点狠，良率也狠。',
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

export function eraOfMonth(month = 1) {
  const m = Math.max(1, month | 0);
  return FORM_ERAS.find((e) => m >= e.from && m <= e.to) || FORM_ERAS[FORM_ERAS.length - 1];
}

export function formUnlocked(id, month = 1) {
  const f = formOf(id);
  return (month || 1) >= (f?.unlockMonth || 999);
}

export function availableForms(month = 1) {
  return FORM_FACTORS.filter((f) => formUnlocked(f.id, month));
}

/** 默认形态：早期厚直板；已过智能机时代则默认直板 */
export function defaultFormId(month = 1) {
  if (formUnlocked('bar', month)) return 'bar';
  return 'thick';
}

export function formUnlockText(f, month = 1) {
  if (formUnlocked(f.id, month)) return '已解锁';
  const y = Math.floor((f.unlockMonth - 1) / 12) + 1;
  const mo = ((f.unlockMonth - 1) % 12) + 1;
  return `${y}年${mo}月解锁 · ${f.hint || ''}`;
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
export function formAllowsConcept(formId, conceptId, month = 1) {
  const foldish = new Set(['fold', 'trifold', 'rollable', 'slider', 'swivel', 'wrap']);
  if (!foldish.has(conceptId)) return true;
  const f = formOf(formId);
  if (conceptId === 'fold' || conceptId === 'trifold' || conceptId === 'rollable') {
    return !!(f?.fold && formUnlocked(formId, month));
  }
  // 滑盖 / 旋转 / 环绕：智能机时代起，且非功能机/老年机
  if (f?.id === 'feature' || f?.id === 'elder') return false;
  if (conceptId === 'slider' || conceptId === 'swivel') return formUnlocked('bar', month) && (month || 1) >= 16;
  if (conceptId === 'wrap') return formUnlocked('fold_s', month);
  return true;
}

/** 时间轴 UI 用的节点（含锁定态） */
export function formTimeline(month = 1) {
  const era = eraOfMonth(month);
  return {
    era,
    eras: FORM_ERAS.map((e) => ({
      ...e,
      active: e.id === era.id,
      reached: month >= e.from,
    })),
    forms: FORM_FACTORS.map((f) => ({
      ...f,
      unlocked: formUnlocked(f.id, month),
      unlockText: formUnlockText(f, month),
    })),
  };
}
