/**
 * v0.11 天使奇遇卡组：不只破产急救。
 * 约见 / 对赌 / 带渠道或供应链 / 看走眼；与融资档位挂钩；同梗冷却。
 */

import { financeTier, SAFE_CASH, CRITICAL_CASH, syncDebt } from './finance.js';
import { worldEraIdOf, eraAllowsEvent } from './eras/timeline.js';

function bookCash(state, label, v, note = '') {
  const n = Math.round(v);
  if (!n) return;
  state.cash += n;
  state.ledger ||= [];
  state.ledger.push({ m: state.month, gen: state.generation, label, v: n, note });
  if (state.ledger.length > 160) state.ledger = state.ledger.slice(-160);
}

/**
 * 奇遇卡。meme 用于同梗冷却；tiers 为空=任意档；need 额外条件。
 */
export const ANGEL_CARDS = [
  {
    id: 'coffee',
    meme: 'angel_meet',
    kind: '约见',
    title: '老周约你喝一杯美式',
    body: '他没带合同，只带了句：「你们这代机器，我倒想看看能走多远。」桌上的冰美式冒着冷气。',
    tiers: ['own', 'bank'],
    when: (st) => (st.cash ?? 0) < SAFE_CASH * 1.8 && st.generation >= 1,
    weight: 3,
    choices: [
      {
        label: '坦白现金流，请他指点',
        effect: { cash: 40, faith: 2, note: '天使小注' },
        epilogue: '老周拍了拍你：「先别死。这四十万当见面礼，下回带样机。」',
      },
      {
        label: '假装一切都好',
        effect: { hype: 4, faith: -1 },
        epilogue: '他笑了笑，没拆穿。账单你结。',
      },
      {
        label: '改约下周（其实想躲）',
        effect: { coolBoost: true },
        epilogue: '秘书回了个「好的」。咖啡凉了，机会也凉了半截。',
      },
    ],
  },
  {
    id: 'wager',
    meme: 'angel_bet',
    kind: '对赌',
    title: '对赌协议摊在桌上',
    body: '「下一代媒体分过 78，我加注；过不了，你把品牌溢价让我咬一口。」律师已经在翻手机。',
    tiers: ['bank', 'bridge', 'emergency'],
    when: (st) => st.generation >= 2 && (st.debt || 0) >= 0,
    weight: 2,
    choices: [
      {
        label: '签。目标媒体分 78+',
        effect: { cash: 120, wager: { media: 78, win: 40, loseFaith: -6, loseBrand: -0.06 }, note: '天使对赌注资' },
        epilogue: '老周签字很快：「别让我看走眼。」',
      },
      {
        label: '把门槛抬到 85，加码',
        effect: { cash: 180, wager: { media: 85, win: 60, loseFaith: -8, loseBrand: -0.08 }, note: '天使对赌加码' },
        epilogue: '「野心不错。」他多写了一行。',
      },
      {
        label: '不赌，慢慢熬',
        effect: { faith: 3 },
        epilogue: '合同收回去了。空气里只剩打印机的热味。',
      },
    ],
  },
  {
    id: 'channel',
    meme: 'angel_channel',
    kind: '渠道',
    title: '「我有个老朋友在连锁卖场」',
    body: '老周晃了晃通讯录：「想上主通道也可以。当然，人情不是白送的。」',
    tiers: ['own', 'bank', 'bridge'],
    when: (st) => st.month >= 4,
    weight: 2,
    choices: [
      {
        label: '请他牵线（付进场费）',
        effect: { cash: -35, mod: { demand: 1.12, months: 4, id: 'angel-channel' }, faith: 1, note: '渠道进场' },
        epilogue: '下周，卖场堆头多了一块你还没量产的海报。',
      },
      {
        label: '只要名单，自己谈',
        effect: { cash: -10, rep: 2, mod: { demand: 1.05, months: 2, id: 'angel-list' } },
        epilogue: '你拿到三串电话。其中两串是空号。',
      },
      {
        label: '婉拒：渠道要自己长出来',
        effect: { faith: 2, hype: -2 },
        epilogue: '他点头：「也行。骨头硬一点好。」',
      },
    ],
  },
  {
    id: 'supply',
    eras: ['smart', 'fold', 'smart_dawn'],
    meme: 'angel_supply',
    kind: '供应链',
    title: '铰链厂老板是他同学',
    body: '「良率这件事，认识人比认识图纸管用。」他已经把名片推到你面前。',
    tiers: ['bank', 'bridge', 'emergency', 'angel'],
    when: (st) => st.month >= 8 || (st.design?.formFactor || '').startsWith('fold'),
    weight: 2,
    choices: [
      {
        label: '认亲，锁一季优先产能',
        effect: { cash: -50, mod: { yield: 1.08, months: 5, id: 'angel-supply' }, note: '供应链人情' },
        epilogue: '实验室良率表上，红字少了一截。',
      },
      {
        label: '只要样品通道',
        effect: { cash: -20, slotBonus: { design: 6 }, months: 0 },
        epilogue: '三台工程机提前到了。有一台合盖合不拢。',
      },
      {
        label: '不靠关系',
        effect: { faith: 2, rep: 1 },
        epilogue: '名片原路退回。采购同事看你的眼神复杂了一点。',
      },
    ],
  },
  {
    id: 'misjudge',
    meme: 'angel_miss',
    kind: '看走眼',
    title: '他投了你的友商',
    body: '朋友圈里：老周站在友商发布会后台比耶。配文「这次没看走眼」。评论区有人 @ 你。',
    tiers: ['own', 'bank', 'bridge', 'emergency', 'angel'],
    when: (st) => st.month >= 6,
    weight: 2,
    choices: [
      {
        label: '发条阴阳：恭喜',
        effect: { hype: 8, faith: -3, rep: -2 },
        epilogue: '转发三千。公关连夜删评论。',
      },
      {
        label: '埋头把下一代做绝',
        effect: { cash: -40, slotBonus: { perf: 8, camera: 4 }, faith: 2 },
        epilogue: '实验室灯又亮了一夜。你把截图扔进回收站。',
      },
      {
        label: '请他吃饭，听听为什么',
        effect: { cash: -15, faith: 1, tip: true },
        epilogue: '「不是你不行，是他们更会讲故事。」你记下了四个字：会讲故事。',
      },
    ],
  },
  {
    id: 'bridge_angel',
    meme: 'angel_bridge',
    kind: '过桥',
    title: '「银行那笔我帮你垫三周」',
    body: '过桥条件写得很干净：三周后还，外加一次董事会旁听权。他笑称自己只是临时出纳。',
    tiers: ['bridge', 'emergency'],
    when: (st) => (st.cash ?? 0) < SAFE_CASH || (st.debt || 0) > 80,
    weight: 2,
    choices: [
      {
        label: '收下过桥款',
        effect: { cash: 90, debtSoft: 90, note: '天使过桥' },
        epilogue: '账上数字跳了一下。日历上多了一个红圈。',
      },
      {
        label: '只要背书，不要现金',
        effect: { rep: 4, brand: 0.03 },
        epilogue: '银行客户经理的语气软了半度。',
      },
      {
        label: '自力更生',
        effect: { faith: 3 },
        epilogue: '你推回支票夹。手心有点潮。',
      },
    ],
  },
  {
    id: 'soft_rescue',
    meme: 'angel_soft',
    kind: '关怀',
    title: '「别死在发薪日」',
    body: '你还没破产，但他已经闻到味道。信封不厚，字条只有一句：先把工资发了。',
    tiers: ['own', 'bank', 'angel'],
    when: (st) => (st.cash ?? 0) < CRITICAL_CASH + 30 && (st.cash ?? 0) > 0 && !st.rescued,
    weight: 2,
    choices: [
      {
        label: '收下，记人情',
        effect: { cash: 70, faith: 1, note: '天使关怀金' },
        epilogue: '财务群里的红包提示音响了。没有人问来源。',
      },
      {
        label: '只要延期供应商账期的电话',
        effect: { cash: 0, mod: { cost: 0.96, months: 3, id: 'angel-terms' }, rep: 1 },
        epilogue: '采购总监回了个「已读」。账期真的松了七天。',
      },
      {
        label: '谢谢，我们还撑得住',
        effect: { faith: 4, hype: 2 },
        epilogue: '信封退回。他临走丢下一句：「撑不住再打。」',
      },
    ],
  },
];

