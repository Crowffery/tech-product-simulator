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
import { mountOffice, syncOffice } from './office.js';
import {
  faceDataUrl,
  partIconDataUrl,
  supplierIconDataUrl,
  phoneShowcaseDataUrl,
  partsRowHtml,
} from './art.js';

let state = null;
let screen = 'title';
let draft = {
  companyName: randomCompanyName(),
  plan: L.recommendedPlan(1),
  alloc: null,
  supplierId: 'balanced',
  stockId: 'normal',
  reduceMotion: localStorage.getItem('epdg-reduce-motion') === '1',
};
let flashText = '';
let flashTimer = 0;
let bound = false;
/** @type {null|string} */
let sheet = null;
/** @type {{ label: string, act: string, id?: string } | null} */
let dockAction = null;

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
  dockAction = null;
  sheet = null;
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

function gauge(label, pct, cls = '') {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return `<div class="gauge"><div class="gauge-label"><span>${label}</span><span>${v}</span></div>
    <div class="gauge-track"><div class="gauge-fill ${cls}" style="width:${v}%"></div></div></div>`;
}

function phaseLabel(phase) {
  return ({
    hire: '招人', plan: '定方向', logistics: '进货备货', supplier: '进货备货', stock: '备货',
    dev: '加班赶工', event: '突发状况', launch: '开发布会', launchPrep: '开发布会',
    score: '媒体打分', sales: '卖得怎样', bust: '公司倒闭了', monthReport: '加班赶工',
  })[phase] || phase;
}

function topbar() {
  if (!state) return '';
  return `<div class="topbar">
    <div class="brand-chip">${state.companyName}<small>电子产品发展国 · Gen${state.generation}</small></div>
    <div class="stat cash"><span class="lbl">钞票</span><span class="val">${state.cash}</span></div>
    <div class="stat"><span class="lbl">月</span><span class="val">M${state.month}</span></div>
    <div class="stat"><span class="lbl">还剩几月</span><span class="val">${state.monthsLeft ?? '-'}</span></div>
    <div class="stat"><span class="lbl">粉丝缘</span><span class="val">${state.faith}</span></div>
    <div class="hud-btns">
      <button type="button" data-act="toggle-motion">${draft.reduceMotion ? '动画' : '少动画'}</button>
      <button type="button" class="danger" data-act="restart">重开</button>
    </div>
  </div>`;
}

function showcaseBlock() {
  const slots = state?.slots || {};
  const phone = phoneShowcaseDataUrl(slots, state?.generation || 1);
  const caption = state?.product?.name
    ? `${state.product.name} · 完成度 ${Math.round(L.avgSlotProgress(state) || 0)}%`
    : '概念机预览 · 研发后外观会变强';
  return `<section class="showcase" id="office-host">
    <div class="phase-ribbon">${phaseLabel(state?.phase)}</div>
    <div class="showcase-grid">
      <div class="phone-pane"><img src="${phone}" width="140" height="160" alt="产品预览"/></div>
      <div class="office-mini"><div id="office-mount"></div></div>
    </div>
    ${partsRowHtml(slots)}
    <div class="office-caption">${caption}</div>
    ${flashText ? `<div class="month-flash"><span>${flashText}</span></div>` : ''}
  </section>`;
}

function dockHtml() {
  if (!dockAction) return '';
  return `<div class="dock"><button type="button" class="primary" data-act="${dockAction.act}" ${dockAction.id ? `data-id="${dockAction.id}"` : ''}>${dockAction.label}</button></div>`;
}

function sheetButton(label, sheetId) {
  return `<button type="button" class="ghost-link" data-act="open-sheet" data-id="${sheetId}">${label}</button>`;
}

