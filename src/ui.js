/**
 * 主流程 UI（v0.9，竖屏优先）
 * 布局：HUD → 阶段进度条 → 像素场景 → 操作面板 → 吸底主按钮
 * 设计阶段换成 3D 工作台；发布会换成全屏 3D 演出。
 */
import { SLOTS, POSITIONING, SELL_POINTS, PRICE_BANDS, SUPPLIERS, STOCK_OPTS, EVENTS, DEPTS, EXPANSIONS, randomCompanyName } from './game/data.js';
import { packOf, productEraOf, worldEraOf, worldEraIdOf, eraAllowsEvent, modeOf, industryMonth, keypadMonth, networkWorldLevel } from './game/eras/index.js';
import { formCardsHtml } from './ui/formCards.js';
import { defaultFormId } from './game/forms.js';
import { createNewGame, saveGame, loadGame, clearSave, hasSave } from './game/state.js';
import * as L from './game/logic.js';
import { lsGet, lsSet } from './game/storage.js';
import { SceneView } from './scenes.js';
import { term, installGlossary } from './glossary.js';
import { buildComments } from './launch/crowd.js';
import { money, moneyShort } from './game/money.js';
import { icon, conceptIcon } from './icons.js';
import { physical, tier, CONCEPTS, hasAppeared, danmaku, paletteName, novelty, buzzOf, chipSpec, chipName, chipBench, rivalBench, CHIP_SERIES_SEEDS } from './studio/parts.js';
import { priceFit, nextWindow, rivalLaunches, clashAt, windowAt, monthOfYear, endingTitles, RUN_MONTHS, runMonths, IDEAL, rivalPhones, marketChipGen, rivalPriceList, roundPrice } from './game/market.js';

let state = null;
let screen = 'title'; // title | create | game
let scene = null;
let studio = null;
let sfx = null;
let busy = false; // 演出中禁止操作
const draft = {
  companyName: randomCompanyName(),
  mode: 'chronicle',
  plan: L.recommendedPlan(defaultFormId({ month: 1, mode: 'chronicle' })),
  supplierId: 'balanced',
  stockId: 'normal',
  focus: [],
  factoryDone: false,
  restartArmed: false,
};

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const persist = () => state && saveGame(state);

import('./studio/sfx.js').then((m) => (sfx = m.sfx));
const play = (name, ...a) => {
  if (!sfx) return;
  const fn = sfx[name] || sfx[name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())];
  if (typeof fn === 'function') return fn.apply(sfx, a);
};

function toast(msg, ms) {
  if (!msg) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  // 长文案按字数加时，短提示也至少留约 3.5 秒，点一下可提前关掉
  const hold = ms ?? Math.min(10000, Math.max(3500, 1400 + String(msg).length * 80));
  const close = () => el.remove();
  el.addEventListener('click', close, { once: true });
  setTimeout(close, hold);
}

function flash(msg) {
  if (document.body.classList.contains('reduce-motion')) return;
  const host = $('#g-scene');
  if (!host) return;
  host.querySelector('.month-flash')?.remove();
  const d = document.createElement('div');
  d.className = 'month-flash';
  d.innerHTML = `<span>${esc(msg)}</span>`;
  host.appendChild(d);
  setTimeout(() => d.remove(), 800);
}

// ═════════════════════════ 外壳 ═════════════════════════

function shell() {
  document.getElementById('app').innerHTML = `
    <div class="g-app">
      <header class="g-hud" id="g-hud"></header>
      <nav class="g-rail" id="g-rail"></nav>
      <section class="g-scene" id="g-scene"><div class="g-caption" id="g-caption"></div><div class="g-overlay" id="g-overlay" hidden></div></section>
      <div id="studio-host" class="studio-host" hidden></div>
      <section class="g-sheet kbox" id="g-sheet"></section>
      <footer class="g-cta" id="g-cta"></footer>
    </div>`;
  scene = new SceneView($('#g-scene'));
}

/** 花钱按钮：写清楚「做什么 · 扣什么 · 扣多少」，钱不够时说还差多少 */
function costBtn(act, id, label, amount, extra = '') {
  const ok = state.cash >= amount;
  return `<div class="costwrap"><button type="button" class="costbtn" data-act="${act}" ${id ? `data-id="${id}"` : ''} data-cost="${amount}" ${ok ? '' : 'disabled'} ${extra}>
      <em>${label}</em><span class="cost">${icon('coin', 13)}资金 ${money(amount)}</span></button>
    ${ok ? '' : `<small class="short-by">还差 ${money(amount - state.cash)}</small>`}</div>`;
}

/** 扣钱 / 进账的飞字：从按钮飞向顶部资金 */
function moneyFx(fromRect, amount) {
  const to = document.querySelector('.hud-stat.s-cash')?.getBoundingClientRect();
  if (!fromRect || !to || document.body.classList.contains('reduce-motion')) return;
  const el = document.createElement('div');
  el.className = `money-fx ${amount < 0 ? 'neg' : 'pos'}`;
  el.innerHTML = `${icon('coin', 16)}${money(amount, { sign: true })}`;
  el.style.left = `${fromRect.left + fromRect.width / 2}px`;
  el.style.top = `${fromRect.top}px`;
  el.style.setProperty('--dx', `${to.left + to.width / 2 - (fromRect.left + fromRect.width / 2)}px`);
  el.style.setProperty('--dy', `${to.top - fromRect.top}px`);
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1100);
}

/** 任意 HUD 资源飞字（研发点 / 信仰 / 口碑） */
function statFx(statId, fromRect, amount, label) {
  const to = document.querySelector(`.hud-stat.s-${statId}`)?.getBoundingClientRect();
  if (!fromRect || !to || !amount || document.body.classList.contains('reduce-motion')) return;
  const icons = { cash: 'coin', faith: 'heart', rep: 'star', rp: 'flask' };
  const el = document.createElement('div');
  el.className = `money-fx ${amount < 0 ? 'neg' : 'pos'}`;
  el.innerHTML = `${icon(icons[statId] || 'flask', 16)}${amount > 0 ? '+' : ''}${amount}${label ? ` ${label}` : ''}`;
  el.style.left = `${fromRect.left + fromRect.width / 2}px`;
  el.style.top = `${fromRect.top}px`;
  el.style.setProperty('--dx', `${to.left + to.width / 2 - (fromRect.left + fromRect.width / 2)}px`);
  el.style.setProperty('--dy', `${to.top - fromRect.top}px`);
  document.body.appendChild(el);
  const hudEl = document.querySelector(`.hud-stat.s-${statId}`);
  if (hudEl) {
    hudEl.classList.remove('gain', 'flash');
    void hudEl.offsetWidth;
    hudEl.classList.add(amount > 0 ? 'gain' : 'flash');
  }
  setTimeout(() => el.remove(), 1100);
}

function rpGainBlock() {
  const b = state.lastRpBreak;
  const total = state.lastRp || 0;
  if (!b) return `<p class="rp-gain">🔬 ${term('研发点')} <b class="pos">+${total}</b></p>`;
  const rows = [
    ['保底', b.base],
    ['媒体分', b.media],
    ['惊艳度', b.wow],
    ['首发加成', b.firsts],
    ['研发部', b.dept],
    ['办公楼', b.office],
  ].filter(([, v]) => v);
  return `<div class="rp-gain-box">
    <div class="rp-gain-h">🔬 研发点进账拆解 <b class="pos">+${total}</b></div>
    <ul class="rp-gain-list">${rows.map(([n, v]) => `<li><span>${n}</span><b class="${v >= 0 ? 'pos' : 'neg'}">${v > 0 ? '+' : ''}${v}</b></li>`).join('')}</ul>
  </div>`;
}

/** 顶部资源：像素图标 + 数值 + 名称，点了有解释 */
const STATS = {
  cash: { icon: 'coin', name: '资金' },
  faith: { icon: 'heart', name: '信仰' },
  rep: { icon: 'star', name: '口碑' },
  rp: { icon: 'flask', name: '研发点' },
};
function statVal(id) {
  return id === 'cash' ? `¥${moneyShort(state.cash)}` : id === 'faith' ? state.faith : id === 'rep' ? state.reputation : state.rp;
}
function hud() {
  if (!state) return `<div class="hud-title">电子产品发展国</div><button type="button" class="hud-btn" data-act="settings">⚙</button>`;
  const press = L.cashPressure(state);
  const debt = state.debt || 0;
  const finHot = press === 'critical' || press === 'low';
  const we = worldEraOf(state);
  return `
    <div class="hud-brand"><b>${esc(state.companyName)}</b><button type="button" class="era-mini" data-act="era-info" style="--ec:${we.color}">${esc(we.name)} · ${Math.floor((state.month - 1) / 12) + 1}年${monthOfYear(state.month)}月</button><small>第${state.generation}代 · ${Math.floor((state.month - 1) / 12) + 1}年${monthOfYear(state.month)}月${debt ? ` · 债¥${debt}` : ''} · <button type="button" class="era-badge" data-act="era-info" style="border:0;background:${we.color};color:#111;border-radius:999px;padding:0 8px;font:inherit;cursor:pointer">${esc(we.name)}</button>${state.mode === 'chronicle' ? ' · 编年' : ' · 快速'}</small></div>
    ${Object.entries(STATS)
      .map(([id, s]) => `<button type="button" class="hud-stat s-${id} ${id === 'cash' && press !== 'ok' ? (press === 'critical' ? 'critical' : 'low') : ''}" data-act="stat" data-id="${id}" aria-label="${s.name}">${icon(s.icon, 16)}<span><b>${statVal(id)}</b><small>${s.name}</small></span></button>`)
      .join('')}
    <button type="button" class="hud-btn finance ${finHot ? 'hot' : ''}" data-act="finance" aria-label="融资">${finHot ? '💸' : '🏦'}</button>
    <button type="button" class="hud-btn ${draft.restartArmed ? 'armed' : ''}" data-act="settings" aria-label="设置">${draft.restartArmed ? '确定?' : '⚙'}</button>`;
}

/** 点资源图标：这是什么、怎么涨怎么掉、用在哪 */
const STAT_HELP = {
  cash: {
    what: '公司账上的钱。所有花销都从这里扣，低于 0 就会破产（第一次有天使投资兜底）。',
    up: ['每台手机卖出去的利润（首月只结首月；之后约 24 个月按月续销）', '货架月 / 研发月的在售续销', '旧款清仓（一次性收尾，放弃后续月）'],
    down: ['每月团队工资和海外 / 门店运营费', '升级部门、扩建、流片、战略投资', '突发事件、库存积压'],
    note: '点「融资」可借银行贷款 / 过桥；按月还本息进账本。自有资金优先；天使兜底仍是最后一次急救。',
  },
  faith: {
    what: '铁粉忠诚度（0～100）。和「口碑」分叉：信仰只跟用户满意度 / 以旧换新走，不管媒体怎么写。',
    up: ['用户评分高的产品', '以旧换新（信仰 +4，护老用户）', '生态绑定、开线下体验店'],
    down: ['首发 3 个月内降价（背刺铁粉）', '降价清仓（信仰 -1）', '货不对板、处理事件时甩锅'],
  },
  rep: {
    what: '大众与媒体对品牌的公开印象（0～100）。和「信仰」分叉：口碑主要跟媒体评分走，直接乘进销量。',
    up: ['媒体评分高', '以旧换新显得护老用户（口碑 +1）', '出事时诚恳处理'],
    down: ['媒体差评、发布会翻车', '降价清仓（口碑 -3）', '断货、发热门等事故'],
  },
  rp: {
    what: '每次发布积累的技术经验，用来在设计阶段的「💡 创新」页解锁新的概念件。',
    up: ['发布后按媒体分 / 惊艳度 / 首发数拆账进账（见评测页卡片）', '研发部升级、搬进写字楼 / 科技园'],
    down: ['解锁概念件时消耗（有飞字）'],
  },
};
function showStat(id) {
  document.querySelector('.stat-pop')?.remove();
  const s = STATS[id];
  const h = STAT_HELP[id];
  const pop = document.createElement('div');
  pop.className = 'stat-pop';
  const extra =
    id === 'cash'
      ? `<div class="sp-extra"><span>本月固定支出约 <b>${money(L.monthlyCost(state))}</b></span>
          ${(state.ledger || []).slice(-3).reverse().map((e) => `<span class="sp-led"><i>${esc(e.label)}</i><b class="${e.v < 0 ? 'neg' : 'pos'}">${money(e.v, { sign: true })}</b></span>`).join('')}
          <div class="sp-fin-row">
            <button type="button" class="primary" data-pop="ledger">📒 查看完整账本</button>
            <button type="button" class="${L.cashPressure(state) !== 'ok' ? 'primary hot' : ''}" data-pop="finance">🏦 融资</button>
          </div></div>`
      : '';
  pop.innerHTML = `<div class="sp-card kbox">
      <div class="sp-h">${icon(s.icon, 28)}<div><b>${s.name}</b><em>${id === 'cash' ? money(state.cash) : statVal(id)}</em></div><button type="button" data-pop="x">✕</button></div>
      <p>${h.what}</p>
      <div class="sp-cols"><div><small>⬆ 怎么涨</small>${h.up.map((t) => `<span>${t}</span>`).join('')}</div><div><small>⬇ 怎么掉</small>${h.down.map((t) => `<span>${t}</span>`).join('')}</div></div>
      ${extra}
    </div>`;
  document.body.appendChild(pop);
  play('click');
  pop.addEventListener('click', (e) => {
    const k = e.target.closest('[data-pop]')?.dataset.pop;
    if (e.target === pop || k === 'x') pop.remove();
    if (k === 'finance') {
      document.querySelector('.stat-pop')?.remove();
      showFinance();
      return;
    }
    if (k === 'ledger') {
      pop.remove();
      showLedger();
    }
  });
}

/** 设置菜单：音乐 / 音效 / 重开 */
function showSettings() {
  document.querySelector('.stat-pop')?.remove();
  const pop = document.createElement('div');
  pop.className = 'stat-pop';
  const paint = () => {
    pop.innerHTML = `<div class="sp-card kbox"><div class="sp-h"><b>⚙ 设置</b><button type="button" data-pop="x">✕</button></div>
      <label class="sp-set"><span>${icon('note', 18)} 背景音乐</span><button type="button" data-pop="music">${sfx?.musicOn === false ? '已关闭' : '已开启'}</button></label>
      <label class="sp-set"><span>${icon(sfx?.muted ? 'mute' : 'speaker', 18)} 全部声音</span><button type="button" data-pop="mute">${sfx?.muted ? '已关闭' : '已开启'}</button></label>
      <label class="sp-set"><span>✨ 减少动效</span><button type="button" data-pop="motion">${document.body.classList.contains('reduce-motion') ? '已开启' : '关闭'}</button></label>
      ${state ? `<label class="sp-set danger"><span>${icon('restart', 18)} 放弃这家公司，重新开始</span><button type="button" data-pop="restart">${draft.restartArmed ? '再点一次确认' : '重开'}</button></label>` : ''}
    </div>`;
  };
  paint();
  document.body.appendChild(pop);
  pop.addEventListener('click', (e) => {
    const k = e.target.closest('[data-pop]')?.dataset.pop;
    if (e.target === pop || k === 'x') return pop.remove();
    if (k === 'music') sfx?.setMusic(!sfx.musicOn);
    if (k === 'mute') sfx?.setMuted(!sfx.muted);
    if (k === 'motion') {
      const on = !document.body.classList.contains('reduce-motion');
      document.body.classList.toggle('reduce-motion', on);
      lsSet('epdg-reduce-motion', on ? '1' : '0');
    }
    if (k === 'restart') {
      if (!draft.restartArmed) draft.restartArmed = true;
      else {
        draft.restartArmed = false;
        pop.remove();
        clearSave();
        state = null;
        screen = 'title';
        unmountStudio();
        render();
        return;
      }
    }
    paint();
  });
}

function rail() {
  if (!state) return '';
  const cur = L.stepIndex(state.phase);
  return L.PHASE_STEPS.map(
    (s, i) => `<span class="rail-step ${i < cur ? 'done' : i === cur ? 'on' : ''}"><i class="rail-ico">${icon(s.icon, 16)}</i><small>${s.label}</small></span>`,
  ).join('<b class="rail-line"></b>');
}

// ═════════════════════════ 各阶段面板 ═════════════════════════

const P = {};

const VERSION = 'v0.15';
function saveSummary() {
  const s = hasSave() ? loadGame() : null;
  if (!s) return '';
  return `${esc(s.companyName)} · 第 ${s.generation} 代 · 第 ${Math.floor((s.month - 1) / 12) + 1} 年 ${monthOfYear(s.month)} 月 · ${icon('coin', 12)}${money(s.cash)}`;
}

P.title = () => {
  const sum = saveSummary();
  const reduce = document.body.classList.contains('reduce-motion');
  return {
    scene: ['title', {}],
    caption: '',
    overlay: `<div class="logo"><small>TECH TYCOON</small><h1>电子产品发展国</h1><p>从车库出发，造一部让世界尖叫的手机</p></div>`,
    sheet: `<div class="menu">
        ${sum ? `<button type="button" class="menu-btn primary" data-act="continue"><b>▶ 继续经营</b><small>${sum}</small></button>` : ''}
        <button type="button" class="menu-btn ${sum ? '' : 'primary'}" data-act="new"><b>${sum ? '🏁 创立新公司' : '▶ 开始游戏'}</b><small>${sum ? '会覆盖当前存档' : '编年 60 月或快速 36 月，从车库做到科技园'}</small></button>
        ${import.meta.env.VITE_STUDIO_HREF === 'none' ? '' : `<a class="menu-btn" href="${import.meta.env.VITE_STUDIO_HREF || './studio.html'}"><b>🎨 自由设计工坊</b><small>所有部件和黑科技全开，随便造</small></a>`}
        <details class="menu-set"><summary>⚙ 设置</summary>
          <label><span>全部声音</span><button type="button" data-act="mute">${sfx?.muted ? '🔇 已关闭' : '🔊 已开启'}</button></label>
          <label><span>背景音乐</span><button type="button" data-act="music">${sfx?.musicOn === false ? '🎵 已关闭' : '🎵 已开启'}</button></label>
          <label><span>减少动效</span><button type="button" data-act="motion">${reduce ? '✓ 已开启' : '关闭'}</button></label>
        </details>
      </div>
      <p class="ver">${VERSION} · 进度自动保存在本机浏览器</p>`,
    cta: '',
  };
};

