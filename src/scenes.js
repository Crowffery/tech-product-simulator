/**
 * 分阶段像素场景（240×150 逻辑像素，最近邻放大）
 * 每个阶段一个场景，场景内容随游戏状态变化：
 *   title 车库 · plan 会议室 · supply 供应商码头 · dev 研发实验室（含事故变体）
 *   factory 量产工厂 · launch 发布会后台 · score 舞台定格 · sales 门店 · next 年会机型墙 · bust 倒闭
 */

const W = 240;
const H = 150;

// ═════════════════════════ 小工具 ═════════════════════════

const SKIN = ['#f5cba7', '#e0ac69', '#c68642', '#f1d1b5'];
const HAIR = ['#2d3436', '#6d4c41', '#f1c40f', '#d35400', '#8e44ad', '#16a085'];
const SHIRT = ['#e17055', '#0984e3', '#fd79a8', '#00b894', '#fdcb6e', '#6c5ce7', '#ffffff', '#e67e22'];

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  r = f(r);
  g = f(g);
  b = f(b);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** 3×5 像素字（数字和少量符号） */
const FONT = {
  0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001',
  5: '111100111001111', 6: '111100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001111',
  '+': '000010111010000', '-': '000000111000000', '%': '101001010100101', M: '101111111101101', '?': '111001011000010',
  '!': '010010010000010', 'S': '111100111001111', A: '010101111101101', B: '110101110101110', C: '111100100100111',
  ':': '000010000010000', '¥': '101101010111010', ' ': '000000000000000', 'x': '000101010101000', '/': '001001010100100', 'L': '100100100100111', 'V': '101101101101010',
};

export class SceneView {
  constructor(host) {
    this.host = host;
    this.canvas = document.createElement('canvas');
    this.canvas.width = W;
    this.canvas.height = H;
    this.canvas.className = 'scene-canvas';
    host.appendChild(this.canvas);
    this.g = this.canvas.getContext('2d');
    this.g.imageSmoothingEnabled = false;
    this.name = 'title';
    this.data = {};
    this.t = 0;
    this.sceneT = 0;
    this.parts = [];
    this.floats = [];
    this._last = performance.now();
    this._loop = this._loop.bind(this);
    this.raf = requestAnimationFrame(this._loop);
  }

  set(name, data = {}) {
    if (name !== this.name) {
      this.sceneT = 0;
      this.parts = [];
      this.floats = [];
    }
    this.name = name;
    this.data = data;
  }

  /** 场景内的一次性特效：month（研发火花）、cash、confetti 等 */
  pulse(kind, payload = {}) {
    if (kind === 'month') {
      const st = STATIONS;
      for (const [id, v] of Object.entries(payload.gains || {})) {
        const s = st.find((x) => x.id === id);
        if (!s || !v) continue;
        this.burst(s.x + 16, 70, 10, ['#ffe08a', '#fff', '#8fe3ff']);
        this.floats.push({ x: s.x + 12, y: 52, text: `+${v}`, c: '#7dff9a', life: 1.2 });
      }
    } else if (kind === 'confetti') {
      for (let i = 0; i < 60; i++)
        this.parts.push({ x: Math.random() * W, y: -Math.random() * 40, vx: (Math.random() - 0.5) * 20, vy: 20 + Math.random() * 30, life: 3, c: SHIRT[i % SHIRT.length], g: 4 });
    } else if (kind === 'cash') {
      this.floats.push({ x: payload.x ?? 120, y: payload.y ?? 60, text: payload.text ?? '+', c: '#ffe08a', life: 1.4 });
    }
  }

  burst(x, y, n, colors) {
    for (let i = 0; i < n; i++) {
      this.parts.push({ x, y, vx: (Math.random() - 0.5) * 50, vy: -20 - Math.random() * 40, life: 0.5 + Math.random() * 0.5, c: colors[i % colors.length], g: 90 });
    }
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.dead = true;
    this.canvas.remove();
  }