export function angelById(id) {
  return ANGEL_CARDS.find((c) => c.id === id);
}

function tierOk(card, state) {
  if (!card.tiers || !card.tiers.length) return true;
  return card.tiers.includes(financeTier(state));
}

/** 可抽卡池（同梗冷却 + 档位 + when） */
export function angelPool(state) {
  const cool = new Set(state.recentMemes || []);
  const wid = worldEraIdOf(state);
  return ANGEL_CARDS.filter((c) => {
    if (c.meme && cool.has(c.meme)) return false;
    if (!tierOk(c, state)) return false;
    if (c.when && !c.when(state)) return false;
    if (state.lastAngelId === c.id) return false;
    if (!eraAllowsEvent(c.eras, wid)) return false;
    return true;
  });
}

/**
 * 尝试触发奇遇。返回是否进入 angel 阶段。
 * chance 基础很低；现金承压时抬高；同月不刷。
 */
export function rollAngel(state, { force = false } = {}) {
  if (state.pendingAngel || state.phase === 'angel' || state.phase === 'rescue' || state.phase === 'bust') return null;
  if (state.lastAngelMonth === state.month && !force) return null;
  const pool = angelPool(state);
  if (!pool.length) return null;
  let chance = 0.08;
  if ((state.cash ?? 0) < SAFE_CASH) chance = 0.22;
  if ((state.cash ?? 0) < CRITICAL_CASH) chance = 0.32;
  if ((state.debt || 0) > 150) chance += 0.06;
  if (state.rescued) chance += 0.04;
  if (!force && Math.random() > chance) return null;
  const weights = pool.flatMap((c) => Array(c.weight || 1).fill(c));
  const card = weights[Math.floor(Math.random() * weights.length)];
  state.pendingAngel = card.id;
  state.lastAngelMonth = state.month;
  state.phase = 'angel';
  return card;
}

