/**
 * 主流程 UI（v0.9，竖屏优先）
 * 布局：HUD → 阶段进度条 → 像素场景 → 操作面板 → 吸底主按钮
 * 设计阶段换成 3D 工作台；发布会换成全屏 3D 演出。
 */
import { SLOTS, POSITIONING, SELL_POINTS, PRICE_BANDS, SUPPLIERS, STOCK_OPTS, EVENTS, DEPTS, randomCompanyName } from './game/data.js';
import { createNewGame, saveGame, loadGame, clearSave, hasSave } from './game/state.js';
import * as L from './game/logic.js';
import { lsGet } from './game/storage.js';
import { SceneView } from './scenes.js';
import { physical, danmaku, paletteName, novelty, buzzOf } from './studio/parts.js';
import { priceFit, nextWindow, rivalLaunches, clashAt, windowAt, monthOfYear, endingTitles, RUN_MONTHS, IDEAL } from './game/market.js';

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
const play = (name, ...a) => sfx?.[name]?.(...a);

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
      <section class="g-scene" id="g-scene"><div class="g-caption" id="g-caption"></div></section>
      <div id="studio-host" class="studio-host" hidden></div>
      <section class="g-sheet kbox" id="g-sheet"></section>
      <footer class="g-cta" id="g-cta"></footer>
    </div>`;
  scene = new SceneView($('#g-scene'));
}

function hud() {
  if (!state) return `<div class="hud-title">电子产品发展国</div><button type="button" class="hud-btn" data-act="mute">${sfx?.muted ? '🔇' : '🔊'}</button>`;
  return `
    <div class="hud-brand"><b>${esc(state.companyName)}</b><small>第 ${state.generation} 代 · M${state.month}/${RUN_MONTHS}</small></div>
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

P.title = () => ({
  scene: ['title', {}],
  caption: '一间车库，一个想法',
  sheet: `<div class="title-block">
      <h1>电子产品发展国</h1>
      <p>把脑洞做成货架上的爆款。挤牙膏的大厂，就交给你来教育。</p>
    </div>`,
  cta: `${hasSave() ? '<button type="button" class="primary big" data-act="continue">▶ 继续游戏</button>' : ''}
      <button type="button" class="${hasSave() ? '' : 'primary big'}" data-act="new">${hasSave() ? '新开一局' : '▶ 新开一局'}</button>
      <a class="ghost-link" href="${import.meta.env.VITE_STUDIO_HREF || './studio.html'}">🎨 设计沙盒（全部概念解锁）</a>`,
});