P.create = () => ({
  scene: ['title', {}],
  caption: '一切从这间车库开始',
  sheet: `<h2 class="sheet-h">${icon('flag', 22)} 创立公司</h2>
    <label class="field-l">公司名
      <div class="row"><input id="cname" maxlength="10" value="${esc(draft.companyName)}" /><button type="button" data-act="rand-name" title="换一个">🎲</button></div>
    </label>
    <label class="field-l">自研芯片系列
      <div class="row"><input id="chipname" maxlength="4" value="${esc(draft.chipSeries || (draft.chipSeries = CHIP_SERIES_SEEDS[Math.floor(Math.random() * CHIP_SERIES_SEEDS.length)]))}" /><button type="button" data-act="rand-chip" title="换一个">🎲</button></div>
      <small class="muted">第一颗芯片叫「<span id="chiphint">${esc(draft.chipSeries)}</span> X1」，以后每次流片升级一代。</small>
    </label>
    <div class="field-l">游戏模式
      <div class="chips">
        <button type="button" class="chip ${draft.mode !== 'quick' ? 'on' : ''}" data-act="set-mode" data-id="chronicle">📜 完整编年 · 60 月</button>
        <button type="button" class="chip ${draft.mode === 'quick' ? 'on' : ''}" data-act="set-mode" data-id="quick">⚡ 快速局 · 36 月</button>
      </div>
      <small class="muted">${draft.mode === 'quick' ? '与旧版时间轴一致：约三年，智能机很快登场。' : '默认推荐：从按键时代走到折叠兴起，中途会迎来智能机革命。'}</small>
    </div>
    <div class="brief">
      <b>你的任务</b>
      <span>📋 定方向 → 🎨 做设计 → 🔬 带研发 → 🎤 开发布会 → 🛒 卖出去</span>
      <span>${draft.mode === 'quick' ? '三年' : '五年编年'}后看你的公司能走多远。具体的活儿，交给手下四个部门。</span>
    </div>`,
  cta: `<button type="button" class="primary big" data-act="confirm-create">开张！</button>`,
});

P.plan = () => {
  if (L.syncRevolutionMarket) L.syncRevolutionMarket(state);
  else if (state.pendingRevolution) state.pendingMarket = 'smart_revolution';
  const p = draft.plan;
  if (!p.formFactor) p.formFactor = defaultFormId(state);
  const pack = packOf(p.formFactor);
  const tri = L.trianglePreview(p.positioningId, p.priceId, p.formFactor);
  const chips = (list, cur, act, multi = false) =>
    list
      .map((x) => `<button type="button" class="chip ${multi ? (cur.includes(x.id) ? 'on' : '') : cur === x.id ? 'on' : ''}" data-act="${act}" data-id="${x.id}">${x.name}</button>`)
      .join('');
  return {
    scene: ['plan', { office: state.office, month: state.month, positioning: p.positioningId, points: p.pointIds.length, price: p.priceId, color: state.designDraft?.color, concepts: state.designDraft?.concepts || [], formFactor: p.formFactor }],
    caption: `企划会：第 ${state.generation} 代要赌什么？`,
    sheet: `<h2 class="sheet-h">${icon('clipboard', 22)} 企划</h2>
      ${marketEventCard()}
      ${newsCard()}
      ${marketNotice()}
      <div class="field-l">${term('形态')} <small>第一步 · ${pack.name}</small>${formCardsHtml(state, p.formFactor, 'plan-form')}</div>
      <div class="field-l">${term('定位')}<div class="chips">${chips(pack.positioning, p.positioningId, 'plan-pos')}</div>${posCard(p.positioningId, !draft.planPosSeen, p.formFactor)}</div>
      <div class="field-l">${term('卖点')} <small>选 1～3 个，发布会上的承诺</small><div class="chips">${chips(pack.sellPoints, p.pointIds, 'toggle-point', true)}</div>${pointsCard(p)}</div>
      <div class="field-l">${term('售价带')} <small>决定备货规模；具体售价发布会前再定</small><div class="chips">${chips(pack.priceBands, p.priceId, 'plan-price')}</div></div>
      ${state.generation > 1 && productEraOf(p.formFactor) !== 'keypad' ? `<label class="eco"><input type="checkbox" data-act="bind-eco" ${p.bindEco ? 'checked' : ''}/> 绑定上代生态</label>` : ''}
      ${(() => {
        const pf = priceFit(p.positioningId, p.priceId, p.formFactor);
        return pf.note ? `<p class="warn-line ${pf.user < 0 ? 'bad' : 'good'}">💬 ${pf.note}</p>` : '';
      })()}
      <p class="pill-row"><span class="pill">⏳ 研发工期约 ${tri.months} 个月</span></p>
      ${calendar(state.month, state.month + tri.months + 1, p.positioningId)}`,
    cta: state.pendingMarket ? `<button type="button" class="primary big" disabled>先处理上面的行业大事</button>` : `<button type="button" class="primary big" data-act="confirm-plan">定了！去设计部 ▶</button>`,
  };
};

P.supply = () => ({
  scene: ['supply', { month: state.month, supplierId: draft.supplierId, stockId: draft.stockId }],
  caption: '供应商大会：选谁来造？备多少货？',
  sheet: `<h2 class="sheet-h">${icon('handshake', 22)} 供应链</h2>
    <div class="cards3">${SUPPLIERS.map(
      (s) => `<button type="button" class="pick ${draft.supplierId === s.id ? 'on' : ''}" data-act="pick-sup" data-id="${s.id}">
        <b>${s.name}</b><small>${s.desc}</small></button>`,
    ).join('')}</div>
    ${(() => {
      const d = state.design;
      const firsts = novelty(d, state.models).items.filter((i) => i.first).length;
      const bz = buzzOf(d, state.models);
      const tip = firsts || bz >= 20 ? '🔥 这台很有话题，小心卖断货' : '';
      return tip ? `<p class="warn-line good">${tip}</p>` : '';
    })()}
    ${chipSourcePick()}
    <div class="field-l">首批${term('备货')}<div class="chips">${STOCK_OPTS.map(
      (s) => `<button type="button" class="chip ${draft.stockId === s.id ? 'on' : ''}" data-act="pick-stk" data-id="${s.id}">${s.name}</button>`,
    ).join('')}</div></div>`,
  cta: `<button type="button" class="primary big" data-act="confirm-supply">签约，开工研发 ▶</button>`,
});

/** 供应链：芯片用自研还是外购 */
function chipSourcePick() {
  if (productEraOf(state.design) === 'keypad') return '';
  const mg = marketChipGen(industryMonth(state));
  const own = state.chip.gen;
  const lag = mg - own;
  const tierId = state.design?.parts?.chip ?? 1;
  const extCost = (6 + tierId * 3) * 55;
  const cur = draft.chipSrc || 'own';
  return `<div class="field-l">芯片来源 <small>行业主流已到第 ${mg} 代</small>
    <div class="cards2">
      <button type="button" class="pick ${cur === 'own' ? 'on' : ''}" data-act="pick-chip" data-id="own">
        <b>${icon('flask', 14)} 自研 ${esc(state.chip.series)} X${own}</b>
        <small>${lag > 0 ? `<span class="bad">落后 ${lag} 代</span>：性能上限、口碑、心理价位都吃亏` : lag < 0 ? '<span class="good">领先行业</span>：媒体加分，成本最低' : '和行业同代，成本最低'}</small></button>
      <button type="button" class="pick ${cur === 'ext' ? 'on' : ''}" data-act="pick-chip" data-id="ext" ${L.marketMod(state, 'extBan') ? 'disabled' : ''}>
        <b>${icon('cart', 14)} 外购 ${L.EXT_CHIP} S${mg}</b>
        <small>${L.marketMod(state, 'extBan') ? '<span class="bad">断供中，买不到</span>' : `永远是最新一代，但每台成本 +¥${extCost}，也没有「自研」光环`}</small></button>
    </div></div>`;
}

P.dev = () => {
  const caps = L.capsMap(state);
  const r = Math.round(L.devRatio(state) * 100);
  return {
    scene: ['dev', devSceneData()],
    caption: `研发实验室 · 还剩约 ${state.monthsLeft} 月`,
    sheet: `<h2 class="sheet-h">${icon('flask', 22)} 研发 <small>${state.notes?.[state.product.positioningId] ? `📒 ${term('企划笔记')}生效` : '⭐ 点星标出重点'}</small></h2>
      ${devTimeline()}
      ${state.month > 1 || state.slots.perf.progress > 0 ? benchCard() : ''}
      ${state.models.length ? onSaleBlock(true, true) : ''}
      ${state.chip?.research && productEraOf(state.design) !== 'keypad' ? `<p class="chip-line">🧪 ${esc(chipName(state.chip.series, state.chip.research.gen, 1).replace(/ Pro$/, ''))} 流片中：还剩 ${state.chip.research.months} 个月 <i style="--p:${Math.round((1 - state.chip.research.months / state.chip.research.total) * 100)}%"></i></p>` : ''}
      <div class="slots">${slotsOf(state.design).map((s) => {
        const sl = state.slots[s.id];
        const cap = caps[s.id];
        if (cap === 0) return `<div class="slot full" style="opacity:.55"><span class="star" aria-hidden="true">—</span><div class="slot-main"><div class="slot-top"><b>${s.name}</b></div><small>这台没有${s.id === 'camera' ? '摄像头' : '这项功能'}，不用投入</small></div></div>`;
        const on = draft.focus.includes(s.id);
        return `<div class="slot ${sl.progress >= cap ? 'full' : ''}">
          <button type="button" class="star ${on ? 'on' : ''}" data-act="focus" data-id="${s.id}" aria-label="设为重点">⭐</button>
          <div class="slot-main"><div class="slot-top"><b>${s.name}</b>${sl.progress >= cap ? '<span>✓ 到顶</span>' : ''}</div>
            <div class="bar"><i style="width:${sl.progress}%"></i><em style="left:${cap}%"></em></div>
            <small>${esc(sl.comment)}</small></div>
        </div>`;
      }).join('')}</div>`,
    cta: `<button type="button" class="primary big" data-act="advance">⏩ 推进一个月</button>
      <button type="button" data-act="advance-all">⏭ 一直推进</button>
      ${L.canEarlyLaunch(state) ? `<button type="button" class="early" data-act="early">🚀 ${'提前量产'}</button>` : ''}`,
  };
};

/** 行业新技术快讯：只在新部件出现时告诉玩家 */
function appearCtx() {
  return { gen: state.generation, month: state.month, mode: modeOf(state), era: productEraOf(state.designDraft || state.design || draft.plan?.formFactor), models: state.models, chipGen: state.chip?.gen || 1 };
}
function refreshNews() {
  const now = CONCEPTS.filter((c) => hasAppeared(c.id, appearCtx())).map((c) => c.id);
  const seen = new Set(state.seenConcepts || []);
  const fresh = now.filter((id) => !seen.has(id));
  if (fresh.length && state.seenConcepts) state.newConcepts = [...new Set([...(state.newConcepts || []), ...fresh])];
  state.seenConcepts = now;
}
function newsCard() {
  const list = (state.newConcepts || []).map((id) => CONCEPTS.find((c) => c.id === id)).filter(Boolean);
  if (!list.length) return '';
  return `<div class="news-card"><b>${icon('news', 16)} 行业新技术</b><span>${list.map((c) => `${conceptIcon(c, 14)} ${c.name}`).join(' · ')}</span><small>去设计部的「创新」页看看</small></div>`;
}

/** 定位说明：默认收起；首次进入企划可展开一次 */
function posCard(id, openOnce = false, formFactor) {
  const pack = packOf(formFactor || draft.plan?.formFactor || 'thick');
  const pos = pack.positioning.find((x) => x.id === id) || pack.positioning[0];
  if (!pos) return '';
  const ideal = (pack.ideal || IDEAL)[id] || {};
  const slots = pack.slots || SLOTS;
  const bars = slots.map((sl) => `<span><em>${sl.name.slice(0, 2)}</em><i><u style="width:${(ideal[sl.id] || 20) * 2.5}%"></u></i></span>`).join('');
  return `<details class="pos-card" ${openOnce ? 'open' : ''}><summary>查看定位说明 · ${esc(pos.who)}</summary><p>${esc(pos.desc)}</p><div class="pos-bars"><small>这类用户最在乎（研发力气照这个比例分）：</small>${bars}</div></details>`;
}

/** 卖点：轻提示一行；完整说明默认收起 */
function pointsCard(p) {
  const pack = packOf(p.formFactor || 'thick');
  const selected = p.pointIds.map((id) => pack.sellPoints.find((x) => x.id === id)).filter(Boolean);
  const tips = [];
  const heavy = ['flagship', 'pro', 'fashion', 'biz'].includes(p.positioningId);
  if (p.pointIds.includes('thin') && (heavy || p.pointIds.includes('battery') || p.pointIds.includes('photo')))
    tips.push(`物理提醒：${heavy ? '旗舰/专业机要堆料' : '大电池和大底镜头都占厚度'}，极致轻薄只能在电池或影像上让步。`);
  if (p.pointIds.includes('eco') && state.generation === 1) tips.push('第一代还没有上一代可互联，生态闭环这代兑现不了。');
  if (p.pointIds.includes('standby') && (p.formFactor === 'feature' || p.formFactor === 'elder'))
    tips.push('提醒：彩屏越大越费电，主打超长待机就别上最大的彩屏。');
  const tipLine = tips.length ? `<p class="pt-tip">${tips.map(esc).join(' ')}</p>` : '';
  if (!selected.length) return tipLine;
  const lines = selected.map((sp) => `<li><b>${esc(sp.name)}</b>：${esc(sp.desc)}</li>`).join('');
  return `${tipLine}<details class="pt-card"><summary>查看卖点说明（${selected.length}）</summary><ul>${lines}</ul></details>`;
}

/** 行业大事件：必须先表态 */
function marketEventCard() {
  const ev = state.pendingMarket && L.marketEventById(state.pendingMarket);
  if (!ev) return '';
  const tag = (e) => {
    const g = e.gamble;
    if (g) return `<i>🎲 ${Math.round(g.p * 100)}% 赢</i>`;
    const bits = [];
    if (e.cash) bits.push(`${icon('coin', 12)}资金 ${money(e.cash, { sign: true })}`);
    if (e.cashPct) bits.push(`${icon('coin', 12)}资金 ${Math.round(e.cashPct * 100)}%`);
    if (e.rep) bits.push(`${icon('star', 12)}口碑 ${e.rep > 0 ? '+' : ''}${e.rep}`);
    if (e.faith) bits.push(`${icon('heart', 12)}信仰 ${e.faith > 0 ? '+' : ''}${e.faith}`);
    if (e.hype) bits.push(`热度 +${e.hype}`);
    if (e.mod) bits.push(e.mod.key === 'extBan' ? `外购芯片断供 ${e.mod.months} 月` : `持续 ${e.mod.months} 月`);
    if (e.priceWar) bits.push('价格战');
    return bits.length ? `<i>${bits.join(' · ')}</i>` : '';
  };
  const head = ev.id === 'smart_revolution' ? '智能机革命' : '行业大事';
  return `<div class="mkt-ev"><div class="me-h"><span>${ev.icon || '📰'}</span><div><small>${head}</small><b>${esc(ev.title)}</b></div></div>
    <p>${esc(ev.body)}</p>
    <div class="ev-choices">${ev.choices.map((c, i) => `<button type="button" class="choice" data-act="market-choice" data-i="${i}">${esc(c.label)}${c.blurb ? `<i>${esc(c.blurb)}</i>` : tag(c.effect || {})}</button>`).join('')}</div></div>`;
}

/** 行业动态：芯片代差、价格战 */
function marketNotice() {
  const bits = [];
  L.activeMods(state).forEach((m) => {
    let txt = m.key === 'extBan' ? '外购芯片断供中' : m.key === 'cost' ? `整机成本 ×${m.val}` : m.key === 'rnd' ? `研发效率 ×${m.val}` : `销量修正`;
    if (m.decay) txt = `按键机需求每月 ${m.decay.perMonth > 0 ? '−' : '+'}${Math.abs(Math.round(m.decay.perMonth * 100))}%（下限 ${Math.round((m.floor || 0) * 100)}%）`;
    else if (m.val != null && m.key === 'demand') txt = `销量 ×${m.val}`;
    const until = m.until != null ? `（到 ${monthOfYear(m.until)} 月）` : '';
    bits.push(`<p class="warn-line ${m.key === 'demand' && m.val > 1 ? 'good' : 'bad'}">📰 ${esc(m.label || m.id || '市场')}：${txt}${until}</p>`);
  });
  if (worldEraOf(state).id === 'keypad') {
    const NET = ['GSM', 'GPRS', 'EDGE', '3G'];
    const w = networkWorldLevel(state.month, modeOf(state), state.flags || {});
    bits.push(`<p class="warn-line">📡 行业主流制式：<b>${NET[w]}</b>。制式比别人落后，报纸会写，用户心里的价位也会打折。</p>`);
    if (state.priceWar && state.month <= state.priceWar.until) bits.push(`<p class="warn-line bad">⚔ 价格战进行中（到 ${monthOfYear(state.priceWar.until)} 月）：友商都在降价，用户心理价位被压低。</p>`);
    if ((state.brand || 1) !== 1) bits.push(`<p class="warn-line ${state.brand > 1 ? 'good' : 'bad'}">🏷 品牌溢价 ×${state.brand.toFixed(2)}：${state.brand > 1 ? '同样的东西，你能卖得更贵' : '用户觉得你就该卖便宜'}</p>`);
    return bits.join('');
  }
  const mg = marketChipGen(industryMonth(state));
  const lag = mg - state.chip.gen;
  if (lag > 0) bits.push(`<p class="warn-line bad">🧪 行业主流芯片已到第 ${mg} 代，你的 ${esc(state.chip.series)} X${state.chip.gen} 落后 ${lag} 代：性能上限、口碑和心理价位都会吃亏。年终可以流片，或者在供应链环节外购芯片。</p>`);
  else if (lag < 0) bits.push(`<p class="warn-line good">🧪 你的 ${esc(state.chip.series)} X${state.chip.gen} 领先行业一代，媒体会买账。</p>`);
  if (state.priceWar && state.month <= state.priceWar.until) bits.push(`<p class="warn-line bad">⚔ 价格战进行中（到 ${monthOfYear(state.priceWar.until)} 月）：友商都在降价，用户心理价位被压低。</p>`);
  if ((state.brand || 1) !== 1) bits.push(`<p class="warn-line ${state.brand > 1 ? 'good' : 'bad'}">🏷 品牌溢价 ×${state.brand.toFixed(2)}：${state.brand > 1 ? '同样的东西，你能卖得更贵' : '用户觉得你就该卖便宜'}</p>`);
  return bits.join('');
}

/** 档期日历：从 from 到 to，标出档期、竞品与预计上市月 */
function calendar(from, launchAt, pos) {
  const cells = [];
  const rivals = rivalLaunches(from, from + 9);
  for (let m = from; m < from + 10; m++) {
    const w = windowAt(m);
    const r = rivals.filter((x) => x.month === m);
    const clash = r.some((x) => x.pos === pos);
    cells.push(`<span class="cal ${w ? (w.mul > 1 ? 'hot' : 'cold') : ''} ${m === launchAt ? 'launch' : ''} ${clash ? 'clash' : ''}" title="${w ? w.name : ''}${r.map((x) => ` ${x.brand}发布`).join('')}">
      <b>${monthOfYear(m)}月</b>${w ? `<i>${w.name}</i>` : '<i>&nbsp;</i>'}${r.length ? `<em>${r.map((x) => x.brand.slice(0, 2)).join('/')}</em>` : ''}</span>`);
  }
  const w = windowAt(launchAt);
  const c = clashAt(launchAt, pos);
  const sum = `📦 预计 ${monthOfYear(launchAt)} 月上市${w ? ` · ${w.mul > 1 ? '🔥 赶上' : '❄ 撞上'}${w.name}` : ''}${c ? ` · ⚠ ${c.brand}同期发布` : ''}`;
  return `<details class="calendar"><summary class="cal-h">${sum} <small>展开看日历</small></summary>
    <div class="cal-row">${cells.join('')}</div><small class="muted">橙色是旺季，蓝色是淡季，红框表示和竞品${term('撞档')}</small></details>`;
}

