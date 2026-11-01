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
import { mountOffice, syncOffice } from './office.js';

let state = null;
let screen = 'title';
let draft = {
  companyName: randomCompanyName(),
  plan: { positioningId: 'mainstream', pointIds: ['fast'], priceId: 'mid', bindEco: false },
  alloc: Object.fromEntries(SLOTS.map((s) => [s.id, 0])),
};
let flashText = '';
let flashTimer = 0;
let bound = false;

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

function toast(msg) {
  if (!msg) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

function flash(msg) {
  flashText = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    flashText = '';
    const f = document.querySelector('.month-flash');
    if (f) f.remove();
  }, 900);
}

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;');
}

function faceDataUrl(roleId) {
  const c = document.createElement('canvas');
  c.width = 40;
  c.height = 40;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const colors = {
    id: ['#f1c40f', '#e17055'],
    pm: ['#2d3436', '#0984e3'],
    cam: ['#6c5ce7', '#fd79a8'],
    osdev: ['#00b894', '#55efc4'],
    supply: ['#636e72', '#fdcb6e'],
    pr: ['#d63031', '#ffffff'],
  }[roleId] || ['#333', '#888'];
  g.fillStyle = '#f5cba7';
  g.fillRect(8, 12, 24, 22);
  g.fillStyle = colors[0];
  g.fillRect(6, 6, 28, 10);
  g.fillRect(6, 12, 6, 10);
  g.fillStyle = colors[1];
  g.fillRect(8, 30, 24, 8);
  g.fillStyle = '#2d3436';
  g.fillRect(14, 18, 4, 4);
  g.fillRect(24, 18, 4, 4);
  g.fillRect(16, 26, 10, 2);
  return c.toDataURL();
}

function gauge(label, pct, cls = '') {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return `<div class="gauge">
    <div class="gauge-label"><span>${label}</span><span>${v}</span></div>
    <div class="gauge-track"><div class="gauge-fill ${cls}" style="width:${v}%"></div></div>
  </div>`;
}

function phaseLabel(phase) {
  return ({
    hire: '招聘中',
    plan: '企划会议',
    supplier: '供应链',
    dev: '开发中',
    event: '突发！',
    stock: '备货',
    launchPrep: '发布会准备',
    launch: '发布会！',
    score: '媒体评价',
    sales: '首月销售',
    monthReport: '月报',
    bust: '倒闭…',
  })[phase] || phase;
}

function topbar() {
  if (!state) return '';
  return `<div class="topbar">
    <div class="brand-chip">${state.companyName}<small>电子产品发展国 · Gen${state.generation}</small></div>
    <div class="stat cash"><span class="lbl">资金</span><span class="val">${state.cash}</span></div>
    <div class="stat"><span class="lbl">月份</span><span class="val">M${state.month}</span></div>
    <div class="stat"><span class="lbl">工期残</span><span class="val">${state.monthsLeft ?? '-'}</span></div>
    <div class="stat faith"><span class="lbl">信仰</span><span class="val">${state.faith}</span></div>
    <div class="stat"><span class="lbl">口碑</span><span class="val">${state.reputation}</span></div>
    <div class="hud-btns">
      <button type="button" data-act="save">存档</button>
      <button type="button" class="danger" data-act="restart">重开</button>
    </div>
  </div>`;
}

function officeBlock() {
  const caption =
    state?.product?.name
      ? `在研：${state.product.name} · 均进度 ${Math.round(L.avgSlotProgress(state) || 0)}%`
      : '办公室日常 · 小人会走动 / 坐岗敲键盘';
  return `<div class="office-panel" id="office-host">
    <div class="phase-ribbon">${phaseLabel(state?.phase)}</div>
    <div id="office-mount"></div>
    <div class="office-caption">${caption}</div>
    ${flashText ? `<div class="month-flash"><span>${flashText}</span></div>` : ''}
  </div>`;
}

function shellGame(cmdHtml, { modal = '' } = {}) {
  return `${topbar()}
  <div class="stage">
    ${officeBlock()}
    <aside class="cmd kbox">${cmdHtml}</aside>
  </div>
  ${modal}`;
}

