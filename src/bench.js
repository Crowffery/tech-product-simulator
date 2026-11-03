import { productEraOf, packOf } from './game/eras/index.js';
/**
 * 工程机跑分：玩家亲手点「开始跑分」，看五项子测试一项项跑完，
 * 总分滚动上涨，最后挤进跑分榜。
 *
 * 分数 = 芯片理论跑分 × 调校进度（研发里「性能」做到多少）
 */

const SUBS = [
  { id: 'cpu1', name: 'CPU 单核', w: 0.18 },
  { id: 'cpu8', name: 'CPU 多核', w: 0.26 },
  { id: 'gpu', name: 'GPU 图形', w: 0.3 },
  { id: 'ai', name: 'AI 算力', w: 0.14 },
  { id: 'mem', name: '内存 · 存储', w: 0.12 },
];
const KEYPAD_SUBS = [
  { id: 'drop', name: '跌落测试', w: 0.22 },
  { id: 'standby', name: '待机测试', w: 0.22 },
  { id: 'call', name: '通话音质', w: 0.2 },
  { id: 'signal', name: '信号强度', w: 0.18 },
  { id: 'keylife', name: '按键寿命', w: 0.18 },
];
const SUB_MS = 1500;
const W = 240;
const H = 135;

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

/** 各子测试的像素动画 */
const DRAW = {
  cpu1(g, t) {
    g.fillStyle = '#04140a';
    g.fillRect(0, 0, W, H);
    g.font = '8px monospace';
    for (let c = 0; c < 30; c++) {
      const speed = 30 + hash(c) * 50;
      for (let r = 0; r < 18; r++) {
        const y = ((r * 9 + t * speed) % (H + 10)) - 5;
        g.fillStyle = r === 0 ? '#d5f5e3' : `rgba(46,204,113,${0.15 + hash(c * 31 + r) * 0.6})`;
        g.fillText(hash(c + r + Math.floor(t * 6)) > 0.5 ? '1' : '0', c * 8 + 2, y);
      }
    }
    g.fillStyle = 'rgba(0,0,0,.6)';
    g.fillRect(60, 52, 120, 28);
    g.fillStyle = '#2ecc71';
    g.font = 'bold 10px monospace';
    g.textAlign = 'center';
    g.fillText(`求素数 #${Math.floor(t * 41231)}`, W / 2, 70);
    g.textAlign = 'left';
  },
  cpu8(g, t) {
    g.fillStyle = '#0a0f1e';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 8; i++) {
      const v = 0.55 + 0.45 * Math.abs(Math.sin(t * (3 + i * 0.7) + i));
      const x = 18 + i * 27;
      const h = Math.round(v * 92);
      for (let y = 0; y < h; y += 4) {
        g.fillStyle = y > 70 ? '#e74c3c' : y > 50 ? '#f5b041' : '#5dade2';
        g.fillRect(x, 112 - y, 20, 3);
      }
      g.fillStyle = '#85929e';
      g.font = '7px monospace';
      g.fillText(`C${i}`, x + 5, 124);
    }
  },
  gpu(g, t) {
    // 星空 + 视差山脉 + 像素飞船
    g.fillStyle = '#0b0820';
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) {
      const x = (hash(i) * W - t * (20 + hash(i + 9) * 60)) % W;
      g.fillStyle = hash(i + 3) > 0.7 ? '#fff' : '#7f8c8d';
      g.fillRect((x + W) % W, hash(i + 5) * 80, 1, 1);
    }
    const ridge = (base, amp, speed, col, seed) => {
      g.fillStyle = col;
      for (let x = 0; x < W; x += 2) {
        const k = x + t * speed;
        const y = base - Math.abs(Math.sin(k * 0.03 + seed) * amp + Math.sin(k * 0.11 + seed) * amp * 0.3);
        g.fillRect(x, y, 2, H - y);
      }
    };
    ridge(100, 26, 30, '#2e1a47', 1);
    ridge(118, 18, 70, '#4a235a', 4);
    ridge(132, 10, 140, '#6c3483', 7);
    const sy = 54 + Math.sin(t * 3) * 12;
    g.fillStyle = '#ecf0f1';
    g.fillRect(60, sy, 18, 6);
    g.fillRect(66, sy - 4, 6, 14);
    g.fillStyle = '#e67e22';
    g.fillRect(52 - Math.random() * 6, sy + 1, 8, 4);
    for (let i = 0; i < 4; i++) {
      const lx = ((t * 400 + i * 60) % 200) + 80;
      g.fillStyle = '#5dade2';
      g.fillRect(lx, sy + 2, 10, 2);
    }
    const fps = Math.round(110 + Math.sin(t * 5) * 8);
    g.fillStyle = '#f5b041';
    g.font = 'bold 9px monospace';
    g.fillText(`${fps} FPS`, 6, 12);
  },
  ai(g, t) {
    g.fillStyle = '#120a1e';
    g.fillRect(0, 0, W, H);
    const layers = [4, 7, 7, 3];
    const pos = layers.map((n, li) => Array.from({ length: n }, (_, i) => [40 + li * 54, 20 + (i + 0.5) * (96 / n)]));
    const wave = (t * 2.2) % layers.length;
    for (let li = 0; li < layers.length - 1; li++) {
      for (const a of pos[li])
        for (const b of pos[li + 1]) {
          const on = Math.abs(wave - li - 0.5) < 0.6;
          g.strokeStyle = on ? 'rgba(187,143,206,.55)' : 'rgba(255,255,255,.06)';
          g.beginPath();
          g.moveTo(a[0], a[1]);
          g.lineTo(b[0], b[1]);
          g.stroke();
        }
    }
    pos.forEach((L, li) =>
      L.forEach(([x, y], i) => {
        const on = Math.abs(wave - li) < 0.5 && hash(i + li * 10 + Math.floor(t * 3)) > 0.3;
        g.fillStyle = on ? '#f5b041' : '#8e44ad';
        g.fillRect(x - 3, y - 3, 7, 7);
      }),
    );
  },
  drop(g, t) {
    g.fillStyle = '#1a1408'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#3e2c1a'; g.fillRect(0, 112, W, 23);
    g.strokeStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.moveTo(30, 12); g.lineTo(30, 112); g.stroke();
    g.fillStyle = '#ecf0f1'; g.font = 'bold 9px monospace'; g.fillText('1.5m', 34, 18);
    const ph = (t % 1.5) / 1.5;
    const fall = Math.min(1, ph / 0.55);
    const bounce = ph > 0.55 ? Math.abs(Math.sin((ph - 0.55) * 18)) * Math.exp(-(ph - 0.55) * 8) * 18 : 0;
    const y = 14 + fall * fall * 58 - bounce;
    g.save(); g.translate(120, y + 20); g.rotate(fall * 0.8);
    g.fillStyle = '#3a3d46'; g.fillRect(-11, -20, 22, 40);
    g.fillStyle = '#9bbc0f'; g.fillRect(-8, -16, 16, 12);
    g.fillStyle = '#6b7280'; for (let i = 0; i < 6; i++) g.fillRect(-7 + (i % 3) * 5, 0 + Math.floor(i / 3) * 6, 4, 4);
    g.restore();
    if (ph > 0.55 && ph < 0.75) { g.fillStyle = 'rgba(245,176,65,.5)'; g.fillRect(96, 108, 48, 4); }
    g.fillStyle = '#82e0aa'; g.font = 'bold 9px monospace'; g.textAlign = 'right';
    g.fillText(`第 ${1 + Math.floor(t / 1.5)} 次 · 正常开机`, W - 8, 18); g.textAlign = 'left';
  },
  standby(g, t) {
    g.fillStyle = '#0a1a20'; g.fillRect(0, 0, W, H);
    const day = Math.min(20, 1 + Math.floor(t * 9));
    g.fillStyle = '#ecf0f1'; g.fillRect(36, 30, 64, 72);
    g.fillStyle = '#c0392b'; g.fillRect(36, 30, 64, 16);
    g.fillStyle = '#fff'; g.font = 'bold 9px monospace'; g.textAlign = 'center'; g.fillText('待机第', 68, 41);
    g.fillStyle = '#2c3e50'; g.font = 'bold 28px monospace'; g.fillText(String(day), 68, 86);
    g.strokeStyle = '#ecf0f1'; g.strokeRect(140, 40, 36, 60); g.fillStyle = '#ecf0f1'; g.fillRect(152, 36, 12, 4);
    const left = Math.max(0, 3 - Math.floor(day / 7));
    for (let i = 0; i < 3; i++) { g.fillStyle = i < left ? '#2ecc71' : '#1a3040'; g.fillRect(144, 84 - i * 18, 28, 14); }
    g.fillStyle = '#7ec8ff'; g.font = 'bold 10px monospace'; g.fillText('电量', 158, 116); g.textAlign = 'left';
  },
  call(g, t) {
    g.fillStyle = '#102010'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#c6e48b'; g.font = 'bold 10px monospace'; g.fillText('通话中 00:' + String(Math.floor(t * 20) % 60).padStart(2, '0'), 10, 18);
    for (let i = 0; i < 22; i++) {
      const h = 6 + Math.abs(Math.sin(t * 7 + i * 0.6) * Math.cos(t * 3 + i)) * 46;
      g.fillStyle = i % 2 ? '#82e0aa' : '#58d68d'; g.fillRect(12 + i * 10, 96 - h, 6, h * 2 - h);
    }
    g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(10, 96, W - 20, 1);
    g.fillStyle = '#c6e48b'; g.fillText('杂音 低 · 回声 无', 10, 122);
  },
  signal(g, t) {
    g.fillStyle = '#0a1520'; g.fillRect(0, 0, W, H);
    const spots = ['地下车库', '电梯', '山区'];
    const k = Math.min(2, Math.floor(t / 0.5));
    g.fillStyle = '#aed6f1'; g.font = 'bold 10px monospace'; g.fillText(`测试点：${spots[k]}`, 10, 18);
    for (let i = 0; i < 5; i++) {
      const on = i < 5 - k - (Math.sin(t * 6) > 0.6 ? 1 : 0);
      g.fillStyle = on ? '#5dade2' : '#1a3040';
      g.fillRect(60 + i * 26, 100 - i * 14, 18, 14 + i * 14);
    }
  },
  keylife(g, t) {
    g.fillStyle = '#181818'; g.fillRect(0, 0, W, H);
    const n = Math.min(100000, Math.floor(t * 70000));
    const down = Math.sin(t * 40) > 0;
    g.fillStyle = '#6b7280'; g.fillRect(100, 70 + (down ? 4 : 0), 40, 24);
    g.fillStyle = '#ddd'; g.font = 'bold 14px monospace'; g.textAlign = 'center'; g.fillText('5', 120, 88 + (down ? 4 : 0));
    g.fillStyle = '#9ca3af'; g.fillRect(116, 20, 8, 46 + (down ? 4 : 0));
    g.fillStyle = '#f5b041'; g.font = 'bold 12px monospace'; g.fillText(`${n.toLocaleString()} 次`, W / 2, 118);
    g.textAlign = 'left';
  },
  mem(g, t) {
    g.fillStyle = '#081a1a';
    g.fillRect(0, 0, W, H);
    const cols = 24;
    const rows = 11;
    const filled = Math.floor((t / (SUB_MS / 1000)) * cols * rows);
    for (let i = 0; i < cols * rows; i++) {
      const x = 12 + (i % cols) * 9;
      const y = 12 + Math.floor(i / cols) * 10;
      g.fillStyle = i < filled ? (hash(i) > 0.85 ? '#f5b041' : '#48c9b0') : '#123232';
      g.fillRect(x, y, 7, 8);
    }
  },
};

