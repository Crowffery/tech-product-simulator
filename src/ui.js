/**
 * 主流程 UI（v0.9，竖屏优先）
 * 布局：HUD → 阶段进度条 → 像素场景 → 操作面板 → 吸底主按钮
 * 设计阶段换成 3D 工作台；发布会换成全屏 3D 演出。
 */
import { SLOTS, POSITIONING, SELL_POINTS, PRICE_BANDS, SUPPLIERS, STOCK_OPTS, EVENTS, DEPTS, randomCompanyName } from './game/data.js';
import { createNewGame, saveGame, loadGame, clearSave, hasSave } from './game/state.js';
import * as L from './game/logic.js';
import { lsGet, lsSet } from './game/storage.js';
import { SceneView } from './scenes.js';
import { term, installGlossary } from './glossary.js';
import { physical, tier, CONCEPTS, hasAppeared, danmaku, paletteName, novelty, buzzOf, chipSpec, chipName, chipBench, rivalBench, CHIP_SERIES_SEEDS } from './studio/parts.js';
import { priceFit, nextWindow, rivalLaunches, clashAt, windowAt, monthOfYear, endingTitles, RUN_MONTHS, IDEAL, rivalPhones } from './game/market.js';

let state = null;
let screen = 'title'; // title | create | game
let scene = null;
let studio = null;
let sfx = null;
let busy = false; // 演出中禁止操作
const draft = {
  companyName: randomCompanyName(),
  plan: L.recommendedPlan(),
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

function toast(msg) {
  if (!msg) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
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

function hud() {
  if (!state) return `<div class="hud-title">电子产品发展国</div><button type="button" class="hud-btn" data-act="mute">${sfx?.muted ? '🔇' : '🔊'}</button>`;
  // (title screen hides the HUD via body.screen-title)
  return `
    <div class="hud-brand"><b>${esc(state.companyName)}</b><small>${L.office(state).icon} 第 ${state.generation} 代 · 第 ${Math.floor((state.month - 1) / 12) + 1} 年 ${monthOfYear(state.month)} 月</small></div>
    <div class="hud-stat ${state.cash < 30 ? 'low' : ''}"><i>💰</i><b>${state.cash}</b></div>
    <div class="hud-stat"><i>❤️</i><b>${state.faith}</b></div>
    <div class="hud-stat"><i>⭐</i><b>${state.reputation}</b></div>
    <div class="hud-stat"><i>🔬</i><b>${state.rp}</b></div>
    <button type="button" class="hud-btn" data-act="mute" title="音效">${sfx?.muted ? '🔇' : '🔊'}</button>
    <button type="button" class="hud-btn ${draft.restartArmed ? 'armed' : ''}" data-act="restart" title="重开">${draft.restartArmed ? '确定?' : '↺'}</button>`;
}

function rail() {
  if (!state) return '';
  const cur = L.stepIndex(state.phase);
  return L.PHASE_STEPS.map(
    (s, i) => `<span class="rail-step ${i < cur ? 'done' : i === cur ? 'on' : ''}"><i>${s.icon}</i><small>${s.label}</small></span>`,
  ).join('<b class="rail-line"></b>');
}

// ═════════════════════════ 各阶段面板 ═════════════════════════

const P = {};

const VERSION = 'v1.3';
function saveSummary() {
  const s = hasSave() ? loadGame() : null;
  if (!s) return '';
  return `${esc(s.companyName)} · 第 ${s.generation} 代 · 第 ${Math.floor((s.month - 1) / 12) + 1} 年 ${monthOfYear(s.month)} 月 · 💰${s.cash}`;
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
        <button type="button" class="menu-btn ${sum ? '' : 'primary'}" data-act="new"><b>${sum ? '🏁 创立新公司' : '▶ 开始游戏'}</b><small>${sum ? '会覆盖当前存档' : '三年时间，从车库做到科技园'}</small></button>
        ${import.meta.env.VITE_STUDIO_HREF === 'none' ? '' : `<a class="menu-btn" href="${import.meta.env.VITE_STUDIO_HREF || './studio.html'}"><b>🎨 自由设计工坊</b><small>所有部件和黑科技全开，随便造</small></a>`}
        <details class="menu-set"><summary>⚙ 设置</summary>
          <label><span>音效与音乐</span><button type="button" data-act="mute">${sfx?.muted ? '🔇 已关闭' : '🔊 已开启'}</button></label>
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
  sheet: `<h2 class="sheet-h">🏁 创立公司</h2>
    <label class="field-l">公司名
      <div class="row"><input id="cname" maxlength="10" value="${esc(draft.companyName)}" /><button type="button" data-act="rand-name" title="换一个">🎲</button></div>
    </label>
    <label class="field-l">自研芯片系列
      <div class="row"><input id="chipname" maxlength="4" value="${esc(draft.chipSeries || (draft.chipSeries = CHIP_SERIES_SEEDS[Math.floor(Math.random() * CHIP_SERIES_SEEDS.length)]))}" /><button type="button" data-act="rand-chip" title="换一个">🎲</button></div>
      <small class="muted">第一颗芯片叫「<span id="chiphint">${esc(draft.chipSeries)}</span> X1」，以后每次流片升级一代。</small>
    </label>
    <div class="brief">
      <b>你的任务</b>
      <span>📋 定方向 → 🎨 做设计 → 🔬 带研发 → 🎤 开发布会 → 🛒 卖出去</span>
      <span>三年后看你的公司能走多远。具体的活儿，交给手下四个部门。</span>
    </div>`,
  cta: `<button type="button" class="primary big" data-act="confirm-create">开张！</button>`,
});

P.plan = () => {
  const p = draft.plan;
  const tri = L.trianglePreview(p.positioningId, p.priceId);
  const chips = (list, cur, act, multi = false) =>
    list
      .map((x) => `<button type="button" class="chip ${multi ? (cur.includes(x.id) ? 'on' : '') : cur === x.id ? 'on' : ''}" data-act="${act}" data-id="${x.id}">${x.name}</button>`)
      .join('');
  return {
    scene: ['plan', { office: state.office, month: state.month, positioning: p.positioningId, points: p.pointIds.length, price: p.priceId, color: state.designDraft?.color }],
    caption: `企划会：第 ${state.generation} 代要赌什么？`,
    sheet: `<h2 class="sheet-h">📋 企划</h2>
      ${newsCard()}
      <div class="field-l">${term('定位')}<div class="chips">${chips(POSITIONING, p.positioningId, 'plan-pos')}</div></div>
      <div class="field-l">${term('卖点')} <small>选 1～3 个</small><div class="chips">${chips(SELL_POINTS, p.pointIds, 'toggle-point', true)}</div></div>
      <div class="field-l">${term('售价带')}<div class="chips">${chips(PRICE_BANDS, p.priceId, 'plan-price')}</div></div>
      ${state.generation > 1 ? `<label class="eco"><input type="checkbox" data-act="bind-eco" ${p.bindEco ? 'checked' : ''}/> 绑定上代生态</label>` : ''}
      ${(() => {
        const pf = priceFit(p.positioningId, p.priceId);
        return pf.note ? `<p class="warn-line ${pf.user < 0 ? 'bad' : 'good'}">💬 ${pf.note}</p>` : '';
      })()}
      <p class="pill-row"><span class="pill">⏳ 研发工期约 ${tri.months} 个月</span></p>
      ${calendar(state.month, state.month + tri.months + 1, p.positioningId)}`,
    cta: `<button type="button" class="primary big" data-act="confirm-plan">定了！去设计部 ▶</button>`,
  };
};

P.supply = () => ({
  scene: ['supply', { month: state.month, supplierId: draft.supplierId, stockId: draft.stockId }],
  caption: '供应商大会：选谁来造？备多少货？',
  sheet: `<h2 class="sheet-h">🤝 供应链</h2>
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
    <div class="field-l">首批${term('备货')}<div class="chips">${STOCK_OPTS.map(
      (s) => `<button type="button" class="chip ${draft.stockId === s.id ? 'on' : ''}" data-act="pick-stk" data-id="${s.id}">${s.name}</button>`,
    ).join('')}</div></div>`,
  cta: `<button type="button" class="primary big" data-act="confirm-supply">签约，开工研发 ▶</button>`,
});

P.dev = () => {
  const caps = L.capsMap(state);
  const r = Math.round(L.devRatio(state) * 100);
  return {
    scene: ['dev', devSceneData()],
    caption: `研发实验室 · 还剩约 ${state.monthsLeft} 月`,
    sheet: `<h2 class="sheet-h">🔬 研发 <small>${state.notes?.[state.product.positioningId] ? `📒 ${term('企划笔记')}生效` : '⭐ 点星标出重点'}</small></h2>
      ${devTimeline()}
      ${state.month > 1 || state.slots.perf.progress > 0 ? benchCard() : ''}
      ${onSaleBlock()}
      ${state.chip?.research ? `<p class="chip-line">🧪 ${esc(chipName(state.chip.series, state.chip.research.gen, 1).replace(/ Pro$/, ''))} 流片中：还剩 ${state.chip.research.months} 个月 <i style="--p:${Math.round((1 - state.chip.research.months / state.chip.research.total) * 100)}%"></i></p>` : ''}
      <div class="slots">${SLOTS.map((s) => {
        const sl = state.slots[s.id];
        const cap = caps[s.id];
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
  return { gen: state.generation, month: state.month, models: state.models, chipGen: state.chip?.gen || 1 };
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
  return `<div class="news-card"><b>📰 行业新技术</b><span>${list.map((c) => `${c.icon} ${c.name}`).join(' · ')}</span><small>去设计部的「💡 创新」看看</small></div>`;
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

/** 工程机跑分入口 */
function benchCard() {
  const best = state.benchBest?.gen === state.generation ? state.benchBest.score : 0;
  const perf = Math.round((state.slots.perf.progress / Math.max(1, L.capsMap(state).perf)) * 100);
  return `<div class="bench-card"><span class="o-icon">🏁</span><div><b>工程机跑分</b>
    <small>${best ? `本代最好成绩 ${best.toLocaleString('en-US')}` : `性能调校 ${perf}%${state.benchGen === state.generation ? '' : perf >= 60 ? ' · 首跑会被晒到论坛' : ' · 过 60% 再跑才上得了论坛'}`}</small></div>
    <button type="button" data-act="bench">跑个分</button></div>`;
}

function onSaleBlock() {
  const list = state.onSale || [];
  if (!list.length) return '';
  return `<div class="onsale"><b>🛒 在售旧款</b>${list
    .map((m) => `<span><i style="background:${m.color}"></i>${esc(m.name)} · 月销约 ${Math.round(m.monthly)} 万台 · 还卖 ${m.months} 月</span>`)
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
  if (e.cash) bits.push(`💰${e.cash > 0 ? '+' : ''}${e.cash}`);
  if (e.months) bits.push(`⏳+${e.months}月`);
  if (e.hype) bits.push(`📣${e.hype > 0 ? '↑' : '↓'}`);
  if (e.faith) bits.push(`❤️${e.faith > 0 ? '↑' : '↓'}`);
  if (e.slotPenalty && Object.keys(e.slotPenalty).length) bits.push('🔧进度受损');
  if (e.gambleFail) bits.push('🎲赌');
  return bits.length ? `<i>${bits.join(' ')}</i>` : '';
}

const FAC_STAGES = ['🔧 试产', '📈 良率爬坡', '⚙️ 满产', '📦 装箱发货'];
function stockedUnits() {
  const price = PRICE_BANDS.find((p) => p.id === state.product.priceId);
  const stock = STOCK_OPTS.find((s) => s.id === state.stockId);
  return Math.round(30 * stock.mul * (0.5 + price.demand * 0.5));
}

P.factory = () => {
  const p = physical(state.design);
  const run = !draft.factoryDone;
  const units = stockedUnits();
  return {
    scene: ['factory', { color: state.design.color, stockId: state.stockId }],
    caption: run ? '流水线开足马力' : '首批货已装箱，等发布会开售',
    sheet: `<h2 class="sheet-h">🏭 量产 <small>${esc(state.design.modelName)} · ${esc(paletteName(state.design.color))}</small></h2>
      <div class="fac ${run ? 'running' : 'done'}">
        <div class="fac-stages">${FAC_STAGES.map((n, i) => `<span style="--i:${i}">${n}</span>`).join('')}</div>
        <div class="fac-count"><b id="fac-n">${run ? 0 : units}</b><small>/ ${units} 万台</small></div>
        <div class="fac-belt"><i></i></div>
      </div>
      <div class="qc-row"><button type="button" data-act="qc">🔨 抽检一台</button><span id="qc-out" class="muted">随机拿一台做跌落和老化测试</span></div>
      <div class="spec-row"><span>单台成本</span><b>¥${p.unitCost}</b></div>
      <div class="spec-row"><span>研发完成度</span><b>${Math.round(L.devRatio(state) * 100)}%</b></div>
      ${benchCard()}
      ${(state.onSale || []).length ? `<div class="field-l" style="margin-top:8px">新品上市，旧款怎么办？<small class="muted">（旧款预计还能挣 ${L.tailValue(state)}）</small>
        <div class="cards3">${L.OLD_POLICIES.map((o) => `<button type="button" class="pick ${(state.oldPolicy || 'keep') === o.id ? 'on' : ''}" data-act="old-policy" data-id="${o.id}"><b>${o.name}</b><small>${o.desc}</small></button>`).join('')}</div></div>` : ''}`,
    cta: `<button type="button" class="primary big" data-act="to-launch" ${draft.factoryDone ? '' : 'disabled'}>${draft.factoryDone ? '🎤 去发布会后台 ▶' : '量产中…'}</button>`,
  };
};

const QC = {
  good: ['1.5 米跌落：完好无损 ✓', '72 小时老化：一切正常 ✓', '泡水 30 分钟：还能亮 ✓', '口袋里坐了一下：没弯 ✓'],
  meh: ['跌落后边框有个小坑，问题不大', '老化测试有点烫手，在可接受范围'],
  bad: ['屏幕排线松了——这批要返工几台', '按键手感松垮，产线连夜调整'],
};

P.launch = () => ({
  scene: ['launch', {}],
  caption: '后台：观众已经入场，主讲人还在背稿',
  sheet: `<h2 class="sheet-h">🎤 发布会</h2>
    <div class="cards3">${L.LAUNCH_STYLES.map(
      (s) => `<button type="button" class="pick" data-act="launch-style" data-id="${s.id}"><b>${s.label}</b><small>${s.desc}</small><i>${s.risk >= 0.3 ? '⚠ 很冒险' : s.risk >= 0.1 ? '有点风险' : '稳'}</i></button>`,
    ).join('')}</div>`,
  cta: '',
});

P.score = () => {
  const W = state.wowResult || {};
  const heat = state.launchHeat ?? 60;
  return {
    scene: ['score', { color: state.design?.color, grade: W.grade, flop: state.launchFlop, hidePhone: !!state.lastCut }],
    imgs: state.lastCut ? [{ src: state.lastCut, x: 50, y: 50, h: 52, cls: 'hero' }] : [],
    caption: state.launchFlop ? '演示机卡住了，但发布会总算撑完了' : heat >= 85 ? '全场沸腾，掌声停不下来' : '发布会落幕，媒体开始写稿',
    sheet: `<h2 class="sheet-h">📰 媒体评测 <small>发布会结束 30 分钟后</small></h2>
      <div class="score-big">
        <div class="sb-cell rv-step" data-step="1"><b data-count="${state.mediaScore}">${state.mediaScore}</b><span>媒体评分</span></div>
        <div class="sb-cell rv-step" data-step="2"><b class="sub" data-count="${state.userScore}">${state.userScore}</b><span>用户口碑</span></div>
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
      <p class="muted">🔬 ${term('研发点')} +${state.lastRp}</p></div>`,
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
    <div class="rv-chips">${R.verdict.map((v) => `<span class="rv rv-${tag[v.v][1]}">${v.name.slice(0, 2)} ${tag[v.v][0]}</span>`).join('')}</div>
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
    scene: ['sales', { month: state.month, color: state.design?.color, state: r.stockState, queue, hidePhone: !!state.lastCut }],
    imgs: state.lastCut ? [{ src: state.lastCut, x: 31, y: 41, h: 30 }] : [],
    caption: r.stockState === 'short' ? '门口排起长队，黄牛也来了' : r.stockState === 'over' ? '店里有点冷清，仓库在吃灰' : '门店生意不错',
    sheet: `<h2 class="sheet-h">🛒 首月战报</h2>
      <div class="score-big">
        <div class="sb-cell rv-step" data-step="1"><b data-count="${r.sold}">${r.sold}</b><span>万台售出</span></div>
        <div class="sb-cell rv-step" data-step="3"><b class="sub ${r.profit < 0 ? 'neg' : ''}" data-count="${r.profit}" data-sign="1">${r.profit > 0 ? '+' : ''}${r.profit}</b><span>首月盈亏</span></div>
      </div>
      <div class="rv-step" data-step="2">
        <div class="stockbar ${r.stockState}"><div class="sk-top"><span>📦 首批备货 ${r.stocked} 万台</span><b>${r.stockState === 'short' ? '售罄！' : `卖掉 ${pct}%`}</b></div>
          <div class="sk-track"><i data-w="${Math.min(100, pct)}"></i></div></div>
        <p class="stock-note">${esc(r.stockNote)}</p>
      </div>
      <div class="rv-step" data-step="4">
        ${r.oldNote ? `<p class="warn-line good">♻ ${esc(r.oldNote)}</p>` : ''}
        ${r.window ? `<p class="warn-line ${r.windowMul > 1 ? 'good' : 'bad'}">📅 ${r.windowMul > 1 ? '赶上' : '撞上'}${r.window}</p>` : ''}
        ${r.clash ? `<p class="warn-line bad">⚔ ${r.clash}</p>` : ''}
        <p class="muted">售价 ¥${r.price} · 单台成本 ¥${r.unitCost} · 之后它还会继续卖几个月</p>
      </div>`,
    cta: `<button type="button" class="primary big" data-act="to-next">${state.month >= RUN_MONTHS ? '三年结算 ▶' : '年终总结，规划下一代 ▶'}</button>`,
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
    sheet: `<h2 class="sheet-h">🏛 规划下一代</h2>
      ${last ? `<div class="model-card">${last.thumb ? `<img src="${last.thumb}" alt="" />` : ''}<div><b>${esc(last.design.modelName)}</b>
        <small>惊艳 ${last.wow} ${last.grade} · 售出 ${last.sold} 万台 · 媒体 ${last.media}</small>
        ${(last.firsts || []).map((f) => `<span class="mini-first">🏆${esc(f)}</span>`).join('')}</div></div>` : ''}
      ${(() => {
        const o = L.office(state);
        const n = L.nextOffice(state);
        return `<div class="office-card"><span class="o-icon">${o.icon}</span><div><b>${o.name}</b><small>${o.desc}</small>
          ${n ? `<small class="next">扩建到 ${n.icon} ${n.name}：${n.desc}</small>` : '<small class="next">已经是最大的园区了</small>'}</div>
          ${n ? `<button type="button" data-act="office" ${state.cash < n.cost ? 'disabled' : ''}>扩建 ${n.cost}</button>` : ''}</div>`;
      })()}
      ${chipLab()}
      <h3 class="sub-h">部门升级 <small>💰 ${state.cash}</small></h3>
      <div class="depts">${DEPTS.map((d) => {
        const lv = L.deptLevel(state, d.id);
        const cost = L.deptUpgradeCost(state, d.id);
        return `<div class="dept"><span class="d-icon">${d.icon}</span><div><b>${d.name} <em>Lv${lv}</em></b><small>${d.desc[lv - 1]}</small>
          ${cost != null ? `<small class="next">下一级：${d.desc[lv]}</small>` : ''}</div>
          ${cost != null ? `<button type="button" data-act="upgrade" data-id="${d.id}" ${state.cash < cost ? 'disabled' : ''}>升级 ${cost}</button>` : '<span class="maxed">满级</span>'}</div>`;
      }).join('')}</div>
      <p class="muted">🔬 研发点 ${state.rp}：在设计阶段的「💡 创新」页解锁新概念件。</p>`,
    cta: `<button type="button" class="primary big" data-act="next-gen">开新企划 ▶</button>`,
  };
};

P.ending = () => {
  const E = endingTitles(state);
  return {
    scene: ['next', { models: state.models.map((m) => ({ color: m.design.color, grade: m.grade, firsts: m.firsts?.length, cut: !!m.cut })), finale: true }],
    imgs: wallImgs(),
    caption: '三年过去了，年会大结算',
    sheet: `<h2 class="sheet-h">🏆 三年结算</h2>
      <div class="titles">${E.titles.map((t, i) => `<div class="title-card ${i === 0 ? 'main' : ''}"><b>${t.t}</b><small>${esc(t.d)}</small></div>`).join('')}</div>
      <div class="stat-grid">
        <div><b>${E.stats.gens}</b><span>代产品</span></div><div><b>${E.stats.firsts}</b><span>项首创</span></div>
        <div><b>${E.stats.avgWow}</b><span>平均惊艳</span></div><div><b>${E.stats.sold}</b><span>总销量(万台)</span></div>
      </div>
      <div class="ending-wall">${state.models.map((m) => `<span title="${esc(m.design.modelName)}">${m.thumb ? `<img src="${m.thumb}" alt="" />` : '📱'}<i>${m.grade || ''}</i></span>`).join('')}</div>`,
    cta: `<button type="button" class="primary big" data-act="hard-restart">再来一局</button>
      <button type="button" data-act="share-ending">📤 分享结局</button>`,
  };
};

/** 芯片实验室：流片升级 + 跑分走势 */
function chipLab() {
  const c = state.chip;
  const cost = L.chipResearchCost(state);
  const hist = c.history.map((h) => ({ label: `X${h.gen}`, v: h.bench, rv: rivalBench(h.month) }));
  if (c.research) hist.push({ label: `X${c.research.gen}`, v: chipBench(c.research.gen, 1), rv: rivalBench(state.month + c.research.months), pending: true });
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
      ${c.research ? `<span class="maxed">流片中 · 还剩 ${c.research.months} 月</span>` : `<button type="button" data-act="chip-research" ${state.cash < cost.cash ? 'disabled' : ''}>流片 X${cost.next}<small> ${cost.cash} · ${cost.months}月</small></button>`}</div>
    <div class="cl-chart">${bars}</div>
    <p class="muted">🟧 你的芯片 · ⬜ 竞品同期 · ${term('流片')}与下一代研发同时进行</p>
  </div>`;
}

P.rescue = () => {
  const R = state.rescue || { amount: 0, reason: '' };
  return {
    scene: ['title', {}],
    caption: '深夜，车库的灯还亮着',
    sheet: `<h2 class="sheet-h alert">💸 账上没钱了</h2>
      <p>${esc(R.reason)}</p>
      <div class="rescue-card"><span class="tut-av">🧑‍🏫</span><div><b>老周</b><small>天使投资人</small>
        <p>「第一次创业谁没摔过？这笔钱你先拿着。<br/>记住：<b>下次可没人兜底了。</b>」</p></div></div>
      <div class="rescue-cash"><small>注资</small><b>+${R.amount}</b><small>账上现金恢复到 ${state.cash}</small></div>
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

const TUT = {
  plan: '欢迎！你有<b>三年</b>，做出让人惊艳的手机，别破产。<br/>先定这一代卖给谁、卖多少钱、主打什么。带虚线的词都可以点开看解释。',
  design: '这是设计部。<b>🔧 配置</b>选部件，<b>💡 创新</b>挑让人眼前一亮的东西，<b>🎨 外观</b>随你喜欢。<br/>拖动手机能转着看。满意了就「定稿」。',
  supply: '选一家代工厂，再决定首批备多少货。<br/>备少了会断货，备多了压在仓库里。',
  dev: '每推进一个月，团队就往前做一点，觉得哪项重要就点 ⭐。<br/>性能调校过半以后，可以拿工程机<b>跑个分</b>，成绩好会在论坛刷屏。',
  event: '出状况了！选一个你能接受的代价。',
  factory: '流水线开工了。等它跑完的时候，可以随手<b>抽检</b>一台。',
  launch: '发布会是最高光的时刻。选一种讲法，然后上台——<b>轻点屏幕就能翻页</b>。<br/>企划里承诺的卖点会被重点介绍，做没做到，台下一清二楚。',
  score: '媒体和用户打分了。往下翻看看<b>评论区</b>在说什么，<b>复盘</b>会告诉你下一代该往哪改。',
  sales: '首月卖得怎么样？之后它还会继续卖一段时间。',
  next: '一轮结束了。可以升级部门、扩建办公室、让芯片升级——也可以先攒着钱。<br/>剩下的，靠你自己摸索。',
};
const TUT_ORDER = ['plan', 'design', 'supply', 'dev', 'event', 'factory', 'launch', 'score', 'sales', 'next'];

function tutorial(phase) {
  if (!state?.tutorial || state.tutSeen?.[phase] || !TUT[phase] || busy || document.querySelector('.tut')) return;
  const el = document.createElement('div');
  el.className = 'tut';
  const step = TUT_ORDER.indexOf(phase) + 1;
  el.innerHTML = `<div class="tut-card kbox">
      <div class="tut-who"><span class="tut-av">🧑‍🏫</span><div><b>老周</b><small>创业导师 · 新手引导 ${step}/${TUT_ORDER.length}</small></div></div>
      <p>${TUT[phase]}</p>
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
    return;
  }
  draft.revealed = { ...(draft.revealed || {}), [key]: true };
  steps.forEach((el) => el.classList.add('rv-hide'));
  $('#g-cta')?.classList.add('rv-wait');
  const timers = [];
  let cancelled = false;
  const countUp = (b) => {
    const to = Number(b.dataset.count);
    const sign = b.dataset.sign;
    const t0 = performance.now();
    const dur = Math.min(1100, 400 + Math.abs(to) * 12);
    const step = (now) => {
      if (cancelled) return (b.textContent = `${sign && to > 0 ? '+' : ''}${to}`);
      const k = Math.min(1, (now - t0) / dur);
      const v = Math.round(to * (1 - Math.pow(1 - k, 3)));
      b.textContent = `${sign && v > 0 ? '+' : ''}${v}`;
      if (k < 1) requestAnimationFrame(step);
      else b.classList.add('landed');
    };
    requestAnimationFrame(step);
  };
  let t = 250;
  steps.forEach((el, i) => {
    const big = el.querySelector('[data-count]');
    timers.push(
      setTimeout(() => {
        el.classList.remove('rv-hide');
        el.classList.add('rv-in');
        el.querySelectorAll('[data-w]').forEach((x) => requestAnimationFrame(() => (x.style.width = `${x.dataset.w}%`)));
        if (big) {
          countUp(big);
          play('add-points');
        } else play('part', 1);
        if (i === steps.length - 1) $('#g-cta')?.classList.remove('rv-wait');
      }, t),
    );
    t += big ? 1100 : el.querySelector('.comments') ? 1300 : 700;
  });
  const skip = () => {
    cancelled = true;
    timers.forEach(clearTimeout);
    showAll();
    sheet.removeEventListener('click', skip);
    revealRun = null;
  };
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
  if (phase === 'score' && draft._scoreSfx !== state?.generation) {
    draft._scoreSfx = state?.generation;
    play('media-score');
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
    getAppearCtx: () => appearCtx(),
    isNew: (id) => (state.newConcepts || []).includes(id),
    getChipNote: () => (state.chip.research ? `X${state.chip.research.gen} 流片中` : `最新：${state.chip.series} X${state.chip.gen}`),
    onUnlock: (id) => {
      const r = L.unlockConcept(state, id);
      persist();
      $('#g-hud').innerHTML = hud();
      return r;
    },
    confirmLabel: '✅ 定稿，去谈供应链 ▶',
    onChange: (d) => {
      state.designDraft = d;
      persist();
    },
    onConfirm: (d) => {
      state.newConcepts = [];
      L.confirmDesign(state, d);
      draft.supplierId = 'balanced';
      draft.stockId = 'normal';
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
  ov.innerHTML = `<div class="lo-stage"></div><div class="lo-dim"></div><div class="lo-dm"></div><div class="lo-react"></div><div class="lo-fx"></div>
    <div class="lo-meter" hidden><span>现场热度</span><i><b></b></i><em></em></div>
    <div class="lo-chapter" hidden></div><div class="lo-kpi" hidden></div><div class="lo-sub" hidden></div>
    <div class="lo-prog" hidden></div>
    <div class="lo-tap" hidden>轻点屏幕翻页 ▶</div>
    <button type="button" class="lo-skip">跳过 ▶▶</button>`;
  document.body.appendChild(ov);
  let stage;
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
    stage = new PhoneStage(ov.querySelector('.lo-stage'));
    stage.setDesign(state.design);
    const W = state.wowResult || {};
    const quick = state.models.length > 0 && !W.firsts?.length && !['S', 'A'].includes(W.grade);
    const d = state.design;
    const caps = L.capsMap(state);
    const seg = buildKeynote({
      d,
      phys: physical(d),
      cs: chipSpec(d),
      prevChip: state.models.length ? chipSpec(state.models[state.models.length - 1].design) : null,
      rivals: rivalPhones(state.month).slice(0, 3),
      camCap: caps.camera,
      batCap: caps.battery,
      price: PRICE_BANDS.find((p) => p.id === state.product.priceId)?.price || 3999,
      pf: state.review?.priceUser ?? 0,
      points: state.product.pointIds,
      promises: state.review?.promises,
      firsts: W.firsts || [],
      quick,
      eco: state.product.bindEco,
    });

    // 随机现场插曲（放在中段）
    const moments = [
      { wall: (g, Wd, Hd) => { g.fillStyle = '#5d4037'; g.fillRect(Wd / 2 - 16, 14, 32, 32); g.fillStyle = '#f5cba7'; g.fillRect(Wd / 2 - 10, 20, 20, 18); g.fillStyle = '#2c3e50'; g.fillRect(Wd / 2 - 6, 26, 3, 3); g.fillRect(Wd / 2 + 4, 26, 3, 3); txt(g, '神秘嘉宾', Wd / 2, 62, 11, '#ffd08a'); }, sub: '有请神秘嘉宾——知名测评博主<b>「老喵」</b>！', react: ['老喵！！', '真人来了', '👋'], mood: 'good' },
      { wall: (g, Wd, Hd) => txt(g, '能不能送一台！', Wd / 2, Hd / 2 + 6, 16, '#f5b041'), sub: '台下有人大喊：「<b>能不能送一台！</b>」主讲人：「……散会后找我。」', react: ['哈哈哈哈', '我也要！', '😂'], mood: 'good' },
      { wall: (g, Wd, Hd) => txt(g, '最好的一代（之一）', Wd / 2, Hd / 2 + 6, 14, '#fff'), sub: '「这是我们有史以来最好的一代……之一。」', react: ['之一？？', '笑死', '🤣'], mood: 'meh' },
      { wall: (g, Wd, Hd, t) => { for (let i = 0; i < 16; i++) { g.fillStyle = ['#f1948a', '#f5b041', '#5dade2'][(i + Math.floor(t * 4)) % 3]; g.fillRect(8 + i * 14, 20 + (i % 2) * 18, 12, 14); } txt(g, '粉丝应援', Wd / 2, 68, 9, '#fff'); }, sub: '粉丝举起了应援灯牌，全场一起倒数！', react: ['冲冲冲', '🌟🌟🌟', '爱了'], mood: 'good' },
    ];
    const mid = Math.max(1, Math.min(seg.length - 2, 3));
    if (!quick && Math.random() < 0.55) seg.splice(mid, 0, { key: 'moment', ...moments[Math.floor(Math.random() * moments.length)], ms: 2600 });
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
        sub: '呃……现场演示机好像<b>卡住了</b>。我们换一台！',
        react: ['哈哈哈哈', '翻车了！', '📸📸'],
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
    seg.push({ key: 'cd3', wall: (g, Wd) => { txt(g, '今晚 20:00 开售', Wd / 2, 26, 12, '#ffd08a'); txt(g, '3', Wd / 2, 62, 30, '#fff', 'center', 'monospace'); }, sub: '今晚八点，<b>正式开售</b>！', react: ['定闹钟！', '手速准备'], mood: 'good', ms: 900, notap: true });
    ['2', '1'].forEach((n) => seg.push({ key: `cd${n}`, wall: (g, Wd) => { txt(g, '今晚 20:00 开售', Wd / 2, 26, 12, '#ffd08a'); txt(g, n, Wd / 2, 62, 30, '#fff', 'center', 'monospace'); }, sub: null, react: [], ms: 700, notap: true, act: () => play('click') }));
    seg.push({
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
      sub: () => `谢谢大家！现场热度：<b>${heat >= 85 ? '🔥 沸腾' : heat >= 65 ? '👏 热烈' : heat >= 45 ? '🙂 还行' : '😶 冷场'}</b>`,
      react: ['🎉🎉🎉', '太燃了', '安可！'],
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
        if (sl.chap) {
          chapter(String(++no).padStart(2, '0'), sl.chap, sl.main);
          prog.querySelectorAll('i').forEach((el) => el.classList.toggle('on', el.dataset.k === sl.key));
          prog.querySelector(`[data-k="${sl.key}"]`)?.classList.add('done');
        }
        if (exploded && !sl.explode) {
          stage.setExploded(false);
          exploded = false;
        }
        if (sl.pose) stage.pose(...sl.pose);
        if (sl.explode) {
          stage.setExploded(true);
          exploded = true;
        }
        if (sl.shine) stage.shine(1800);
        if (sl.wall) stage.wallAnim(sl.wall);
        ov.classList.toggle('dim', !!sl.dim);
        kpi(sl.kpi);
        if (sl.sub !== null && sl.sub !== undefined) sub(typeof sl.sub === 'function' ? sl.sub() : sl.sub);
        if (sl.react?.length) react(sl.react, sl.mood);
        if (sl.sfx) play(sl.sfx);
        if (sl.fanfare) {
          play('fanfare');
          stage.burst(120, { speed: 2 });
          fireworks(3);
        }
        sl.act?.();
        if (sl.mood === 'good' && sl.react?.length) play('applause', 1);
        // 自动翻页；也可以轻点屏幕提前翻
        const minMs = sl.notap ? sl.ms : Math.min(sl.ms, 900);
        await sleep(minMs);
        if (sl.ms > minMs) await Promise.race([sleep(sl.ms - minMs), new Promise((r) => (tapNext = r))]);
        tapNext = null;
      }
      kpi(null);
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
          sub(`今天，我们带来——<b>${esc(d.modelName)}</b>`);
          react(['哇！', '来了来了', '📸'], 'good');
          fireworks(2);
          const dm = ov.querySelector('.lo-dm');
          danmaku(d, null)
            .sort(() => Math.random() - 0.5)
            .slice(0, 7)
            .forEach((tx, i) => {
              const el = document.createElement('span');
              el.className = 'dm';
              el.textContent = tx;
              el.style.top = `${44 + ((i * 17) % 22)}%`;
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

/** 评论区：发布会结束后用户的吐槽 / 夸奖，留在评分页慢慢看 */
function comments() {
  if (draft.commentsFor === state.generation && draft.comments) return draft.comments;
  const d = state.design;
  const R = state.review || {};
  const W = state.wowResult || {};
  const pool = danmaku(d, null).map((t) => ({ t, like: 20 + Math.floor(Math.random() * 400) }));
  (R.promises || []).filter((p) => !p.ok).forEach((p) => pool.push({ t: `说好的「${p.name}」呢？货不对板`, like: 900 + Math.floor(Math.random() * 500), hot: true }));
  if (R.priceUser < 0) pool.push({ t: `${R.priceNote}，等降价`, like: 600 + Math.floor(Math.random() * 300), hot: true });
  if (R.priceUser > 0) pool.push({ t: '这个价格是认真的吗？冲了', like: 500 + Math.floor(Math.random() * 300) });
  if (state.launchFlop) pool.push({ t: '发布会翻车名场面已收藏', like: 1200 + Math.floor(Math.random() * 400), hot: true });
  if ((W.buzz || 0) >= 40) pool.push({ t: `#${d.modelName}# 是今年最离谱的手机（褒义）`, like: 2000 + Math.floor(Math.random() * 800), hot: true });
  if ((W.completeness || 100) < 70) pool.push({ t: '想法很好，做工像样机', like: 700, hot: true });
  if ((W.novelty || 0) < 25) pool.push({ t: '又是挤牙膏，换个颜色就是新品？', like: 800 });
  const names = ['数码老炮', '夜景党', '续航焦虑患者', '学生党', '极客阿杰', '发烧友小美', '路过的蓝莓用户', '测评博主'];
  const uniq = [...new Map(pool.map((p) => [p.t, p])).values()].sort((a, b) => b.like - a.like).slice(0, 7);
  draft.comments = uniq.map((c, i) => ({ ...c, who: names[(i * 3 + state.generation) % names.length] }));
  draft.commentsFor = state.generation;
  return draft.comments;
}

function commentBlock() {
  return `<div class="comments"><div class="cm-h">🗨 评论区 <small>按点赞排序</small></div>${comments()
    .map((c, i) => `<div class="cm ${c.hot ? 'hot' : ''}"><span class="cm-av">${'🧑👩🧔👨‍💻👩‍🎤🧑‍🔬👴👧'.match(/./gu)[i % 8]}</span><div><b>${esc(c.who)}</b><p>${esc(c.t)}</p></div><i>👍 ${c.like}</i></div>`)
    .join('')}</div>`;
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
  draft.plan = L.recommendedPlan();
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
  el.innerHTML = `<b>📋 ${monthOfYear(state.month - 1)} 月研发月报</b>
    ${gains.map(([id, v]) => `<span><em>${SLOTS.find((x) => x.id === id).name.slice(0, 2)}</em><i><u style="--w:${Math.min(100, v * 3)}%"></u></i><strong>+${v}</strong></span>`).join('')}
    <small>💬 ${log}</small>
    <small class="pay">工资 ${state.monthDelta}${res.tail?.income ? ` · 旧款回款 +${res.tail.income}` : ''}</small>`;
  host.appendChild(el);
  setTimeout(() => el.classList.add('out'), 1900);
  setTimeout(() => el.remove(), 2300);
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
    if (res.tail?.income > 0) scene.pulse('cash', { x: 196, y: 30, text: `+${res.tail.income}` });
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

  if (act === 'mute') {
    sfx?.setMuted(!sfx.muted);
    $('#g-hud').innerHTML = hud();
    if (screen === 'title') keepSettingsOpen();
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
  if (act === 'confirm-create') {
    const name = ($('#cname')?.value || draft.companyName).trim() || randomCompanyName();
    const chip = ($('#chipname')?.value || draft.chipSeries || '蜂鸟').trim().slice(0, 4) || '蜂鸟';
    play('confirm');
    startGame(createNewGame(name, chip));
    persist();
    play('save');
    flash('开张大吉');
    return;
  }
  if (screen !== 'game' || !state) return;

  switch (act) {
    case 'plan-pos':
      draft.plan.positioningId = id;
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
    case 'confirm-supply':
      L.pickLogistics(state, draft.supplierId, draft.stockId);
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
    case 'event-choice':
      L.resolveEvent(state, i);
      if (state.phase === 'factory') draft.factoryDone = false;
      break;
    case 'to-launch':
      L.toLaunch(state);
      break;
    case 'launch-style':
      L.resolveLaunchStyle(state, id);
      persist();
      play('press-reveal');
      playReveal();
      return;
    case 'to-sales':
      L.runSales(state);
      play('keep');
      break;
    case 'to-next':
      L.enterNext(state);
      break;
    case 'bench': {
      const d = state.design;
      const cs = chipSpec(d);
      const ratio = Math.min(1, state.slots.perf.progress / Math.max(1, L.capsMap(state).perf));
      const rewardable = state.benchGen !== state.generation && ratio >= 0.6;
      busy = true;
      import('./bench.js').then(({ openBench }) =>
        openBench({
          chipLabel: cs.label,
          phoneName: (d.modelName || '新机').slice(0, 8),
          color: d.color,
          theory: cs.bench,
          ratio,
          rivals: rivalPhones(state.month),
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
                toast(add ? `📈 跑分截图刷屏，热度 +${add}` : '论坛：「就这？」热度没涨');
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
    case 'share-ending':
      shareCard(act === 'share-ending');
      return;
    case 'chip-research': {
      const r = L.startChipResearch(state);
      toast(r.msg);
      if (r.ok) play('keep');
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
      L.goNextGen(state);
      draft.plan = { ...L.recommendedPlan(), positioningId: state.designDraft?.position || 'mainstream' };
      flash(`第 ${state.generation} 代`);
      break;
    default:
      return;
  }
  persist();
  render();
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