function renderTitle() {
  return `<div class="kbox title-screen">
    <canvas class="title-art" id="title-art" width="420" height="160"></canvas>
    <h1>电子产品发展国</h1>
    <p class="lead" style="margin:0;font-weight:700">开罗式电子产品研发模拟 · 像素办公室原型</p>
    <p class="muted">企划 → 研发 → 供应链事件 → 发布会揭晓 → 首月销量</p>
    <p class="sfx-slot">♪ 音效：静音占位（动画优先）</p>
    <div class="row" style="justify-content:center">
      <button type="button" class="primary blink" data-act="new">▶ 新开一局</button>
      ${hasSave() ? '<button type="button" data-act="continue">继续存档</button>' : ''}
    </div>
  </div>`;
}

function paintTitleArt() {
  const c = document.getElementById('title-art');
  if (!c) return;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#6b8cae';
  g.fillRect(0, 0, 420, 160);
  for (let y = 70; y < 160; y += 16) {
    for (let x = 0; x < 420; x += 16) {
      g.fillStyle = ((x + y) / 16) % 2 ? '#c4b59a' : '#b8a88a';
      g.fillRect(x, y, 16, 16);
    }
  }
  // mini desks
  [[80, 100], [160, 100], [240, 100], [320, 100]].forEach(([x, y], i) => {
    g.fillStyle = '#8b5a2b';
    g.fillRect(x, y, 40, 14);
    g.fillStyle = '#74b9ff';
    g.fillRect(x + 10, y - 16, 20, 14);
    g.fillStyle = '#f5cba7';
    g.fillRect(x + 14, y - 2, 12, 12);
    g.fillStyle = ['#e17055', '#0984e3', '#fd79a8', '#55efc4'][i];
    g.fillRect(x + 14, y + 6, 12, 8);
  });
  g.fillStyle = '#fff6df';
  g.fillRect(140, 18, 140, 28);
  g.strokeStyle = '#3b2a1e';
  g.lineWidth = 3;
  g.strokeRect(140, 18, 140, 28);
  g.fillStyle = '#3b2a1e';
  g.font = 'bold 14px sans-serif';
  g.fillText('GARAGE → LAB', 158, 38);
}

function renderCreate() {
  return `<div class="kbox" style="max-width:520px;margin:40px auto;padding:20px">
    <h2 class="kbox-title">车库开门 <span class="badge">起点</span></h2>
    <p class="tip">现金紧、人手少，但重开很快。默认品类：手机。</p>
    <label style="display:block;margin:12px 0">公司名
      <input id="cname" maxlength="16" value="${escapeAttr(draft.companyName)}" style="width:100%;margin-top:6px" />
    </label>
    <div class="row end">
      <button type="button" data-act="rand-name">随机名</button>
      <button type="button" class="primary" data-act="confirm-create">进入办公室 ▶</button>
    </div>
  </div>`;
}

function renderHire() {
  const hired = L.hiredIds(state);
  const cards = ROLES.map((r) => {
    const owned = hired.has(r.id);
    const star = '★'.repeat(r.stars) + '☆'.repeat(3 - r.stars);
    return `<article class="staff-card ${owned ? 'hired' : ''}">
      <img class="face" alt="" src="${faceDataUrl(r.id)}" width="40" height="40" />
      <strong>${r.title}</strong>
      <div class="stars">${star}</div>
      <div class="quirk">「${r.quirk}」</div>
      <div class="muted">签约 ${r.cost}</div>
      ${owned ? assignSelect(r.id) : `<button type="button" data-act="hire" data-id="${r.id}" ${state.cash < r.cost ? 'disabled' : ''}>招聘</button>`}
    </article>`;
  }).join('');
  return shellGame(`
    <h2 class="kbox-title">职员一览 <span class="badge">人才</span></h2>
    <p class="lead">${state.tip} 把人分到研发槽，办公室里会坐到对应工位敲键盘。</p>
    <div class="staff-grid">${cards}</div>
    <div class="row end">
      <button type="button" class="primary" data-act="to-plan" ${state.staff.length < 1 ? 'disabled' : ''}>召开企划会 ▶</button>
    </div>
  `);
}

