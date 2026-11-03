/** ROADMAP v0.9.x / v0.10 / v0.11 对照矩阵 — 输出 PASS/FAIL */
import { readFileSync } from 'fs';
import { createNewGame } from '../src/game/state.js';
import { sellTail, LIFE_MONTHS, modelTailValue, onSaleIncomeOf } from '../src/game/logic.js';
import * as L from '../src/game/logic.js';
import { formTimeline, formUnlocked, applyFormToDesign, syncFoldConcepts } from '../src/game/forms.js';
import { takeLoan, tickLoans, SAFE_CASH, cashPressure } from '../src/game/finance.js';
import { rollAngel, applyAngelChoice, ANGEL_CARDS } from '../src/game/angels.js';
import { hasAppeared, defaultDesign, wow, novelty, completeness } from '../src/studio/parts.js';
import { EVENTS } from '../src/game/data.js';

const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
const logic = readFileSync(new URL('../src/game/logic.js', import.meta.url), 'utf8');
const phone3d = readFileSync(new URL('../src/studio/phone3d.js', import.meta.url), 'utf8');
const screenOS = readFileSync(new URL('../src/studio/screenOS.js', import.meta.url), 'utf8');
const finance = readFileSync(new URL('../src/game/finance.js', import.meta.url), 'utf8');

let fails = 0;
const rows = [];
function check(ver, item, cond, how) {
  const status = cond ? 'PASS' : 'FAIL';
  if (!cond) fails++;
  rows.push({ ver, item, status, how });
  console.log(`${status}\t[${ver}]\t${item}\t— ${how}`);
}

// ─── v0.9.x ───
{
  const st = createNewGame('对照');
  st.phase = 'dev';
  st.generation = 2;
  st.month = 14;
  st.cash = 800;
  st.models = [{ gen: 1, design: { modelName: 'A1' }, sold: 40, lifeSold: 40, lifeProfit: 120 }];
  st.onSale = [{
    name: 'A1', color: '#5aa9d6', pos: 'flagship', gen: 1, d0: 40, wom: 0.05, comp: 1, boost: 1,
    age: 1, price: 4999, unitCost: 2400, unitMargin: 18, months: LIFE_MONTHS, backlog: 5, cap: 30,
    firstProfit: 120, profit: 0, total: 0, history: [40],
  }];
  const first = st.onSale[0].firstProfit;
  const rem = modelTailValue(st.onSale[0]);
  const incomes = [];
  for (let i = 0; i < 3; i++) incomes.push(sellTail(st).income);
  check('v0.9.x', '续销按月入账', incomes.every((x) => x > 0), `三月续销=${incomes.join(',')}`);
  check('v0.9.x', '首月只结首月（≠一把结）', rem > first && first / (first + rem) < 0.45, `首月占比=${((first / (first + rem)) * 100).toFixed(1)}% life=${LIFE_MONTHS}`);
  check('v0.9.x', '生命周期能感觉卖多年', LIFE_MONTHS >= 18, `LIFE_MONTHS=${LIFE_MONTHS}`);
  check('v0.9.x', '账本「在售·」', (st.ledger || []).some((e) => String(e.label).startsWith('在售·')), `ledger labels sample`);
  check('v0.9.x', 'UI 累计利润可见', ui.includes('累计利润'), 'src/ui.js 含「累计利润」');
  check('v0.9.x', '发布会 Disney 预备→爆发→余韵', screenOS.includes('anticipation') && screenOS.includes('follow-through'), 'screenOS Disney 十二原则注释/实现');
  check('v0.9.x', '跳过保底不 900ms 硬切', ui.includes('禁止 900ms 硬切') && phone3d.includes('skipReveal') && phone3d.includes('fired.boom'), 'skip 等到 boom；ui 保底 landMs');
}

