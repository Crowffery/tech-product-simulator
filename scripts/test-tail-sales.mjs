/**
 * 自测：持续销售收入 + 首月≠终身一把结 + UI 字段存在
 * 运行：node scripts/test-tail-sales.mjs
 */
import { readFileSync } from 'fs';
import { sellTail, advanceMonth, onSaleIncomeOf, balancedAllocation, LIFE_MONTHS, shelfSell, modelTailValue, finalizeScores, unlockConcept } from '../src/game/logic.js';
import { createNewGame } from '../src/game/state.js';

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const state = createNewGame('测试厂');
state.phase = 'dev';
state.generation = 2;
state.month = 14;
state.monthsLeft = 4;
state.cash = 800;
state.product = { positioningId: 'flagship', name: '测试机2', price: 4999, priceId: 'high' };
state.supplierId = 'mid';
state.models = [
  { gen: 1, design: { modelName: '蜂鸟 1' }, sold: 40, lifeSold: 40, lifeProfit: 120 },
];
state.onSale = [
  {
    name: '蜂鸟 1',
    color: '#5aa9d6',
    pos: 'flagship',
    gen: 1,
    d0: 40,
    wom: 0.05,
    comp: 1,
    boost: 1,
    age: 1,
    price: 4999,
    unitCost: 2400,
    unitMargin: 18,
    months: LIFE_MONTHS,
    backlog: 5,
    cap: 30,
    firstProfit: 120,
    profit: 0,
    total: 0,
    history: [40],
  },
];

const firstProfit = state.onSale[0].firstProfit;
const remaining = modelTailValue(state.onSale[0]);
assert(LIFE_MONTHS >= 18, `生命周期应 ≥18 月，got ${LIFE_MONTHS}`);
assert(remaining > firstProfit, `剩余生命周期价值应大于首月（首月≠一把结清）：首月 ${firstProfit} vs 剩余 ${remaining}`);
assert(firstProfit / (firstProfit + remaining) < 0.45, `首月占比应明显小于一半，got ${((firstProfit / (firstProfit + remaining)) * 100).toFixed(1)}%`);

const cash0 = state.cash;
const life0 = state.models[0].lifeProfit;
const monthly = [];
for (let i = 0; i < 3; i++) {
  const before = state.cash;
  const tail = sellTail(state);
  monthly.push(tail.income);
  assert(tail.income > 0, `第 ${i + 1} 月应有在售收入`);
  assert(state.cash === before + tail.income, '月度 book 应增加现金');
  assert(
    (state.ledger || []).some((e) => e.label.startsWith('在售·') && e.v === tail.income || e.label.startsWith('在售·')),
    '账本应有「在售·」条目',
  );
}
assert(monthly.every((x) => x > 0), '连续三个月都应有月度在售收入');
assert(monthly.reduce((a, b) => a + b, 0) !== firstProfit, '月度续销合计不应等于首月一把结');
assert(state.models[0].lifeProfit > life0, 'lifeProfit 应随月度续销上升');
assert(onSaleIncomeOf(state, 2) > 0, '本代应汇总到跨代续销');

const shelf = shelfSell(state, 2);
assert(shelf.months === 2 && shelf.income > 0, '货架月应按月进账');

// UI 源码断言：累计利润 / 拆解卡片 / 信仰口碑分叉文案
const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
assert(ui.includes('累计利润'), 'UI 应展示累计利润');
assert(ui.includes('rpGainBlock') && ui.includes('lastRpBreak'), 'UI 应有研发点进账拆解');
assert(ui.includes('statFx'), 'UI 应有 HUD 飞字');
assert(ui.includes('铁粉') || ui.includes('用户评分 → 信仰'), '信仰/口碑文案应去撞名');
assert(ui.includes('stat-fork') || ui.includes('大众口碑'), '战报应展示口碑/信仰分叉');

const logic = readFileSync(new URL('../src/game/logic.js', import.meta.url), 'utf8');
assert(logic.includes('lastRpBreak'), 'logic 应写入 lastRpBreak');
assert(logic.includes('口碑 -3') || logic.includes('reputation - 3'), '清仓应重伤口碑');
assert(logic.includes('faith + 4') || logic.includes('信仰 +4'), '以旧换新应养信仰');

console.log('OK', {
  lifeMonths: LIFE_MONTHS,
  firstProfit,
  remainingLife: remaining,
  firstShare: `${((firstProfit / (firstProfit + remaining)) * 100).toFixed(1)}%`,
  monthly,
  shelfIncome: shelf.income,
  cashGain: state.cash - cash0,
  lifeProfit: state.models[0].lifeProfit,
});