function renderSheet() {
  if (!sheet || !state) return '';
  let body = '';
  if (sheet === 'hire-adv') {
    body = `<h2 class="kbox-title">自己招人 <span class="badge">弹窗</span></h2>
      <div class="staff-grid">${ROLES.map((r) => {
        const owned = L.hiredIds(state).has(r.id);
        return `<article class="staff-card ${owned ? 'hired' : ''}">
          <img class="face" src="${faceDataUrl(r.id)}" alt=""/>
          <strong>${r.title}</strong>
          <div class="quirk">${r.quirk}</div>
          ${owned ? `<div class="assign-chips">${[['idle','待命'],...SLOTS.map((x)=>[x.id,x.name]),['launch','发布会']].map(([v,n]) => {
                  const cur = state.staff.find(s=>s.roleId===r.id)?.assigned;
                  return `<button type="button" class="chip ${cur===v?'on':''}" data-act="assign-chip" data-id="${r.id}" data-target="${v}">${n}</button>`;
                }).join('')}</div>`
            : `<button type="button" data-act="hire" data-id="${r.id}">招 ${r.cost}</button>`}
        </article>`;
      }).join('')}</div>
      <button type="button" class="primary choice" data-act="close-sheet">完成</button>`;
  } else if (sheet === 'plan-adv') {
    const p = draft.plan;
    body = `<h2 class="kbox-title">自己定方向</h2>
      <div class="grid2">
        <div><strong>做成什么样</strong>${POSITIONING.map((x)=>`<label class="radio"><input type="radio" name="pos" data-act="plan-pos" data-id="${x.id}" ${p.positioningId===x.id?'checked':''}/> ${x.name}</label>`).join('')}</div>
        <div><strong>卖多少钱</strong>${PRICE_BANDS.map((x)=>`<label class="radio"><input type="radio" name="price" data-act="plan-price" data-id="${x.id}" ${p.priceId===x.id?'checked':''}/> ${x.name}</label>`).join('')}</div>
      </div>
      <p style="margin:8px 0 4px"><strong>主打卖点</strong></p>
      <div class="row">${SELL_POINTS.map((x)=>`<button type="button" class="chip ${p.pointIds.includes(x.id)?'on':''}" data-act="toggle-point" data-id="${x.id}">${x.name}</button>`).join('')}</div>
      <label class="eco"><input type="checkbox" data-act="bind-eco" ${p.bindEco?'checked':''} ${state.generation===1?'disabled':''}/> 跟上一款连着用</label>
      <button type="button" class="primary choice" data-act="confirm-plan">用自定义锁定并关闭</button>
      <button type="button" class="choice" data-act="close-sheet">取消</button>`;
  } else if (sheet === 'logistics-adv') {
    body = `<h2 class="kbox-title">自己选工厂和备货</h2>
      <p><strong>找哪家厂</strong></p>
      ${SUPPLIERS.map((s)=>`<label class="radio"><input type="radio" name="sup" data-act="draft-sup" data-id="${s.id}" ${draft.supplierId===s.id?'checked':''}/> <img src="${supplierIconDataUrl(s.id)}" width="28" height="28" style="image-rendering:pixelated;vertical-align:middle"/> ${s.name}</label>`).join('')}
      <p><strong>备多少货</strong></p>
      ${STOCK_OPTS.map((s)=>`<label class="radio"><input type="radio" name="stk" data-act="draft-stk" data-id="${s.id}" ${draft.stockId===s.id?'checked':''}/> ${s.name} — ${s.note}</label>`).join('')}
      <button type="button" class="primary choice" data-act="confirm-logistics">锁定自选并关闭</button>
      <button type="button" class="choice" data-act="close-sheet">取消</button>`;
  } else if (sheet === 'dev-adv') {
    const alloc = ensureAlloc();
    const cap = L.manpowerCap(state);
    const used = Object.values(alloc).reduce((a, b) => a + (Number(b) || 0), 0);
    const left = Math.max(0, cap - used);
    body = `<h2 class="kbox-title">自己分配精力点</h2>
      <p class="tip">这个月精力 <strong>${used}/${cap}</strong>，还剩 <strong>${left}</strong> 点。按左右加减就行。</p>
      ${SLOTS.map((s) => {
        const sl = state.slots[s.id];
        const pts = alloc[s.id] || 0;
        return `<div class="slot-row">
          <div class="top"><span style="display:flex;align-items:center;gap:6px"><img src="${partIconDataUrl(s.id, sl.progress)}" alt=""/>${s.name}</span><span>${sl.progress}%</span></div>
          <div class="gauge-track"><div class="gauge-fill" style="width:${sl.progress}%"></div></div>
          <div class="quirk">${sl.comment}</div>
          <div class="stepper">
            <button type="button" class="stepper-btn" data-act="alloc-minus" data-id="${s.id}" ${pts<=0?'disabled':''} aria-label="减少">−</button>
            <div class="stepper-val">${pts}</div>
            <button type="button" class="stepper-btn" data-act="alloc-plus" data-id="${s.id}" ${left<=0?'disabled':''} aria-label="增加">+</button>
          </div>
        </div>`;
      }).join('')}
      <div class="row">
        <button type="button" data-act="rebalance">一键平均分配</button>
        <button type="button" class="primary" data-act="advance-custom" ${used<1?'disabled':''}>按这个分配过半个月</button>
      </div>
      <button type="button" class="choice" data-act="close-sheet" style="margin-top:8px">关闭</button>`;
  } else if (sheet === 'event-manual') {
    const ev = EVENTS.find((e) => e.id === state.pendingEvent);
    const rec = L.recommendedEventChoice(state.pendingEvent);
    body = `<h2 class="kbox-title">我来选怎么处理</h2>
      ${ev.choices.map((c,i)=>`<button type="button" class="choice" data-act="event-choice" data-i="${i}">${c.label}${i===rec?' · 推荐':''}</button>`).join('')}
      <button type="button" class="choice" data-act="close-sheet">返回</button>`;
  } else {
    return '';
  }
  return `<div class="modal-backdrop sheet-backdrop" data-act="close-sheet-backdrop"><div class="modal kbox sheet-panel" data-stop="1">${body}</div></div>`;
}

