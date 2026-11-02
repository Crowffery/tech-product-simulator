/**
 * 发布会专用：可动、可切换的手机屏 OS（程序化 Canvas）
 * 设计台仍用静态低清 wallpaper；仅 presentation/keynote 走 LiveScreen。
 */
import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);
const easeOutBack = (k) => {
  const c1 = 1.7;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};
const lerp = (a, b, t) => a + (b - a) * t;
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

/** 几何矢量图标（非 emoji / 非纯色方块） */
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

function drawAppIcon(g, id, x, y, s, t = 0, breath = 1) {
  const def = APP_DEFS.find((a) => a.id === id) || APP_DEFS[0];
  const [c0, c1] = def.colors;
  const r = s * 0.22;
  // soft shadow
  g.save();
  g.shadowColor = 'rgba(0,0,0,0.35)';
  g.shadowBlur = s * 0.12;
  g.shadowOffsetY = s * 0.06;
  const grd = g.createLinearGradient(x, y, x + s, y + s);
  grd.addColorStop(0, c0);
  grd.addColorStop(1, c1);
  g.fillStyle = grd;
  rr(g, x, y, s, s, r);
  g.fill();
  g.shadowColor = 'transparent';
  // top specular
  const gloss = g.createLinearGradient(x, y, x, y + s * 0.45);
  gloss.addColorStop(0, `rgba(255,255,255,${0.42 * breath})`);
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gloss;
  rr(g, x + s * 0.06, y + s * 0.05, s * 0.88, s * 0.38, r * 0.7);
  g.fill();
  // glyph
  g.translate(x + s / 2, y + s / 2);
  g.scale(s / 56, s / 56);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const pulse = 1 + Math.sin(t * 2.2) * 0.03 * breath;
  g.scale(pulse, pulse);
  switch (id) {
    case 'phone': {
      g.rotate(-0.35);
      rr(g, -10, -16, 20, 32, 5);
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.18)';
      rr(g, -7, -12, 14, 22, 3);
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
      g.fillStyle = 'rgba(0,0,0,0.2)';
      for (let i = 0; i < 3; i++) {
        rr(g, -10 + i * 0, -6 + i * 5, 14 - i * 2, 2.2, 1);
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
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.beginPath();
      g.arc(0, 0, 8, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fff';
      g.beginPath();
      g.arc(0, 0, 4.5, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.7)';
      g.beginPath();
      g.arc(12, -7, 2.2, 0, Math.PI * 2);
      g.fill();
      break;
    }
    case 'photos': {
      rr(g, -14, -10, 26, 22, 3);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.35)';
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
      g.strokeStyle = 'rgba(0,0,0,0.25)';
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
      g.fillStyle = 'rgba(0,0,0,0.2)';
      rr(g, -3, -2, 6, 10, 2);
      g.fill();
      break;
    }
    case 'settings': {
      g.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + t * 0.4;
        const r0 = 9;
        const r1 = 15;
        g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
        g.lineTo(Math.cos(a + 0.2) * r0, Math.sin(a + 0.2) * r0);
      }
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.25)';
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
      g.fillStyle = 'rgba(0,0,0,0.22)';
      g.beginPath();
      g.arc(0, -6, 5, 0, Math.PI * 2);
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
      g.fillStyle = 'rgba(255,255,255,0.9)';
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
      g.fillStyle = 'rgba(0,0,0,0.2)';
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
  g.restore();
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
  for (let i = 0; i < 6; i++) {
    const cx = ((Math.sin(t * 0.12 + i * 1.7) * 0.35 + 0.5 + i * 0.13) % 1) * w;
    const cy = ((Math.cos(t * 0.09 + i * 1.1) * 0.3 + 0.35 + i * 0.08) % 1) * h * 0.75;
    const r = 70 + i * 18;
    const rad = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    rad.addColorStop(0, accent);
    rad.addColorStop(1, 'rgba(0,0,0,0)');
    g.globalAlpha = 0.12 * intensity + 0.04 * Math.sin(t * 0.8 + i);
    g.fillStyle = rad;
    g.beginPath();
    g.ellipse(cx, cy, r, r * 0.55, -0.3 + i * 0.15, 0, Math.PI * 2);
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
  // signal dots
  for (let i = 0; i < 4; i++) {
    g.globalAlpha = 0.45 + i * 0.15;
    g.fillRect(w - 118 + i * 6, 24 - i * 2, 4, 6 + i * 2);
  }
  g.globalAlpha = 1;
}

function homeClock(g, w, theme, design, t, ink) {
  const now = new Date();
  // 演示时钟：以发布会时间推进秒位闪烁
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const blink = Math.floor(t * 2) % 2 === 0;
  g.fillStyle = ink || theme.clock;
  g.textAlign = 'center';
  g.font = '200 96px "Noto Sans SC",system-ui,sans-serif';
  g.fillText(`${hh}${blink ? ':' : ' '}${mm}`, w / 2, 168);
  g.font = '500 18px "Noto Sans SC",sans-serif';
  g.globalAlpha = 0.75;
  const dayLine = design?.concepts?.includes('ai')
    ? `${design.chipSeries || '蜂鸟'} 助理已就绪`
    : `周五 · ${(design?.modelName || '新机').slice(0, 8)} · ${ss}`;
  g.fillText(dayLine, w / 2, 202);
  g.globalAlpha = 1;
}

function drawDock(g, w, h, apps, t, enter) {
  const dockY = h - 108;
  g.fillStyle = 'rgba(255,255,255,0.14)';
  rr(g, 40, dockY, w - 80, 72, 26);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.18)';
  g.lineWidth = 1;
  rr(g, 40, dockY, w - 80, 72, 26);
  g.stroke();
  const size = 48;
  const gap = (w - 80 - size * 4) / 5;
  for (let i = 0; i < 4; i++) {
    const k = easeOutBack(clamp((enter - i * 0.05) / 0.45));
    const x = 40 + gap * (i + 1) + size * i;
    const y = dockY + 12 - (1 - k) * 18;
    g.globalAlpha = k;
    drawAppIcon(g, apps[i], x, y, size, t, 1);
  }
  g.globalAlpha = 1;
  // home indicator
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
    const k = easeOutBack(clamp((enter - 0.08 - i * 0.035) / 0.5));
    const x = padX + c * cellW + (cellW - size) / 2;
    const y = startY + r * (cellW * 1.08) - (1 - k) * 24 + Math.sin(t * 1.6 + i * 0.7) * 1.6 * breath;
    g.globalAlpha = k;
    drawAppIcon(g, apps[i % apps.length], x, y, size, t + i * 0.2, breath);
    // label
    g.fillStyle = 'rgba(255,255,255,0.88)';
    g.font = '500 12px "Noto Sans SC",sans-serif';
    g.textAlign = 'center';
    const def = APP_DEFS.find((a) => a.id === apps[i % apps.length]);
    g.fillText(def?.label || '', x + size / 2, y + size + 16);
  }
  g.globalAlpha = 1;
}

