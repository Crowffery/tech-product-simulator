/**
 * FeatureOS（v0.12）：按键机屏内系统 —— 待机 / 菜单 / 短信 / 来电。
 * 接口对齐 createLiveScreen：{ texture, paint, setScreenMode, setTheme, setBreath, dispose }
 */
import * as THREE from 'three';

const MONO = { bg: '#9bbc0f', fg: '#0f380f', dim: '#306230' };
const COLOR = { bg: '#1a3a5c', fg: '#e8f0ff', accent: '#7ec8ff', dim: '#5a7a9a' };

function nearestTex(canvas) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * @param {object} design
 * @param {{ width?: number, height?: number }} [opts]
 */
export function createFeatureScreen(design, { width = 240, height = 320 } = {}) {
  const elder = design?.formFactor === 'elder';
  const scrTier = design?.parts?.screen ?? 0;
  const color = scrTier >= 1;
  const pxW = scrTier >= 2 ? 176 : scrTier === 1 ? 128 : 96;
  const pxH = scrTier >= 2 ? 220 : scrTier === 1 ? 160 : 64;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  const tex = nearestTex(canvas);
  let mode = 'standby';
  let modeOpts = {};
  let last = 0;
  let dirty = true;
  const pal = color ? COLOR : MONO;

  function setScreenMode(m, opts = {}) {
    mode = m || 'standby';
    modeOpts = opts || {};
    dirty = true;
  }
  function setTheme() { dirty = true; }
  function setBreath() {}

  function statusBar(pg, W, H, now) {
    pg.fillStyle = pal.fg;
    // signal bars
    for (let i = 0; i < 5; i++) {
      const h = 3 + i * 2;
      pg.fillRect(3 + i * 4, 10 - h, 3, h);
    }
    pg.font = 'bold 8px monospace';
    pg.textAlign = 'left';
    pg.fillText('华夏通信', 26, 10);
    // battery
    pg.strokeStyle = pal.fg;
    pg.strokeRect(W - 18, 3, 12, 7);
    pg.fillRect(W - 6, 5, 2, 3);
    pg.fillRect(W - 16, 5, 8, 3);
    const t = new Date(2000, 0, 1, 9, Math.floor((now / 1000) % 60));
    // fake clock from anim time
    const mins = Math.floor(now / 1000) % (24 * 60);
    const hh = String(Math.floor(mins / 60) % 24).padStart(2, '0');
    const mm = String(mins % 60).padStart(2, '0');
    pg.textAlign = 'center';
    pg.fillText(`${hh}:${mm}`, W / 2, 10);
  }

  function softKeys(pg, W, H, left, right) {
    pg.fillStyle = pal.dim;
    pg.font = `${elder ? 9 : 8}px monospace`;
    pg.textAlign = 'left';
    pg.fillText(left, 4, H - 4);
    pg.textAlign = 'right';
    pg.fillText(right, W - 4, H - 4);
  }

  function paintPixel(now) {
    const off = document.createElement('canvas');
    off.width = pxW;
    off.height = pxH;
    const pg = off.getContext('2d');
    pg.fillStyle = pal.bg;
    pg.fillRect(0, 0, pxW, pxH);
    statusBar(pg, pxW, pxH, now);
    pg.fillStyle = pal.fg;

    if (mode === 'menu') {
      const icons = ['信息', '通话', '名片', '设置', '多媒体', '游戏', '工具', '铃声', '上网'];
      const cellW = Math.floor(pxW / 3);
      const cellH = Math.floor((pxH - 24) / 3);
      pg.font = `${elder ? 9 : 7}px monospace`;
      pg.textAlign = 'center';
      icons.forEach((name, i) => {
        const x = (i % 3) * cellW + cellW / 2;
        const y = 18 + Math.floor(i / 3) * cellH + cellH / 2;
        pg.strokeStyle = pal.fg;
        pg.strokeRect(x - cellW * 0.32, y - 10, cellW * 0.64, 14);
        pg.fillText(name, x, y + 2);
      });
      softKeys(pg, pxW, pxH, '选择', '返回');
    } else if (mode === 'sms') {
      pg.font = `${elder ? 10 : 8}px monospace`;
      pg.textAlign = 'left';
      pg.fillText('收件箱 (2)', 6, 24);
      pg.fillText('> 老周：晚上麻将？', 6, 40);
      pg.fillText('  妈：记得吃饭', 6, 54);
      if (modeOpts.open) {
        pg.fillStyle = pal.bg;
        pg.fillRect(4, 64, pxW - 8, pxH - 84);
        pg.fillStyle = pal.fg;
        pg.fillText('老 老周', 8, 78);
        pg.fillText('晚上来不来打麻将', 8, 94);
        pg.fillText('老 老地方。', 8, 110);
      }
      softKeys(pg, pxW, pxH, '查看', '返回');
    } else if (mode === 'call') {
      pg.font = `${elder ? 12 : 10}px monospace`;
      pg.textAlign = 'center';
      pg.fillText('来电', pxW / 2, 36);
      pg.font = `${elder ? 14 : 12}px monospace`;
      pg.fillText(modeOpts.from || '老周', pxW / 2, 58);
      const shake = Math.sin(now * 0.02) * 2;
      pg.fillText('♪ 铃声响…', pxW / 2 + shake, 80);
      softKeys(pg, pxW, pxH, '接听', '挂断');
    } else {
      // standby
      pg.font = `${elder ? 11 : 9}px monospace`;
      pg.textAlign = 'center';
      pg.fillText('华夏通信', pxW / 2, 28);
      const mins = Math.floor(now / 1000) % (24 * 60);
      const hh = String(9 + Math.floor(mins / 60) % 12).padStart(2, '0');
      const mm = String(mins % 60).padStart(2, '0');
      pg.font = `bold ${elder ? 22 : 18}px monospace`;
      pg.fillText(`${hh}:${mm}`, pxW / 2, pxH * 0.45);
      pg.font = `${elder ? 10 : 8}px monospace`;
      pg.fillText(design?.modelName || '新机', pxW / 2, pxH * 0.62);
      if (elder) pg.fillText('一键求助已就绪', pxW / 2, pxH * 0.72);
      softKeys(pg, pxW, pxH, '菜单', '名片夹');
    }

    // nearest-neighbor upscale
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#000';
    g.fillRect(0, 0, width, height);
    g.drawImage(off, 0, 0, width, height);
    tex.needsUpdate = true;
    dirty = false;
  }

  function paint(now) {
    if (!dirty && now - last < 33) return;
    last = now;
    paintPixel(now);
  }

  function dispose() {
    tex.dispose();
  }

  paint(0);
  return { texture: tex, paint, setScreenMode, setTheme, setBreath, dispose, kind: 'feature' };
}