function miniPhone(g, x, y, color) {
  g.fillStyle = '#000';
  g.fillRect(x - 2, y - 2, 34, 62);
  g.fillStyle = color;
  g.fillRect(x, y, 30, 58);
  g.fillStyle = '#1b2a4a';
  g.fillRect(x + 3, y + 4, 24, 50);
  g.fillStyle = '#f5b041';
  g.fillRect(x + 6, y + 22, 18, 3);
}

/**
 * opts: { chipLabel, phoneName, color, theory, ratio, rivals:[{n,v}], heat, rewardable, onDone(result), play }
 */
export function openBench(opts) {
  const design = opts.design || opts.state?.design;
  const keypad = design && productEraOf(design) === 'keypad';
  const ACTIVE_SUBS = keypad ? KEYPAD_SUBS : SUBS;
  const titleText = keypad ? '工程机测试' : '工程机跑分';
  const startLabel = keypad ? '开始测试' : '开始跑分';

  const { chipLabel, phoneName, color, theory, ratio, rivals, heat = 1, rewardable, onDone, play = () => {} } = opts;
  const fmtScore = (v) => (keypad ? `${Math.round(v)} 分` : `${(v / 10000).toFixed(v >= 1e6 ? 0 : 1)}万`);
  const ov = document.createElement('div');
  ov.className = 'bench-ov';
  ov.innerHTML = `<div class="bench kbox">
      <div class="bench-h"><b>${titleText}</b><button type="button" class="bench-x" data-b="close">✕</button></div>
      <div class="bench-screen"><canvas width="${W}" height="${H}"></canvas>
        <div class="bench-total"><small>${keypad ? "综合可靠性" : "总分"}</small><b>0</b></div>
        <div class="bench-temp" hidden>TEMP <b>32</b>°C</div>
      </div>
      <div class="bench-body"></div>
    </div>`;
  document.body.appendChild(ov);
  const cv = ov.querySelector('canvas');
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  const body = ov.querySelector('.bench-body');
  const totalEl = ov.querySelector('.bench-total b');
  const tempEl = ov.querySelector('.bench-temp');
  let raf = 0;
  let dead = false;
  let result = null;
  const close = () => {
    dead = true;
    cancelAnimationFrame(raf);
    ov.remove();
    onDone?.(result);
  };

  const idle = () => {
    const loop = (now) => {
      if (dead || mode !== 'idle') return;
      const t = now / 1000;
      g.fillStyle = '#0d0b14';
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(245,176,65,${0.2 + hash(i) * 0.4})`;
        g.fillRect(hash(i) * W, (hash(i + 2) * H + t * 10 * (1 + hash(i))) % H, 1, 1);
      }
      miniPhone(g, W / 2 - 15, 34 + Math.sin(t * 2) * 3, color);
      g.fillStyle = '#ffe8b0';
      g.font = 'bold 9px monospace';
      g.textAlign = 'center';
      g.fillText('READY', W / 2, 118);
      g.textAlign = 'left';
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  };

  let mode = 'idle';
  const tune = Math.round(ratio * 100);
  body.innerHTML = keypad
    ? `<div class="bench-info"><div><small>测试机</small><b>${phoneName}</b></div><div><small>基带</small><b>${chipLabel}</b></div>
      <div><small>耐用调校</small><b>${tune}%</b></div></div>
    <p class="bench-tip">${tune < 60 ? '⚠ 耐用调校才做了一半，现在测会有几项不过关。' : tune < 95 ? '还有提升空间。' : '调校已经做满，可以送检了。'}${rewardable ? '<br/>本代第一份测试报告会登在《数码周刊》上。' : ''}</p>`
    : `<div class="bench-info"><div><small>测试机</small><b>${phoneName}</b></div><div><small>芯片</small><b>${chipLabel}</b></div>
      <div><small>性能调校</small><b>${tune}%</b></div></div>
    <p class="bench-tip">${tune < 60 ? '⚠ 调校才做了一半，现在跑分会偏低。' : tune < 95 ? '调校还没做满，分数还有上升空间。' : '调校已经做满，可以冲榜了。'}${rewardable ? '<br/>本代第一次正式跑分会被晒到数码论坛。' : ''}</p>`;
  body.insertAdjacentHTML('beforeend', `<button type="button" class="primary big bench-go" data-b="go">▶ ${startLabel}</button>`);
  idle();

  const run = () => {
    mode = 'run';
    play('benchStart');
    tempEl.hidden = keypad;
    const final = Math.round((theory * (0.55 + 0.45 * ratio) * (0.98 + Math.random() * 0.04)) / 100) * 100;
    const parts = ACTIVE_SUBS.map((s) => Math.round(final * s.w));
    parts[parts.length - 1] += final - parts.reduce((a, b) => a + b, 0);
    body.innerHTML = `<ul class="bench-list">${ACTIVE_SUBS.map((s) => `<li data-id="${s.id}"><span>${s.name}</span><i><b></b></i><em>—</em></li>`).join('')}</ul>`;
    const t0 = performance.now();
    const maxTemp = 38 + heat * 6 + Math.random() * 3;
    let lastIdx = -1;
    const loop = (now) => {
      if (dead) return;
      const el = Math.max(0, now - t0);
      const idx = Math.min(ACTIVE_SUBS.length - 1, Math.floor(el / SUB_MS));
      const local = (el - idx * SUB_MS) / 1000;
      const k = Math.min(1, (el - idx * SUB_MS) / SUB_MS);
      DRAW[ACTIVE_SUBS[idx].id](g, local);
      const done = parts.slice(0, idx).reduce((a, b) => a + b, 0);
      const cur = el >= SUB_MS * ACTIVE_SUBS.length ? final : Math.round(done + parts[idx] * k);
      totalEl.textContent = keypad ? String(cur) : cur.toLocaleString('en-US');
      tempEl.querySelector('b').textContent = Math.round(32 + (maxTemp - 32) * Math.min(1, el / (SUB_MS * ACTIVE_SUBS.length)));
      if (idx !== lastIdx) {
        if (lastIdx >= 0) {
          const li = body.querySelector(`[data-id="${ACTIVE_SUBS[lastIdx].id}"]`);
          li.classList.add('ok');
          li.querySelector('em').textContent = parts[lastIdx].toLocaleString('en-US');
          play('benchTick');
        } else {
          play('benchTick');
        }
        if (idx === 2) play('benchHeat');
        body.querySelector(`[data-id="${ACTIVE_SUBS[idx].id}"]`)?.classList.add('on');
        lastIdx = idx;
      }
      const bar = body.querySelector(`[data-id="${ACTIVE_SUBS[idx].id}"] b`);
      if (bar) bar.style.width = `${Math.round(k * 100)}%`;
      if (el < SUB_MS * ACTIVE_SUBS.length) {
        raf = requestAnimationFrame(loop);
      } else {
        const li = body.querySelector(`[data-id="${ACTIVE_SUBS[idx].id}"]`);
        li.classList.add('ok');
        li.querySelector('em').textContent = parts[idx].toLocaleString('en-US');
        play('benchTick');
        play('benchTotal');
        board(final);
      }
    };
    raf = requestAnimationFrame(loop);
  };

  const board = (final) => {
    mode = 'board';
    const all = [...rivals.map((r) => ({ ...r })), { n: phoneName, v: final, me: true }].sort((a, b) => b.v - a.v);
    const rank = all.findIndex((r) => r.me) + 1;
    const beaten = all.length - rank;
    result = { score: final, rank, beaten, total: all.length };
    const max = all[0].v;
    play(rank === 1 ? 'benchWin' : 'benchLose');
    // 结果画面：奖杯 / 冷汗
    const t0 = performance.now();
    const loop = (now) => {
      if (dead || mode !== 'board') return;
      const t = (now - t0) / 1000;
      g.fillStyle = rank === 1 ? '#2a1a05' : '#0d0b14';
      g.fillRect(0, 0, W, H);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 + t * 0.4;
        g.fillStyle = rank === 1 ? 'rgba(245,176,65,.18)' : 'rgba(93,109,126,.15)';
        g.beginPath();
        g.moveTo(W / 2, 64);
        g.lineTo(W / 2 + Math.cos(a) * 200, 64 + Math.sin(a) * 200);
        g.lineTo(W / 2 + Math.cos(a + 0.12) * 200, 64 + Math.sin(a + 0.12) * 200);
        g.fill();
      }
      g.font = '40px sans-serif';
      g.textAlign = 'center';
      g.fillText(rank === 1 ? 'NO.1' : rank === 2 ? 'NO.2' : '…', W / 2, 74 + Math.sin(t * 3) * 3);
      g.fillStyle = '#ffe8b0';
      g.font = 'bold 11px sans-serif';
      g.fillText(rank === 1 ? (keypad ? '同价位第一' : '遥遥领先！') : `同期第 ${rank} 名`, W / 2, 112);
      g.textAlign = 'left';
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    body.innerHTML = `<div class="bench-board">${all
      .map(
        (r, i) => `<div class="bb-row ${r.me ? 'me' : ''}" style="--d:${r.me ? 0.5 : i * 0.08}s"><span class="bb-rank">${i + 1}</span><span class="bb-n">${r.n}</span>
          <i><b style="--w:${Math.round((r.v / max) * 100)}%"></b></i><em>${fmtScore(r.v)}</em></div>`,
      )
      .join('')}</div>
      <p class="bench-verdict">${keypad
        ? rank === 1 ? '测试报告登上《数码周刊》，经销商开始打电话订货。' : beaten > 0 ? `超过了 ${beaten} 款同价位手机，还不是第一。` : '几项测试都不如同价位的竞品，经销商在观望。'
        : rank === 1 ? '跑分截图在数码论坛刷屏，#遥遥领先# 冲上热搜。' : beaten > 0 ? `超过了 ${beaten} 款竞品，还不是第一。` : '被竞品全面压制，论坛开始玩梗了……'}${ratio < 0.95 ? `<br/><small>${keypad ? '耐用调校做满后还能再提高。' : '调校做满后还能再涨一截。'}</small>` : ''}</p>
      <div class="bench-btns"><button type="button" data-b="again">↻ ${keypad ? '再测一次' : '再跑一次'}</button><button type="button" class="primary" data-b="close">收好成绩 ✓</button></div>`;
  };

  ov.addEventListener('click', (e) => {
    const b = e.target.closest('[data-b]')?.dataset.b;
    if (!b) return;
    if (b === 'close') close();
    else if (b === 'go' || b === 'again') {
      cancelAnimationFrame(raf);
      run();
    }
  });
}
