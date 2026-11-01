import {
  ROLES,
  SLOTS,
  POSITIONING,
  SELL_POINTS,
  PRICE_BANDS,
  SUPPLIERS,
  STOCK_OPTS,
  EVENTS,
  LAUNCH_PREP,
  LAUNCH_BEATS,
  randomCompanyName,
} from './game/data.js';
import {
  createNewGame,
  saveGame,
  loadGame,
  clearSave,
  hasSave,
} from './game/state.js';
import * as L from './game/logic.js';

let state = null;
let screen = 'title'; // title | create | game
let draft = {
  companyName: randomCompanyName(),
  plan: { positioningId: 'mainstream', pointIds: ['fast'], priceId: 'mid', bindEco: false },
  alloc: Object.fromEntries(SLOTS.map((s) => [s.id, 0])),
};

const app = () => document.getElementById('app');

function persist() {
  if (state) saveGame(state);
}

function restart() {
  clearSave();
  state = null;
  screen = 'title';
  draft.companyName = randomCompanyName();
  draft.alloc = Object.fromEntries(SLOTS.map((s) => [s.id, 0]));
  render();
}

function bar(pct, cls = '') {
  const v = Math.max(0, Math.min(100, pct));
  return `<div class="bar ${cls}"><div style="width:${v}%"></div></div>`;
}

function shell(body, { showHud = true } = {}) {
  const hud = showHud && state
    ? `<header class="hud">
        <div class="brand">电子产品发展国</div>
        <div class="stats">
          <span title="现金">💰 ${state.cash}</span>
          <span title="月">📅 M${state.month}</span>
          <span title="世代">📱 Gen${state.generation}</span>
          <span title="信仰">✨ ${state.faith}</span>
          <span title="口碑">📣 ${state.reputation}</span>
        </div>
        <div class="hud-actions">
          <button type="button" class="ghost" data-act="save">存档</button>
          <button type="button" class="ghost danger" data-act="restart">重开</button>
        </div>
      </header>`
    : `<header class="hud title-hud"><div class="brand">电子产品发展国</div></header>`;
  return `${hud}<main class="panel">${body}</main>`;
}

function renderTitle() {
  return shell(
    `<section class="stack center">
      <h1>电子产品发展国</h1>
      <p class="lead">轻松开罗风 · 把手机从企划做到货架</p>
      <p class="muted">本季目标：发出首款，别亏光。配件与硬核供应链留待后日。</p>
      <div class="row">
        <button type="button" class="primary" data-act="new">新开一局</button>
        ${hasSave() ? '<button type="button" data-act="continue">继续存档</button>' : ''}
      </div>
    </section>`,
    { showHud: false },
  );
}

function renderCreate() {
  return shell(
    `<section class="stack">
      <h2>车库创业</h2>
      <p class="tip">起点固定为车库：现金紧、人手少，但重开很快。</p>
      <label>公司名
        <input id="cname" maxlength="16" value="${escapeAttr(draft.companyName)}" />
      </label>
      <div class="row">
        <button type="button" data-act="rand-name">随机名字</button>
        <button type="button" class="primary" data-act="confirm-create">开门营业</button>
      </div>
    </section>`,
    { showHud: false },
  );
}

function renderHire() {
  const hired = L.hiredIds(state);
  const cards = ROLES.map((r) => {
    const owned = hired.has(r.id);
    const star = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
    return `<article class="card ${owned ? 'owned' : ''}">
      <h3>${r.title} <small>${star}</small></h3>
      <p class="quirk">「${r.quirk}」</p>
      <p class="muted">薪资签约费 ${r.cost}</p>
      ${owned
        ? assignControls(r.id)
        : `<button type="button" data-act="hire" data-id="${r.id}" ${state.cash < r.cost ? 'disabled' : ''}>招聘</button>`}
    </article>`;
  }).join('');
  return shell(`<section class="stack">
    <h2>组建团队</h2>
    <p class="tip">${state.tip} 建议至少招 2～3 人。分派到研发槽可加速；公关可挂「发布会」。</p>
    <div class="grid">${cards}</div>
    <div class="row end">
      <button type="button" class="primary" data-act="to-plan" ${state.staff.length < 1 ? 'disabled' : ''}>去企划 →</button>
    </div>
  </section>`);
}

function assignControls(roleId) {
  const s = state.staff.find((x) => x.roleId === roleId);
  const opts = [
    ['idle', '待命'],
    ...SLOTS.map((sl) => [sl.id, sl.name]),
    ['launch', '发布会'],
  ];
  return `<label class="assign">分派
    <select data-act="assign" data-id="${roleId}">
      ${opts.map(([v, n]) => `<option value="${v}" ${s.assigned === v ? 'selected' : ''}>${n}</option>`).join('')}
    </select>
  </label>`;
}