  _loop(now) {
    if (this.dead) return;
    const dt = Math.min(0.05, (now - this._last) / 1000);
    this._last = now;
    this.t += dt;
    this.sceneT += dt;
    const g = this.g;
    g.clearRect(0, 0, W, H);
    const fn = SCENES[this.name] || SCENES.title;
    fn(this, g, this.data);
    // 粒子
    this.parts = this.parts.filter((p) => (p.life -= dt) > 0);
    for (const p of this.parts) {
      p.vy += (p.g ?? 60) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      g.fillStyle = p.c;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.s || 1, p.s || 1);
    }
    this.floats = this.floats.filter((f) => (f.life -= dt) > 0);
    for (const f of this.floats) {
      f.y -= 14 * dt;
      this.text(f.text, Math.round(f.x), Math.round(f.y), f.c, '#000');
    }
    this.raf = requestAnimationFrame(this._loop);
  }

  // —— 绘制原语 ——
  rect(x, y, w, h, c) {
    this.g.fillStyle = c;
    this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  text(str, x, y, c = '#fff', outline = null, scale = 1) {
    const g = this.g;
    const draw = (ox, oy, col) => {
      g.fillStyle = col;
      let cx = x + ox;
      for (const ch of String(str)) {
        const f = FONT[ch] || FONT[ch.toUpperCase?.()] || FONT['?'];
        for (let i = 0; i < 15; i++) if (f[i] === '1') g.fillRect(cx + (i % 3) * scale, y + oy + Math.floor(i / 3) * scale, scale, scale);
        cx += 4 * scale;
      }
    };
    if (outline) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) draw(ox, oy, outline);
    draw(0, 0, c);
  }

  /** 像素小人：pose = idle | walk | type | cheer | panic | sit */
  person(x, y, seed, pose = 'idle', facing = 1) {
    const t = this.t;
    const skin = SKIN[seed % SKIN.length];
    const hair = HAIR[(seed * 3) % HAIR.length];
    const shirt = SHIRT[(seed * 5) % SHIRT.length];
    const bob = pose === 'walk' ? Math.round(Math.abs(Math.sin(t * 10 + seed)) * 1) : pose === 'cheer' ? Math.round(Math.abs(Math.sin(t * 8 + seed)) * 2) : 0;
    const shake = pose === 'panic' ? Math.round(Math.sin(t * 30 + seed)) : 0;
    const X = x + shake;
    const Y = y - bob;
    // 腿
    if (pose !== 'sit') {
      const step = pose === 'walk' ? (Math.floor(t * 8 + seed) % 2) : 0;
      this.rect(X + 1, Y + 9, 2, 3 - step, '#2d3436');
      this.rect(X + 4, Y + 9, 2, 3 - (1 - step), '#2d3436');
    } else {
      this.rect(X + 1, Y + 9, 5, 2, '#2d3436');
    }
    // 身体
    this.rect(X, Y + 5, 7, 5, shirt);
    this.rect(X, Y + 5, 7, 1, shade(shirt, 0.25));
    // 手臂
    if (pose === 'cheer' || pose === 'panic') {
      const up = Math.floor(t * (pose === 'panic' ? 12 : 6) + seed) % 2;
      this.rect(X - 1, Y + 1 + up, 1, 4, skin);
      this.rect(X + 7, Y + 2 - up, 1, 4, skin);
    } else if (pose === 'type') {
      const tap = Math.floor(t * 12 + seed) % 2;
      this.rect(X + (facing > 0 ? 6 : -1), Y + 6 + tap, 2, 1, skin);
    } else {
      this.rect(X - 1, Y + 6, 1, 3, shade(shirt, -0.2));
      this.rect(X + 7, Y + 6, 1, 3, shade(shirt, -0.2));
    }
    // 头
    this.rect(X + 1, Y, 5, 5, skin);
    this.rect(X + 1, Y - 1, 5, 2, hair);
    this.rect(facing > 0 ? X + 1 : X + 5, Y, 1, 2, hair);
    // 眼
    const blink = Math.floor(t * 0.7 + seed) % 6 === 0 && (t * 10) % 1 < 0.3;
    if (!blink) {
      this.rect(X + (facing > 0 ? 3 : 2), Y + 2, 1, 1, '#1b1b1b');
      this.rect(X + (facing > 0 ? 5 : 4), Y + 2, 1, 1, '#1b1b1b');
    }
    if (pose === 'panic') this.rect(X + 3, Y + 4, 2, 1, '#1b1b1b');
  }

  /** 小手机（背面）：主色 + 镜头模组 */
  phone(x, y, w, h, color, opts = {}) {
    this.rect(x, y, w, h, '#1b1b1b');
    this.rect(x + 1, y + 1, w - 2, h - 2, color);
    this.rect(x + 1, y + 1, w - 2, 1, shade(color, 0.3));
    if (opts.screen) {
      this.rect(x + 1, y + 1, w - 2, h - 2, '#101523');
      this.rect(x + 2, y + 2, w - 4, Math.max(1, Math.floor((h - 4) / 3)), shade(color, 0.2));
      return;
    }
    this.rect(x + 2, y + 2, Math.max(2, Math.floor(w / 3)), Math.max(2, Math.floor(h / 4)), '#2a2c33');
    this.rect(x + 2, y + 2, 1, 1, '#8fe3ff');
  }

  bubble(x, y, icon) {
    this.rect(x - 1, y - 1, 13, 11, '#1b1b1b');
    this.rect(x, y, 11, 9, '#fffaf0');
    this.rect(x + 3, y + 9, 2, 2, '#fffaf0');
    this.rect(x + 3, y + 11, 1, 1, '#1b1b1b');
    ICONS[icon]?.(this, x + 2, y + 1);
  }

  sky(y0, y1, month = 1) {
    const night = month % 4 === 0;
    const top = night ? '#1d2440' : ['#7fb3d5', '#f5b041', '#85c1e9', '#a569bd'][month % 4];
    const bot = night ? '#3a4a7a' : ['#d6eaf8', '#fad7a0', '#d4e6f1', '#f5cba7'][month % 4];
    const n = 4;
    for (let i = 0; i < n; i++) this.rect(0, y0 + ((y1 - y0) * i) / n, W, (y1 - y0) / n + 1, mix(top, bot, i / (n - 1)));
    return night;
  }

  /** 彩蛋：一只橘猫偶尔溜过（约每 18 秒一次） */
  cat(y, seed = 0) {
    const period = 18;
    const T = (this.t + seed * 7) % period;
    if (T > 9) return;
    const dir = Math.floor((this.t + seed * 7) / period) % 2 ? 1 : -1;
    const x = dir > 0 ? -12 + T * 30 : W + 12 - T * 30;
    const step = Math.floor(this.t * 8) % 2;
    const c = '#e67e22';
    this.rect(x, y, 9, 4, c);
    this.rect(x + (dir > 0 ? 8 : -3), y - 3, 4, 4, c);
    this.rect(x + (dir > 0 ? 8 : -3), y - 4, 1, 1, c);
    this.rect(x + (dir > 0 ? 11 : 0), y - 4, 1, 1, c);
    this.rect(x + (dir > 0 ? 10 : -2), y - 2, 1, 1, '#1b1b1b');
    this.rect(x + (dir > 0 ? -2 : 9), y - 2 - step, 2, 1, c);
    this.rect(x + 1, y + 4, 1, 2 - step, c);
    this.rect(x + 7, y + 4, 1, 1 + step, c);
    for (let i = 1; i < 8; i += 3) this.rect(x + i, y, 1, 4, '#ca6f1e');
  }

  /** 天气：按月份下雨（4～6 月）或下雪（12～2 月） */
  weather(month, yMax = H) {
    const mo = ((month - 1) % 12) + 1;
    const rain = mo >= 4 && mo <= 6;
    const snow = mo === 12 || mo <= 2;
    if (!rain && !snow) return;
    for (let i = 0; i < (rain ? 50 : 36); i++) {
      const sp = rain ? 120 : 18;
      const x = (hash(i) * W + (rain ? this.t * 40 : Math.sin(this.t + i) * 6)) % W;
      const y = (hash(i + 11) * yMax + this.t * sp) % yMax;
      if (rain) this.rect(x, y, 1, 3, '#aed6f1');
      else this.rect(x, y, 1, 1, '#ffffff');
    }
  }

  floorTiles(y, a = '#c4b59a', b = '#b8a88a') {
    for (let yy = y; yy < H; yy += 8) for (let xx = 0; xx < W; xx += 8) this.rect(xx, yy, 8, 8, ((xx + yy) / 8) % 2 ? a : b);
  }
}

function mix(a, b, k) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

// 气泡里的 7×7 小图标
const ICONS = {
  bulb: (s, x, y) => {
    s.rect(x + 2, y, 3, 1, '#f1c40f');
    s.rect(x + 1, y + 1, 5, 3, '#f9e79f');
    s.rect(x + 2, y + 4, 3, 1, '#f1c40f');
    s.rect(x + 2, y + 5, 3, 2, '#7f8c8d');
  },
  coin: (s, x, y) => {
    s.rect(x + 1, y + 1, 5, 5, '#f1c40f');
    s.rect(x + 3, y + 2, 1, 3, '#b7950b');
  },
  chart: (s, x, y) => {
    s.rect(x, y + 5, 2, 2, '#27ae60');
    s.rect(x + 2, y + 3, 2, 4, '#27ae60');
    s.rect(x + 4, y + 1, 2, 6, '#27ae60');
  },
  phone: (s, x, y) => {
    s.rect(x + 1, y, 5, 7, '#2d3436');
    s.rect(x + 2, y + 1, 3, 4, '#74b9ff');
  },
  heart: (s, x, y) => {
    s.rect(x, y + 1, 3, 2, '#e74c3c');
    s.rect(x + 4, y + 1, 3, 2, '#e74c3c');
    s.rect(x + 1, y + 3, 5, 2, '#e74c3c');
    s.rect(x + 2, y + 5, 3, 1, '#e74c3c');
  },
  warn: (s, x, y) => {
    s.rect(x + 3, y, 1, 1, '#e74c3c');
    s.rect(x + 2, y + 1, 3, 2, '#e74c3c');
    s.rect(x + 1, y + 3, 5, 2, '#e74c3c');
    s.rect(x, y + 5, 7, 2, '#e74c3c');
    s.rect(x + 3, y + 2, 1, 3, '#fff');
  },
  zzz: (s, x, y) => s.text('Z', x + 1, y + 1, '#5d6d7e'),
  money: (s, x, y) => s.text('¥', x + 1, y + 1, '#27ae60'),
};