function assignSelect(roleId) {
  const s = state.staff.find((x) => x.roleId === roleId);
  const opts = [['idle', '待命'], ...SLOTS.map((sl) => [sl.id, sl.name]), ['launch', '发布会']];
  return `<select data-act="assign" data-id="${roleId}">
    ${opts.map(([v, n]) => `<option value="${v}" ${s.assigned === v ? 'selected' : ''}>${n}</option>`).join('')}
  </select>`;
}

function renderPlan() {
  const p = draft.plan;
  const tri = L.trianglePreview(p.positioningId, p.priceId);
  const ecoDisabled = state.generation === 1;
  return shellGame(`
    <h2 class="kbox-title">产品企划 <span class="badge">Gen${state.generation}</span></h2>
    <p class="tip">像发展国选题那样点选定位与卖点——三角权衡立刻看得见。</p>
    <div class="grid2">
      <div><strong>定位</strong>${POSITIONING.map((x) => `<label class="radio"><input type="radio" name="pos" data-act="plan-pos" data-id="${x.id}" ${p.positioningId === x.id ? 'checked' : ''}/> ${x.name}</label>`).join('')}</div>
      <div><strong>售价带</strong>${PRICE_BANDS.map((x) => `<label class="radio"><input type="radio" name="price" data-act="plan-price" data-id="${x.id}" ${p.priceId === x.id ? 'checked' : ''}/> ${x.name} ¥${x.price}</label>`).join('')}</div>
    </div>
    <strong>卖点（1～3）</strong>
    <div class="chips" style="margin:8px 0">${SELL_POINTS.map((x) => `<button type="button" class="chip ${p.pointIds.includes(x.id) ? 'on' : ''}" data-act="toggle-point" data-id="${x.id}">${x.name}</button>`).join('')}</div>
    <label class="eco"><input type="checkbox" data-act="bind-eco" ${p.bindEco ? 'checked' : ''} ${ecoDisabled ? 'disabled' : ''}/> 绑定上代生态 ${ecoDisabled ? '（首代锁定）' : ''}</label>
    ${gauge('体验预期', tri.experience)}
    ${gauge('成本压力', tri.costPressure, 'warn')}
    <p><strong>预计工期</strong> ${tri.months} 个月</p>
    <div class="row end"><button type="button" class="primary" data-act="confirm-plan">锁定企划 ▶</button></div>
  `);
}

function renderSupplier() {
  return shellGame(`
    <h2 class="kbox-title">供应商 <span class="badge">三档</span></h2>
    <p class="lead">开罗味选项：点一下定生死，不做 ERP 表格。</p>
    ${SUPPLIERS.map((s) => `<button type="button" class="choice" data-act="pick-supplier" data-id="${s.id}">
      <strong>${s.name}</strong> — ${s.desc}<br/><span class="muted">成本×${s.costMul} · 事件率 ${Math.round(s.eventChance * 100)}%</span>
    </button>`).join('')}
  `);
}

function renderDev() {
  const cap = L.manpowerCap(state);
  const used = Object.values(draft.alloc).reduce((a, b) => a + b, 0);
  const slots = SLOTS.map((s) => {
    const sl = state.slots[s.id];
    const cls = sl.progress > 70 ? '' : sl.progress > 40 ? 'warn' : 'hot';
    return `<div class="slot-row">
      <div class="top"><span>${s.name}</span><span>${sl.progress}%</span></div>
      <div class="gauge-track"><div class="gauge-fill ${cls}" style="width:${sl.progress}%"></div></div>
      <div class="quirk">${sl.comment}</div>
      <label>投入 <input type="number" min="0" max="${cap}" value="${draft.alloc[s.id] || 0}" data-act="alloc" data-id="${s.id}" style="width:64px" /></label>
    </div>`;
  }).join('');
  return shellGame(`
    <h2 class="kbox-title">开发部屋 <span class="badge">人力 ${used}/${cap}</span></h2>
    <p class="tip">把点数丢进模块槽，点「推进半个月」。左侧办公室会跟着忙起来。</p>
    <details style="margin-bottom:8px"><summary>快速分派职员</summary>
      <div class="staff-grid" style="margin-top:8px">${state.staff.map((s) => {
        const r = L.getRole(s.roleId);
        return `<div class="staff-card"><img class="face" src="${faceDataUrl(s.roleId)}" alt=""/><strong>${r.title}</strong>${assignSelect(s.roleId)}</div>`;
      }).join('')}</div>
    </details>
    ${slots}
    ${gauge('综合完成度', L.avgSlotProgress(state))}
    <div class="row end"><button type="button" class="primary" data-act="advance-month">⏱ 推进半个月 ▶</button></div>
  `);
}