function renderPlan() {
  const p = draft.plan;
  const tri = L.trianglePreview(p.positioningId, p.priceId);
  const ecoDisabled = state.generation === 1;
  return shell(`<section class="stack">
    <h2>产品企划 · 第 ${state.generation} 代手机</h2>
    <p class="muted">品类锁定：手机（配件二期再做）</p>
    <div class="grid two">
      <div>
        <h3>定位</h3>
        ${POSITIONING.map((x) => radio('pos', x.id, x.name, p.positioningId === x.id)).join('')}
      </div>
      <div>
        <h3>售价带</h3>
        ${PRICE_BANDS.map((x) => radio('price', x.id, `${x.name}（¥${x.price}）`, p.priceId === x.id)).join('')}
      </div>
    </div>
    <h3>卖点标签（1～3）</h3>
    <div class="chips">
      ${SELL_POINTS.map((x) => `<button type="button" class="chip ${p.pointIds.includes(x.id) ? 'on' : ''}" data-act="toggle-point" data-id="${x.id}">${x.name}</button>`).join('')}
    </div>
    <label class="eco ${ecoDisabled ? 'disabled' : ''}">
      <input type="checkbox" data-act="bind-eco" ${p.bindEco ? 'checked' : ''} ${ecoDisabled ? 'disabled' : ''} />
      绑定上一代生态 ${ecoDisabled ? '（首代不可用）' : '（信仰↑，自相蚕食略增）'}
    </label>
    <div class="tri">
      <div><span>体验预期</span>${bar(tri.experience, 'good')}</div>
      <div><span>成本压力</span>${bar(tri.costPressure, 'warn')}</div>
      <div><span>预计工期</span><strong>${tri.months} 个月</strong></div>
    </div>
    <div class="row end"><button type="button" class="primary" data-act="confirm-plan">锁定企划 →</button></div>
  </section>`);
}

function radio(name, id, label, checked) {
  return `<label class="radio"><input type="radio" name="${name}" data-act="plan-${name}" data-id="${id}" ${checked ? 'checked' : ''}/> ${label}</label>`;
}

function renderSupplier() {
  return shell(`<section class="stack">
    <h2>选供应商</h2>
    <p class="tip">三档而已，不是 ERP。便宜事故多，贵则安心。</p>
    <div class="grid">
      ${SUPPLIERS.map((s) => `<article class="card">
        <h3>${s.name}</h3>
        <p>${s.desc}</p>
        <p class="muted">成本×${s.costMul} · 事件率约 ${Math.round(s.eventChance * 100)}%</p>
        <button type="button" class="primary" data-act="pick-supplier" data-id="${s.id}">选择</button>
      </article>`).join('')}
    </div>
  </section>`);
}

function renderDev() {
  const cap = L.manpowerCap(state);
  const used = Object.values(draft.alloc).reduce((a, b) => a + b, 0);
  const slots = SLOTS.map((s) => {
    const sl = state.slots[s.id];
    return `<article class="card slot">
      <div class="slot-head"><strong>${s.name}</strong><span>${sl.progress}%</span></div>
      ${bar(sl.progress)}
      <p class="quirk">${sl.comment}</p>
      <label>投入点数
        <input type="number" min="0" max="${cap}" value="${draft.alloc[s.id] || 0}" data-act="alloc" data-id="${s.id}" />
      </label>
    </article>`;
  }).join('');
  return shell(`<section class="stack">
    <h2>研发 · 剩余约 ${state.monthsLeft} 个月</h2>
    <p class="tip">本月人力点：<strong>${used}/${cap}</strong>（基础 5 + 已分派研发的员工数）。先分派人才再加点更赚。</p>
    <details class="staff-mini"><summary>快速分派</summary><div class="grid">${state.staff.map((s) => {
      const r = L.getRole(s.roleId);
      return `<div class="card">${r.title}${assignControls(s.roleId)}</div>`;
    }).join('')}</div></details>
    <div class="grid">${slots}</div>
    <div class="row end">
      <button type="button" class="primary" data-act="advance-month">结束本月 →</button>
    </div>
  </section>`);
}

function renderEvent() {
  const ev = EVENTS.find((e) => e.id === state.pendingEvent);
  return shell(`<section class="stack">
    <p class="tag">${ev.type}事件</p>
    <h2>${ev.title}</h2>
    <p>${ev.body}</p>
    <div class="stack">
      ${ev.choices.map((c, i) => `<button type="button" class="choice" data-act="event-choice" data-i="${i}">${c.label}</button>`).join('')}
    </div>
  </section>`);
}