P.create = () => ({
  scene: ['title', {}],
  caption: '给公司起个名字',
  sheet: `<label class="field-l">公司名
      <div class="row"><input id="cname" maxlength="10" value="${esc(draft.companyName)}" /><button type="button" data-act="rand-name">🎲</button></div>
    </label>
    <p class="muted">你只管方向：定企划、做设计、拍板供应链、开发布会。具体活儿交给四个部门。</p>`,
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
    scene: ['plan', { month: state.month, positioning: p.positioningId, points: p.pointIds.length, price: p.priceId, color: state.designDraft?.color }],
    caption: `企划会：第 ${state.generation} 代要赌什么？`,
    sheet: `<h2 class="sheet-h">📋 企划</h2>
      <div class="field-l">定位<div class="chips">${chips(POSITIONING, p.positioningId, 'plan-pos')}</div></div>
      <div class="field-l">卖点（1～3）<div class="chips">${chips(SELL_POINTS, p.pointIds, 'toggle-point', true)}</div></div>
      <div class="field-l">售价带<div class="chips">${chips(PRICE_BANDS, p.priceId, 'plan-price')}</div></div>
      ${state.generation > 1 ? `<label class="eco"><input type="checkbox" data-act="bind-eco" ${p.bindEco ? 'checked' : ''}/> 绑定上代生态（信仰 +）</label>` : ''}
      ${(() => {
        const pf = priceFit(p.positioningId, p.priceId);
        return pf.note ? `<p class="warn-line ${pf.user < 0 ? 'bad' : 'good'}">💬 ${pf.note}（用户分 ${pf.user > 0 ? '+' : ''}${pf.user}）</p>` : '';
      })()}
      <div class="mini-gauges">${gauge('体验预期', tri.experience)}${gauge('成本压力', tri.costPressure, 'warn')}<span class="pill">工期约 ${tri.months} 月</span></div>
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
        <b>${s.name}</b><small>${s.desc}</small><i>事故 ${Math.round(s.eventChance * 100)}% · 成本 ×${s.costMul}</i></button>`,
    ).join('')}</div>
    ${(() => {
      const d = state.design;
      const firsts = novelty(d, state.models).items.filter((i) => i.first).length;
      const bz = buzzOf(d, state.models);
      const tip = firsts || bz >= 20 ? '🔥 话题度高：首发新概念容易卖断货，可以考虑激进备货' : state.design.redesign === 'minor' ? '小改款需求平稳，正常或保守备货更安全' : '';
      return tip ? `<p class="warn-line good">${tip}</p>` : '';
    })()}
    <div class="field-l">首批备货<div class="chips">${STOCK_OPTS.map(
      (s) => `<button type="button" class="chip ${draft.stockId === s.id ? 'on' : ''}" data-act="pick-stk" data-id="${s.id}">${s.name}<small> · ${s.note}</small></button>`,
    ).join('')}</div></div>`,
  cta: `<button type="button" class="primary big" data-act="confirm-supply">签约，开工研发 ▶</button>`,
});

P.dev = () => {
  const caps = L.capsMap(state);
  const r = Math.round(L.devRatio(state) * 100);
  return {
    scene: ['dev', devSceneData()],
    caption: `研发实验室 · 完成度 ${r}% · 还剩约 ${state.monthsLeft} 月`,
    sheet: `<h2 class="sheet-h">🔬 研发 <small>每月 ${L.manpowerCap(state)} 点人力 · ${state.notes?.[state.product.positioningId] ? '📒 按企划笔记分配' : '团队凭直觉分配'} · ⭐ 设为重点</small></h2>
      ${devTimeline()}
      <div class="slots">${SLOTS.map((s) => {
        const sl = state.slots[s.id];
        const cap = caps[s.id];
        const on = draft.focus.includes(s.id);
        return `<div class="slot ${sl.progress >= cap ? 'full' : ''}">
          <button type="button" class="star ${on ? 'on' : ''}" data-act="focus" data-id="${s.id}" aria-label="设为重点">⭐</button>
          <div class="slot-main"><div class="slot-top"><b>${s.name}</b><span>${sl.progress}/${cap}</span></div>
            <div class="bar"><i style="width:${sl.progress}%"></i><em style="left:${cap}%"></em></div>
            <small>${esc(sl.comment)}</small></div>
        </div>`;
      }).join('')}</div>`,
    cta: `<button type="button" class="primary big" data-act="advance">⏩ 推进一个月</button>
      <button type="button" data-act="advance-all">⏭ 一直推进</button>
      ${L.canEarlyLaunch(state) ? `<button type="button" class="early" data-act="early">🚀 提前量产</button>` : ''}`,
  };
};

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
  return `<div class="calendar"><div class="cal-h">档期日历 <small>📦=预计上市 · 红框=同定位竞品撞档</small></div><div class="cal-row">${cells.join('')}</div></div>`;
}

function devTimeline() {
  const launchAt = state.month + state.monthsLeft + 1;
  const w = windowAt(launchAt);
  const nw = nextWindow(state.month);
  const clash = clashAt(launchAt, state.product.positioningId);
  const bits = [];
  bits.push(`📦 预计 ${monthOfYear(launchAt)} 月上市${w ? `，赶上<b>${w.name}</b>（需求 ×${w.mul}）` : ''}`);
  if (!w && nw) bits.push(`下个旺季：${nw.name}（${monthOfYear(nw.month)} 月）`);
  if (clash) bits.push(`<span class="bad">⚠ ${clash.brand} 同期发布同定位新机</span>`);
  return `<p class="timeline">${bits.join(' · ')}</p>`;
}

function devSceneData(event = null) {
  return {
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
  if (e.hype) bits.push(`📣${e.hype > 0 ? '+' : ''}${e.hype}`);
  if (e.faith) bits.push(`❤️${e.faith > 0 ? '+' : ''}${e.faith}`);
  if (e.slotPenalty && Object.keys(e.slotPenalty).length) bits.push('🔧进度受损');
  if (e.gambleFail) bits.push('🎲赌');
  return bits.length ? `<i>${bits.join(' ')}</i>` : '';
}

P.factory = () => {
  const p = physical(state.design);
  return {
    scene: ['factory', { color: state.design.color, stockId: state.stockId }],
    caption: draft.factoryDone ? '量产完成，货已装箱' : '工厂开足马力：试产 → 量产',
    sheet: `<h2 class="sheet-h">🏭 量产</h2>
      <div class="spec-row"><span>单台成本</span><b>¥${p.unitCost}</b></div>
      <div class="spec-row"><span>首批备货</span><b>${STOCK_OPTS.find((s) => s.id === state.stockId)?.name}</b></div>
      <div class="spec-row"><span>研发完成度</span><b>${Math.round(L.devRatio(state) * 100)}%</b></div>
      <div class="spec-row"><span>机型</span><b>${esc(state.design.modelName)} · ${esc(paletteName(state.design.color))}</b></div>`,
    cta: `<button type="button" class="primary big" data-act="to-launch" ${draft.factoryDone ? '' : 'disabled'}>${draft.factoryDone ? '🎤 开发布会 ▶' : '量产中…'}</button>`,
  };
};

P.launch = () => ({
  scene: ['launch', {}],
  caption: '后台：观众已入场，选一种讲法',
  sheet: `<h2 class="sheet-h">🎤 发布会</h2>
    <div class="cards3">${L.LAUNCH_STYLES.map(
      (s) => `<button type="button" class="pick" data-act="launch-style" data-id="${s.id}"><b>${s.label}</b><small>${s.desc}</small><i>翻车率 ${Math.round(s.risk * 100)}%</i></button>`,
    ).join('')}</div>
    <p class="muted">公关部 Lv${L.deptLevel(state, 'pr')}：发布会 +${L.prLaunchBonus(state)}</p>`,
  cta: '',
});

P.score = () => {
  const W = state.wowResult || {};
  return {
    scene: ['score', { color: state.design?.color, grade: W.grade, flop: state.launchFlop }],
    caption: state.launchFlop ? '现场 Demo 卡住了……' : '全场欢呼！',
    sheet: `<h2 class="sheet-h">📰 媒体评分</h2>
      <div class="score-big"><b>${state.mediaScore}</b><span>媒体</span><b class="sub">${state.userScore}</b><span>用户</span></div>
      <div class="headline-g">${esc(state.headline)}</div>
      <div class="wow-row"><span class="grade-pill g-${W.grade}">${W.grade || '-'}</span>
        <span>惊艳 <b>${W.score ?? '-'}</b></span><span>新颖 <b>${W.novelty ?? '-'}</b></span><span>完成 <b>${W.completeness ?? '-'}%</b></span><span>🔥 出圈 <b>${W.buzz ?? 0}</b></span></div>
      ${W.firsts?.length ? `<div class="firsts">${W.firsts.map((f) => `<span>🏆 首发 ${esc(f)}</span>`).join('')}</div>` : ''}
      ${W.buzz >= 40 ? `<p class="trend">📈 #${esc(state.design.modelName)}# 冲上热搜</p>` : ''}
      ${reviewBlock()}
      <p class="muted">研发点 +${state.lastRp}（现有 ${state.rp}）</p>`,
    cta: `<button type="button" class="primary big" data-act="to-sales">看首月销量 ▶</button>`,
  };
};

function reviewBlock() {
  const R = state.review;
  if (!R) return '';
  const tag = { more: ['多了', 'm'], less: ['少了', 'l'], ok: ['刚好', 'o'] };
  return `<details class="review" open><summary>📋 复盘：体验 ${R.exp} vs 期望线 ${R.bar} ${R.exp >= R.bar ? '✅' : '⬇'}</summary>
    <div class="rv-row"><span>配比匹配 ${R.match}%（体验 ×${R.mult.toFixed(2)}）</span></div>
    <div class="rv-chips">${R.verdict.map((v) => `<span class="rv rv-${tag[v.v][1]}">${v.name.slice(0, 2)} ${tag[v.v][0]}</span>`).join('')}</div>
    <div class="rv-chips">${R.promises.map((p) => `<span class="rv ${p.ok ? 'rv-o' : 'rv-l'}">${p.ok ? '✓' : '✗ 货不对板'} ${p.name}</span>`).join('')}</div>
    ${R.priceNote ? `<p class="warn-line ${R.priceUser < 0 ? 'bad' : 'good'}">💬 定价：${R.priceNote}</p>` : ''}
    ${R.newNote ? '<p class="note-new">📒 摸清了这个定位的理想配比，已记入企划笔记：以后研发会自动按它分配</p>' : ''}
  </details>`;
}

P.sales = () => {
  const r = state.salesResult;
  const queue = r.stockState === 'short' ? 1 : r.stockState === 'over' ? 0.15 : 0.55;
  return {
    scene: ['sales', { month: state.month, color: state.design?.color, state: r.stockState, queue }],
    caption: r.stockState === 'short' ? '门口排起长队，黄牛来了' : r.stockState === 'over' ? '店里有点冷清，仓库在吃灰' : '门店生意不错',
    sheet: `<h2 class="sheet-h">🛒 首月战报</h2>
      <div class="score-big"><b>${r.sold}</b><span>台售出</span><b class="sub ${r.profit < 0 ? 'neg' : ''}">${r.profit > 0 ? '+' : ''}${r.profit}</b><span>盈亏</span></div>
      ${gauge('备货消化', (r.sold / Math.max(1, r.stocked)) * 100)}
      <p>${esc(r.stockNote)}</p>
      ${r.window ? `<p class="warn-line good">📅 赶上${r.window}：需求 ×${r.windowMul}</p>` : ''}
      ${r.clash ? `<p class="warn-line bad">⚔ ${r.clash}（×${r.clashF.toFixed(2)}）</p>` : ''}
      <p class="muted">售价 ¥${r.price} · 单台成本 ¥${r.unitCost}</p>`,
    cta: `<button type="button" class="primary big" data-act="to-next">${state.month >= RUN_MONTHS ? '三年结算 ▶' : '规划下一代 ▶'}</button>`,
  };
};

P.next = () => {
  const last = state.models[state.models.length - 1];
  return {
    scene: ['next', { models: state.models.map((m) => ({ color: m.design.color, grade: m.grade, firsts: m.firsts?.length })) }],
    caption: '年会：这一代进了机型墙',
    sheet: `<h2 class="sheet-h">🏛 规划下一代</h2>
      ${last ? `<div class="model-card">${last.thumb ? `<img src="${last.thumb}" alt="" />` : ''}<div><b>${esc(last.design.modelName)}</b>
        <small>惊艳 ${last.wow} ${last.grade} · 售出 ${last.sold} 台 · 媒体 ${last.media}</small>
        ${(last.firsts || []).map((f) => `<span class="mini-first">🏆${esc(f)}</span>`).join('')}</div></div>` : ''}
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
    scene: ['next', { models: state.models.map((m) => ({ color: m.design.color, grade: m.grade, firsts: m.firsts?.length })), finale: true }],
    caption: '三年过去了，年会大结算',
    sheet: `<h2 class="sheet-h">🏆 三年结算</h2>
      <div class="titles">${E.titles.map((t, i) => `<div class="title-card ${i === 0 ? 'main' : ''}"><b>${t.t}</b><small>${esc(t.d)}</small></div>`).join('')}</div>
      <div class="stat-grid">
        <div><b>${E.stats.gens}</b><span>代产品</span></div><div><b>${E.stats.firsts}</b><span>项首创</span></div>
        <div><b>${E.stats.avgWow}</b><span>平均惊艳</span></div><div><b>${E.stats.sold}</b><span>总销量</span></div>
      </div>
      <div class="ending-wall">${state.models.map((m) => `<span title="${esc(m.design.modelName)}">${m.thumb ? `<img src="${m.thumb}" alt="" />` : '📱'}<i>${m.grade || ''}</i></span>`).join('')}</div>`,
    cta: `<button type="button" class="primary big" data-act="hard-restart">再来一局</button>`,
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

