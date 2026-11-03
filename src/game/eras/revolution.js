/**
 * v0.15 智能机革命：编年模式第 19 月强制行业抉择。
 */
import { KEYPAD_DEMAND_FORMS } from './timeline.js';

export const REVOLUTION_EVENT = {
  id: 'smart_revolution',
  icon: '📺',
  title: '蓝莓发布「大屏触控手机」',
  body: '车库电视里，竞品蓝莓的发布会正在直播。电容屏、桌面图标、手指滑动——现场惊呼连连。普通按键机的好日子，可能要到头了。你怎么走？',
  choices: [
    {
      id: 'pivot',
      label: '全力转型做厚直板智能机',
      effect: { revolution: 'pivot' },
      blurb: '在售按键机需求立刻承压；首代触屏完成度 +10',
    },
    {
      id: 'dual',
      label: '双线并行：按键 + 触屏一起做',
      effect: { revolution: 'dual' },
      blurb: '半年内研发效率 −10%；两条线都要养活',
    },
    {
      id: 'hold',
      label: '坚守按键机 / 老年机刚需',
      effect: { revolution: 'hold' },
      blurb: '信仰 +8；按键下滑减缓，但首代触屏更难做好',
    },
  ],
};

/** 写入革命 mods / flags（任意选择都挂行业趋势衰减） */
export function applyRevolutionChoice(state, choiceId) {
  state.flags = state.flags || {};
  state.mods = state.mods || [];
  const from = Math.max(19, state.month | 0);
  // 行业趋势：普通按键机需求自革命月起每月 −3%，下限 25%；老年机不挂
  state.mods.push({
    key: 'demand',
    forms: [...KEYPAD_DEMAND_FORMS],
    decay: { perMonth: 0.03, from },
    floor: 0.25,
    id: 'rev-trend',
  });
  const id = choiceId || 'dual';
  state.revolution = id;
  state.flags.revolution = id;
  state.chronicle = state.chronicle || [];
  state.chronicle.push({ kind: 'revolution', month: state.month, choice: id, era: 'smart_dawn' });

  if (id === 'hold') {
    state.faith = Math.min(100, (state.faith || 50) + 8);
    // 与趋势相乘 ≈ −2%/月，直到第 36 月
    state.mods.push({
      key: 'demand',
      forms: [...KEYPAD_DEMAND_FORMS],
      decay: { perMonth: -0.01, from },
      until: 36,
      id: 'rev-hold',
    });
    state.flags.touchExp = -5;
  } else if (id === 'pivot') {
    state.mods.push({
      key: 'demand',
      forms: [...KEYPAD_DEMAND_FORMS],
      val: 0.8,
      until: from + 6,
      id: 'rev-pivot-hit',
    });
    state.flags.touchExp = 10;
    state.flags.pivotedSmart = true;
  } else {
    // dual
    state.mods.push({ key: 'rnd', val: 0.9, until: from + 6, id: 'rev-dual-rnd' });
    state.flags.touchExp = 0;
  }
  state.pendingRevolution = null;
  return state;
}

export function shouldTriggerRevolution(state) {
  if (!state || state.mode !== 'chronicle') return false;
  if (state.flags?.revolution || state.revolution) return false;
  if ((state.month || 1) < 19) return false;
  return true;
}