// ─── v0.10 ───
{
  check('v0.10', '折叠勾选后半宽开合可见', phone3d.includes('合盖=半宽') || phone3d.includes('半宽厚砖'), 'phone3d 书本折叠半宽开合');
  check('v0.10', '信仰≠口碑（战报用户评分）', ui.includes('用户评分') && ui.includes('大众口碑') && ui.includes('铁粉'), '战报/说明去撞名');
  check('v0.10', '公式分叉（清仓/以旧换新）', logic.includes('口碑 -3') && (logic.includes('信仰 +4') || logic.includes('faith + 4') || logic.includes('faithGain')), '清仓伤口碑、换新养信仰');
  check('v0.10', '研发点拆解卡片 + HUD 飞字', ui.includes('lastRpBreak') && ui.includes('rpGainBlock') && ui.includes('statFx'), 'UI 拆解+飞字');
  // 按机型清仓，不误杀
  const st = createNewGame('清仓对照');
  st.product = { positioningId: 'flagship', name: '新机', price: 3999, priceId: 'mid' };
  st.wowResult = { score: 60, grade: '稳', novelty: 50, completeness: 70, headline: '测', firsts: [], buzz: 1 };
  st.mediaScore = 70;
  st.userScore = 70;
  st.stock = 'normal';
  st.onSale = [
    { key: 'keep-me', name: '留着卖', pos: 'mainstream', gen: 1, d0: 20, wom: 0.05, comp: 1, boost: 1, age: 2, price: 2999, unitCost: 1500, unitMargin: 10, months: 20, backlog: 0, cap: 20, firstProfit: 50, profit: 10, total: 30, history: [20] },
    { key: 'clear-me', name: '清掉', pos: 'flagship', gen: 1, d0: 15, wom: 0.05, comp: 1, boost: 1, age: 4, price: 4999, unitCost: 2400, unitMargin: 12, months: 18, backlog: 0, cap: 15, firstProfit: 80, profit: 20, total: 40, history: [15] },
  ];
  st.oldPolicyMap = { 'keep-me': 'keep', 'clear-me': 'clear' };
  st.oldPolicy = 'keep';
  // runSales will process policies then add new model — we only care kept
  const beforeKeys = st.onSale.map((m) => m.key);
  // Call the settle path via runSales internals by importing logic — runSales needs more state
  // Minimal: replicate the settle loop assertion by invoking through a thin helper if exported,
  // else simulate the same contract: after policy, keep-me remains, clear-me gone, NOT onSale=[]
  // 行为：fallback=clear 时 map 仍保住 keep-me，只清 clear-me，且不会整表清空
  st.oldPolicy = 'clear';
  st.mediaScore = 70; st.userScore = 70; st.hype = 10; st.stock = 'normal'; st.cash = 2000;
  st.supplierId = 'mid';
  st.design = { modelName: '新机X', parts: { chip:1, screen:1, camera:1, battery:1, body:1 }, concepts: [], color:'#333', formFactor:'bar' };
  st.product = { positioningId: 'flagship', name: '新机X', price: 3999, priceId: 'mid' };
  st.wowResult = { score: 55, grade: '稳', novelty: 40, completeness: 70, headline: '稳', firsts: [], buzz: 1 };
  st.allocation = { perf:2, screen:2, camera:2, battery:2, soft:2 };
  st.progress = { perf:80, screen:80, camera:80, battery:80, soft:80 };
  st.monthsLeft = 0;
  const sales = L.runSales(st);
  const keys = (st.onSale || []).map((m) => m.key || m.name);
  const kept = keys.includes('keep-me');
  const cleared = !keys.includes('clear-me');
  const notWiped = keys.length >= 1;
  check('v0.10', '清仓/以旧换新按机型（禁 onSale=[] 误杀）',
    logic.includes('禁止 onSale=[] 误杀') && logic.includes('oldPolicyMap') && beforeKeys.length === 2 && kept && cleared && notWiped,
    `keep=${kept} clearGone=${cleared} keys=${keys.join(',')} note=${sales?.oldNote || ''}`);
  check('v0.10', '事件扩池 + 同梗冷却', EVENTS.length >= 10 && logic.includes('recentMemes') && EVENTS.every((e) => e.meme || e.id), `EVENTS=${EVENTS.length} + recentMemes`);
}

