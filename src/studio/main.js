import '../style.css';
import './studio.css';
import {
  POSITIONS,
  PARTS,
  PART_ORDER,
  CORNERS,
  SCREEN_FORMS,
  LAYOUTS,
  TWO_TONE,
  PALETTE,
  RECOMMENDED,
  defaultDesign,
  physical,
  slotCaps,
  sellPointChecks,
  appearanceScore,
  randomTrend,
  paletteName,
  danmaku,
  tier,
} from './parts.js';

const MUSEUM_KEY = 'epdg-studio-museum';
const DRAFT_KEY = 'epdg-studio-draft';
const COMPANIES = ['回路工作室', '键程实验室', '像素工坊', '北桥电子', '蜂鸟硬件社', '星轨终端', '青瓷数码'];

function readJSON(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
}
function writeJSON(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* 存储不可用时静默 */
  }
}

const trend = randomTrend();
let design = { ...defaultDesign(), ...readJSON(DRAFT_KEY, {}) };
design.parts = { ...defaultDesign().parts, ...(design.parts || {}) };
let museum = readJSON(MUSEUM_KEY, []);
let tab = 'config';
let stage = null;
let pixel = 3;
let revealing = false;

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function prevGen() {
  return museum.length ? museum[museum.length - 1].design : null;
}

// ———————————————————— 渲染面板 ————————————————————

function configTab() {
  const pos = POSITIONS.map(
    (p) => `<button type="button" class="chip ${design.position === p.id ? 'on' : ''}" data-pos="${p.id}">${p.name}</button>`,
  ).join('');
  const parts = PART_ORDER.map((key) => {
    const P = PARTS[key];
    const btns = P.tiers
      .map(
        (t) =>
          `<button type="button" class="tier ${design.parts[key] === t.id ? 'on' : ''}" data-part="${key}" data-tier="${t.id}" title="${esc(t.note)}">${esc(t.label)}</button>`,
      )
      .join('');
    return `<div class="part-row"><span class="part-name">${P.name}</span><div class="tiers">${btns}</div></div>
      <div class="part-note">${esc(tier(design, key).note)}</div>`;
  }).join('');
  return `<div class="field"><span class="flabel">定位</span><div class="chips">${pos}</div></div>${parts}`;
}

function appearanceTab() {
  const opt = (list, cur, attr) =>
    list.map((o) => `<button type="button" class="chip ${cur === o.id ? 'on' : ''}" data-${attr}="${o.id}">${o.label}</button>`).join('');
  const swatches = (cur, attr) =>
    PALETTE.map(
      (c) =>
        `<button type="button" class="swatch ${cur.toLowerCase() === c.hex ? 'on' : ''} ${c.hex === trend.color ? 'trend' : ''}" style="--c:${c.hex}" data-${attr}="${c.hex}" title="${c.name}${c.hex === trend.color ? '（今年流行）' : ''}"></button>`,
    ).join('');
  return `
    <div class="field"><span class="flabel">圆角</span><div class="chips">${opt(CORNERS, design.corner, 'corner')}</div></div>
    <div class="field"><span class="flabel">屏幕</span><div class="chips">${opt(SCREEN_FORMS, design.screenForm, 'form')}</div></div>
    <div class="field"><span class="flabel">镜头布局</span><div class="chips">${LAYOUTS.map(
      (o) => `<button type="button" class="chip ${design.layout === o.id ? 'on' : ''} ${o.id === trend.layout ? 'trend' : ''}" data-layout="${o.id}">${o.label}${o.id === trend.layout ? ' 🔥' : ''}</button>`,
    ).join('')}</div></div>
    <div class="field"><span class="flabel">主色 · ${esc(paletteName(design.color))}</span>
      <div class="swatches">${swatches(design.color, 'color')}<label class="swatch custom" title="自定义主色"><input type="color" value="${design.color}" data-custom="color" />＋</label></div></div>
    <div class="field"><span class="flabel">拼色</span><div class="chips">${opt(TWO_TONE, design.twoTone, 'tone')}</div></div>
    ${
      design.twoTone !== 'none'
        ? `<div class="field"><span class="flabel">副色 · ${esc(paletteName(design.color2))}</span><div class="swatches">${swatches(design.color2, 'color2')}<label class="swatch custom" title="自定义副色"><input type="color" value="${design.color2}" data-custom="color2" />＋</label></div></div>`
        : ''
    }
    <div class="field two">
      <label><span class="flabel">机型名（≤8 字）</span><input data-text="modelName" maxlength="8" value="${esc(design.modelName)}" /></label>
      <label><span class="flabel">公司名</span><input data-text="company" maxlength="10" value="${esc(design.company)}" /></label>
    </div>`;
}

