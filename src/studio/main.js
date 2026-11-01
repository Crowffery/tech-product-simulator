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
import { sfx } from './sfx.js';

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
let exploded = false;
const shown = {}; // 读数上一次显示的值（做数字滚动）

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function prevGen() {
  return museum.length ? museum[museum.length - 1].design : null;
}

// ═════════════════════════ 面板 ═════════════════════════

function configTab() {
  const pos = POSITIONS.map(
    (p) => `<button type="button" class="chip ${design.position === p.id ? 'on' : ''}" data-pos="${p.id}">${p.name}</button>`,
  ).join('');
  const parts = PART_ORDER.map((key) => {
    const P = PARTS[key];
    const btns = P.tiers
      .map(
        (t) =>
          `<button type="button" class="tier ${design.parts[key] === t.id ? 'on' : ''}" data-part="${key}" data-tier="${t.id}">${esc(t.label)}</button>`,
      )
      .join('');
    return `<div class="part-row"><span class="part-name">${P.name}</span><div class="tiers">${btns}</div></div>
      <div class="part-note" id="note-${key}">${esc(tier(design, key).note)}</div>`;
  }).join('');
  return `<div class="field"><span class="flabel">定位</span><div class="chips">${pos}</div></div>${parts}
    <p class="hint">💡 悬停档位可预览差值；点「🔩 拆解」看内部元件</p>`;
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
  const gauge = (c) => `<div class="gauge mini"><div class="gauge-label"><span>${c.name}</span><span>上限 <b data-num="cap-${c.id}" data-v="${c.cap}">${c.cap}</b></span></div>
    <div class="gauge-track"><div class="gauge-fill ${c.cap < 60 ? 'hot' : c.cap < 80 ? 'warn' : ''}" style="width:${c.cap}%"></div></div></div>`;
  return `
    <div class="readouts">
      <div class="ro"><span>厚度</span><b><i data-num="thick" data-v="${p.thickness}" data-dec="1">${p.thickness}</i><small>mm</small></b></div>
      <div class="ro"><span>重量</span><b><i data-num="weight" data-v="${p.weight}">${p.weight}</i><small>g</small></b></div>
      <div class="ro"><span>蜂鸟实验室跑分</span><b><i data-num="bench" data-v="${p.bench}" data-sep="1">${p.bench.toLocaleString('en-US')}</i></b></div>
      <div class="ro"><span>单台成本</span><b>¥<i data-num="cost" data-v="${p.unitCost}">${p.unitCost}</i></b><em>建议 ${p.band}</em></div>
    </div>
    <h3 class="sub">研发槽上限 <small>配置台定上限 · 研发决定做到多少</small></h3>
    <div class="caps">${caps.map(gauge).join('')}</div>
    <h3 class="sub">卖点承诺</h3>
    <div class="checks">${checks
      .map((c) => `<span class="check ${c.ok ? 'ok' : 'no'}" title="${esc(c.why)}">${c.ok ? '✓' : '✗'} ${c.name}</span>`)
      .join('')}</div>
    <h3 class="sub">外观分 <b class="ap-score" data-num="ap" data-v="${ap.score}">${ap.score}</b></h3>
    <ul class="ap-items">${ap.items.map((i) => `<li><span>${esc(i.label)}</span><b class="${i.v >= 0 ? 'pos' : 'neg'}">${i.v >= 0 ? '+' : ''}${i.v}</b></li>`).join('')}</ul>
    ${ap.tags.length ? `<p class="tags">${ap.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</p>` : ''}`;
}

function museumStrip() {
  if (!museum.length) return '<p class="muted">还没有展品。办一场发布会，把它放进来吧。</p>';
  return museum
    .map(
      (m, i) => `<button type="button" class="exhibit" data-load="${i}" title="载入这台设计">
        <span class="gen">Gen ${i + 1}</span>
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

/** 读数：数字滚动 + 变化浮字 */
function renderReadouts() {
  $('#readouts').innerHTML = readouts();
  document.querySelectorAll('#readouts [data-num]').forEach((el) => {
    const key = el.dataset.num;
    const to = Number(el.dataset.v);
    const from = shown[key];
    shown[key] = to;
    if (from === undefined || from === to) return;
    const dec = Number(el.dataset.dec || 0);
    const fmt = (v) => (el.dataset.sep ? Math.round(v).toLocaleString('en-US') : v.toFixed(dec));
    const t0 = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - t0) / 420);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    const diff = to - from;
    const up = diff > 0;
    const good = { thick: !up, weight: !up, cost: !up }[key] ?? up;
    const pop = document.createElement('span');
    pop.className = `delta ${good ? 'good' : 'bad'}`;
    pop.textContent = `${up ? '+' : ''}${el.dataset.sep ? Math.round(diff).toLocaleString('en-US') : diff.toFixed(dec)}`;
    (el.closest('.ro') || el.closest('.gauge') || el.parentElement).appendChild(pop);
    setTimeout(() => pop.remove(), 1100);
    (el.closest('.ro') || el.closest('.gauge-label') || el).classList.add('bump');
  });
}

function renderMuseum() {
  $('#museum').innerHTML = museumStrip();
  $('#btn-inherit').disabled = !museum.length;
}

function renderPlaque() {
  const el = $('#plaque');
  if (el) el.innerHTML = `<b>${esc(design.modelName || '无名机')}</b><span>${esc(design.company)} · ${esc(paletteName(design.color))}</span>`;
}

function update({ panel = false, animate = true, sparkle = true } = {}) {
  writeJSON(DRAFT_KEY, design);
  stage?.setDesign(design, { animate, sparkle });
  if (panel) renderPanel();
  else renderReadouts();
  renderPlaque();
  updateLabelsText();
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1600);
}

// ═════════════════════════ 悬停预览 ═════════════════════════

function previewTier(key, tid) {
  const note = document.getElementById(`note-${key}`);
  if (!note) return;
  if (tid === null) {
    note.innerHTML = esc(tier(design, key).note);
    note.classList.remove('preview');
    return;
  }
  const alt = structuredClone(design);
  alt.parts[key] = tid;
  const a = physical(design);
  const b = physical(alt);
  const ca = slotCaps(design);
  const cb = slotCaps(alt);
  const bits = [];
  const d = (label, x, y, unit, lowerBetter, dec = 0) => {
    const v = +(y - x).toFixed(dec);
    if (!v) return;
    const good = lowerBetter ? v < 0 : v > 0;
    bits.push(`<i class="${good ? 'g' : 'b'}">${label} ${v > 0 ? '+' : ''}${v}${unit}</i>`);
  };
  d('厚', a.thickness, b.thickness, 'mm', true, 1);
  d('重', a.weight, b.weight, 'g', true);
  d('成本', a.unitCost, b.unitCost, '', true);
  cb.forEach((c, i) => d(c.name.slice(0, 2), ca[i].cap, c.cap, '', false));
  note.innerHTML = bits.length ? bits.join(' ') : '<i>无变化</i>';
  note.classList.add('preview');
}

// ═════════════════════════ 拆解标注 ═════════════════════════

let labelEls = {};
const LABEL_SIDE = { back: 'L', sensor: 'L', battery: 'L', chip: 'R', frame: 'R', screen: 'R' };
function labelDefs() {
  const p = physical(design);
  return [
    { key: 'back', title: `${tier(design, 'material').label}后盖`, sub: paletteName(design.color) },
    { key: 'sensor', title: tier(design, 'camera').label, sub: tier(design, 'camera').note },
    { key: 'battery', title: `${tier(design, 'battery').label.split('·')[1]?.trim()} mAh`, sub: tier(design, 'battery').note },
    { key: 'chip', title: tier(design, 'chip').label, sub: `跑分 ${p.bench.toLocaleString('en-US')}` },
    { key: 'frame', title: design.parts.material === 0 ? '塑料中框' : '金属中框', sub: `${p.thickness}mm · ${p.weight}g` },
    { key: 'screen', title: tier(design, 'screen').label, sub: SCREEN_FORMS.find((f) => f.id === design.screenForm)?.label || '' },
  ];
}
function buildLabels() {
  const host = $('#labels');
  host.innerHTML = '<svg class="leaders"></svg>';
  labelEls = {};
  for (const d of labelDefs()) {
    const el = document.createElement('div');
    el.className = `callout ${LABEL_SIDE[d.key] === 'R' ? 'right' : ''}`;
    el.innerHTML = `<b>${esc(d.title)}</b><span>${esc(d.sub)}</span>`;
    host.appendChild(el);
    labelEls[d.key] = el;
  }
}
function updateLabelsText() {
  for (const d of labelDefs()) {
    const el = labelEls[d.key];
    if (el) el.innerHTML = `<b>${esc(d.title)}</b><span>${esc(d.sub)}</span>`;
  }
}
/** 两侧分栏排布：按锚点纵坐标排序，强制最小间距，再画折线引线 */
function positionLabels(st) {
  const host = $('#labels');
  const vis = st.explode > 0.85 && !st.reveal;
  host.classList.toggle('on', vis);
  if (!vis) return;
  const W = st.host.clientWidth;
  const H = st.host.clientHeight;
  const narrow = W < 560;
  const colW = narrow ? 96 : 132;
  const gap = narrow ? 34 : 46;
  const sides = { L: [], R: [] };
  for (const [key, el] of Object.entries(labelEls)) {
    const p = st.anchorScreen(key);
    if (!p) continue;
    sides[LABEL_SIDE[key]].push({ key, el, p, y: p.y });
  }
  let svg = '';
  for (const side of ['L', 'R']) {
    const arr = sides[side].sort((a, b) => a.p.y - b.p.y);
    for (let i = 0; i < arr.length; i++) {
      const min = i ? arr[i - 1].y + gap : 54;
      arr[i].y = Math.max(arr[i].y, min);
    }
    const over = arr.length ? arr[arr.length - 1].y - (H - 70) : 0;
    if (over > 0) arr.forEach((a) => (a.y -= over));
    for (const a of arr) {
      const x = side === 'L' ? 10 : W - colW - 10;
      a.el.style.width = `${colW}px`;
      a.el.style.transform = `translate(${x}px, ${Math.round(a.y - 16)}px)`;
      const ex = side === 'L' ? x + colW : x;
      const mx = side === 'L' ? ex + 14 : ex - 14;
      svg += `<polyline points="${ex},${a.y} ${mx},${a.y} ${Math.round(a.p.x)},${Math.round(a.p.y)}" />`;
      svg += `<rect x="${Math.round(a.p.x) - 4}" y="${Math.round(a.p.y) - 4}" width="8" height="8" />`;
    }
  }
  host.querySelector('.leaders').innerHTML = svg;
}

// ═════════════════════════ 操作 ═════════════════════════

function randomize() {
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  for (const key of PART_ORDER) design.parts[key] = pick(PARTS[key].tiers).id;
  design.corner = pick(CORNERS).id;
  design.screenForm = pick(SCREEN_FORMS).id;
  design.layout = pick(LAYOUTS).id;
  design.color = pick(PALETTE).hex;
  design.color2 = pick(PALETTE).hex;
  design.twoTone = Math.random() < 0.6 ? 'none' : pick(TWO_TONE).id;
  sfx.whoosh();
  update({ panel: true });
  stage?.burst(60);
}

function recommend() {
  design.parts = { ...RECOMMENDED[design.position] };
  sfx.part(1);
  update({ panel: true });
  toast('已套用推荐配置：稳，但平庸');
}

function inherit() {
  const prev = prevGen();
  if (!prev) return;
  design = { ...structuredClone(prev), modelName: bumpName(prev.modelName, museum.length + 1) };
  sfx.keep();
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
  sfx.keep();
  const last = $('#museum .exhibit:last-child');
  last?.classList.add('new');
  last?.scrollIntoView({ behavior: 'smooth', inline: 'end', block: 'nearest' });
}

function setExploded(on) {
  exploded = on;
  stage?.setExploded(on);
  sfx.explode(on);
  $('#btn-explode').classList.toggle('on', on);
  $('#btn-explode').textContent = on ? '🔩 合上' : '🔩 拆解';
}

function launch() {
  if (!stage || revealing) return;
  revealing = true;
  if (exploded) setExploded(false);
  const overlay = $('#reveal');
  overlay.innerHTML = '';
  overlay.className = 'reveal on';
  document.body.classList.add('revealing');
  const lines = danmaku(design, trend);
  const ap = appearanceScore(design, trend, prevGen());
  stage.playReveal(design, {
    onBeat(beat) {
      if (beat === 'drumroll') sfx.drumroll(3.0);
      else if (beat === 'boom') {
        sfx.boom();
        sfx.fanfare(0.12);
        sfx.applause(3.2, 0.3);
        startDanmaku(lines);
        const vp = $('.viewport');
        vp.classList.remove('shake');
        void vp.offsetWidth;
        vp.classList.add('shake');
      } else if (beat === 'shutter') sfx.shutter();
      else if (beat === 'done') showCard(ap);
    },
  });
}

function showCard(ap) {
  const overlay = $('#reveal');
  const p = physical(design);
  const grade = ap.score >= 85 ? 'S' : ap.score >= 70 ? 'A' : ap.score >= 55 ? 'B' : 'C';
  overlay.innerHTML = `<div class="reveal-card kbox">
      <div class="rc-kicker">${esc(design.company)} 发布会</div>
      <div class="rc-name">${esc(design.modelName || '无名机')}</div>
      <div class="rc-score"><span>外观分</span><b id="rc-num">0</b><em class="grade g-${grade}">${grade}</em></div>
      <div class="rc-sub">${esc(paletteName(design.color))} · ${esc(tier(design, 'material').label)} · ${p.thickness}mm · ${p.weight}g · 跑分 ${p.bench.toLocaleString('en-US')}</div>
      <div class="row" style="justify-content:center;margin-top:10px">
        <button type="button" class="primary" data-act="keep">🏛 放进机型馆</button>
        <button type="button" data-act="close-reveal">再改改</button>
      </div>
    </div>`;
  const num = $('#rc-num');
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 700);
    num.textContent = Math.round(ap.score * (1 - Math.pow(1 - k, 3)));
    if (k < 1) {
      if (Math.random() < 0.3) sfx.click();
      requestAnimationFrame(step);
    }
  };
  requestAnimationFrame(step);
  confetti(overlay);
  revealing = false;
}

function startDanmaku(lines) {
  const host = $('#danmaku');
  host.innerHTML = '';
  lines
    .sort(() => Math.random() - 0.5)
    .slice(0, 10)
    .forEach((txt, i) => {
      const d = document.createElement('span');
      d.className = 'dm';
      d.textContent = txt;
      d.style.top = `${6 + ((i * 29) % 62)}%`;
      d.style.animationDelay = `${0.2 + i * 0.32}s`;
      host.appendChild(d);
    });
  setTimeout(() => (host.innerHTML = ''), 10000);
}

function closeReveal() {
  const overlay = $('#reveal');
  overlay.className = 'reveal';
  overlay.innerHTML = '';
  $('#danmaku').innerHTML = '';
  document.body.classList.remove('revealing');
  stage?.endReveal();
  revealing = false;
}

function confetti(host) {
  const colors = ['#e67e22', '#f2d45c', '#33e0d0', '#f2b8c6', '#27ae60', '#fff'];
  for (let i = 0; i < 48; i++) {
    const c = document.createElement('i');
    c.className = 'confetti';
    c.style.left = `${Math.random() * 100}%`;
    c.style.top = `${-10 - Math.random() * 60}px`;
    c.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
    c.style.background = colors[i % colors.length];
    c.style.animationDelay = `${Math.random() * 0.6}s`;
    c.style.animationDuration = `${1.6 + Math.random() * 1.2}s`;
    host.appendChild(c);
  }
}

// ═════════════════════════ 启动 ═════════════════════════

function shell() {
  document.getElementById('app').innerHTML = `
  <header class="studio-head kbox">
    <a class="back" href="${import.meta.env.VITE_GAME_HREF || './index.html'}">← 回游戏</a>
    <h1>外观台 <span class="badge">Demo</span></h1>
    <div class="news"><span class="news-tag">年度新闻</span> 今年流行 <b class="news-dot" style="background:${trend.color}"></b><b>${trend.colorName}</b> · <b>${trend.layoutName}</b></div>
    <button type="button" class="mute" data-act="mute" title="音效">${sfx.muted ? '🔇' : '🔊'}</button>
  </header>
  <div class="studio">
    <section class="viewport kbox">
      <div id="stage3d" class="stage3d"><div class="loading"><span>像素手办装填中</span><i class="bar"><b></b></i></div></div>
      <div id="labels" class="labels"></div>
      <div id="danmaku" class="danmaku"></div>
      <div id="reveal" class="reveal"></div>
      <div class="view-btns">
        <button type="button" data-view="front">正面</button>
        <button type="button" data-view="back">背面</button>
        <button type="button" data-view="side">侧面</button>
        <button type="button" data-view="hero">斜侧</button>
        <button type="button" id="btn-explode" data-act="explode">🔩 拆解</button>
      </div>
      <div class="pixel-btns" title="像素度">
        ${[2, 3, 4, 0].map((n) => `<button type="button" data-pixel="${n}" class="${n === pixel ? 'on' : ''}">${n ? `像素×${n}` : '高清'}</button>`).join('')}
      </div>
      <div id="plaque" class="plaque"></div>
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
        <button type="button" class="primary launch-btn" data-act="launch">🎤 发布会揭幕</button>
      </div>
      <div id="readouts"></div>
    </aside>
  </div>
  <section class="museum-wrap kbox">
    <h2 class="kbox-title">🏛 历代机型馆 <span class="badge">点击载入</span>
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
      sfx.click();
      tab = d.tab;
      renderPanel();
      if (tab === 'look' && !exploded) stage?.view('back');
    } else if (d.pos) {
      sfx.click();
      design.position = d.pos;
      update({ panel: true, animate: false, sparkle: false });
    } else if (d.part) {
      const tid = Number(d.tier);
      if (design.parts[d.part] === tid) return;
      design.parts[d.part] = tid;
      sfx.part(tid);
      update({ panel: true });
      if (!exploded) {
        if (d.part === 'camera') stage?.view('back');
        if (d.part === 'battery' || d.part === 'chip') stage?.view('side');
        if (d.part === 'screen') stage?.view('front');
      }
    } else if (d.corner) {
      sfx.part(Number(d.corner));
      design.corner = Number(d.corner);
      update({ panel: true });
    } else if (d.form) {
      sfx.part(1);
      design.screenForm = d.form;
      update({ panel: true });
      if (!exploded) stage?.view('front');
    } else if (d.layout) {
      sfx.part(2);
      design.layout = d.layout;
      update({ panel: true });
      if (!exploded) stage?.view('back');
    } else if (d.color) {
      sfx.color();
      design.color = d.color;
      update({ panel: true, animate: false });
    } else if (d.color2) {
      sfx.color();
      design.color2 = d.color2;
      update({ panel: true, animate: false });
    } else if (d.tone) {
      sfx.color();
      design.twoTone = d.tone;
      update({ panel: true, animate: false });
    } else if (d.view) {
      sfx.click();
      if (exploded) setExploded(false);
      stage?.view(d.view);
    } else if (d.pixel !== undefined) {
      sfx.click();
      pixel = Number(d.pixel);
      stage?.setPixel(pixel);
      document.querySelectorAll('[data-pixel]').forEach((b) => b.classList.toggle('on', Number(b.dataset.pixel) === pixel));
    } else if (d.load !== undefined) {
      const m = museum[Number(d.load)];
      if (m) {
        design = structuredClone(m.design);
        sfx.keep();
        update({ panel: true });
        toast(`载入：${m.design.modelName}`);
      }
    } else if (d.act) {
      const act = d.act;
      if (act === 'random') randomize();
      else if (act === 'recommend') recommend();
      else if (act === 'inherit') inherit();
      else if (act === 'launch') launch();
      else if (act === 'explode') setExploded(!exploded);
      else if (act === 'mute') {
        sfx.setMuted(!sfx.muted);
        t.textContent = sfx.muted ? '🔇' : '🔊';
        if (!sfx.muted) sfx.click();
      } else if (act === 'add') {
        addToMuseum();
        toast('已入馆');
      } else if (act === 'keep') {
        addToMuseum();
        closeReveal();
        toast('已放进机型馆');
      } else if (act === 'close-reveal') {
        sfx.click();
        closeReveal();
      } else if (act === 'clear-museum') {
        // 页内二次确认（部分环境不支持 confirm 弹窗）
        if (!museum.length) return;
        if (t.dataset.armed !== '1') {
          t.dataset.armed = '1';
          t.textContent = '再点一次清空';
          setTimeout(() => {
            t.dataset.armed = '';
            t.textContent = '清空';
          }, 2500);
          return;
        }
        museum = [];
        writeJSON(MUSEUM_KEY, museum);
        renderMuseum();
        renderReadouts();
        t.dataset.armed = '';
        t.textContent = '清空';
      }
    }
  });
  app.addEventListener('pointerover', (e) => {
    const t = e.target.closest('.tier');
    if (t && e.pointerType === 'mouse') previewTier(t.dataset.part, Number(t.dataset.tier));
  });
  app.addEventListener('pointerout', (e) => {
    const t = e.target.closest('.tier');
    if (t && !t.contains(e.relatedTarget)) previewTier(t.dataset.part, null);
  });
  app.addEventListener('input', (e) => {
    const el = e.target;
    if (el.dataset.custom) {
      design[el.dataset.custom] = el.value;
      writeJSON(DRAFT_KEY, design);
      stage?.setDesign(design);
      renderReadouts();
      renderPlaque();
    } else if (el.dataset.text) {
      design[el.dataset.text] = el.value;
      writeJSON(DRAFT_KEY, design);
      stage?.setDesign(design);
      renderPlaque();
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
  renderPlaque();
  try {
    const { PhoneStage } = await import('./phone3d.js'); // three.js 按需加载
    const host = $('#stage3d');
    host.innerHTML = '';
    stage = new PhoneStage(host);
    stage.setDesign(design);
    buildLabels();
    stage.onFrame = positionLabels;
    document.fonts?.ready.then(() => stage.setDesign(design));
    window.__studio = {
      stage,
      get design() {
        return design;
      },
    };
  } catch (err) {
    console.error(err);
    $('#stage3d').innerHTML = '<div class="loading">3D 加载失败（浏览器可能不支持 WebGL）</div>';
  }
}

boot();