function shellGame(cmdHtml, { modal = '', dock = null } = {}) {
  dockAction = dock;
  const sheetModal = renderSheet();
  return `${topbar()}
  <div class="stage">
    ${showcaseBlock()}
    <aside class="cmd kbox">${cmdHtml}</aside>
  </div>
  ${dockHtml()}
  ${sheetModal || modal}`;
}

function modalWrap(inner) {
  return `<div class="modal-backdrop"><div class="modal kbox">${inner}</div></div>`;
}

function renderTitle() {
  dockAction = hasSave()
    ? { label: '▶ 继续游戏', act: 'continue' }
    : { label: '▶ 新开一局', act: 'new' };
  return `<div class="kbox title-screen">
    <canvas class="title-art" id="title-art" width="360" height="140"></canvas>
    <h1>电子产品发展国</h1>
    <p style="margin:0;font-weight:800">休闲开罗味 · 看着手机一点点被做出来</p>
    <p class="muted">几乎只用点底部大按钮就能玩完</p>
    ${hasSave() ? '<button type="button" data-act="new">新开一局</button>' : ''}
    <label class="eco"><input type="checkbox" data-act="toggle-motion-box" ${draft.reduceMotion ? 'checked' : ''}/> 减少动画</label>
  </div>${dockHtml()}`;
}

function paintTitleArt() {
  const c = document.getElementById('title-art');
  if (!c) return;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.fillStyle = '#5d7a96';
  g.fillRect(0, 0, 360, 140);
  // inline draw via showcase image
  const img = new Image();
  img.onload = () => g.drawImage(img, 110, 0);
  img.src = phoneShowcaseDataUrl({
    perf: { progress: 70 },
    design: { progress: 80 },
    camera: { progress: 60 },
    battery: { progress: 55 },
    os: { progress: 75 },
  }, 1);
}

function renderCreate() {
  dockAction = { label: '开门并组队 ▶', act: 'confirm-create' };
  return `<div class="kbox" style="padding:16px;margin-top:24px">
    <h2 class="kbox-title">车库开门</h2>
    <p class="tip">起个名字就开工。系统会先帮你配好一组人。</p>
    <label>公司名<input id="cname" maxlength="16" value="${escapeAttr(draft.companyName)}"/></label>
    <div class="row" style="margin-top:10px"><button type="button" data-act="rand-name">随机名</button></div>
  </div>${dockHtml()}`;
}

function renderHire() {
  return shellGame(`
    <h2 class="kbox-title">组队 <span class="badge">推荐一键</span></h2>
    <p class="tip">底部大按钮采用推荐班底。想微操再展开。</p>
    ${state.staff.length ? `<div class="staff-grid">${state.staff.map((s) => {
      const r = L.getRole(s.roleId);
      return `<article class="staff-card hired"><img class="face" src="${faceDataUrl(s.roleId)}" alt=""/><strong>${r.title}</strong><div class="stars">${'★'.repeat(r.stars)}</div></article>`;
    }).join('')}</div>` : ''}
    <p style="margin-top:10px">${sheetButton('⚙ 自己招人 / 改岗位', 'hire-adv')}</p>
  `, { dock: { label: state.staff.length ? '下一步：定方向 ▶' : '✓ 用推荐小队，继续 ▶', act: state.staff.length ? 'to-plan' : 'quick-team' } });
}

