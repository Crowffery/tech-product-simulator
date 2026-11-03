import { productEraOf } from '../game/eras/index.js';
import { createFeatureScreen } from './featureOS.js';
/**
 * 发布会专用：可动、可切换的手机屏 OS（程序化 Canvas）
 * 设计台仍用静态低清 wallpaper；仅 presentation/keynote 走 LiveScreen。
 *
 * ── 动画核心（Ollie Johnston & Frank Thomas《The Illusion of Life》12 Principles）──
 * 核心一句话：用时间与姿态让观众提前知道什么重要、相信重量与因果，
 * 并在高潮后有余韵（anticipation → action → follow-through），不是「一直在动」。
 *
 * 本文件优先落地：
 * 1 Squash & Stretch  图标弹入/卡片落地略压扁再回弹，宽高反向补偿保体积
 * 2 Anticipation      大切换前 120–220ms 压暗/微缩，再爆发进入新 mode
 * 3 Staging           每拍只突出一个焦点；弱化背景杂讯
 * 4 Pose to Pose      每 mode 明确入场 / 高潮 / 停留 key poses，中间插值
 * 5 Follow Through    主层先停，光斑/阴影/dock 高光/通知卡滞后；图标错落 overlap
 * 6 Slow In/Out       禁止线性；ease-out-cubic / ease-in-out；落地 easeOutBack
 * 7 Arcs              滑动、通知、图标浮起走轻微弧线
 * 8 Secondary Action  壁纸光斑呼吸、信号微闪、时钟轻跳、specular 扫光——从属不抢戏
 * 9 Timing            大卡片/分数更重更慢；小图标更脆；高刷短位移高频；亮度慢推光
 * 10 Exaggeration     卖点略夸张但保持发布会气质
 * 11 Solid Drawing    图标有体积：几何+内外高光+软阴影+统一光源
 * 12 Appeal           圆润亲和 + 品牌色；切模式有仪式感
 *
 * 综述参考：Adobe / Creative Bloq / frankandollie 对 12 Principles 的归纳。
 */
import * as THREE from 'three';

