/**
 * v0.11 可点融资：银行贷款 / 过桥 / 紧急融资。
 * 自有资金优先；天使兜底（logic.goBroke）不替代贷款。
 * 不依赖 logic.js，避免循环引用；现金入账走本地 bookCash。
 */

/** 现金安全线：低于此值融资入口更显眼 */
export const SAFE_CASH = 120;
/** 濒临破产线：解锁紧急融资 */
export const CRITICAL_CASH = 40;

function bookCash(state, label, v, note = '') {
  const n = Math.round(v);
  if (!n) return;
  state.cash += n;
  state.ledger ||= [];
  state.ledger.push({ m: state.month, gen: state.generation, label, v: n, note });
  if (state.ledger.length > 160) state.ledger = state.ledger.slice(-160);
}

export const LOAN_PRODUCTS = [
  {
    id: 'bank',
    name: '银行贷款',
    icon: '🏦',
    tier: 'bank',
    amount: 200,
    rate: 0.018,
    term: 12,
    expandLock: 1,
    blurb: '正规一点。按月还本息，扩张会暂时收紧。',
    when: () => true,
  },
  {
    id: 'bridge',
    name: '过桥资金',
    icon: '🌉',
    tier: 'bridge',
    amount: 110,
    rate: 0.038,
    term: 3,
    expandLock: 0,
    blurb: '短、快、贵。撑过发薪日或模具款。',
    when: (st) => (st.cash ?? 0) < SAFE_CASH * 1.4 || (st.debt || 0) > 0,
  },
  {
    id: 'emergency',
    name: '紧急融资',
    icon: '🚨',
    tier: 'emergency',
    amount: 160,
    rate: 0.055,
    term: 6,
    expandLock: 3,
    faith: -4,
    brand: -0.04,
    blurb: '快钱。利息咬人，还会伤一点信仰与品牌溢价。',
    when: (st) => (st.cash ?? 0) < CRITICAL_CASH || (st.cash ?? 0) < monthlyBurn(st) * 1.2,
  },
];

export function monthlyBurn(state) {
  const office = state.office || 1;
  const depts = Object.values(state.depts || { a: 1 }).reduce((a, b) => a + b, 0);
  return 18 + depts * 8 + office * 6 + (state.assets?.length || 0) * 8;
}

export function debtTotal(state) {
  return (state.loans || []).reduce((a, l) => a + Math.max(0, l.principal || 0), 0);
}

export function syncDebt(state) {
  state.debt = Math.round(debtTotal(state));
  return state.debt;
}

export function financeTier(state) {
  const loans = state.loans || [];
  if (loans.some((l) => l.tier === 'emergency')) return 'emergency';
  if (loans.some((l) => l.tier === 'bridge')) return 'bridge';
  if (loans.some((l) => l.tier === 'bank')) return 'bank';
  if (state.rescued) return 'angel';
  return 'own';
}

export const TIER_LABEL = {
  own: '自有资金',
  bank: '银行贷款',
  bridge: '过桥资金',
  emergency: '紧急融资',
  angel: '天使兜底后',
};

export function cashPressure(state) {
  const c = state.cash ?? 0;
  if (c < CRITICAL_CASH) return 'critical';
  if (c < SAFE_CASH) return 'low';
  if (c < SAFE_CASH * 1.6) return 'watch';
  return 'ok';
}

export function availableLoans(state) {
  const active = new Set((state.loans || []).map((l) => l.productId));
  return LOAN_PRODUCTS.filter((p) => !active.has(p.id) && (!p.when || p.when(state)));
}

/**
 * 主动贷款。进账本；更新 debt / loans / expandLock。
 */
export function takeLoan(state, productId) {
  const p = LOAN_PRODUCTS.find((x) => x.id === productId);
  if (!p) return { ok: false, msg: '没有这个融资产品' };
  if ((state.loans || []).some((l) => l.productId === productId)) return { ok: false, msg: '这笔已经在还了' };
  if (p.when && !p.when(state)) return { ok: false, msg: '现在还不满足这笔融资的条件' };
  const id = `${p.id}-${state.month}-${Math.random().toString(36).slice(2, 6)}`;
  const loan = {
    id,
    productId: p.id,
    name: p.name,
    tier: p.tier,
    principal: p.amount,
    rate: p.rate,
    term: p.term,
    left: p.term,
    opened: state.month,
  };
  state.loans = [...(state.loans || []), loan];
  bookCash(state, p.name, p.amount, `${p.term} 期 · 月息 ${(p.rate * 100).toFixed(1)}%`);
  if (p.faith) state.faith = Math.max(0, Math.min(100, state.faith + p.faith));
  if (p.brand) state.brand = Math.max(0.7, Math.min(1.25, (state.brand || 1) + p.brand));
  if (p.expandLock) state.expandLock = Math.max(state.expandLock || 0, p.expandLock);
  syncDebt(state);
  state.financeNote = `借入「${p.name}」¥${p.amount}`;
  return { ok: true, loan, amount: p.amount, msg: `${p.icon} ${p.name}到账 ¥${p.amount} 万，按月还本息` };
}

/**
 * 每月还款：利息按剩余本金 + 摊还本金。
 */
export function tickLoans(state) {
  const lines = [];
  if (state.expandLock > 0) state.expandLock -= 1;
  const next = [];
  for (const l of state.loans || []) {
    if (l.principal <= 0 || l.left <= 0) continue;
    const interest = Math.max(1, Math.round(l.principal * l.rate));
    const principalPay = Math.min(l.principal, Math.max(1, Math.round(l.principal / l.left)));
    const pay = interest + principalPay;
    bookCash(state, '贷款还款', -pay, `${l.name} · 本${principalPay}+息${interest}`);
    l.principal = Math.max(0, l.principal - principalPay);
    l.left -= 1;
    const row = { name: l.name, pay, interest, principalPay, left: l.left, cleared: false };
    if (l.principal > 0 && l.left > 0) next.push(l);
    else row.cleared = true;
    lines.push(row);
  }
  state.loans = next;
  syncDebt(state);
  return { paid: lines.reduce((a, x) => a + x.pay, 0), lines };
}

export function canExpand(state) {
  return !(state.expandLock > 0);
}

export function ownCapitalPreferred(state) {
  return cashPressure(state) === 'ok' && !(state.debt > 0);
}

export function loanSummary(state) {
  syncDebt(state);
  const loans = state.loans || [];
  const nextPay = loans.reduce((a, l) => {
    const interest = Math.max(1, Math.round(l.principal * l.rate));
    const principalPay = Math.min(l.principal, Math.max(1, Math.round(l.principal / Math.max(1, l.left))));
    return a + interest + principalPay;
  }, 0);
  return {
    debt: state.debt || 0,
    tier: financeTier(state),
    tierLabel: TIER_LABEL[financeTier(state)],
    pressure: cashPressure(state),
    nextPay,
    loans,
    expandLock: state.expandLock || 0,
    safe: SAFE_CASH,
    critical: CRITICAL_CASH,
    preferOwn: ownCapitalPreferred(state),
  };
}