function renderPlan() {
  const p = draft.plan;
  const tri = L.trianglePreview(p.positioningId, p.priceId);
  return shellGame(`
    <h2 class="kbox-title">定方向 <span class="badge">第${state.generation}代</span></h2>
    <p class="tip">上面那台手机会跟着你的选择变。推荐：大众款 + 又快又薄 + 正常价。</p>
    ${gauge('好不好用（预期）', tri.experience)}
    ${gauge('贵不贵（压力）', tri.costPressure, 'warn')}
    <p>${sheetButton('⚙ 自己定方向', 'plan-adv')}</p>
  `, { dock: { label: '✓ 用推荐方案，继续 ▶', act: 'quick-plan' } });
}

function renderLogistics() {
  return shellGame(`
    <h2 class="kbox-title">找谁进货 + 备多少货</h2>
    <p class="tip">关键抉择：默认「稳妥厂 + 正常备货」最省心。</p>
    <div class="sup-grid">
      ${SUPPLIERS.map((s) => `<div class="sup-card"><img src="${supplierIconDataUrl(s.id)}" alt=""/><div><strong>${s.name}</strong><div class="muted">${s.desc}</div></div></div>`).join('')}
    </div>
    <p style="margin-top:10px">${sheetButton('⚙ 自己选工厂 / 备货量', 'logistics-adv')}</p>
  `, { dock: { label: '✓ 用推荐进货方案，开工 ▶', act: 'quick-logistics' } });
}

function ensureAlloc() {
  if (!draft.alloc) draft.alloc = L.balancedAllocation(state);
  return draft.alloc;
}

function renderDev() {
  ensureAlloc();
  return shellGame(`
    <h2 class="kbox-title">赶工车间 <span class="badge">看着手机变强</span></h2>
    <p class="tip">上面五个小格和手机画面会跟着变强。连点底部就能过半个月。</p>
    ${gauge('整体完成度', L.avgSlotProgress(state))}
    <p>${sheetButton('⚙ 自己加点（+/-）', 'dev-adv')}</p>
  `, { dock: { label: '⏱ 平均加点，过半个月 ▶', act: 'advance-balanced' } });
}

function renderEvent() {
  const ev = EVENTS.find((e) => e.id === state.pendingEvent);
  const rec = L.recommendedEventChoice(state.pendingEvent);
  const modal = modalWrap(`
    <h2 class="kbox-title">⚠ ${ev.type}</h2>
    <h3 style="margin:0 0 6px">${ev.title}</h3>
    <p>${ev.body}</p>
    <button type="button" class="choice big primary" data-act="event-auto">✓ 省心处理：${ev.choices[rec].label}</button>
    <button type="button" class="choice" data-act="open-sheet" data-id="event-manual">我自己选（弹窗）</button>
  `);
  return shellGame(`<h2 class="kbox-title">办公室出事了</h2><p class="lead">先把弹窗处理掉。</p>`, { modal, dock: null });
}

function renderLaunch() {
  const modal = modalWrap(`
    <h2 class="kbox-title">发布会开始！</h2>
    <div style="text-align:center;margin:8px 0"><img src="${phoneShowcaseDataUrl(state.slots, state.generation)}" width="120" height="140" style="image-rendering:pixelated" alt="真机"/></div>
    <p class="tip">成品登场了——点一个风格，马上出媒体分。</p>
    ${L.LAUNCH_STYLES.map((s) => `<button type="button" class="choice big primary" data-act="launch-style" data-id="${s.id}"><strong>${s.label}</strong><br/><span class="muted">${s.desc}</span></button>`).join('')}
  `);
  return shellGame(`<h2 class="kbox-title">舞台准备中…</h2>`, { modal, dock: null });
}

function renderScore() {
  const modal = modalWrap(`
    <h2 class="kbox-title">媒体打分</h2>
    <div style="text-align:center"><img src="${phoneShowcaseDataUrl(state.slots, state.generation)}" width="100" height="114" style="image-rendering:pixelated" alt=""/></div>
    <div class="reveal-score">${state.mediaScore}</div>
    <p style="text-align:center">用户期待 ${state.userScore}</p>
    <div class="headline">${state.headline}</div>
  `);
  return shellGame(`<h2 class="kbox-title">编辑部还在吵…</h2>`, {
    modal,
    dock: { label: '看看第一个月卖得怎样 ▶', act: 'to-sales' },
  });
}

function renderSales() {
  const r = state.salesResult;
  return shellGame(`
    <h2 class="kbox-title">第一个月战报</h2>
    <div style="text-align:center"><img src="${phoneShowcaseDataUrl(state.slots, state.generation)}" width="110" height="126" style="image-rendering:pixelated" alt=""/></div>
    <div class="reveal-score" style="font-size:2.8rem">${r.sold}<span style="font-size:.9rem"> 台</span></div>
    ${gauge('货卖完了吗', (r.sold / Math.max(1, r.stocked)) * 100)}
    <p>盈亏 <strong>${r.profit}</strong> · ${r.stockNote}</p>
    <button type="button" data-act="restart">重开</button>
  `, { dock: { label: '开下一款手机 ▶', act: 'next-gen' } });
}