// ═════════════════════════ 研发站位 ═════════════════════════

const STATIONS = [
  { id: 'perf', x: 8 },
  { id: 'design', x: 54 },
  { id: 'camera', x: 100 },
  { id: 'battery', x: 146 },
  { id: 'os', x: 192 },
];

// ═════════════════════════ 场景 ═════════════════════════

const SCENES = {
  // —— 标题：夜晚车库创业 ——
  title(s, g, d) {
    s.rect(0, 0, W, H, '#141a33');
    for (let i = 0; i < 40; i++) {
      const tw = Math.sin(s.t * 2 + i) > 0.6 ? '#ffffff' : '#7f8fa6';
      s.rect(hash(i) * W, hash(i + 9) * 70, 1, 1, tw);
    }
    // 远处城市
    for (let i = 0; i < 16; i++) {
      const bw = 10 + hash(i) * 12;
      const bh = 20 + hash(i + 3) * 40;
      const bx = i * 16 - 4;
      s.rect(bx, 100 - bh, bw, bh, '#232b4d');
      for (let wy = 104 - bh; wy < 96; wy += 5) for (let wx = bx + 2; wx < bx + bw - 2; wx += 4) if (hash(wx * wy + i) > 0.6) s.rect(wx, wy, 1, 2, '#f7dc6f');
    }
    s.rect(0, 100, W, 50, '#2c2c34');
    // 车库
    s.rect(70, 58, 100, 48, '#5d4037');
    s.rect(64, 52, 112, 8, '#3e2723');
    s.rect(80, 68, 80, 38, '#ffe08a');
    for (let y = 68; y < 106; y += 4) s.rect(80, y, 80, 1, '#f5b041');
    s.rect(80, 68, 80, 14, '#3a2a1a');
    // 车库里的人
    s.rect(96, 92, 48, 4, '#8b5a2b');
    s.person(100, 80, 1, 'type', 1);
    s.person(130, 80, 4, 'cheer', -1);
    s.phone(116, 86, 8, 6, '#8fd3b6', { screen: true });
    // 光
    g.fillStyle = 'rgba(255,224,138,0.18)';
    g.beginPath();
    g.moveTo(80, 106);
    g.lineTo(160, 106);
    g.lineTo(196, 150);
    g.lineTo(44, 150);
    g.fill();
  },

  // —— 企划：会议室 ——
  plan(s, g, d) {
    officeBack(s, g, d);
    // 白板
    s.rect(10, 12, 110, 52, '#2c3e50');
    s.rect(12, 14, 106, 48, '#fdfefe');
    s.text('?', 16, 17, '#5d6d7e');
    const cols = [
      { c: '#f9e79f', n: d.positioning ? 2 : 1 },
      { c: '#f5b7b1', n: Math.max(1, d.points || 2) },
      { c: '#aed6f1', n: d.price ? 2 : 1 },
    ];
    cols.forEach((col, i) => {
      for (let k = 0; k < col.n; k++) {
        const x = 20 + i * 32;
        const y = 26 + k * 12 + Math.round(Math.sin(s.t * 2 + i + k) * 0.6);
        s.rect(x, y, 22, 9, col.c);
        s.rect(x + 2, y + 2, 14, 1, '#7f8c8d');
        s.rect(x + 2, y + 5, 10, 1, '#7f8c8d');
      }
    });
    // 投影屏上的产品轮廓
    const pw = { flagship: 14, pro: 14, mainstream: 12, minimal: 10 }[d.positioning] || 12;
    s.rect(132, 70, 0, 0, '#000');
    // 桌子
    s.floorTiles(100, '#8e9eab', '#7f8f9c');
    s.rect(46, 96, 148, 12, '#6e4b2a');
    s.rect(46, 96, 148, 3, '#a0703c');
    s.rect(52, 108, 4, 12, '#4a3020');
    s.rect(184, 108, 4, 12, '#4a3020');
    s.phone(116, 90, pw, Math.round(pw * 0.6), d.color || '#8fd3b6');
    // 人：办公室越大，开会的人越多
    const icons = ['bulb', 'coin', 'chart', 'phone'];
    const seats = [[62, 80, 2], [178, 80, 5], [96, 78, 7], [146, 78, 3], [30, 86, 9], [206, 86, 11]].slice(0, [3, 4, 5, 6][(d.office || 1) - 1]);
    seats.forEach(([x, y, seed], i) => {
      s.person(x, y, seed, Math.floor(s.t + i) % 3 === 0 ? 'cheer' : 'idle', i < 2 ? 1 : -1);
      if (Math.floor(s.t * 0.8 + i * 1.3) % 4 === i % 4) s.bubble(x - 2, y - 14, icons[(Math.floor(s.t * 0.5) + i) % icons.length]);
    });
    // 墙上的时钟
    s.rect(140, 20, 14, 14, '#2c3e50');
    s.rect(141, 21, 12, 12, '#fdfefe');
    const a = s.t * 2;
    s.rect(147, 27, 1, 1, '#000');
    s.rect(147 + Math.round(Math.cos(a) * 4), 27 + Math.round(Math.sin(a) * 4), 1, 1, '#e74c3c');
    // 电视：竞品快讯
    s.rect(124, 66, 26, 18, '#1b1b1b');
    const brands = ['#3949ab', '#26a69a', '#ef6c00'];
    const bi = Math.floor(s.t / 2.5) % 3;
    s.rect(126, 68, 22, 14, '#0b1a2a');
    s.rect(128, 70, 8, 8, brands[bi]);
    s.rect(138, 70, 8, 2, '#ecf0f1');
    s.rect(138, 74, 6, 1, '#7f8c8d');
    if (Math.floor(s.t * 3) % 2) s.rect(126, 80, 22, 2, '#c0392b');
    if ((d.office || 1) >= 4) robotDog(s, 112);
    s.cat(108, 1);
    // 盆栽
    s.rect(224, 104, 10, 10, '#a0522d');
    s.rect(222, 92, 14, 12, '#27ae60');
    s.rect(226, 88, 6, 6, '#2ecc71');
  },

  // —— 供应商码头 ——
  supply(s, g, d) {
    s.sky(0, 60, d.month || 1);
    // 吊车与集装箱
    s.rect(8, 10, 4, 60, '#e67e22');
    s.rect(8, 10, 70, 4, '#e67e22');
    const hook = 20 + Math.round(Math.sin(s.t * 0.8) * 8);
    s.rect(60, 14, 1, hook, '#2c3e50');
    s.rect(54, 14 + hook, 14, 8, '#c0392b');
    const cont = ['#2980b9', '#c0392b', '#27ae60', '#f39c12'];
    for (let i = 0; i < 8; i++) {
      const x = 150 + (i % 4) * 22;
      const y = 44 - Math.floor(i / 4) * 12;
      s.rect(x, y, 21, 11, cont[i % 4]);
      for (let k = 2; k < 20; k += 3) s.rect(x + k, y + 1, 1, 9, shade(cont[i % 4], -0.2));
    }
    s.rect(0, 56, W, 4, '#7f8c8d');
    s.floorTiles(60, '#95a5a6', '#8c9b9c');
    // 三个摊位
    const booths = [
      { id: 'cheap', x: 14, roof: '#e67e22', body: '#d7ccc8', name: '便宜' },
      { id: 'balanced', x: 90, roof: '#2980b9', body: '#ecf0f1', name: '均衡' },
      { id: 'premium', x: 166, roof: '#f1c40f', body: '#d6eaf8', name: '稳' },
    ];
    booths.forEach((b, i) => {
      const sel = d.supplierId === b.id;
      if (sel) {
        g.fillStyle = 'rgba(255,240,180,0.28)';
        g.beginPath();
        g.moveTo(b.x + 30, 0);
        g.lineTo(b.x - 4, 118);
        g.lineTo(b.x + 64, 118);
        g.fill();
      }
      const wob = b.id === 'cheap' ? Math.round(Math.sin(s.t * 3) * 1) : 0;
      // 屋顶
      for (let k = 0; k < 60; k += 6) s.rect(b.x + k, 70 + wob, 6, 8, k % 12 ? b.roof : shade(b.roof, 0.35));
      if (b.id === 'cheap') s.rect(b.x + 30, 72, 8, 4, '#8d6e63'); // 补丁
      if (b.id === 'premium') {
        s.rect(b.x, 68, 60, 2, '#f9e79f');
        if (Math.sin(s.t * 3) > 0.7) s.rect(b.x + 50, 66, 2, 2, '#fff');
      }
      s.rect(b.x + 2, 78, 56, 26, b.body);
      s.rect(b.x, 104, 60, 6, shade(b.body, -0.25));
      s.rect(b.x + 6, 94, 48, 10, shade(b.roof, -0.3));
      s.person(b.x + 26, 82, 10 + i * 3, sel ? 'cheer' : 'idle', 1);
      // 小货箱
      for (let k = 0; k < 3; k++) s.rect(b.x + 6 + k * 8, 88, 6, 6, b.id === 'cheap' ? '#bcaaa4' : '#f5f5f5');
      if (sel) {
        const ay = 58 + Math.round(Math.sin(s.t * 6) * 2);
        s.rect(b.x + 27, ay, 6, 3, '#e74c3c');
        s.rect(b.x + 28, ay + 3, 4, 2, '#e74c3c');
        s.rect(b.x + 29, ay + 5, 2, 1, '#e74c3c');
      }
    });
    s.weather(d.month || 1, 120);
    // 我方代表 + 货车
    const rep = d.supplierId ? { cheap: 40, balanced: 116, premium: 192 }[d.supplierId] : 120 + Math.sin(s.t) * 40;
    s.person(Math.round(rep), 116, 0, d.supplierId ? 'cheer' : 'walk', -1);
    const tx = ((s.t * 30) % (W + 80)) - 60;
    s.rect(tx, 126, 40, 14, '#ecf0f1');
    s.rect(tx + 40, 130, 14, 10, '#c0392b');
    s.rect(tx + 44, 132, 6, 4, '#85c1e9');
    s.rect(tx + 6, 140, 6, 4, '#2d3436');
    s.rect(tx + 40, 140, 6, 4, '#2d3436');
    // 备货堆
    const boxes = { safe: 3, normal: 6, aggressive: 10 }[d.stockId] || 6;
    for (let i = 0; i < boxes; i++) {
      const x = 204 + (i % 3) * 10;
      const y = 136 - Math.floor(i / 3) * 8;
      s.rect(x, y, 9, 7, '#d7b98e');
      s.rect(x, y + 3, 9, 1, '#a1887f');
    }
  },

  // —— 研发实验室 ——
  dev(s, g, d) {
    s.rect(0, 0, W, 100, '#34495e');
    for (let x = 0; x < W; x += 12) for (let y = 6; y < 40; y += 12) s.rect(x + 4, y, 1, 1, '#2c3e50');
    s.rect(0, 40, W, 2, '#2c3e50');
    s.floorTiles(100, '#d5dbdb', '#c8cfcf');
    // 日历
    s.rect(108, 6, 24, 20, '#fdfefe');
    s.rect(108, 6, 24, 6, '#e74c3c');
    s.text(`M${d.month || 1}`, 111, 14, '#2c3e50');
    const ev = d.event;
    STATIONS.forEach((st, i) => {
      const p = d.slots?.[st.id] ?? 0;
      const cap = d.caps?.[st.id] ?? 100;
      const x = st.x;
      // 桌子
      s.rect(x, 92, 40, 6, '#7f8c8d');
      s.rect(x, 92, 40, 2, '#bdc3c7');
      s.rect(x + 2, 98, 3, 14, '#566573');
      s.rect(x + 35, 98, 3, 14, '#566573');
      STATION_DRAW[st.id](s, x, p, cap, ev);
      // 进度条
      s.rect(x, 46, 40, 6, '#1b2631');
      s.rect(x + 1, 47, Math.round((38 * p) / 100), 4, p >= cap ? '#f1c40f' : '#2ecc71');
      s.rect(x + 1 + Math.round((38 * cap) / 100), 45, 1, 8, '#e74c3c');
      s.text(String(p), x + 1, 38, '#ecf0f1');
      const hot = (ev === 'chip_short' && st.id === 'perf') || (ev === 'yield' && (st.id === 'battery' || st.id === 'design')) || (ev === 'hinge' && st.id === 'design');
      const pose = hot ? 'panic' : p >= cap ? 'cheer' : 'type';
      s.person(x + 16, 100, i * 2 + 1, pose, 1);
      if (hot && Math.floor(s.t * 4) % 2) s.rect(x + 18, 30, 4, 4, '#e74c3c');
    });
    const lv = d.office || 1;
    if (lv === 1) {
      for (let x = 0; x < W; x += 7) s.rect(x, 0, 1, 40, '#2c3e50');
      for (let i = 0; i < 4; i++) {
        s.rect(214 + (i % 2) * 12, 124 - Math.floor(i / 2) * 9, 11, 8, '#c8a26b');
        s.rect(214 + (i % 2) * 12, 127 - Math.floor(i / 2) * 9, 11, 1, '#9c7a4a');
      }
    }
    if (lv >= 3) {
      s.rect(206, 4, 30, 34, '#1b2631');
      for (let i = 0; i < 6; i++) for (let k = 0; k < 4; k++) s.rect(209 + k * 7, 7 + i * 5, 4, 2, (Math.floor(s.t * 8) + i + k) % 5 ? '#2ecc71' : '#58d68d');
    }
    if (lv >= 4) {
      const dx = 60 + Math.sin(s.t * 0.7) * 50;
      const dy = 14 + Math.sin(s.t * 1.9) * 3;
      s.rect(dx, dy, 12, 3, '#2c3e50');
      s.rect(dx - 3, dy - 1, 5, 1, Math.floor(s.t * 20) % 2 ? '#bdc3c7' : '#7f8c8d');
      s.rect(dx + 10, dy - 1, 5, 1, Math.floor(s.t * 20) % 2 ? '#7f8c8d' : '#bdc3c7');
      s.rect(dx + 5, dy + 3, 2, 2, Math.floor(s.t * 3) % 2 ? '#e74c3c' : '#2ecc71');
    }
    if (d.rivalSoon) {
      const y0 = 6 + Math.round(Math.sin(s.t * 2) * 1);
      s.rect(150, y0, 26, 30, '#fdfefe');
      s.rect(152, y0 + 2, 22, 16, '#3949ab');
      s.rect(158, y0 + 5, 10, 10, '#c5cae9');
      s.text('VS', 155, y0 + 21, '#c0392b');
      s.rect(162, y0 - 1, 2, 2, '#e74c3c');
    }
    s.cat(124, 2);
    // 事故层
    if (ev === 'leak' || ev === 'spyshot') {
      s.rect(196, 4, 40, 30, '#85c1e9');
      s.rect(196, 4, 40, 2, '#2c3e50');
      s.person(212, 18, 9, 'idle', -1);
      if (Math.floor(s.t * 3) % 3 === 0) {
        s.rect(206, 16, 6, 6, '#ffffff');
        g.fillStyle = 'rgba(255,255,255,0.15)';
        g.fillRect(0, 0, W, H);
      }
    }
    if (ev === 'yield') {
      for (let i = 0; i < 3; i++) s.parts.push({ x: 160 + Math.random() * 20, y: 78, vx: (Math.random() - 0.5) * 6, vy: -12, life: 1.2, c: '#95a5a6', g: -2, s: 2 });
    }
    if (ev) {
      g.fillStyle = `rgba(231,76,60,${0.08 + 0.08 * Math.abs(Math.sin(s.t * 4))})`;
      g.fillRect(0, 0, W, H);
    }
  },

  // —— 量产工厂 ——
  factory(s, g, d) {
    s.rect(0, 0, W, H, '#1f2430');
    for (let x = 10; x < W; x += 50) {
      s.rect(x + 8, 0, 2, 10, '#7f8c8d');
      s.rect(x, 10, 18, 4, '#f5b041');
      g.fillStyle = 'rgba(255,220,150,0.08)';
      g.beginPath();
      g.moveTo(x, 14);
      g.lineTo(x + 18, 14);
      g.lineTo(x + 34, 96);
      g.lineTo(x - 16, 96);
      g.fill();
    }
    s.rect(0, 96, W, 54, '#2c3340');
    for (let x = 0; x < W; x += 16) s.rect(x, 100, 8, 2, '#f1c40f');
    // 传送带
    const off = Math.floor(s.t * 24) % 8;
    s.rect(0, 84, 200, 10, '#3d4555');
    for (let x = -8 + off; x < 200; x += 8) s.rect(x, 85, 4, 1, '#5d6779');
    for (let x = 4; x < 200; x += 12) s.rect(x, 94, 6, 6, '#566070');
    // 手机在带子上
    const prog = Math.min(1, s.sceneT / 4.5);
    const spacing = 26;
    for (let i = 0; i < 9; i++) {
      const x = ((s.t * 24 + i * spacing) % 210) - 10;
      const stage = x < 70 ? 0 : x < 140 ? 1 : 2; // 裸板 → 装壳 → 成品
      if (stage === 0) {
        s.rect(x, 76, 10, 8, '#1e7a46');
        s.rect(x + 3, 78, 4, 4, '#2b2e36');
      } else s.phone(x, 74, 10, 10, stage === 2 ? d.color || '#8fd3b6' : '#95a5a6');
    }
    // 机械臂
    [70, 140].forEach((ax, i) => {
      const down = Math.max(0, Math.sin(s.t * 3 + i * 1.6));
      const y = 30 + down * 30;
      s.rect(ax - 2, 0, 6, 28, '#e67e22');
      s.rect(ax, 28, 2, y - 28, '#bdc3c7');
      s.rect(ax - 6, y, 14, 6, '#e67e22');
      s.rect(ax - 4, y + 6, 3, 4, '#7f8c8d');
      s.rect(ax + 3, y + 6, 3, 4, '#7f8c8d');
      if (down > 0.97) s.burst(ax + 1, 80, 4, ['#ffe08a', '#fff']);
    });
    // 打包区
    s.rect(200, 70, 40, 30, '#3d4555');
    const maxBoxes = { safe: 6, normal: 10, aggressive: 15 }[d.stockId] || 10;
    const n = Math.floor(maxBoxes * prog);
    for (let i = 0; i < n; i++) {
      const x = 204 + (i % 3) * 11;
      const y = 136 - Math.floor(i / 3) * 9;
      s.rect(x, y, 10, 8, '#fdfefe');
      s.rect(x, y + 3, 10, 2, d.color || '#e67e22');
    }
    // 工人 & 质检灯
    s.person(30, 108, 3, 'type', 1);
    s.person(104, 108, 6, prog >= 1 ? 'cheer' : 'type', 1);
    s.person(176, 108, 8, 'walk', -1);
    s.rect(224, 20, 8, 8, prog >= 1 ? '#2ecc71' : Math.floor(s.t * 3) % 2 ? '#f39c12' : '#7e5109');
    s.cat(142, 3);
    // 量产进度
    s.rect(10, 120, 120, 8, '#111');
    s.rect(11, 121, Math.round(118 * prog), 6, prog >= 1 ? '#2ecc71' : '#f5b041');
    s.text(`${Math.round(prog * 100)}%`, 134, 121, '#ecf0f1');
  },

  // —— 发布会后台：幕布未开 ——
  launch(s, g, d) {
    s.rect(0, 0, W, H, '#0d0b14');
    // 幕布
    for (let x = 30; x < 210; x += 6) s.rect(x, 10, 6, 84, x % 12 ? '#922b21' : '#7b241c');
    s.rect(26, 6, 188, 6, '#f1c40f');
    // 光柱扫动
    for (let i = 0; i < 2; i++) {
      const cx = 120 + Math.sin(s.t * 1.4 + i * 2) * 70;
      g.fillStyle = 'rgba(255,240,200,0.12)';
      g.beginPath();
      g.moveTo(i ? 220 : 20, 0);
      g.lineTo(cx - 14, 96);
      g.lineTo(cx + 14, 96);
      g.fill();
    }
    s.rect(20, 94, 200, 6, '#2c2433');
    s.rect(100, 2, 40, 7, '#e74c3c');
    if (Math.floor(s.t * 2) % 2) s.text('LIVE', 106, 3, '#fff');
    // 观众
    for (let i = 0; i < 22; i++) {
      const x = 4 + i * 11;
      const y = 112 + (i % 2) * 8;
      s.rect(x, y, 8, 8, '#05040a');
      s.rect(x + 1, y - 6, 6, 6, '#05040a');
      if ((i * 7 + Math.floor(s.t * 2)) % 9 === 0) s.rect(x + 2, y - 12, 4, 6, '#9fd1ff');
    }
  },

  // —— 发布会定格：幕布拉开 ——
  score(s, g, d) {
    s.rect(0, 0, W, H, '#140f22');
    for (let x = 0; x < 30; x += 6) s.rect(x, 10, 6, 84, '#922b21');
    for (let x = 210; x < W; x += 6) s.rect(x, 10, 6, 84, '#922b21');
    // 大屏
    s.rect(50, 8, 140, 46, '#05040a');
    s.rect(52, 10, 136, 42, d.flop ? '#1b2631' : shade(d.color || '#5aa9d6', -0.35));
    if (d.flop) {
      s.text('?!', 110, 24, '#e74c3c', null, 2);
    } else {
      s.text(d.grade || 'A', 112, 20, '#fff', '#000', 3);
    }
    // 舞台上的手机
    g.fillStyle = 'rgba(255,240,200,0.18)';
    g.beginPath();
    g.moveTo(120, 0);
    g.lineTo(96, 96);
    g.lineTo(144, 96);
    g.fill();
    if (!d.hidePhone) s.phone(110, 58 + Math.round(Math.sin(s.t * 2) * 2), 20, 34, d.color || '#5aa9d6');
    if (d.flop && Math.floor(s.t * 2) % 2) for (let i = 0; i < 2; i++) s.parts.push({ x: 120, y: 60, vx: (Math.random() - 0.5) * 10, vy: -10, life: 1, c: '#7f8c8d', g: -4, s: 2 });
    s.rect(20, 94, 200, 6, '#2c2433');
    for (let i = 0; i < 22; i++) {
      const x = 4 + i * 11;
      const y = 112 + (i % 2) * 8;
      const cheer = !d.flop && Math.floor(s.t * 6 + i) % 2;
      s.rect(x, y, 8, 8, '#05040a');
      s.rect(x + 1, y - 6 - (cheer ? 2 : 0), 6, 6, '#05040a');
      if (cheer) s.rect(x + 7, y - 10, 2, 6, '#05040a');
      if ((i * 5 + Math.floor(s.t * 3)) % 11 === 0) {
        s.rect(x + 2, y - 14, 4, 4, '#ffffff');
        g.fillStyle = 'rgba(255,255,255,0.06)';
        g.fillRect(0, 0, W, H);
      }
    }
    if (s.sceneT < 0.1 && !d.flop) s.pulse('confetti');
  },

  // —— 门店 ——
  sales(s, g, d) {
    s.sky(0, 70, d.month || 1);
    // 街对面楼
    for (let i = 0; i < 8; i++) s.rect(i * 32, 20 + hash(i) * 20, 30, 60, i % 2 ? '#aab7b8' : '#99a3a4');
    // 店面
    const brand = d.color || '#e67e22';
    s.rect(30, 30, 180, 76, '#fdfefe');
    s.rect(26, 24, 188, 12, brand);
    s.rect(26, 24, 188, 2, shade(brand, 0.35));
    s.rect(40, 42, 70, 50, '#d6eaf8');
    s.rect(130, 42, 70, 50, '#d6eaf8');
    // 橱窗海报
    if (!d.hidePhone) s.phone(64, 48, 16, 28, brand);
    s.rect(110, 46, 20, 60, '#7f8c8d');
    s.rect(112, 48, 16, 58, d.state === 'short' ? '#c0392b' : '#5d6d7e');
    if (d.state === 'short') s.text('0', 117, 66, '#fff');
    // 店内
    if (d.state === 'over') {
      for (let i = 0; i < 12; i++) {
        const x = 134 + (i % 6) * 11;
        const y = 82 - Math.floor(i / 6) * 9;
        s.rect(x, y, 10, 8, '#d7b98e');
        if (hash(i) > 0.5) s.rect(x + 1, y, 3, 1, '#ecf0f1');
      }
    } else {
      for (let i = 0; i < 4; i++) s.phone(138 + i * 15, 70, 10, 16, i % 2 ? brand : shade(brand, -0.3));
    }
    s.rect(0, 106, W, 4, '#95a5a6');
    s.rect(0, 110, W, 40, '#7f8c8d');
    for (let x = 0; x < W; x += 20) s.rect(x, 128, 10, 2, '#f1c40f');
    // 排队
    const q = Math.max(0, Math.min(18, Math.round((d.queue ?? 0.5) * 18)));
    for (let i = 0; i < q; i++) {
      const x = 112 - i * 9 + (i > 9 ? 0 : 0);
      const y = 96 + (i % 2);
      if (x < -8) break;
      s.person(x, y, i + 3, i === 0 ? 'cheer' : 'idle', 1);
    }
    if (d.state === 'short') {
      s.person(200, 112, 11, 'idle', -1);
      s.rect(196, 98, 18, 10, '#fdfefe');
      s.text('+¥', 199, 101, '#c0392b');
    }
    if (d.state !== 'over' && Math.floor(s.t * 1.5) % 3 === 0 && s.parts.length < 6) s.pulse('cash', { x: 112 + Math.random() * 20, y: 80, text: '+' });
    s.cat(124, 4);
    s.weather(d.month || 1, 110);
    // 出门的人
    const wx = 120 + ((s.t * 20) % 140);
    s.person(Math.round(wx), 116, 12, 'walk', 1);
    s.rect(Math.round(wx) + 7, 122, 4, 4, brand);
  },

  // —— 规划下一代：年会 / 机型墙 ——
  next(s, g, d) {
    s.rect(0, 0, W, 100, '#4a235a');
    for (let i = 0; i < 20; i++) s.rect(hash(i) * W, hash(i + 4) * 30, 2, 2, SHIRT[i % SHIRT.length]);
    s.rect(0, 96, W, 4, '#2e1a38');
    s.floorTiles(100, '#6c3483', '#5b2c6f');
    // 机型墙
    const ms = d.models || [];
    const n = Math.min(8, ms.length);
    for (let i = 0; i < 8; i++) {
      const x = 14 + i * 28;
      s.rect(x, 30, 22, 40, '#2e1a38');
      s.rect(x + 1, 31, 20, 38, '#f9e79f');
      s.rect(x + 2, 32, 18, 36, '#1b1b1b');
      if (i < n) {
        const m = ms[ms.length - n + i];
        if (!m.cut) s.phone(x + 5, 38, 12, 22, m.color || '#5aa9d6');
        s.text(m.grade || '', x + 9, 62, '#f1c40f');
        if (m.firsts) {
          s.rect(x + 16, 26, 6, 6, '#f1c40f');
          s.rect(x + 18, 32, 2, 2, '#b7950b');
        }
      } else {
        s.text('?', x + 9, 46, '#5d6d7e');
      }
    }
    // 讲台与人
    s.rect(104, 84, 32, 20, '#8b5a2b');
    s.person(116, 70, 0, 'cheer', 1);
    [20, 50, 170, 200].forEach((x, i) => s.person(x, 106, i + 4, Math.floor(s.t * 2 + i) % 2 ? 'cheer' : 'idle', i < 2 ? 1 : -1));
    if (Math.floor(s.t * 2) % 4 === 0 && s.parts.length < 30) s.pulse('confetti');
    if (d.finale && Math.random() < 0.04) {
      const fx = 20 + Math.random() * 200;
      const fy = 8 + Math.random() * 20;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        s.parts.push({ x: fx, y: fy, vx: Math.cos(a) * 40, vy: Math.sin(a) * 40, life: 0.9, c: SHIRT[(i + Math.floor(fx)) % SHIRT.length], g: 30 });
      }
    }
  },

  // —— 总部外景（搬家时）——
  hq(s, g, d) {
    const lv = d.office || 1;
    const brand = d.color || '#e67e22';
    const night = s.sky(0, 110, d.month || 1);
    for (let i = 0; i < 10; i++) s.rect(i * 26, 60 + hash(i) * 20, 24, 50, night ? '#232b4d' : '#aab7b8');
    s.rect(0, 110, W, 40, lv >= 4 ? '#58d68d' : '#7f8c8d');
    if (lv === 1) {
      s.rect(80, 70, 80, 40, '#5d4037');
      s.rect(90, 80, 60, 30, '#ffe08a');
      for (let y = 80; y < 110; y += 4) s.rect(90, y, 60, 1, '#f5b041');
    } else if (lv === 2) {
      s.rect(70, 50, 100, 60, '#ecf0f1');
      for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) s.rect(78 + c * 18, 58 + r * 22, 12, 14, (r + c + Math.floor(s.t)) % 4 ? '#85c1e9' : '#f9e79f');
      s.rect(66, 44, 108, 8, brand);
      s.rect(110, 94, 20, 16, '#5d6d7e');
    } else if (lv === 3) {
      s.rect(92, 10, 56, 100, '#5d6d7e');
      for (let y = 14; y < 106; y += 6) for (let x = 96; x < 144; x += 6) s.rect(x, y, 4, 4, hash(x * y + Math.floor(s.t * 2)) > 0.35 ? '#aed6f1' : '#f9e79f');
      s.rect(92, 4, 56, 8, brand);
      s.rect(118, -4, 4, 8, '#bdc3c7');
      if (Math.floor(s.t * 2) % 2) s.rect(119, -4, 2, 2, '#e74c3c');
    } else {
      [[30, 70, 60], [100, 60, 70], [176, 72, 50]].forEach(([x, y, w2]) => {
        s.rect(x, y, w2, 110 - y, '#fdfefe');
        s.rect(x, y, w2, 4, brand);
        for (let k = x + 4; k < x + w2 - 4; k += 8) s.rect(k, y + 10, 5, 18, '#85c1e9');
      });
      for (let i = 0; i < 9; i++) {
        const tx = 8 + i * 27;
        s.rect(tx + 3, 112, 2, 8, '#6e2c00');
        s.rect(tx, 104, 9, 9, '#239b56');
      }
      s.rect(128, 30, 1, 30, '#bdc3c7');
      s.rect(129, 30 + Math.round(Math.sin(s.t * 3)), 10, 6, brand);
      robotDog(s, 126);
    }
    if (Math.floor(s.t * 2) % 3 === 0 && s.parts.length < 30) s.pulse('confetti');
    [60, 100, 140, 180].forEach((x, i) => s.person(x, 120, i + 2, 'cheer', i < 2 ? 1 : -1));
  },

  // —— 倒闭 ——
  bust(s, g, d) {
    s.rect(0, 0, W, H, '#2c3e50');
    s.rect(30, 30, 180, 80, '#7f8c8d');
    for (let y = 40; y < 110; y += 4) s.rect(40, y, 160, 3, '#95a5a6');
    s.rect(90, 60, 60, 20, '#fdfefe');
    s.text('x_x', 108, 67, '#c0392b');
    s.rect(0, 110, W, 40, '#34495e');
    for (let i = 0; i < 40; i++) {
      const x = (hash(i) * W + s.t * 30) % W;
      const y = (hash(i + 7) * H + s.t * 120) % H;
      s.rect(x, y, 1, 3, '#85c1e9');
    }
    s.person(110, 116, 2, 'idle', 1);
  },
};