/* ───────── 曲线库（统一 Slow In / Slow Out，禁线性主动作） ───────── */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (k) => 1 - Math.pow(1 - clamp(k), 3);
const easeInCubic = (k) => Math.pow(clamp(k), 3);
const easeInOutCubic = (k) => {
  const t = clamp(k);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const easeOutQuad = (k) => 1 - (1 - clamp(k)) * (1 - clamp(k));
/** 落地 overshoot：体积感回弹 */
const easeOutBack = (k) => {
  const t = clamp(k);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
/** 分数/充电等「重」物件：稍慢的 out */
const easeOutQuint = (k) => 1 - Math.pow(1 - clamp(k), 5);
/** 兼容旧名 */
const easeOut = easeOutCubic;

/** Pose 采样：在 [t0,t1] 内从 a→b，曲线 f */
function pose(enter, t0, t1, a, b, f = easeOutCubic) {
  if (enter <= t0) return a;
  if (enter >= t1) return b;
  return lerp(a, b, f((enter - t0) / Math.max(1e-6, t1 - t0)));
}

/** Squash & Stretch：沿主轴压扁时横向补偿，近似保面积 */
function squashStretch(landK) {
  // landK: 0 未落地 → 1 已回弹完毕；在 0.55 附近最扁
  const squash = Math.sin(clamp(landK) * Math.PI) * 0.14;
  const sy = 1 - squash;
  const sx = 1 + squash * 0.9;
  return { sx, sy };
}

const rr = (g, x, y, w, h, r) => {
  const R = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + R, y);
  g.arcTo(x + w, y, x + w, y + h, R);
  g.arcTo(x + w, y + h, x, y + h, R);
  g.arcTo(x, y + h, x, y, R);
  g.arcTo(x, y, x + w, y, R);
  g.closePath();
};

const OS_THEMES = {
  蜂鸟: { sky: ['#1a0f08', '#3d1f0a', '#e67e22'], accent: '#f5b041', ui: 'warm', clock: '#fff8e8', glass: 'rgba(255,248,232,0.16)' },
  天枢: { sky: ['#060b18', '#12284a', '#5dade2'], accent: '#85c1e9', ui: 'cool', clock: '#eaf2ff', glass: 'rgba(234,242,255,0.14)' },
  星火: { sky: ['#1a0505', '#4a1010', '#e74c3c'], accent: '#f1948a', ui: 'fire', clock: '#fff0f0', glass: 'rgba(255,240,240,0.14)' },
  玄鸟: { sky: ['#12081c', '#2c1250', '#8e44ad'], accent: '#d2b4de', ui: 'mystic', clock: '#f5eef8', glass: 'rgba(245,238,248,0.14)' },
  雷霆: { sky: ['#041018', '#0a2a36', '#1abc9c'], accent: '#48c9b0', ui: 'volt', clock: '#e8fff8', glass: 'rgba(232,255,248,0.14)' },
  朱雀: { sky: ['#180808', '#5a1a10', '#e67e22'], accent: '#f5b041', ui: 'fire', clock: '#fff5e6', glass: 'rgba(255,245,230,0.14)' },
  青龙: { sky: ['#061410', '#0d3b2e', '#27ae60'], accent: '#82e0aa', ui: 'cool', clock: '#eafaf1', glass: 'rgba(234,250,241,0.14)' },
  白泽: { sky: ['#101218', '#2c3e50', '#bdc3c7'], accent: '#ecf0f1', ui: 'mono', clock: '#ffffff', glass: 'rgba(255,255,255,0.12)' },
  鲲鹏: { sky: ['#08101c', '#1a3a6a', '#3498db'], accent: '#5dade2', ui: 'cool', clock: '#eaf2ff', glass: 'rgba(234,242,255,0.14)' },
  烛龙: { sky: ['#140808', '#3d0a18', '#c0392b'], accent: '#e74c3c', ui: 'fire', clock: '#ffe8e8', glass: 'rgba(255,232,232,0.14)' },
};

export function resolveOsTheme(design, screenTheme = 'series') {
  const series = design?.chipSeries || '蜂鸟';
  const base = OS_THEMES[series] || OS_THEMES['蜂鸟'];
  if (screenTheme === 'dark') {
    return {
      ...base,
      sky: ['#05060a', '#12151c', base.accent],
      clock: '#f4f6f7',
      glass: 'rgba(255,255,255,0.10)',
      ui: 'mono',
      forceDark: true,
    };
  }
  if (screenTheme === 'light') {
    return {
      ...base,
      sky: ['#eef3ff', '#d6e4ff', '#f7fbff'],
      clock: '#1c2833',
      glass: 'rgba(255,255,255,0.55)',
      ui: 'cool',
      forceLight: true,
      ink: '#1c2833',
    };
  }
  return base;
}

/** 几何矢量图标（Solid Drawing + Appeal） */
const APP_DEFS = [
  { id: 'phone', label: '电话', colors: ['#2ecc71', '#27ae60'] },
  { id: 'msg', label: '信息', colors: ['#3498db', '#2980b9'] },
  { id: 'camera', label: '相机', colors: ['#9b59b6', '#6c3483'] },
  { id: 'photos', label: '相册', colors: ['#e67e22', '#f5b041'] },
  { id: 'browser', label: '浏览器', colors: ['#5dade2', '#1a5276'] },
  { id: 'store', label: '商店', colors: ['#e74c3c', '#c0392b'] },
  { id: 'settings', label: '设置', colors: ['#95a5a6', '#5d6d7e'] },
  { id: 'music', label: '音乐', colors: ['#e91e63', '#ad1457'] },
  { id: 'maps', label: '地图', colors: ['#1abc9c', '#16a085'] },
  { id: 'notes', label: '笔记', colors: ['#f1c40f', '#d4ac0d'] },
  { id: 'ai', label: '助理', colors: ['#8e44ad', '#5dade2'] },
  { id: 'wallet', label: '钱包', colors: ['#34495e', '#1abc9c'] },
];

/**
 * 精致图标：统一左上光源、内外高光、软阴影、可选 squash、specular 扫光（Secondary）
 * @param {object} opts landK 0..1 落地进度（Squash）；staggerDelay 已由调用方折进 landK
 */
function drawAppIcon(g, id, x, y, s, t = 0, breath = 1, opts = {}) {
  const def = APP_DEFS.find((a) => a.id === id) || APP_DEFS[0];
  const [c0, c1] = def.colors;
  const r = s * 0.22;
  const landK = opts.landK != null ? opts.landK : 1;
  const { sx, sy } = squashStretch(landK < 1 ? landK : 0);
  const cx = x + s / 2;
  const cy = y + s / 2;

  g.save();
  g.translate(cx, cy);
  g.scale(sx, sy);
  g.translate(-cx, -cy);

  // soft contact shadow（Follow Through：阴影略滞后 — 由调用方用更小 landK 再画一次可选）
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.38)';
  g.shadowBlur = s * 0.14;
  g.shadowOffsetY = s * 0.07 * (0.6 + 0.4 * landK);
  const body = g.createLinearGradient(x, y, x + s * 0.85, y + s);
  body.addColorStop(0, c0);
  body.addColorStop(0.55, c1);
  body.addColorStop(1, shade(c1, -18));
  g.fillStyle = body;
  rr(g, x, y, s, s, r);
  g.fill();
  g.restore();

  // inner rim（体积感）
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.lineWidth = Math.max(1, s * 0.03);
  rr(g, x + s * 0.04, y + s * 0.04, s * 0.92, s * 0.92, r * 0.85);
  g.stroke();

  // top specular plate
  const gloss = g.createLinearGradient(x, y, x, y + s * 0.48);
  gloss.addColorStop(0, `rgba(255,255,255,${0.48 * breath})`);
  gloss.addColorStop(0.55, `rgba(255,255,255,${0.08 * breath})`);
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gloss;
  rr(g, x + s * 0.07, y + s * 0.05, s * 0.86, s * 0.36, r * 0.65);
  g.fill();

  // specular sweep（Secondary Action — 慢扫，不抢戏）
  const sweep = ((t * 0.35 + (opts.seed || 0) * 0.7) % 2.4) - 0.4;
  if (sweep > 0 && sweep < 1.2) {
    const px = x + sweep * s;
    const beam = g.createLinearGradient(px - s * 0.08, y, px + s * 0.08, y);
    beam.addColorStop(0, 'rgba(255,255,255,0)');
    beam.addColorStop(0.5, `rgba(255,255,255,${0.22 * breath})`);
    beam.addColorStop(1, 'rgba(255,255,255,0)');
    g.save();
    rr(g, x, y, s, s, r);
    g.clip();
    g.fillStyle = beam;
    g.fillRect(px - s * 0.1, y, s * 0.2, s);
    g.restore();
  }

  // glyph
  g.save();
  g.translate(cx, cy);
  g.scale(s / 56, s / 56);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // 微呼吸，极轻（Secondary）
  const pulse = 1 + Math.sin(t * 2.0 + (opts.seed || 0)) * 0.025 * breath;
  g.scale(pulse, pulse);
  drawGlyph(g, id, t);
  g.restore();

  g.restore();
}