function renderBust() {
  return shellGame(`
    <h2 class="kbox-title">公司倒闭了</h2>
    <p class="tip">${state.bustReason}</p>
  `, { dock: { label: '再开一局吧', act: 'restart' } });
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

  if (act === 'open-sheet') {
    sheet = id;
    render();
    return;
  }
  if (act === 'assign-chip') {
    L.assignStaff(state, id, btn.dataset.target);
    persist();
    render();
    return;
  }
  if (act === 'alloc-plus' || act === 'alloc-minus') {
    const alloc = ensureAlloc();
    const cap = L.manpowerCap(state);
    const used = Object.values(alloc).reduce((a, b) => a + (Number(b) || 0), 0);
    const cur = alloc[id] || 0;
    if (act === 'alloc-plus') {
      if (used >= cap) { toast('点数用光啦'); return; }
      alloc[id] = cur + 1;
    } else {
      if (cur <= 0) return;
      alloc[id] = cur - 1;
    }
    render();
    return;
  }
  if (act === 'close-sheet' || act === 'close-sheet-backdrop') {
    if (act === 'close-sheet-backdrop' && e.target !== btn) return;
    sheet = null;
    render();
    return;
  }
  if (act === 'toggle-motion') {
    draft.reduceMotion = !draft.reduceMotion;
    localStorage.setItem('epdg-reduce-motion', draft.reduceMotion ? '1' : '0');
    document.body.classList.toggle('reduce-motion', draft.reduceMotion);
    toast(draft.reduceMotion ? '已减少动画' : '短动画开');
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
    L.quickHireTeam(state);
    persist();
    render();
    toast('推荐小队已就位');
    return;
  }
  if (screen !== 'game' || !state) return;

  if (act === 'hire') { toast(L.hire(state, id).msg); persist(); render(); return; }
  if (act === 'quick-team') {
    toast(L.quickHireTeam(state).msg);
    state.phase = 'plan';
    draft.plan = L.recommendedPlan(state.generation);
    sheet = null;
    flash('小队集结！');
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
    else { flash('方向定了！'); sheet = null; }
    persist(); render(); return;
  }
  if (act === 'quick-logistics') {
    L.pickLogistics(state, 'balanced', 'normal');
    draft.alloc = L.balancedAllocation(state);
    flash('进货方案 OK');
    persist(); render(); return;
  }
  if (act === 'confirm-logistics') {
    L.pickLogistics(state, draft.supplierId, draft.stockId);
    draft.alloc = L.balancedAllocation(state);
    sheet = null;
    persist(); render(); return;
  }
  if (act === 'rebalance') {
    draft.alloc = L.balancedAllocation(state);
    toast('已平均分配');
    render(); return;
  }
  if (act === 'advance-balanced') {
    draft.alloc = L.balancedAllocation(state);
    const res = L.advanceMonth(state, { ...draft.alloc });
    if (!res.ok) toast(res.msg); else flash('半个月过去了…');
    draft.alloc = null;
    persist(); render(); return;
  }
  if (act === 'advance-custom') {
    const res = L.advanceMonth(state, { ...ensureAlloc() });
    if (!res.ok) toast(res.msg);
    else { flash('半个月过去了…'); sheet = null; }
    draft.alloc = null;
    persist(); render(); return;
  }
  if (act === 'event-auto') {
    L.resolveEvent(state, L.recommendedEventChoice(state.pendingEvent));
    persist(); render(); return;
  }
  if (act === 'event-choice') {
    L.resolveEvent(state, i);
    sheet = null;
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
    localStorage.setItem('epdg-reduce-motion', draft.reduceMotion ? '1' : '0');
    document.body.classList.toggle('reduce-motion', draft.reduceMotion);
    return;
  }
  if (!act || !state) return;
  if (act === 'assign') {
    L.assignStaff(state, t.dataset.id, t.value);
    persist(); render();
  }
  if (act === 'plan-pos') { draft.plan.positioningId = t.dataset.id; render(); }
  if (act === 'plan-price') { draft.plan.priceId = t.dataset.id; render(); }
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
  document.body.classList.toggle('reduce-motion', draft.reduceMotion);
  render();
}
