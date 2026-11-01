import {
  ROLES,
  SLOTS,
  POSITIONING,
  SELL_POINTS,
  PRICE_BANDS,
  SUPPLIERS,
  STOCK_OPTS,
  EVENTS,
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
import { lsGet, lsSet } from './game/storage.js';
import { mountOffice, syncOffice } from './office.js';

let state = null;
let screen = 'title';
let draft = {
  companyName: randomCompanyName(),
  plan: L.recommendedPlan(1),
  alloc: null,
  supplierId: 'balanced',
  stockId: 'normal',
  reduceMotion: lsGet('epdg-reduce-motion') === '1',
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
  draft.plan = L.recommendedPlan(1);
  draft.alloc = null;
  render();
}

function toast(msg) {
  if (!msg) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1500);
}

function flash(msg) {
  if (draft.reduceMotion) return;
  flashText = msg;
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    flashText = '';
    document.querySelector('.month-flash')?.remove();
  }, 650);
  // re-show flash without full rerender if possible
  const host = document.getElementById('office-host');
  if (host && !host.querySelector('.month-flash')) {
    const d = document.createElement('div');
    d.className = 'month-flash';
    d.innerHTML = `<span>${msg}</span>`;
    host.appendChild(d);
  }
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
    hire: '组队',
    plan: '企划',
    logistics: '供应链',
    dev: '开发中',
    event: '突发！',
    launch: '发布会',
    score: '媒体分',
    sales: '销量',
    bust: '倒闭',
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
      <button type="button" data-act="toggle-motion">${draft.reduceMotion ? '开动画' : '跳过动画'}</button>
      <button type="button" class="danger" data-act="restart">重开</button>
    </div>
  </div>`;
}

function officeBlock() {
  const caption = state?.product?.name
    ? `在研：${state.product.name} · 均进度 ${Math.round(L.avgSlotProgress(state) || 0)}%`
    : '办公室 · 小人走动 / 敲键盘';
  return `<div class="office-panel" id="office-host">
    <div class="phase-ribbon">${phaseLabel(state?.phase)}</div>
    <div id="office-mount"></div>
    <div class="office-caption">${caption}</div>
    ${flashText ? `<div class="month-flash"><span>${flashText}</span></div>` : ''}
  </div>`;
}

function shellGame(cmdHtml, { modal = '' } = {}) {
  return `${topbar()}<div class="stage">${officeBlock()}<aside class="cmd kbox">${cmdHtml}</aside></div>${modal}`;
}

function modalWrap(inner) {
  return `<div class="modal-backdrop"><div class="modal kbox">${inner}</div></div>`;
}

function renderTitle() {
  const saved = hasSave();
  return `<div class="kbox title-screen">
    <canvas class="title-art" id="title-art" width="420" height="160"></canvas>
    <h1>电子产品发展国</h1>
    <p style="margin:0;font-weight:800">开罗味像素办公室 · 少点击也能通关</p>
    <p class="muted">推荐路线：下一步 → 下一步；策略藏在少数关键抉择里</p>
    <p class="sfx-slot">♪ 音效静音占位</p>
    <div class="row" style="justify-content:center;flex-direction:column;align-items:center;gap:10px">
      ${saved ? '<button type="button" class="primary blink" data-act="continue" style="font-size:1.15rem;padding:14px 28px">▶ 继续游戏（自动存档）</button>' : ''}
      <button type="button" class="${saved ? '' : 'primary blink'}" data-act="new">${saved ? '新开一局' : '▶ 新开一局'}</button>
      <a class="studio-link" href="${import.meta.env.VITE_STUDIO_HREF || './studio.html'}">🎨 外观台 Demo（3D 配机型）</a>
    </div>
    <label class="eco" style="margin-top:8px"><input type="checkbox" data-act="toggle-motion-box" ${draft.reduceMotion ? 'checked' : ''}/> 减少动画</label>
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
}

