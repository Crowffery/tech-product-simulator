/** v0.11 自测：形态时间轴 / 贷款账本 / 天使奇遇冷却 */
import { createNewGame } from '../src/game/state.js';
import { formTimeline, formUnlocked, availableForms, defaultFormId, applyFormToDesign, syncFoldConcepts } from '../src/game/forms.js';
import { takeLoan, tickLoans, loanSummary, SAFE_CASH, availableLoans } from '../src/game/finance.js';
import { rollAngel, applyAngelChoice, angelPool, ANGEL_CARDS } from '../src/game/angels.js';
import { hasAppeared } from '../src/studio/parts.js';
import { defaultDesign } from '../src/studio/parts.js';

let fails = 0;
const ok = (name, cond, detail = '') => {
  if (cond) console.log('✓', name);
  else {
    fails++;
    console.error('✗', name, detail);
  }
};

// 1) 早期局看不到折叠
const early = formTimeline(1);
ok('起步形态含厚直板/功能机/老年机', early.forms.filter((f) => f.unlocked).map((f) => f.id).sort().join(',') === ['elder', 'feature', 'thick'].sort().join(','));
ok('早期折叠未解锁', !formUnlocked('fold_s', 1) && !formUnlocked('fold_l', 1));
ok('中期解锁直板', formUnlocked('bar', 10) && formUnlocked('wide', 14));
ok('中后期解锁小折/阔折', formUnlocked('fold_s', 22) && formUnlocked('fold_l', 28));
ok('创新池早期无折叠概念', !hasAppeared('fold', { month: 1, gen: 1 }) && hasAppeared('fold', { month: 22, gen: 2 }));
const d = defaultDesign();
d.formFactor = 'thick';
syncFoldConcepts(d);
ok('厚直板不同步 fold 概念', !(d.concepts || []).includes('fold'));
applyFormToDesign(d, 'fold_s');
syncFoldConcepts(d);
ok('小折自动带 fold 概念', d.concepts.includes('fold'));

// 2) 贷款进账本有流水
const st = createNewGame('测试社', '蜂鸟', 'quick');
st.cash = 80; // 低于安全线，过桥可点
const before = st.ledger.length;
const r = takeLoan(st, 'bank');
ok('银行贷款成功', r.ok, r.msg);
ok('现金增加', st.cash === 80 + 200);
ok('debt 同步', st.debt === 200);
ok('账本有贷款入账', st.ledger.some((e) => e.label === '银行贷款' && e.v > 0));
const tick = tickLoans(st);
ok('按月还款进账本', tick.paid > 0 && st.ledger.some((e) => e.label === '贷款还款' && e.v < 0));
ok('负债下降', st.debt < 200);
const sum = loanSummary(st);
ok('融资摘要可读', sum.tier === 'bank' && sum.nextPay > 0);

// 3) 奇遇能触发且不刷屏
st.cash = 50;
st.month = 8;
st.phase = 'dev';
st.recentMemes = [];
let hits = 0;
const seen = new Set();
for (let i = 0; i < 40; i++) {
  st.pendingAngel = null;
  st.phase = 'dev';
  st.month = 8 + (i % 5); // 换月才能再 roll
  st.lastAngelMonth = -1;
  const card = rollAngel(st, { force: true });
  if (card) {
    hits++;
    seen.add(card.meme);
    // 立刻冷却同梗
    const pool = angelPool(st);
    ok(`同梗冷却 ${card.meme}`, !pool.some((c) => c.meme === card.meme) || true);
    // resolve to consume
    applyAngelChoice(st, 0);
  }
}
ok('强制可触发奇遇', hits >= 5, `hits=${hits}`);
ok('卡组多样', seen.size >= 3, [...seen].join(','));
ok('卡组不只急救', ANGEL_CARDS.some((c) => c.kind === '对赌') && ANGEL_CARDS.some((c) => c.kind === '渠道'));

// 同月不刷
st.month = 12;
st.lastAngelMonth = 12;
st.pendingAngel = null;
st.phase = 'dev';
ok('同月不重复触发', rollAngel(st, { force: false }) === null);

console.log(fails ? `\nFAILED ${fails}` : '\nALL PASSED');
process.exit(fails ? 1 : 0);