const STATION_DRAW = {
  perf(s, x, p, cap, ev) {
    s.rect(x + 2, 62, 12, 30, '#2c3e50');
    for (let i = 0; i < 6; i++) s.rect(x + 4, 64 + i * 4, 8, 2, Math.floor(s.t * 6 + i) % 3 ? '#27ae60' : '#2ecc71');
    s.rect(x + 22, 84, 10, 8, ev === 'chip_short' ? '#7f8c8d' : '#2b2e36');
    if (ev === 'chip_short') s.text('?', x + 25, 86, '#e74c3c');
    else if (Math.sin(s.t * 5) > 0.5) s.rect(x + 26, 80, 2, 3, '#e67e22');
  },
  design(s, x, p, cap, ev) {
    s.rect(x + 6, 62, 28, 30, '#ecf0f1');
    s.rect(x + 8, 64, 24, 26, '#566573');
    const nozzle = x + 10 + ((Math.sin(s.t * 3) + 1) / 2) * 18;
    s.rect(nozzle, 66, 3, 4, '#e67e22');
    const hgt = Math.round((18 * p) / 100);
    s.rect(x + 16, 88 - hgt, 8, hgt, ev === 'hinge' ? '#c0392b' : '#a9cce3');
    if (ev === 'hinge') s.rect(x + 19, 88 - hgt, 1, hgt, '#000');
  },
  camera(s, x, p) {
    s.rect(x + 8, 66, 2, 26, '#2c3e50');
    s.rect(x + 4, 62, 10, 7, '#1b1b1b');
    s.rect(x + 13, 63, 3, 5, '#5d6d7e');
    if (Math.floor(s.t * 1.3) % 5 === 0) s.rect(x + 2, 60, 3, 3, '#ffffff');
    s.rect(x + 24, 64, 12, 14, '#fdfefe');
    ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db'].forEach((c, i) => s.rect(x + 25 + (i % 2) * 5, 65 + Math.floor(i / 2) * 6, 4, 5, c));
  },
  battery(s, x, p, cap, ev) {
    s.rect(x + 8, 70, 24, 22, '#2c3e50');
    s.rect(x + 12, 74, 16, 14, '#1b2631');
    const lvl = ((s.t * 0.5) % 1) * 12;
    s.rect(x + 13, 87 - lvl, 14, lvl, ev === 'yield' ? '#e74c3c' : '#2ecc71');
    s.rect(x + 17, 68, 6, 2, '#2c3e50');
  },
  os(s, x) {
    s.rect(x + 4, 62, 32, 22, '#1b1b1b');
    s.rect(x + 6, 64, 28, 18, '#0b1a2a');
    for (let i = 0; i < 5; i++) {
      const w = 6 + Math.floor(hash(i + Math.floor(s.t * 3)) * 18);
      s.rect(x + 8, 66 + i * 3, w, 1, i % 2 ? '#2ecc71' : '#5dade2');
    }
    s.rect(x + 18, 84, 4, 8, '#1b1b1b');
  },
};