/** 研发槽：按产品时代取名字（按键机叫流畅度 / 外观与屏幕 / 拍照 / 待机与耐用 / 铃声与功能） */
function slotsOf(design) {
  return packOf(design || 'thick').slots || SLOTS;
}

/** 工程机跑分入口 */
function benchCard() {
  if (productEraOf(state.design) === 'keypad') {
    const perf = Math.round((state.slots.battery.progress / Math.max(1, L.capsMap(state).battery || 1)) * 100);
    return `<div class="bench-card"><span class="o-icon">${icon('flag', 22)}</span><div><b>工程机测试</b>
    <small>跌落、待机、通话、信号、按键寿命五项 · 待机与耐用已调校 ${perf}%</small></div>
    <button type="button" data-act="bench">开始测试</button></div>`;
  }
  const best = state.benchBest?.gen === state.generation ? state.benchBest.score : 0;
  const perf = Math.round((state.slots.perf.progress / Math.max(1, L.capsMap(state).perf)) * 100);
  return `<div class="bench-card"><span class="o-icon">${icon('flag', 22)}</span><div><b>工程机跑分</b>
    <small>${best ? `本代最好成绩 ${best.toLocaleString('en-US')}` : `性能调校 ${perf}%${state.benchGen === state.generation ? '' : perf >= 60 ? ' · 首跑会被晒到论坛' : ' · 过 60% 再跑才上得了论坛'}`}</small></div>
    <button type="button" data-act="bench">跑个分</button></div>`;
}

/** 迷你柱状图：每个月卖了多少（万台） */
function spark(vals, forecast = []) {
  const all = [...vals, ...forecast];
  const max = Math.max(1, ...all);
  return `<span class="spark">${all.map((v, i) => `<i class="${i >= vals.length ? 'fc' : ''}" style="height:${Math.max(6, Math.round((v / max) * 100))}%" title="${v} 万台"></i>`).join('')}</span>`;
}

/** 在售产品：生命周期一目了然，可以降价续命；展示本月/累计利润 */
function onSaleBlock(withActions = true, showEmpty = false) {
  const list = state.onSale || [];
  if (!list.length) {
    if (!showEmpty) return '';
    return `<div class="onsale empty"><div class="os-h"><b>🛒 在售产品</b></div>
      <p class="os-empty">暂无在售旧机（可能已清仓或以旧换新）——选清仓/以旧换新会放弃后续月续销。</p></div>`;
  }
  return `<div class="onsale"><div class="os-h"><b>🛒 在售产品</b><small>每台手机都有生命周期，约 ${L.LIFE_MONTHS} 个月后退市；推进研发月时会自动结算续销</small></div>
    ${list
      .map((m, i) => {
        const st = L.lifeStage(m);
        const last = m.lastUnits ?? (m.history || []).slice(-1)[0] ?? 0;
        const monthP = Math.round(m.lastProfit || 0);
        const lifeP = Math.round((m.firstProfit || 0) + (m.profit || 0));
        const left = L.modelTailValue(m);
        return `<div class="os-row">
          <span class="os-dot" style="background:${m.color}"></span>
          <div class="os-main"><b>${esc(m.name)}</b><em class="lstage ${st.cls}">${st.name}</em>
            <small>本月 ${last} 万台 · 本月利润 <b class="pos">${money(monthP, { sign: true })}</b> · 累计利润 <b class="pos">${money(lifeP, { sign: true })}</b></small>
            <small>累计 ${Math.round((m.history || []).reduce((a, b) => a + b, 0))} 万台 · ¥${m.price} · 预计还能赚 ${money(left)}${m.backlog > 0.5 ? ` · 排队 ${Math.round(m.backlog)} 万` : ''}</small></div>
          ${spark(m.history || [])}
          ${withActions ? `<button type="button" class="os-cut" data-act="cut-price" data-i="${i}" ${(m.cuts || 0) >= 3 ? 'disabled' : ''}>降价<small>-10%</small></button>` : ''}
        </div>`;
      })
      .join('')}</div>`;
}

function devTimeline() {
  const launchAt = state.month + state.monthsLeft + 1;
  const w = windowAt(launchAt);
  const nw = nextWindow(state.month);
  const clash = clashAt(launchAt, state.product.positioningId);
  const bits = [];
  bits.push(`📦 预计 ${monthOfYear(launchAt)} 月上市${w ? `，${w.mul > 1 ? '赶上' : '撞上'}<b>${w.name}</b> ${w.mul > 1 ? '📈' : '📉'}` : ''}`);
  if (!w && nw) bits.push(`下个旺季：${nw.name}（${monthOfYear(nw.month)} 月）`);
  if (clash) bits.push(`<span class="bad">⚠ ${clash.brand} 同期发新机</span>`);
  const r = L.devRatio(state);
  if (r >= 0.85) bits.push(`<span class="good">✅ 研发完成 ${Math.round(r * 100)}%：大部分已经到顶，再拖只是多付工资，可以提前量产</span>`);
  return `<p class="timeline">${bits.join(' · ')}</p>`;
}

function devSceneData(event = null) {
  return {
    office: state.office,
    month: state.month,
    slots: Object.fromEntries(SLOTS.map((s) => [s.id, state.slots[s.id].progress])),
    caps: L.capsMap(state),
    event,
    rivalSoon: !!clashAt(state.month + state.monthsLeft + 1, state.product?.positioningId),
    color: state.design?.color || state.designDraft?.color,
    concepts: state.design?.concepts || state.designDraft?.concepts || [],
  };
}

P.event = () => {
  const ev = EVENTS.find((e) => e.id === state.pendingEvent);
  const rec = L.recommendedEventChoice(state.pendingEvent);
  return {
    scene: ['dev', devSceneData(ev.id)],
    caption: `⚠ ${ev.type}！`,
    sheet: `<h2 class="sheet-h alert">⚠ ${ev.type}</h2>
      <h3 class="ev-title">${esc(ev.title)}</h3>
      <p>${esc(ev.body)}</p>
      <div class="ev-choices">${ev.choices
        .map((c, i) => `<button type="button" class="choice ${i === rec ? 'rec' : ''}" data-act="event-choice" data-i="${i}">${esc(c.label)}${i === rec ? '<small>稳妥</small>' : ''}${effText(c.effect)}</button>`)
        .join('')}</div>`,
    cta: '',
  };
};

function effText(e) {
  const bits = [];
  if (e.cash) bits.push(`${icon('coin', 12)}资金 ${money(e.cash, { sign: true })}`);
  if (e.months) bits.push(`⏳+${e.months}月`);
  if (e.hype) bits.push(`📣热度${e.hype > 0 ? '↑' : '↓'}`);
  if (e.faith) bits.push(`${icon('heart', 12)}信仰${e.faith > 0 ? '↑' : '↓'}`);
  if (e.slotPenalty && Object.keys(e.slotPenalty).length) bits.push(Object.values(e.slotPenalty).some((v) => v > 0) ? '🔧进度受损' : '🔧研发进度↑');
  if (e.gambleFail) bits.push('🎲赌');
  return bits.length ? `<i>${bits.join(' ')}</i>` : '';
}

const FAC_STAGES = ['🔧 试产', '📈 良率爬坡', '⚙️ 满产', '📦 装箱发货'];
const stockedUnits = () => L.stockedUnits(state);

P.factory = () => {
  const p = physical(state.design);
  const run = !draft.factoryDone;
  const units = stockedUnits();
  return {
    scene: ['factory', { color: state.design.color, stockId: state.stockId, concepts: state.design?.concepts || [], formFactor: state.design?.formFactor }],
    caption: run ? '流水线开足马力' : '首批货已装箱，等发布会开售',
    sheet: `<h2 class="sheet-h">${icon('factory', 22)} 量产 <small>${esc(state.design.modelName)} · ${esc(paletteName(state.design.color))}</small></h2>
      <div class="fac ${run ? 'running' : 'done'}">
        <div class="fac-stages">${FAC_STAGES.map((n, i) => `<span style="--i:${i}">${n}</span>`).join('')}</div>
        <div class="fac-count"><b id="fac-n">${run ? 0 : units}</b><small>/ ${units} 万台</small></div>
        <div class="fac-belt"><i></i></div>
      </div>
      <div class="qc-row"><button type="button" data-act="qc">🔨 抽检一台</button><span id="qc-out" class="muted">随机拿一台做跌落和老化测试</span></div>
      <div class="spec-row"><span>单台成本</span><b>¥${p.unitCost}</b></div>
      <div class="spec-row"><span>研发完成度</span><b>${Math.round(L.devRatio(state) * 100)}%</b></div>
      ${benchCard()}
      ${(state.onSale || []).length ? `<div class="field-l" style="margin-top:8px">新品上市，旧款逐台处理<small class="muted">（合计预计还能再挣 ${money(L.tailValue(state))}；默认 <b>继续卖</b>，清仓/换新只动本行）</small>
        <div class="sku-policies">${(state.onSale || []).map((m) => {
          const key = m.key || m.name;
          const cur = (state.oldPolicyMap || {})[key] || 'keep';
          return `<div class="sku-row"><div class="sku-name">${esc(m.name)} <small>还能约 ${money(L.modelTailValue(m))}</small></div>
            <div class="chips tight">${L.OLD_POLICIES.map((o) => `<button type="button" class="chip ${cur === o.id ? 'on' : ''} ${o.id === 'keep' ? 'rec' : ''}" data-act="old-policy-sku" data-key="${esc(key)}" data-id="${o.id}">${o.name}</button>`).join('')}</div></div>`;
        }).join('')}</div>
        <p class="policy-warn">💡 推荐默认「继续卖」拿跨代月度进账。清仓伤口碑、以旧换新养信仰——都只作用于本行机型。</p></div>` : ''}`,
    cta: `<button type="button" class="primary big" data-act="to-launch" ${draft.factoryDone ? '' : 'disabled'}>${draft.factoryDone ? '🎤 去发布会后台 ▶' : '量产中…'}</button>`,
  };
};

const QC = {
  good: ['1.5 米跌落：完好无损 ✓', '72 小时老化：一切正常 ✓', '泡水 30 分钟：还能亮 ✓', '口袋里坐了一下：没弯 ✓'],
  meh: ['跌落后边框有个小坑，问题不大', '老化测试有点烫手，在可接受范围'],
  bad: ['屏幕排线松了——这批要返工几台', '按键手感松垮，产线连夜调整'],
};

/** 按键时代同档竞品价目（随年份小幅下调） */
function keypadRivalPrices(state) {
  const yr = Math.floor((state.month - 1) / 12);
  const war = !!state.priceWar && state.month <= state.priceWar.until ? 0.92 : 1;
  const k = Math.pow(0.94, yr) * war;
  const r = (v) => Math.max(99, Math.round((v * k) / 10) * 10 - 1);
  return [
    { brand: '青橙', model: '青橙老人机', pos: 'parents', price: r(320) },
    { brand: '极光', model: '极光 E 系列音乐机', pos: 'student', price: r(700) },
    { brand: '方块', model: '方块 K 系列全键盘', pos: 'biz', price: r(1600) },
    { brand: '蓝莓', model: '蓝莓 B 系列翻盖', pos: 'fashion', price: r(1900) },
  ];
}

/** 定价台：参考信息 + 实时预测 */
function pricingPanel() {
  const fair = L.fairPrice(state);
  const pos = state.product.positioningId;
  if (draft.priceFor !== state.generation) {
    draft.priceFor = state.generation;
    draft.price = fair;
  }
  const price = draft.price;
  const f = L.salesForecast(state, price);
  const cost = f.unitCost;
  const pb = L.priceBounds(state);
  const kpEra = productEraOf(state.design) === 'keypad';
  const min = Math.max(pb.floor, kpEra ? Math.round((cost * 0.7) / 10) * 10 - 1 : roundPrice(cost * 0.7));
  const max = Math.min(pb.ceil, Math.max(fair * 2, kpEra ? 1999 : 9999));
  const pct = (v) => Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100));
  const rivals = kpEra ? keypadRivalPrices(state) : rivalPriceList(industryMonth(state), !!state.priceWar && state.month <= state.priceWar.until);
  const same = rivals.find((r) => r.pos === pos);
  const last = state.lastPrices?.[pos];
  const mood = f.pe.ratio <= 0.85 ? ['🤩', '买爆', 'good'] : f.pe.ratio <= 0.95 ? ['😊', '很值', 'good'] : f.pe.ratio <= 1.08 ? ['🙂', '合理', 'ok'] : f.pe.ratio <= 1.2 ? ['🤔', '有点贵', 'meh'] : ['😠', '劝退', 'bad'];
  const lag = L.chipLag(state);
  return `<h2 class="sheet-h">${icon('tag', 22)} 定价 <small>发布会上要念出这个数字</small></h2>
    <div class="price-big pp-dyn" data-k="big"><button type="button" data-act="price-step" data-d="-${pb.big}">−${pb.big}</button><button type="button" data-act="price-step" data-d="-${pb.step}">−</button>
      <b>¥${price.toLocaleString('en-US')}</b>
      <button type="button" data-act="price-step" data-d="${pb.step}">+</button><button type="button" data-act="price-step" data-d="${pb.big}">+${pb.big}</button></div>
    <div class="price-track">
      <i class="pt-loss" style="width:${pct(cost)}%"></i>
      <i class="pt-sweet" style="left:${pct(fair * 0.9)}%;width:${pct(fair * 1.08) - pct(fair * 0.9)}%"></i>
      <em class="pt-mark fair" style="left:${pct(fair)}%"><span>心理价位</span></em>
      <em class="pt-mark cost" style="left:${pct(cost)}%"><span>成本</span></em>
      ${same ? `<em class="pt-mark rival" style="left:${pct(same.price)}%"><span>${esc(same.brand)}</span></em>` : ''}
      <input type="range" id="price-range" min="${min}" max="${max}" step="${pb.step}" value="${price}" />
    </div>
    <div class="price-ref pp-dyn" data-k="ref">
      <div><small>💭 用户心理价位</small><b>≈ ¥${fair.toLocaleString('en-US')}</b><i>体验 · 新颖 · 品牌 ×${(state.brand || 1).toFixed(2)}${lag > 0 ? (kpEra ? ` · 制式落后 ${lag} 档` : ` · 芯片落后 ${lag} 代`) : ''}</i></div>
      <div><small>🔩 单台成本</small><b>¥${cost.toLocaleString('en-US')}</b><i>${L.scaleDiscount(state) > 0.005 ? `规模效应已省 ${Math.round(L.scaleDiscount(state) * 100)}%` : '低于它就是卖一台亏一台'}</i></div>
      <div><small>⚔ 同档竞品</small><b>${same ? `${esc(same.model)} ¥${same.price}` : '—'}</b><i>${rivals.filter((r) => r !== same).slice(0, 2).map((r) => `${esc(r.brand)} ¥${r.price}`).join(' · ')}</i></div>
      <div><small>📜 上一代同定位</small><b>${last ? `¥${last}` : '首次定价'}</b><i>${last ? '涨太多老用户会不满' : '这次的价格会成为以后的锚'}</i></div>
    </div>
    <div class="price-fc pp-dyn" data-k="fc">
      <div class="fc-row">
        <div class="fc-mood ${mood[2]}"><div class="fc-emo">${mood[0]}</div><b>${mood[1]}</b></div>
        <div class="fc-nums">
          <div><small>预计首月需求</small><b>${Math.round(f.units * 0.85)}~${Math.round(f.units * 1.15)} 万台</b></div>
          <div><small>首批备货</small><b>${f.stocked} 万台${f.units > f.stocked * 1.05 ? ' · 会断货' : f.stocked > f.units * 1.25 ? ' · 会积压' : ''}</b></div>
          <div><small>单台利润 <i>扣渠道 ¥${f.channel}</i></small><b class="${f.perUnit < 0 ? 'neg' : ''}">¥${f.perUnit.toLocaleString('en-US')}</b></div>
          <div><small>预计首月利润</small><b class="${f.profit < 0 ? 'neg' : ''}">${money(f.profit, { sign: true })}</b>${f.later > 0 ? `<small>+ 之后补货约 ${money(f.later)}</small>` : ''}</div>
        </div>
      </div>
      <p class="fc-note">💬 ${esc(f.pe.note)}${f.pe.anchorNote ? `<br/>📜 ${esc(f.pe.anchorNote)}` : ''}${f.pe.ratio <= 0.8 ? '<br/>⚠ 价格太狠会引发价格战，品牌溢价也会掉' : f.pe.ratio >= 1 ? '<br/>✨ 卖得贵且口碑好，品牌溢价会上升' : ''}</p>
    </div>`;
}

