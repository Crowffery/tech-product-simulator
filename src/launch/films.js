import { KEYPAD_FILMS } from './films-keypad.js';
/**
 * 发布会「产品短片」：每个卖点一段全屏高清动画，学的是真实发布会的讲法——
 *   芯片：从机身推进到晶圆，电流沿电路跑进 CPU / GPU / NPU，核心依次点亮
 *   材质：微距特写，高光划过表面，最后整排配色亮相
 *   影像：取景器里 1× 推到 10×，夜景从满屏噪点变干净，快门一闪
 *   续航：一整天的时间轴，电量慢慢下降，友商先关机
 *   快充：电池像液体一样涨满，计时器飞转
 *   屏幕：60Hz 和 120Hz 并排滚动；烈日下依旧看得清
 *   轻薄：侧面剪影被卡尺夹住，和铅笔、硬币比厚度
 *   黑科技：图标 + 光芒 + 全球首发徽章；折叠 / 卫星 / AI 有专属动画
 *
 * 画布按屏幕分辨率绘制（不再是像素小屏），每帧重绘。
 */

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => 1 - Math.pow(1 - clamp(k), 3);
const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const seg = (t, a, b) => clamp((t - a) / (b - a));
const rand = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function hexRgb(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = (hex, a) => {
  const [r, g, b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
};
function mix(hex, k) {
  const [r, g, b] = hexRgb(hex);
  const f = (v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

const FONT = '"Noto Sans SC","PingFang SC",system-ui,sans-serif';

/** 发布会排版：小标签 + 巨大标题 + 副标题，逐行淡入 */
function type(g, W, H, t, { kicker, title, sub, at = 0.35, align = 'left', y = 0.2, color = '#fff', grad }) {
  const s = Math.min(W, H);
  const x = align === 'left' ? W * 0.07 : W / 2;
  g.textAlign = align;
  g.textBaseline = 'alphabetic';
  const k1 = ease(seg(t, at, at + 0.5));
  if (kicker) {
    g.globalAlpha = k1;
    g.fillStyle = grad ? grad[0] : '#f5b041';
    g.font = `800 ${Math.round(s * 0.032)}px ${FONT}`;
    g.fillText(kicker, x, H * y + (1 - k1) * 12);
  }
  const k2 = ease(seg(t, at + 0.15, at + 0.75));
  if (title) {
    g.globalAlpha = k2;
    const size = Math.round(s * (title.length > 8 ? 0.075 : 0.1));
    g.font = `900 ${size}px ${FONT}`;
    if (grad) {
      const gr = g.createLinearGradient(x - (align === 'center' ? size * 3 : 0), 0, x + size * 4, 0);
      gr.addColorStop(0, grad[0]);
      gr.addColorStop(1, grad[1]);
      g.fillStyle = gr;
    } else g.fillStyle = color;
    g.fillText(title, x, H * y + s * 0.1 + (1 - k2) * 18);
  }
  const k3 = ease(seg(t, at + 0.35, at + 0.95));
  if (sub) {
    g.globalAlpha = k3 * 0.85;
    g.fillStyle = '#d5d8dc';
    g.font = `600 ${Math.round(s * 0.034)}px ${FONT}`;
    g.fillText(sub, x, H * y + s * 0.16 + (1 - k3) * 10);
  }
  g.globalAlpha = 1;
}

function vignette(g, W, H, a = 0.65) {
  const r = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
  r.addColorStop(0, 'rgba(0,0,0,0)');
  r.addColorStop(1, `rgba(0,0,0,${a})`);
  g.fillStyle = r;
  g.fillRect(0, 0, W, H);
}

function glow(g, x, y, r, color, a = 0.6) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, rgba(color, a));
  gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr;
  g.fillRect(x - r, y - r, r * 2, r * 2);
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// ═════════════════════════ 短片 ═════════════════════════

const FILMS = {
  /** 芯片：推进到晶圆，看它怎么干活 */
  chip(g, W, H, t, d) {
    g.fillStyle = '#05060a';
    g.fillRect(0, 0, W, H);
    const s = Math.min(W, H);
    const cx = W / 2;
    const cy = H * 0.56;
    // 1. 推进：机身轮廓放大，芯片位置发光
    const zoom = easeIO(seg(t, 0, 1.1));
    const ps = s * (0.5 + zoom * 3.2);
    g.globalAlpha = 1 - seg(t, 0.7, 1.1);
    g.strokeStyle = '#5d6d7e';
    g.lineWidth = 2;
    rr(g, cx - ps * 0.24, cy - ps * 0.5 + ps * 0.22, ps * 0.48, ps, ps * 0.06);
    g.stroke();
    glow(g, cx, cy, s * 0.12 * (1 + zoom), '#f5b041', 0.5);
    g.globalAlpha = 1;
    // 2. 晶圆
    const k = ease(seg(t, 0.8, 1.4));
    if (k <= 0) return;
    const D = s * 0.62 * (0.7 + 0.3 * k);
    const x0 = cx - D / 2;
    const y0 = cy - D / 2;
    g.globalAlpha = k;
    // 封装金边与引脚
    g.fillStyle = '#1a1b22';
    rr(g, x0 - D * 0.06, y0 - D * 0.06, D * 1.12, D * 1.12, D * 0.05);
    g.fill();
    g.fillStyle = '#b9770e';
    for (let i = 0; i < 18; i++) {
      const p = x0 + (i + 0.5) * (D / 18);
      g.fillRect(p - 1.5, y0 - D * 0.075, 3, D * 0.03);
      g.fillRect(p - 1.5, y0 + D * 1.045, 3, D * 0.03);
      g.fillRect(x0 - D * 0.075, p - 1.5 - x0 + y0, D * 0.03, 3);
      g.fillRect(x0 + D * 1.045, p - 1.5 - x0 + y0, D * 0.03, 3);
    }
    const die = g.createLinearGradient(x0, y0, x0 + D, y0 + D);
    die.addColorStop(0, '#2c2f3a');
    die.addColorStop(0.5, '#3b3f4d');
    die.addColorStop(1, '#22242c');
    g.fillStyle = die;
    g.fillRect(x0, y0, D, D);
    // 区块：CPU 大核 / 小核、GPU、NPU、缓存
    const B = [
      { n: 'CPU', x: 0.05, y: 0.06, w: 0.42, h: 0.4, c: '#e67e22', cores: [2, 2], at: 1.5 },
      { n: 'GPU', x: 0.53, y: 0.06, w: 0.42, h: 0.4, c: '#5dade2', cores: [4, 3], at: 1.85 },
      { n: 'NPU', x: 0.05, y: 0.54, w: 0.42, h: 0.4, c: '#af7ac5', cores: [4, 4], at: 2.2 },
      { n: '缓存', x: 0.53, y: 0.54, w: 0.42, h: 0.4, c: '#48c9b0', cores: [6, 2], at: 2.4 },
    ];
    // 电路走线 + 跑动的电流
    g.strokeStyle = 'rgba(255,255,255,.07)';
    g.lineWidth = 1;
    for (let i = 0; i < 26; i++) {
      const yy = y0 + D * rand(i) ;
      g.beginPath();
      g.moveTo(x0, yy);
      g.lineTo(x0 + D * rand(i + 9), yy);
      g.lineTo(x0 + D * rand(i + 9), y0 + D * rand(i + 3));
      g.stroke();
    }
    for (let i = 0; i < 40; i++) {
      const p = (t * (0.6 + rand(i) * 0.9) + rand(i + 2)) % 1;
      const horiz = i % 2;
      const px = horiz ? x0 + p * D : x0 + D * rand(i + 5);
      const py = horiz ? y0 + D * rand(i + 7) : y0 + p * D;
      glow(g, px, py, D * 0.025, i % 3 ? '#f9e79f' : '#85c1e9', 0.9 * seg(t, 1.3, 1.6));
    }
    for (const b of B) {
      const on = ease(seg(t, b.at, b.at + 0.35));
      const bx = x0 + b.x * D;
      const by = y0 + b.y * D;
      const bw = b.w * D;
      const bh = b.h * D;
      g.fillStyle = 'rgba(0,0,0,.35)';
      g.fillRect(bx, by, bw, bh);
      g.strokeStyle = rgba(b.c, 0.35 + on * 0.65);
      g.lineWidth = 2;
      g.strokeRect(bx, by, bw, bh);
      const [cx2, cy2] = b.cores;
      for (let i = 0; i < cx2; i++)
        for (let j = 0; j < cy2; j++) {
          const load = on * (0.55 + 0.45 * Math.abs(Math.sin(t * 6 + i * 1.7 + j * 2.3)));
          const ww = bw / cx2;
          const hh = (bh - D * 0.06) / cy2;
          g.fillStyle = rgba(b.c, 0.15 + load * 0.75);
          g.fillRect(bx + i * ww + 3, by + D * 0.05 + j * hh + 3, ww - 6, hh - 6);
        }
      if (on > 0) glow(g, bx + bw / 2, by + bh / 2, bw * 0.7, b.c, 0.25 * on);
      g.globalAlpha = k * on;
      g.fillStyle = '#fff';
      g.font = `800 ${Math.round(D * 0.045)}px ${FONT}`;
      g.textAlign = 'left';
      g.fillText(b.n, bx + 6, by + D * 0.04);
      g.globalAlpha = k;
    }
    g.globalAlpha = 1;
    vignette(g, W, H, 0.5);
    const ops = Math.round((d.bench || 1000000) / 30000) ;
    type(g, W, H, t, { kicker: '性能', title: d.chip || '全新芯片', sub: `CPU · GPU · NPU 全面升级 · 每秒约 ${ops} 万亿次运算`, at: 1.6, y: 0.08, grad: ['#f5b041', '#ffffff'] });
  },

  /** 材质：微距 + 高光划过 */
  material(g, W, H, t, d) {
    const c = d.color || '#7f8c8d';
    const kind = d.kind || 'metal';
    const s = Math.min(W, H);
    // 底：材质纹理
    const base = g.createLinearGradient(0, 0, W, H);
    base.addColorStop(0, mix(c, kind === 'metal' ? 0.25 : 0.1));
    base.addColorStop(1, mix(c, -0.45));
    g.fillStyle = base;
    g.fillRect(0, 0, W, H);
    if (kind === 'metal') {
      for (let y = 0; y < H; y += 2) {
        g.fillStyle = `rgba(255,255,255,${0.02 + rand(y) * 0.06})`;
        g.fillRect(0, y, W, 1);
      }
    } else if (kind === 'leather') {
      for (let i = 0; i < 1600; i++) {
        g.fillStyle = `rgba(0,0,0,${0.08 + rand(i) * 0.12})`;
        g.fillRect(rand(i + 1) * W, rand(i + 2) * H, 2, 2);
      }
      g.strokeStyle = 'rgba(255,240,220,.7)';
      g.setLineDash([s * 0.025, s * 0.018]);
      g.lineWidth = Math.max(2, s * 0.006);
      g.lineDashOffset = -t * 40;
      g.beginPath();
      g.moveTo(0, H * 0.78);
      g.lineTo(W, H * 0.7);
      g.stroke();
      g.setLineDash([]);
    } else if (kind === 'glass') {
      for (let i = 0; i < 6; i++) {
        const y = H * (0.2 + i * 0.13) + Math.sin(t * 1.4 + i) * 20;
        g.strokeStyle = `rgba(255,255,255,${0.06 + i * 0.01})`;
        g.lineWidth = s * 0.04;
        g.beginPath();
        g.moveTo(0, y);
        g.bezierCurveTo(W * 0.3, y - 60, W * 0.6, y + 60, W, y - 10);
        g.stroke();
      }
    }
    // 微距：机身一角缓缓推近——机身、中框倒角、镜头，都是你的手机
    const push = easeIO(seg(t, 0, 3.4));
    const sc = 1 + push * 0.18;
    g.save();
    g.translate(W * 0.62, H * 0.62);
    g.scale(sc, sc);
    g.rotate(-0.08 + push * 0.04);
    const pw = W * 1.1;
    const ph = H * 1.1;
    const rad = s * 0.22;
    // 阴影
    g.fillStyle = 'rgba(0,0,0,.45)';
    rr(g, -pw * 0.5 + 18, -ph * 0.36 + 24, pw, ph, rad);
    g.fill();
    // 中框（金属环）
    const fr = g.createLinearGradient(-pw * 0.5, -ph * 0.36, -pw * 0.5 + s * 0.2, -ph * 0.36 + s * 0.2);
    fr.addColorStop(0, '#f4f6f7');
    fr.addColorStop(0.35, kind === 'leather' ? mix(c, 0.15) : '#8f959e');
    fr.addColorStop(0.7, '#e5e8e8');
    fr.addColorStop(1, '#5d6168');
    g.fillStyle = fr;
    rr(g, -pw * 0.5, -ph * 0.36, pw, ph, rad);
    g.fill();
    // 背板
    const inset = s * 0.028;
    const bodyG = g.createLinearGradient(-pw * 0.5, -ph * 0.36, pw * 0.1, ph * 0.3);
    bodyG.addColorStop(0, mix(c, kind === 'metal' ? 0.3 : 0.18));
    bodyG.addColorStop(0.5, mix(c, 0));
    bodyG.addColorStop(1, mix(c, -0.4));
    g.fillStyle = bodyG;
    rr(g, -pw * 0.5 + inset, -ph * 0.36 + inset, pw - inset * 2, ph - inset * 2, rad - inset);
    g.fill();
    // 材质细节
    g.save();
    rr(g, -pw * 0.5 + inset, -ph * 0.36 + inset, pw - inset * 2, ph - inset * 2, rad - inset);
    g.clip();
    if (kind === 'metal') for (let y = -ph * 0.36; y < ph * 0.7; y += 2) {
      g.fillStyle = `rgba(255,255,255,${0.015 + rand(y + 3) * 0.04})`;
      g.fillRect(-pw * 0.5, y, pw, 1);
    }
    if (kind === 'leather') for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(0,0,0,${0.1 + rand(i) * 0.12})`;
      g.fillRect(-pw * 0.5 + rand(i + 1) * pw, -ph * 0.36 + rand(i + 2) * ph, 2.5, 2.5);
    }
    if (kind === 'glass') {
      const gl = g.createLinearGradient(-pw * 0.5, -ph * 0.36, -pw * 0.2, -ph * 0.1);
      gl.addColorStop(0, 'rgba(255,255,255,.35)');
      gl.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gl;
      g.fillRect(-pw * 0.5, -ph * 0.36, pw, ph);
    }
    g.restore();
    // 镜头模组
    const lx = -pw * 0.5 + s * 0.2;
    const ly = -ph * 0.36 + s * 0.2;
    g.fillStyle = mix(c, -0.25);
    rr(g, lx - s * 0.09, ly - s * 0.09, s * 0.32, s * 0.32, s * 0.06);
    g.fill();
    [[0, 0], [s * 0.15, 0], [0, s * 0.15]].forEach(([dx, dy], i) => {
      const r = s * (i ? 0.05 : 0.065);
      const ring = g.createLinearGradient(lx + dx - r, ly + dy - r, lx + dx + r, ly + dy + r);
      ring.addColorStop(0, '#f4f6f7');
      ring.addColorStop(1, '#4d5056');
      g.fillStyle = ring;
      g.beginPath();
      g.arc(lx + dx, ly + dy, r, 0, Math.PI * 2);
      g.fill();
      const glass = g.createRadialGradient(lx + dx - r * 0.3, ly + dy - r * 0.3, 1, lx + dx, ly + dy, r * 0.8);
      glass.addColorStop(0, '#5d6d7e');
      glass.addColorStop(0.4, '#0b1a2e');
      glass.addColorStop(1, '#020409');
      g.fillStyle = glass;
      g.beginPath();
      g.arc(lx + dx, ly + dy, r * 0.8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)';
      g.beginPath();
      g.arc(lx + dx - r * 0.3, ly + dy - r * 0.3, r * 0.14, 0, Math.PI * 2);
      g.fill();
    });
    g.restore();
    // 高光扫过整个画面
    const sx = -W * 0.4 + ((t * 0.55) % 1.4) * W * 1.4;
    const hl = g.createLinearGradient(sx - W * 0.15, 0, sx + W * 0.15, H);
    hl.addColorStop(0, 'rgba(255,255,255,0)');
    hl.addColorStop(0.5, `rgba(255,255,255,${kind === 'leather' ? 0.12 : 0.4})`);
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl;
    g.fillRect(0, 0, W, H);
    // 中框倒角上的闪点
    if (kind !== 'leather')
      for (let i = 0; i < 8; i++) {
        const tw = Math.max(0, Math.sin(t * 3 + i * 1.3));
        const x = W * (0.1 + rand(i + 20) * 0.8);
        const y = H * 0.3 + rand(i + 30) * H * 0.15;
        g.fillStyle = `rgba(255,255,255,${tw * 0.9})`;
        g.fillRect(x - 1, y - s * 0.014 * tw, 2, s * 0.028 * tw);
        g.fillRect(x - s * 0.014 * tw, y - 1, s * 0.028 * tw, 2);
      }
    vignette(g, W, H, 0.55);
    type(g, W, H, t, { kicker: '材质', title: d.name || '全新机身', sub: d.sub || '', at: 0.4, y: 0.12 });
  },

  /** 配色：整排亮相 */
  colors(g, W, H, t, d) {
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#f4f1ea');
    bg.addColorStop(1, '#d9d4c7');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const cols = d.colors || ['#23242c', '#eeeae0', '#5aa9d6', '#f2b8c6'];
    const n = cols.length;
    const s = Math.min(W, H);
    const pw = Math.min(W / (n * 1.18 + 0.4), s * 0.3);
    const ph = pw * 2.05;
    cols.forEach((c, i) => {
      const k = ease(seg(t, 0.2 + i * 0.18, 0.9 + i * 0.18));
      const x = W / 2 + (i - (n - 1) / 2) * pw * 1.18 - pw / 2;
      const y = H * 0.42 + (1 - k) * H * 0.5;
      g.globalAlpha = k;
      g.fillStyle = 'rgba(0,0,0,.18)';
      g.beginPath();
      g.ellipse(x + pw / 2, H * 0.42 + ph + 10, pw * 0.45, 8, 0, 0, Math.PI * 2);
      g.fill();
      const body = g.createLinearGradient(x, y, x + pw, y + ph);
      body.addColorStop(0, mix(c, 0.2));
      body.addColorStop(1, mix(c, -0.25));
      g.fillStyle = body;
      rr(g, x, y, pw, ph, pw * 0.16);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,.55)';
      rr(g, x + pw * 0.1, y + pw * 0.1, pw * 0.34, pw * 0.5, pw * 0.08);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.25)';
      g.fillRect(x + pw * 0.08, y + 6, 3, ph - 12);
      g.fillStyle = '#2f2117';
      g.textAlign = 'center';
      g.font = `700 ${Math.round(s * 0.026)}px ${FONT}`;
      g.fillText(d.names?.[i] || '', x + pw / 2, H * 0.42 + ph + 34);
    });
    g.globalAlpha = 1;
    type(g, W, H, t, { kicker: '配色', title: `${n} 种颜色`, sub: '每一种，都值得被看见', at: 0.1, y: 0.07, align: 'center', color: '#2f2117' });
  },

  /** 影像：取景器 → 变焦 → 夜景去噪 → 快门 */
  camera(g, W, H, t, d) {
    const s = Math.min(W, H);
    const maxZoom = d.zoom || 3;
    const z = 1 + (maxZoom - 1) * easeIO(seg(t, 1.0, 2.4));
    g.save();
    const fx = W * 0.68;
    const fy = H * 0.28;
    g.translate(fx, fy);
    g.scale(z, z);
    g.translate(-fx, -fy);
    // 夜空 + 月亮 + 城市
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#060a24');
    sky.addColorStop(1, '#2e1f4f');
    g.fillStyle = sky;
    g.fillRect(-W, -H, W * 3, H * 3);
    for (let i = 0; i < 120; i++) {
      g.fillStyle = `rgba(255,255,255,${0.3 + rand(i) * 0.7})`;
      g.fillRect(rand(i + 1) * W, rand(i + 2) * H * 0.6, 1.5, 1.5);
    }
    glow(g, fx, fy, s * 0.12, '#fdebd0', 0.35);
    g.fillStyle = '#fdf2d0';
    g.beginPath();
    g.arc(fx, fy, s * 0.045, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(160,140,110,.35)';
    [[-0.3, -0.2, 0.25], [0.25, 0.1, 0.18], [-0.05, 0.35, 0.14], [0.35, -0.35, 0.1]].forEach(([dx, dy, r]) => {
      g.beginPath();
      g.arc(fx + dx * s * 0.045, fy + dy * s * 0.045, r * s * 0.045, 0, Math.PI * 2);
      g.fill();
    });
    for (let i = 0; i < 22; i++) {
      const bw = W / 18;
      const bh = H * (0.15 + rand(i + 50) * 0.3);
      const bx = i * bw * 0.9 - bw;
      g.fillStyle = '#0c0e1c';
      g.fillRect(bx, H - bh, bw * 0.85, bh);
      for (let yy = H - bh + 8; yy < H - 6; yy += 10)
        for (let xx = bx + 5; xx < bx + bw * 0.85 - 5; xx += 9) if (rand(xx * 3.1 + yy) > 0.55) {
          g.fillStyle = rand(xx + yy) > 0.5 ? '#f7dc6f' : '#f0b27a';
          g.fillRect(xx, yy, 4, 5);
        }
    }
    g.restore();
    // 噪点：先很脏，夜景算法跑完变干净（干净程度看影像实力）
    const clean = ease(seg(t, 2.3, 3.0));
    const floor = Math.max(0, (100 - (d.cap || 80)) / 100);
    const noise = Math.round((1 - clean) * 2600 + floor * 900);
    for (let i = 0; i < noise; i++) {
      const v = 60 + Math.random() * 160;
      g.fillStyle = `rgba(${v},${v},${v},.5)`;
      g.fillRect(Math.random() * W, Math.random() * H, 2, 2);
    }
    // 取景器 UI
    g.strokeStyle = 'rgba(255,255,255,.8)';
    g.lineWidth = 2;
    const fb = s * 0.09 * (1 + 0.3 * (1 - ease(seg(t, 0.3, 0.7))));
    const bx = fx - fb;
    const by = fy - fb;
    const L = fb * 0.4;
    g.strokeStyle = t > 0.7 ? '#f7dc6f' : '#fff';
    [[bx, by, 1, 1], [bx + fb * 2, by, -1, 1], [bx, by + fb * 2, 1, -1], [bx + fb * 2, by + fb * 2, -1, -1]].forEach(([x, y, sx, sy]) => {
      g.beginPath();
      g.moveTo(x, y + sy * L);
      g.lineTo(x, y);
      g.lineTo(x + sx * L, y);
      g.stroke();
    });
    // 变焦档位
    const zooms = maxZoom >= 10 ? [1, 3, 10] : maxZoom >= 5 ? [1, 2, 5] : [1, 2, 3];
    zooms.forEach((zz, i) => {
      const on = z >= zz * 0.95 && (i === zooms.length - 1 || z < zooms[i + 1] * 0.95);
      const px = W / 2 + (i - 1) * s * 0.11;
      const py = H * 0.8;
      g.fillStyle = on ? 'rgba(247,220,111,.95)' : 'rgba(0,0,0,.45)';
      g.beginPath();
      g.arc(px, py, s * 0.035, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = on ? '#000' : '#fff';
      g.textAlign = 'center';
      g.font = `800 ${Math.round(s * 0.026)}px ${FONT}`;
      g.fillText(on ? `${z.toFixed(z < 2 ? 1 : 0)}×` : `${zz}×`, px, py + s * 0.01);
    });
    // 快门键
    g.strokeStyle = '#fff';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(W / 2, H * 0.92, s * 0.045, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = t > 2.95 && t < 3.1 ? '#e74c3c' : '#fff';
    g.beginPath();
    g.arc(W / 2, H * 0.92, s * 0.036, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.textAlign = 'left';
    g.font = `700 ${Math.round(s * 0.024)}px ${FONT}`;
    g.fillText(clean < 0.99 ? '🌙 夜景模式 · 正在合成…' : '🌙 夜景模式 · 直出', W * 0.05, H * 0.06);
    // 快门闪白
    const fl = seg(t, 3.0, 3.05) - seg(t, 3.05, 3.4);
    if (fl > 0) {
      g.fillStyle = `rgba(255,255,255,${fl})`;
      g.fillRect(0, 0, W, H);
    }
    type(g, W, H, t, { kicker: '影像', title: d.title || '主摄', sub: maxZoom >= 10 ? '十倍光学变焦 · 夜景直出' : '夜景直出 · 无需修图', at: 0.3, y: 0.1 });
  },

  /** 续航：一整天的时间轴 */
  battery(g, W, H, t, d) {
    const s = Math.min(W, H);
    const days = d.days || 1.5;
    const hours = days * 24;
    const p = ease(seg(t, 0.5, 3.0));
    const now = p * hours;
    const dayK = (now % 24) / 24;
    const isDay = dayK > 0.25 && dayK < 0.8;
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, isDay ? '#5dade2' : '#0b1030');
    bg.addColorStop(1, isDay ? '#d6eaf8' : '#1b2631');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const a = dayK * Math.PI * 2 - Math.PI / 2;
    const sx = W / 2 + Math.cos(a - Math.PI / 2) * W * 0.42;
    const sy = H * 0.55 + Math.sin(a - Math.PI / 2) * H * 0.4;
    glow(g, sx, sy, s * 0.12, isDay ? '#f9e79f' : '#d6eaf8', 0.6);
    // 大电池
    const bw = s * 0.5;
    const bh = s * 0.22;
    const bx = W / 2 - bw / 2;
    const by = H * 0.5;
    const left = Math.max(0.03, 1 - now / hours);
    g.strokeStyle = isDay ? '#1b2631' : '#fff';
    g.lineWidth = s * 0.012;
    rr(g, bx, by, bw, bh, s * 0.03);
    g.stroke();
    g.fillStyle = g.strokeStyle;
    g.fillRect(bx + bw + s * 0.01, by + bh * 0.3, s * 0.025, bh * 0.4);
    g.fillStyle = left > 0.2 ? '#2ecc71' : '#e67e22';
    rr(g, bx + s * 0.018, by + s * 0.018, (bw - s * 0.036) * left, bh - s * 0.036, s * 0.015);
    g.fill();
    g.fillStyle = isDay ? '#1b2631' : '#fff';
    g.textAlign = 'center';
    g.font = `900 ${Math.round(s * 0.07)}px ${FONT}`;
    g.fillText(`${Math.round(left * 100)}%`, W / 2, by + bh * 0.68);
    // 时间轴
    const ty = H * 0.84;
    g.fillStyle = 'rgba(0,0,0,.25)';
    g.fillRect(W * 0.08, ty, W * 0.84, 6);
    g.fillStyle = '#f5b041';
    g.fillRect(W * 0.08, ty, W * 0.84 * p, 6);
    const acts = ['🎬 追剧', '🗺 导航', '🎮 游戏', '📷 拍照', '💬 聊天'];
    acts.forEach((ac, i) => {
      const at = (i + 0.5) / acts.length;
      if (p < at) return;
      const k = ease(seg(p, at, at + 0.08));
      g.globalAlpha = k;
      g.font = `700 ${Math.round(s * 0.028)}px ${FONT}`;
      g.fillStyle = isDay ? '#1b2631' : '#fff';
      g.fillText(ac, W * 0.08 + W * 0.84 * at, ty - 14 - (1 - k) * 10);
    });
    g.globalAlpha = 1;
    g.font = `800 ${Math.round(s * 0.03)}px ${FONT}`;
    g.fillText(`第 ${Math.min(Math.ceil(days), Math.floor(now / 24) + 1)} 天 · ${String(Math.floor(now % 24)).padStart(2, '0')}:00`, W / 2, ty + s * 0.06);
    // 友商先没电
    if (now > 22) {
      const k = ease(seg(now, 22, 26));
      g.globalAlpha = k;
      g.fillStyle = 'rgba(192,57,43,.92)';
      rr(g, W * 0.62, H * 0.36, s * 0.3, s * 0.07, 8);
      g.fill();
      g.fillStyle = '#fff';
      g.font = `800 ${Math.round(s * 0.026)}px ${FONT}`;
      g.fillText('🪫 友商机型：已关机', W * 0.62 + s * 0.15, H * 0.36 + s * 0.045);
      g.globalAlpha = 1;
    }
    type(g, W, H, t, { kicker: '续航', title: `${days} 天一充`, sub: '重度使用实测', at: 0.2, y: 0.08, color: isDay ? '#1b2631' : '#fff' });
  },

  /** 快充：电池像液体一样涨满 */
  charge(g, W, H, t, d) {
    const s = Math.min(W, H);
    g.fillStyle = '#07080d';
    g.fillRect(0, 0, W, H);
    const k = ease(seg(t, 0.4, 2.8));
    const pct = Math.round(k * 50);
    const bw = s * 0.3;
    const bh = s * 0.6;
    const bx = W / 2 - bw / 2;
    const by = H * 0.3;
    // 闪电流入
    for (let i = 0; i < 26; i++) {
      const q = (t * 1.6 + rand(i)) % 1;
      const x = W / 2 + Math.sin(i * 1.9 + t * 4) * s * 0.02;
      const y = H + 20 - q * (H - by - bh + 40);
      glow(g, x, y, s * 0.03, '#f5b041', 0.9);
    }
    g.strokeStyle = '#fff';
    g.lineWidth = s * 0.01;
    rr(g, bx, by, bw, bh, s * 0.04);
    g.stroke();
    g.fillStyle = '#fff';
    g.fillRect(W / 2 - bw * 0.2, by - s * 0.03, bw * 0.4, s * 0.025);
    // 液面 + 波浪
    const lv = by + bh - (bh - s * 0.03) * (pct / 100) * 1.6;
    g.save();
    rr(g, bx + s * 0.015, by + s * 0.015, bw - s * 0.03, bh - s * 0.03, s * 0.03);
    g.clip();
    const liq = g.createLinearGradient(0, lv, 0, by + bh);
    liq.addColorStop(0, '#58d68d');
    liq.addColorStop(1, '#1e8449');
    g.fillStyle = liq;
    g.beginPath();
    g.moveTo(bx, by + bh);
    for (let x = 0; x <= bw; x += 4) g.lineTo(bx + x, lv + Math.sin(x * 0.05 + t * 6) * s * 0.012);
    g.lineTo(bx + bw, by + bh);
    g.fill();
    for (let i = 0; i < 14; i++) {
      const q = (t * 0.8 + rand(i + 3)) % 1;
      g.fillStyle = 'rgba(255,255,255,.35)';
      g.beginPath();
      g.arc(bx + rand(i) * bw, by + bh - q * (by + bh - lv), 3 + rand(i + 1) * 4, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
    glow(g, W / 2, lv, s * 0.25, '#2ecc71', 0.25);
    g.fillStyle = '#fff';
    g.textAlign = 'center';
    g.font = `900 ${Math.round(s * 0.09)}px ${FONT}`;
    g.fillText(`${pct}%`, W / 2, by + bh * 0.55);
    g.font = `800 ${Math.round(s * 0.04)}px monospace`;
    g.fillStyle = '#f5b041';
    g.fillText(`00:${String(Math.round(k * 10)).padStart(2, '0')}`, W / 2, by + bh * 0.55 + s * 0.07);
    type(g, W, H, t, { kicker: '快充', title: '十分钟，充一半', sub: '充电五分钟，刷剧两小时', at: 0.1, y: 0.06, align: 'center', grad: ['#f5b041', '#58d68d'] });
  },

  /** 屏幕：60Hz vs 高刷 */
  display(g, W, H, t, d) {
    const s = Math.min(W, H);
    g.fillStyle = '#0a0b10';
    g.fillRect(0, 0, W, H);
    const lane = (cx, fps, label, col) => {
      const pw = s * 0.32;
      const ph = s * 0.62;
      const x = cx - pw / 2;
      const y = H * 0.3;
      g.fillStyle = '#000';
      rr(g, x - 6, y - 6, pw + 12, ph + 12, s * 0.04);
      g.fill();
      g.save();
      rr(g, x, y, pw, ph, s * 0.03);
      g.clip();
      g.fillStyle = '#1b2631';
      g.fillRect(x, y, pw, ph);
      const tt = Math.floor(t * fps) / fps;
      const off = (tt * ph * 0.9) % (ph * 0.3);
      for (let i = -1; i < 9; i++) {
        const yy = y + i * ph * 0.12 - off;
        g.fillStyle = ['#5dade2', '#f5b041', '#af7ac5', '#58d68d'][(i + 10) % 4];
        g.fillRect(x + pw * 0.08, yy + 6, pw * 0.16, ph * 0.08);
        g.fillStyle = 'rgba(255,255,255,.75)';
        g.fillRect(x + pw * 0.3, yy + 10, pw * 0.55, 6);
        g.fillStyle = 'rgba(255,255,255,.35)';
        g.fillRect(x + pw * 0.3, yy + 22, pw * 0.4, 5);
      }
      if (fps > 30) {
        g.fillStyle = 'rgba(93,173,226,.08)';
        g.fillRect(x, y, pw, ph);
      }
      g.restore();
      g.fillStyle = col;
      g.textAlign = 'center';
      g.font = `900 ${Math.round(s * 0.05)}px ${FONT}`;
      g.fillText(label, cx, y + ph + s * 0.08);
    };
    lane(W * 0.3, 7, '60Hz', '#7f8c8d');
    lane(W * 0.7, 60, `${d.hz || 120}Hz`, '#5dade2');
    if (d.nits) {
      const k = ease(seg(t, 2.2, 3.0));
      g.fillStyle = `rgba(255,248,220,${k * 0.5})`;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = k;
      g.fillStyle = '#1b2631';
      g.textAlign = 'center';
      g.font = `900 ${Math.round(s * 0.07)}px ${FONT}`;
      g.fillText(`峰值 ${d.nits} nit：烈日下也看得清`, W / 2, H * 0.24);
      g.globalAlpha = 1;
    }
    type(g, W, H, t, { kicker: '屏幕', title: '每一次滑动都跟手', sub: '左边是普通屏，右边是我们的', at: 0.2, y: 0.06, align: 'center' });
  },

  /** 轻薄：卡尺 + 铅笔对比 */
  thin(g, W, H, t, d) {
    const s = Math.min(W, H);
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#fbfaf7');
    bg.addColorStop(1, '#e5e1d8');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    const mm = d.mm || 7.8;
    const unit = s * 0.022; // 每毫米的像素
    const k = easeIO(seg(t, 0.3, 1.6));
    const th = (mm + (1 - k) * 4) * unit;
    const y = H * 0.55;
    // 机身侧面剪影
    const grd = g.createLinearGradient(0, y - th / 2, 0, y + th / 2);
    grd.addColorStop(0, mix(d.color || '#7f8c8d', 0.35));
    grd.addColorStop(0.5, mix(d.color || '#7f8c8d', -0.1));
    grd.addColorStop(1, mix(d.color || '#7f8c8d', -0.45));
    g.fillStyle = grd;
    rr(g, W * 0.08, y - th / 2, W * 0.84, th, th / 2);
    g.fill();
    // 铅笔（约 7.5mm）
    const pk = ease(seg(t, 1.6, 2.2));
    if (pk > 0) {
      const ph = 7.5 * unit;
      const py = y + s * 0.18;
      g.globalAlpha = pk;
      g.fillStyle = '#f4d03f';
      g.fillRect(W * 0.2, py - ph / 2, W * 0.55, ph);
      g.fillStyle = '#f5cba7';
      g.beginPath();
      g.moveTo(W * 0.75, py - ph / 2);
      g.lineTo(W * 0.82, py);
      g.lineTo(W * 0.75, py + ph / 2);
      g.fill();
      g.fillStyle = '#2f2117';
      g.font = `700 ${Math.round(s * 0.026)}px ${FONT}`;
      g.textAlign = 'left';
      g.fillText('一支铅笔 7.5mm', W * 0.2, py + ph + s * 0.04);
      g.globalAlpha = 1;
    }
    // 卡尺
    const ck = ease(seg(t, 0.8, 1.4));
    g.strokeStyle = '#c0392b';
    g.lineWidth = 3;
    const cx = W * 0.5;
    g.globalAlpha = ck;
    g.beginPath();
    g.moveTo(cx - s * 0.08, y - th / 2 - 2);
    g.lineTo(cx + s * 0.08, y - th / 2 - 2);
    g.moveTo(cx - s * 0.08, y + th / 2 + 2);
    g.lineTo(cx + s * 0.08, y + th / 2 + 2);
    g.moveTo(cx + s * 0.06, y - th / 2 - s * 0.06);
    g.lineTo(cx + s * 0.06, y + th / 2 + s * 0.06);
    g.stroke();
    g.fillStyle = '#c0392b';
    g.font = `900 ${Math.round(s * 0.05)}px monospace`;
    g.textAlign = 'left';
    g.fillText(`${(mm + (1 - k) * 4).toFixed(1)}mm`, cx + s * 0.09, y + s * 0.015);
    g.globalAlpha = 1;
    type(g, W, H, t, { kicker: '设计', title: `薄至 ${mm}mm`, sub: '比一支铅笔还薄', at: 1.2, y: 0.08, align: 'center', color: '#2f2117' });
  },

  /** 黑科技 / 全球首发 */
  concept(g, W, H, t, d) {
    const s = Math.min(W, H);
    const first = !!d.first;
    const bg = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, Math.max(W, H) * 0.8);
    bg.addColorStop(0, first ? '#5b2c6f' : '#1b2631');
    bg.addColorStop(1, '#05060a');
    g.fillStyle = bg;
    g.fillRect(0, 0, W, H);
    // 放射光
    g.save();
    g.translate(W / 2, H * 0.45);
    g.rotate(t * 0.25);
    for (let i = 0; i < 18; i++) {
      g.rotate((Math.PI * 2) / 18);
      g.fillStyle = first ? 'rgba(245,176,65,.07)' : 'rgba(93,173,226,.06)';
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(-s * 0.06, -Math.max(W, H));
      g.lineTo(s * 0.06, -Math.max(W, H));
      g.fill();
    }
    g.restore();
    for (let i = 0; i < 3; i++) {
      const r = ((t * 0.5 + i / 3) % 1) * s * 0.5;
      g.strokeStyle = `rgba(255,255,255,${0.35 * (1 - r / (s * 0.5))})`;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(W / 2, H * 0.45, r, 0, Math.PI * 2);
      g.stroke();
    }
    const fx = SPECIAL[d.id];
    const k = ease(seg(t, 0.2, 0.9));
    if (fx) fx(g, W, H, t, s, d);
    else {
      g.globalAlpha = k;
      g.font = `${Math.round(s * 0.22 * (0.8 + 0.2 * k))}px ${FONT}`;
      g.textAlign = 'center';
      g.fillText(d.icon || '✨', W / 2, H * 0.45 + s * 0.08);
      g.globalAlpha = 1;
    }
    if (first) {
      const bk = ease(seg(t, 1.0, 1.4));
      g.globalAlpha = bk;
      g.fillStyle = '#f5b041';
      rr(g, W / 2 - s * 0.14, H * 0.12, s * 0.28, s * 0.06, 6);
      g.fill();
      g.fillStyle = '#2f2117';
      g.textAlign = 'center';
      g.font = `900 ${Math.round(s * 0.034)}px ${FONT}`;
      g.fillText('🏆 全球首发', W / 2, H * 0.12 + s * 0.042);
      g.globalAlpha = 1;
    }
    type(g, W, H, t, { title: d.name, sub: d.desc, at: 0.6, y: 0.66, align: 'center', grad: first ? ['#f5b041', '#ffffff'] : null });
  },
};

/** 部分黑科技的专属演示 */
const SPECIAL = {
  fold(g, W, H, t, s) {
    const k = easeIO(seg(t, 0.4, 1.8));
    const cx = W / 2;
    const cy = H * 0.45;
    const pw = s * 0.2;
    const ph = s * 0.4;
    g.fillStyle = '#5dade2';
    g.fillRect(cx - pw, cy - ph / 2, pw, ph);
    // 右半屏翻开（用宽度模拟透视）
    const open = -Math.cos(k * Math.PI); // -1 合上 → 1 完全展开
    g.fillStyle = '#85c1e9';
    g.fillRect(cx, cy - ph / 2, pw * Math.max(0.02, (open + 1) / 2), ph);
    g.fillStyle = 'rgba(255,255,255,.6)';
    g.fillRect(cx - 1, cy - ph / 2, 2, ph);
  },
  trifold(g, W, H, t, s) {
    SPECIAL.fold(g, W, H, t, s);
  },
  sat(g, W, H, t, s) {
    const cy = H * 0.95;
    g.fillStyle = '#1a5276';
    g.beginPath();
    g.arc(W / 2, cy + s * 0.9, s * 1.2, Math.PI, 0);
    g.fill();
    const a = Math.PI * 1.15 + t * 0.35;
    const sx = W / 2 + Math.cos(a) * s * 0.45;
    const sy = H * 0.55 + Math.sin(a) * s * 0.35;
    g.font = `${Math.round(s * 0.1)}px ${FONT}`;
    g.textAlign = 'center';
    g.fillText('🛰️', sx, sy);
    g.fillText('📱', W * 0.35, H * 0.62);
    for (let i = 0; i < 6; i++) {
      const q = (t * 1.2 + i / 6) % 1;
      glow(g, W * 0.35 + (sx - W * 0.35) * q, H * 0.6 + (sy - H * 0.6) * q, s * 0.025, '#f5b041', 1 - q);
    }
  },
  ai(g, W, H, t, s) {
    const lines = [['你', '帮我写一句发布会结束语'], ['AI', '今天，我们把未来装进了口袋。']];
    lines.forEach(([who, msg], i) => {
      const k = ease(seg(t, 0.3 + i * 0.9, 0.6 + i * 0.9));
      if (k <= 0) return;
      const shown = msg.slice(0, Math.floor(seg(t, 0.4 + i * 0.9, 1.1 + i * 0.9) * msg.length));
      const w = s * 0.62;
      const x = who === '你' ? W / 2 - w * 0.4 : W / 2 - w * 0.6;
      const y = H * 0.3 + i * s * 0.14;
      g.globalAlpha = k;
      g.fillStyle = who === '你' ? '#5dade2' : '#8e44ad';
      rr(g, x, y, w, s * 0.1, s * 0.03);
      g.fill();
      g.fillStyle = '#fff';
      g.textAlign = 'left';
      g.font = `700 ${Math.round(s * 0.032)}px ${FONT}`;
      g.fillText(shown, x + s * 0.03, y + s * 0.062);
    });
    g.globalAlpha = 1;
  },
};

// ═════════════════════════ 播放器 ═════════════════════════

export function createFilmLayer(host) {
  const cv = document.createElement('canvas');
  cv.className = 'film';
  host.appendChild(cv);
  const g = cv.getContext('2d');
  let cur = null;
  let raf = 0;
  const fit = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(host.clientWidth * dpr);
    cv.height = Math.round(host.clientHeight * dpr);
  };
  fit();
  window.addEventListener('resize', fit);
  const loop = (now) => {
    if (!cur) return;
    const t = (now - cur.t0) / 1000;
    g.save();
    g.clearRect(0, 0, cv.width, cv.height);
    try {
      FILMS[cur.name](g, cv.width, cv.height, t, cur.data);
    } catch (e) {
      console.error(e);
    }
    g.restore();
    raf = requestAnimationFrame(loop);
  };
  return {
    has: (name) => !!FILMS[name],
    play(name, data = {}) {
      if (!FILMS[name]) return;
      cur = { name, data, t0: performance.now() };
      cv.classList.add('on');
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(loop);
    },
    stop() {
      cv.classList.remove('on');
      setTimeout(() => {
        if (!cv.classList.contains('on')) {
          cur = null;
          cancelAnimationFrame(raf);
        }
      }, 450);
    },
    dispose() {
      cur = null;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      cv.remove();
    },
  };
}

Object.assign(FILMS, KEYPAD_FILMS);
export { FILMS };