function modalWrap(inner) {
  return `<div class="modal-backdrop"><div class="modal kbox">${inner}</div></div>`;
}

function renderEvent() {
  const ev = EVENTS.find((e) => e.id === state.pendingEvent);
  const modal = modalWrap(`
    <h2 class="kbox-title">⚠ ${ev.type} <span class="badge">事件</span></h2>
    <h3 style="margin:0 0 8px">${ev.title}</h3>
    <p>${ev.body}</p>
    ${ev.choices.map((c, i) => `<button type="button" class="choice" data-act="event-choice" data-i="${i}">${c.label}</button>`).join('')}
  `);
  return shellGame(`
    <h2 class="kbox-title">开发中断</h2>
    <p class="lead">办公室一阵骚动……请处理弹窗事件。</p>
    ${gauge('综合完成度', L.avgSlotProgress(state))}
  `, { modal });
}

function renderStock() {
  return shellGame(`
    <h2 class="kbox-title">量产备货 <span class="badge">发布前</span></h2>
    <p class="tip">保守 / 正常 / 激进——缺货伤口碑，积压压现金。</p>
    ${STOCK_OPTS.map((s) => `<button type="button" class="choice" data-act="pick-stock" data-id="${s.id}"><strong>${s.name}</strong> — ${s.note}</button>`).join('')}
  `);
}

function renderLaunchPrep() {
  return shellGame(`
    <h2 class="kbox-title">发布会彩排 <span class="badge">最多2项</span></h2>
    ${LAUNCH_PREP.map((p) => {
      const on = state.launchPrepIds.includes(p.id);
      return `<button type="button" class="choice ${on ? 'on' : ''}" data-act="toggle-prep" data-id="${p.id}" style="${on ? 'background:#85c1e9' : ''}">
        <strong>${p.label}</strong> — ${p.desc}（费 ${p.cost}） ${on ? '✓' : ''}
      </button>`;
    }).join('')}
    <div class="row end"><button type="button" class="primary" data-act="start-launch">幕布拉开 ▶</button></div>
  `);
}

function renderLaunch() {
  const beat = LAUNCH_BEATS[state.launchBeatIndex];
  const modal = modalWrap(`
    <h2 class="kbox-title">发布会 LIVE <span class="badge">${state.launchBeatIndex + 1}/${LAUNCH_BEATS.length}</span></h2>
    <p class="sfx-slot">♪ 揭晓音效占位</p>
    <h3>${beat.prompt}</h3>
    ${beat.choices.map((c, i) => `<button type="button" class="choice" data-act="launch-choice" data-i="${i}">${c.label}</button>`).join('')}
  `);
  return shellGame(`<h2 class="kbox-title">舞台灯光中…</h2><p class="lead">聚光灯打在舞台上，选择决定媒体第一印象。</p>`, { modal });
}

function renderScore() {
  const modal = modalWrap(`
    <h2 class="kbox-title">媒体评分揭晓</h2>
    <p class="sfx-slot">♪ 咚咚咚…（静音占位）</p>
    <div class="reveal-score" id="score-anim">${state.mediaScore}</div>
    <p style="text-align:center">用户期待 <strong>${state.userScore}</strong></p>
    <div class="headline">${state.headline}</div>
    <div class="row end"><button type="button" class="primary" data-act="to-sales">看首月销量 ▶</button></div>
  `);
  return shellGame(`<h2 class="kbox-title">等待打分…</h2><p class="lead">编辑部正在吵架。</p>`, { modal });
}