P.launch = () => {
  if (!state.product.price)
    return {
      scene: ['launch', {}],
      caption: '后台：市场部和财务在为价格吵架',
      sheet: pricingPanel(),
      cta: `<button type="button" class="primary big" data-act="set-price">就这个价！▶</button>`,
    };
  const kpEra = productEraOf(state.design) === 'keypad';
  let opts = draft.launchOpts || (draft.launchOpts = L.defaultLaunchOpts('safe', state.design));
  if (!L.launchStylesFor(state.design).some((x) => x.id === opts.style)) opts = draft.launchOpts = L.defaultLaunchOpts(kpEra ? 'retail' : 'safe', state.design);
  const chipRow = (field, title) => {
    const list = L.launchOptFieldsFor(state.design)[field] || [];
    if (!list.length) return '';
    return `<div class="launch-opt"><span class="lo-lab">${title}</span><div class="lo-chips">${list
      .map(
        (o) =>
          `<button type="button" class="chip ${opts[field] === o.id ? 'on' : ''}" data-act="launch-opt" data-field="${field}" data-id="${o.id}" title="${esc(o.hint || '')}">${o.label}${o.risk ? ' ⚠' : ''}</button>`,
      )
      .join('')}</div></div>`;
  };
  if (kpEra) {
    // 按键时代：没有演讲式发布会，上市靠渠道、展会和广告
    const ad = L.KEYPAD_AD_PLANS.find((a) => a.id === opts.ad) || L.KEYPAD_AD_PLANS[0];
    const ch = L.KEYPAD_LAUNCH_STYLES.find((c) => c.id === opts.style) || L.KEYPAD_LAUNCH_STYLES[2];
    const spend = (ch.cost || 0) + (ad.cost || 0);
    return {
      scene: ['launch', {}],
      caption: '市场部把上市方案摊在了会议桌上',
      sheet: `<h2 class="sheet-h">${icon('mic', 22)} 上市方案 <small>零售价 ¥${state.product.price} <button type="button" class="link-btn" data-act="re-price">改价</button></small></h2>
    <p class="muted launch-hint">这个年代没有人开几十分钟的发布会。新机靠运营商、展会和广告跟用户见面。</p>
    <h3 class="sub-h">首发渠道</h3>
    <div class="cards3">${L.KEYPAD_LAUNCH_STYLES.map(
      (c) => `<button type="button" class="pick ${opts.style === c.id ? 'on' : ''}" data-act="launch-pick-style" data-id="${c.id}"><b>${c.label}</b><small>${c.desc}</small><i>${c.cost ? `费用 ${money(c.cost)}` : c.risk >= 0.1 ? '有点风险' : '稳'}</i></button>`,
    ).join('')}</div>
    <div class="launch-custom">
      ${chipRow('ad', '广告投放')}
      ${chipRow('camera', '镜头风格')}
    </div>
    <p class="risk-line">${spend ? `💰 本次上市要花 ${money(spend)}` : '✓ 不额外花钱'}${ch.id === 'carrier' ? ' · 首批货运营商包销，不会压库存' : ch.id === 'expo' ? ' · 展会上同场竞品多，可能被抢风头' : ''}</p>`,
      cta: `<button type="button" class="primary big" data-act="launch-go">就这么上市 ▶</button>`,
    };
  }
  return {
    scene: ['launch', {}],
    caption: '后台：观众已经入场，主讲人还在背稿',
    sheet: `<h2 class="sheet-h">${icon('mic', 22)} 发布会 <small>首销价 ¥${state.product.price} <button type="button" class="link-btn" data-act="re-price">改价</button></small></h2>
    <p class="muted launch-hint">先选主风格，再微调演出——都会写进节目单与手机屏。</p>
    <div class="cards3">${L.launchStylesFor(state.design).map(
      (s) => `<button type="button" class="pick ${opts.style === s.id ? 'on' : ''}" data-act="launch-pick-style" data-id="${s.id}"><b>${s.label}</b><small>${s.desc}</small><i>${s.risk >= 0.3 ? '⚠ 很冒险' : s.risk >= 0.1 ? '有点风险' : '稳'}</i></button>`,
    ).join('')}</div>
    <div class="launch-custom">
      ${chipRow('openTone', '开场调性')}
      ${chipRow('light', '灯光色温')}
      ${chipRow('camera', '运镜')}
      ${chipRow('screenTheme', '屏显主题')}
      ${chipRow('wallpaper', '壁纸动感')}
      <div class="launch-opt toggles">
        <button type="button" class="chip ${opts.emphasize ? 'on' : ''}" data-act="launch-toggle" data-field="emphasize">主打卖点特写</button>
        <button type="button" class="chip ${opts.easter ? 'on' : ''}" data-act="launch-toggle" data-field="easter">彩蛋页${opts.style === 'safe' ? ' · 略增风险' : ''}</button>
      </div>
    </div>
    <p class="risk-line">${opts.camera === 'wild' || opts.easter ? '⚠ 夸张运镜 / 彩蛋会抬高热度上限，也更容易翻车' : '✓ 当前配置偏稳，适合把完成度打满'}</p>`,
    cta: `<button type="button" class="primary big" data-act="launch-go">开场！▶</button>`,
  };
};