function renderCreate() {
  return `<div class="kbox" style="max-width:520px;margin:40px auto;padding:20px">
    <h2 class="kbox-title">车库开门</h2>
    <p class="tip">起个名就能开干。后面全程有「采用推荐」。</p>
    <label style="display:block;margin:12px 0">公司名
      <input id="cname" maxlength="16" value="${escapeAttr(draft.companyName)}" style="width:100%;margin-top:6px" />
    </label>
    <div class="row end">
      <button type="button" data-act="rand-name">随机</button>
      <button type="button" class="primary" data-act="confirm-create">开门并组队 ▶</button>
    </div>
  </div>`;
}

function renderHire() {
  const hired = [...L.hiredIds(state)];
  return shellGame(`
    <h2 class="kbox-title">组队 <span class="badge">可一键</span></h2>
    <p class="tip">推荐班底：硬件 PM + 工业设计 + 公关（已自动分派工位）。</p>
    <button type="button" class="primary choice" data-act="quick-team" style="font-size:1.05rem">✓ 采用推荐班底，下一步</button>
    ${hired.length ? `<p class="muted">已入职：${hired.map((id) => L.getRole(id).title).join('、')}</p>
      <button type="button" class="primary" data-act="to-plan">下一步：企划 ▶</button>` : ''}
    <details style="margin-top:12px">
      <summary>高级：逐个招聘 / 改分派</summary>
      <div class="staff-grid" style="margin-top:8px">
        ${ROLES.map((r) => {
          const owned = L.hiredIds(state).has(r.id);
          return `<article class="staff-card ${owned ? 'hired' : ''}">
            <img class="face" src="${faceDataUrl(r.id)}" alt="" width="40" height="40"/>
            <strong>${r.title}</strong>
            <div class="stars">${'★'.repeat(r.stars)}</div>
            <div class="quirk">${r.quirk}</div>
            ${owned
              ? `<select data-act="assign" data-id="${r.id}">${[['idle','待命'],...SLOTS.map(s=>[s.id,s.name]),['launch','发布会']].map(([v,n])=>{
                  const cur=state.staff.find(x=>x.roleId===r.id)?.assigned;
                  return `<option value="${v}" ${cur===v?'selected':''}>${n}</option>`;
                }).join('')}</select>`
              : `<button type="button" data-act="hire" data-id="${r.id}">招（${r.cost}）</button>`}
          </article>`;
        }).join('')}
      </div>
    </details>
  `);
}

function renderPlan() {
  const p = draft.plan;
  const tri = L.trianglePreview(p.positioningId, p.priceId);
  return shellGame(`
    <h2 class="kbox-title">企划 <span class="badge">Gen${state.generation}</span></h2>
    <p class="tip">推荐：主流定位 · 性能+轻薄 · 中端价。</p>
    <button type="button" class="primary choice" data-act="quick-plan" style="font-size:1.05rem">✓ 采用推荐企划，下一步</button>
    ${gauge('体验预期', tri.experience)}
    ${gauge('成本压力', tri.costPressure, 'warn')}
    <details style="margin-top:10px">
      <summary>高级：自定义定位 / 卖点 / 售价</summary>
      <div class="grid2" style="margin-top:8px">
        <div>${POSITIONING.map((x) => `<label class="radio"><input type="radio" name="pos" data-act="plan-pos" data-id="${x.id}" ${p.positioningId===x.id?'checked':''}/> ${x.name}</label>`).join('')}</div>
        <div>${PRICE_BANDS.map((x) => `<label class="radio"><input type="radio" name="price" data-act="plan-price" data-id="${x.id}" ${p.priceId===x.id?'checked':''}/> ${x.name}</label>`).join('')}</div>
      </div>
      <div class="chips" style="margin:8px 0">${SELL_POINTS.map((x)=>`<button type="button" class="chip ${p.pointIds.includes(x.id)?'on':''}" data-act="toggle-point" data-id="${x.id}">${x.name}</button>`).join('')}</div>
      <label class="eco"><input type="checkbox" data-act="bind-eco" ${p.bindEco?'checked':''} ${state.generation===1?'disabled':''}/> 绑上代生态</label>
      <button type="button" class="primary" data-act="confirm-plan">用当前自定义锁定</button>
    </details>
  `);
}