// ═════════════════════════ 渲染 ═════════════════════════

export function render() {
  if (!scene) shell();
  const phase = screen === 'game' && state ? state.phase : screen;
  document.body.classList.toggle('phase-design', phase === 'design');
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
  const view = (P[phase] || P.title)();
  scene.set(...view.scene);
  $('#g-caption').textContent = view.caption || '';
  $('#g-sheet').innerHTML = view.sheet;
  $('#g-cta').innerHTML = view.cta;
  $('#g-cta').hidden = !view.cta;
  if (phase === 'factory' && !draft.factoryDone && !draft.factoryTimer) {
    draft.factoryTimer = setTimeout(() => {
      draft.factoryDone = true;
      draft.factoryTimer = null;
      play('keep');
      if (state?.phase === 'factory') render();
    }, 4600);
  }
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
  studio = createStudio(host, {
    mode: 'game',
    design: state.designDraft,
    museum: state.models,
    lockPosition: true,
    maxConcepts: L.maxConcepts(state),
    getUnlocked: () => state.unlocked,
    getRp: () => state.rp,
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
  ov.innerHTML = '<div class="lo-stage"></div><div class="lo-dm"></div><button type="button" class="lo-skip">跳过 ▶▶</button>';
  document.body.appendChild(ov);
  let stage;
  const finish = () => {
    if (!busy) return;
    busy = false;
    try {
      state.lastThumb = stage ? stage.snapshot(140) : '';
    } catch {
      state.lastThumb = '';
    }
    stage?.dispose();
    ov.remove();
    persist();
    render();
  };
  try {
    const { PhoneStage } = await import('./studio/phone3d.js');
    stage = new PhoneStage(ov.querySelector('.lo-stage'));
    stage.setDesign(state.design);
    const W = state.wowResult || {};
    const quick = state.models.length > 0 && !W.firsts?.length && !['S', 'A'].includes(W.grade);
    ov.querySelector('.lo-skip').onclick = () => (stage.reveal?.fired.boom ? finish() : stage.skipReveal());
    stage.playReveal(state.design, {
      quick,
      onBeat(b) {
        if (b === 'drumroll') play('drumroll', quick ? 1.1 : 3);
        else if (b === 'boom') {
          play('boom');
          play('fanfare', 0.12);
          play('applause', 3, 0.3);
          const dm = ov.querySelector('.lo-dm');
          danmaku(state.design, null)
            .sort(() => Math.random() - 0.5)
            .slice(0, 9)
            .forEach((t, i) => {
              const s = document.createElement('span');
              s.className = 'dm';
              s.textContent = t;
              s.style.top = `${6 + ((i * 29) % 60)}%`;
              s.style.animationDelay = `${0.2 + i * 0.3}s`;
              dm.appendChild(s);
            });
        } else if (b === 'shutter') play('shutter');
        else if (b === 'done') setTimeout(finish, 1400);
      },
    });
  } catch (e) {
    console.error(e);
    finish();
  }
}

// ═════════════════════════ 交互 ═════════════════════════

function startGame(s) {
  state = s;
  screen = 'game';
  draft.plan = L.recommendedPlan();
  draft.factoryDone = state.phase !== 'factory';
  render();
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
    flash(`M${state.month}`);
    if (res.event) play('explode', true);
    if (state.phase !== 'dev') {
      if (state.phase === 'factory') {
        draft.factoryDone = false;
        render();
      }
      break;
    }
    if (all) await new Promise((r) => setTimeout(r, 650));
  } while (all && ++guard < 12 && state.phase === 'dev');
  busy = false;
}

function onClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn || busy) return;
  const { act, id } = btn.dataset;
  const i = Number(btn.dataset.i);

  if (act === 'mute') {
    sfx?.setMuted(!sfx.muted);
    $('#g-hud').innerHTML = hud();
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
    render();
    return;
  }
  if (act === 'continue') {
    const s = loadGame();
    if (!s) return toast('没有存档');
    startGame(s);
    return;
  }
  if (act === 'rand-name') {
    draft.companyName = randomCompanyName();
    $('#cname').value = draft.companyName;
    return;
  }
  if (act === 'confirm-create') {
    const name = ($('#cname')?.value || draft.companyName).trim() || randomCompanyName();
    startGame(createNewGame(name));
    persist();
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
      playReveal();
      return;
    case 'to-sales':
      L.runSales(state);
      play('keep');
      break;
    case 'to-next':
      L.enterNext(state);
      break;
    case 'upgrade': {
      const r = L.upgradeDept(state, id);
      toast(r.msg);
      if (r.ok) play('keep');
      break;
    }
    case 'next-gen':
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
  if (t.dataset.act === 'bind-eco') draft.plan.bindEco = t.checked;
}

export function boot() {
  const root = document.getElementById('app');
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  if (lsGet('epdg-reduce-motion') === '1') document.body.classList.add('reduce-motion');
  render();
}