P.score = () => {
  const W = state.wowResult || {};
  const heat = state.launchHeat ?? 60;
  return {
    scene: ['score', { color: state.design?.color, grade: W.grade, flop: state.launchFlop, hidePhone: !!state.lastCut, concepts: state.design?.concepts || [], formFactor: state.design?.formFactor }],
    imgs: state.lastCut ? [{ src: state.lastCut, x: 50, y: 50, h: 52, cls: 'hero' }] : [],
    caption: productEraOf(state.design) === 'keypad'
      ? state.launchFlop ? '展台那天出了点状况，好在货已经铺出去了' : '第二天，报纸和杂志的评测陆续出来了'
      : state.launchFlop ? '演示机卡住了，但发布会总算撑完了' : heat >= 85 ? '全场沸腾，掌声停不下来' : '发布会落幕，媒体开始写稿',
    sheet: `<h2 class="sheet-h">${icon('news', 22)} 媒体评测 <small>${productEraOf(state.design) === 'keypad' ? '上市第二天的报纸与杂志' : '发布会结束 30 分钟后'}</small></h2>
      <div class="score-big">
        <div class="sb-cell rv-step" data-step="1"><b data-count="${state.mediaScore}">${state.mediaScore}</b><span>媒体评分 → 口碑</span></div>
        <div class="sb-cell rv-step" data-step="2"><b class="sub" data-count="${state.userScore}">${state.userScore}</b><span>用户评分 → 信仰</span></div>
      </div>
      <div class="headline-g rv-step stamp" data-step="3">${esc(state.headline)}</div>
      <div class="rv-step" data-step="4">
        <div class="wow-row"><span class="grade-pill g-${W.grade} stamp">${W.grade || '-'}</span>
          <span>${term('惊艳度', '惊艳')} <b>${W.score ?? '-'}</b></span><span>${term('新颖度', '新颖')} <b>${W.novelty ?? '-'}</b></span><span>${term('完成度', '完成')} <b>${W.completeness ?? '-'}%</b></span><span>${term('出圈度', '🔥 出圈')} <b>${W.buzz ?? 0}</b></span></div>
        ${W.firsts?.length ? `<div class="firsts">${W.firsts.map((f) => `<span>🏆 ${term('首发')} ${esc(f)}</span>`).join('')}</div>` : ''}
        ${W.buzz >= 40 ? `<p class="trend">📈 #${esc(state.design.modelName)}# 冲上热搜</p>` : ''}
      </div>
      <div class="rv-step" data-step="5">${commentBlock()}</div>
      <div class="rv-step" data-step="6">${reviewBlock()}
      ${rpGainBlock()}</div>`,
    cta: `<button type="button" class="primary big" data-act="to-sales">开售！看首月战报 ▶</button>
      <button type="button" data-act="share-launch">📤 分享</button>`,
  };
};

function reviewBlock() {
  const R = state.review;
  if (!R) return '';
  const tag = { more: ['多了', 'm'], less: ['少了', 'l'], ok: ['刚好', 'o'] };
  const fit = R.match >= 85 ? '很到位' : R.match >= 70 ? '还差一点' : '跑偏了';
  return `<details class="review" open><summary>📋 复盘 · ${R.exp >= R.bar ? '超出' : '低于'}${term('期望线')} ${R.exp >= R.bar ? '✅' : '⬇'}</summary>
    <div class="rv-row"><span>${term('配比')}：${fit}</span></div>
    <div class="rv-chips">${R.verdict.filter((v) => !(v.id === 'camera' && v.ideal === 0 && v.share === 0)).map((v) => `<span class="rv rv-${tag[v.v][1]}">${esc((slotsOf(state.design).find((x) => x.id === v.id)?.name || v.name).slice(0, 2))} ${tag[v.v][0]}</span>`).join('')}</div>
    <div class="rv-chips">${R.promises.map((p) => `<span class="rv ${p.ok ? 'rv-o' : 'rv-l'}">${p.ok ? '✓' : '✗ 货不对板'} ${p.name}</span>`).join('')}</div>
    ${R.priceNote ? `<p class="warn-line ${R.priceUser < 0 ? 'bad' : 'good'}">💬 定价：${R.priceNote}</p>` : ''}
    ${R.newNote ? `<p class="note-new">📒 这个定位摸透了，已记入${term('企划笔记')}</p>` : ''}
  </details>`;
}

P.sales = () => {
  const r = state.salesResult;
  const queue = r.stockState === 'short' ? 1 : r.stockState === 'over' ? 0.15 : 0.55;
  const pct = Math.round((r.sold / Math.max(1, r.stocked)) * 100);
  return {
    scene: ['sales', { month: state.month, color: state.design?.color, state: r.stockState, queue, hidePhone: !!state.lastCut, concepts: state.design?.concepts || [], formFactor: state.design?.formFactor, positioningId: state.product?.positioningId, keypad: productEraOf(state.design) === 'keypad' }],
    imgs: state.lastCut ? [{ src: state.lastCut, x: 31, y: 41, h: 30 }] : [],
    caption: productEraOf(state.design) === 'keypad'
      ? r.stockState === 'short' ? '营业厅柜台前挤满了人，店员说下批货下周到' : r.stockState === 'over' ? '柜台里摆满了，店员在门口发传单' : '营业厅里问价的人不少'
      : r.stockState === 'short' ? '门口排起长队，黄牛也来了' : r.stockState === 'over' ? '店里有点冷清，仓库在吃灰' : '门店生意不错',
    sheet: `<h2 class="sheet-h">${icon('cart', 22)} 首月战报</h2>
      <div class="score-big">
        <div class="sb-cell rv-step" data-step="1"><b data-count="${r.sold}">${r.sold}</b><span>万台售出</span></div>
        <div class="sb-cell rv-step" data-step="3"><b class="sub money ${r.profit < 0 ? 'neg' : ''}" data-count="${r.profit}" data-sign="1" data-money="1">${money(r.profit, { sign: true })}</b><span>首月利润</span></div>
      </div>
      <div class="rv-step" data-step="2">
        <div class="stockbar ${r.stockState}"><div class="sk-top"><span>📦 首批备货 ${r.stocked} 万台</span><b>${r.stockState === 'short' ? '售罄！' : `卖掉 ${pct}%`}</b></div>
          <div class="sk-track"><i data-w="${Math.min(100, pct)}"></i></div></div>
        <p class="stock-note">${esc(r.stockNote)}</p>
      </div>
      <div class="rv-step" data-step="4">
        ${r.oldNote ? `<p class="warn-line ${r.oldPolicy === 'clear' ? 'bad' : 'good'}">♻ ${esc(r.oldNote)}</p>` : ''}
        ${r.repDelta || r.faithDelta ? `<p class="stat-fork"><span>⭐ 大众口碑 ${r.repDelta >= 0 ? '+' : ''}${r.repDelta || 0} <small>跟媒体分</small></span><span>❤ 铁粉信仰 ${r.faithDelta >= 0 ? '+' : ''}${r.faithDelta || 0} <small>跟用户评分</small></span></p>` : ''}
        ${r.window ? `<p class="warn-line ${r.windowMul > 1 ? 'good' : 'bad'}">📅 ${r.windowMul > 1 ? '赶上' : '撞上'}${r.window}</p>` : ''}
        ${r.clash ? `<p class="warn-line bad">⚔ ${r.clash}</p>` : ''}
        ${(r.chain || []).map((c) => `<p class="chain">🔗 ${esc(c)}</p>`).join('')}
        ${r.backlog > 0 ? `<p class="warn-line good">📦 还有约 <b>${r.backlog} 万台</b>订单在排队：工厂追加生产，之后几个月陆续交付，预计再赚 <b>${money(r.backlogValue)}</b></p>` : ''}
        ${(() => {
          const m = (state.onSale || []).find((x) => x.gen === state.generation);
          if (!m) return '';
          const fc = L.lifeForecast(m);
          const total = Math.round(r.sold + fc.reduce((a, b) => a + b, 0));
          const left = L.modelTailValue(m);
          const lifeP = Math.round((m.firstProfit || 0) + (m.profit || 0));
          return `<div class="life-fc"><div class="lf-h"><b>📈 生命周期预测</b><small>首月只结首月：后面约 ${fc.length} 个月按月续销（约两年）</small></div>
            ${spark([r.sold], fc)}
            <p>预计总销量约 <b>${total} 万台</b>，口碑${m.wom > 0.03 ? '<b class="pos">很好，后面几个月会越卖越多</b>' : m.wom < -0.03 ? '<b class="neg">一般，热度会掉得很快</b>' : '平稳'}。竞品发新机、出了下一代都会分走销量，可以随时降价续命。</p>
            <div class="tail-callout"><b>🛒 持续收入（按月进账，约 ${L.LIFE_MONTHS} 个月）</b>
              <span>首月已入账 <b class="pos">${money(r.profit, { sign: true })}</b>（只结首月，不会一次结清终身）</span>
              <span>预计后面还能再赚 <b class="pos">${money(left)}</b></span>
              <small>它会在货架上继续卖约两年，每个月的进账都记在账本「在售·${esc(m.name)}」里；清仓或以旧换新会提前收尾。</small></div></div>`;
        })()}
        <div class="unit-econ"><span>售价 <b>¥${r.price}</b></span><span>− 成本 <b>¥${r.unitCost}</b></span><span>− 渠道营销 <b>¥${r.channel}</b></span><span>= 每台赚 <b class="${r.perUnit < 0 ? 'neg' : ''}">¥${r.perUnit}</b></span></div>
      </div>`,
    cta: `<button type="button" class="primary big" data-act="to-next">${state.month >= runMonths(state) ? (state.mode === 'chronicle' ? '编年结算 ▶' : '三年结算 ▶') : '年终总结，规划下一代 ▶'}</button>`,
  };
};

P.next = () => {
  const last = state.models[state.models.length - 1];
  return {
    scene: draft.showHQ
      ? ['hq', { office: state.office, month: state.month, color: state.design?.color || state.designDraft?.color }]
      : ['next', { models: state.models.map((m) => ({ color: m.design.color, grade: m.grade, firsts: m.firsts?.length, cut: !!m.cut })) }],
    imgs: draft.showHQ ? [] : wallImgs(),
    caption: draft.showHQ ? `新家：${L.office(state).name}` : '年会：这一代进了机型墙',
    sheet: `<h2 class="sheet-h">${icon('trophy', 22)} 年终会</h2>
      <div class="ntabs"><button type="button" class="${draft.nextTab !== 'invest' ? 'on' : ''}" data-act="next-tab" data-id="review">📊 年终复盘</button><button type="button" class="${draft.nextTab === 'invest' ? 'on' : ''}" data-act="next-tab" data-id="invest">🏗 投资与升级 <small>${money(state.cash)}</small></button></div>
      ${draft.nextTab === 'invest' ? investTab() : `
      ${last ? `<div class="model-card">${last.thumb ? `<img src="${last.thumb}" alt="" />` : ''}<div><b>${esc(last.design.modelName)}</b>
        <small>惊艳 ${last.wow} ${last.grade} · 首月 ${last.sold} 万台 · 至今 ${last.lifeSold ?? last.sold} 万台 · 至今利润 ${money(last.lifeProfit ?? 0)} · 媒体 ${last.media}</small>
        ${(last.firsts || []).map((f) => `<span class="mini-first">🏆${esc(f)}</span>`).join('')}</div>
        ${state.shelfResult?.income ? `<p class="shelf-note">🛒 上市后货架续销 ${state.shelfResult.months} 个月，又进账 <b class="pos">${money(state.shelfResult.income, { sign: true })}</b>（按月结算，不是一次结清）</p>` : ''}</div>` : ''}
      ${(() => {
        const sums = L.ledgerOf(state);
        if (!sums.length) return '';
        const net = sums.reduce((a, [, v]) => a + v, 0);
        const max = Math.max(...sums.map(([, v]) => Math.abs(v)), 1);
        const tailIn = L.onSaleIncomeOf(state);
        return `<div class="report"><div class="rp-h"><b>📊 这一代的财报</b><span class="${net < 0 ? 'neg' : 'pos'}">净 ${money(net, { sign: true })}</span></div>
          ${sums.map(([k, v]) => `<div class="rp-row"><span>${esc(k)}</span><i><u class="${v < 0 ? 'neg' : 'pos'}" style="width:${Math.round((Math.abs(v) / max) * 100)}%"></u></i><b class="${v < 0 ? 'neg' : 'pos'}">${money(v, { sign: true })}</b></div>`).join('')}
          ${tailIn ? `<div class="tail-report"><b>🛒 在售机型（含前代续销）</b><span class="pos">本代入账 ${money(tailIn, { sign: true })}</span>
            <small>研发月推进时自动结算；条目形如「在售·机型名」。清仓/以旧换新会放弃后续续销。</small></div>` : `<div class="tail-report muted"><b>🛒 在售续销</b><small>本代账本还没有「在售·…」入账——新品刚上市的续销会在下一代研发月里陆续进账。</small></div>`}
          <small class="muted">点顶部 💰 随时查看账本流水</small></div>`;
      })()}
      ${shareBlock()}
      ${onSaleBlock(true, true)}
      <button type="button" class="go-invest" data-act="next-tab" data-id="invest">下一步：花钱让公司变强 ▶</button>`}`,
    cta: `<button type="button" class="primary big" data-act="next-gen">开新企划 ▶</button>`,
  };
};

/** 年终会第二页：扩建、芯片、战略投资、部门 */
function investTab() {
  return `${(() => {
        const o = L.office(state);
        const n = L.nextOffice(state);
        return `<div class="office-card"><span class="o-icon">${o.icon}</span><div><b>${o.name}</b><small>${o.desc}</small>
          ${n ? `<small class="next">扩建到 ${n.icon} ${n.name}：${n.desc}</small>` : '<small class="next">已经是最大的园区了</small>'}</div>
          ${n ? costBtn('office', '', `扩建成${n.name}`, n.cost) : ''}</div>`;
      })()}
      ${chipLab()}
      ${expansionBlock()}
      <h3 class="sub-h">部门升级 <small class="have">${icon('coin', 13)} 现有资金 ${money(state.cash)}</small></h3>
      <div class="depts">${DEPTS.map((d) => {
        const lv = L.deptLevel(state, d.id);
        const cost = L.deptUpgradeCost(state, d.id);
        return `<div class="dept"><span class="d-icon">${d.icon}</span><div><b>${d.name} <em>Lv${lv}</em></b><small>${d.desc[lv - 1]}</small>
          ${cost != null ? `<small class="next">下一级：${d.desc[lv]}</small>` : ''}</div>
          ${cost != null ? costBtn('upgrade', d.id, `升到 Lv${lv + 1}`, cost) : '<span class="maxed">满级</span>'}</div>`;
      }).join('')}</div>
      <p class="muted">🔬 研发点 ${state.rp}：在设计阶段的「💡 创新」页解锁新概念件。</p>`;
}

P.ending = () => {
  const E = endingTitles(state);
  const years = E.stats.years || (state.mode === 'chronicle' ? 5 : 3);
  const chron = (state.chronicle || []).filter((c) => c.kind === 'revolution' || c.gen);
  const chronHtml = chron.length
    ? `<div class="chronicle-strip" style="display:flex;gap:8px;overflow:auto;padding:8px 0">
        ${chron.map((c) => c.kind === 'revolution'
          ? `<div class="title-card" style="min-width:140px"><b>📺 智能机革命</b><small>第${c.month}月 · ${{ pivot: '全力转型', dual: '双线并行', hold: '坚守按键' }[c.choice] || c.choice}</small></div>`
          : `<div class="title-card" style="min-width:140px"><b>${esc(c.name || ('第' + c.gen + '代'))}</b><small>${esc(c.era || '')} · ${esc(c.form || '')} · 卖 ${c.lifeSold ?? c.sold ?? 0}</small></div>`
        ).join('')}
      </div>`
    : '';
  return {
    scene: ['next', { models: state.models.map((m) => ({ color: m.design.color, grade: m.grade, firsts: m.firsts?.length, cut: !!m.cut, formFactor: m.design?.formFactor })), finale: true }],
    imgs: wallImgs(),
    caption: years === 5 ? '五年编年落幕，年会大结算' : '三年过去了，年会大结算',
    sheet: `<h2 class="sheet-h">${icon('trophy', 22)} ${years === 5 ? '编年结算' : '三年结算'}</h2>
      <div class="titles">${E.titles.map((t, i) => `<div class="title-card ${i === 0 ? 'main' : ''}"><b>${t.t}</b><small>${esc(t.d)}</small></div>`).join('')}</div>
      <div class="stat-grid">
        <div><b>${E.stats.gens}</b><span>代产品</span></div><div><b>${E.stats.firsts}</b><span>项首创</span></div>
        <div><b>${E.stats.avgWow}</b><span>平均惊艳</span></div><div><b>${E.stats.sold}</b><span>总销量(万台)</span></div>
      </div>
      ${chronHtml ? `<h3 class="sub-h">公司编年史</h3>${chronHtml}` : ''}
      ${shareBlock(true)}
      <div class="ending-wall">${state.models.map((m) => `<span title="${esc(m.design.modelName)}">${m.thumb ? `<img src="${m.thumb}" alt="" />` : '📱'}<i>${m.grade || ''}</i></span>`).join('')}</div>`,
    cta: `<button type="button" class="primary big" data-act="hard-restart">再来一局</button>
      <button type="button" data-act="share-ending">📤 分享结局</button>`,
  };
};

/** 市场份额：你和四家竞品最近三个月的出货量 */
function shareBlock(final = false) {
  const t = L.shareTable(state);
  if (!t) return '';
  const move = state.lastRank && state.rank ? state.lastRank - state.rank : 0;
  return `<div class="share"><div class="sh-h"><b>📊 国内手机出货量排名</b><small>最近三个月</small>
      <span class="sh-rank">第 <b>${t.rank}</b> 名${move > 0 ? `<em class="up">▲${move}</em>` : move < 0 ? `<em class="down">▼${-move}</em>` : ''}</span></div>
    ${t.rows.map((r, i) => `<div class="sh-row ${r.me ? 'me' : ''}"><span>${i + 1}</span><b>${r.me ? esc(state.companyName) : esc(r.name)}</b><i><u style="width:${Math.max(2, r.pct)}%;background:${r.color}"></u></i><em>${r.pct.toFixed(1)}%</em></div>`).join('')}
    ${final ? '' : `<small class="muted">${t.rank === 1 ? '你已经是第一了！' : `离第 ${t.rank - 1} 名还差 ${Math.round(t.rows[t.rank - 2].v - t.rows[t.rank - 1].v)} 万台。爆款、出海、多款同时在售都能把份额拉上去。`}</small>`}</div>`;
}

/** 战略投资：后期的钱往哪花 */
function expansionBlock() {
  return `<h3 class="sub-h">🌐 战略投资 <small class="have">${icon('coin', 13)} 现有资金 ${money(state.cash)}</small></h3><p class="muted sm">一次投入 + 每月运营费，长期收益。</p>
    <div class="expand">${EXPANSIONS.filter((e) => !e.eras || eraAllowsEvent(e.eras, worldEraIdOf(state))).map((e) => {
      const own = L.hasAsset(state, e.id);
      const ok = !e.need || e.need(state);
      return `<div class="ex ${own ? 'own' : ok ? '' : 'lock'}"><span class="ex-i">${e.icon}</span><div><b>${e.name}</b><small>${e.desc}</small>
        <small class="muted">${own ? `已拥有 · 每月运营 ${money(e.upkeep)}` : ok ? `每月运营 ${money(e.upkeep)}` : `🔒 ${e.needText}`}</small></div>
        ${own ? '<span class="maxed">✓</span>' : ok ? costBtn('expand', e.id, '投资', e.cost) : `<span class="locked-tag">🔒 未解锁</span>`}</div>`;
    }).join('')}</div>`;
}

/** 芯片实验室：流片升级 + 跑分走势 */
function chipLab() {
  if (worldEraOf(state).id === 'keypad') {
    const NET = ['GSM', 'GPRS', 'EDGE', '3G'];
    const mode = modeOf(state);
    const w = networkWorldLevel(state.month, mode, state.flags || {});
    const at = (mode === 'chronicle' ? [1, 6, 12, 19] : [1, 4, 7, 10])[w + 1];
    return `<div class="office-card"><span class="o-icon">📡</span><div><b>通信实验室</b><small>行业主流制式：${NET[w]}${w < 3 ? ` · 下一代 ${NET[w + 1]} 约第 ${at} 个月出现` : ''}</small>
      <small class="next">按键机不比芯片，比的是网络制式。新制式一出现，配置台就能选。</small></div></div>`;
  }
  const c = state.chip;
  const cost = L.chipResearchCost(state);
  const hist = c.history.map((h) => ({ label: `X${h.gen}`, v: h.bench, rv: rivalBench(industryMonth(h.month, modeOf(state))) }));
  if (c.research) hist.push({ label: `X${c.research.gen}`, v: chipBench(c.research.gen, 1), rv: rivalBench(industryMonth(state.month + c.research.months, modeOf(state))), pending: true });
  const max = Math.max(...hist.map((h) => Math.max(h.v, h.rv)));
  const bars = hist
    .map(
      (h) => `<div class="cl-col ${h.pending ? 'pending' : ''}"><div class="cl-bars"><i class="me" style="height:${Math.round((h.v / max) * 100)}%"></i><i class="rv" style="height:${Math.round((h.rv / max) * 100)}%"></i></div>
        <b>${h.label}</b><small>${(h.v / 10000).toFixed(0)}万</small></div>`,
    )
    .join('');
  return `<div class="chiplab">
    <div class="cl-head"><span class="o-icon">🧪</span><div><b>芯片实验室</b>
      <small>当前：<input id="chipseries" class="cl-name" maxlength="4" value="${esc(c.series)}" /> X${c.gen} · Pro 跑分 ${(chipBench(c.gen, 1) / 10000).toFixed(0)} 万</small></div>
      ${c.research ? `<span class="maxed">流片中 · 还剩 ${c.research.months} 月</span>` : costBtn('chip-research', '', `研发 X${cost.next}（${cost.months} 个月）`, cost.cash)}</div>
    <div class="cl-chart">${bars}</div>
    ${(() => {
      const mg = marketChipGen(industryMonth(state));
      const lag = mg - c.gen;
      return `<p class="warn-line ${lag > 0 ? 'bad' : 'good'}">行业主流第 ${mg} 代 · 你 X${c.gen}${lag > 0 ? `，落后 ${lag} 代` : lag < 0 ? '，领先' : '，同代'}。约每 10 个月行业进一代。</p>`;
    })()}
    <p class="muted">🟧 你的芯片 · ⬜ 竞品同期 · ${term('流片')}与下一代研发同时进行</p>
  </div>`;
}


P.angel = () => {
  const card = L.angelById(state.pendingAngel);
  if (!card) {
    state.phase = 'dev';
    return P.dev();
  }
  const tier = L.loanSummary(state).tierLabel;
  return {
    scene: ['plan', { office: state.office, month: state.month, color: state.design?.color || state.designDraft?.color, concepts: state.design?.concepts || state.designDraft?.concepts || [] }],
    caption: `天使奇遇 · ${card.kind}`,
    sheet: `<h2 class="sheet-h">🕊️ 天使奇遇 <small>${esc(card.kind)} · 融资档 ${esc(tier)}</small></h2>
      <div class="angel-card">
        <div class="angel-av">🧑‍🏫</div>
        <div class="angel-body">
          <b>${esc(card.title)}</b>
          <small>老周 · 天使投资人</small>
          <p>${esc(card.body)}</p>
        </div>
      </div>
      <div class="ev-choices">${card.choices
        .map((c, i) => `<button type="button" class="choice angel" data-act="angel-choice" data-i="${i}">${esc(c.label)}</button>`)
        .join('')}</div>
      <p class="muted angel-note">同梗奇遇会冷却，不会刷屏。天使兜底破产急救仍单独保留。</p>`,
    cta: '',
  };
};

P.rescue = () => {
  const R = state.rescue || { amount: 0, reason: '' };
  return {
    scene: ['title', {}],
    caption: '深夜，车库的灯还亮着',
    sheet: `<h2 class="sheet-h alert">💸 账上没钱了</h2>
      <p>${esc(R.reason)}</p>
      <div class="rescue-card"><span class="tut-av">🧑‍🏫</span><div><b>老周</b><small>天使投资人</small>
        <p>「第一次创业谁没摔过？这笔钱你先拿着。<br/>记住：<b>下次可没人兜底了。</b>」</p></div></div>
      <div class="rescue-cash"><small>注资</small><b>${money(R.amount, { sign: true })}</b><small>账上现金恢复到 ${money(state.cash)}</small></div>
      <p class="muted">提示：备货别太激进，研发工期别拖太长；办公室和部门升级量力而行。</p>`,
    cta: `<button type="button" class="primary big" data-act="rescue-ok">收下这笔钱，重新出发 ▶</button>`,
  };
};

P.bust = () => ({
  scene: ['bust', {}],
  caption: '卷帘门拉下来了',
  sheet: `<h2 class="sheet-h alert">倒闭了</h2><p>${esc(state.bustReason)}</p><p class="muted">共做了 ${state.models.length} 代产品。</p>`,
  cta: `<button type="button" class="primary big" data-act="hard-restart">再开一局</button>`,
});

function gauge(label, pct, cls = '') {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return `<div class="gauge"><div class="gauge-label"><span>${label}</span><span>${v}</span></div>
    <div class="gauge-track"><div class="gauge-fill ${cls}" style="width:${v}%"></div></div></div>`;
}

// ═════════════════════════ 新手引导 ═════════════════════════

const TUT_SMART = {
  plan: '欢迎！你有一段时间，做出让人惊艳的手机，别破产。<br/>先定这一代卖给谁、卖多少钱、主打什么。带虚线的词都可以点开看解释。',
  design: '这是设计部。<b>🔧 配置</b>选部件，<b>💡 创新</b>挑让人眼前一亮的东西，<b>🎨 外观</b>随你喜欢。<br/>拖动手机能转着看。满意了就「定稿」。',
  supply: '选一家代工厂，再决定首批备多少货。<br/>备少了会断货，备多了压在仓库里。',
  dev: '每推进一个月，团队就往前做一点，觉得哪项重要就点 ⭐。<br/>性能调校过半以后，可以拿工程机<b>跑个分</b>，成绩好会在论坛刷屏。',
  event: '出状况了！选一个你能接受的代价。',
  factory: '流水线开工了。等它跑完的时候，可以随手<b>抽检</b>一台。',
  launch: '先<b>定价</b>：参考用户心理价位、成本和竞品，下面会实时预测销量和利润。<br/>然后选一种讲法上台——<b>轻点屏幕就能翻页</b>。承诺的卖点做没做到，台下一清二楚。',
  score: '媒体和用户打分了。往下翻看看<b>评论区</b>在说什么，<b>复盘</b>会告诉你下一代该往哪改。',
  sales: '首月卖得怎么样？之后它还会继续卖一段时间。',
  next: '一轮结束了。可以升级部门、扩建办公室、让芯片升级——也可以先攒着钱。<br/>剩下的，靠你自己摸索。',
};
const TUT_KEYPAD = {
  plan: '这几年，街上人手一台按键机。<br/>先想好做哪一种：普通功能机，还是给爸妈用的老年机？再决定卖给谁、卖什么价。带虚线的词可以点开看解释。',
  design: '这里定配置：基带、屏幕、摄像头、键盘、铃声、网络制式。<br/>每一样都会算进成本和待机。手机可以拖着转，满意了就「定稿」。',
  supply: '找一家代工厂，再定首批备多少货。<br/>按键机靠走量，但压在仓库里的货也是钱。',
  dev: '每个月推进一次研发。哪项最要紧，就点 ⭐ 让大家多花力气。<br/>工程机做出来以后，可以送去做跌落、待机这些测试。',
  event: '出状况了。选一个你能接受的代价。',
  factory: '流水线开工了。等的时候可以随手抽检一台。',
  launch: '先定零售价，再定上市方案：跟运营商签独家、去通信展摆展台，还是直接铺到卖场？要不要打电视广告？<br/><b>轻点屏幕可以翻页</b>。',
  score: '报纸和论坛的评价出来了。复盘会告诉你下一代该补哪一块。',
  sales: '首月卖得怎么样？营业厅和代理商还会接着帮你卖。',
  next: '一年过去了。运营商专柜、小城镇代理都可以考虑。<br/>听说南边有家公司在做大屏触控手机——到时候是跟还是不跟，你得拿主意。',
  revolution: '蓝莓的大屏触控手机来了。普通按键机会一年年卖不动，老年机还会有人要。<br/>转型、两条腿走路、还是守住按键机——三条路都走得通，但走法不一样。',
};
function TUT(phase) {
  const we = state ? worldEraOf(state).id : 'smart';
  const pack = (we === 'keypad' || we === 'smart_dawn') && !(state?.revolution) ? TUT_KEYPAD : TUT_SMART;
  return pack[phase] || TUT_SMART[phase] || TUT_KEYPAD[phase];
}
const TUT_ORDER = ['plan', 'design', 'supply', 'dev', 'event', 'factory', 'launch', 'score', 'sales', 'next'];

function tutorial(phase) {
  const tutText = TUT(phase);
  if (!state?.tutorial || state.tutSeen?.[phase] || !tutText || busy || document.querySelector('.tut')) return;
  const el = document.createElement('div');
  el.className = 'tut';
  const step = TUT_ORDER.indexOf(phase) + 1;
  el.innerHTML = `<div class="tut-card kbox">
      <div class="tut-who"><span class="tut-av">🧑‍🏫</span><div><b>老周</b><small>创业导师 · 新手引导 ${step}/${TUT_ORDER.length}</small></div></div>
      <p>${tutText}</p>
      <div class="tut-btns"><button type="button" class="primary" data-tut="ok">知道了</button><button type="button" data-tut="skip">跳过引导</button></div>
    </div>`;
  document.body.appendChild(el);
  play('part', 1);
  el.addEventListener('click', (e) => {
    const k = e.target.closest('[data-tut]')?.dataset.tut;
    if (!k) return;
    if (k === 'skip') state.tutorial = false;
    state.tutSeen[phase] = true;
    if (TUT_ORDER.every((p) => state.tutSeen[p])) state.tutorial = false;
    persist();
    el.remove();
  });
}

/** 在像素场景上叠放你设计的那台手机（透明背景 3D 截图） */
function sceneImgs(list) {
  const host = $('#g-scene');
  const key = list.map((i) => `${i.x},${i.y},${i.h},${i.src.length}`).join('|');
  if (host.dataset.imgs === key) return;
  host.dataset.imgs = key;
  host.querySelectorAll('.scene-img').forEach((e) => e.remove());
  for (const i of list) {
    const im = document.createElement('img');
    im.className = `scene-img ${i.cls || ''}`;
    im.src = i.src;
    im.alt = '';
    im.style.left = `${i.x}%`;
    im.style.top = `${i.y}%`;
    im.style.height = `${i.h}%`;
    host.appendChild(im);
  }
}

/** 年会机型墙：每个相框里放对应那一代的真机截图 */
function wallImgs() {
  const ms = state.models;
  const n = Math.min(8, ms.length);
  const out = [];
  for (let i = 0; i < n; i++) {
    const m = ms[ms.length - n + i];
    if (m.cut) out.push({ src: m.cut, x: ((25 + i * 28) / 240) * 100, y: 33, h: 24 });
  }
  return out;
}

// ═════════════════════════ 逐条揭晓 ═════════════════════════

/** 结算页按注意力顺序一条条亮出来；看过一次之后不再重播。轻点面板直接全部揭晓。 */
let revealRun = null;
function runReveal(key) {
  const sheet = $('#g-sheet');
  const steps = [...sheet.querySelectorAll('.rv-step')].sort((a, b) => a.dataset.step - b.dataset.step);
  const live = sheet.querySelector('.comments.live');
  const showAll = () => {
    steps.forEach((el) => {
      el.classList.remove('rv-hide');
      el.querySelectorAll('[data-w]').forEach((i) => (i.style.width = `${i.dataset.w}%`));
    });
    $('#g-cta')?.classList.remove('rv-wait');
  };
  if (revealRun) {
    revealRun.cancel();
    revealRun = null;
  }
  if (!steps.length || draft.revealed?.[key] || document.body.classList.contains('reduce-motion')) {
    showAll();
    if (live) liveComments(live, true);
    return;
  }
  draft.revealed = { ...(draft.revealed || {}), [key]: true };
  steps.forEach((el) => el.classList.add('rv-hide'));
  $('#g-cta')?.classList.add('rv-wait');
  let cancelled = false;
  let liveRun = null;
  let wake = null;
  const wait = (ms) => new Promise((r) => {
    const id = setTimeout(r, ms);
    wake = () => {
      clearTimeout(id);
      r();
    };
  });
  const countUp = (b) => {
    const to = Number(b.dataset.count);
    const sign = b.dataset.sign;
    const t0 = performance.now();
    const dur = Math.min(1100, 400 + Math.abs(to) * 12);
    const step = (now) => {
      if (cancelled) return (b.textContent = b.dataset.money ? money(to, { sign: !!sign }) : `${sign && to > 0 ? '+' : ''}${to}`);
      const k = Math.min(1, (now - t0) / dur);
      const v = Math.round(to * (1 - Math.pow(1 - k, 3)));
      b.textContent = b.dataset.money ? money(v, { sign: !!sign }) : `${sign && v > 0 ? '+' : ''}${v}`;
      if (k < 1) requestAnimationFrame(step);
      else b.classList.add('landed');
    };
    requestAnimationFrame(step);
  };
  const skip = () => {
    if (cancelled) return;
    cancelled = true;
    wake?.();
    showAll();
    if (liveRun) liveRun.skip();
    else if (live && !live.querySelector('.cm')) liveComments(live, true);
    sheet.removeEventListener('click', skip);
    revealRun = null;
  };
  (async () => {
    await wait(250);
    for (const el of steps) {
      if (cancelled) return;
      el.classList.remove('rv-hide');
      el.classList.add('rv-in');
      el.querySelectorAll('[data-w]').forEach((x) => requestAnimationFrame(() => (x.style.width = `${x.dataset.w}%`)));
      const big = el.querySelector('[data-count]');
      const cm = el.querySelector('.comments.live');
      if (big) {
        countUp(big);
        play('add-points');
        await wait(1100);
      } else if (cm) {
        // 评论区要「看一会儿」：等热评形成
        liveRun = liveComments(cm, false);
        await liveRun.promise;
        liveRun = null;
        await wait(300);
      } else {
        play('part', 1);
        await wait(700);
      }
    }
    if (!cancelled) {
      $('#g-cta')?.classList.remove('rv-wait');
      sheet.removeEventListener('click', skip);
      revealRun = null;
    }
  })();
  sheet.addEventListener('click', skip);
  revealRun = { cancel: skip };
}

// ═════════════════════════ 渲染 ═════════════════════════

export function render() {
  if (!scene) shell();
  const phase = screen === 'game' && state ? state.phase : screen;
  document.body.classList.toggle('phase-design', phase === 'design');
  document.body.classList.toggle('screen-title', phase === 'title');
  $('#g-hud').innerHTML = hud();
  $('#g-rail').innerHTML = rail();
  $('#g-rail').hidden = !state;

  if (phase === 'design') {
    $('#g-scene').hidden = true;
    $('#g-sheet').hidden = true;
    $('#g-cta').hidden = true;
    mountStudio();
    return;
  }
  unmountStudio();
  $('#g-scene').hidden = false;
  $('#g-sheet').hidden = false;
  $('#g-cta').hidden = false;
  if (phase === 'plan' && state) {
    refreshNews();
    persist();
  }
  const view = (P[phase] || P.title)();
  scene.set(...view.scene);
  sceneImgs(view.imgs || []);
  $('#g-caption').textContent = view.caption || '';
  $('#g-caption').hidden = !view.caption;
  const ovl = $('#g-overlay');
  ovl.innerHTML = view.overlay || '';
  ovl.hidden = !view.overlay;
  $('#g-sheet').innerHTML = view.sheet;
  $('#g-cta').innerHTML = view.cta;
  $('#g-cta').hidden = !view.cta;
  runReveal(`${phase}-${state?.generation || 0}-${state?.month || 0}`);
  setTimeout(() => tutorial(phase), phase === 'score' || phase === 'sales' ? 4500 : 350);
  if (phase === 'factory' && !draft.factoryDone) {
    const n = $('#fac-n');
    const total = stockedUnits();
    const t0 = draft.factoryT0 || (draft.factoryT0 = performance.now());
    const tick = (now) => {
      const el = $('#fac-n');
      if (!el || draft.factoryDone) return;
      el.textContent = Math.round(total * Math.min(1, Math.pow((now - t0) / 4400, 1.6)));
      requestAnimationFrame(tick);
    };
    if (n) requestAnimationFrame(tick);
  }
  if (phase === 'factory' && !draft.factoryDone && !draft.factoryTimer) {
    draft.factoryTimer = setTimeout(() => {
      draft.factoryDone = true;
      draft.factoryTimer = null;
      draft.factoryT0 = null;
      play('keep');
      if (state?.phase === 'factory') render();
    }, 4600);
  }
  // one-shot phase stingers + scene bed (office vs press)
  if (phase === 'rescue' && !draft._rescueSfx) {
    draft._rescueSfx = true;
    play('bankruptcy');
  } else if (phase !== 'rescue') draft._rescueSfx = false;
  if (phase === 'bust' && !draft._bustSfx) {
    draft._bustSfx = true;
    play('bankruptcy');
  } else if (phase !== 'bust') {
    draft._bustSfx = false;
  }
  if (phase === 'event' && draft._evtSfx !== (state?.pendingEvent || true)) {
    draft._evtSfx = state?.pendingEvent || true;
    play('event-popup');
  } else if (phase !== 'event') {
    draft._evtSfx = null;
  }
  if (phase === 'angel' && draft._angelSfx !== (state?.pendingAngel || true)) {
    draft._angelSfx = state?.pendingAngel || true;
    play('event-popup');
  } else if (phase !== 'angel') {
    draft._angelSfx = null;
  }
  if (phase === 'score' && draft._scoreSfx !== state?.generation) {
    draft._scoreSfx = state?.generation;
    play('media-score');
    const rp = state?.lastRp || 0;
    if (rp) {
      toast(`🔬 研发点 +${rp}`);
      const sheet = document.getElementById('g-sheet');
      requestAnimationFrame(() => statFx('rp', sheet?.getBoundingClientRect(), rp));
    }
    if (state?.wagerResult?.msg) {
      toast(state.wagerResult.msg, 6000);
      state.wagerResult = null;
    }
  }
  if (phase === 'sales' && draft._salesSfx !== state?.generation) {
    draft._salesSfx = state?.generation;
    const sold = state?.salesResult?.sold || 0;
    if (sold >= 40) play('first-month-sales-big-number');
    else play('cheer');
  }
  sfx?.syncBgm?.(phase);
}

async function mountStudio() {
  if (studio || draft.mounting) return;
  draft.mounting = true;
  const host = $('#studio-host');
  host.hidden = false;
  host.innerHTML = '<div class="loading-g">设计部开灯中…</div>';
  const { createStudio } = await import('./studio/studio.js');
  draft.mounting = false;
  if (state?.phase !== 'design') return;
  setTimeout(() => tutorial('design'), 900);
  studio = createStudio(host, {
    mode: 'game',
    design: state.designDraft,
    museum: state.models,
    lockPosition: true,
    maxConcepts: L.maxConcepts(state),
    getUnlocked: () => state.unlocked,
    getRp: () => state.rp,
    getMonth: () => state.month,
    getMode: () => modeOf(state),
    getFlags: () => state.flags || {},
    getPointIds: () => state.product?.pointIds || [],
    getAppearCtx: () => appearCtx(),
    isNew: (id) => (state.newConcepts || []).includes(id),
    getChipNote: () => (state.chip.research ? `X${state.chip.research.gen} 流片中` : `最新：${state.chip.series} X${state.chip.gen}`),
    onUnlock: (id) => {
      const from = document.querySelector(`[data-unlock="${id}"]`)?.getBoundingClientRect();
      const r = L.unlockConcept(state, id);
      persist();
      $('#g-hud').innerHTML = hud();
      if (r?.ok && r.spent) {
        toast(`🔬 研发点 −${r.spent} · ${r.msg}`);
        if (from) statFx('rp', from, -r.spent);
      }
      return r;
    },
    confirmLabel: '定稿，去谈供应链 ▶',
    onChange: (d) => {
      state.designDraft = d;
      persist();
    },
    onConfirm: (d) => {
      state.newConcepts = [];
      L.confirmDesign(state, d);
      draft.supplierId = 'balanced';
      draft.stockId = 'normal';
      draft.chipSrc = marketChipGen(industryMonth(state)) > state.chip.gen && !L.marketMod(state, 'extBan') ? 'ext' : 'own';
      play('keep');
      persist();
      render();
      flash('设计定稿！');
    },
  });
}

function unmountStudio() {
  if (!studio) {
    const host = $('#studio-host');
    if (host && !draft.mounting) host.hidden = true;
    return;
  }
  studio.destroy();
  studio = null;
  const host = $('#studio-host');
  host.innerHTML = '';
  host.hidden = true;
}

// ═════════════════════════ 发布会 3D 演出 ═════════════════════════

async function playReveal() {
  busy = true;
  const ov = document.createElement('div');
  ov.className = 'launch-overlay';
  ov.innerHTML = `<div class="lo-stage"></div><div class="lo-film"></div><div class="lo-dim"></div><div class="lo-dm"></div><div class="lo-react"></div><div class="lo-fx"></div>
    <div class="lo-meter" hidden><span>现场热度</span><i><b></b></i><em></em></div>
    <div class="lo-chapter" hidden></div><div class="lo-kpi" hidden></div><div class="lo-sub" hidden></div>
    <div class="lo-prog" hidden></div>
    <div class="lo-tap" hidden>轻点屏幕翻页 ▶</div>
    <button type="button" class="lo-skip">跳过 ▶▶</button>`;
  document.body.appendChild(ov);
  let stage;
  let filmDispose = null;
  let done = false;
  let heat = 30;
  let tapNext = null;
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(() => !done && fn(), ms));
  const sleep = (ms) => new Promise((r) => timers.push(setTimeout(r, ms)));
  const finish = () => {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    filmDispose?.();
    tapNext?.();
    try {
      state.lastThumb = stage ? stage.snapshot(140) : '';
      draft.shareShot = stage ? stage.snapshot(360) : '';
      state.lastCut = stage ? stage.cutout(200) : '';
    } catch {
      state.lastThumb = '';
    }
    state.launchHeat = heat;
    stage?.dispose();
    ov.remove();
    busy = false;
    persist();
    render();
  };
  const sub = (text) => {
    const el = ov.querySelector('.lo-sub');
    el.hidden = !text;
    el.innerHTML = text || '';
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  };
  const chapter = (no, title, main) => {
    const el = ov.querySelector('.lo-chapter');
    el.hidden = false;
    el.className = `lo-chapter ${main ? 'main' : ''}`;
    el.innerHTML = `<small>${no}${main ? ' · 本代主打' : ''}</small><b>${title}</b>`;
    void el.offsetWidth;
    el.classList.add('in');
  };
  const kpi = (k) => {
    const el = ov.querySelector('.lo-kpi');
    if (!k) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.innerHTML = `<small>${esc(k.label)}</small><b></b><i>${esc(k.unit || '')}</i>`;
    el.classList.remove('in');
    void el.offsetWidth;
    el.classList.add('in');
    const b = el.querySelector('b');
    if (k.text) {
      b.textContent = k.text;
      return;
    }
    const t0 = performance.now();
    const fmt = (v) => (k.dec ? v.toFixed(k.dec) : Math.round(v).toLocaleString('en-US'));
    const step = (now) => {
      if (done || el.hidden) return;
      const p = Math.min(1, (now - t0) / 1100);
      const e = 1 - Math.pow(1 - p, 3);
      b.textContent = fmt(k.from + (k.to - k.from) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const meter = (delta) => {
    heat = Math.max(5, Math.min(100, heat + delta));
    const m = ov.querySelector('.lo-meter');
    m.hidden = false;
    m.querySelector('b').style.width = `${heat}%`;
    m.querySelector('em').textContent = heat >= 85 ? '🔥 沸腾' : heat >= 65 ? '👏 热烈' : heat >= 45 ? '🙂 还行' : '😶 冷场';
  };
  const react = (words, mood = 'good') => {
    const host = ov.querySelector('.lo-react');
    words.forEach((w, i) => {
      const r = document.createElement('span');
      r.className = `rx ${mood}`;
      r.textContent = w;
      r.style.left = `${6 + Math.random() * 78}%`;
      r.style.animationDelay = `${i * 0.18}s`;
      host.appendChild(r);
      setTimeout(() => r.remove(), 2800 + i * 180);
    });
    meter(mood === 'good' ? 10 : mood === 'bad' ? -12 : 2);
  };
  const fireworks = (n = 5) => {
    if (document.body.classList.contains('reduce-motion')) return;
    const host = ov.querySelector('.lo-fx');
    for (let k = 0; k < n; k++) {
      const x = 10 + Math.random() * 80;
      const y = 10 + Math.random() * 35;
      const col = ['#f5b041', '#5dade2', '#f1948a', '#82e0aa', '#fff'][k % 5];
      for (let i = 0; i < 18; i++) {
        const p = document.createElement('i');
        const a = (i / 18) * Math.PI * 2;
        p.style.left = `${x}%`;
        p.style.top = `${y}%`;
        p.style.background = col;
        p.style.setProperty('--dx', `${Math.cos(a) * 90}px`);
        p.style.setProperty('--dy', `${Math.sin(a) * 90}px`);
        p.style.animationDelay = `${k * 0.25}s`;
        host.appendChild(p);
        setTimeout(() => p.remove(), 1800 + k * 250);
      }
    }
  };
  // 轻点屏幕 = 主讲人按翻页笔
  ov.addEventListener('click', (e) => {
    if (e.target.closest('.lo-skip')) return;
    tapNext?.();
  });
  try {
    const { PhoneStage } = await import('./studio/phone3d.js');
    const { buildKeynote, txt } = await import('./launch/keynote.js');
    const { KEYPAD_MOMENTS, KEYPAD_MOMENTS_BY } = await import('./launch/keynote-keypad.js');
    const { danmakuLines } = await import('./launch/crowd.js');
    const { createFilmLayer } = await import('./launch/films.js');
    const filmLayer = createFilmLayer(ov.querySelector('.lo-film'));
    filmDispose = () => filmLayer.dispose();
    const keypadEra = productEraOf(state.design) === 'keypad';
    const packLaunch = packOf(state.design);
    stage = new PhoneStage(ov.querySelector('.lo-stage'));
    const launchOpts = state.launchOpts || draft.launchOpts || L.defaultLaunchOpts('safe', state.design);
    stage.setPresentationMode?.(true);
    stage.setLaunchOpts?.(launchOpts);
    stage.setDesign(state.design);
    stage.setScreenMode?.('lock');
    const W = state.wowResult || {};
    const quick = state.models.length > 0 && !W.firsts?.length && !['S', 'A'].includes(W.grade);
    const d = state.design;
    const caps = L.capsMap(state);
    const seg = buildKeynote({
      d,
      phys: physical(d),
      cs: chipSpec(d),
      prevChip: state.models.length ? chipSpec(state.models[state.models.length - 1].design) : null,
      rivals: rivalPhones(industryMonth(state)).slice(0, 3),
      camCap: caps.camera,
      batCap: caps.battery,
      price: state.product.price || packLaunch.priceBands.find((p) => p.id === state.product.priceId)?.price || packLaunch.priceRange?.ref || 3999,
      chipLag: L.chipLag(state),
      fair: state.product.fair,
      pf: state.review?.priceUser ?? 0,
      points: state.product.pointIds,
      promises: state.review?.promises,
      firsts: W.firsts || [],
      quick,
      eco: state.product.bindEco,
      launchOpts,
      stock: L.stockedUnits(state),
    });

    // 随机现场插曲（放在中段）
    const moments = [
      { wall: (g, Wd, Hd) => { g.fillStyle = '#5d4037'; g.fillRect(Wd / 2 - 16, 14, 32, 32); g.fillStyle = '#f5cba7'; g.fillRect(Wd / 2 - 10, 20, 20, 18); g.fillStyle = '#2c3e50'; g.fillRect(Wd / 2 - 6, 26, 3, 3); g.fillRect(Wd / 2 + 4, 26, 3, 3); txt(g, '神秘嘉宾', Wd / 2, 62, 11, '#ffd08a'); }, sub: '有请神秘嘉宾——知名测评博主<b>「老喵」</b>！', react: ['老喵！！', '真人来了', '👋'], mood: 'good' },
      { wall: (g, Wd, Hd) => txt(g, '能不能送一台！', Wd / 2, Hd / 2 + 6, 16, '#f5b041'), sub: '台下有人大喊：「<b>能不能送一台！</b>」主讲人：「……散会后找我。」', react: ['哈哈哈哈', '我也要！', '😂'], mood: 'good' },
      { wall: (g, Wd, Hd) => txt(g, '最好的一代（之一）', Wd / 2, Hd / 2 + 6, 14, '#fff'), sub: '「这是我们有史以来最好的一代……之一。」', react: ['之一？？', '笑死', '🤣'], mood: 'meh' },
      { wall: (g, Wd, Hd) => { txt(g, '友商', Wd / 2 - 40, Hd / 2, 14, '#aab7b8'); txt(g, '→', Wd / 2, Hd / 2, 14, '#fff'); txt(g, '我们', Wd / 2 + 40, Hd / 2, 14, '#f5b041'); txt(g, '（一图看懂）', Wd / 2, Hd - 10, 8, '#aab7b8'); }, sub: '「我们不点名，<b>友商</b>做得也很好——只是我们更好一点点。」', react: ['点名了', '友商：？', '🍿'], mood: 'good' },
      { wall: (g, Wd, Hd) => txt(g, '1000 个夜晚', Wd / 2, Hd / 2 + 6, 16, '#f5b041'), sub: '「我们的工程师，为它熬了 <b>1000 个夜晚</b>。」大屏放出一张满是外卖盒的工位照片。', react: ['Respect', '心疼工程师', '🫡'], mood: 'good' },
      { wall: (g, Wd, Hd, t) => { for (let i = 0; i < 16; i++) { g.fillStyle = ['#f1948a', '#f5b041', '#5dade2'][(i + Math.floor(t * 4)) % 3]; g.fillRect(8 + i * 14, 20 + (i % 2) * 18, 12, 14); } txt(g, '粉丝应援', Wd / 2, 68, 9, '#fff'); }, sub: '粉丝举起了应援灯牌，全场一起倒数！', react: ['冲冲冲', '🌟🌟🌟', '爱了'], mood: 'good' },
    ];
    const mid = Math.max(1, Math.min(seg.length - 2, 3));
    if (!quick && Math.random() < 0.55) {
      const pool = keypadEra ? KEYPAD_MOMENTS_BY[launchOpts.style] || KEYPAD_MOMENTS : moments;
      seg.splice(mid, 0, { key: 'moment', ...pool[Math.floor(Math.random() * pool.length)], ms: 3000 });
    }
    if (state.launchFlop) {
      seg.splice(Math.min(seg.length - 2, mid + 1), 0, {
        key: 'flop',
        wall: (g, Wd, Hd) => {
          for (let i = 0; i < 300; i++) {
            const v = Math.floor(Math.random() * 255);
            g.fillStyle = `rgb(${v},${v},${v})`;
            g.fillRect(Math.random() * Wd, Math.random() * Hd, 3, 2);
          }
          txt(g, 'ERROR', Wd / 2, Hd / 2 + 8, 22, '#e74c3c', 'center', 'monospace');
        },
        sub: '呃……演示机<b>卡住了</b>。主讲人沉默两秒：「没关系。<b>我不是为了输赢，我就是认真。</b>」',
        react: ['名场面', '认真你就输了', '📸📸'],
        mood: 'bad',
        act: () => {
          play('boom');
          ov.classList.add('shake');
          setTimeout(() => ov.classList.remove('shake'), 500);
        },
        ms: 2600,
      });
    }
    // 开售倒计时 + 谢幕
    const cdTitle = keypadEra ? '各大门店同步上市' : '今晚 20:00 开售';
    const cdSub = keypadEra ? '营业厅门口已经开始排队了！' : '今晚八点，<b>正式开售</b>！';
    const cdReact = keypadEra ? ['冲营业厅', '带身份证'] : ['定闹钟！', '手速准备'];
    if (!keypadEra) {
      seg.push({ key: 'cd3', wall: (g, Wd) => { txt(g, cdTitle, Wd / 2, 26, 12, '#ffd08a'); txt(g, '3', Wd / 2, 62, 30, '#fff', 'center', 'monospace'); }, sub: cdSub, react: cdReact, mood: 'good', ms: 900, notap: true });
      ['2', '1'].forEach((n) => seg.push({ key: `cd${n}`, wall: (g, Wd) => { txt(g, cdTitle, Wd / 2, 26, 12, '#ffd08a'); txt(g, n, Wd / 2, 62, 30, '#fff', 'center', 'monospace'); }, sub: null, react: [], ms: 700, notap: true, act: () => play('click') }));
    }
    if (!keypadEra) seg.push({
      key: 'end',
      wall: (g, Wd, Hd, t) => {
        const grd = g.createLinearGradient(0, 0, Wd, Hd);
        grd.addColorStop(0, '#f5b041');
        grd.addColorStop(1, '#e74c3c');
        g.fillStyle = grd;
        g.fillRect(0, 0, Wd, Hd);
        const x = ((t % 1.6) / 1.6) * (Wd + 120) - 60;
        g.fillStyle = 'rgba(255,255,255,.35)';
        g.fillRect(x, 0, 18, Hd);
        txt(g, d.modelName, Wd / 2, Hd / 2 + 10, 26, '#fff', 'center', '"ZCOOL KuaiLe",sans-serif');
      },
      sub: () => (keypadEra ? `谢谢大家。<b>${esc(d.modelName)}</b>，明天起各大运营商门店有售。` : `谢谢大家！现场热度：<b>${heat >= 85 ? '🔥 沸腾' : heat >= 65 ? '👏 热烈' : heat >= 45 ? '🙂 还行' : '😶 冷场'}</b>`),
      react: keypadEra ? ['好！', '鼓掌', '散会去营业厅'] : ['🎉🎉🎉', '太燃了', '安可！'],
      mood: 'good',
      pose: ['hero', 'wide', { spin: 0.4 }],
      act: () => {
        play('fanfare');
        play('applause', 2.5);
        stage.burst(160, { speed: 2.6 });
        fireworks(6);
      },
      ms: 3200,
    });

    const prog = ov.querySelector('.lo-prog');
    const runShow = async () => {
      ov.querySelector('.lo-tap').hidden = false;
      prog.hidden = false;
      prog.innerHTML = seg.filter((s) => s.chap).map((s) => `<i data-k="${s.key}" class="${s.main ? 'main' : ''}"></i>`).join('');
      let no = 0;
      let exploded = false;
      for (const sl of seg) {
        if (done) return;
        try {
        if (sl.chap) {
          chapter(String(++no).padStart(2, '0'), sl.chap, sl.main);
          prog.querySelectorAll('i').forEach((el) => el.classList.toggle('on', el.dataset.k === sl.key));
          prog.querySelector(`[data-k="${sl.key}"]`)?.classList.add('done');
        }
        if (exploded && !sl.explode) {
          stage.setExploded(false);
          exploded = false;
        }
        // 1) 产品短片：全屏动画讲清楚这个卖点（可轻点跳过），再切回舞台
        const fl = typeof sl.film === 'string' ? { name: sl.film, data: {} } : sl.film;
        if (fl && filmLayer.has(fl.name) && !document.body.classList.contains('reduce-motion')) {
          kpi(null);
          ov.classList.toggle('tvad', !!sl.tv);
          if (sl.filmSub || sl.sub) sub(sl.filmSub || (typeof sl.sub === 'function' ? sl.sub() : sl.sub));
          filmLayer.play(fl.name, { design: d, phys: physical(d), ...(fl.data || {}) });
          ov.classList.add('filming');
          if (fl.name === 'camera' || fl.name === 'kp_camera') timers.push(setTimeout(() => !done && play('shutter'), fl.name === 'camera' ? 3000 : 2400));
          if (fl.name === 'chip' || fl.name === 'charge') play('whoosh');
          if (fl.sfx) timers.push(setTimeout(() => !done && play(fl.sfx, fl.sfx === 'ringtone' ? d.parts?.ringtone ?? 2 : 0), fl.sfxAt || 600));
          const fms = fl.ms || 3800;
          await sleep(800);
          await Promise.race([sleep(fms - 800), new Promise((r) => (tapNext = r))]);
          tapNext = null;
          if (done) return;
          filmLayer.stop();
          ov.classList.remove('filming');
        }
        if (sl.pose) stage.pose(...(Array.isArray(sl.pose) ? sl.pose : [sl.pose.view, sl.pose.shot, sl.pose]));
        if (sl.spot) stage.spotlight?.(sl.spot, sl.spotLabel || '');
        if (sl.explode) {
          stage.setExploded(true);
          exploded = true;
        }
        if (sl.shine) stage.shine(1800);
        if (sl.screen) stage.setScreenMode?.(sl.screen, { payload: sl.screenPayload || {}, t0: performance.now() });
        if (sl.light || launchOpts.light) stage.setLaunchOpts?.({ ...launchOpts, light: sl.light || launchOpts.light });
        if (sl.wall) stage.wallAnim(sl.wall);
        ov.classList.toggle('dim', !!sl.dim);
        ov.classList.toggle('tvad', !!sl.tv);
        kpi(sl.kpi);
        if (sl.sub !== null && sl.sub !== undefined) sub(typeof sl.sub === 'function' ? sl.sub() : sl.sub);
        if (sl.react?.length) react(sl.react, sl.mood);
        if (sl.sfx) play(sl.sfx, sl.sfx === 'ringtone' ? d.parts?.ringtone ?? 2 : 0);
        if (sl.fanfare) {
          play('fanfare');
          stage.burst(120, { speed: 2 });
          fireworks(3);
        }
        if (typeof sl.act === 'function') sl.act();
        else if (sl.act === 'open') {
          stage.setOpen?.(0.05);
          at(500, () => { stage.setOpen?.(0.95); play('flipOpen'); });
        } else if (sl.act === 'torch') stage.spotlight?.('keypad', '手电筒');
        if (sl.mood === 'good' && sl.react?.length) play('applause', 1);
        // 保底等到预备+主 pose 落地，再允许点掉余韵（禁止 900ms 硬切空白）
        const stageMs = fl ? Math.max(2200, sl.ms - 600) : sl.ms;
        const landMs = sl.notap
          ? stageMs
          : Math.min(stageMs, Math.max(sl.land || (sl.pose || sl.fanfare || sl.dim ? 780 : 650), Math.floor(stageMs * 0.55)));
        await sleep(landMs);
        if (stageMs > landMs) await Promise.race([sleep(stageMs - landMs), new Promise((r) => (tapNext = r))]);
        tapNext = null;
        } catch (err) {
          // 单段出错不影响整场
          console.error('keynote segment', sl.key, err);
          filmLayer.stop();
          ov.classList.remove('filming');
        }
      }
      kpi(null);
      filmLayer.stop();
      await sleep(300);
      finish();
    };
    ov.querySelector('.lo-skip').onclick = () => (stage.reveal?.fired.boom ? finish() : stage.skipReveal());
    stage.playReveal(d, {
      quick,
      onBeat(b) {
        if (b === 'drumroll') {
          play('drumroll', quick ? 1.1 : 3);
          if (!quick) ['3', '2', '1'].forEach((n, i) => at(100 + i * 700, () => stage.wallSlide((g, Wd, Hd) => txt(g, n, Wd / 2, Hd / 2 + 14, 40, '#f5b041', 'center', 'monospace'))));
          meter(0);
        } else if (b === 'boom') {
          play('boom');
          play('fanfare', 0.12);
          play('applause', 3, 0.3);
          sub(keypadEra ? `红布揭开——<b>${esc(d.modelName)}</b>` : `今天，我们带来——<b>${esc(d.modelName)}</b>`);
          react(keypadEra ? ['来了', '这就是新机', '好看'] : ['哇！', '来了来了', '📸'], 'good');
          fireworks(2);
          const dm = ov.querySelector('.lo-dm');
          const lines = danmakuLines(d, { chipLag: L.chipLag(state), chipLead: L.chipLag(state) < 0 && d.chipSrc !== 'ext', price: state.product.price }, keypadEra ? 14 : 9);
          if (keypadEra) {
            // 短信上墙：右下角一块「短信大屏」，最新 3 条往上顶，旧的淡出
            dm.classList.add('sms');
            dm.innerHTML = '<div class="sms-wall"><b>短信上墙 · 发送到 1066 8888</b><div class="sms-list"></div></div>';
            const list = dm.querySelector('.sms-list');
            lines.forEach((tx, i) =>
              at(1200 + i * 2600, () => {
                const el = document.createElement('div');
                el.className = 'sms-bubble';
                el.innerHTML = `<small>13${Math.floor(Math.random() * 10)}****${String(1000 + Math.floor(Math.random() * 9000)).slice(1)}</small>${esc(tx)}`;
                list.appendChild(el);
                while (list.children.length > 3) list.firstElementChild.remove();
              }),
            );
          } else lines
            .forEach((tx, i) => {
              const el = document.createElement('span');
              el.className = keypadEra ? 'dm sms-bubble' : 'dm';
              el.textContent = keypadEra
                ? `13${Math.floor(Math.random() * 10)}****${String(1000 + Math.floor(Math.random() * 9000)).slice(1)}：${tx}`
                : tx;
              el.style.top = keypadEra ? `${62 - (i % 7) * 8}%` : `${44 + ((i * 17) % 22)}%`;
              el.style.animationDelay = `${0.5 + i * 2.2}s`;
              dm.appendChild(el);
            });
        } else if (b === 'shutter') play('shutter');
        else if (b === 'done') at(600, runShow);
      },
    });
  } catch (e) {
    console.error(e);
    finish();
  }
}

/** 评论区：发布会结束后陆续涌进来的留言（数据，每代生成一次） */
function comments() {
  if (draft.commentsFor === state.generation && draft.comments) return draft.comments;
  const R = state.review || {};
  const W = state.wowResult || {};
  draft.comments = buildComments({
    design: state.design,
    modelName: state.design.modelName,
    promisesBroken: (R.promises || []).filter((p) => !p.ok).map((p) => p.name),
    priceRatio: R.priceRatio ?? 1,
    anchorLast: R.anchorLast || 0,
    flop: state.launchFlop,
    buzz: W.buzz || 0,
    completeness: W.completeness ?? 100,
    novelty: W.novelty ?? 50,
    chipLag: R.chipLag || 0,
    chipLead: (R.chipLag || 0) < 0 && state.design.chipSrc !== 'ext',
    extChip: state.design.chipSrc === 'ext',
    gen: state.generation,
    company: state.companyName,
    price: state.product?.price,
    stale: R.stale || 0,
    firsts: (W.firsts || []).length > 0,
    benchFirst: state.benchBest?.gen === state.generation && state.benchRank1 === state.generation,
  });
  draft.commentsFor = state.generation;
  return draft.comments;
}

function commentBlock() {
  const bbs = productEraOf(state.design) === 'keypad';
  if (bbs) {
    return `<div class="comments live bbs"><div class="cm-h">📜 机锋论坛 · ${esc(state.design?.modelName || '新机')} 专帖 <small class="cm-status">● 顶帖中</small><em class="cm-count"></em></div><div class="cm-list"></div></div>`;
  }
  return `<div class="comments live"><div class="cm-h">🗨 评论区 <small class="cm-status">● 实时</small><em class="cm-count"></em></div><div class="cm-list"></div></div>`;
}

const cmRow = (c) => productEraOf(state.design) === 'keypad'
  ? `<div class="cm-av">${c.av}</div><div><b>${esc(c.who)}</b> <small>#${c.i != null ? c.i + 1 : '?'}楼</small><span class="cm-badge"></span><p>${esc(c.t)}</p><small class="cm-reply"></small></div><i>顶 <span class="cm-like">0</span></i>`
  : `<div class="cm-av">${c.av}</div><div><b>${esc(c.who)}</b><span class="cm-badge"></span><p>${esc(c.t)}</p><small class="cm-reply"></small></div><i>👍 <span class="cm-like">0</span></i>`;

/** 评论慢慢涌进来，点赞往上涨，按点赞重新排序；最后形成热评 */
function liveComments(box, instant) {
  const list = box.querySelector('.cm-list');
  const status = box.querySelector('.cm-status');
  const count = box.querySelector('.cm-count');
  const data = comments().map((c, i) => ({ ...c, i, cur: 0, el: null }));
  const total = data.reduce((a, c) => a + c.reply, 0) + data.length * 23;
  const finalize = () => {
    data.forEach((c) => {
      if (!c.el) add(c, false);
      c.cur = c.like;
    });
    paint(true);
    reorder(false);
    [...data].sort((a, b) => b.like - a.like).slice(0, 3).forEach((c) => {
      c.el.classList.add('hot');
      c.el.querySelector('.cm-badge').textContent = productEraOf(state.design) === 'keypad' ? '精华' : '🔥 热评';
    });
    status.textContent = '热评已形成';
    status.classList.add('done');
    count.textContent = `${total} 条讨论`;
  };
  const add = (c, anim = true) => {
    const el = document.createElement('div');
    el.className = `cm ${anim ? 'new' : ''}`;
    el.innerHTML = cmRow(c);
    c.el = el;
    list.prepend(el);
  };
  const paint = (final) =>
    data.forEach((c) => {
      if (!c.el) return;
      c.el.querySelector('.cm-like').textContent = Math.round(c.cur);
      const r = final ? c.reply : Math.round(c.reply * (c.cur / c.like));
      c.el.querySelector('.cm-reply').textContent = r > 0 ? `💬 ${r} 条回复` : '';
    });
  const reorder = (anim = true) => {
    const shown = data.filter((c) => c.el);
    const before = new Map(shown.map((c) => [c, c.el.getBoundingClientRect().top]));
    shown.sort((a, b) => b.cur - a.cur).forEach((c) => list.appendChild(c.el));
    if (!anim) return;
    shown.forEach((c) => {
      const dy = before.get(c) - c.el.getBoundingClientRect().top;
      if (!dy) return;
      c.el.style.transition = 'none';
      c.el.style.transform = `translateY(${dy}px)`;
      requestAnimationFrame(() => {
        c.el.style.transition = 'transform .45s cubic-bezier(.2,.9,.3,1)';
        c.el.style.transform = '';
      });
    });
  };
  if (instant) {
    finalize();
    return { promise: Promise.resolve(), skip: () => {} };
  }
  const T = 7500;
  const arrive = data.map((c, i) => 200 + i * 520 + Math.random() * 200);
  const t0 = performance.now();
  let lastSort = 0;
  let done = false;
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  const tick = (now) => {
    if (done || !box.isConnected) return resolve();
    const t = now - t0;
    data.forEach((c, k) => {
      if (!c.el && t >= arrive[k]) {
        add(c);
        play('part', 0);
      }
      if (c.el) {
        const p = Math.min(1, (t - arrive[k]) / (T - arrive[k]));
        const curve = c.hot ? 1 - Math.pow(1 - p, 2.2) : Math.pow(p, 1.3);
        c.cur = c.like * curve;
      }
    });
    paint(false);
    count.textContent = `${Math.round(total * Math.min(1, t / T))} 条讨论`;
    if (t - lastSort > 900) {
      lastSort = t;
      reorder();
    }
    if (t >= T) {
      done = true;
      finalize();
      play('add-points');
      return resolve();
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return {
    promise,
    skip: () => {
      if (done) return;
      done = true;
      finalize();
      resolve();
    },
  };
}

// ═════════════════════════ 分享卡 ═════════════════════════

async function shareCard(ending) {
  busy = true;
  toast('正在生成分享卡…');
  try {
    const S = await import('./share.js');
    if (ending) {
      const E = endingTitles(state);
      S.showShare(await S.endingCard(state, E), S.endingText(state, E));
    } else {
      S.showShare(await S.launchCard(state, draft.shareShot || state.lastThumb), S.launchText(state));
    }
  } catch (e) {
    console.error(e);
    toast('分享卡生成失败');
  }
  busy = false;
}

// ═════════════════════════ 交互 ═════════════════════════

function startGame(s) {
  state = s;
  screen = 'game';
  draft.plan = L.recommendedPlan(defaultFormId(state));
  draft.factoryDone = state.phase !== 'factory';
  render();
}

const DEV_LOG = {
  perf: ['性能组把功耗曲线又压低了一截', '编译器同学连夜改了调度器', '跑分 App 终于不闪退了'],
  design: ['设计组为 0.1mm 的圆角吵了一下午', '打样的手板摸起来对味了', '配色卡又换了三版'],
  camera: ['影像组扛着样机拍了一晚上夜景', '调色师把天空调得更蓝了', '对焦速度快了一倍'],
  battery: ['续航测试机连播了 30 小时视频', '电源组找到一个偷电的后台进程', '散热铜管换了新方案'],
  os: ['系统动画顺滑了不少', '修掉了 214 个小 bug', '桌面图标终于对齐了'],
};

/** 研发月报：贴在场景右上角，一闪而过 */
function monthReport(res) {
  const host = $('#g-scene');
  if (!host || document.body.classList.contains('reduce-motion')) return;
  host.querySelector('.mreport')?.remove();
  const gains = Object.entries(res.gains || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (!gains.length) return;
  const top = gains[0][0];
  const log = DEV_LOG[top][Math.floor(Math.random() * DEV_LOG[top].length)];
  const el = document.createElement('div');
  el.className = 'mreport';
  const hasTail = (res.tail?.income || 0) > 0;
  el.innerHTML = `<b>📋 ${monthOfYear(state.month - 1)} 月研发月报</b>
    ${gains.map(([id, v]) => `<span><em>${slotsOf(state.design).find((x) => x.id === id).name.slice(0, 2)}</em><i><u style="--w:${Math.min(100, v * 3)}%"></u></i><strong>+${v}</strong></span>`).join('')}
    <small>💬 ${log}</small>
    ${hasTail ? `<b class="tail-earn">🛒 在售续销 ${money(res.tail.income, { sign: true })}${res.tail.restock ? ` · 补货 ${res.tail.restock} 万台` : ''}</b>` : ''}
    ${(res.tail?.lines || []).map((l) => `<small class="sale">🛒 ${esc(l.name)} ${l.units} 万台 · ${money(l.profit || 0, { sign: true })} · ${l.stage}${l.hit ? ` · ⚔ ${esc(l.hit)}` : ''}</small>`).join('')}
    ${(res.tail?.retired || []).map((n) => `<small class="sale">👋 ${esc(n)} 退市</small>`).join('')}
    <small class="pay">本月净额 ${money(state.monthDelta, { sign: true })}（含工资/运营${hasTail ? '与续销' : ''}）</small>`;
  host.appendChild(el);
  const hold = hasTail ? 3200 : 1900;
  setTimeout(() => el.classList.add('out'), hold);
  setTimeout(() => el.remove(), hold + 400);
}

async function advance(all = false) {
  busy = true;
  let guard = 0;
  do {
    const res = L.advanceMonth(state, L.balancedAllocation(state, draft.focus));
    if (!res.ok) {
      toast(res.msg);
      break;
    }
    play('part', 1);
    persist();
    render();
    scene.pulse('month', { gains: res.gains });
    monthReport(res);
    if (res.tail?.income > 0) scene.pulse('cash', { x: 196, y: 30, text: `+${moneyShort(res.tail.income)}` });
    if (res.chipDone) {
      play('fanfare');
      scene.pulse('confetti');
      toast(`🧪 ${res.chipDone.name} 流片成功！跑分 +${res.chipDone.up}%（下一代可用）`);
    }
    flash(`M${state.month}`);
    if (res.event) play('explode', true);
    if (state.phase !== 'dev') {
      if (state.phase === 'factory') {
        draft.factoryDone = false;
        render();
      }
      break;
    }
    if (all) await new Promise((r) => setTimeout(r, 1300));
  } while (all && ++guard < 12 && state.phase === 'dev');
  busy = false;
}

/** v0.11 融资面板：银行 / 过桥 / 紧急；账本飞字 */
function showFinance() {
  document.querySelector('.finance-ov')?.remove();
  const sum = L.loanSummary(state);
  const ov = document.createElement('div');
  ov.className = `finance-ov pressure-${sum.pressure}`;
  const loanCards = renderLoanCards(sum);
  ov.innerHTML = `<div class="finance-panel kbox">
    <div class="fn-h"><b>🏦 融资</b><span class="fn-tier">${esc(sum.tierLabel)}</span><button type="button" data-x>✕</button></div>
    <div class="fn-meter">
      <div class="fn-cash"><small>现金</small><b class="${sum.pressure}">${money(state.cash)}</b></div>
      <div class="fn-debt"><small>负债</small><b class="${sum.debt ? 'neg' : ''}">${money(sum.debt)}</b></div>
      <div class="fn-next"><small>下月应还</small><b>${sum.nextPay ? money(sum.nextPay) : '—'}</b></div>
    </div>
    <p class="fn-pref ${sum.preferOwn ? 'own' : ''}">${sum.preferOwn ? '💡 账上还宽裕：优先花自有资金，借款会生利息。' : sum.pressure === 'critical' ? '⚠ 现金告急：过桥或紧急融资更显眼，但也更贵。' : sum.pressure === 'low' ? '现金低于安全线。可以点贷款进账，按月还本息。' : '自有资金与贷款可并行；天使兜底仍是破产时的最后一次。'}</p>
    ${sum.expandLock ? `<p class="fn-lock">🔒 扩张暂锁 ${sum.expandLock} 个月（贷款条款）</p>` : ''}
    <div class="fn-loans">${loanCards}</div>
    <div class="fn-active">${sum.loans.length ? sum.loans.map((l) => `<div class="fn-row"><span>${esc(l.name)} · 剩 ${l.left} 期</span><b class="neg">${money(l.principal)}</b></div>`).join('') : '<p class="muted">当前无进行中的贷款</p>'}</div>
    <button type="button" class="link-btn" data-act="ledger">📒 打开账本看流水</button>
  </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', (e) => {
    if (e.target === ov || e.target.closest('[data-x]')) ov.remove();
    const btn = e.target.closest('[data-loan]');
    if (!btn || busy) return;
    const id = btn.dataset.loan;
    const rect = btn.getBoundingClientRect();
    const r = L.takeLoan(state, id);
    if (!r.ok) return toast(r.msg);
    play('keep');
    moneyFx(rect, r.amount);
    toast(r.msg);
    persist();
    ov.remove();
    $('#g-hud').innerHTML = hud();
    // 账本飞字条
    ledgerFly(r.loan?.name || '贷款', r.amount);
    showLedger();
  });
}

function renderLoanCards(sum) {
  const defs = L.LOAN_PRODUCTS || [];
  const openIds = new Set((L.availableLoans(state) || []).map((p) => p.id));
  return defs
    .map((p) => {
      const active = sum.loans.some((l) => l.productId === p.id);
      const open = openIds.has(p.id);
      const hot = (p.id === 'emergency' && sum.pressure === 'critical') || (p.id === 'bridge' && sum.pressure !== 'ok');
      if (active) {
        return `<div class="fn-card done"><span class="fn-ico">${p.icon}</span><div><b>${esc(p.name)}</b><small>还款中</small></div></div>`;
      }
      return `<button type="button" class="fn-card ${open ? '' : 'dim'} ${hot ? 'hot' : ''}" data-loan="${p.id}" ${open ? '' : 'disabled'} title="${open ? '' : '条件未满足或已借过'}">
        <span class="fn-ico">${p.icon}</span>
        <div><b>${esc(p.name)}</b><small>${esc(p.blurb)}</small>
          <em>到账 ${money(p.amount)} · 月息 ${(p.rate * 100).toFixed(1)}% · ${p.term} 期</em></div>
      </button>`;
    })
    .join('');
}

function ledgerFly(label, amount) {
  if (document.body.classList.contains('reduce-motion')) return;
  const el = document.createElement('div');
  el.className = `ledger-fly ${amount < 0 ? 'neg' : 'pos'}`;
  el.innerHTML = `<i>${esc(label)}</i><b>${money(amount, { sign: true })}</b>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

/** 账本：最近的现金流水 + 本代分项（在售续销按机型分行） */
function showLedger() {
  document.querySelector('.ledger-ov')?.remove();
  const ov = document.createElement('div');
  ov.className = 'ledger-ov';
  const recent = (state.ledger || []).slice(-18).reverse();
  const sums = L.ledgerOf(state);
  const tailIn = L.onSaleIncomeOf(state);
  const debt = state.debt || 0;
  ov.innerHTML = `<div class="ledger kbox"><div class="lg-h"><b>📒 账本</b><span>现金 ${money(state.cash)}${debt ? ` · 负债 ${money(debt)}` : ''}</span><button type="button" data-x>✕</button></div>
    <h4>第 ${state.generation} 代至今</h4>
    ${sums.length ? sums.map(([k, v]) => `<div class="lg-row"><span>${esc(k)}</span><b class="${v < 0 ? 'neg' : 'pos'}">${money(v, { sign: true })}</b></div>`).join('') : '<p class="muted">还没有流水</p>'}
    ${tailIn ? `<div class="lg-row highlight"><span>🛒 在售续销小计（含前代机）</span><b class="pos">${money(tailIn, { sign: true })}</b></div>` : ''}
    <h4>最近流水</h4>
    ${recent.map((e) => `<div class="lg-row sm ${e.label.startsWith('在售') ? 'tail' : ''}"><span>${monthOfYear(e.m)} 月 · ${esc(e.label)}${e.note ? ` <i>${esc(e.note)}</i>` : ''}${e.productGen != null ? ` <i>机型第${e.productGen}代</i>` : ''}</span><b class="${e.v < 0 ? 'neg' : 'pos'}">${money(e.v, { sign: true })}</b></div>`).join('')}
  </div>`;
  document.body.appendChild(ov);
  ov.addEventListener('click', (e) => {
    if (e.target === ov || e.target.closest('[data-x]')) ov.remove();
  });
}

function keepSettingsOpen() {
  render();
  const d = document.querySelector('.menu-set');
  if (d) d.open = true;
}

function onClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn || busy) return;
  const { act, id } = btn.dataset;
  const i = Number(btn.dataset.i);
  const spendRect = btn.dataset.cost ? btn.getBoundingClientRect() : null;
  const cashBefore = state?.cash;

  if (act === 'mute') {
    sfx?.setMuted(!sfx.muted);
    $('#g-hud').innerHTML = hud();
    if (screen === 'title') keepSettingsOpen();
    return;
  }
  if (act === 'stat' && state) {
    showStat(id);
    return;
  }
  if (act === 'settings') {
    showSettings();
    return;
  }
  if (act === 'music') {
    sfx?.setMusic(!sfx.musicOn);
    $('#g-hud').innerHTML = hud();
    toast(sfx?.musicOn ? '背景音乐已开启' : '背景音乐已关闭（音效保留）');
    if (screen === 'title') keepSettingsOpen();
    return;
  }
  if (act === 'ledger' && state) {
    showLedger();
    return;
  }
  if (act === 'finance' && state) {
    showFinance();
    return;
  }
  if (act === 'motion') {
    const on = !document.body.classList.contains('reduce-motion');
    document.body.classList.toggle('reduce-motion', on);
    lsSet('epdg-reduce-motion', on ? '1' : '0');
    keepSettingsOpen();
    return;
  }
  if (act === 'restart') {
    if (!draft.restartArmed) {
      draft.restartArmed = true;
      $('#g-hud').innerHTML = hud();
      setTimeout(() => {
        draft.restartArmed = false;
        if ($('#g-hud')) $('#g-hud').innerHTML = hud();
      }, 2500);
      return;
    }
    draft.restartArmed = false;
  }
  if (act === 'restart' || act === 'hard-restart') {
    clearSave();
    state = null;
    screen = 'title';
    unmountStudio();
    render();
    return;
  }
  play('click');
  if (act === 'new') {
    draft.companyName = randomCompanyName();
    screen = 'create';
    play('page-turn');
    render();
    return;
  }
  if (act === 'continue') {
    const s = loadGame();
    if (!s) return toast('没有存档');
    play('save');
    startGame(s);
    return;
  }
  if (act === 'rand-chip') {
    draft.chipSeries = CHIP_SERIES_SEEDS[Math.floor(Math.random() * CHIP_SERIES_SEEDS.length)];
    $('#chipname').value = draft.chipSeries;
    $('#chiphint').textContent = draft.chipSeries;
    return;
  }
  if (act === 'rand-name') {
    draft.companyName = randomCompanyName();
    $('#cname').value = draft.companyName;
    return;
  }
  if (act === 'set-mode') {
    draft.mode = id === 'quick' ? 'quick' : 'chronicle';
    draft.plan = L.recommendedPlan(defaultFormId({ month: 1, mode: draft.mode }));
    render();
    return;
  }
  if (act === 'confirm-create') {
    const name = ($('#cname')?.value || draft.companyName).trim() || randomCompanyName();
    const chip = ($('#chipname')?.value || draft.chipSeries || '蜂鸟').trim().slice(0, 4) || '蜂鸟';
    play('confirm');
    startGame(createNewGame(name, chip, draft.mode || 'chronicle'));
    persist();
    play('save');
    flash('开张大吉');
    return;
  }
  if (screen !== 'game' || !state) return;

  switch (act) {
    case 'plan-form': {
      const next = L.recommendedPlan(id);
      draft.plan = { ...next, formFactor: id, bindEco: !!draft.plan.bindEco && productEraOf(id) !== 'keypad' };
      draft.planPosSeen = false;
      break;
    }
    case 'plan-pos':
      draft.plan.positioningId = id;
      draft.planPosSeen = true;
      break;
    case 'plan-price':
      draft.plan.priceId = id;
      break;
    case 'toggle-point': {
      const arr = draft.plan.pointIds;
      const k = arr.indexOf(id);
      if (k >= 0) arr.length > 1 && arr.splice(k, 1);
      else if (arr.length < 3) arr.push(id);
      break;
    }
    case 'confirm-plan': {
      const r = L.finishPlan(state, draft.plan);
      if (!r.ok) return toast(r.msg);
      draft.planPosSeen = true;
      play('keep');
      flash('企划拍板！');
      break;
    }
    case 'pick-sup':
      draft.supplierId = id;
      break;
    case 'pick-stk':
      draft.stockId = id;
      break;
    case 'pick-chip':
      if (id === 'ext' && L.marketMod(state, 'extBan')) return toast('外购芯片断供中');
      draft.chipSrc = id;
      break;
    case 'market-choice': {
      const r = L.resolveMarketEvent(state, i);
      if (r.msg) toast(r.msg);
      play('keep');
      break;
    }
    case 'confirm-supply':
      L.pickLogistics(state, draft.supplierId, draft.stockId, draft.chipSrc || 'own');
      draft.focus = [];
      play('keep');
      flash('签约！');
      break;
    case 'focus': {
      const k = draft.focus.indexOf(id);
      if (k >= 0) draft.focus.splice(k, 1);
      else draft.focus = [...draft.focus.slice(-1), id];
      break;
    }
    case 'advance':
      advance(false);
      return;
    case 'advance-all':
      advance(true);
      return;
    case 'early':
      L.earlyLaunch(state);
      draft.factoryDone = false;
      play('keep');
      flash('提前量产！');
      break;
    case 'angel-choice': {
      const r = L.applyAngelChoice(state, i);
      if (!r.ok) {
        toast(r.msg);
        return;
      }
      play('keep');
      if (r.epilogue) toast(r.epilogue, 5500);
      const last = (state.ledger || [])[state.ledger.length - 1];
      if (last && String(last.label).includes('天使')) {
        const sheet = document.getElementById('g-sheet');
        moneyFx(sheet?.getBoundingClientRect(), last.v);
        ledgerFly(last.label, last.v);
      }
      break;
    }
    case 'event-choice':
      L.resolveEvent(state, i);
      if (state.phase === 'factory') draft.factoryDone = false;
      break;
    case 'to-launch':
      L.toLaunch(state);
      break;
    case 'price-step':
      draft.price = Math.max(L.priceBounds(state).floor, Math.min(L.priceBounds(state).ceil, draft.price + Number(btn.dataset.d)));
      break;
    case 'set-price':
      L.setPrice(state, draft.price);
      play('boom');
      flash(`¥${draft.price}`);
      break;
    case 're-price':
      state.product.price = null;
      break;
    case 'launch-pick-style': {
      const next = L.defaultLaunchOpts(id, state.design);
      // 保留用户已选的非默认项里与风格无关的：屏显主题
      if (draft.launchOpts?.screenTheme) next.screenTheme = draft.launchOpts.screenTheme;
      if (draft.launchOpts?.ad) next.ad = draft.launchOpts.ad;
      draft.launchOpts = next;
      break;
    }
    case 'launch-opt':
      draft.launchOpts = draft.launchOpts || L.defaultLaunchOpts('safe', state.design);
      draft.launchOpts[btn.dataset.field] = id;
      break;
    case 'launch-toggle':
      draft.launchOpts = draft.launchOpts || L.defaultLaunchOpts('safe', state.design);
      draft.launchOpts[btn.dataset.field] = !draft.launchOpts[btn.dataset.field];
      break;
    case 'launch-go': {
      const opts = draft.launchOpts || L.defaultLaunchOpts(productEraOf(state.design) === 'keypad' ? 'retail' : 'safe', state.design);
      L.resolveLaunchStyle(state, opts.style || 'safe', opts);
      persist();
      play('press-reveal');
      playReveal();
      return;
    }
    case 'to-sales':
      L.runSales(state);
      play('keep');
      break;
    case 'to-next':
      L.enterNext(state);
      break;
    case 'bench': {
      const d = state.design;
      const kpd = productEraOf(d) === 'keypad';
      const cs = kpd ? { label: tier(d, 'chip').label, bench: 1000, heat: 0 } : chipSpec(d);
      const ratio = kpd
        ? Math.min(1, state.slots.battery.progress / Math.max(1, L.capsMap(state).battery || 1))
        : Math.min(1, state.slots.perf.progress / Math.max(1, L.capsMap(state).perf));
      const rewardable = state.benchGen !== state.generation && ratio >= 0.6;
      const yr = Math.floor((state.month - 1) / 12);
      const kpRivals = [
        { n: '青橙老人机', v: 760 + yr * 20 },
        { n: '极光 E 系列', v: 820 + yr * 20 },
        { n: '方块 K 系列', v: 880 + yr * 15 },
      ];
      busy = true;
      import('./bench.js').then(({ openBench }) =>
        openBench({
          design: d,
          chipLabel: cs.label,
          phoneName: (d.modelName || '新机').slice(0, 8),
          color: d.color,
          theory: cs.bench,
          ratio,
          rivals: kpd ? kpRivals : rivalPhones(industryMonth(state)),
          heat: cs.heat + ((d.concepts || []).includes('fan') ? -1 : 0),
          rewardable,
          play,
          onDone: (r) => {
            busy = false;
            if (r) {
              if (!state.benchBest || state.benchBest.gen !== state.generation || r.score > state.benchBest.score) state.benchBest = { gen: state.generation, score: r.score };
              if (rewardable) {
                state.benchGen = state.generation;
                const add = r.rank === 1 ? 8 : r.beaten > 0 ? 4 : 0;
                state.hype += add;
                if (r.rank === 1) state.benchRank1 = state.generation;
                toast(r.rank === 1 ? `📈 #遥遥领先# 冲上热搜，热度 +${add}` : add ? `📈 跑分截图刷屏，热度 +${add}` : '论坛：「就这？」热度没涨');
              }
            }
            persist();
            render();
          },
        }),
      );
      return;
    }
    case 'qc': {
      const sup = SUPPLIERS.find((x) => x.id === state.supplierId) || SUPPLIERS[1];
      const r = Math.random() * sup.quality;
      const pool = r > 0.35 ? QC.good : r > 0.15 ? QC.meh : QC.bad;
      const out = $('#qc-out');
      play(pool === QC.bad ? 'explode' : 'part', 1);
      if (out) {
        out.textContent = '测试中…';
        out.className = 'qc-run';
        setTimeout(() => {
          out.textContent = pool[Math.floor(Math.random() * pool.length)];
          out.className = pool === QC.good ? 'qc-good' : pool === QC.bad ? 'qc-bad' : 'qc-meh';
        }, 700);
      }
      return;
    }
    case 'rescue-ok':
      L.leaveRescue(state);
      play('level-up');
      flash('重新出发');
      break;
    case 'share-launch':
    case 'era-info': {
      const we = worldEraOf(state);
      toast(`${we.name}：${we.blurb}`);
      break;
    }
    case 'share-ending':
      shareCard(act === 'share-ending');
      return;
    case 'chip-research': {
      const r = L.startChipResearch(state);
      toast(r.msg);
      if (r.ok) play('keep');
      break;
    }
    case 'expand': {
      const r = L.buyExpansion(state, id);
      toast(r.msg);
      if (r.ok) {
        play('level-up');
        scene.pulse('confetti');
      }
      break;
    }
    case 'next-tab':
      draft.nextTab = id;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'cut-price': {
      const r = L.cutPrice(state, i);
      toast(r.msg, Math.min(12000, Math.max(5500, 2000 + String(r.msg || '').length * 90)));
      if (r.ok) play('keep');
      break;
    }
    case 'old-policy-sku': {
      const key = btn.dataset.key;
      if (!key) break;
      state.oldPolicyMap = { ...(state.oldPolicyMap || {}), [key]: id };
      break;
    }
    case 'old-policy':
      state.oldPolicy = id;
      break;
    case 'office': {
      const r = L.upgradeOffice(state);
      toast(r.msg);
      if (r.ok) {
        play('level-up');
        play('fanfare');
        draft.showHQ = true;
        scene.pulse('confetti');
      }
      break;
    }
    case 'upgrade': {
      const r = L.upgradeDept(state, id);
      toast(r.msg);
      if (r.ok) play('keep');
      break;
    }
    case 'next-gen':
      draft.showHQ = false;
      draft.nextTab = 'review';
      L.goNextGen(state);
      draft.plan = { ...L.recommendedPlan(state.designDraft?.formFactor || defaultFormId(state)), positioningId: state.designDraft?.position || L.recommendedPlan(state.designDraft?.formFactor || defaultFormId(state)).positioningId };
      draft.planPosSeen = false;
      flash(`第 ${state.generation} 代`);
      break;
    default:
      return;
  }
  persist();
  render();
  // 现金有变化：飞字 + 顶部资金闪一下
  if (state && cashBefore != null && state.cash !== cashBefore) {
    moneyFx(spendRect || btn.getBoundingClientRect(), state.cash - cashBefore);
    const c = document.querySelector('.hud-stat.s-cash');
    c?.classList.add(state.cash < cashBefore ? 'flash' : 'gain');
  }
}

function onChange(e) {
  const t = e.target;
  if (t.id === 'chipseries' && state) {
    L.renameChip(state, t.value);
    persist();
    render();
    return;
  }
  if (t.dataset.act === 'bind-eco') draft.plan.bindEco = t.checked;
}

export function boot() {
  installGlossary();
  const root = document.getElementById('app');
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('input', (e) => {
    if (e.target.id === 'price-range' && state) {
      draft.price = Number(e.target.value);
      // 只刷新数字和预测，不重建滑杆，拖动不断
      const tmp = document.createElement('div');
      tmp.innerHTML = pricingPanel();
      tmp.querySelectorAll('.pp-dyn').forEach((el) => {
        const cur = document.querySelector(`.pp-dyn[data-k="${el.dataset.k}"]`);
        if (cur) cur.innerHTML = el.innerHTML;
      });
      return;
    }
    if (e.target.id === 'chipname') {
      draft.chipSeries = e.target.value;
      const h = $('#chiphint');
      if (h) h.textContent = e.target.value || '蜂鸟';
    }
  });
  if (lsGet('epdg-reduce-motion') === '1') document.body.classList.add('reduce-motion');
  import('./studio/sfx.js').then((m) => {
    sfx = m.sfx;
    sfx.warm?.();
    sfx.syncBgm?.(screen === 'game' && state ? state.phase : screen);
  });
  render();
}