export function applyAngelChoice(state, choiceIndex) {
  const card = angelById(state.pendingAngel);
  if (!card) return { ok: false, msg: '奇遇已过期' };
  const choice = card.choices[choiceIndex];
  if (!choice) return { ok: false, msg: '没有这个选项' };
  const eff = choice.effect || {};
  if (eff.cash) bookCash(state, eff.note || `天使·${card.kind}`, eff.cash, card.title);
  if (eff.faith) state.faith = Math.max(0, Math.min(100, state.faith + eff.faith));
  if (eff.rep) state.reputation = Math.max(0, Math.min(100, state.reputation + eff.rep));
  if (eff.hype) state.hype = Math.max(0, state.hype + eff.hype);
  if (eff.brand) state.brand = Math.max(0.7, Math.min(1.25, (state.brand || 1) + eff.brand));
  if (eff.debtSoft) {
    // 软负债：记一笔天使过桥，三个月后从现金扣（简化为加入短期 loan）
    state.loans = [
      ...(state.loans || []),
      {
        id: `angel-soft-${state.month}`,
        productId: 'angel_soft',
        name: '天使过桥偿还',
        tier: 'bridge',
        principal: eff.debtSoft,
        rate: 0.01,
        term: 3,
        left: 3,
        opened: state.month,
      },
    ];
    syncDebt(state);
  }
  if (eff.mod) {
    state.mods = [...(state.mods || []).filter((m) => m.id !== eff.mod.id), { ...eff.mod, left: eff.mod.months }];
  }
  if (eff.slotBonus && state.slots) {
    for (const [k, v] of Object.entries(eff.slotBonus)) {
      if (!state.slots[k]) continue;
      state.slots[k].progress = Math.min(100, (state.slots[k].progress || 0) + v);
    }
  }
  if (eff.wager) {
    state.angelWager = { ...eff.wager, from: card.id, month: state.month };
  }
  if (card.meme) {
    state.recentMemes = [...(state.recentMemes || []).filter((m) => m !== card.meme), card.meme].slice(-4);
  }
  state.lastAngelId = card.id;
  state.angelResult = { title: card.title, epilogue: choice.epilogue || '', kind: card.kind };
  state.pendingAngel = null;
  // 回到研发或规划
  if (state.monthsLeft > 0 && state.slots) state.phase = 'dev';
  else if (state.phase === 'angel') state.phase = state.angelBack || 'dev';
  state.angelBack = null;
  return { ok: true, epilogue: choice.epilogue, card };
}

/** 发布会评分后结算对赌 */
export function resolveAngelWager(state, mediaScore) {
  const w = state.angelWager;
  if (!w) return null;
  state.angelWager = null;
  if (mediaScore >= w.media) {
    if (w.win) bookCash(state, '天使对赌兑现', w.win, `媒体分 ${mediaScore} ≥ ${w.media}`);
    return { ok: true, win: true, msg: `对赌打赢了。老周按约再打了 ¥${w.win} 万。` };
  }
  if (w.loseFaith) state.faith = Math.max(0, state.faith + w.loseFaith);
  if (w.loseBrand) state.brand = Math.max(0.7, (state.brand || 1) + w.loseBrand);
  return { ok: true, win: false, msg: `对赌没到线（${mediaScore}/${w.media}）。人情比利息贵。` };
}