function renderStock() {
  return shell(`<section class="stack">
    <h2>发布前备货</h2>
    <p class="tip">只分三档。缺货伤口碑，积压压现金。</p>
    <div class="grid">
      ${STOCK_OPTS.map((s) => `<article class="card">
        <h3>${s.name}</h3>
        <p>${s.note}</p>
        <button type="button" class="primary" data-act="pick-stock" data-id="${s.id}">就这样</button>
      </article>`).join('')}
    </div>
  </section>`);
}

function renderLaunchPrep() {
  return shell(`<section class="stack">
    <h2>发布会准备（最多 2 项）</h2>
    <div class="grid">
      ${LAUNCH_PREP.map((p) => {
        const on = state.launchPrepIds.includes(p.id);
        return `<article class="card ${on ? 'owned' : ''}">
          <h3>${p.label}</h3>
          <p>${p.desc}</p>
          <p class="muted">费用 ${p.cost}</p>
          <button type="button" data-act="toggle-prep" data-id="${p.id}">${on ? '取消' : '选择'}</button>
        </article>`;
      }).join('')}
    </div>
    <div class="row end"><button type="button" class="primary" data-act="start-launch">召开发布会 →</button></div>
  </section>`);
}

function renderLaunch() {
  const beat = LAUNCH_BEATS[state.launchBeatIndex];
  return shell(`<section class="stack">
    <p class="tag">发布会 · 节点 ${state.launchBeatIndex + 1}/${LAUNCH_BEATS.length}</p>
    <h2>${beat.prompt}</h2>
    <div class="stack">
      ${beat.choices.map((c, i) => `<button type="button" class="choice" data-act="launch-choice" data-i="${i}">${c.label}</button>`).join('')}
    </div>
  </section>`);
}

function renderScore() {
  return shell(`<section class="stack center">
    <h2>媒体评分</h2>
    <div class="big-score">${state.mediaScore}</div>
    <p>用户期待 <strong>${state.userScore}</strong></p>
    <p class="headline">「${state.headline}」</p>
    <button type="button" class="primary" data-act="to-sales">看首月销量 →</button>
  </section>`);
}

function renderSales() {
  const r = state.salesResult;
  return shell(`<section class="stack">
    <h2>首月销售</h2>
    <div class="big-score">${r.sold}<small> 台</small></div>
    <p>备货 ${r.stocked} · 定价 ¥${r.price}</p>
    <p>收入 ${r.revenue} · 成本 ${r.cogs} · 积压费 ${r.inventoryFee} · <strong>盈亏 ${r.profit}</strong></p>
    <p class="tip">${r.stockNote}</p>
    <p>信仰 ${state.faith} · 口碑 ${state.reputation}</p>
    <div class="row">
      <button type="button" class="primary" data-act="next-gen">规划下一代 →</button>
      <button type="button" data-act="restart">开心重开</button>
    </div>
  </section>`);
}

function renderMonthReport() {
  return shell(`<section class="stack">
    <h2>月报 · 第 ${state.month - 1} 月结束</h2>
    <p>现金 <strong>${state.cash}</strong>（本月人力等开销已结算）</p>
    <p>在研均进度 <strong>${Math.round(L.avgSlotProgress(state))}%</strong> · 剩余工期约 ${state.monthsLeft} 月</p>
    <p class="muted">近况：${state.eventLog.slice(-1)[0] || '风平浪静'}</p>
    <button type="button" class="primary" data-act="from-report">下个月继续 →</button>
  </section>`);
}

function renderBust() {
  return shell(`<section class="stack center">
    <h2>经营失败</h2>
    <p>${state.bustReason}</p>
    <p class="muted">轻松开罗风：重来只要几分钟。</p>
    <button type="button" class="primary" data-act="restart">再开一局</button>
  </section>`);
}

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;');
}

export function render() {
  const root = app();
  let html;
  if (screen === 'title' || (!state && screen !== 'create')) html = renderTitle();
  else if (screen === 'create') html = renderCreate();
  else {
    switch (state.phase) {
      case 'hire': html = renderHire(); break;
      case 'plan': html = renderPlan(); break;
      case 'supplier': html = renderSupplier(); break;
      case 'dev': html = renderDev(); break;
      case 'event': html = renderEvent(); break;
      case 'stock': html = renderStock(); break;
      case 'launchPrep': html = renderLaunchPrep(); break;
      case 'launch': html = renderLaunch(); break;
      case 'score': html = renderScore(); break;
      case 'sales': html = renderSales(); break;
      case 'monthReport': html = renderMonthReport(); break;
      case 'bust': html = renderBust(); break;
      default: html = renderTitle();
    }
  }
  root.innerHTML = html;
}