/** 会议室背景：按办公室等级变化 */
function officeBack(s, g, d) {
  const lv = d.office || 1;
  const wall = ['#7b5e45', '#5b7a99', '#2e4053', '#76b39d'][lv - 1];
  s.rect(0, 0, W, 100, wall);
  s.rect(0, 96, W, 4, shade(wall, -0.3));
  const night = (d.month || 1) % 4 === 0;
  if (lv === 1) {
    for (let x = 0; x < W; x += 8) s.rect(x, 0, 1, 96, shade(wall, -0.2));
    s.sky(18, 44, d.month || 1);
    s.rect(0, 0, W, 18, wall);
    s.rect(0, 44, W, 52, wall);
    s.rect(0, 18, 180, 26, wall);
    s.rect(226, 18, 14, 26, wall);
    for (let x = 0; x < W; x += 8) {
      s.rect(x, 0, 1, 18, shade(wall, -0.2));
      s.rect(x, 44, 1, 52, shade(wall, -0.2));
    }
    s.rect(178, 16, 50, 2, '#4e342e');
    s.rect(178, 44, 50, 2, '#4e342e');
    // 吊灯泡
    s.rect(160, 0, 1, 10, '#2c2c2c');
    s.rect(158, 10, 5, 5, '#ffe08a');
    g.fillStyle = 'rgba(255,224,138,0.1)';
    g.fillRect(130, 15, 60, 80);
    for (let i = 0; i < 3; i++) s.rect(200 + i * 4, 86 - i * 9, 22, 9, '#c8a26b');
    return;
  }
  if (lv === 2) {
    s.sky(14, 60, d.month || 1);
    s.rect(0, 0, 160, 14, wall);
    s.rect(0, 60, W, 36, wall);
    s.rect(0, 14, 166, 46, wall);
    s.rect(234, 14, 6, 46, wall);
    for (let i = 0; i < 6; i++) {
      const bh = 12 + hash(i + 2) * 22;
      s.rect(168 + i * 11, 60 - bh, 10, bh, night ? '#232b4d' : '#7f8c8d');
    }
    s.rect(166, 12, 70, 3, '#2c3e50');
    s.rect(166, 60, 70, 3, '#2c3e50');
    s.rect(199, 14, 2, 46, '#2c3e50');
    return;
  }
  // 写字楼 / 科技园：大落地窗
  s.sky(4, 64, d.month || 1);
  s.rect(0, 0, 124, 96, wall);
  s.rect(0, 64, W, 32, wall);
  s.rect(0, 0, W, 4, wall);
  if (lv === 3) {
    for (let i = 0; i < 10; i++) {
      const bh = 24 + hash(i + 5) * 34;
      const bx = 126 + i * 11;
      s.rect(bx, 64 - bh, 10, bh, night ? '#1f2a48' : '#95a5a6');
      for (let y = 66 - bh; y < 62; y += 4) if (hash(bx * y) > 0.5) s.rect(bx + 2, y, 2, 2, night ? '#f7dc6f' : '#d6eaf8');
    }
    // 奖杯架
    s.rect(126, 70, 44, 3, '#6e4b2a');
    for (let i = 0; i < 4; i++) {
      s.rect(130 + i * 10, 64, 6, 6, '#f1c40f');
      s.rect(132 + i * 10, 70, 2, 0, '#b7950b');
    }
  } else {
    for (let i = 0; i < 9; i++) {
      const tx = 128 + i * 13;
      s.rect(tx + 4, 46, 3, 18, '#6e2c00');
      s.rect(tx, 34 + (i % 2) * 4, 11, 14, i % 3 ? '#27ae60' : '#1e8449');
    }
    // 霓虹招牌
    s.rect(126, 68, 48, 10, '#1b1b1b');
    for (let k = 0; k < 5; k++) s.rect(130 + k * 9, 71, 6, 4, Math.floor(s.t * 4 + k) % 5 ? d.color || '#e67e22' : '#fff');
  }
  for (let x = 124; x < W; x += 28) s.rect(x, 4, 2, 60, '#2c3e50');
  s.rect(124, 62, 116, 2, '#2c3e50');
}

/** 科技园巡逻机器狗 */
function robotDog(s, y) {
  const x = ((s.t * 18) % (W + 40)) - 20;
  const step = Math.floor(s.t * 10) % 2;
  s.rect(x, y, 12, 5, '#bdc3c7');
  s.rect(x + 10, y - 3, 5, 4, '#95a5a6');
  s.rect(x + 13, y - 2, 1, 1, '#2ecc71');
  s.rect(x + 1, y + 5, 2, 3 - step, '#7f8c8d');
  s.rect(x + 9, y + 5, 2, 2 + step, '#7f8c8d');
  s.rect(x - 2, y, 2, 1, '#bdc3c7');
}