function renderSales() {
  const r = state.salesResult;
  return shellGame(`
    <h2 class="kbox-title">首月战报 <span class="badge">销量</span></h2>
    <div class="reveal-score" style="font-size:3rem">${r.sold}<span style="font-size:1rem"> 台</span></div>
    ${gauge('备货消化', (r.sold / Math.max(1, r.stocked)) * 100)}
    <p>收入 ${r.revenue} · 成本 ${r.cogs} · 积压 ${r.inventoryFee} · <strong>盈亏 ${r.profit}</strong></p>
    <p class="tip">${r.stockNote}</p>
    <p>信仰 ${state.faith} · 口碑 ${state.reputation}</p>
    <div class="row end">
      <button type="button" data-act="restart">重开</button>
      <button type="button" class="primary" data-act="next-gen">规划下一代 ▶</button>
    </div>
  `);
}

function renderMonthReport() {
  const modal = modalWrap(`
    <h2 class="kbox-title">月报 <span class="badge">M${state.month - 1}</span></h2>
    <p>资金 <strong>${state.cash}</strong></p>
    ${gauge('在研进度', L.avgSlotProgress(state))}
    <p class="muted">近况：${state.eventLog.slice(-1)[0] || '风平浪静'}</p>
    <div class="row end"><button type="button" class="primary" data-act="from-report">继续开发 ▶</button></div>
  `);
  return shellGame(`<h2 class="kbox-title">月末结算中</h2>`, { modal });
}

function renderBust() {
  return shellGame(`
    <h2 class="kbox-title">经营失败</h2>
    <p class="tip">${state.bustReason}</p>
    <p class="muted">开罗传统：再开一局只要几分钟。</p>
    <div class="row end"><button type="button" class="primary" data-act="restart">再开一局</button></div>
  `);
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
  afterRender();
}

function afterRender() {
  if (screen === 'title') paintTitleArt();
  const mount = document.getElementById('office-mount');
  if (mount && state) {
    mountOffice(mount);
    syncOffice(state);
  }
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
  if (act === 'restart') { restart(); return; }
  if (act === 'save') { persist(); toast('已存档'); return; }
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
    toast(L.hire(state, id).msg);
    persist(); render(); return;
  }
  if (act === 'to-plan') {
    state.phase = 'plan';
    draft.plan = { positioningId: 'mainstream', pointIds: ['fast'], priceId: 'mid', bindEco: false };
    persist(); render(); return;
  }
  if (act === 'toggle-point') {
    const arr = draft.plan.pointIds;
    const idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1);
    else if (arr.length < 3) arr.push(id);
    render(); return;
  }
  if (act === 'confirm-plan') {
    const res = L.finishPlan(state, draft.plan);
    if (!res.ok) toast(res.msg);
    else flash('企划决定！');
    persist(); render(); return;
  }
  if (act === 'pick-supplier') {
    L.pickSupplier(state, id);
    draft.alloc = Object.fromEntries(SLOTS.map((s) => [s.id, 0]));
    flash('供应商敲定');
    persist(); render(); return;
  }
  if (act === 'advance-month') {
    const res = L.advanceMonth(state, { ...draft.alloc });
    if (!res.ok) toast(res.msg);
    else flash('半个月过去了…');
    draft.alloc = Object.fromEntries(SLOTS.map((s) => [s.id, 0]));
    persist(); render(); return;
  }
  if (act === 'event-choice') {
    L.resolveEvent(state, i);
    persist(); render(); return;
  }
  if (act === 'from-report') {
    L.continueFromReport(state);
    persist(); render(); return;
  }
  if (act === 'pick-stock') {
    L.pickStock(state, id);
    persist(); render(); return;
  }
  if (act === 'toggle-prep') {
    const res = L.togglePrep(state, id);
    if (res && !res.ok) toast(res.msg);
    persist(); render(); return;
  }
  if (act === 'start-launch') {
    L.startLaunch(state);
    flash('发布会开始！');
    persist(); render(); return;
  }
  if (act === 'launch-choice') {
    L.pickLaunchBeat(state, i);
    persist(); render(); return;
  }
  if (act === 'to-sales') {
    L.runSales(state);
    persist(); render(); return;
  }
  if (act === 'next-gen') {
    L.goNextGen(state);
    draft.plan = { positioningId: 'mainstream', pointIds: ['eco'], priceId: 'mid', bindEco: true };
    flash(`第 ${state.generation} 代企划`);
    persist(); render();
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

export function boot() {
  if (!bound) {
    app().addEventListener('click', onClick);
    app().addEventListener('change', onChange);
    bound = true;
  }
  render();
}
