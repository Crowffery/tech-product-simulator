/**
 * 发布会节目单（keynote）
 * 每个卖点 / 亮点一页：LED 大屏动画 + 运镜 + 大号数字（KPI）+ 台下反应。
 * 玩家在企划里承诺的卖点会被放到最前面，标成「本代主打」；承诺没兑现，台下会起哄。
 *
 * 幻灯片画布 240×72（像素风），draw(g, W, H, t) 中 t 为秒。
 */
import { CONCEPTS, tier, paletteName, chipSpec } from '../studio/parts.js';
import { roundPrice } from '../game/market.js';

// ═════════════════════════ 画图小工具 ═════════════════════════

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
const ease = (k) => 1 - Math.pow(1 - clamp(k), 3);

export function txt(g, str, x, y, size, color = '#fff', align = 'center', font = '"Noto Sans SC",sans-serif') {
  g.fillStyle = color;
  g.font = `900 ${size}px ${font}`;
  g.textAlign = align;
  g.fillText(str, x, y);
}
const mono = (g, str, x, y, size, color = '#fff', align = 'center') => txt(g, str, x, y, size, color, align, 'monospace');
const title = (g, str, x, y, size, color = '#fff', align = 'center') => txt(g, str, x, y, size, color, align, '"ZCOOL KuaiLe","Noto Sans SC",sans-serif');

function bg(g, W, H, a, b) {
  const grd = g.createLinearGradient(0, 0, W, H);
  grd.addColorStop(0, a);
  grd.addColorStop(1, b);
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
}

/** 打字机效果 */
const typed = (str, t, cps = 14) => str.slice(0, Math.floor(t * cps));

/** 斜向高光带 */
function sheen(g, W, H, t, period = 2.2, alpha = 0.55) {
  const x = ((t % period) / period) * (W + 160) - 80;
  const grd = g.createLinearGradient(x - 40, 0, x + 40, H);
  grd.addColorStop(0, 'rgba(255,255,255,0)');
  grd.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, H);
}

/** 小像素手机（正面） */
function miniPhone(g, x, y, w, h, color, screen = '#1b2a4a') {
  g.fillStyle = '#000';
  g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
  g.fillStyle = screen;
  g.fillRect(x + 2, y + 3, w - 4, h - 6);
}

// ═════════════════════════ 各类幻灯片 ═════════════════════════

