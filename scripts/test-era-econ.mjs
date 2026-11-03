/**
 * 按键时代数值模拟：完整编年模式，固定策略各跑 N 局，看价格 / 单台利润 / 销量 / 第 18 月现金 / 破产率。
 * 运行：node scripts/test-era-econ.mjs
 */
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const L = await import('../src/game/logic.js');
const { createNewGame } = await import('../src/game/state.js');
const { physical, conceptsFor, hasAppeared, conceptNeedsMissing } = await import('../src/studio/parts.js');

const POL = {
  父母刚需走量: { form: 'elder', pos: 'parents', points: ['loud', 'standby', 'tough'], band: 'entry', k: 0.95 },
  学生入门: { form: 'feature', pos: 'student', points: ['chord', 'value'], band: 'mid', k: 0.95 },
  商务: { form: 'feature', pos: 'biz', points: ['standby', 'dualsim'], band: 'high', k: 1, concepts: ['dualsim'] },
  时尚高价: { form: 'feature', pos: 'fashion', points: ['chord', 'camphone'], band: 'high', k: 1.12 },
};

function run(P) {
  const s = createNewGame('模拟', '蜂鸟', 'chronicle');
  s.tutorial = false;
  const gens = [];
  for (let guard = 0; guard < 12 && s.month <= 18; guard++) {
    if (s.pendingMarket) L.resolveMarketEvent(s, 0);
    const r = L.finishPlan(s, { positioningId: P.pos, pointIds: P.points, priceId: P.band, bindEco: false, formFactor: P.form });
    if (!r.ok) return { err: r.msg };
    if (P.concepts) s.designDraft.concepts = [...P.concepts];
    // 像普通玩家一样每代换个颜色、做大改款，并加一项当时已出现的新功能
    if (s.generation > 1) {
      const d = s.designDraft;
      d.redesign = 'major';
      d.color = ['#c0392b', '#2b4a7a', '#1e8449', '#7d3c98', '#d4ac0d'][s.generation % 5];
      const pool = conceptsFor(d).filter((c) => c.tier === 1 && hasAppeared(c.id, { month: s.month, mode: 'chronicle', era: 'keypad' }) && !conceptNeedsMissing(c.id, d) && !(d.concepts || []).includes(c.id));
      if (pool.length) d.concepts = [...(d.concepts || []).slice(-1), pool[s.generation % pool.length].id];
    }
    L.confirmDesign(s, s.designDraft);
    L.pickLogistics(s, 'balanced', 'normal', 'own');
    while (['dev', 'event', 'rescue', 'angel'].includes(s.phase)) {
      if (s.phase === 'event') L.resolveEvent(s, L.recommendedEventChoice(s.pendingEvent));
      else if (s.phase === 'rescue') L.leaveRescue(s);
      else if (s.phase === 'angel') { s.phase = 'dev'; s.pendingAngel = null; }
      else L.advanceMonth(s, L.balancedAllocation(s, []));
    }
    if (s.phase === 'bust') return { bust: true, month: s.month, gens };
    L.toLaunch(s);
    L.setPrice(s, Math.round(L.fairPrice(s) * P.k));
    L.resolveLaunchStyle(s, 'safe');
    L.runSales(s);
    if (s.phase === 'rescue') L.leaveRescue(s);
    if (s.phase === 'bust') return { bust: true, month: s.month, gens };
    const sr = s.salesResult;
    gens.push({ m: s.month, price: sr.price, cost: sr.unitCost, per: sr.perUnit, sold: sr.sold, stocked: sr.stocked, profit: sr.profit, media: s.mediaScore, user: s.userScore });
    L.enterNext(s);
    if (s.phase === 'ending') break;
    L.goNextGen(s);
  }
  return { bust: false, cash: s.cash, gens };
}

const N = Number(process.argv[2] || 30);
let fails = 0;
const ok = (name, cond, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!cond) fails++;
};
for (const [name, P] of Object.entries(POL)) {
  const rs = Array.from({ length: N }, () => run(P));
  const err = rs.find((r) => r.err);
  if (err) { ok(name, false, err.err); continue; }
  const busts = rs.filter((r) => r.bust).length;
  const alive = rs.filter((r) => !r.bust);
  const g1 = alive.map((r) => r.gens[0]).filter(Boolean);
  const avg = (a) => (a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0);
  const cash = avg(alive.map((r) => r.cash));
  const price = avg(g1.map((g) => g.price));
  const per = avg(g1.map((g) => g.per));
  const sold = avg(g1.map((g) => g.sold));
  const stocked = avg(g1.map((g) => g.stocked));
  const media = avg(g1.map((g) => g.media));
  console.log(`\n【${name}】破产 ${busts}/${N} · 第 18 月现金约 ¥${(cash / 100).toFixed(1)} 亿 · 首代 售价 ¥${price} 每台赚 ¥${per} 首月 ${sold}/${stocked} 万台 媒体 ${media}`);
  console.log('   例：' + (alive[0]?.gens || []).map((g) => `第${g.m}月 ¥${g.price} ${g.sold}万台 +${g.profit}`).join(' | '));
  ok(`${name} 售价落在 ¥99–¥2,000`, price >= 99 && price <= 2000, `¥${price}`);
  ok(`${name} 每台利润 ¥40–¥1,200`, per >= 40 && per <= 1200, `¥${per}`);
  ok(`${name} 破产率 ≤ 10%`, busts <= N * 0.1, `${busts}/${N}`);
  ok(`${name} 第 18 月现金 ¥3–20 亿`, cash >= 300 && cash <= 2000, `¥${(cash / 100).toFixed(1)} 亿`);
}
console.log(fails ? `\nFAILED ${fails}` : '\nALL ECON CHECKS PASSED');
process.exit(fails ? 1 : 0);