function shade(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r|0},${g|0},${b|0})`;
}

function drawGlyph(g, id, t) {
  switch (id) {
    case 'phone': {
      g.rotate(-0.35);
      rr(g, -10, -16, 20, 32, 5);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.2)';
      rr(g, -7, -12, 14, 22, 3);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath();
      g.arc(0, 12, 2.2, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'msg': {
      rr(g, -16, -12, 32, 22, 6);
      g.fill();
      g.beginPath();
      g.moveTo(-4, 10);
      g.lineTo(-10, 18);
      g.lineTo(2, 10);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.22)';
      for (let i = 0; i < 3; i++) {
        rr(g, -10, -6 + i * 5, 16 - i * 3, 2.2, 1);
        g.fill();
      }
      break;
    }
    case 'camera': {
      rr(g, -18, -12, 36, 24, 5);
      g.fill();
      g.beginPath();
      g.moveTo(-6, -12);
      g.lineTo(-2, -18);
      g.lineTo(8, -18);
      g.lineTo(12, -12);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.beginPath();
      g.arc(0, 0, 8.5, 0, Math.PI * 2);
      g.fill();
      const lens = g.createRadialGradient(-2, -2, 0, 0, 0, 5);
      lens.addColorStop(0, '#fff');
      lens.addColorStop(1, 'rgba(255,255,255,0.55)');
      g.fillStyle = lens;
      g.beginPath();
      g.arc(0, 0, 4.8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.beginPath();
      g.arc(12, -7, 2.2, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'photos': {
      rr(g, -14, -10, 26, 22, 3);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.38)';
      rr(g, -10, -14, 26, 22, 3);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.moveTo(-8, 6);
      g.lineTo(-2, -2);
      g.lineTo(4, 4);
      g.lineTo(8, 0);
      g.lineTo(12, 8);
      g.lineTo(-8, 8);
      g.closePath();
      g.fill();
      g.beginPath();
      g.arc(6, -4, 2.5, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'browser': {
      g.beginPath();
      g.arc(0, 0, 16, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.28)';
      g.lineWidth = 2;
      g.beginPath();
      g.ellipse(0, 0, 7, 16, 0, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(-16, 0);
      g.lineTo(16, 0);
      g.moveTo(-14, -7);
      g.lineTo(14, -7);
      g.moveTo(-14, 7);
      g.lineTo(14, 7);
      g.stroke();
      break;
    }
    case 'store': {
      rr(g, -14, -6, 28, 20, 4);
      g.fill();
      g.strokeStyle = '#fff';
      g.lineWidth = 2.8;
      g.beginPath();
      g.moveTo(-10, -6);
      g.quadraticCurveTo(-10, -18, 0, -18);
      g.quadraticCurveTo(10, -18, 10, -6);
      g.stroke();
      g.fillStyle = 'rgba(0,0,0,0.22)';
      rr(g, -3, -2, 6, 10, 2);
      g.fill();
      break;
    }
    case 'settings': {
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * 0.35;
        g.lineTo(Math.cos(a) * 15, Math.sin(a) * 15);
        g.lineTo(Math.cos(a + 0.2) * 9, Math.sin(a + 0.2) * 9);
      }
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.beginPath();
      g.arc(0, 0, 5.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(0, 0, 2.6, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'music': {
      g.beginPath();
      g.ellipse(-6, 10, 8, 5.5, -0.2, 0, Math.PI * 2);
      g.ellipse(8, 6, 7, 5, -0.2, 0, Math.PI * 2);
      g.fill();
      g.fillRect(-2, -16, 3.5, 26);
      g.fillRect(12, -20, 3.5, 26);
      g.beginPath();
      g.moveTo(-2, -16);
      g.quadraticCurveTo(8, -22, 15.5, -20);
      g.lineTo(15.5, -16);
      g.quadraticCurveTo(8, -18, 1.5, -12);
      g.closePath();
      g.fill();
      break;
    }
    case 'maps': {
      g.beginPath();
      g.moveTo(0, 16);
      g.quadraticCurveTo(-16, 2, -8, -10);
      g.quadraticCurveTo(0, -20, 8, -10);
      g.quadraticCurveTo(16, 2, 0, 16);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.24)';
      g.beginPath();
      g.arc(0, -6, 5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(0, -6, 2.2, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'notes': {
      rr(g, -14, -18, 28, 36, 4);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.18)';
      for (let i = 0; i < 4; i++) {
        rr(g, -9, -8 + i * 7, 18 - (i === 3 ? 6 : 0), 2.4, 1);
        g.fill();
      }
      g.fillStyle = '#e74c3c';
      g.fillRect(-14, -18, 28, 5);
      break;
    }
    case 'ai': {
      g.beginPath();
      g.arc(0, 0, 14, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.92)';
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t;
        g.beginPath();
        g.ellipse(Math.cos(a) * 6, Math.sin(a) * 6, 2.2, 1.1, a, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(0, 0, 3.5, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'wallet': {
      rr(g, -18, -12, 36, 24, 5);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.22)';
      rr(g, 2, -4, 14, 10, 3);
      g.fill();
      g.fillStyle = '#f1c40f';
      g.beginPath();
      g.arc(9, 1, 3, 0, Math.PI * 2);
      g.fill();
      break;
    }
    default:
      break;
  }
}

function drawWallpaper(g, w, h, theme, design, t, intensity = 1) {
  const sky = theme.sky;
  const grd = g.createLinearGradient(0, 0, w * 0.15, h);
  grd.addColorStop(0, sky[0]);
  grd.addColorStop(0.55, sky[1]);
  grd.addColorStop(1, sky[2]);
  g.fillStyle = grd;
  g.fillRect(0, 0, w, h);
  const accent = design?.color || theme.accent;
  // Secondary：壁纸光斑慢呼吸（不抢戏）
  for (let i = 0; i < 5; i++) {
    const cx = ((Math.sin(t * 0.11 + i * 1.7) * 0.35 + 0.5 + i * 0.13) % 1) * w;
    const cy = ((Math.cos(t * 0.08 + i * 1.1) * 0.3 + 0.35 + i * 0.08) % 1) * h * 0.75;
    const radR = 80 + i * 20;
    const rad = g.createRadialGradient(cx, cy, 0, cx, cy, radR);
    rad.addColorStop(0, accent);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = (0.10 + 0.05 * Math.sin(t * 0.55 + i)) * intensity;
    g.fillStyle = rad;
    g.beginPath();
    g.ellipse(cx, cy, radR, radR * 0.55, -0.3 + i * 0.15, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  const C = new Set(design?.concepts || []);
  if (C.has('paper')) {
    g.fillStyle = 'rgba(245,230,200,0.16)';
    g.fillRect(0, 0, w, h);
  }
  if (C.has('privacy')) {
    g.fillStyle = 'rgba(0,0,0,0.28)';
    g.fillRect(0, 0, w * 0.16, h);
    g.fillRect(w * 0.84, 0, w * 0.16, h);
  }
}

function statusBar(g, w, design, theme, t, ink) {
  g.fillStyle = ink;
  g.font = '600 15px "Noto Sans SC",sans-serif';
  g.textAlign = 'left';
  g.fillText((design?.company || '回路').slice(0, 8), 22, 32);
  g.textAlign = 'right';
  const bat = 86 + Math.floor(Math.sin(t * 0.3) * 2);
  g.fillText(design?.concepts?.includes('ai') ? `AI · ${bat}%` : `5G · ${bat}%`, w - 22, 32);
  // Secondary：信号微闪
  for (let i = 0; i < 4; i++) {
    const blink = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3.2 + i * 0.9));
    g.globalAlpha = (0.4 + i * 0.15) * blink;
    g.fillRect(w - 118 + i * 6, 24 - i * 2, 4, 6 + i * 2);
  }
  g.globalAlpha = 1;
}

function homeClock(g, w, theme, design, t, ink, enter = 1) {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  // Pose：入场从略大+淡入落到静止；冒号呼吸；秒位轻跳（Secondary）
  const appear = easeOutBack(clamp(enter / 0.55));
  const hop = Math.max(0, Math.sin(t * Math.PI * 2) * 2.2); // 每秒轻跳
  g.save();
  g.translate(w / 2, 168);
  g.scale(lerp(1.08, 1, appear), lerp(0.92, 1, appear));
  g.globalAlpha = appear;
  g.fillStyle = ink || theme.clock;
  g.textAlign = 'center';
  g.font = '200 96px "Noto Sans SC",system-ui,sans-serif';
  const blink = Math.floor(t * 2) % 2 === 0;
  g.fillText(`${hh}${blink ? ':' : ' '}${mm}`, 0, hop * 0.15);
  g.restore();
  g.fillStyle = ink || theme.clock;
  g.font = '500 18px "Noto Sans SC",sans-serif';
  g.textAlign = 'center';
  g.globalAlpha = 0.75 * appear;
  const dayLine = design?.concepts?.includes('ai')
    ? `${design.chipSeries || '蜂鸟'} 助理已就绪`
    : `周五 · ${(design?.modelName || '新机').slice(0, 8)} · ${ss}`;
  g.fillText(dayLine, w / 2, 202 + hop * 0.3);
  g.globalAlpha = 1;
}

function drawDock(g, w, h, apps, t, enter) {
  // Follow Through：dock 底板略滞后于图标
  const dockK = easeOutCubic(clamp((enter - 0.08) / 0.4));
  const dockY = h - 108 + (1 - dockK) * 20;
  g.globalAlpha = dockK;
  g.fillStyle = 'rgba(255,255,255,0.14)';
  rr(g, 40, dockY, w - 80, 72, 26);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.2)';
  g.lineWidth = 1;
  rr(g, 40, dockY, w - 80, 72, 26);
  g.stroke();
  // dock 高光滞后扫过
  const hi = easeOutCubic(clamp((enter - 0.25) / 0.5));
  if (hi > 0) {
    const hx = 40 + (w - 80) * hi;
    const hg = g.createLinearGradient(hx - 40, dockY, hx + 40, dockY);
    hg.addColorStop(0, 'rgba(255,255,255,0)');
    hg.addColorStop(0.5, 'rgba(255,255,255,0.18)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hg;
    rr(g, 40, dockY, w - 80, 72, 26);
    g.save();
    rr(g, 40, dockY, w - 80, 72, 26);
    g.clip();
    g.fillRect(hx - 40, dockY, 80, 72);
    g.restore();
  }
  const size = 48;
  const gap = (w - 80 - size * 4) / 5;
  for (let i = 0; i < 4; i++) {
    // Overlap：错落入场 + 弧线浮起
    const land = clamp((enter - 0.12 - i * 0.055) / 0.42);
    const k = easeOutBack(land);
    const arcX = Math.sin((1 - k) * Math.PI) * 6 * (i % 2 ? 1 : -1); // Arcs
    const x = 40 + gap * (i + 1) + size * i + arcX;
    const y = dockY + 12 - (1 - k) * 22;
    g.globalAlpha = k;
    drawAppIcon(g, apps[i], x, y, size, t, 1, { landK: land, seed: i + 3 });
  }
  g.globalAlpha = 1;
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillRect((w - 110) / 2, h - 22, 110, 5);
}

function drawHomeIcons(g, w, apps, t, enter, breath) {
  const cols = 4;
  const rows = 3;
  const padX = 36;
  const startY = 340;
  const cellW = (w - padX * 2) / cols;
  const size = cellW * 0.58;
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    // Timing：小图标脆快；Overlap stagger 加强
    const land = clamp((enter - 0.1 - i * 0.038) / 0.48);
    const k = easeOutBack(land);
    const arcLift = Math.sin((1 - k) * Math.PI) * 10; // Arcs：沿弧落下
    const drift = Math.sin(t * 1.4 + i * 0.7) * 1.4 * breath; // Secondary float
    const x = padX + c * cellW + (cellW - size) / 2 + Math.sin((1 - k) * 1.2) * 4 * (c - 1.5);
    const y = startY + r * (cellW * 1.08) - (1 - k) * 28 - arcLift + drift;
    g.globalAlpha = k;
    drawAppIcon(g, apps[i % apps.length], x, y, size, t + i * 0.2, breath, { landK: land, seed: i });
    g.fillStyle = 'rgba(255,255,255,0.88)';
    g.font = '500 12px "Noto Sans SC",sans-serif';
    g.textAlign = 'center';
    const def = APP_DEFS.find((a) => a.id === apps[i % apps.length]);
    g.globalAlpha = k * 0.9;
    g.fillText(def?.label || '', x + size / 2, y + size + 16);
  }
  g.globalAlpha = 1;
}

function notifCard(g, w, theme, design, t, enter) {
  // Follow Through：通知滞后主时钟；Arcs：沿弧滑入
  const land = clamp((enter - 0.42) / 0.55);
  const k = easeOutCubic(land);
  const arc = Math.sin((1 - k) * Math.PI) * 18;
  const y = 230 + (1 - k) * 48;
  g.globalAlpha = k * 0.95;
  g.save();
  g.translate(w / 2 + arc * 0.15, y + 36);
  // Squash on land
  const { sx, sy } = squashStretch(land < 1 ? land : 0);
  g.scale(sx, sy);
  g.translate(-w / 2, -y - 36);
  g.fillStyle = theme.glass || 'rgba(255,255,255,0.14)';
  rr(g, 32, y, w - 64, 72, 18);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.22)';
  g.stroke();
  g.fillStyle = theme.forceLight ? '#1c2833' : 'rgba(255,255,255,0.92)';
  g.font = '600 17px "Noto Sans SC",sans-serif';
  g.textAlign = 'left';
  const C = new Set(design?.concepts || []);
  const title = C.has('fold') ? '多任务分屏已开启' : C.has('ai') ? '今日简报已生成' : '发布会倒计时 · 现场同步';
  g.fillText(title, 52, y + 30);
  g.font = '400 13px "Noto Sans SC",sans-serif';
  g.globalAlpha = k * 0.7;
  g.fillText(theme.ui === 'cool' ? '清爽桌面 · 动态图标' : theme.ui === 'fire' ? '高能主题 · 动态壁纸' : '玻璃拟态 · 微动画', 52, y + 52);
  g.restore();
  g.globalAlpha = 1;
}

/** 各卖点屏内演示 — Pose to Pose + Staging */
function drawModeOverlay(g, w, h, mode, theme, design, payload, t, enter) {
  const ink = theme.forceLight ? theme.ink || '#1c2833' : theme.clock;
  if (mode === 'home' || mode === 'lock') {
    if (mode === 'lock') {
      g.fillStyle = 'rgba(0,0,0,0.28)';
      g.fillRect(0, 0, w, h);
      homeClock(g, w, theme, design, t, ink, enter);
      // Pose：提示文案在高潮后淡入
      const hint = easeOutCubic(clamp((enter - 0.45) / 0.4));
      g.fillStyle = ink;
      g.font = '500 15px "Noto Sans SC",sans-serif';
      g.textAlign = 'center';
      g.globalAlpha = hint * (0.7 + Math.sin(t * 2) * 0.1);
      g.fillText('向上滑动解锁', w / 2, h - 90 + (1 - hint) * 12);
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect((w - 110) / 2, h - 22, 110, 5);
      return;
    }
    homeClock(g, w, theme, design, t, ink, enter);
    notifCard(g, w, theme, design, t, enter);
    const apps = APP_DEFS.map((a) => a.id);
    drawHomeIcons(g, w, apps, t, enter, payload?.breath ?? 1);
    drawDock(g, w, h, ['phone', 'msg', 'browser', 'camera'], t, enter);
    return;
  }

  if (mode === 'scrollHz') {
    // Staging：焦点=列表滑动；Timing：高刷短位移高频
    const hz = payload?.hz || 120;
    g.fillStyle = '#0a0c12';
    g.fillRect(0, 0, w, h);
    statusBar(g, w, design, theme, t, '#eaf2ff');
    const titleK = easeOutCubic(clamp(enter / 0.35));
    g.globalAlpha = titleK;
    g.fillStyle = theme.accent;
    g.font = '800 22px "Noto Sans SC",sans-serif';
    g.textAlign = 'left';
    g.fillText(`${hz}Hz 自适应`, 28, 70);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.font = '500 14px "Noto Sans SC",sans-serif';
    g.fillText('跟手滑动 · 残影对比', 28, 94);
    g.globalAlpha = 1;
    // 高刷：更密步进；低刷：大步慢移
    const step = hz >= 120 ? 2.8 : hz >= 90 ? 4.2 : 7.5;
    const speed = hz >= 120 ? 260 : 95;
    const scroll = t * speed;
    for (let i = 0; i < 8; i++) {
      const baseY = ((scroll + i * 120) % (h + 40)) - 20;
      // Arc：卡片横向微弧随滚动相位
      const arcX = Math.sin((baseY / h) * Math.PI) * 5;
      const y = baseY;
      const col = i % 2 ? theme.accent : '#5dade2';
      const land = clamp((enter - i * 0.04) / 0.5);
      const sk = easeOutCubic(land);
      if (hz >= 90) {
        for (let k = 3; k >= 1; k--) {
          g.globalAlpha = 0.1 * k * sk;
          g.fillStyle = col;
          rr(g, 28 + arcX, y - k * step * 3, w - 56, 88, 18);
          g.fill();
        }
      }
      g.globalAlpha = 0.95 * sk;
      const { sx, sy } = squashStretch(land < 1 ? land : 0);
      g.save();
      g.translate(w / 2, y + 44);
      g.scale(sx, sy);
      g.translate(-w / 2, -y - 44);
      const card = g.createLinearGradient(28, y, 28, y + 88);
      card.addColorStop(0, '#1b2436');
      card.addColorStop(1, '#121826');
      g.fillStyle = card;
      rr(g, 28 + arcX, y, w - 56, 88, 18);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.12)';
      g.stroke();
      g.fillStyle = '#fff';
      g.font = '700 18px "Noto Sans SC",sans-serif';
      g.textAlign = 'left';
      g.fillText(`流畅帧 ${i + 1}`, 48 + arcX, y + 36);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.font = '400 13px sans-serif';
      g.fillText(hz >= 120 ? '残影更短 · 跟手' : '普通刷新', 48 + arcX, y + 58);
      drawAppIcon(g, APP_DEFS[i % APP_DEFS.length].id, w - 96 + arcX, y + 20, 48, t, 1, { landK: land, seed: i });
      g.restore();
    }
    g.globalAlpha = 1;
    const badge = easeOutBack(clamp((enter - 0.2) / 0.5));
    g.save();
    g.translate(w / 2, h - 78);
    g.scale(badge, badge);
    g.fillStyle = 'rgba(0,0,0,0.5)';
    rr(g, -54, -22, 108, 44, 14);
    g.fill();
    g.fillStyle = theme.accent;
    g.font = '800 22px monospace';
    g.textAlign = 'center';
    g.fillText(`${hz}`, 0, 8);
    g.restore();
    return;
  }

  if (mode === 'brightness') {
    // Timing：慢推光；Pose：暗→爆亮→停留
    const nits = payload?.nits || 3000;
    const push = easeInOutCubic(clamp(enter / 1.15)); // 慢推
    const k = 0.22 + 0.78 * push;
    const sun = g.createRadialGradient(w / 2, h * 0.42, 8, w / 2, h * 0.42, 240 * k);
    sun.addColorStop(0, `rgba(255,248,210,${0.96 * k})`);
    sun.addColorStop(0.4, `rgba(255,200,80,${0.55 * k})`);
    sun.addColorStop(1, 'rgba(20,12,4,0)');
    g.fillStyle = '#1a1206';
    g.fillRect(0, 0, w, h);
    g.fillStyle = sun;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + t * 0.35;
      const spark = 0.25 + 0.3 * Math.sin(t * 1.6 + i);
      g.fillStyle = `rgba(255,240,180,${spark * k})`;
      g.fillRect(w / 2 + Math.cos(a) * 95 * k - 2, h * 0.42 + Math.sin(a) * 95 * k - 2, 4, 4);
    }
    statusBar(g, w, design, theme, t, '#fff8e8');
    const numK = easeOutQuint(clamp((enter - 0.15) / 0.9));
    g.fillStyle = '#1a1206';
    g.font = '800 42px monospace';
    g.textAlign = 'center';
    g.fillText(`${Math.round(nits * numK)}`, w / 2, h * 0.72);
    g.font = '700 18px "Noto Sans SC",sans-serif';
    g.globalAlpha = numK;
    g.fillText('nit 峰值亮度', w / 2, h * 0.72 + 32);
    g.globalAlpha = 1;
    return;
  }

  if (mode === 'camera') {
    // Staging：焦点=取景框；Exaggeration：快门轻弹
    g.fillStyle = '#050608';
    g.fillRect(0, 0, w, h);
    const reveal = easeOutCubic(clamp(enter / 0.45));
    g.save();
    g.globalAlpha = reveal;
    const scene = g.createLinearGradient(0, 0, 0, h);
    scene.addColorStop(0, '#0b1a33');
    scene.addColorStop(0.55, '#1a2740');
    scene.addColorStop(1, '#0a0c10');
    g.fillStyle = scene;
    g.fillRect(0, 80, w, h - 200);
    for (let i = 0; i < 40; i++) {
      const x = ((i * 97 + t * 10) % (w - 40)) + 20;
      const y = 140 + ((i * 53) % (h - 340));
      g.fillStyle = `rgba(255,${180 + (i % 50)},80,${0.3 + 0.35 * Math.sin(t * 1.8 + i)})`;
      g.fillRect(x, y, 3 + (i % 3), 3 + (i % 4));
    }
    g.restore();
    // 对焦框：先 Anticipation 微缩，再锁住
    const focusPop = easeOutBack(clamp((enter - 0.2) / 0.55));
    const fk = (0.78 + Math.sin(t * 1.5) * 0.03) * focusPop;
    g.strokeStyle = theme.accent;
    g.lineWidth = 2.2;
    const fx = w / 2;
    const fy = h * 0.42;
    const fs = 56 * fk;
    g.globalAlpha = focusPop;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      g.beginPath();
      g.moveTo(fx + sx * fs, fy + sy * (fs - 16));
      g.lineTo(fx + sx * fs, fy + sy * fs);
      g.lineTo(fx + sx * (fs - 16), fy + sy * fs);
      g.stroke();
    }
    g.globalAlpha = 1;
    statusBar(g, w, design, theme, t, '#fff');
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, w, 80);
    g.fillRect(0, h - 160, w, 160);
    g.fillStyle = '#fff';
    g.font = '600 15px "Noto Sans SC",sans-serif';
    g.textAlign = 'center';
    g.fillText('夜景 · 直出', w / 2, 58);
    // 快门：周期轻弹（Exaggeration 克制）
    const shutterPulse = 1 + Math.max(0, Math.sin(t * 2.2)) * 0.06 * easeOutCubic(clamp(enter / 0.6));
    g.save();
    g.translate(w / 2, h - 78);
    g.scale(shutterPulse, shutterPulse);
    g.beginPath();
    g.arc(0, 0, 32, 0, Math.PI * 2);
    g.fillStyle = '#fff';
    g.fill();
    g.beginPath();
    g.arc(0, 0, 26, 0, Math.PI * 2);
    g.fillStyle = theme.accent;
    g.fill();
    g.restore();
    ['照片', '夜景', '电影'].forEach((lab, i) => {
      g.fillStyle = i === 1 ? theme.accent : 'rgba(255,255,255,0.55)';
      g.font = '600 14px "Noto Sans SC",sans-serif';
      g.fillText(lab, w / 2 + (i - 1) * 72, h - 128);
    });
    return;
  }

  if (mode === 'chip') {
    // Timing：分数滚动「重」；Staging：分数是唯一焦点，粒子弱化
    g.fillStyle = '#070d18';
    g.fillRect(0, 0, w, h);
    statusBar(g, w, design, theme, t, '#eaf2ff');
    g.fillStyle = theme.accent;
    g.font = '800 20px "Noto Sans SC",sans-serif';
    g.textAlign = 'left';
    const titleIn = easeOutCubic(clamp(enter / 0.3));
    g.globalAlpha = titleIn;
    g.fillText(payload?.label || '综合跑分', 28, 70);
    g.globalAlpha = 1;
    for (let i = 0; i < 36; i++) {
      const x = ((Math.sin(i * 12.1 + t * 0.55) * 0.5 + 0.5) * w);
      const y = ((Math.cos(i * 7.7 + t * 0.7) * 0.5 + 0.5) * (h - 160)) + 90;
      g.fillStyle = i % 3 ? theme.accent : '#fff';
      g.globalAlpha = 0.12 + 0.25 * Math.sin(t * 2 + i); // 弱化杂讯（Staging）
      g.fillRect(x, y, 2 + (i % 3), 2 + (i % 2));
    }
    g.globalAlpha = 1;
    // Pose：分数从 0 沉重滚到高潮，再轻微 overshoot 停住
    const scoreT = easeOutQuint(clamp(enter / 1.25));
    const overshoot = 1 + Math.sin(clamp((enter - 1.0) / 0.35) * Math.PI) * 0.012 * (enter > 1 ? 1 : 0);
    const score = Math.round((payload?.score || 1200000) * scoreT * overshoot);
    const pop = easeOutBack(clamp((enter - 0.15) / 0.55));
    g.save();
    g.translate(w / 2, h * 0.48);
    g.scale(lerp(0.86, 1, pop), lerp(1.08, 1, pop)); // squash 补偿
    g.fillStyle = '#fff';
    g.font = '800 48px monospace';
    g.textAlign = 'center';
    g.fillText(score.toLocaleString('en-US'), 0, 0);
    g.restore();
    g.font = '600 16px "Noto Sans SC",sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.textAlign = 'center';
    g.globalAlpha = easeOutCubic(clamp((enter - 0.35) / 0.4));
    g.fillText('AnTuTu · 现场演示', w / 2, h * 0.48 + 32);
    g.globalAlpha = 1;
    const rivals = payload?.rivals || [
      { n: '友商 A', v: 0.72 },
      { n: '友商 B', v: 0.85 },
      { n: '本机', v: 1, me: true },
    ];
    rivals.forEach((r, i) => {
      const y = h * 0.62 + i * 48;
      const barT = easeOutCubic(clamp((enter - 0.35 - i * 0.12) / 0.75));
      const bw = (w - 80) * r.v * barT;
      g.fillStyle = 'rgba(255,255,255,0.08)';
      rr(g, 40, y, w - 80, 28, 8);
      g.fill();
      g.fillStyle = r.me ? theme.accent : '#5d6d7e';
      rr(g, 40, y, Math.max(0, bw), 28, 8);
      g.fill();
      // Follow Through：末端高光滞后
      if (bw > 12) {
        g.fillStyle = `rgba(255,255,255,${0.18 * barT})`;
        rr(g, 40 + bw - 14, y + 4, 10, 20, 4);
        g.fill();
      }
      g.fillStyle = '#fff';
      g.font = '600 13px "Noto Sans SC",sans-serif';
      g.textAlign = 'left';
      g.fillText(r.n, 52, y + 19);
    });
    return;
  }

  if (mode === 'battery' || mode === 'charge') {
    g.fillStyle = '#07140f';
    g.fillRect(0, 0, w, h);
    statusBar(g, w, design, theme, t, '#e8fff8');
    const pct = mode === 'charge'
      ? Math.min(100, Math.round(12 + easeOutCubic(clamp(enter / 1.4)) * 78 + (t * 6) % 3))
      : Math.round((payload?.pct || 96) - Math.sin(t * 0.4) * 0.5);
    const cx = w / 2;
    const cy = h * 0.42;
    const R = 110;
    const ringIn = easeOutCubic(clamp(enter / 0.45));
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 14;
    g.beginPath();
    g.arc(cx, cy, R * ringIn, 0, Math.PI * 2);
    g.stroke();
    const ang = -Math.PI / 2 + Math.PI * 2 * (pct / 100) * easeOutQuint(clamp(enter / 1.1));
    g.strokeStyle = theme.accent;
    g.lineCap = 'round';
    g.lineWidth = 14;
    g.beginPath();
    g.arc(cx, cy, R, -Math.PI / 2, ang);
    g.stroke();
    // Follow Through：外发光滞后脉动
    const glowLag = easeOutCubic(clamp((enter - 0.2) / 0.7));
    g.strokeStyle = `rgba(72,201,176,${(0.2 + 0.14 * Math.sin(t * 2.4)) * glowLag})`;
    g.lineWidth = 22;
    g.beginPath();
    g.arc(cx, cy, R, -Math.PI / 2, ang);
    g.stroke();
    const numPop = easeOutBack(clamp((enter - 0.1) / 0.5));
    g.save();
    g.translate(cx, cy);
    g.scale(numPop, numPop);
    g.fillStyle = '#fff';
    g.font = '200 64px monospace';
    g.textAlign = 'center';
    g.fillText(`${pct}%`, 0, 18);
    g.restore();
    g.font = '600 16px "Noto Sans SC",sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.65)';
    g.textAlign = 'center';
    g.fillText(mode === 'charge' ? '百瓦快充中' : `续航 · ${payload?.days || 2} 天`, cx, cy + 52);
    if (mode === 'charge') {
      // Exaggeration：闪电略弹跳
      const bolt = 1 + Math.sin(t * 6) * 0.04;
      g.save();
      g.translate(cx, cy - 20);
      g.scale(bolt, bolt);
      g.fillStyle = theme.accent;
      g.beginPath();
      g.moveTo(4, -50);
      g.lineTo(-14, 10);
      g.lineTo(2, 10);
      g.lineTo(-4, 70);
      g.lineTo(16, 15);
      g.lineTo(2, 15);
      g.closePath();
      g.fill();
      g.restore();
    }
    return;
  }

  if (mode === 'ai') {
    g.fillStyle = '#100818';
    g.fillRect(0, 0, w, h);
    statusBar(g, w, design, theme, t, '#f5eef8');
    const cx = w / 2;
    const cy = h * 0.38;
    const orbIn = easeOutBack(clamp(enter / 0.55));
    for (let i = 4; i >= 0; i--) {
      // Follow Through：外环滞后扩张
      const lag = easeOutCubic(clamp((enter - i * 0.05) / 0.6));
      const rad = g.createRadialGradient(cx, cy, 0, cx, cy, (40 + i * 22) * lag + Math.sin(t * 1.6 + i) * 5);
      rad.addColorStop(0, theme.accent);
      rad.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = (0.12 + i * 0.04) * lag;
      g.fillStyle = rad;
      g.beginPath();
      g.arc(cx, cy, 40 + i * 22, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.save();
    g.translate(cx, cy);
    g.scale(orbIn, orbIn);
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(0, 0, 28, 0, Math.PI * 2);
    g.fill();
    g.restore();
    drawAppIcon(g, 'ai', cx - 28, cy - 28, 56, t, 1, { landK: clamp(enter / 0.5), seed: 9 });
    g.fillStyle = '#fff';
    g.font = '700 22px "Noto Sans SC",sans-serif';
    g.textAlign = 'center';
    g.globalAlpha = easeOutCubic(clamp((enter - 0.2) / 0.35));
    g.fillText(`${design?.chipSeries || '蜂鸟'} 助理`, cx, cy + 90);
    g.globalAlpha = 1;
    const lines = ['正在整理今日简报…', '已帮你摘要三封邮件', '会议纪要已生成'];
    lines.forEach((line, i) => {
      const land = clamp((enter - 0.35 - i * 0.16) / 0.5);
      const k = easeOutCubic(land);
      const arc = Math.sin((1 - k) * Math.PI) * 14; // Arcs
      g.globalAlpha = k;
      g.fillStyle = 'rgba(255,255,255,0.12)';
      rr(g, 40 + arc * 0.2, cy + 120 + i * 58 + (1 - k) * 16, w - 80, 48, 14);
      g.fill();
      g.fillStyle = '#fff';
      g.font = '500 15px "Noto Sans SC",sans-serif';
      g.textAlign = 'left';
      const typed = Math.floor(line.length * clamp(land * 1.6));
      g.fillText(line.slice(0, typed), 58, cy + 150 + i * 58 + (1 - k) * 16);
    });
    g.globalAlpha = 1;
    return;
  }

  if (mode === 'gallery') {
    g.fillStyle = '#0c0c10';
    g.fillRect(0, 0, w, h);
    statusBar(g, w, design, theme, t, '#fff');
    const cols = 2;
    for (let i = 0; i < 6; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const x = 24 + c * ((w - 56) / 2 + 8);
      const y = 70 + r * 210;
      const land = clamp((enter - i * 0.07) / 0.55);
      const k = easeOutBack(land);
      const { sx, sy } = squashStretch(land < 1 ? land : 0);
      g.save();
      g.globalAlpha = k;
      g.translate(x + (w - 56) / 4, y + 95);
      g.scale(sx * k, sy * (0.92 + 0.08 * k));
      g.translate(-(x + (w - 56) / 4), -(y + 95));
      const grd = g.createLinearGradient(x, y, x + 200, y + 190);
      grd.addColorStop(0, APP_DEFS[i].colors[0]);
      grd.addColorStop(1, APP_DEFS[i].colors[1]);
      g.fillStyle = grd;
      rr(g, x, y, (w - 56) / 2, 190, 16);
      g.fill();
      // 内高光
      const gloss = g.createLinearGradient(x, y, x, y + 80);
      gloss.addColorStop(0, 'rgba(255,255,255,0.28)');
      gloss.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gloss;
      rr(g, x + 6, y + 6, (w - 56) / 2 - 12, 70, 12);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.22)';
      g.beginPath();
      g.arc(x + 40 + Math.sin(t * 0.8 + i) * 8, y + 50, 28, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
    return;
  }

  homeClock(g, w, theme, design, t, ink, enter);
  const apps = APP_DEFS.map((a) => a.id);
  drawHomeIcons(g, w, apps, t, enter, 1);
  drawDock(g, w, h, ['phone', 'msg', 'browser', 'camera'], t, enter);
}

/**
 * 每帧可重绘的屏幕纹理控制器
 * Anticipation：setScreenMode 后先 120–220ms 压暗/微缩，再 reveal 新 mode
 */
export function createLiveScreen(design, { width = 540, height = 1125, theme: screenTheme = 'series', wallIntensity = 1 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;

  let mode = 'home';
  let payload = {};
  let themeName = screenTheme;
  let t0 = performance.now();
  let modeT0 = t0;
  let lastPaint = 0;
  let breath = wallIntensity;
  let alive = true;
  /** Anticipation 窗口（ms）— 大切换偏长，同系微调偏短 */
  /** 当前 mode 的 anticipation 门闸（ms）；0 = 无蓄力直接入场（首屏） */
  let gateMs = 0;

  const FULL_BG = new Set(['scrollHz', 'brightness', 'camera', 'chip', 'battery', 'charge', 'ai', 'gallery']);

  const api = {
    texture,
    canvas,
    get mode() {
      return mode;
    },
    setTheme(name) {
      themeName = name || 'series';
    },
    setBreath(v) {
      breath = clamp(v, 0.3, 1.6);
    },
    setScreenMode(next, opts = {}) {
      if (!next) return;
      const same = next === mode;
      mode = next;
      payload = opts.payload || opts || {};
      // Anticipation：换 mode 时先 120–220ms 压暗/微缩再爆发；同 mode 只刷新 payload
      if (!same) {
        const heavy = next === 'chip' || next === 'camera' || next === 'charge' || next === 'brightness';
        gateMs = heavy ? 200 : 150;
        modeT0 = opts.t0 != null ? opts.t0 : performance.now();
      } else if (opts.t0 != null) {
        modeT0 = opts.t0;
        gateMs = 0;
      }
      if (opts.breath != null) breath = opts.breath;
      api.paint(performance.now(), true);
    },
    paint(now = performance.now(), force = false) {
      if (!alive) return;
      if (!force && now - lastPaint < 33) return;
      lastPaint = now;
      const t = (now - t0) / 1000;
      const ageMs = now - modeT0;
      const theme = resolveOsTheme(design, themeName);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Anticipation 相位：压暗 + 微缩（观众感到「要来了」）
      const inAnticipation = gateMs > 0 && ageMs < gateMs;
      let enter;
      let anticipK = 0;
      if (inAnticipation) {
        anticipK = ageMs / gateMs;
        enter = 0; // 蓄力：内容停在入场 pose 起点
      } else {
        enter = Math.max(0, (ageMs - gateMs) / 1000);
      }

      ctx.save();
      if (inAnticipation) {
        // 微缩 + 略下沉（Anticipation）
        const s = lerp(1, 0.965, easeInCubic(anticipK));
        ctx.translate(w / 2, h / 2);
        ctx.scale(s, s);
        ctx.translate(-w / 2, -h / 2);
      }

      if (FULL_BG.has(mode)) {
        drawModeOverlay(ctx, w, h, mode, theme, design, { ...payload, breath }, t, enter);
      } else {
        drawWallpaper(ctx, w, h, theme, design, t, breath);
        statusBar(ctx, w, design, theme, t, theme.forceLight ? theme.ink : 'rgba(255,255,255,0.92)');
        drawModeOverlay(ctx, w, h, mode, theme, design, { ...payload, breath }, t, enter);
      }

      if (inAnticipation) {
        // 压暗罩层，高潮前蓄力
        ctx.fillStyle = `rgba(0,0,0,${lerp(0.08, 0.42, easeInCubic(anticipK))})`;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();

      // Anticipation 结束瞬间：短暂闪白余韵入口（极轻，发布会气质）
      if (!inAnticipation && gateMs > 0 && ageMs < gateMs + 90) {
        const flash = 1 - (ageMs - gateMs) / 90;
        if (flash > 0) {
          ctx.fillStyle = `rgba(255,255,255,${0.12 * flash})`;
          ctx.fillRect(0, 0, w, h);
        }
      }

      texture.needsUpdate = true;
    },
    dispose() {
      alive = false;
      texture.dispose();
    },
  };
  api.paint(performance.now());
  return api;
}

export { APP_DEFS, OS_THEMES, easeOutCubic, easeOutBack, easeInOutCubic, easeOutQuint };


/** 按形态选屏内系统：按键 → FeatureOS；智能 → 现代 liveScreen */
export function createScreenFor(design, opts = {}) {
  if (productEraOf(design) === 'keypad') return createFeatureScreen(design, opts);
  return createLiveScreen(design, opts);
}