const SLIDES = {
  /** 材质：金属拉丝 + 高光扫过 */
  metal: (color, name) => (g, W, H, t) => {
    bg(g, W, H, '#2b2d33', '#5d6168');
    for (let y = 0; y < H; y += 2) {
      g.fillStyle = `rgba(255,255,255,${0.03 + ((y * 7) % 5) * 0.012})`;
      g.fillRect(0, y, W, 1);
    }
    sheen(g, W, H, t, 1.8, 0.6);
    g.fillStyle = color;
    g.fillRect(14, 14, 6, 44);
    title(g, name, W / 2 + 8, 40, 22, '#f4f6f7');
    txt(g, '一体成型 · CNC 精雕', W / 2 + 8, 58, 9, '#d5d8dc');
  },
  glass: (color, name) => (g, W, H, t) => {
    bg(g, W, H, '#0f1a2b', color);
    g.globalAlpha = 0.35;
    for (let i = 0; i < 6; i++) {
      g.fillStyle = '#fff';
      g.fillRect(((t * 40 + i * 50) % (W + 40)) - 20, 0, 3, H);
    }
    g.globalAlpha = 1;
    sheen(g, W, H, t, 2.4, 0.45);
    title(g, name, W / 2, 40, 22);
    txt(g, '双面玻璃 · 一抹流光', W / 2, 58, 9, '#eaf2f8');
  },
  leather: (color, name) => (g, W, H, t) => {
    bg(g, W, H, color, '#3b2a20');
    g.fillStyle = 'rgba(0,0,0,.18)';
    for (let y = 2; y < H; y += 4) for (let x = (y % 8) / 2; x < W; x += 4) g.fillRect(x, y, 1, 1);
    g.strokeStyle = 'rgba(255,240,220,.6)';
    g.setLineDash([3, 3]);
    g.lineDashOffset = -t * 8;
    g.strokeRect(8, 8, W - 16, H - 16);
    g.setLineDash([]);
    title(g, name, W / 2, 40, 22);
    txt(g, '素皮 · 温润不留指纹', W / 2, 58, 9, '#fdebd0');
  },
  plastic: (color, name, palette) => (g, W, H, t) => {
    bg(g, W, H, '#1c1630', '#2a1f45');
    palette.forEach((c, i) => {
      const k = ease(t * 1.6 - i * 0.12);
      const x = 20 + i * 28;
      const y = 72 - k * 50;
      g.fillStyle = '#000';
      g.fillRect(x - 1, y - 1, 20, 34);
      g.fillStyle = c;
      g.fillRect(x, y, 18, 32);
    });
    title(g, name, W - 50, 40, 16);
    txt(g, '多彩机身', W - 50, 56, 9, '#ffd08a');
  },

  /** 轻薄：机身侧面 vs 硬币堆 */
  thin: (mm, color) => (g, W, H, t) => {
    bg(g, W, H, '#101018', '#1d1d2b');
    const k = ease(t * 0.8);
    const coins = Math.max(2, Math.round(mm / 1.85));
    // 硬币
    for (let i = 0; i < coins; i++) {
      const y = 58 - i * 6 * k;
      g.fillStyle = '#b7950b';
      g.fillRect(40, y, 40, 5);
      g.fillStyle = '#f4d03f';
      g.fillRect(40, y, 40, 2);
    }
    txt(g, `${coins} 枚硬币`, 60, 70, 7, '#aab7b8');
    // 机身侧面
    const ph = mm * 6 * k;
    g.fillStyle = color;
    g.fillRect(130, 63 - ph, 90, ph);
    g.fillStyle = 'rgba(255,255,255,.35)';
    g.fillRect(130, 63 - ph, 90, 2);
    g.strokeStyle = '#f5b041';
    g.beginPath();
    g.moveTo(226, 63 - ph);
    g.lineTo(232, 63 - ph);
    g.moveTo(226, 63);
    g.lineTo(232, 63);
    g.moveTo(229, 63 - ph);
    g.lineTo(229, 63);
    g.stroke();
    mono(g, `${mm}mm`, 175, 22, 14, '#f5b041');
  },

  /** 跑分赛跑：你的芯片后来居上 */
  bench: (mine, rivals, label) => (g, W, H, t) => {
    bg(g, W, H, '#07131f', '#0b2238');
    const max = Math.max(mine, ...rivals.map((r) => r.v));
    const rows = [...rivals, { n: label, v: mine, me: true }];
    rows.forEach((r, i) => {
      const y = 8 + i * 16;
      const k = r.me ? ease((t - 0.3) * 0.7) : ease(t * 0.9);
      const w = Math.round(((W - 110) * r.v * k) / max);
      txt(g, r.n, 6, y + 10, 8, r.me ? '#ffd08a' : '#aab7b8', 'left');
      g.fillStyle = r.me ? '#e67e22' : '#5d6d7e';
      g.fillRect(64, y + 2, w, 10);
      if (r.me && k > 0.98) {
        g.fillStyle = `rgba(255,255,255,${0.5 + Math.sin(t * 10) * 0.3})`;
        g.fillRect(64 + w - 3, y + 2, 3, 10);
      }
      mono(g, `${Math.round((r.v * k) / 10000)}万`, 64 + w + 4, y + 11, 8, '#fff', 'left');
    });
  },

  /** 屏幕：60Hz vs 高刷 */
  refresh: (hz) => (g, W, H, t) => {
    bg(g, W, H, '#0a0a12', '#111a2a');
    const lane = (x0, label, fps, col) => {
      g.strokeStyle = '#34495e';
      g.strokeRect(x0, 10, 100, 44);
      const tt = Math.floor(t * fps) / fps;
      const p = (Math.sin(tt * 3) + 1) / 2;
      g.fillStyle = col;
      g.fillRect(x0 + 6 + p * 80, 26, 10, 10);
      if (fps > 60) {
        g.fillStyle = col + '55';
        g.fillRect(x0 + 6 + ((Math.sin((tt - 0.03) * 3) + 1) / 2) * 80, 26, 10, 10);
      }
      mono(g, label, x0 + 50, 66, 10, col);
    };
    lane(12, '60Hz', 8, '#7f8c8d');
    lane(128, `${hz}Hz`, 60, '#5dade2');
  },
  bright: (nits) => (g, W, H, t) => {
    const k = ease(t * 0.7);
    bg(g, W, H, '#1a1406', `rgb(${Math.round(80 + 170 * k)},${Math.round(60 + 150 * k)},20)`);
    g.fillStyle = '#fff7d6';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t;
      g.fillRect(40 + Math.cos(a) * 22 * k - 1, 36 + Math.sin(a) * 22 * k - 1, 3, 3);
    }
    g.beginPath();
    g.arc(40, 36, 10, 0, Math.PI * 2);
    g.fill();
    mono(g, `${Math.round(nits * k)} nit`, 150, 44, 20, '#1a1406');
  },

  /** 影像：夜景直出，噪点一层层被吃掉 */
  night: (cap) => (g, W, H, t) => {
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0b1030');
    sky.addColorStop(1, '#3a2a5e');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) {
      const bh = 18 + ((i * 37) % 34);
      g.fillStyle = '#111426';
      g.fillRect(i * 18, H - bh, 16, bh);
      for (let y = H - bh + 4; y < H - 3; y += 5) for (let x = i * 18 + 3; x < i * 18 + 14; x += 4) if ((x * y) % 7 < 3) { g.fillStyle = '#f7dc6f'; g.fillRect(x, y, 2, 2); }
    }
    g.fillStyle = '#f9e79f';
    g.beginPath();
    g.arc(W - 30, 16, 7, 0, Math.PI * 2);
    g.fill();
    // 从全噪点慢慢变干净，干净程度取决于影像上限
    const floor = Math.max(0, 110 - cap) * 4;
    const noise = Math.round(floor + Math.max(0, 1 - t / 1.6) * 900);
    for (let i = 0; i < noise; i++) {
      const v = 80 + Math.random() * 120;
      g.fillStyle = `rgba(${v},${v},${v},.6)`;
      g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    if (t < 0.15) {
      g.fillStyle = `rgba(255,255,255,${1 - t / 0.15})`;
      g.fillRect(0, 0, W, H);
    }
    txt(g, t < 1.6 ? '处理中…' : '直出 · 未修图', 6, 10, 8, '#fff', 'left');
  },

  /** 续航：日出日落，电量缓缓下降 */
  days: (days) => (g, W, H, t) => {
    const cyc = (t * 0.9) % 1;
    const day = cyc < 0.6;
    bg(g, W, H, day ? '#5dade2' : '#0b1030', day ? '#d6eaf8' : '#2c3e50');
    const a = Math.PI * (day ? cyc / 0.6 : (cyc - 0.6) / 0.4);
    g.fillStyle = day ? '#f9e79f' : '#ecf0f1';
    g.beginPath();
    g.arc(20 + (1 - Math.cos(a)) * 60, 60 - Math.sin(a) * 44, day ? 7 : 5, 0, Math.PI * 2);
    g.fill();
    const used = Math.min(days, t * 0.9);
    const left = Math.max(0.05, 1 - used / days);
    g.strokeStyle = '#000';
    g.lineWidth = 3;
    g.strokeRect(150, 22, 66, 28);
    g.fillStyle = '#000';
    g.fillRect(216, 30, 5, 12);
    g.fillStyle = left > 0.3 ? '#2ecc71' : '#e67e22';
    g.fillRect(153, 25, Math.round(60 * left), 22);
    mono(g, `第 ${Math.min(Math.ceil(days), Math.floor(used) + 1)} 天`, 183, 64, 9, day ? '#1b2631' : '#fff');
  },

  /** 快充：十分钟充一半 */
  charge: () => (g, W, H, t) => {
    bg(g, W, H, '#0d0d14', '#1f1a08');
    const k = clamp(t / 2.2);
    const pct = Math.round(k * 50);
    const mm = Math.round(k * 10);
    g.strokeStyle = '#fff';
    g.lineWidth = 3;
    g.strokeRect(30, 20, 110, 34);
    g.fillStyle = '#fff';
    g.fillRect(140, 30, 6, 14);
    g.fillStyle = '#2ecc71';
    g.fillRect(33, 23, Math.round(104 * (pct / 100)), 28);
    if (Math.floor(t * 6) % 2) txt(g, '⚡', 85, 44, 20, '#f5b041');
    mono(g, `${pct}%`, 192, 36, 18, '#2ecc71');
    mono(g, `00:${String(mm).padStart(2, '0')}`, 192, 58, 11, '#f5b041');
  },

  /** 生态：设备之间一碰互传 */
  eco: (color) => (g, W, H, t) => {
    bg(g, W, H, '#0e1a12', '#102a1c');
    const nodes = [
      [30, 36, '📱'],
      [90, 18, '⌚'],
      [150, 36, '💻'],
      [210, 18, '🎧'],
    ];
    g.strokeStyle = '#2ecc71';
    g.lineWidth = 2;
    for (let i = 0; i < nodes.length - 1; i++) {
      const [x1, y1] = nodes[i];
      const [x2, y2] = nodes[i + 1];
      g.beginPath();
      g.moveTo(x1, y1);
      g.lineTo(x2, y2);
      g.stroke();
      const k = (t * 1.2 + i * 0.3) % 1;
      g.fillStyle = '#abebc6';
      g.fillRect(x1 + (x2 - x1) * k - 2, y1 + (y2 - y1) * k - 2, 4, 4);
    }
    nodes.forEach(([x, y, e]) => txt(g, e, x, y + 7, 18));
    txt(g, '一碰互传 · 跨设备接力', W / 2, 66, 9, '#abebc6');
  },

  /** 价格：老虎机滚轮落定 */
  price: (list, price, colorEnd) => (g, W, H, t) => {
    mono(g, `¥${list}`, W / 2, 20, 12, '#7f8c8d');
    g.fillStyle = '#e74c3c';
    g.fillRect(W / 2 - 34, 15, 68, 2);
    const digits = String(price).split('');
    digits.forEach((d, i) => {
      const stop = 0.35 + i * 0.25;
      const ch = t < stop ? String(Math.floor(Math.random() * 10)) : d;
      mono(g, ch, W / 2 - (digits.length - 1) * 11 + i * 22 + 8, 58, 32, t < stop ? '#aab7b8' : colorEnd);
    });
    mono(g, '¥', W / 2 - (digits.length - 1) * 11 - 18, 58, 20, colorEnd);
  },

  /** 概念件：通用 —— 图标 + 扩散波纹 + 打字机介绍 */
  concept: (c, first) => (g, W, H, t) => {
    if (first) bg(g, W, H, '#e67e22', '#8e44ad');
    else bg(g, W, H, '#14101f', '#261a3d');
    for (let i = 0; i < 3; i++) {
      const r = ((t * 30 + i * 18) % 54) + 4;
      g.strokeStyle = `rgba(255,255,255,${0.5 - r / 120})`;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(38, 36, r, 0, Math.PI * 2);
      g.stroke();
    }
    txt(g, c.icon, 38, 46, 26);
    if (first) txt(g, '全球首发', 150, 18, 9, '#fff3d6');
    title(g, c.name, 150, first ? 42 : 36, first ? 20 : 18);
    txt(g, typed(c.desc, t - 0.3), 150, first ? 60 : 56, 9, first ? '#fff3d6' : '#d7bde2');
  },
};

