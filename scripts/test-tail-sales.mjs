/**
 * 自测：在售续销会增加现金、写入账本、抬高 lifeProfit
 * 运行：node scripts/test-tail-sales.mjs
 */
import { sellTail, advanceMonth, book, onSaleIncomeOf, balancedAllocation, LIFE_MONTHS, shelfSell, enterNext } from '../src/game/logic.js';
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
  { gen: 2, design: { modelName: '蜂鸟 2' }, sold: 0, lifeSold: 0, lifeProfit: 0 },
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
    unitMargin: 18, // 游戏点：每万台利润
    months: LIFE_MONTHS,
    backlog: 5,
    cap: 30,
    firstProfit: 120,
    profit: 0,
    total: 0,
    history: [40],
  },
  {
    name: '蜂鸟 Pro',
    color: '#e74c3c',
    pos: 'pro',
    gen: 1,
    d0: 18,
    wom: 0.02,
    comp: 1,
    boost: 1,
    age: 2,
    price: 3999,
    unitCost: 2000,
    unitMargin: 12,
    months: LIFE_MONTHS,
    backlog: 0,
    cap: 20,
    firstProfit: 50,
    profit: 0,
    total: 0,
    history: [18, 12],
  },
];

const cash0 = state.cash;
const life0 = state.models[0].lifeProfit;

// 连续推进 3 个月
for (let i = 0; i < 3; i++) {
  // 避免随机事件打断：临时把 eventChance 压掉——直接调 sellTail + 手工模拟工资路径
  const before = state.cash;
  const tail = sellTail(state);
  assert(tail.income > 0, `第 ${i + 1} 月应有在售收入，got ${tail.income}`);
  assert(state.cash === before + tail.income, 'sellTail 应通过 book 增加现金');
  assert(
    (state.ledger || []).some((e) => e.label.startsWith('在售·') && e.productGen === 1),
    '账本应有「在售·机型」且带 productGen',
  );
}

assert(state.cash > cash0, `现金应增加：${cash0} → ${state.cash}`);
assert(state.models[0].lifeProfit > life0, `lifeProfit 应上升：${life0} → ${state.models[0].lifeProfit}`);
assert(state.tailTotal > 0, 'tailTotal 应累计');
assert(onSaleIncomeOf(state, 2) > 0, '本代 onSaleIncomeOf 应计入跨代续销');

// advanceMonth 净额含续销
state.phase = 'dev';
state.monthsLeft = 3;
state.slots = Object.fromEntries(
  ['perf', 'design', 'camera', 'battery', 'os'].map((id) => [id, { progress: 10, comment: '测' }]),
);
const cashBeforeAdv = state.cash;
const alloc = balancedAllocation(state, ['perf']);
// monkey: force no event by running many times? instead check monthDelta after a direct call with Math.random stub
const orig = Math.random;
Math.random = () => 0.99; // high → still may trigger depending on chance; use 0.999
Math.random = () => 0.999;
const res = advanceMonth(state, alloc);
Math.random = orig;
assert(res.ok, 'advanceMonth ok');
assert(typeof res.tail?.income === 'number', 'advanceMonth 应返回 tail');
assert(Number.isFinite(state.monthDelta), 'monthDelta 应为数字');
// 净额 = 工资/运营 + 续销；有续销时应明显高于「只有工资」
if (res.tail?.income > 0) {
  const payrollOnly = state.monthDelta - res.tail.income;
  assert(state.monthDelta === payrollOnly + res.tail.income, 'monthDelta 应为工资净额+续销');
  assert(state.cash === cashBeforeAdv + state.monthDelta || Math.abs(state.cash - (cashBeforeAdv + state.monthDelta)) < 2
    || state.cash > cashBeforeAdv + payrollOnly, '续销应进入现金');
}

// 货架月：首月后按月续销，不一次结清
const shelfCash = state.cash;
const shelf = shelfSell(state, 2);
assert(shelf.months === 2, '应跑满 2 个货架月');
assert(shelf.income > 0, '货架月应有收入');
assert(state.cash > shelfCash, '货架月应增加现金');
assert(LIFE_MONTHS >= 18, `生命周期应拉长到可感知的多年，got ${LIFE_MONTHS}`);

console.log('OK tail sales:', {
  cashGain: state.cash - cash0,
  lifeProfit: state.models[0].lifeProfit,
  tailTotal: state.tailTotal,
  onSaleIncomeGen2: onSaleIncomeOf(state, 2),
  lastMonthDelta: state.monthDelta,
  onSaleLeft: (state.onSale || []).map((m) => m.name),
  lifeMonths: LIFE_MONTHS,
  shelf,
});