function readouts() {
  const p = physical(design);
  const caps = slotCaps(design);
  const checks = sellPointChecks(design);
  const ap = appearanceScore(design, trend, prevGen());
  const gauge = (c) => `<div class="gauge mini"><div class="gauge-label"><span>${c.name}</span><span>上限 ${c.cap}</span></div>
    <div class="gauge-track"><div class="gauge-fill ${c.cap < 60 ? 'hot' : c.cap < 80 ? 'warn' : ''}" style="width:${c.cap}%"></div></div></div>`;
  return `
    <div class="readouts">
      <div class="ro"><span>厚度</span><b>${p.thickness}<small>mm</small></b></div>
      <div class="ro"><span>重量</span><b>${p.weight}<small>g</small></b></div>
      <div class="ro"><span>蜂鸟实验室跑分</span><b>${p.bench.toLocaleString('en-US')}</b></div>
      <div class="ro"><span>单台成本</span><b>¥${p.unitCost}</b><em>建议 ${p.band}</em></div>
    </div>
    <h3 class="sub">研发槽上限 <small>配置台定上限 · 研发决定做到多少</small></h3>
    <div class="caps">${caps.map(gauge).join('')}</div>
    <h3 class="sub">卖点承诺</h3>
    <div class="checks">${checks
      .map((c) => `<span class="check ${c.ok ? 'ok' : 'no'}" title="${esc(c.why)}">${c.ok ? '✓' : '✗'} ${c.name}</span>`)
      .join('')}</div>
    <h3 class="sub">外观分 <b class="ap-score">${ap.score}</b></h3>
    <ul class="ap-items">${ap.items.map((i) => `<li><span>${esc(i.label)}</span><b class="${i.v >= 0 ? 'pos' : 'neg'}">${i.v >= 0 ? '+' : ''}${i.v}</b></li>`).join('')}</ul>
    ${ap.tags.length ? `<p class="tags">${ap.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</p>` : ''}`;
}

function museumStrip() {
  if (!museum.length) return '<p class="muted">还没有展品。发布一台放进来吧。</p>';
  return museum
    .map(
      (m, i) => `<button type="button" class="exhibit" data-load="${i}" title="载入这台设计">
        ${m.thumb ? `<img src="${m.thumb}" alt="${esc(m.design.modelName)}" />` : '<div class="noimg">📱</div>'}
        <span class="ename">${esc(m.design.modelName || '无名机')}</span>
        <span class="escore">外观 ${m.score}</span>
      </button>`,
    )
    .join('');
}

function renderPanel() {
  $('#tab-body').innerHTML = tab === 'config' ? configTab() : appearanceTab();
  document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  renderReadouts();
}
function renderReadouts() {
  $('#readouts').innerHTML = readouts();
}
function renderMuseum() {
  $('#museum').innerHTML = museumStrip();
  $('#btn-inherit').disabled = !museum.length;
}

function update({ panel = false } = {}) {
  writeJSON(DRAFT_KEY, design);
  stage?.setDesign(design);
  if (panel) renderPanel();
  else renderReadouts();
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

// ———————————————————— 操作 ————————————————————

function randomize() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  for (const key of PART_ORDER) design.parts[key] = pick(PARTS[key].tiers).id;
  design.corner = pick(CORNERS).id;
  design.screenForm = pick(SCREEN_FORMS).id;
  design.layout = pick(LAYOUTS).id;
  design.color = pick(PALETTE).hex;
  design.color2 = pick(PALETTE).hex;
  design.twoTone = Math.random() < 0.6 ? 'none' : pick(TWO_TONE).id;
  update({ panel: true });
}

function recommend() {
  design.parts = { ...RECOMMENDED[design.position] };
  update({ panel: true });
  toast('已套用推荐配置：稳，但平庸');
}

function inherit() {
  const prev = prevGen();
  if (!prev) return;
  const n = museum.length + 1;
  design = { ...structuredClone(prev), modelName: bumpName(prev.modelName, n) };
  update({ panel: true });
  toast('已沿用上代设计，微调一下就能发');
}

function bumpName(name, n) {
  const m = String(name || '').match(/^(.*?)(\d+)$/);
  if (m) return `${m[1]}${Number(m[2]) + 1}`.slice(0, 8);
  return `${name || '新机'} ${n}`.slice(0, 8);
}

function addToMuseum() {
  const thumb = stage ? stage.snapshot(140) : '';
  const score = appearanceScore(design, trend, prevGen()).score;
  museum.push({ design: structuredClone(design), score, thumb, at: Date.now() });
  if (museum.length > 12) museum = museum.slice(-12);
  writeJSON(MUSEUM_KEY, museum);
  renderMuseum();
  renderReadouts();
}

function launch() {
  if (!stage || revealing) return;
  revealing = true;
  const overlay = $('#reveal');
  overlay.innerHTML = '';
  overlay.className = 'reveal on';
  document.body.classList.add('revealing');
  const lines = danmaku(design, trend);
  stage.playReveal(() => {
    const ap = appearanceScore(design, trend, prevGen());
    overlay.innerHTML = `<div class="reveal-card kbox">
        <div class="rc-kicker">${esc(design.company)} 发布会</div>
        <div class="rc-name">${esc(design.modelName || '无名机')}</div>
        <div class="rc-score"><span>外观分</span><b>${ap.score}</b></div>
        <div class="rc-sub">${esc(paletteName(design.color))} · ${esc(tier(design, 'material').label)} · ${physical(design).thickness}mm · ${physical(design).weight}g</div>
        <div class="row" style="justify-content:center;margin-top:10px">
          <button type="button" class="primary" data-act="keep">放进机型馆</button>
          <button type="button" data-act="close-reveal">再改改</button>
        </div>
      </div>`;
    confetti(overlay);
    revealing = false;
  });
  // 弹幕
  const host = $('#danmaku');
  host.innerHTML = '';
  lines.sort(() => Math.random() - 0.5).slice(0, 9).forEach((txt, i) => {
    const d = document.createElement('span');
    d.className = 'dm';
    d.textContent = txt;
    d.style.top = `${8 + ((i * 37) % 70)}%`;
    d.style.animationDelay = `${1.1 + i * 0.35}s`;
    host.appendChild(d);
  });
  setTimeout(() => (host.innerHTML = ''), 9000);
}

function closeReveal() {
  const overlay = $('#reveal');
  overlay.className = 'reveal';
  overlay.innerHTML = '';
  document.body.classList.remove('revealing');
}

function confetti(host) {
  const colors = ['#e67e22', '#f2d45c', '#33e0d0', '#f2b8c6', '#27ae60', '#fff'];
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.6}s`;
    c.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
    host.appendChild(c);
  }
}

// ———————————————————— 启动 ————————————————————

function shell() {
  document.getElementById('app').innerHTML = `
  <header class="studio-head kbox">
    <a class="back" href="./index.html">← 回游戏</a>
    <h1>外观台 <span class="badge">Demo</span></h1>
    <div class="news">📰 年度新闻：今年流行 <b style="color:${trend.color}">■</b> <b>${trend.colorName}</b> · <b>${trend.layoutName}</b></div>
  </header>
  <div class="studio">
    <section class="viewport kbox">
      <div id="stage3d" class="stage3d"><div class="loading">像素手办装填中…</div></div>
      <div id="danmaku" class="danmaku"></div>
      <div id="reveal" class="reveal"></div>
      <div class="view-btns">
        <button type="button" data-view="front">正面</button>
        <button type="button" data-view="back">背面</button>
        <button type="button" data-view="side">侧面</button>
        <button type="button" data-view="hero">斜侧</button>
      </div>
      <div class="pixel-btns" title="像素度">
        ${[2, 3, 4, 0].map((n) => `<button type="button" data-pixel="${n}" class="${n === pixel ? 'on' : ''}">${n ? `像素×${n}` : '关'}</button>`).join('')}
      </div>
      <p class="drag-hint">拖拽旋转</p>
    </section>
    <aside class="panel kbox">
      <div class="tabs">
        <button type="button" class="tab" data-tab="config">🔧 配置台</button>
        <button type="button" class="tab" data-tab="look">🎨 外观台</button>
      </div>
      <div id="tab-body"></div>
      <div class="row actions">
        <button type="button" data-act="random">🎲 一键随机</button>
        <button type="button" data-act="recommend">推荐配置</button>
        <button type="button" data-act="inherit" id="btn-inherit">沿用上代</button>
        <button type="button" class="primary" data-act="launch">🎤 发布会揭幕</button>
      </div>
      <div id="readouts"></div>
    </aside>
  </div>
  <section class="museum-wrap kbox">
    <h2 class="kbox-title">🏛 历代机型馆 <span class="badge">${'点击载入'}</span>
      <button type="button" class="mini-btn" data-act="add">＋ 当前机型入馆</button>
      <button type="button" class="mini-btn danger" data-act="clear-museum">清空</button></h2>
    <div id="museum" class="museum"></div>
  </section>`;
}

function bind() {
  const app = document.getElementById('app');
  app.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    const d = t.dataset;
    if (d.tab) {
      tab = d.tab;
      renderPanel();
      if (tab === 'look') stage?.view('back');
    } else if (d.pos) {
      design.position = d.pos;
      update({ panel: true });
    } else if (d.part) {
      design.parts[d.part] = Number(d.tier);
      update({ panel: true });
      if (d.part === 'camera') stage?.view('back');
      if (d.part === 'battery' || d.part === 'chip') stage?.view('side');
    } else if (d.corner) {
      design.corner = Number(d.corner);
      update({ panel: true });
    } else if (d.form) {
      design.screenForm = d.form;
      update({ panel: true });
      stage?.view('front');
    } else if (d.layout) {
      design.layout = d.layout;
      update({ panel: true });
      stage?.view('back');
    } else if (d.color) {
      design.color = d.color;
      update({ panel: true });
    } else if (d.color2) {
      design.color2 = d.color2;
      update({ panel: true });
    } else if (d.tone) {
      design.twoTone = d.tone;
      update({ panel: true });
    } else if (d.view) {
      stage?.view(d.view);
    } else if (d.pixel !== undefined) {
      pixel = Number(d.pixel);
      stage?.setPixel(pixel);
      document.querySelectorAll('[data-pixel]').forEach((b) => b.classList.toggle('on', Number(b.dataset.pixel) === pixel));
    } else if (d.load !== undefined) {
      const m = museum[Number(d.load)];
      if (m) {
        design = structuredClone(m.design);
        update({ panel: true });
        toast(`载入：${m.design.modelName}`);
      }
    } else if (d.act) {
      const act = d.act;
      if (act === 'random') randomize();
      else if (act === 'recommend') recommend();
      else if (act === 'inherit') inherit();
      else if (act === 'launch') launch();
      else if (act === 'add') {
        addToMuseum();
        toast('已入馆');
      } else if (act === 'keep') {
        addToMuseum();
        closeReveal();
        toast('已放进机型馆');
      } else if (act === 'close-reveal') closeReveal();
      else if (act === 'clear-museum') {
        if (museum.length && confirm('清空机型馆？')) {
          museum = [];
          writeJSON(MUSEUM_KEY, museum);
          renderMuseum();
          renderReadouts();
        }
      }
    }
  });
  app.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.custom) {
      design[el.dataset.custom] = el.value;
      writeJSON(DRAFT_KEY, design);
      stage?.setDesign(design);
      renderReadouts();
    } else if (el.dataset.text) {
      design[el.dataset.text] = el.value;
      writeJSON(DRAFT_KEY, design);
      stage?.setDesign(design);
    }
  });
  app.addEventListener('change', (e) => {
    if (e.target.dataset.custom) renderPanel();
  });
}

async function boot() {
  if (!readJSON(DRAFT_KEY, null)) design.company = COMPANIES[Math.floor(Math.random() * COMPANIES.length)];
  shell();
  bind();
  renderPanel();
  renderMuseum();
  try {
    const { PhoneStage } = await import('./phone3d.js'); // three.js 按需加载
    const host = $('#stage3d');
    host.innerHTML = '';
    stage = new PhoneStage(host);
    stage.setDesign(design);
    document.fonts?.ready.then(() => stage.setDesign(design)); // 后盖文字等字体就绪后重绘
    window.__studio = { stage, get design() { return design; } };
  } catch (err) {
    console.error(err);
    $('#stage3d').innerHTML = '<div class="loading">3D 加载失败（浏览器可能不支持 WebGL）</div>';
  }
}

boot();
