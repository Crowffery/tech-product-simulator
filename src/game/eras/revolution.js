/**
 * v0.15 智能机革命：编年模式第 19 月强制行业抉择。
 */
import { KEYPAD_DEMAND_FORMS } from './timeline.js';

export const REVOLUTION_EVENT = {
  id: 'smart_revolution',
  icon: '📺',
  title: '蓝莓发布「大屏触控手机」',
  body: '办公室的电视里，蓝莓的发布会正在直播：一整块屏幕，没有键盘，手指一划就翻页。台下一片惊呼。你看了看桌上自己的按键机。接下来怎么走？',
  choices: [
    {
      id: 'pivot',
      label: '全力转型，做触屏智能机',
      effect: { revolution: 'pivot' },
      blurb: '老用户会觉得被抛弃，在售的按键机销量会掉一截；但团队会更早摸透触屏',
    },
    {
      id: 'dual',
      label: '两条腿走路：按键机和触屏机一起做',
      effect: { revolution: 'dual' },
      blurb: '两条线一起养，半年内研发会慢一些',
    },
    {
      id: 'hold',
      label: '守住按键机和老年机',
      effect: { revolution: 'hold' },
      blurb: '铁粉会更支持你，按键机掉得慢一点；但以后再做触屏会更吃力',
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