function renderLogistics() {
  return shellGame(`
    <h2 class="kbox-title">供应链 + 备货 <span class="badge">一屏</span></h2>
    <p class="tip">推荐：均衡供应商 + 正常备货。这是少数关键策略点之一。</p>
    <button type="button" class="primary choice" data-act="quick-logistics" style="font-size:1.05rem">✓ 采用推荐组合，开始研发</button>
    <details style="margin-top:12px">
      <summary>高级：自选供应商 / 备货</summary>
      <p style="margin:8px 0 4px"><strong>供应商</strong></p>
      ${SUPPLIERS.map((s) => `<label class="radio"><input type="radio" name="sup" data-act="draft-sup" data-id="${s.id}" ${draft.supplierId===s.id?'checked':''}/> ${s.name}（${s.desc}）</label>`).join('')}
      <p style="margin:8px 0 4px"><strong>备货</strong></p>
      ${STOCK_OPTS.map((s) => `<label class="radio"><input type="radio" name="stk" data-act="draft-stk" data-id="${s.id}" ${draft.stockId===s.id?'checked':''}/> ${s.name} — ${s.note}</label>`).join('')}
      <button type="button" class="primary" data-act="confirm-logistics" style="margin-top:8px">锁定并研发</button>
    </details>
  `);
}

function ensureAlloc() {
  if (!draft.alloc) draft.alloc = L.balancedAllocation(state);
  return draft.alloc;
}

function renderDev() {
  const alloc = ensureAlloc();
  const cap = L.manpowerCap(state);
  const used = Object.values(alloc).reduce((a, b) => a + b, 0);
  return shellGame(`
    <h2 class="kbox-title">开发 <span class="badge">${used}/${cap} 点</span></h2>
    <p class="tip">已自动「均衡分配」。连点推进即可；想偏科再展开微调。</p>
    ${gauge('综合完成度', L.avgSlotProgress(state))}
    <div class="row" style="margin:10px 0">
      <button type="button" class="primary" data-act="advance-balanced" style="flex:1;font-size:1.05rem;padding:14px">⏱ 均衡推进半个月 ▶</button>
    </div>
    <button type="button" data-act="rebalance">重新一键均衡</button>
    <details style="margin-top:10px">
      <summary>高级：微调各槽投入</summary>
      ${SLOTS.map((s) => {
        const sl = state.slots[s.id];
        return `<div class="slot-row">
          <div class="top"><span>${s.name}</span><span>${sl.progress}%</span></div>
          <div class="gauge-track"><div class="gauge-fill" style="width:${sl.progress}%"></div></div>
          <div class="quirk">${sl.comment}</div>
          <label>点 <input type="number" min="0" max="${cap}" value="${alloc[s.id]||0}" data-act="alloc" data-id="${s.id}" style="width:64px"/></label>
        </div>`;
      }).join('')}
      <button type="button" class="primary" data-act="advance-custom">用微调方案推进</button>
    </details>
  `);
}

function renderEvent() {
  const ev = EVENTS.find((e) => e.id === state.pendingEvent);
  const rec = L.recommendedEventChoice(state.pendingEvent);
  const modal = modalWrap(`
    <h2 class="kbox-title">⚠ ${ev.type}</h2>
    <h3 style="margin:0 0 6px">${ev.title}</h3>
    <p>${ev.body}</p>
    <button type="button" class="primary choice" data-act="event-auto" style="font-size:1.05rem">✓ 一键稳妥处理（${ev.choices[rec].label}）</button>
    <details style="margin-top:10px">
      <summary>自己选</summary>
      ${ev.choices.map((c, i) => `<button type="button" class="choice" data-act="event-choice" data-i="${i}">${c.label}${i===rec?' · 推荐':''}</button>`).join('')}
    </details>
  `);
  return shellGame(`<h2 class="kbox-title">办公室骚动中</h2><p class="lead">处理弹窗即可继续。</p>`, { modal });
}