function notifCard(g, w, theme, design, t, enter) {
  const k = easeOut(clamp((enter - 0.35) / 0.5));
  const y = 230 + (1 - k) * 40;
  g.globalAlpha = k * 0.95;
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
  g.globalAlpha = 1;
}

/** 各卖点屏内演示 */
function drawModeOverlay(g, w, h, mode, theme, design, payload, t, enter) {
  const ink = theme.forceLight ? theme.ink || '#1c2833' : theme.clock;
  if (mode === 'home' || mode === 'lock') {
    if (mode === 'lock') {
      // dim lock
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(0, 0, w, h);
      homeClock(g, w, theme, design, t, ink);
      g.fillStyle = ink;
      g.font = '500 15px "Noto Sans SC",sans-serif';
      g.textAlign = 'center';
      g.globalAlpha = 0.7 + Math.sin(t * 2) * 0.1;
      g.fillText('向上滑动解锁', w / 2, h - 90);
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillRect((w - 110) / 2, h - 22, 110, 5);
      return;
    }
    homeClock(g, w, theme, design, t, ink);
    notifCard(g, w, theme, design, t, enter);
    const apps = APP_DEFS.map((a) => a.id);
    drawHomeIcons(g, w, apps, t, enter, payload?.breath ?? 1);
    drawDock(g, w, h, ['phone', 'msg', 'browser', 'camera'], t, enter);
    return;
  }

  if (mode === 'scrollHz') {
    const hz = payload?.hz || 120;
    g.fillStyle = '#0a0c12';
    g.fillRect(0, 0, w, h);
    statusBar(g, w, design, theme, t, '#eaf2ff');
    g.fillStyle = theme.accent;
    g.font = '800 22px "Noto Sans SC",sans-serif';
    g.textAlign = 'left';
    g.fillText(`${hz}Hz 自适应`, 28, 70);
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.font = '500 14px "Noto Sans SC",sans-serif';
    g.fillText('跟手滑动 · 残影对比', 28, 94);
    // scrolling cards with motion blur trail
    const speed = hz >= 120 ? 220 : 90;
    for (let i = 0; i < 8; i++) {
      const y = ((t * speed + i * 120) % (h + 40)) - 20;
      const col = i % 2 ? theme.accent : '#5dade2';
      // residual trails for high refresh feel
      if (hz >= 90) {
        for (let k = 3; k >= 1; k--) {
          g.globalAlpha = 0.12 * k;
          g.fillStyle = col;
          rr(g, 28, y - k * 10, w - 56, 88, 18);
          g.fill();
        }
      }
      g.globalAlpha = 0.95;
      const card = g.createLinearGradient(28, y, 28, y + 88);
      card.addColorStop(0, '#1b2436');
      card.addColorStop(1, '#121826');
      g.fillStyle = card;
      rr(g, 28, y, w - 56, 88, 18);
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.12)';
      g.stroke();
      g.fillStyle = '#fff';
      g.font = '700 18px "Noto Sans SC",sans-serif';
      g.fillText(`流畅帧 ${i + 1}`, 48, y + 36);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.font = '400 13px sans-serif';
      g.fillText(hz >= 120 ? '残影更短 · 跟手' : '普通刷新', 48, y + 58);
      // mini icon bounce
      drawAppIcon(g, APP_DEFS[i % APP_DEFS.length].id, w - 96, y + 20, 48, t, 1);
    }
    g.globalAlpha = 1;
    // Hz badge
    g.fillStyle = 'rgba(0,0,0,0.45)';
    rr(g, w / 2 - 54, h - 100, 108, 44, 14);
    g.fill();
    g.fillStyle = theme.accent;
    g.font = '800 22px monospace';
    g.textAlign = 'center';
    g.fillText(`${hz}`, w / 2, h - 70);
    return;
  }

  if (mode === 'brightness') {
    const nits = payload?.nits || 3000;
    const k = 0.35 + 0.65 * easeOut(clamp(enter / 0.8));
    const sun = g.createRadialGradient(w / 2, h * 0.42, 10, w / 2, h * 0.42, 220 * k);
    sun.addColorStop(0, `rgba(255,248,210,${0.95 * k})`);
    sun.addColorStop(0.45, `rgba(255,200,80,${0.55 * k})`);
    sun.addColorStop(1, 'rgba(20,12,4,0)');
    g.fillStyle = '#1a1206';
    g.fillRect(0, 0, w, h);
    g.fillStyle = sun;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + t * 0.6;
      g.fillStyle = `rgba(255,240,180,${0.35 + 0.25 * Math.sin(t * 3 + i)})`;
      g.fillRect(w / 2 + Math.cos(a) * 90 * k - 2, h * 0.42 + Math.sin(a) * 90 * k - 2, 4, 4);
    }
    statusBar(g, w, design, theme, t, '#fff8e8');
    g.fillStyle = '#1a1206';
    g.font = '800 42px monospace';
    g.textAlign = 'center';
    g.fillText(`${Math.round(nits * k)}`, w / 2, h * 0.72);
    g.font = '700 18px "Noto Sans SC",sans-serif';
    g.fillText('nit 峰值亮度', w / 2, h * 0.72 + 32);
    return;
  }

  if (mode === 'camera') {
    g.fillStyle = '#050608';
    g.fillRect(0, 0, w, h);
    // viewfinder scene
    const scene = g.createLinearGradient(0, 0, 0, h);
    scene.addColorStop(0, '#0b1a33');
    scene.addColorStop(0.55, '#1a2740');
    scene.addColorStop(1, '#0a0c10');
    g.fillStyle = scene;
    g.fillRect(0, 80, w, h - 200);
    // fake city lights
    for (let i = 0; i < 40; i++) {
      const x = ((i * 97 + t * 12) % (w - 40)) + 20;
      const y = 140 + ((i * 53) % (h - 340));
      g.fillStyle = `rgba(255,${180 + (i % 50)},80,${0.35 + 0.4 * Math.sin(t * 2 + i)})`;
      g.fillRect(x, y, 3 + (i % 3), 3 + (i % 4));
    }
    // focus brackets
    const fk = 0.85 + Math.sin(t * 2) * 0.05;
    g.strokeStyle = theme.accent;
    g.lineWidth = 2;
    const fx = w / 2;
    const fy = h * 0.42;
    const fs = 54 * fk;
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      g.beginPath();
      g.moveTo(fx + sx * fs, fy + sy * (fs - 16));
      g.lineTo(fx + sx * fs, fy + sy * fs);
      g.lineTo(fx + sx * (fs - 16), fy + sy * fs);
      g.stroke();
    }
    statusBar(g, w, design, theme, t, '#fff');
    g.fillStyle = 'rgba(0,0,0,0.55)';
    g.fillRect(0, 0, w, 80);
    g.fillRect(0, h - 160, w, 160);
    g.fillStyle = '#fff';
    g.font = '600 15px "Noto Sans SC",sans-serif';
    g.textAlign = 'center';
    g.fillText('夜景 · 直出', w / 2, 58);
    // shutter
    g.beginPath();
    g.arc(w / 2, h - 78, 32, 0, Math.PI * 2);
    g.fillStyle = '#fff';
    g.fill();
    g.beginPath();
    g.arc(w / 2, h - 78, 26, 0, Math.PI * 2);
    g.fillStyle = theme.accent;
    g.fill();
    // modes
    ['照片', '夜景', '电影'].forEach((lab, i) => {
      g.fillStyle = i === 1 ? theme.accent : 'rgba(255,255,255,0.55)';
      g.font = '600 14px "Noto Sans SC",sans-serif';
      g.fillText(lab, w / 2 + (i - 1) * 72, h - 128);
    });
    return;
  }

  if (mode === 'chip') {
    g.fillStyle = '#070d18';
    g.fillRect(0, 0, w, h);
    statusBar(g, w, design, theme, t, '#eaf2ff');
    g.fillStyle = theme.accent;
    g.font = '800 20px "Noto Sans SC",sans-serif';
    g.textAlign = 'left';
    g.fillText(payload?.label || '综合跑分', 28, 70);
    // particle field
    for (let i = 0; i < 60; i++) {
      const x = ((Math.sin(i * 12.1 + t * 0.7) * 0.5 + 0.5) * w);
      const y = ((Math.cos(i * 7.7 + t * 0.9) * 0.5 + 0.5) * (h - 160)) + 90;
      g.fillStyle = i % 3 ? theme.accent : '#fff';
      g.globalAlpha = 0.25 + 0.5 * Math.sin(t * 3 + i);
      g.fillRect(x, y, 2 + (i % 3), 2 + (i % 2));
    }
    g.globalAlpha = 1;
    const score = Math.round((payload?.score || 1200000) * easeOut(clamp(enter / 1.1)));
    g.fillStyle = '#fff';
    g.font = '800 48px monospace';
    g.textAlign = 'center';
    g.fillText(score.toLocaleString('en-US'), w / 2, h * 0.48);
    g.font = '600 16px "Noto Sans SC",sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.fillText('AnTuTu · 现场演示', w / 2, h * 0.48 + 32);
    // bars
    const rivals = payload?.rivals || [
      { n: '友商 A', v: 0.72 },
      { n: '友商 B', v: 0.85 },
      { n: '本机', v: 1, me: true },
    ];
    rivals.forEach((r, i) => {
      const y = h * 0.62 + i * 48;
      const bw = (w - 80) * r.v * easeOut(clamp((enter - 0.2 - i * 0.1) / 0.7));
      g.fillStyle = 'rgba(255,255,255,0.08)';
      rr(g, 40, y, w - 80, 28, 8);
      g.fill();
      g.fillStyle = r.me ? theme.accent : '#5d6d7e';
      rr(g, 40, y, bw, 28, 8);
      g.fill();
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
      ? Math.min(100, Math.round(12 + enter * 70 + (t * 8) % 5))
      : Math.round((payload?.pct || 96) - Math.sin(t * 0.4) * 0.5);
    const cx = w / 2;
    const cy = h * 0.42;
    const R = 110;
    g.strokeStyle = 'rgba(255,255,255,0.12)';
    g.lineWidth = 14;
    g.beginPath();
    g.arc(cx, cy, R, 0, Math.PI * 2);
    g.stroke();
    const ang = -Math.PI / 2 + Math.PI * 2 * (pct / 100);
    g.strokeStyle = theme.accent;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(cx, cy, R, -Math.PI / 2, ang);
    g.stroke();
    // glow
    g.strokeStyle = `rgba(72,201,176,${0.25 + 0.15 * Math.sin(t * 3)})`;
    g.lineWidth = 22;
    g.beginPath();
    g.arc(cx, cy, R, -Math.PI / 2, ang);
    g.stroke();
    g.fillStyle = '#fff';
    g.font = '200 64px monospace';
    g.textAlign = 'center';
    g.fillText(`${pct}%`, cx, cy + 18);
    g.font = '600 16px "Noto Sans SC",sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.65)';
    g.fillText(mode === 'charge' ? '百瓦快充中' : `续航 · ${payload?.days || 2} 天`, cx, cy + 52);
    if (mode === 'charge') {
      // bolt
      g.fillStyle = theme.accent;
      g.beginPath();
      g.moveTo(cx + 4, cy - 70);
      g.lineTo(cx - 14, cy - 10);
      g.lineTo(cx + 2, cy - 10);
      g.lineTo(cx - 4, cy + 50);
      g.lineTo(cx + 16, cy - 5);
      g.lineTo(cx + 2, cy - 5);
      g.closePath();
      g.fill();
    }
    return;
  }

  if (mode === 'ai') {
    g.fillStyle = '#100818';
    g.fillRect(0, 0, w, h);
    statusBar(g, w, design, theme, t, '#f5eef8');
    // orb
    const cx = w / 2;
    const cy = h * 0.38;
    for (let i = 4; i >= 0; i--) {
      const rad = g.createRadialGradient(cx, cy, 0, cx, cy, 40 + i * 22 + Math.sin(t * 2 + i) * 6);
      rad.addColorStop(0, theme.accent);
      rad.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.15 + i * 0.05;
      g.fillStyle = rad;
      g.beginPath();
      g.arc(cx, cy, 40 + i * 22, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(cx, cy, 28, 0, Math.PI * 2);
    g.fill();
    drawAppIcon(g, 'ai', cx - 28, cy - 28, 56, t, 1);
    g.fillStyle = '#fff';
    g.font = '700 22px "Noto Sans SC",sans-serif';
    g.textAlign = 'center';
    g.fillText(`${design?.chipSeries || '蜂鸟'} 助理`, cx, cy + 90);
    const lines = ['正在整理今日简报…', '已帮你摘要三封邮件', '会议纪要已生成'];
    lines.forEach((line, i) => {
      const k = easeOut(clamp((enter - 0.3 - i * 0.15) / 0.5));
      g.globalAlpha = k;
      g.fillStyle = 'rgba(255,255,255,0.12)';
      rr(g, 40, cy + 120 + i * 58, w - 80, 48, 14);
      g.fill();
      g.fillStyle = '#fff';
      g.font = '500 15px "Noto Sans SC",sans-serif';
      g.textAlign = 'left';
      g.fillText(line.slice(0, Math.floor(line.length * clamp((enter - 0.3 - i * 0.15) * 2))), 58, cy + 150 + i * 58);
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
      const grd = g.createLinearGradient(x, y, x + 200, y + 190);
      grd.addColorStop(0, APP_DEFS[i].colors[0]);
      grd.addColorStop(1, APP_DEFS[i].colors[1]);
      g.fillStyle = grd;
      rr(g, x, y, (w - 56) / 2, 190, 16);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.25)';
      g.beginPath();
      g.arc(x + 40 + Math.sin(t + i) * 10, y + 50, 28, 0, Math.PI * 2);
      g.fill();
    }
    return;
  }

  // fallback home
  homeClock(g, w, theme, design, t, ink);
  const apps = APP_DEFS.map((a) => a.id);
  drawHomeIcons(g, w, apps, t, enter, 1);
  drawDock(g, w, h, ['phone', 'msg', 'browser', 'camera'], t, enter);
}

/**
 * 每帧可重绘的屏幕纹理控制器
 */
export function createLiveScreen(design, { width = 480, height = 1000, theme: screenTheme = 'series', wallIntensity = 1 } = {}) {
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
      mode = next;
      payload = opts.payload || opts || {};
      modeT0 = opts.t0 != null ? opts.t0 : performance.now();
      if (opts.breath != null) breath = opts.breath;
      // 切模式立刻出画，避免节流导致硬切空白/旧帧
      api.paint(performance.now(), true);
    },
    paint(now = performance.now(), force = false) {
      if (!alive) return;
      // ~24–30fps（切卖点时可 force 立即重绘）
      if (!force && now - lastPaint < 33) return;
      lastPaint = now;
      const t = (now - t0) / 1000;
      const enter = (now - modeT0) / 1000;
      const theme = resolveOsTheme(design, themeName);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      if (mode === 'scrollHz' || mode === 'brightness' || mode === 'camera' || mode === 'chip' || mode === 'battery' || mode === 'charge' || mode === 'ai' || mode === 'gallery') {
        // mode-specific full backgrounds handle themselves
        drawModeOverlay(ctx, w, h, mode, theme, design, { ...payload, breath }, t, enter);
      } else {
        drawWallpaper(ctx, w, h, theme, design, t, breath);
        statusBar(ctx, w, design, theme, t, theme.forceLight ? theme.ink : 'rgba(255,255,255,0.92)');
        drawModeOverlay(ctx, w, h, mode, theme, design, { ...payload, breath }, t, enter);
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

export { APP_DEFS, OS_THEMES };