/** 部分概念件有专属动画（覆盖通用版的左半屏） */
const CONCEPT_FX = {
  fold: (g, W, H, t) => {
    const k = (Math.sin(t * 2) + 1) / 2;
    const w = 14 + k * 30;
    g.fillStyle = '#000';
    g.fillRect(38 - w - 1, 13, w * 2 + 2, 48);
    g.fillStyle = '#5dade2';
    g.fillRect(38 - w, 14, w, 46);
    g.fillStyle = '#85c1e9';
    g.fillRect(38, 14, w, 46);
  },
  trifold: (g, W, H, t) => {
    const k = (Math.sin(t * 2) + 1) / 2;
    const w = 10 + k * 18;
    ['#5dade2', '#85c1e9', '#5dade2'].forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(38 - w * 1.5 + i * w, 14, w - 1, 46);
    });
  },
  rollable: (g, W, H, t) => {
    const k = (Math.sin(t * 2) + 1) / 2;
    g.fillStyle = '#5dade2';
    g.fillRect(20, 14, 24 + k * 28, 46);
    g.fillStyle = '#2e4053';
    g.fillRect(44 + k * 28, 12, 6, 50);
  },
  slider: (g, W, H, t) => {
    const k = (Math.sin(t * 2.4) + 1) / 2;
    g.fillStyle = '#566573';
    g.fillRect(24, 22, 28, 40);
    g.fillStyle = '#5dade2';
    g.fillRect(24, 22 - k * 14, 28, 40);
  },
  ip68: (g, W, H, t) => {
    g.fillStyle = '#1a5276';
    g.fillRect(0, 26, 80, H - 26);
    for (let i = 0; i < 8; i++) {
      const y = H - (((t * 30 + i * 13) % 50));
      g.fillStyle = 'rgba(214,234,248,.8)';
      g.fillRect(10 + ((i * 23) % 60), y, 3, 3);
    }
    miniPhone(g, 30, 34, 16, 30, '#aab7b8', '#5dade2');
  },
  solar: (g, W, H, t) => {
    g.fillStyle = '#f9e79f';
    g.beginPath();
    g.arc(38, 30, 9, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + t * 1.5;
      g.fillRect(38 + Math.cos(a) * 16 - 1, 30 + Math.sin(a) * 16 - 1, 3, 3);
    }
    const k = (t * 1.5) % 1;
    g.fillStyle = '#2ecc71';
    g.fillRect(36, 44 + k * 20, 4, 4);
  },
  fan: (g, W, H, t) => {
    g.save();
    g.translate(38, 36);
    g.rotate(t * 14);
    g.fillStyle = '#aed6f1';
    for (let i = 0; i < 5; i++) {
      g.rotate((Math.PI * 2) / 5);
      g.fillRect(-3, 4, 6, 16);
    }
    g.restore();
    mono(g, `${Math.max(38, Math.round(48 - t * 4))}°C`, 38, 68, 8, '#5dade2');
  },
  ai: (g, W, H, t) => {
    g.fillStyle = '#fff';
    g.fillRect(6, 10, 64, 18);
    txt(g, typed('写首关于秋天的诗', t, 8), 9, 22, 7, '#000', 'left');
    if (t > 1.1) {
      g.fillStyle = '#8e44ad';
      g.fillRect(10, 34, 64, 26);
      txt(g, typed('落叶替风翻书页…', t - 1.1, 8), 13, 50, 7, '#fff', 'left');
    }
  },
  projector: (g, W, H, t) => {
    g.fillStyle = 'rgba(255,240,180,.25)';
    g.beginPath();
    g.moveTo(10, 40);
    g.lineTo(72, 6);
    g.lineTo(72, 66);
    g.fill();
    g.fillStyle = `hsl(${(t * 80) % 360},70%,60%)`;
    g.fillRect(64, 14, 8, 44);
    miniPhone(g, 4, 30, 10, 20, '#2c3e50');
  },
  holo: (g, W, H, t) => {
    g.fillStyle = 'rgba(93,173,226,.25)';
    g.fillRect(18, 10, 40, 40);
    g.strokeStyle = '#5dade2';
    const k = t * 2;
    g.strokeRect(28 + Math.sin(k) * 6, 18, 20, 20);
    g.strokeRect(28 - Math.sin(k) * 6, 22, 20, 20);
    miniPhone(g, 24, 54, 28, 10, '#2c3e50');
  },
  sat: (g, W, H, t) => {
    miniPhone(g, 10, 40, 12, 22, '#2c3e50');
    txt(g, '🛰️', 62, 22, 16);
    for (let i = 0; i < 3; i++) {
      const k = ((t * 1.2 + i * 0.33) % 1);
      g.fillStyle = `rgba(245,176,65,${1 - k})`;
      g.fillRect(18 + k * 40, 38 - k * 22, 4, 4);
    }
  },
  periscope: (g, W, H, t) => {
    const k = (t * 0.8) % 1;
    for (let i = 0; i < 4; i++) {
      const s = (1 - ((k + i * 0.25) % 1)) * 60;
      g.strokeStyle = '#f5b041';
      g.strokeRect(38 - s / 2, 36 - s / 3, s, (s * 2) / 3);
    }
    mono(g, `${Math.min(10, Math.round(1 + t * 4))}×`, 38, 40, 14, '#fff');
  },
  oneinch: (g, W, H, t) => {
    const k = ease(t);
    g.fillStyle = '#566573';
    g.beginPath();
    g.arc(22, 36, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#1b2631';
    g.beginPath();
    g.arc(52, 36, 6 + 14 * k, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = '#f5b041';
    g.stroke();
  },
  lights: (g, W, H, t) => {
    for (let i = 0; i < 10; i++) {
      const on = Math.floor(t * 12) % 10 === i;
      g.fillStyle = on ? '#fff' : `hsl(${i * 36 + t * 120},80%,55%)`;
      g.fillRect(14 + i * 5, 20, 4, 32);
    }
  },
  clear: (g, W, H, t) => {
    g.strokeStyle = '#5dade2';
    g.strokeRect(20, 8, 36, 58);
    g.fillStyle = '#e67e22';
    g.fillRect(26, 14, 12, 12);
    g.fillStyle = '#27ae60';
    g.fillRect(26, 30, 24, 28);
    g.fillStyle = 'rgba(93,173,226,.35)';
    g.fillRect(20, 8 + ((t * 30) % 58), 36, 3);
  },
  haptics: (g, W, H, t) => {
    g.strokeStyle = '#f5b041';
    g.beginPath();
    for (let x = 0; x < 70; x++) g.lineTo(4 + x, 36 + Math.sin(x * 0.6 + t * 20) * 14 * Math.exp(-((x - 35) ** 2) / 300));
    g.stroke();
  },
  ultrasonic: (g, W, H, t) => {
    g.strokeStyle = '#5dade2';
    for (let r = 4; r < 22; r += 4) {
      g.beginPath();
      g.arc(38, 38, r, Math.PI, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = 'rgba(46,204,113,.6)';
    g.fillRect(14, 18 + ((t * 30) % 30), 48, 2);
  },
  chrome: (g, W, H, t) => {
    g.fillStyle = `hsl(${(t * 90) % 360},65%,55%)`;
    g.fillRect(24, 10, 28, 54);
    sheen(g, 80, H, t, 1.2, 0.4);
  },
  sicarbon: (g, W, H, t) => {
    const k = ease(t);
    g.strokeStyle = '#fff';
    g.strokeRect(14, 20, 50, 30);
    g.fillStyle = '#7f8c8d';
    g.fillRect(16, 22, 38, 26);
    g.fillStyle = '#2ecc71';
    g.fillRect(16 + 38, 22, 8 * k, 26);
    mono(g, `+${Math.round(20 * k)}%`, 38, 64, 9, '#2ecc71');
  },
  magcharge: (g, W, H, t) => {
    const k = ease(t * 1.4);
    g.fillStyle = '#d5d8dc';
    g.beginPath();
    g.arc(38, 64 - k * 26, 10, 0, Math.PI * 2);
    g.fill();
    miniPhone(g, 24, 8, 28, 30, '#2c3e50');
  },
};

// ═════════════════════════ 节目单 ═════════════════════════

const MAT_KIND = ['plastic', 'glass', 'metal', 'leather'];
const MAT_NAME = { plastic: '多彩塑料机身', glass: '玻璃机身', metal: '全新金属机身', leather: '素皮机身' };

/**
 * 生成发布会节目单
 * ctx: { d, phys, cs, prevChip, rivals, camCap, batCap, perfCap, price, pf, points, promises, firsts, quick, eco }
 */
export function buildKeynote(ctx) {
  const { d, phys, cs, prevChip, rivals, camCap, batCap, price, pf, points, promises, firsts, quick } = ctx;
  const C = new Set(d.concepts || []);
  const broke = new Set((promises || []).filter((p) => !p.ok).map((p) => p.id));
  const main = new Set(points || []);
  const out = [];

  // —— 开场白（偶尔来一句经典的）——
  const company = d.company || '我们';
  const greet = quick ? null : pickOne([
    { w: 'ARE YOU OK?', sub: '主讲人上台，挥手：「大家好！<b>Are you OK?</b>」', react: ['I\'m very OK!', '哈哈哈哈', '鬼畜预定'], mood: 'good' },
    { w: 'ARE YOU OK?', sub: '主讲人：「Hello, everybody! <b>Are you OK?</b>」', react: ['OK!!!', '熟悉的味道', '😂'], mood: 'good' },
    { w: '重新定义手机', sub: '「今天，我们要<b>重新定义手机</b>。」', react: ['又来了', '这次是真的吗', '👀'], mood: 'meh' },
    { w: '一年的努力', sub: '「为了今天，我们准备了整整一年。」', react: ['加油！', '期待', '👏'], mood: 'good' },
  ]);
  if (greet)
    out.push({
      key: 'greet',
      chap: null,
      wall: (g, W, H, t) => {
        bg(g, W, H, '#1a1030', '#30184a');
        title(g, typed(greet.w, t, 9), W / 2, H / 2 + 8, greet.w.length > 8 ? 18 : 22, '#ffd08a');
      },
      sub: greet.sub,
      react: greet.react,
      mood: greet.mood,
      pose: ['front', 'wide'],
      ms: 2600,
    });

  // —— 外观（必有，首页）——
  const matId = tier(d, 'material').id;
  const kind = C.has('titanium') ? 'metal' : MAT_KIND[matId] || 'plastic';
  const matName = C.has('titanium') ? '钛金属中框' : C.has('ceramic') ? '陶瓷机身' : MAT_NAME[kind];
  out.push({
    key: 'look',
    film: { name: 'material', data: { color: d.color, kind: C.has('titanium') ? 'metal' : kind === 'plastic' ? 'glass' : kind, name: matName, sub: kind === 'metal' ? `${C.has('titanium') || d.matSub === 'ti' ? '比不锈钢轻 45%' : '航空级铝材'} · CNC 一体精雕` : kind === 'glass' ? '康宁级玻璃 · 一抹流光' : kind === 'leather' ? '亲肤素皮 · 越用越有味道' : '多彩机身 · 耐摔耐磨' } },
    chap: '外观',
    main: main.has('thin'),
    wall: SLIDES[kind](d.color, matName, ['#23242c', '#eeeae0', '#8fd3b6', '#f2b8c6', '#5aa9d6', '#f2d45c', d.color].slice(-6)),
    kpi: { label: '机身厚度', from: +(phys.thickness + 2.4).toFixed(1), to: phys.thickness, dec: 1, unit: 'mm' },
    sub: `<b>${paletteName(d.color)}</b> · ${matName}${kind === 'metal' ? '，每一道边都经过抛光' : kind === 'glass' ? '，光线在背面流动' : ''}`,
    react: phys.thickness <= 8 ? ['好薄！', '颜值在线', '😍'] : kind === 'metal' ? ['这光泽！', '高级感', '✨'] : ['颜色好看', '手感应该不错'],
    mood: phys.thickness <= 8.4 || kind === 'metal' ? 'good' : 'meh',
    pose: ['hero', 'close'],
    shine: kind === 'metal' || kind === 'glass',
    ms: 3600,
  });
  // 配色整排亮相
  if (!quick) {
    const pal = ['#23242c', '#eeeae0', '#c9ccd1', '#2b4a7a', '#f2b8c6', '#8fd3b6', '#f08a4b'].filter((x) => x.toLowerCase() !== String(d.color).toLowerCase());
    const cols = [d.color, ...pal.slice(0, 3)];
    out.push({
      key: 'colors',
      chap: null,
      film: { name: 'colors', data: { colors: cols, names: cols.map((x) => paletteName(x)) } },
      sub: `${paletteName(d.color)}，以及另外三种配色`,
      react: ['选哪个好', '都想要', '🎨'],
      mood: 'good',
      pose: ['back', 'wide', { spin: 0.6 }],
      ms: 2800,
    });
  }
  if (main.has('thin') || phys.thickness <= 7.8) {
    const bad = broke.has('thin');
    out.push({
      key: 'thin',
      film: { name: 'thin', data: { mm: phys.thickness, color: d.color } },
      chap: null,
      main: main.has('thin'),
      wall: SLIDES.thin(phys.thickness, d.color),
      sub: bad ? `我们说过要做最薄……它是 <b>${phys.thickness}mm</b>。` : `侧面看——只有 <b>${phys.thickness}mm</b>，比 ${Math.max(2, Math.round(phys.thickness / 1.85))} 枚硬币叠起来还薄。<br/><small>（比友商薄了整整 0.01mm）</small>`,
      react: bad ? ['说好的极致轻薄？', '就这？', '😅'] : ['薄如蝉翼', '0.01mm 也是领先', '🤏'],
      mood: bad ? 'bad' : 'good',
      pose: ['side', 'close', { spin: 0 }],
      ms: 3000,
    });
  }

  if (!quick || main.has('fast')) {
    const up = prevChip ? Math.round((cs.bench / prevChip.bench - 1) * 100) : 0;
    const bad = broke.has('fast') || ctx.chipLag > 0;
    const beat = cs.bench > Math.max(...rivals.map((r) => r.v));
    out.push({
      key: 'chip',
      film: { name: 'chip', data: { chip: cs.label, bench: cs.bench } },
      chap: '性能',
      main: main.has('fast'),
      wall: SLIDES.bench(cs.bench, rivals, (d.modelName || '本机').slice(0, 6)),
      kpi: { label: `${cs.label} · 综合跑分`, from: 0, to: cs.bench, dec: 0, unit: '' },
      sub: `<b>${cs.label}</b>${up > 0 ? `，比上一代快 <b>${up}%</b>` : ''}${beat ? '，同期第一' : ''}${ctx.chipLag > 0 ? '<br/><small>（台下：友商都上新一代芯片了……）</small>' : bad ? '<br/><small>（性能调校没跟上，实际体验差点意思）</small>' : ''}`,
      react: ctx.chipLag > 0 ? ['老芯片？', '落后一代了', '🥱'] : bad ? ['发热呢？', '跑分没用', '😐'] : beat ? ['遥遥领先！', '这次真领先了', '🔥🔥'] : ['够用', '还行吧'],
      mood: bad ? 'bad' : beat ? 'good' : 'meh',
      pose: ['back', 'wide'],
      explode: true,
      ms: 3800,
    });
    if (beat && !bad)
      out.push({
        key: 'yyld',
        chap: null,
        wall: (g, W, H, t) => {
          bg(g, W, H, '#3d0a0a', '#a93226');
          const k = ease(t * 1.5);
          g.save();
          g.translate(W / 2, H / 2);
          g.scale(0.6 + k * 0.4, 0.6 + k * 0.4);
          title(g, '遥遥领先', 0, 10, 30, '#ffd700');
          g.restore();
          sheen(g, W, H, t, 1.4, 0.35);
        },
        kpi: { label: '领先同期最快机型', from: 0, to: Math.round((cs.bench / Math.max(...rivals.map((r) => r.v)) - 1) * 100), dec: 0, unit: '%' },
        sub: '主讲人停顿了三秒，只说了四个字：<b>遥遥领先。</b>',
        react: ['遥遥领先！！', '燃起来了', '🚀🚀🚀'],
        mood: 'good',
        pose: ['hero', 'close', { spin: 0.2 }],
        shine: true,
        sfx: 'fanfare',
        ms: 2800,
      });
  }

  const scr = d.parts.screen;
  if (!quick && scr >= 1) {
    out.push({
      key: 'screen',
      film: { name: 'display', data: { hz: scr >= 1 ? 120 : 90, nits: scr === 2 ? 3000 : 0 } },
      chap: '屏幕',
      wall: scr === 2 ? SLIDES.bright(3000) : SLIDES.refresh(120),
      kpi: scr === 2 ? { label: '峰值亮度', from: 400, to: 3000, dec: 0, unit: 'nit' } : { label: '自适应刷新率', from: 60, to: 120, dec: 0, unit: 'Hz' },
      sub: scr === 2 ? '烈日下也看得清：峰值亮度 <b>3000 nit</b>' : '<b>120Hz</b> 高刷，每一次滑动都跟手',
      react: ['好顺滑', '眼睛舒服', '👀'],
      mood: 'good',
      pose: ['front', 'close', { spin: 0 }],
      ms: 3200,
    });
  }

  const hasCam = d.parts.camera >= 1 || C.has('oneinch') || C.has('periscope') || C.has('gimbal');
  if ((!quick && hasCam) || main.has('photo')) {
    const bad = broke.has('photo');
    const mp = C.has('oneinch') ? '1 英寸' : d.parts.camera === 2 ? '2 亿' : '5000 万';
    out.push({
      key: 'camera',
      film: { name: 'camera', data: { zoom: C.has('periscope') ? 10 : d.parts.camera === 2 ? 5 : 3, cap: camCap, title: C.has('oneinch') ? '一英寸大底' : d.parts.camera === 2 ? '2 亿像素三摄' : '5000 万主摄' } },
      chap: '影像',
      main: main.has('photo'),
      wall: SLIDES.night(camCap),
      kpi: C.has('oneinch') ? { label: '主摄传感器', text: '1 英寸', unit: '' } : { label: '主摄像素', text: mp, unit: '像素' },
      sub: `${C.has('oneinch') ? '一英寸大底' : C.has('periscope') ? '潜望长焦' : tier(d, 'camera').label}，夜景直出，<b>没有修图</b>${bad ? '<br/><small>（不过噪点……大家都看到了）</small>' : ''}`,
      react: bad ? ['说好的影像叙事？', '糊了', '🤨'] : camCap >= 85 ? ['这是手机拍的？', '吊打相机', '📸'] : camCap >= 70 ? ['挺干净', '能发朋友圈'] : ['噪点有点多', '再练练'],
      mood: bad ? 'bad' : camCap >= 85 ? 'good' : camCap >= 70 ? 'meh' : 'bad',
      pose: ['back', 'top', { spin: 0 }],
      sfx: 'shutter',
      ms: 3600,
    });
  }

  const bigBat = d.parts.battery === 2 || C.has('sicarbon') || C.has('solar') || batCap >= 85;
  if ((!quick && bigBat) || main.has('battery')) {
    const bad = broke.has('battery');
    const days = batCap >= 95 ? 2.5 : batCap >= 80 ? 2 : 1.5;
    out.push({
      key: 'battery',
      film: { name: 'battery', data: { days } },
      chap: '续航',
      main: main.has('battery'),
      wall: SLIDES.days(days),
      kpi: { label: '重度使用', from: 0, to: days, dec: 1, unit: '天' },
      sub: `重度使用，一次充电撑 <b>${days} 天</b>${bad ? '<br/><small>（实验室数据，仅供参考）</small>' : ''}`,
      react: bad ? ['实验室数据吧', '不信', '🙄'] : days >= 2 ? ['电量焦虑退散', '终于！', '🔋🔋'] : ['还行', '够一天'],
      mood: bad ? 'bad' : days >= 2 ? 'good' : 'meh',
      pose: ['hero', 'wide'],
      ms: 3200,
    });
  }
  if (C.has('fastcharge') && !firsts.includes('百瓦快充')) {
    out.push({
      key: 'charge',
      film: { name: 'charge', data: {} },
      chap: '快充',
      wall: SLIDES.charge(),
      kpi: { label: '有线快充', from: 0, to: 100, dec: 0, unit: 'W' },
      sub: '十分钟充一半。换句话说——<b>充电五分钟，刷剧两小时</b>',
      react: ['这句好耳熟', '充电宝可以扔了', '⚡'],
      mood: 'good',
      pose: ['front', 'bottom', { spin: 0 }],
      ms: 3200,
    });
  }
  if (main.has('eco') || ctx.eco) {
    const bad = broke.has('eco');
    out.push({
      key: 'eco',
      chap: '生态',
      main: main.has('eco'),
      wall: SLIDES.eco(d.color),
      sub: bad ? '手机、手表、电脑、耳机……<b>理论上</b>都能一碰互传' : '手机、手表、电脑、耳机，<b>一碰互传</b>',
      react: bad ? ['理论上？', '又画饼', '🫓'] : ['全家桶安排', '丝滑', '🔗'],
      mood: bad ? 'bad' : 'good',
      pose: ['front', 'wide'],
      ms: 3000,
    });
  }

  // —— 其余概念件（首发的留给 One more thing）——
  const others = (d.concepts || []).map((id) => CONCEPTS.find((c) => c.id === id)).filter((c) => c && !firsts.includes(c.name) && c.id !== 'fastcharge');
  if (!quick)
    others.slice(0, 2).forEach((c) => {
      const fx = CONCEPT_FX[c.id];
      const base = SLIDES.concept(c, false);
      out.push({
        key: `c-${c.id}`,
        film: { name: 'concept', data: { id: c.id, icon: c.icon, name: c.name, desc: c.desc } },
        chap: c.name.length <= 4 ? c.name : '亮点',
        wall: fx ? (g, W, H, t) => { base(g, W, H, t); g.fillStyle = '#14101f'; g.fillRect(0, 0, 78, H); fx(g, W, H, t); } : base,
        sub: `<b>${c.name}</b> —— ${c.desc}`,
        react: ['有点意思', '想试试', c.icon],
        mood: 'good',
        pose: [c.cat === 'cam' ? 'back' : 'hero', c.cat === 'cam' ? 'top' : 'close'],
        ms: 3000,
      });
    });

  // —— One more thing ——
  const firstCs = firsts.map((n) => CONCEPTS.find((c) => c.name === n)).filter(Boolean);
  if (firstCs.length) {
    out.push({ key: 'omt', chap: null, wall: (g, W, H, t) => title(g, typed('ONE MORE THING…', t, 10), W / 2, H / 2 + 6, 18), sub: '还有一件事……', react: ['？？？', '要来了', '屏住呼吸'], mood: 'meh', pose: ['back', 'wide', { spin: 0 }], ms: 2200, dim: true });
    firstCs.slice(0, 2).forEach((c, i) => {
      const fx = CONCEPT_FX[c.id];
      const base = SLIDES.concept(c, true);
      out.push({
        key: `f-${c.id}`,
        film: { name: 'concept', data: { id: c.id, icon: c.icon, name: c.name, desc: c.desc, first: true } },
        chap: null,
        first: true,
        wall: fx ? (g, W, H, t) => { base(g, W, H, t); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, 78, H); fx(g, W, H, t); } : base,
        kpi: { label: '全球首发', text: c.name, unit: '' },
        sub: `全球首发：<b>${c.name}</b> —— ${c.desc}`,
        react: ['！！！', '这也行？', '买爆！', '🤯', '冲上热搜'],
        mood: 'good',
        pose: [i % 2 ? 'hero' : 'back', 'close'],
        fanfare: true,
        ms: 3400,
      });
    });
    out.push({
      key: 'only',
      chap: null,
      wall: (g, W, H, t) => {
        bg(g, W, H, '#000', '#111');
        txt(g, 'ONLY', W / 2, 22, 10, '#aab7b8');
        title(g, typed(company, t, 6), W / 2, 46, 20, '#fff');
        txt(g, 'CAN DO.', W / 2, 64, 10, '#aab7b8');
      },
      sub: `「这件事，<b>Only ${company} can do.</b>」`,
      react: ['好熟悉的句式', '狂起来了', '😎'],
      mood: 'good',
      pose: ['hero', 'wide', { spin: 0.25 }],
      ms: 2600,
    });
  }

  // —— 价格 ——
  const list = roundPrice(price * 1.2 + 300);
  const fair = ctx.fair || price;
  if (price <= fair * 0.95) {
    // 价格逐级砸下来
    const steps = [roundPrice(fair * 1.3), roundPrice(fair * 1.1), roundPrice(fair)].filter((v, i, a) => v > price * 1.04 && a.indexOf(v) === i);
    steps.forEach((v, i) =>
      out.push({
        key: `price-${i}`,
        chap: i === 0 ? '价格' : null,
        main: i === 0 && main.has('price'),
        wall: (g, W, H, t) => {
          mono(g, `¥${v}`, W / 2, 44, 26, '#fff');
          if (t > 0.6) {
            g.fillStyle = '#e74c3c';
            g.fillRect(W / 2 - 52, 36, Math.min(104, (t - 0.6) * 400), 4);
          }
        },
        sub: `不要 <b>¥${v}</b>！`,
        react: i === 0 ? ['来了来了', '熟悉的节奏'] : ['还降？', '😱'],
        mood: 'good',
        pose: ['hero', 'wide'],
        ms: 1500,
        notap: true,
      }),
    );
    out.push({
      key: 'price',
      chap: steps.length ? null : '价格',
      wall: SLIDES.price(steps[steps.length - 1] || list, price, '#2ecc71'),
      sub: `${steps.length ? '' : '首销价，'}只要——<b>¥${price}</b>！`,
      react: ['交个朋友！', '厚道！', '买买买', '👏👏👏'],
      mood: 'good',
      sfx: 'boom',
      ms: 2800,
    });
    return out;
  }
  out.push({
    key: 'price-q',
    chap: '价格',
    main: main.has('price'),
    wall: (g, W, H, t) => {
      mono(g, `¥${list}`, W / 2, 44, 24, t % 0.6 < 0.4 ? '#aab7b8' : '#5d6d7e');
    },
    sub: `售价……<b>¥${list}</b>？`,
    react: ['啊？', '这么贵'],
    mood: 'meh',
    pose: ['hero', 'wide'],
    ms: 1700,
  });
  const pricy = price >= fair * 1.12;
  out.push({
    key: 'price',
    chap: null,
    wall: SLIDES.price(list, price, pf > 0 ? '#2ecc71' : pf < 0 ? '#f1948a' : '#f5b041'),
    sub: pricy ? `首销价——<b>¥${price}</b>。<br/><small>（Pro Max 的价格，有没有 Pro Max 的体验，就看评测了）</small>` : `不！首销价——<b>¥${price}</b>！`,
    react: pricy ? ['价格也遥遥领先', '钱包：告辞', '😅'] : pf > 0 ? ['太良心了！', '买买买', '👏👏👏'] : pf < 0 ? ['还是贵', '等降价', '😅'] : ['可以！', '真香', '👍'],
    mood: pf < 0 ? 'meh' : 'good',
    sfx: 'boom',
    ms: 2600,
  });
  return out;
}

export { SLIDES, CONCEPT_FX, chipSpec };