function renderLaunch() {
  const modal = modalWrap(`
    <h2 class="kbox-title">发布会！ <span class="badge">三选一</span></h2>
    <p class="sfx-slot">♪ 揭晓音效占位</p>
    <p class="tip">关键抉择：稳妥 / 彩蛋 / 参数。点一下直接出媒体分。</p>
    ${L.LAUNCH_STYLES.map((s) => `<button type="button" class="choice primary" data-act="launch-style" data-id="${s.id}" style="margin-bottom:8px;background:linear-gradient(180deg,#f5b041,#e67e22)">
      <strong style="font-size:1.1rem">${s.label}</strong><br/><span>${s.desc}</span>
    </button>`).join('')}
  `);
  return shellGame(`<h2 class="kbox-title">舞台灯光</h2><p class="lead">聚光灯已亮。</p>`, { modal });
}

function renderScore() {
  const modal = modalWrap(`
    <h2 class="kbox-title">媒体评分揭晓</h2>
    <div class="reveal-score">${state.mediaScore}</div>
    <p style="text-align:center">用户期待 <strong>${state.userScore}</strong></p>
    <div class="headline">${state.headline}</div>
    <button type="button" class="primary choice" data-act="to-sales">看首月销量 ▶</button>
  `);
  return shellGame(`<h2 class="kbox-title">编辑部吵架中…</h2>`, { modal });
}

function renderSales() {
  const r = state.salesResult;
  return shellGame(`
    <h2 class="kbox-title">首月战报</h2>
    <div class="reveal-score" style="font-size:3rem">${r.sold}<span style="font-size:1rem"> 台</span></div>
    ${gauge('备货消化', (r.sold / Math.max(1, r.stocked)) * 100)}
    <p>盈亏 <strong>${r.profit}</strong> · ${r.stockNote}</p>
    <p>信仰 ${state.faith} · 口碑 ${state.reputation}</p>
    <div class="row end">
      <button type="button" data-act="restart">重开</button>
      <button type="button" class="primary" data-act="next-gen">下一代 ▶</button>
    </div>
  `);
}