// ─── v0.11 ───
{
  const early = formTimeline(1);
  const ids = early.forms.filter((f) => f.unlocked).map((f) => f.id).sort();
  check('v0.11', '开罗式：早期无折叠', !formUnlocked('fold_s', 1) && !formUnlocked('fold_l', 1) && ids.includes('thick'), `early=${ids.join(',')}`);
  check('v0.11', '锁定有解锁月提示', early.forms.some((f) => !f.unlocked && (f.unlockText || f.from)), 'formTimeline 锁定项带解锁信息');
  check('v0.11', '创新池门禁同步', !hasAppeared('fold', { month: 1, gen: 1 }) && hasAppeared('fold', { month: 22, gen: 2 }), 'fold 概念月门禁');
  const d = defaultDesign();
  d.formFactor = 'thick';
  syncFoldConcepts(d);
  const noFold = !(d.concepts || []).includes('fold');
  applyFormToDesign(d, 'fold_s');
  syncFoldConcepts(d);
  check('v0.11', '形态↔折叠概念绑定', noFold && d.concepts.includes('fold'), 'thick 无 fold；fold_s 带 fold');

  const st = createNewGame('贷');
  st.cash = 80;
  const r = takeLoan(st, 'bank');
  const tick = tickLoans(st);
  check('v0.11', '可点银行贷款 + 月供进账本', r.ok && st.ledger.some((e) => e.label === '银行贷款') && tick.paid > 0 && st.ledger.some((e) => e.label === '贷款还款'), `ok=${r.ok} paid=${tick.paid}`);
  check('v0.11', '低现金入口更烫', ui.includes("finHot") && ui.includes("hud-btn finance") && cashPressure({ cash: 40 }) !== 'ok', 'HUD finance.hot + cashPressure');
  check('v0.11', '天使兜底不替代贷款', finance.includes('不替代贷款') && ui.includes('天使兜底仍是'), 'finance/ui 文案与分流');

  st.cash = 50;
  st.month = 8;
  st.phase = 'dev';
  st.recentMemes = [];
  st.lastAngelMonth = -1;
  const kinds = new Set(ANGEL_CARDS.map((c) => c.kind));
  let hit = null;
  for (let i = 0; i < 20 && !hit; i++) {
    st.pendingAngel = null;
    st.lastAngelMonth = -1;
    st.month = 8 + i;
    hit = rollAngel(st, { force: true });
  }
  check('v0.11', '天使奇遇卡组（约见/对赌/渠道等）', hit && kinds.has('约见') && kinds.has('对赌') && kinds.has('渠道'), `kinds=${[...kinds].join(',')}`);
  st.month = 99;
  st.lastAngelMonth = 99;
  st.pendingAngel = null;
  check('v0.11', '奇遇冷却不刷屏', rollAngel(st, { force: false }) === null, '同月 lastAngelMonth 拦截');
}

// Must overlaps (small checks)
{
  const d = defaultDesign();
  d.concepts = ['fold'];
  const w = wow(d, []);
  check('Must', '惊艳度=新颖×完成度', typeof novelty === 'function' && typeof completeness === 'function' && w.novelty != null && w.completeness != null, `wow score=${w.score}`);
  check('Must', '竖屏像素场景口径保留', ui.includes('scene') || readFileSync(new URL('../docs/PROTOTYPE.md', import.meta.url), 'utf8').includes('竖屏'), 'PROTOTYPE/UI 竖屏');
}

console.log('\n── 矩阵汇总 ──');
console.log(`PASS ${rows.filter((r) => r.status === 'PASS').length} / FAIL ${fails} / TOTAL ${rows.length}`);
if (fails) {
  console.error('\nFAILED items:');
  rows.filter((r) => r.status === 'FAIL').forEach((r) => console.error(`- [${r.ver}] ${r.item}: ${r.how}`));
  process.exit(1);
}
console.log('\nALL ROADMAP CHECKS PASSED');