export function bind() {
  app().addEventListener('click', onClick);
  app().addEventListener('change', onChange);
}

function toast(msg) {
  if (!msg) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800);
}

function onClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;
  const id = btn.dataset.id;
  const i = Number(btn.dataset.i);

  if (act === 'new') {
    draft.companyName = randomCompanyName();
    state = null;
    screen = 'create';
    render();
    return;
  }
  if (act === 'continue') {
    state = loadGame();
    if (!state) { toast('没有存档'); return; }
    screen = 'game';
    render();
    return;
  }
  if (act === 'restart') {
    restart();
    return;
  }
  if (act === 'save') {
    persist();
    toast('已存档到浏览器本地');
    return;
  }
  if (act === 'rand-name') {
    draft.companyName = randomCompanyName();
    const input = document.getElementById('cname');
    if (input) input.value = draft.companyName;
    return;
  }
  if (act === 'confirm-create') {
    const input = document.getElementById('cname');
    const name = (input?.value || draft.companyName).trim() || randomCompanyName();
    state = createNewGame(name);
    screen = 'game';
    persist();
    render();
    return;
  }
  if (screen !== 'game' || !state) return;

  if (act === 'hire') {
    const res = L.hire(state, id);
    toast(res.msg);
    persist();
    render();
    return;
  }
  if (act === 'to-plan') {
    state.phase = 'plan';
    draft.plan = { positioningId: 'mainstream', pointIds: ['fast'], priceId: 'mid', bindEco: false };
    persist();
    render();
    return;
  }
  if (act === 'toggle-point') {
    const arr = draft.plan.pointIds;
    const idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1);
    else if (arr.length < 3) arr.push(id);
    render();
    return;
  }
  if (act === 'confirm-plan') {
    const res = L.finishPlan(state, draft.plan);
    if (!res.ok) toast(res.msg);
    persist();
    render();
    return;
  }
  if (act === 'pick-supplier') {
    L.pickSupplier(state, id);
    draft.alloc = Object.fromEntries(SLOTS.map((s) => [s.id, 0]));
    persist();
    render();
    return;
  }
  if (act === 'advance-month') {
    const res = L.advanceMonth(state, { ...draft.alloc });
    if (!res.ok) toast(res.msg);
    draft.alloc = Object.fromEntries(SLOTS.map((s) => [s.id, 0]));
    persist();
    render();
    return;
  }
  if (act === 'event-choice') {
    L.resolveEvent(state, i);
    persist();
    render();
    return;
  }
  if (act === 'from-report') {
    L.continueFromReport(state);
    persist();
    render();
    return;
  }
  if (act === 'pick-stock') {
    L.pickStock(state, id);
    persist();
    render();
    return;
  }
  if (act === 'toggle-prep') {
    const res = L.togglePrep(state, id);
    if (res && !res.ok) toast(res.msg);
    persist();
    render();
    return;
  }
  if (act === 'start-launch') {
    L.startLaunch(state);
    persist();
    render();
    return;
  }
  if (act === 'launch-choice') {
    L.pickLaunchBeat(state, i);
    persist();
    render();
    return;
  }
  if (act === 'to-sales') {
    L.runSales(state);
    persist();
    render();
    return;
  }
  if (act === 'next-gen') {
    L.goNextGen(state);
    draft.plan = {
      positioningId: 'mainstream',
      pointIds: ['eco'],
      priceId: 'mid',
      bindEco: true,
    };
    persist();
    render();
  }
}

function onChange(e) {
  const t = e.target;
  const act = t.dataset.act;
  if (!act || !state) return;
  if (act === 'assign') {
    L.assignStaff(state, t.dataset.id, t.value);
    persist();
    render();
  }
  if (act === 'alloc') {
    draft.alloc[t.dataset.id] = Math.max(0, Number(t.value) || 0);
  }
  if (act === 'plan-pos') {
    draft.plan.positioningId = t.dataset.id;
    render();
  }
  if (act === 'plan-price') {
    draft.plan.priceId = t.dataset.id;
    render();
  }
  if (act === 'bind-eco') {
    draft.plan.bindEco = t.checked;
  }
}

// Fix create flow: title "new" sets a pseudo state
export function boot() {
  bind();
  render();
}