function renderBust() {
  return shellGame(`
    <h2 class="kbox-title">倒闭了</h2>
    <p class="tip">${state.bustReason}</p>
    <button type="button" class="primary" data-act="restart">再开一局</button>
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
      case 'logistics':
      case 'supplier':
      case 'stock': html = renderLogistics(); break;
      case 'dev':
      case 'monthReport': html = renderDev(); break;
      case 'event': html = renderEvent(); break;
      case 'launch':
      case 'launchPrep': html = renderLaunch(); break;
      case 'score': html = renderScore(); break;
      case 'sales': html = renderSales(); break;
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

  if (act === 'toggle-motion') {
    draft.reduceMotion = !draft.reduceMotion;
    lsSet('epdg-reduce-motion', draft.reduceMotion ? '1' : '0');
    document.body.classList.toggle('reduce-motion', draft.reduceMotion);
    toast(draft.reduceMotion ? '已减少动画' : '已开启短动画');
    render();
    return;
  }
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
    draft.plan = L.recommendedPlan(state.generation);
    draft.alloc = null;
    render();
    return;
  }
  if (act === 'restart') { restart(); return; }
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
    // 自动推荐班底，组队页仍可改
    L.quickHireTeam(state);
    persist();
    render();
    toast('推荐班底已就位');
    return;
  }
  if (screen !== 'game' || !state) return;

  if (act === 'hire') {
    toast(L.hire(state, id).msg);
    persist(); render(); return;
  }
  if (act === 'quick-team') {
    const r = L.quickHireTeam(state);
    toast(r.msg);
    state.phase = 'plan';
    draft.plan = L.recommendedPlan(state.generation);
    flash('班底集结！');
    persist(); render(); return;
  }
  if (act === 'to-plan') {
    state.phase = 'plan';
    draft.plan = L.recommendedPlan(state.generation);
    persist(); render(); return;
  }
  if (act === 'toggle-point') {
    const arr = draft.plan.pointIds;
    const idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1);
    else if (arr.length < 3) arr.push(id);
    render(); return;
  }
  if (act === 'quick-plan' || act === 'confirm-plan') {
    if (act === 'quick-plan') draft.plan = L.recommendedPlan(state.generation);
    const res = L.finishPlan(state, draft.plan);
    if (!res.ok) toast(res.msg);
    else flash('企划决定！');
    persist(); render(); return;
  }
  if (act === 'quick-logistics') {
    L.pickLogistics(state, 'balanced', 'normal');
    draft.alloc = L.balancedAllocation(state);
    flash('供应链 OK');
    persist(); render(); return;
  }
  if (act === 'confirm-logistics') {
    L.pickLogistics(state, draft.supplierId, draft.stockId);
    draft.alloc = L.balancedAllocation(state);
    persist(); render(); return;
  }
  if (act === 'rebalance') {
    draft.alloc = L.balancedAllocation(state);
    toast('已重新均衡');
    render(); return;
  }
  if (act === 'advance-balanced') {
    draft.alloc = L.balancedAllocation(state);
    const res = L.advanceMonth(state, { ...draft.alloc });
    if (!res.ok) toast(res.msg);
    else flash('半个月过去了…');
    draft.alloc = null;
    persist(); render(); return;
  }
  if (act === 'advance-custom') {
    const res = L.advanceMonth(state, { ...ensureAlloc() });
    if (!res.ok) toast(res.msg);
    else flash('半个月过去了…');
    draft.alloc = null;
    persist(); render(); return;
  }
  if (act === 'event-auto') {
    L.resolveEvent(state, L.recommendedEventChoice(state.pendingEvent));
    persist(); render(); return;
  }
  if (act === 'event-choice') {
    L.resolveEvent(state, i);
    persist(); render(); return;
  }
  if (act === 'launch-style') {
    L.resolveLaunchStyle(state, id);
    flash('发布会结束！');
    persist(); render(); return;
  }
  if (act === 'to-sales') {
    L.runSales(state);
    persist(); render(); return;
  }
  if (act === 'next-gen') {
    L.goNextGen(state);
    // goNextGen sets plan phase - good
    draft.plan = L.recommendedPlan(state.generation);
    draft.alloc = null;
    flash(`第 ${state.generation} 代`);
    persist(); render();
  }
}

function onChange(e) {
  const t = e.target;
  const act = t.dataset.act;
  if (act === 'toggle-motion-box') {
    draft.reduceMotion = t.checked;
    lsSet('epdg-reduce-motion', draft.reduceMotion ? '1' : '0');
    document.body.classList.toggle('reduce-motion', draft.reduceMotion);
    return;
  }
  if (!act || !state) return;
  if (act === 'assign') {
    L.assignStaff(state, t.dataset.id, t.value);
    persist();
    syncOffice(state);
    render();
  }
  if (act === 'alloc') {
    ensureAlloc()[t.dataset.id] = Math.max(0, Number(t.value) || 0);
  }
  if (act === 'plan-pos') {
    draft.plan.positioningId = t.dataset.id;
    render();
  }
  if (act === 'plan-price') {
    draft.plan.priceId = t.dataset.id;
    render();
  }
  if (act === 'bind-eco') draft.plan.bindEco = t.checked;
  if (act === 'draft-sup') draft.supplierId = t.dataset.id;
  if (act === 'draft-stk') draft.stockId = t.dataset.id;
}

export function boot() {
  if (!bound) {
    app().addEventListener('click', onClick);
    app().addEventListener('change', onChange);
    bound = true;
  }
  // 有存档时标题页突出继续
  render();
}
