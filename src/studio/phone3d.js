/**
 * 像素化 3D 机型舞台
 * - 参数化生成机身（中框 / 后盖 / 前屏 / 内部元件分层，可拆解）
 * - 低分辨率渲染 → 亮度分段 + 同色系暗描边 + 法线折边高光 → 最近邻放大
 * - 软箱环境反射、投影、浮尘、火花、发布会舞台（光柱 / 观众 / LED 大屏 / 闪光灯）
 * 单位：毫米。手机正面朝 +Z，Y 向上。
 */
import * as THREE from 'three';
import { CORNERS, SCREEN_FORMS, physical, tier } from './parts.js';

const FX = 1; // 不参与法线描边的图层（粒子、光柱、线条）

// ═════════════════════════ 工具 ═════════════════════════

function roundedRectShape(w, h, r, cx = 0, cy = 0) {
  const s = new THREE.Shape();
  r = Math.max(0.01, Math.min(r, w / 2, h / 2));
  const x = cx - w / 2;
  const y = cy - h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

function topBandShape(w, h, r, splitY) {
  const s = new THREE.Shape();
  r = Math.min(r, w / 2, h / 2);
  const x0 = -w / 2;
  const x1 = w / 2;
  const top = h / 2;
  s.moveTo(x0, splitY);
  s.lineTo(x1, splitY);
  s.lineTo(x1, top - r);
  s.quadraticCurveTo(x1, top, x1 - r, top);
  s.lineTo(x0 + r, top);
  s.quadraticCurveTo(x0, top, x0, top - r);
  s.lineTo(x0, splitY);
  return s;
}

function circleShape(r, cx = 0, cy = 0) {
  const s = new THREE.Shape();
  s.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return s;
}

function shade(hex, k) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + k)));
  return c;
}

function luminance(hex) {
  const c = new THREE.Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
}

const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function easeOutBack(k) {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));

function canvasTex(w, h, draw, { nearest = false } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) {
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
  }
  return t;
}

// ═════════════════════════ 环境：摄影棚软箱 ═════════════════════════

function studioEnvironment(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(12, 12, 12), new THREE.MeshBasicMaterial({ color: 0x0c0d12, side: THREE.BackSide })));
  const panel = (w, h, hex, k, pos) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }),
    );
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  panel(7, 1.1, '#ffffff', 4.0, [0, 5.4, 1.2]); // 顶灯长条
  panel(1.0, 6, '#bcd8ff', 3.2, [-5.4, 0.6, 1.8]); // 左冷色条
  panel(1.0, 6, '#ffd2a0', 2.6, [5.4, 0.2, 1.0]); // 右暖色条
  panel(4, 3, '#ffffff', 0.9, [0, 0.5, 5.6]); // 正面柔光
  panel(10, 10, '#3b2b20', 0.8, [0, -5.8, 0]); // 地面反射
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(s, 0.015).texture;
  pm.dispose();
  return tex;
}

// ═════════════════════════ 材质 ═════════════════════════

let leatherTex = null;
function leatherTexture() {
  if (leatherTex) return leatherTex;
  leatherTex = canvasTex(128, 128, (g) => {
    g.fillStyle = '#fff';
    g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 500; i++) {
      const v = 244 + Math.floor(Math.random() * 11);
      g.fillStyle = `rgb(${v},${v},${v})`;
      const r = 1 + Math.random() * 2;
      g.beginPath();
      g.arc(Math.random() * 128, Math.random() * 128, r, 0, Math.PI * 2);
      g.fill();
    }
  });
  leatherTex.wrapS = leatherTex.wrapT = THREE.RepeatWrapping;
  leatherTex.repeat.set(1 / 28, 1 / 28);
  return leatherTex;
}

function bodyMaterial(matId, hex) {
  const color = new THREE.Color(hex);
  switch (matId) {
    case 1: // 玻璃
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.1, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.25 });
    case 2: // 金属
      return new THREE.MeshStandardMaterial({ color: color.clone().offsetHSL(0, -0.05, 0.08), roughness: 0.3, metalness: 0.85, envMapIntensity: 1.4 });
    case 3: // 素皮
      return new THREE.MeshStandardMaterial({ color, roughness: 0.92, map: leatherTexture(), envMapIntensity: 0.35 });
    default: // 塑料
      return new THREE.MeshStandardMaterial({ color, roughness: 0.48, envMapIntensity: 0.7 });
  }
}

function frameMaterial(matId, hex) {
  if (matId === 0) return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.45, envMapIntensity: 0.8 });
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).offsetHSL(0, -0.1, 0.1), roughness: 0.22, metalness: 0.92, envMapIntensity: 1.5 });
}

// ═════════════════════════ 贴图 ═════════════════════════

function wallpaperTexture(accent) {
  return canvasTex(
    96,
    200,
    (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, w, h);
      grd.addColorStop(0, shade(accent, 0.22).getStyle());
      grd.addColorStop(0.55, shade(accent, -0.05).getStyle());
      grd.addColorStop(1, shade(accent, -0.35).getStyle());
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.22;
      g.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.ellipse(w * (0.2 + i * 0.35), h * (0.62 + i * 0.08), 60, 22, -0.5, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      g.fillStyle = '#fff';
      g.textAlign = 'center';
      g.font = 'bold 26px monospace';
      g.fillText('10:24', w / 2, 54);
      g.font = 'bold 8px sans-serif';
      g.fillText('周五 · 发布会倒计时', w / 2, 68);
      const icons = ['#ff7675', '#fdcb6e', '#55efc4', '#74b9ff', '#a29bfe', '#fab1a0', '#81ecec', '#ffeaa7'];
      for (let i = 0; i < 8; i++) {
        const x = 12 + (i % 4) * 20;
        const y = 138 + Math.floor(i / 4) * 21;
        g.fillStyle = icons[i];
        g.fillRect(x, y, 13, 13);
        g.fillStyle = 'rgba(255,255,255,.5)';
        g.fillRect(x, y, 13, 3);
      }
      g.fillStyle = 'rgba(255,255,255,.3)';
      g.fillRect(8, 184, w - 16, 10);
    },
    { nearest: true },
  );
}

function glareTexture() {
  return canvasTex(64, 128, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h * 0.6);
    grd.addColorStop(0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.42, 'rgba(255,255,255,0)');
    grd.addColorStop(0.5, 'rgba(255,255,255,0.22)');
    grd.addColorStop(0.6, 'rgba(255,255,255,0.05)');
    grd.addColorStop(0.7, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, w, h);
  });
}

function backDecalTexture(design, w, h, bgHex) {
  const k = 5;
  return canvasTex(Math.round(w * k), Math.round(h * k), (g, cw, ch) => {
    const light = luminance(bgHex) < 0.42;
    const ink = light ? 'rgba(255,255,255,.9)' : 'rgba(25,20,16,.85)';
    const cx = cw / 2;
    const cy = ch * 0.5;
    g.strokeStyle = ink;
    g.lineWidth = 1.2 * k;
    g.beginPath();
    g.arc(cx, cy, 7 * k, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = ink;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = `900 ${Math.round(8 * k)}px "ZCOOL KuaiLe","Noto Sans SC",sans-serif`;
    g.fillText((design.company || '?').slice(0, 1), cx, cy + 0.4 * k);
    g.textBaseline = 'alphabetic';
    g.font = `900 ${Math.round(5.5 * k)}px "Noto Sans SC",sans-serif`;
    g.fillText(design.modelName || '', cx, ch * 0.86);
    g.font = `700 ${Math.round(2.6 * k)}px "Noto Sans SC",sans-serif`;
    g.globalAlpha = 0.7;
    g.fillText(`DESIGNED BY ${design.company || ''}`, cx, ch * 0.9);
  });
}

function pcbTexture() {
  return canvasTex(
    128,
    64,
    (g, w, h) => {
      g.fillStyle = '#1e7a46';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#d4b04c';
      g.lineWidth = 1;
      for (let i = 0; i < 26; i++) {
        let x = Math.random() * w;
        let y = Math.random() * h;
        g.beginPath();
        g.moveTo(x, y);
        for (let s = 0; s < 3; s++) {
          if (Math.random() < 0.5) x += (Math.random() - 0.5) * 40;
          else y += (Math.random() - 0.5) * 24;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      g.fillStyle = '#e8c860';
      for (let i = 0; i < 40; i++) g.fillRect(Math.floor(Math.random() * w), Math.floor(Math.random() * h), 2, 2);
    },
    { nearest: true },
  );
}

function chipTexture(label) {
  return canvasTex(
    64,
    64,
    (g) => {
      g.fillStyle = '#2b2e36';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#9aa0ab';
      g.textAlign = 'center';
      g.font = 'bold 13px sans-serif';
      g.fillText('蜂鸟', 32, 28);
      g.fillStyle = '#ffb347';
      g.font = 'bold 18px monospace';
      g.fillText(label, 32, 50);
    },
    { nearest: true },
  );
}

function batteryTexture(t) {
  const colors = ['#4aa3df', '#f5b041', '#e74c3c'];
  return canvasTex(
    96,
    128,
    (g, w, h) => {
      g.fillStyle = '#26282e';
      g.fillRect(0, 0, w, h);
      g.fillStyle = colors[t.id];
      g.fillRect(0, h * 0.18, w, h * 0.42);
      g.fillStyle = '#111';
      g.textAlign = 'center';
      g.font = 'bold 22px monospace';
      g.fillText(t.label.split('·')[1]?.trim() || '', w / 2, h * 0.42);
      g.font = 'bold 11px sans-serif';
      g.fillText('mAh · 蜂鸟能源', w / 2, h * 0.55);
      g.fillStyle = '#8b8f99';
      g.font = '9px sans-serif';
      g.fillText('Li-ion 3.87V', w / 2, h * 0.78);
    },
    { nearest: true },
  );
}

// ═════════════════════════ 镜头模组布局 ═════════════════════════

/** 背面观看者坐标：X 右、Y 下，原点在背面左上角 */
function cameraLayout(layoutId, w, h, lensCount, tierId) {
  const R = [3.6, 4.2, 5.3][tierId];
  const r2 = R * 0.78;
  const m = 7.5;
  const lenses = [];
  let module = null;
  let flash = null;
  const radii = [R, r2, r2];

  switch (layoutId) {
    case 'square': {
      const cell = r2 * 2 + 3.2;
      const S = cell * 2 + 3;
      module = { type: 'rrect', x: m + S / 2, y: m + S / 2, w: S, h: S, r: 5 };
      const pos = [
        [m + 1.5 + cell / 2, m + 1.5 + cell / 2],
        [m + 1.5 + cell / 2, m + 1.5 + cell * 1.5],
        [m + 1.5 + cell * 1.5, m + 1.5 + cell / 2],
      ];
      for (let i = 0; i < lensCount; i++) lenses.push({ x: pos[i][0], y: pos[i][1], r: i === 0 ? Math.min(R, cell / 2 - 0.4) : r2 });
      flash = { x: m + 1.5 + cell * 1.5, y: m + 1.5 + cell * 1.5 };
      break;
    }
    case 'circle': {
      const Rc = R * 1.5 + (lensCount > 1 ? r2 * 1.4 : 2);
      const cy = m + Rc + 2;
      module = { type: 'circle', x: w / 2, y: cy, r: Rc };
      if (lensCount === 1) lenses.push({ x: w / 2, y: cy, r: R * 1.15 });
      if (lensCount === 2) lenses.push({ x: w / 2, y: cy - Rc * 0.42, r: R * 0.95 }, { x: w / 2, y: cy + Rc * 0.45, r: r2 });
      if (lensCount === 3)
        lenses.push(
          { x: w / 2, y: cy - Rc * 0.45, r: R * 0.9 },
          { x: w / 2 - Rc * 0.45, y: cy + Rc * 0.38, r: r2 * 0.9 },
          { x: w / 2 + Rc * 0.45, y: cy + Rc * 0.38, r: r2 * 0.9 },
        );
      flash = { x: w / 2 + Rc + 4, y: cy - Rc * 0.5, free: true };
      break;
    }
    case 'hpill': {
      const step = R * 2 + 2.6;
      const len = lensCount * step + 6;
      const ph = R * 2 + 4.5;
      module = { type: 'rrect', x: m + len / 2, y: m + ph / 2, w: len, h: ph, r: ph / 2 };
      for (let i = 0; i < lensCount; i++) lenses.push({ x: m + 3 + step / 2 + i * step, y: m + ph / 2, r: radii[i] });
      flash = { x: m + len + 4, y: m + ph / 2, free: true };
      break;
    }
    case 'float': {
      const step = R * 2 + 4;
      for (let i = 0; i < lensCount; i++) lenses.push({ x: m + R + 1, y: m + R + 1 + i * step, r: radii[i], ring: true });
      flash = { x: m + R * 2 + 6, y: m + R, free: true };
      break;
    }
    case 'glasses': {
      const Rc = R + 2.6;
      const gap = 3.5;
      const cx1 = w / 2 - Rc - gap / 2;
      const cx2 = w / 2 + Rc + gap / 2;
      const cy = m + Rc + 1;
      module = { type: 'twin', a: { x: cx1, y: cy, r: Rc }, b: { x: cx2, y: cy, r: Rc } };
      lenses.push({ x: cx1, y: cy, r: R });
      if (lensCount >= 2) lenses.push({ x: cx2, y: cy, r: lensCount === 3 ? r2 : R });
      if (lensCount === 3) lenses.push({ x: w / 2, y: cy + Rc + 3.5, r: r2 * 0.7, ring: true });
      flash = { x: w / 2, y: cy - Rc * 0.3, free: true };
      break;
    }
    case 'diamond': {
      const D = R * 2 + r2 * 2 + 9;
      const cx = m + D / 2;
      const cy = m + D / 2;
      module = { type: 'diamond', x: cx, y: cy, s: D / Math.SQRT2 };
      const off = D * 0.27;
      const pos = [[cx, cy - off], [cx - off, cy], [cx + off, cy]];
      for (let i = 0; i < lensCount; i++) lenses.push({ x: pos[i][0], y: pos[i][1], r: i === 0 ? R * 0.9 : r2 * 0.85 });
      flash = { x: cx, y: cy + off };
      break;
    }
    case 'vpill':
    default: {
      const step = R * 2 + 2.6;
      const len = lensCount * step + 9;
      const pw = R * 2 + 4.5;
      module = { type: 'rrect', x: m + pw / 2, y: m + len / 2, w: pw, h: len, r: pw / 2 };
      for (let i = 0; i < lensCount; i++) lenses.push({ x: m + pw / 2, y: m + 3 + step / 2 + i * step, r: radii[i] });
      flash = { x: m + pw / 2, y: m + len - 4 };
      break;
    }
  }
  return { module, lenses, flash };
}

// ═════════════════════════ 机型构建 ═════════════════════════

export function buildPhone(design) {
  const phys = physical(design);
  const { w, h, thickness: t } = phys;
  const corner = CORNERS[design.corner] || CORNERS[1];
  const b = Math.min(corner.bevel, t / 2 - 0.5);
  const matId = design.parts.material;
  const camT = tier(design, 'camera');
  const chipT = tier(design, 'chip');
  const batT = tier(design, 'battery');
  const form = SCREEN_FORMS.find((f) => f.id === design.screenForm) || SCREEN_FORMS[0];
  const backHex = design.color;
  const frameHex = design.twoTone === 'frame' ? design.color2 : design.color;

  const root = new THREE.Group();
  const layers = { front: new THREE.Group(), frame: new THREE.Group(), inner: new THREE.Group(), back: new THREE.Group() };
  Object.values(layers).forEach((g) => root.add(g));
  const anchors = {};

  const capW = w - 2 * b;
  const capH = h - 2 * b;
  const capR = Math.max(0.6, corner.r - b);

  // —— 中框：圆角环 + 倒角 ——
  const inset = b + 1.5;
  const holeW = w - 2 * inset;
  const holeH = h - 2 * inset;
  const outer = roundedRectShape(capW, capH, capR);
  const hole = roundedRectShape(holeW, holeH, Math.max(0.6, corner.r - inset));
  outer.holes.push(new THREE.Path(hole.getPoints(14).reverse()));
  const depth = t - 2 * b;
  const frameGeo = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 4, curveSegments: 20 });
  frameGeo.translate(0, 0, -depth / 2);
  const crystal = (design.concepts || []).includes('crystal');
  const wrapScr = (design.concepts || []).includes('wrap');
  if (crystal) {
    const fm = new THREE.Mesh(
      frameGeo,
      new THREE.MeshPhysicalMaterial({ color: shade(frameHex, 0.35), transparent: true, opacity: 0.32, roughness: 0.05, clearcoat: 1, depthWrite: false, envMapIntensity: 1.5 }),
    );
    fm.layers.set(FX);
    fm.renderOrder = 2;
    layers.frame.add(fm);
  } else if (wrapScr) {
    // 环绕屏：侧边也是发光的屏
    layers.frame.add(new THREE.Mesh(frameGeo, [new THREE.MeshBasicMaterial({ color: 0x0b0d14 }), new THREE.MeshBasicMaterial({ color: shade(design.color, 0.1), toneMapped: false })]));
  } else {
    const ti = (design.concepts || []).includes('titanium');
    layers.frame.add(new THREE.Mesh(frameGeo, ti ? new THREE.MeshStandardMaterial({ color: 0x8d9096, metalness: 0.85, roughness: 0.45, envMapIntensity: 1.2 }) : frameMaterial(matId, frameHex)));
  }
  const mid = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRectShape(holeW - 0.5, holeH - 0.5, Math.max(0.6, corner.r - inset)), 16),
    new THREE.MeshStandardMaterial({ color: 0x8c9099, roughness: 0.5, metalness: 0.6, side: THREE.DoubleSide }),
  );
  mid.position.z = t / 2 - 1.1;
  layers.frame.add(mid);
  anchors.frame = new THREE.Object3D();
  anchors.frame.position.set(w / 2, h * 0.3, 0);
  layers.frame.add(anchors.frame);

  const keyMat = frameMaterial(matId, shade(frameHex, -0.06).getStyle());
  const addKey = (y, len) => {
    const k = new THREE.Mesh(new THREE.BoxGeometry(1.3, len, Math.min(3, t * 0.36)), keyMat);
    k.position.set(w / 2 + 0.35, y, 0);
    layers.frame.add(k);
  };
  addKey(h * 0.22, 14);
  addKey(h * 0.08, 9);
  const dark = new THREE.MeshBasicMaterial({ color: 0x07070a });
  const port = new THREE.Mesh(new THREE.BoxGeometry(9, 1, Math.min(3, t * 0.4)), dark);
  port.position.set(0, -h / 2 + 0.25, 0);
  layers.frame.add(port);
  for (let i = 0; i < 5; i++) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), dark);
    g.position.set(-14 - i * 2.4, -h / 2 + 0.2, 0);
    layers.frame.add(g);
  }
  if (matId !== 0) {
    const antMat = new THREE.MeshStandardMaterial({ color: shade(frameHex, -0.25), roughness: 0.6 });
    for (const sy of [1, -1]) {
      for (const sx of [1, -1]) {
        const a = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.1, t * 0.7), antMat);
        a.position.set(sx * (w / 2 + 0.05), sy * (h / 2 - 16), 0);
        layers.frame.add(a);
      }
    }
  }

  // —— 前屏 ——
  const front = layers.front;
  const fa = new THREE.Group(); // 前屏动画组（滑盖 / 旋转屏）
  front.add(fa);
  const glassGeo = new THREE.ExtrudeGeometry(roundedRectShape(capW + 0.1, capH + 0.1, capR + 0.05), {
    depth: 0.4,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 2,
    curveSegments: 20,
  });
  glassGeo.translate(0, 0, -0.45);
  fa.add(new THREE.Mesh(glassGeo, new THREE.MeshPhysicalMaterial({ color: 0x08090d, roughness: 0.06, clearcoat: 1, envMapIntensity: 1.3 })));
  const C = new Set(design.concepts || []);
  const anim = [];
  const bez = form.bezel;
  const topExtra = form.id === 'bezel' ? 6 : 0;
  const dispW = capW - 2 * bez;
  const fullH = capH - 2 * bez - topExtra * 2;
  const kbH = C.has('keyboard') ? fullH * 0.4 : 0;
  const dispH = fullH - kbH;
  const dispGeo = new THREE.ShapeGeometry(roundedRectShape(dispW, dispH, Math.max(0.5, capR - bez)), 24);
  const uv = dispGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / dispW + 0.5, uv.getY(i) / dispH + 0.5);
  const display = new THREE.Mesh(dispGeo, new THREE.MeshBasicMaterial({ map: wallpaperTexture(design.color), toneMapped: false }));
  display.position.set(0, kbH / 2, 0.17);
  fa.add(display);
  if (kbH) {
    // 实体键盘：4 行 × 10 列
    const keyMat = new THREE.MeshStandardMaterial({ color: 0x2b2c33, roughness: 0.5 });
    const keyTop = new THREE.MeshStandardMaterial({ color: 0x3a3c45, roughness: 0.4 });
    const accent = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.4 });
    const rows = 4;
    const cols = 10;
    const pad = 1.2;
    const kw = (dispW - pad * 2) / cols;
    const kh = (kbH - pad * 3) / rows;
    const y0 = -fullH / 2 + kbH - pad;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wide = r === 3 && c >= 3 && c <= 6;
        if (r === 3 && c > 3 && c <= 6) continue;
        const k = new THREE.Mesh(new THREE.BoxGeometry(wide ? kw * 4 - 0.8 : kw - 0.8, kh - 0.8, 0.7), [
          keyMat, keyMat, keyMat, keyMat, (r === 2 && c === 9) ? accent : keyTop, keyMat,
        ]);
        const cx = -dispW / 2 + pad + kw * (wide ? c + 2 : c + 0.5);
        k.position.set(cx, y0 - kh * (r + 0.5), 0.45);
        fa.add(k);
      }
    }
  }
  anchors.screen = new THREE.Object3D();
  anchors.screen.position.set(-dispW * 0.28, dispH * 0.2, 0.2);
  fa.add(anchors.screen);
  const glare = new THREE.Mesh(
    new THREE.PlaneGeometry(dispW, dispH),
    new THREE.MeshBasicMaterial({ map: glareTexture(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  glare.position.set(0, kbH / 2, 0.2);
  glare.layers.set(FX);
  fa.add(glare);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x030304 });
  if ((form.id === 'punch' || form.id === 'center') && !C.has('popup') && !C.has('udc')) {
    const hc = new THREE.Mesh(new THREE.CircleGeometry(1.7, 16), holeMat);
    hc.position.set(form.id === 'punch' ? -dispW / 2 + 5.5 : 0, dispH / 2 + kbH / 2 - 5, 0.22);
    fa.add(hc);
  }
  if (form.id === 'bezel') {
    const slot = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(12, 1.4, 0.7)), new THREE.MeshBasicMaterial({ color: 0x2a2a30 }));
    slot.position.set(0, capH / 2 - bez - topExtra, 0.22);
    fa.add(slot);
    const cam = new THREE.Mesh(new THREE.CircleGeometry(1.4, 12), holeMat);
    cam.position.set(9, capH / 2 - bez - topExtra, 0.22);
    fa.add(cam);
  }

  // —— 后盖（观看者坐标，整组翻转 180°）——
  const back = layers.back;
  back.rotation.y = Math.PI;
  const toLocal = (X, Y) => [-w / 2 + X, h / 2 - Y];
  const plateGeo = new THREE.ExtrudeGeometry(roundedRectShape(capW, capH, capR), {
    depth: 0.5,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.12,
    bevelSegments: 1,
    curveSegments: 20,
  });
  plateGeo.translate(0, 0, -0.55);
  let plateMat = null;
  if (C.has('wrap')) {
    const wp = new THREE.Mesh(plateGeo, new THREE.MeshBasicMaterial({ map: wallpaperTexture(shade(design.color, -0.1).getStyle()), toneMapped: false }));
    const uvb = plateGeo.attributes.uv;
    for (let i = 0; i < uvb.count; i++) uvb.setXY(i, uvb.getX(i) / capW + 0.5, uvb.getY(i) / capH + 0.5);
    back.add(wp);
  } else if (C.has('clear') || C.has('crystal')) {
    const clearMat = new THREE.MeshPhysicalMaterial({
      color: shade(backHex, 0.25),
      transparent: true,
      opacity: 0.3,
      roughness: 0.05,
      clearcoat: 1,
      depthWrite: false,
      envMapIntensity: 1.4,
    });
    const plate = new THREE.Mesh(plateGeo, clearMat);
    plate.layers.set(FX);
    plate.renderOrder = 2;
    back.add(plate);
  } else {
    plateMat = C.has('ceramic')
      ? new THREE.MeshPhysicalMaterial({ color: shade(backHex, 0.18), roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.02, sheen: 0.4, envMapIntensity: 1.5 })
      : bodyMaterial(matId, backHex);
    back.add(new THREE.Mesh(plateGeo, plateMat));
  }
  if (C.has('chrome') && plateMat) {
    // 电致变色：在主色和互补色之间缓慢渐变
    const c0 = new THREE.Color(backHex);
    const hsl = {};
    c0.getHSL(hsl);
    anim.push((now) => {
      const k = (Math.sin(now * 0.0012) + 1) / 2;
      plateMat.color.setHSL((hsl.h + k * 0.5) % 1, Math.max(0.45, hsl.s), 0.35 + k * 0.25);
    });
  }
  anchors.back = new THREE.Object3D();
  anchors.back.position.set(-w * 0.2, -h * 0.2, 0.2);
  back.add(anchors.back);

  if (design.twoTone === 'band') {
    const split = h / 2 - Math.max(42, h * 0.3);
    const band = new THREE.Mesh(new THREE.ShapeGeometry(topBandShape(capW, capH, capR, split), 24), bodyMaterial(matId, design.color2));
    band.position.z = 0.09;
    back.add(band);
  }
  if (matId === 3) {
    const pts = roundedRectShape(capW - 5, capH - 5, Math.max(0.6, capR - 2.5)).getPoints(30);
    pts.push(pts[0]);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineDashedMaterial({ color: shade(backHex, 0.22), dashSize: 1.6, gapSize: 1.3 }),
    );
    line.computeLineDistances();
    line.position.z = 0.12;
    line.layers.set(FX);
    back.add(line);
  }
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: backDecalTexture(design, w, h, backHex), transparent: true, depthWrite: false }),
  );
  decal.position.z = 0.14;
  back.add(decal);

  const lay = cameraLayout(design.layout, w, h, camT.lenses, design.parts.camera);
  if (C.has('oneinch') && lay.lenses[0]) lay.lenses[0].r *= 1.4;
  const bump = camT.bump;
  const modHex = design.twoTone === 'band' ? design.color2 : design.color;
  const modMat = bodyMaterial(matId === 3 ? 2 : matId, shade(modHex, -0.07).getStyle());
  const extrude = (s, d) =>
    new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 3, curveSegments: 28 });
  let surf = 0.05;
  if (lay.module) {
    const md = lay.module;
    const geos = [];
    if (md.type === 'rrect') {
      const [x, y] = toLocal(md.x, md.y);
      geos.push(extrude(roundedRectShape(md.w, md.h, md.r, x, y), bump));
    } else if (md.type === 'circle') {
      const [x, y] = toLocal(md.x, md.y);
      geos.push(extrude(circleShape(md.r, x, y), bump));
    } else if (md.type === 'twin') {
      for (const c of [md.a, md.b]) {
        const [x, y] = toLocal(c.x, c.y);
        geos.push(extrude(circleShape(c.r, x, y), bump));
      }
    } else if (md.type === 'diamond') {
      const [x, y] = toLocal(md.x, md.y);
      const g = extrude(roundedRectShape(md.s, md.s, 3.5), bump);
      g.rotateZ(Math.PI / 4);
      g.translate(x, y, 0);
      geos.push(g);
    }
    for (const g of geos) back.add(new THREE.Mesh(g, modMat));
    surf = bump + 0.4;
  }
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xa4a8b0, metalness: 0.95, roughness: 0.18, envMapIntensity: 1.6 });
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.4 });
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x0c1030,
    roughness: 0.04,
    metalness: 0.3,
    clearcoat: 1,
    iridescence: 1,
    iridescenceIOR: 1.6,
    iridescenceThicknessRange: [200, 700],
    envMapIntensity: 1.6,
  });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xdcecff });
  const accentMat = new THREE.MeshBasicMaterial({ color: 0xe67e22 });
  lay.lenses.forEach((L, i) => {
    const [x, y] = toLocal(L.x, L.y);
    const ringH = L.ring ? bump + 0.9 : 1.0;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(L.r, L.r * 1.04, ringH, 32), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, surf + ringH / 2);
    back.add(ring);
    const top = surf + ringH;
    const barrel = new THREE.Mesh(new THREE.CircleGeometry(L.r * 0.86, 32), barrelMat);
    barrel.position.set(x, y, top + 0.02);
    back.add(barrel);
    const lens = new THREE.Mesh(new THREE.SphereGeometry(L.r * 0.66, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), lensMat);
    lens.rotation.x = Math.PI / 2;
    lens.scale.set(1, 0.35, 1);
    lens.position.set(x, y, top + 0.03);
    back.add(lens);
    const glint = new THREE.Mesh(new THREE.CircleGeometry(L.r * 0.16, 10), glintMat);
    glint.position.set(x - L.r * 0.26, y + L.r * 0.26, top + L.r * 0.24);
    back.add(glint);
    if (i === 0 && design.parts.camera === 2) {
      const acc = new THREE.Mesh(new THREE.RingGeometry(L.r * 0.9, L.r * 0.98, 32), accentMat);
      acc.position.set(x, y, top + 0.05);
      back.add(acc);
    }
  });
  if (lay.flash) {
    const [x, y] = toLocal(lay.flash.x, lay.flash.y);
    const fz = lay.module && !lay.flash.free ? surf : 0.05;
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.5, 14), new THREE.MeshBasicMaterial({ color: 0xfff1b8 }));
    fl.rotation.x = Math.PI / 2;
    fl.position.set(x, y, fz + 0.25);
    back.add(fl);
  }

  // —— 背面概念件 ——
  if (C.has('subscreen')) {
    const sw = Math.min(36, w * 0.52);
    const sh = 22;
    const sy = h / 2 - 58;
    const glassS = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedRectShape(sw + 2, sh + 2, 3), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 1 }),
      new THREE.MeshPhysicalMaterial({ color: 0x07080b, roughness: 0.05, clearcoat: 1 }),
    );
    glassS.position.set(0, sy, 0.05);
    back.add(glassS);
    const scr = new THREE.Mesh(
      new THREE.PlaneGeometry(sw, sh),
      new THREE.MeshBasicMaterial({
        map: canvasTex(72, 44, (g, cw, ch) => {
          g.fillStyle = '#0b1020';
          g.fillRect(0, 0, cw, ch);
          g.fillStyle = shade(design.color, 0.2).getStyle();
          g.fillRect(0, 0, cw, 4);
          g.fillStyle = '#fff';
          g.font = 'bold 15px monospace';
          g.textAlign = 'center';
          g.fillText('10:24', cw / 2, 24);
          g.fillStyle = '#ff7675';
          g.fillText('♥', 12, 38);
          g.fillStyle = '#9aa0ab';
          g.font = '8px monospace';
          g.fillText('3 条新消息', cw / 2 + 6, 37);
        }, { nearest: true }),
        toneMapped: false,
      }),
    );
    scr.position.set(0, sy, 0.5);
    back.add(scr);
  }
  if (C.has('eink')) {
    const ew = capW - 8;
    const eh = capH * 0.56;
    const ey = -capH / 2 + eh / 2 + 6;
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(ew, eh),
      new THREE.MeshStandardMaterial({
        roughness: 0.9,
        map: canvasTex(96, 128, (g, cw, ch) => {
          g.fillStyle = '#d9d7cc';
          g.fillRect(0, 0, cw, ch);
          g.fillStyle = '#2b2b2b';
          g.font = 'bold 40px "ZCOOL KuaiLe",sans-serif';
          g.textAlign = 'center';
          g.fillText((design.company || '?').slice(0, 1), cw / 2, 56);
          g.font = 'bold 11px monospace';
          g.fillText('今日 23° 晴', cw / 2, 82);
          for (let y = 92; y < ch - 8; y += 4) {
            for (let x = 8 + ((y / 4) % 2) * 2; x < cw - 8; x += 4) if (Math.random() < 0.35) g.fillRect(x, y, 2, 2);
          }
        }, { nearest: true }),
      }),
    );
    panel.position.set(0, ey, 0.16);
    back.add(panel);
  }
  if (C.has('lights')) {
    const ring = roundedRectShape(capW - 5, capH - 5, Math.max(1, capR - 2.5));
    ring.holes.push(new THREE.Path(roundedRectShape(capW - 7.4, capH - 7.4, Math.max(1, capR - 3.7)).getPoints(20).reverse()));
    const lm = new THREE.MeshBasicMaterial({ color: 0x33e0d0, toneMapped: false });
    const lightRing = new THREE.Mesh(new THREE.ShapeGeometry(ring, 20), lm);
    lightRing.position.z = 0.2;
    back.add(lightRing);
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(2.2, capH * 0.32), lm);
    bar.position.set(w * 0.22, -h * 0.12, 0.2);
    back.add(bar);
    anim.push((now) => lm.color.setHSL((now * 0.00012) % 1, 0.85, 0.6));
  }
  if (C.has('fan')) {
    const fy = -h * 0.14;
    const R = Math.min(13, w * 0.18);
    const grill = new THREE.Mesh(new THREE.RingGeometry(R - 1.8, R, 32), new THREE.MeshStandardMaterial({ color: 0x2a2c33, metalness: 0.6, roughness: 0.35 }));
    grill.position.set(0, fy, 0.25);
    const well = new THREE.Mesh(new THREE.CircleGeometry(R - 1.8, 32), new THREE.MeshBasicMaterial({ color: 0x0b0b0e }));
    well.position.set(0, fy, 0.2);
    back.add(grill, well);
    const rotor = new THREE.Group();
    rotor.position.set(0, fy, 0.35);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x9aa0ab, metalness: 0.5, roughness: 0.4 });
    for (let i = 0; i < 7; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(R * 0.72, 2.4, 0.3), bladeMat);
      blade.position.x = R * 0.42;
      const holder = new THREE.Group();
      holder.rotation.z = (i / 7) * Math.PI * 2;
      blade.rotation.x = 0.4;
      holder.add(blade);
      rotor.add(holder);
    }
    const hub = new THREE.Mesh(new THREE.CircleGeometry(R * 0.28, 20), new THREE.MeshBasicMaterial({ color: 0xe67e22 }));
    hub.position.z = 0.3;
    rotor.add(hub);
    back.add(rotor);
    const spin = design.parts.chip === 2 ? 0.02 : 0.004;
    anim.push((now) => (rotor.rotation.z = now * spin));
  }
  if (C.has('shutter')) {
    const sb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9, Math.min(3.2, t * 0.42)), new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.35, metalness: 0.3 }));
    sb.position.set(w / 2 + 0.45, -h * 0.28, 0);
    layers.frame.add(sb);
  }
  if (C.has('sat')) {
    const antMat2 = new THREE.MeshStandardMaterial({ color: 0x3a3d46, metalness: 0.5, roughness: 0.4 });
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.6, 20, 12), antMat2);
    stub.position.set(-w / 2 + 6, h / 2 + 8, -t * 0.1);
    stub.rotation.z = 0.35;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(2, 12, 8), new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.4 }));
    tip.position.set(-w / 2 + 2.6, h / 2 + 17.5, -t * 0.1);
    layers.frame.add(stub, tip);
  }

  // —— v1.3 行业部件的小细节 ——
  {
    const dk = new THREE.MeshBasicMaterial({ color: 0x050507 });
    if (C.has('jack')) {
      const jk = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, 1, 12), dk);
      jk.position.set(-w * 0.25, h / 2 + 0.1, 0);
      layers.frame.add(jk);
    }
    if (C.has('ir')) {
      const irw = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 1.8), new THREE.MeshBasicMaterial({ color: 0x3b0d0d }));
      irw.position.set(w * 0.1, h / 2 + 0.1, 0);
      layers.frame.add(irw);
    }
    if (C.has('sdcard')) {
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.5, 16, Math.min(2.4, t * 0.3)), new THREE.MeshStandardMaterial({ color: shade(frameHex, -0.2) }));
      tray.position.set(-w / 2 - 0.15, h * 0.18, 0);
      layers.frame.add(tray);
    }
    if (C.has('fastcharge')) port.material = new THREE.MeshBasicMaterial({ color: 0xe67e22 });
    if (C.has('magcharge') || C.has('reverse')) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(15, 16.4, 48), new THREE.MeshBasicMaterial({ color: shade(backHex, -0.25), transparent: true, opacity: 0.8 }));
      ring.position.set(0, -h * 0.05, 0.17);
      back.add(ring);
    }
    if (C.has('periscope') && lay.lenses[0]) {
      const L0 = lay.lenses[lay.lenses.length - 1];
      const [px, py] = toLocal(L0.x, L0.y + L0.r * 2.6);
      const box = new THREE.Mesh(new THREE.BoxGeometry(L0.r * 1.8, L0.r * 1.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.6, roughness: 0.3 }));
      box.position.set(px, py, surf + 0.6);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(L0.r * 1.3, L0.r * 1.3), lensMat);
      win.position.set(px, py, surf + 1.25);
      back.add(box, win);
    }
    if (C.has('gimbal') && lay.lenses[0]) {
      const [gx, gy] = toLocal(lay.lenses[0].x, lay.lenses[0].y);
      const gr = new THREE.Mesh(new THREE.TorusGeometry(lay.lenses[0].r * 1.12, 0.45, 8, 32), new THREE.MeshStandardMaterial({ color: 0xc0392b, metalness: 0.7, roughness: 0.3 }));
      gr.position.set(gx, gy, surf + 1.1);
      back.add(gr);
    }
    if (C.has('facelock')) {
      const bar = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(16, 3.2, 1.6)), dk);
      bar.position.set(0, capH / 2 - form.bezel - 3, 0.25);
      fa.add(bar);
    }
    if (C.has('paper')) {
      const matte = new THREE.Mesh(new THREE.PlaneGeometry(dispW, dispH), new THREE.MeshBasicMaterial({ color: 0xf3e6c8, transparent: true, opacity: 0.22, depthWrite: false }));
      matte.position.set(0, kbH / 2, 0.21);
      fa.add(matte);
    }
    if (C.has('ai')) {
      const badge = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 6),
        new THREE.MeshBasicMaterial({
          transparent: true,
          map: canvasTex(48, 24, (g2) => {
            g2.fillStyle = '#1b1c21';
            g2.fillRect(0, 0, 48, 24);
            g2.fillStyle = '#5ffbf1';
            g2.font = 'bold 16px monospace';
            g2.textAlign = 'center';
            g2.fillText('AI', 24, 18);
          }, { nearest: true }),
        }),
      );
      badge.position.set(w * 0.22, -h * 0.32, 0.2);
      back.add(badge);
    }
  }

  // —— v0.9 概念件 ——
  const accentM = new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.35, metalness: 0.3 });
  const darkM = new THREE.MeshStandardMaterial({ color: 0x1b1c21, roughness: 0.45 });
  const cyc = (now, period, a, b) => {
    // 0→1→0 的循环：停 a 秒，过渡 b 秒
    const T = (now / 1000) % period;
    const half = period / 2;
    const k = T < half ? Math.min(1, Math.max(0, (T - a) / b)) : 1 - Math.min(1, Math.max(0, (T - half - a) / b));
    return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  };
  const slab = (sw, sh, st, withScreen = true) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedRectShape(sw - 1, sh - 1, Math.max(0.6, corner.r - 1)), { depth: st - 1, bevelEnabled: true, bevelThickness: 0.5, bevelSize: 0.5, bevelSegments: 2, curveSegments: 16 }),
      [bodyMaterial(matId, backHex), frameMaterial(matId, frameHex)],
    );
    body.geometry.translate(0, 0, -(st - 1) / 2);
    g.add(body);
    if (withScreen) {
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(sw - 3, sh - 3), new THREE.MeshBasicMaterial({ map: wallpaperTexture(design.color), toneMapped: false }));
      scr.position.z = st / 2 + 0.05;
      g.add(scr);
    }
    return g;
  };

  if (C.has('fold') || C.has('trifold')) {
    // 外折：左半屏绕背面铰链折到身后
    const hingeL = new THREE.Group();
    hingeL.position.set(-w / 2, 0, -t / 2);
    const leafL = slab(w, h, t);
    leafL.position.set(-w / 2, 0, t / 2);
    hingeL.add(leafL);
    root.add(hingeL);
    const hinge = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, h - 6, 12), frameMaterial(2, '#9aa0ab'));
    hinge.position.set(-w / 2, 0, -t / 2);
    root.add(hinge);
    let hingeR = null;
    if (C.has('trifold')) {
      // Z 字：右半屏绕正面铰链折到屏幕前
      hingeR = new THREE.Group();
      hingeR.position.set(w / 2, 0, t / 2);
      const leafR = slab(w, h, t);
      leafR.position.set(w / 2, 0, -t / 2);
      hingeR.add(leafR);
      root.add(hingeR);
    }
    anim.push((now) => {
      const k = cyc(now, 9, 2.6, 1.4);
      hingeL.rotation.y = -Math.PI * k * 0.98;
      if (hingeR) hingeR.rotation.y = Math.PI * cyc(now + 450, 9, 2.6, 1.4) * 0.98;
    });
  }
  if (C.has('rollable')) {
    const ext = slab(w * 0.55, h - 6, Math.max(2, t * 0.45));
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(t * 0.32, t * 0.32, h - 8, 16), frameMaterial(2, frameHex));
    ext.add(roller);
    roller.position.set(w * 0.275, 0, 0);
    ext.position.set(w / 2 - w * 0.3, 0, t * 0.2);
    root.add(ext);
    anim.push((now) => (ext.position.x = w / 2 - w * 0.3 + cyc(now, 7, 1.8, 1.2) * w * 0.55));
  }
  if (C.has('slider')) {
    // 滑盖：屏幕上滑，露出第二层（手柄面板）
    const deck = new THREE.Mesh(
      new THREE.PlaneGeometry(capW - 2, h * 0.36),
      new THREE.MeshBasicMaterial({
        map: canvasTex(96, 48, (g2, cw, ch) => {
          g2.fillStyle = '#1b1c21';
          g2.fillRect(0, 0, cw, ch);
          g2.fillStyle = '#5d6d7e';
          g2.fillRect(12, 18, 18, 6);
          g2.fillRect(18, 12, 6, 18);
          ['#e74c3c', '#f1c40f', '#2ecc71', '#3498db'].forEach((c, i) => {
            g2.fillStyle = c;
            g2.beginPath();
            g2.arc(70 + (i % 2 ? 8 : -8) * (i < 2 ? 1 : 0), 21 + (i === 2 ? -8 : i === 3 ? 8 : 0), 4, 0, Math.PI * 2);
            g2.fill();
          });
        }, { nearest: true }),
      }),
    );
    deck.position.set(0, -h / 2 + h * 0.18 + 2, t / 2 - 0.2);
    front.add(deck);
    anim.push((now) => (fa.position.y = cyc(now, 7, 2, 0.8) * h * 0.34));
  }
  if (C.has('swivel')) {
    anim.push((now) => {
      const k = cyc(now, 8, 2, 1.2);
      fa.rotation.z = (-Math.PI / 2) * k;
      fa.position.z = k * 2.5;
    });
  }
  if (C.has('popup')) {
    const pop = new THREE.Group();
    const pb = new THREE.Mesh(new THREE.BoxGeometry(12, 9, Math.min(5, t - 1.5)), frameMaterial(matId, frameHex));
    const pl = new THREE.Mesh(new THREE.CircleGeometry(2, 16), new THREE.MeshBasicMaterial({ color: 0x050507 }));
    pl.position.set(0, 1, Math.min(5, t - 1.5) / 2 + 0.05);
    pop.add(pb, pl);
    layers.frame.add(pop);
    anim.push((now) => pop.position.set(-w * 0.18, h / 2 - 5 + cyc(now, 6, 1.6, 0.4) * 8.5, 0));
  }
  if (C.has('stylus')) {
    const pen = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 30, 10), darkM);
    shaft.position.y = 15;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 3, 10), accentM);
    cap.position.y = -1;
    pen.add(shaft, cap);
    layers.frame.add(pen);
    anim.push((now) => pen.position.set(w / 2 - 8, -h / 2 - cyc(now, 7, 3, 0.6) * 22, 0));
  }
  if (C.has('battswap')) {
    const seam = roundedRectShape(capW - 8, capH * 0.6, 4, 0, -capH * 0.15).getPoints(24);
    seam.push(seam[0]);
    const sl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(seam), new THREE.LineBasicMaterial({ color: shade(backHex, -0.35) }));
    sl.position.z = 0.15;
    sl.layers.set(FX);
    back.add(sl);
    const latch = new THREE.Mesh(new THREE.BoxGeometry(10, 3, 0.6), accentM);
    latch.position.set(0, capH * 0.15 + 3, 0.4);
    back.add(latch);
  }
  if (C.has('modular')) {
    const cols = ['#2c3e50', '#e67e22', '#16a085', '#8e44ad'];
    const mods = [];
    for (let i = 0; i < 4; i++) {
      const mw = (capW - 12) / 2;
      const mh = capH * 0.26;
      const m = new THREE.Mesh(new THREE.BoxGeometry(mw, mh, 1.2), new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.4, metalness: 0.2 }));
      m.position.set((i % 2 ? 1 : -1) * (mw / 2 + 1.5), -capH * 0.08 - Math.floor(i / 2) * (mh + 3), 0.7);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(3, 12), new THREE.MeshBasicMaterial({ color: 0xecf0f1 }));
      dot.position.z = 0.65;
      m.add(dot);
      back.add(m);
      mods.push(m);
    }
    anim.push((now) => {
      const k = cyc(now, 6, 2, 0.4);
      mods[1].position.z = 0.7 + k * 6;
    });
  }
  if (C.has('solar')) {
    const sp = new THREE.Mesh(
      new THREE.PlaneGeometry(capW - 6, capH * 0.6),
      new THREE.MeshStandardMaterial({
        roughness: 0.25,
        metalness: 0.4,
        map: canvasTex(64, 96, (g2, cw, ch) => {
          g2.fillStyle = '#1a2a5e';
          g2.fillRect(0, 0, cw, ch);
          g2.fillStyle = '#26408b';
          for (let y = 1; y < ch; y += 12) for (let x = 1; x < cw; x += 16) g2.fillRect(x, y, 14, 10);
          g2.fillStyle = '#c9ccd1';
          for (let x = 8; x < cw; x += 16) g2.fillRect(x, 0, 1, ch);
        }, { nearest: true }),
      }),
    );
    sp.position.set(0, -capH * 0.15, 0.16);
    back.add(sp);
  }
  if (C.has('watch')) {
    const wy = -h * 0.12;
    const win = new THREE.Mesh(new THREE.CircleGeometry(14, 32), new THREE.MeshBasicMaterial({ color: 0x15100a }));
    win.position.set(0, wy, 0.2);
    const bezelW = new THREE.Mesh(new THREE.RingGeometry(14, 15.5, 32), new THREE.MeshStandardMaterial({ color: 0xd4ac0d, metalness: 0.9, roughness: 0.25 }));
    bezelW.position.set(0, wy, 0.25);
    back.add(win, bezelW);
    const gold = new THREE.MeshStandardMaterial({ color: 0xd4ac0d, metalness: 0.9, roughness: 0.3 });
    const gear = (r, teeth) => {
      const g2 = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.6, 20), gold);
      disc.rotation.x = Math.PI / 2;
      g2.add(disc);
      for (let i = 0; i < teeth; i++) {
        const th = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 0.6), gold);
        const a = (i / teeth) * Math.PI * 2;
        th.position.set(Math.cos(a) * (r + 0.5), Math.sin(a) * (r + 0.5), 0);
        th.rotation.z = a;
        g2.add(th);
      }
      return g2;
    };
    const g1 = gear(6.5, 14);
    g1.position.set(-3, wy + 2, 0.6);
    const g2 = gear(4, 10);
    g2.position.set(6.4, wy - 4, 0.9);
    const ruby = new THREE.Mesh(new THREE.CircleGeometry(0.9, 8), new THREE.MeshBasicMaterial({ color: 0xc0392b }));
    ruby.position.set(-3, wy + 2, 1);
    back.add(g1, g2, ruby);
    anim.push((now) => {
      g1.rotation.z = now * 0.0015;
      g2.rotation.z = -now * 0.0025;
    });
  }
  if (C.has('projector')) {
    const lensP = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 2, 16), darkM);
    lensP.position.set(w * 0.22, h / 2 + 0.5, 0);
    layers.frame.add(lensP);
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(22, 42, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    beam.geometry.translate(0, -21, 0);
    beam.rotation.z = Math.PI;
    beam.position.set(w * 0.22, h / 2 + 1, 0);
    beam.layers.set(FX);
    layers.frame.add(beam);
    const img = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 26),
      new THREE.MeshBasicMaterial({ map: wallpaperTexture(design.color), transparent: true, opacity: 0.85, toneMapped: false, side: THREE.DoubleSide }),
    );
    img.position.set(w * 0.22, h / 2 + 44, 0);
    img.layers.set(FX);
    layers.frame.add(img);
    anim.push((now) => {
      beam.material.opacity = 0.1 + 0.04 * Math.sin(now * 0.02);
      img.material.opacity = 0.75 + 0.15 * Math.sin(now * 0.017);
    });
  }
  if (C.has('holo')) {
    const holo = new THREE.Group();
    const ico = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(14, 0)),
      new THREE.LineBasicMaterial({ color: 0x5ffbf1, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(10, 16, 32),
      new THREE.MeshBasicMaterial({ color: 0x5ffbf1, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -20;
    holo.add(ico, ring);
    holo.traverse((o) => o.layers.set(FX));
    holo.position.set(0, h * 0.05, t / 2 + 26);
    root.add(holo);
    anim.push((now) => {
      ico.rotation.y = now * 0.0012;
      ico.rotation.x = now * 0.0007;
      holo.position.y = h * 0.05 + Math.sin(now * 0.002) * 3;
      ico.material.opacity = 0.6 + 0.3 * Math.sin(now * 0.01);
    });
  }
  if (C.has('pet')) {
    const pc = document.createElement('canvas');
    pc.width = 40;
    pc.height = 28;
    const pg = pc.getContext('2d');
    const ptex = new THREE.CanvasTexture(pc);
    ptex.magFilter = ptex.minFilter = THREE.NearestFilter;
    ptex.colorSpace = THREE.SRGBColorSpace;
    const pw = Math.min(34, w * 0.5);
    const scrP = new THREE.Mesh(new THREE.PlaneGeometry(pw, pw * 0.7), new THREE.MeshBasicMaterial({ map: ptex, toneMapped: false }));
    scrP.position.set(0, h / 2 - 58, 0.5);
    const frameP = new THREE.Mesh(new THREE.PlaneGeometry(pw + 3, pw * 0.7 + 3), new THREE.MeshBasicMaterial({ color: 0x07080b }));
    frameP.position.set(0, h / 2 - 58, 0.45);
    back.add(frameP, scrP);
    let last = 0;
    anim.push((now) => {
      if (now - last < 180) return;
      last = now;
      const f = Math.floor(now / 180);
      pg.fillStyle = '#9bbc0f';
      pg.fillRect(0, 0, 40, 28);
      pg.fillStyle = '#306230';
      const x = 6 + Math.abs(((f % 28) - 14)) * 2;
      const y = 12 - (f % 4 === 0 ? 2 : 0);
      pg.fillRect(x, y, 8, 7);
      pg.fillRect(x + 1, y - 2, 2, 2);
      pg.fillRect(x + 5, y - 2, 2, 2);
      pg.fillStyle = '#9bbc0f';
      pg.fillRect(x + 2, y + 2, 1, 1);
      pg.fillRect(x + 5, y + 2, 1, 1);
      pg.fillStyle = '#306230';
      pg.fillRect(0, 22, 40, 1);
      if (f % 20 < 10) pg.fillRect(30, 4, 3, 3);
      ptex.needsUpdate = true;
    });
  }

  // —— 内部元件（拆解时可见）——
  const inner = layers.inner;
  const iw = holeW - 2 * b - 1.5;
  const ih = holeH - 2 * b - 1.5;
  const zBack = -t / 2 + 0.7;
  const boardH = ih * 0.36;
  const pcbSide = new THREE.MeshStandardMaterial({ color: 0x175c34 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(iw * 0.92, boardH, 0.9), [
    pcbSide,
    pcbSide,
    pcbSide,
    pcbSide,
    new THREE.MeshStandardMaterial({ color: 0x1e7a46, roughness: 0.6 }),
    new THREE.MeshStandardMaterial({ map: pcbTexture(), roughness: 0.55 }),
  ]);
  const boardY = ih / 2 - boardH / 2 - 1;
  board.position.set(0, boardY, 0.2);
  inner.add(board);
  const chipS = [9, 10.5, 12][chipT.id];
  const chipSide = new THREE.MeshStandardMaterial({ color: 0x2b2e36, metalness: 0.4, roughness: 0.4 });
  const chip = new THREE.Mesh(new THREE.BoxGeometry(chipS, chipS, 1.1), [
    chipSide,
    chipSide,
    chipSide,
    chipSide,
    chipSide,
    new THREE.MeshStandardMaterial({ map: chipTexture(chipT.label.split(' ')[1] || 'S'), roughness: 0.35, metalness: 0.2 }),
  ]);
  const vcT = chipT.id === 2 ? 0.35 : 0;
  chip.position.set(iw * 0.12, boardY - 1, 0.2 - 0.45 - vcT - 0.55);
  inner.add(chip);
  anchors.chip = chip;
  if (vcT) {
    // 旗舰芯片：铜色均热板，从背面就能看到
    const vc = new THREE.Mesh(
      new THREE.BoxGeometry(chipS * 2, chipS * 1.6, vcT),
      new THREE.MeshStandardMaterial({ color: 0xc8753a, metalness: 0.9, roughness: 0.25, envMapIntensity: 1.5 }),
    );
    vc.position.set(iw * 0.12, boardY - 1, 0.2 - 0.45 - vcT / 2);
    inner.add(vc);
  }
  for (let i = 0; i < 4; i++) {
    const comp = new THREE.Mesh(
      new THREE.BoxGeometry(3 + (i % 2) * 2, 2.5 + i, 0.8),
      new THREE.MeshStandardMaterial({ color: [0x3a3d46, 0x23252b, 0xb0b4bc, 0x3a3d46][i], metalness: 0.5, roughness: 0.4 }),
    );
    comp.position.set(-iw * 0.32 + i * 3.4, boardY + (i % 2 ? 4 : -4), 0.2 - 0.9);
    inner.add(comp);
  }
  const batH = ih * [0.4, 0.46, 0.52][batT.id];
  const batD = Math.max(2.5, t - 2.8);
  const batY = -ih / 2 + batH / 2 + 7;
  const batMat = new THREE.MeshStandardMaterial({ color: 0x26282e, roughness: 0.5 });
  const battery = new THREE.Mesh(new THREE.BoxGeometry(iw * 0.86, batH, batD), [
    batMat,
    batMat,
    batMat,
    batMat,
    batMat,
    new THREE.MeshStandardMaterial({ map: batteryTexture(batT), roughness: 0.45 }),
  ]);
  battery.position.set(0, batY, 0);
  inner.add(battery);
  anchors.battery = battery;
  const flexLen = boardY - boardH / 2 - (batY + batH / 2) + 4;
  const flex = new THREE.Mesh(new THREE.BoxGeometry(5, Math.max(4, flexLen), 0.25), new THREE.MeshStandardMaterial({ color: 0xe0a030, roughness: 0.4 }));
  flex.position.set(iw * 0.3, (boardY - boardH / 2 + batY + batH / 2) / 2, -batD / 2 - 0.2);
  inner.add(flex);
  const spk = new THREE.Mesh(new THREE.BoxGeometry(iw * 0.45, 5, Math.min(3.5, t - 3)), new THREE.MeshStandardMaterial({ color: 0x4a4e57, roughness: 0.6 }));
  spk.position.set(-iw * 0.18, -ih / 2 + 3, 0);
  inner.add(spk);
  const sensorMat = new THREE.MeshStandardMaterial({ color: 0x30333b, metalness: 0.5, roughness: 0.4 });
  const sensorGlass = new THREE.MeshPhysicalMaterial({ color: 0x223066, roughness: 0.05, clearcoat: 1, iridescence: 1, iridescenceIOR: 1.5 });
  lay.lenses.forEach((L, i) => {
    const [bx, by] = toLocal(L.x, L.y);
    const s = L.r * (i === 0 ? 2.1 : 1.7);
    const d = Math.min(t - 2, 4.5);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(s, s, d), sensorMat);
    cube.position.set(-bx, by, zBack + d / 2 - 0.4);
    inner.add(cube);
    const gl = new THREE.Mesh(new THREE.CircleGeometry(L.r * 0.7, 20), sensorGlass);
    gl.rotation.y = Math.PI;
    gl.position.set(-bx, by, zBack - 0.42);
    inner.add(gl);
    if (i === 0) anchors.sensor = cube;
  });

  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { root, layers, anchors, anim, dims: { w, h, t } };
}

export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of new Set(mats)) {
      if (m.map && m.map !== leatherTex) m.map.dispose();
      m.dispose();
    }
  });
}

// ═════════════════════════ 像素化后处理 ═════════════════════════

const postVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const postFrag = /* glsl */ `
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform sampler2D tNormal;
uniform vec2 res;
uniform float near;
uniform float far;
uniform float bands;
uniform float outline;
uniform float flash;
uniform float spot;
uniform vec3 bgTop;
uniform vec3 bgBot;
uniform vec3 spotCol;
varying vec2 vUv;

float rawD(vec2 uv) { return texture2D(tDepth, uv).x; }
float vz(vec2 uv) { return -perspectiveDepthToViewZ(rawD(uv), near, far); }
vec3 nrm(vec2 uv) { return normalize(texture2D(tNormal, uv).xyz * 2.0 - 1.0); }

float bayer(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  int i = x + y * 4;
  float m[16];
  m[0]=0.;m[1]=8.;m[2]=2.;m[3]=10.;m[4]=12.;m[5]=4.;m[6]=14.;m[7]=6.;
  m[8]=3.;m[9]=11.;m[10]=1.;m[11]=9.;m[12]=15.;m[13]=7.;m[14]=13.;m[15]=5.;
  for (int k = 0; k < 16; k++) { if (k == i) return m[k] / 16.0 - 0.5; }
  return 0.0;
}

vec3 toSRGB(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

void main() {
  vec2 px = vUv * res;
  vec2 cell = (floor(px) + 0.5) / res;
  float d = rawD(cell);
  float dith = bayer(floor(px));
  float aspect = res.x / res.y;
  vec3 col;
  if (d >= 0.9999) {
    vec2 p = (cell - vec2(0.5, 0.56)) * vec2(aspect, 1.0);
    vec3 bg = mix(bgBot, bgTop, smoothstep(0.0, 1.0, cell.y));
    bg += spotCol * spot * smoothstep(0.62, 0.0, length(p));
    bg *= 1.0 - 0.45 * smoothstep(0.5, 1.15, length((cell - 0.5) * vec2(aspect, 1.0)));
    float lv = 12.0;
    float Yb = dot(bg, vec3(0.299, 0.587, 0.114));
    float v = Yb * lv;
    float base = floor(v);
    float Yq = (base + step(0.5 + dith * 0.6, v - base)) / lv;
    col = bg * (Yq / max(Yb, 0.002));
  } else {
    vec3 c = toSRGB(texture2D(tColor, cell).rgb);
    float Y = dot(c, vec3(0.299, 0.587, 0.114));
    float Yq = floor(Y * bands + 0.5 + dith * 0.22) / bands;
    c *= Yq / max(Y, 0.002);
    float g = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(g), c, 1.12);
    col = c;
    if (outline > 0.5) {
      vec2 o = 1.0 / res;
      float w0 = 1.0 / vz(cell);
      vec3 n0 = nrm(cell);
      float sil = 0.0;
      float hl = 0.0;
      vec3 L = normalize(vec3(-0.55, 0.75, 0.4));
      vec2 axes[2];
      axes[0] = vec2(o.x, 0.0);
      axes[1] = vec2(0.0, o.y);
      for (int k = 0; k < 2; k++) {
        vec2 pa = cell + axes[k];
        vec2 pb = cell - axes[k];
        if (rawD(pa) >= 0.9999 || rawD(pb) >= 0.9999) { sil = 1.0; continue; }
        float lap = (1.0 / vz(pa) + 1.0 / vz(pb) - 2.0 * w0) / w0;
        if (lap < -0.003) sil = 1.0;
      }
      if (sil < 0.5) {
        vec2 offs[4];
        offs[0] = vec2(o.x, 0.0); offs[1] = vec2(-o.x, 0.0); offs[2] = vec2(0.0, o.y); offs[3] = vec2(0.0, -o.y);
        for (int k = 0; k < 4; k++) {
          vec2 q = cell + offs[k];
          vec3 nq = nrm(q);
          float nd = 1.0 - dot(n0, nq);
          float dz = abs(1.0 / vz(q) - w0) / w0;
          if (nd > 0.12 && dz < 0.02) {
            float s = dot(n0 - nq, L);
            if (s > 0.0) hl = max(hl, clamp(nd * 3.0, 0.0, 1.0));
          }
        }
      }
      vec3 ink = col * 0.3 + vec3(0.05, 0.035, 0.03);
      col = mix(col, ink, sil);
      col = mix(col, min(vec3(1.0), col * 1.5 + 0.08), hl * 0.85);
    }
  }
  col = mix(col, vec3(1.0, 0.98, 0.92), flash);
  gl_FragColor = vec4(col, 1.0);
}
`;

// ═════════════════════════ 舞台 ═════════════════════════

const IDLE_BG = { top: '#a7bfd3', bot: '#3b4a5e', spot: '#fff1d0' };
const STAGE_BG = { top: '#140f22', bot: '#040307', spot: '#6a4fb0' };

export class PhoneStage {
  constructor(host) {
    this.host = host;
    this.pixel = 0; // 只保留高清档
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.className = 'stage3d-canvas';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 50, 2400);
    this.camera.layers.enable(FX);
    this.baseZ = 480;
    this.camera.position.set(0, 14, this.baseZ);

    this.scene.environment = studioEnvironment(this.renderer);
    this.scene.environmentIntensity = 0.85;

    this.hemi = new THREE.HemisphereLight(0xfff4e0, 0x3a2e26, 0.75);
    this.key = new THREE.DirectionalLight(0xffffff, 2.0);
    this.key.position.set(150, 260, 280);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(1024, 1024);
    Object.assign(this.key.shadow.camera, { left: -140, right: 140, top: 140, bottom: -140, near: 50, far: 900 });
    this.key.shadow.bias = -0.002;
    this.key.shadow.normalBias = 1.6;
    this.rim = new THREE.DirectionalLight(0x9fc7ff, 1.2);
    this.rim.position.set(-260, 90, -220);
    this.rimWarm = new THREE.DirectionalLight(0xffb070, 0.0);
    this.rimWarm.position.set(260, 40, -200);
    this.spot = new THREE.SpotLight(0xfff0c8, 0, 1400, Math.PI / 12, 0.5, 0);
    this.spot.position.set(0, 560, 200);
    this.spot.target.position.set(0, -60, 0);
    this.scene.add(this.hemi, this.key, this.rim, this.rimWarm, this.spot, this.spot.target);

    this._buildPedestal();
    this._buildFx();
    this._buildStageSet();

    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);
    this.phone = null;
    this.dims = { w: 72, h: 152, t: 7.6 };

    const rtOpts = { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, type: THREE.HalfFloatType };
    this.rt = new THREE.WebGLRenderTarget(4, 4, rtOpts);
    this.rt.depthTexture = new THREE.DepthTexture(4, 4);
    this.nrt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.normalMat = new THREE.MeshNormalMaterial();
    this.postMat = new THREE.ShaderMaterial({
      vertexShader: postVert,
      fragmentShader: postFrag,
      uniforms: {
        tColor: { value: this.rt.texture },
        tDepth: { value: this.rt.depthTexture },
        tNormal: { value: this.nrt.texture },
        res: { value: new THREE.Vector2(4, 4) },
        near: { value: this.camera.near },
        far: { value: this.camera.far },
        bands: { value: 9 },
        outline: { value: 1 },
        flash: { value: 0 },
        spot: { value: 0.42 },
        bgTop: { value: new THREE.Color(IDLE_BG.top) },
        bgBot: { value: new THREE.Color(IDLE_BG.bot) },
        spotCol: { value: new THREE.Color(IDLE_BG.spot) },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat));

    this.rotY = 0.55;
    this.rotX = -0.06;
    this.velY = 0;
    this.targetRot = null;
    this.lastInteract = 0;
    this.explode = 0;
    this.explodeTarget = 0;
    this.morph = null;
    this.reveal = null;
    this.stageMix = 0;
    this.onFrame = null;
    this._bindPointer();

    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(host);
    this.resize();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _buildPedestal() {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(64, 70, 18, 48), new THREE.MeshStandardMaterial({ color: 0x4a3122, roughness: 0.55 }));
    base.position.y = -9;
    const led = new THREE.Mesh(new THREE.CylinderGeometry(65.5, 65.5, 2.4, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xff9a3c }));
    led.position.y = -2;
    this.ledMat = led.material;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(60, 61, 3, 48), new THREE.MeshStandardMaterial({ color: 0xe9e0d0, roughness: 0.7 }));
    top.position.y = 1.5;
    top.receiveShadow = true;
    base.receiveShadow = true;
    g.add(base, led, top);
    this.pedestal = g;
    this.scene.add(g);
  }

  _buildFx() {
    const n = 90;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 700;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 500;
      pos[i * 3 + 2] = -300 + Math.random() * 380;
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xfff1d0, size: 1, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false }));
    this.dust.layers.set(FX);
    this.dust.frustumCulled = false;
    this.scene.add(this.dust);

    this.sparkN = 160;
    this.sparks = Array.from({ length: this.sparkN }, () => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color() }));
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.sparkN * 3), 3));
    sg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.sparkN * 3), 3));
    this.sparkPts = new THREE.Points(
      sg,
      new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    this.sparkPts.layers.set(FX);
    this.sparkPts.frustumCulled = false;
    this.scene.add(this.sparkPts);
  }

  _buildStageSet() {
    const set = new THREE.Group();
    set.visible = false;
    this.cones = [];
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(
        new THREE.ConeGeometry(85, 760, 32, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xc9b8ff, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      );
      c.geometry.translate(0, -380, 0);
      c.position.set((i - 1) * 260, 430, -60);
      c.layers.set(FX);
      set.add(c);
      this.cones.push(c);
    }
    this.wallCanvas = document.createElement('canvas');
    this.wallCanvas.width = 240;
    this.wallCanvas.height = 72;
    this.wallTex = new THREE.CanvasTexture(this.wallCanvas);
    this.wallTex.colorSpace = THREE.SRGBColorSpace;
    this.wallTex.magFilter = THREE.NearestFilter;
    this.wallTex.minFilter = THREE.NearestFilter;
    this.wallTex.generateMipmaps = false;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(330, 99), new THREE.MeshBasicMaterial({ map: this.wallTex, toneMapped: false }));
    wall.position.set(0, 215, -700);
    wall.layers.set(FX);
    const bezel = new THREE.Mesh(new THREE.BoxGeometry(352, 120, 10), new THREE.MeshStandardMaterial({ color: 0x1b1922, metalness: 0.5, roughness: 0.5 }));
    bezel.position.set(0, 215, -707);
    set.add(wall, bezel);
    const trussMat = new THREE.MeshStandardMaterial({ color: 0x2a2732, metalness: 0.6, roughness: 0.4 });
    const truss = new THREE.Mesh(new THREE.BoxGeometry(1400, 12, 12), trussMat);
    truss.position.set(0, 420, -300);
    set.add(truss);
    // 舞台地板
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(900, 48), new THREE.MeshStandardMaterial({ color: 0x0e0b14, roughness: 0.55, metalness: 0.3, envMapIntensity: 0.15 }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.receiveShadow = true;
    set.add(this.floor);
    const crowdMat = new THREE.MeshBasicMaterial({ color: 0x0a090e });
    const glow = new THREE.MeshBasicMaterial({ color: 0x9fd1ff });
    for (let i = 0; i < 26; i++) {
      const row = i % 2;
      const x = (i / 25 - 0.5) * 460 + (Math.random() - 0.5) * 14;
      const y = -118 - row * 8 + Math.random() * 6;
      const z = 120 + row * 26;
      const head = new THREE.Mesh(new THREE.SphereGeometry(10 + Math.random() * 2, 12, 8), crowdMat);
      head.position.set(x, y + 22, z);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(15, 19, 40, 10), crowdMat);
      body.position.set(x, y - 6, z);
      set.add(head, body);
      if (Math.random() < 0.35) {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(4, 34, 4), crowdMat);
        arm.position.set(x + 12, y + 30, z - 4);
        arm.rotation.z = -0.3;
        const ph = new THREE.Mesh(new THREE.BoxGeometry(9, 15, 1.5), glow);
        ph.position.set(x + 17, y + 50, z - 6);
        set.add(arm, ph);
      }
    }
    this.flashN = 18;
    const fg = new THREE.BufferGeometry();
    const fp = new Float32Array(this.flashN * 3);
    this.flashes = [];
    for (let i = 0; i < this.flashN; i++) {
      fp[i * 3] = (Math.random() - 0.5) * 440;
      fp[i * 3 + 1] = -80 + Math.random() * 30;
      fp[i * 3 + 2] = 110 + Math.random() * 30;
      this.flashes.push({ t: -1 });
    }
    fg.setAttribute('position', new THREE.BufferAttribute(fp, 3));
    fg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.flashN * 3), 3));
    this.flashPts = new THREE.Points(fg, new THREE.PointsMaterial({ size: 4, sizeAttenuation: false, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.flashPts.layers.set(FX);
    this.flashPts.frustumCulled = false;
    set.add(this.flashPts);
    this.stageSet = set;
    this.scene.add(set);
  }

  _drawWall(mode, design, time = 0) {
    const g = this.wallCanvas.getContext('2d');
    const W = this.wallCanvas.width;
    const H = this.wallCanvas.height;
    g.fillStyle = '#07060b';
    g.fillRect(0, 0, W, H);
    g.textAlign = 'center';
    if (mode === 'tease') {
      g.fillStyle = Math.floor(time / 300) % 2 ? '#ff9a3c' : '#6b3a14';
      g.font = 'bold 22px monospace';
      g.fillText('COMING SOON', W / 2, H / 2 + 8);
    } else {
      const grd = g.createLinearGradient(0, 0, W, 0);
      grd.addColorStop(0, '#2a1a40');
      grd.addColorStop(0.5, shade(design.color, -0.25).getStyle());
      grd.addColorStop(1, '#2a1a40');
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#fff';
      g.font = '900 30px "ZCOOL KuaiLe","Noto Sans SC",sans-serif';
      g.fillText(design.modelName || '新机', W / 2, H / 2 + 6);
      g.font = 'bold 10px "Noto Sans SC",sans-serif';
      g.fillStyle = '#ffd08a';
      g.fillText(`${design.company || ''} · 发布会`, W / 2, H - 10);
    }
    g.fillStyle = 'rgba(0,0,0,.35)';
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    this.wallTex.needsUpdate = true;
  }

  /** 发布会幻灯片：在 LED 大屏上自定义绘制 */
  wallSlide(draw) {
    const g = this.wallCanvas.getContext('2d');
    const W = this.wallCanvas.width;
    const H = this.wallCanvas.height;
    g.save();
    g.fillStyle = '#07060b';
    g.fillRect(0, 0, W, H);
    draw(g, W, H);
    g.restore();
    g.fillStyle = 'rgba(0,0,0,.35)';
    for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    this.wallTex.needsUpdate = true;
    if (this.reveal) this.reveal.lastWall = 1e9; // 不让预告画面覆盖
  }

  _bindPointer() {
    const el = this.renderer.domElement;
    let drag = null;
    el.addEventListener('pointerdown', (e) => {
      if (this.reveal && !this.reveal.done) return;
      drag = { x: e.clientX, y: e.clientY };
      this.dragging = true;
      el.setPointerCapture(e.pointerId);
      this.targetRot = null;
      this.lastInteract = performance.now();
    });
    el.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag = { x: e.clientX, y: e.clientY };
      this.rotY += dx * 0.012;
      this.velY = dx * 0.012;
      this.rotX = Math.max(-0.75, Math.min(0.75, this.rotX + dy * 0.008));
      this.lastInteract = performance.now();
    });
    const end = () => {
      drag = null;
      this.dragging = false;
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  setPixel(n) {
    this.pixel = n;
    this.resize();
  }

  /** 换设计：重建机身 + 弹性形变 + 火花 */
  setDesign(design, { animate = false, sparkle = false } = {}) {
    const prev = this.phone ? { ...this.dims } : null;
    if (this.phone) {
      this.pivot.remove(this.phone.root);
      disposeObject(this.phone.root);
    }
    this.design = design;
    this.phone = buildPhone(design);
    this.dims = this.phone.dims;
    this.pivot.add(this.phone.root);
    this.pedestal.position.y = -this.dims.h / 2 - 14;
    if (this.floor) this.floor.position.y = this.pedestal.position.y - 18;
    this._applyExplode();
    if (animate && prev) {
      const from = new THREE.Vector3(prev.w / this.dims.w, prev.h / this.dims.h, prev.t / this.dims.t);
      if (Math.abs(from.x - 1) + Math.abs(from.y - 1) + Math.abs(from.z - 1) < 0.001) from.set(0.94, 0.94, 0.94);
      else from.z = 1 + (from.z - 1) * 2.5; // 厚度变化夸张一点，看得出来
      this.morph = { t0: performance.now(), from };
    }
    if (sparkle) this.burst(26);
  }

  burst(n = 30, { colors = ['#ffe08a', '#ffffff', '#ff9a3c', '#8fe3ff'], speed = 1 } = {}) {
    this.pivot.updateMatrixWorld();
    const m = this.pivot.matrixWorld;
    let spawned = 0;
    for (const s of this.sparks) {
      if (spawned >= n) break;
      if (s.life > 0) continue;
      const { w, h } = this.dims;
      const local = new THREE.Vector3((Math.random() - 0.5) * (w + 10), (Math.random() - 0.5) * h, (Math.random() - 0.5) * 20);
      s.p.copy(local.applyMatrix4(m));
      s.v.set((Math.random() - 0.5) * 80, 30 + Math.random() * 80, (Math.random() - 0.5) * 50).multiplyScalar(speed);
      s.max = s.life = 0.5 + Math.random() * 0.7;
      s.c.set(colors[Math.floor(Math.random() * colors.length)]);
      spawned++;
    }
  }

  view(name) {
    const base = Math.round(this.rotY / (Math.PI * 2)) * Math.PI * 2;
    const map = { front: 0, back: Math.PI, side: Math.PI / 2, hero: 0.55 };
    this.targetRot = { y: base + (map[name] ?? 0.55), x: name === 'hero' ? -0.06 : 0 };
    this.lastInteract = performance.now();
  }

  setExploded(on) {
    this.explodeTarget = on ? 1 : 0;
    const base = Math.round(this.rotY / (Math.PI * 2)) * Math.PI * 2;
    this.targetRot = on ? { y: base + Math.PI - 0.82, x: -0.3 } : { y: base + 0.55, x: -0.06 };
    this.lastInteract = performance.now();
  }

  _applyExplode() {
    if (!this.phone) return;
    const e = easeInOut(this.explode);
    const L = this.phone.layers;
    L.front.position.set(0, -10 * e, this.dims.t / 2 + 62 * e);
    L.frame.position.set(0, 0, 0);
    L.inner.position.set(0, 8 * e, -38 * e);
    L.back.position.set(0, 16 * e, -this.dims.t / 2 - 88 * e);
  }

  /** 锚点 → 视口 CSS 坐标 */
  anchorScreen(name) {
    const a = this.phone?.anchors?.[name];
    if (!a) return null;
    const v = new THREE.Vector3();
    a.getWorldPosition(v);
    v.project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.host.clientWidth, y: (-v.y * 0.5 + 0.5) * this.host.clientHeight };
  }

  /** 发布会时间线（约 5 秒） */
  playReveal(design, { onBeat, quick = false } = {}) {
    this.explodeTarget = 0;
    this.explode = 0;
    this._applyExplode();
    this.reveal = { t0: performance.now(), design, onBeat, fired: {}, startRot: this.rotY, done: false, speed: quick ? 2.6 : 1 };
    this.targetRot = null;
    this.stageSet.visible = true;
    this._drawWall('tease', design, 0);
  }

  /** 跳过前戏，直接到揭幕瞬间 */
  skipReveal() {
    const r = this.reveal;
    if (!r || r.fired.boom) return;
    r.t0 = performance.now() - (3.55 / r.speed) * 1000;
    r.fired.drum = true;
  }

  endReveal() {
    this.reveal = null;
    this.stageSet.visible = false;
    this.postMat.uniforms.flash.value = 0;
    this.lastInteract = performance.now();
  }

  resize() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.baseZ = w / h < 0.8 ? 660 : w / h < 1.1 ? 560 : 490;
    this.camera.updateProjectionMatrix();
    const p = this.pixel || 1;
    const lw = Math.max(1, Math.floor(w / p));
    const lh = Math.max(1, Math.floor(h / p));
    this.rt.setSize(lw, lh);
    this.nrt.setSize(lw, lh);
    this.postMat.uniforms.res.value.set(lw, lh);
    const ps = this.pixel ? 1 : 3;
    this.dust.material.size = ps;
    this.sparkPts.material.size = ps * 2;
    this.flashPts.material.size = ps * 4;
  }

  render() {
    this.renderer.shadowMap.needsUpdate = true;
    if (this.pixel > 0) {
      this.renderer.setRenderTarget(this.rt);
      this.renderer.render(this.scene, this.camera);
      this.camera.layers.disable(FX);
      this.scene.overrideMaterial = this.normalMat;
      this.renderer.setRenderTarget(this.nrt);
      this.renderer.render(this.scene, this.camera);
      this.scene.overrideMaterial = null;
      this.camera.layers.enable(FX);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.postScene, this.postCam);
    } else {
      this._updateBg();
      this.scene.background = this.bgTex;
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
      this.scene.background = null;
    }
  }

  /** 高清档背景：竖向渐变 + 聚光 + 暗角（画在小画布上） */
  _updateBg() {
    const u = this.postMat.uniforms;
    const key = `${u.bgTop.value.getHexString()}${u.bgBot.value.getHexString()}${u.spot.value.toFixed(2)}`;
    if (key === this._bgKey) return;
    this._bgKey = key;
    if (!this.bgCanvas) {
      this.bgCanvas = document.createElement('canvas');
      this.bgCanvas.width = 256;
      this.bgCanvas.height = 256;
      this.bgTex = new THREE.CanvasTexture(this.bgCanvas);
      this.bgTex.colorSpace = THREE.SRGBColorSpace;
    }
    const g = this.bgCanvas.getContext('2d');
    const lin = g.createLinearGradient(0, 0, 0, 256);
    lin.addColorStop(0, `#${u.bgTop.value.getHexString()}`);
    lin.addColorStop(1, `#${u.bgBot.value.getHexString()}`);
    g.fillStyle = lin;
    g.fillRect(0, 0, 256, 256);
    const rad = g.createRadialGradient(128, 112, 6, 128, 112, 150);
    rad.addColorStop(0, `rgba(255,241,208,${u.spot.value * 0.9})`);
    rad.addColorStop(1, 'rgba(255,241,208,0)');
    g.fillStyle = rad;
    g.fillRect(0, 0, 256, 256);
    const vig = g.createRadialGradient(128, 128, 90, 128, 128, 190);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.45)');
    g.fillStyle = vig;
    g.fillRect(0, 0, 256, 256);
    this.bgTex.needsUpdate = true;
  }

  /** 透明背景的机身截图（只有手机本身），用于在像素场景里展示你的设计 */
  cutout(width = 220, rotY = Math.PI + 0.5) {
    const keep = {
      y: this.rotY, x: this.rotX, ex: this.explode, set: this.stageSet.visible, mix: this.stageMix,
      py: this.pivot.position.y, flash: this.postMat.uniforms.flash.value, cam: this.camera.position.clone(),
      ped: this.pedestal.visible, dust: this.dust.visible, spark: this.sparkPts.visible,
    };
    this.explode = 0;
    this._applyExplode();
    this.stageSet.visible = false;
    this.pedestal.visible = false;
    this.dust.visible = false;
    this.sparkPts.visible = false;
    this._setStageMix(0);
    this.pivot.rotation.set(-0.06, rotY, 0);
    this.pivot.position.y = 0;
    if (this.phone) this.phone.root.scale.set(1, 1, 1);
    this.camera.position.set(0, 0, this.baseZ * 0.62);
    this.camera.lookAt(0, 0, 0);
    this.scene.background = null;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.scene, this.camera);
    const src = this.renderer.domElement;
    const sh = src.height;
    const sw = Math.min(src.width, sh * 0.62);
    const sx = (src.width - sw) / 2;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = Math.round((width * sh) / sw);
    c.getContext('2d').drawImage(src, sx, 0, sw, sh, 0, 0, c.width, c.height);
    Object.assign(this, { rotY: keep.y, rotX: keep.x, explode: keep.ex });
    this._applyExplode();
    this.stageSet.visible = keep.set;
    this.pedestal.visible = keep.ped;
    this.dust.visible = keep.dust;
    this.sparkPts.visible = keep.spark;
    this._setStageMix(keep.mix);
    this.postMat.uniforms.flash.value = keep.flash;
    this.pivot.position.y = keep.py;
    this.camera.position.copy(keep.cam);
    return c.toDataURL('image/png');
  }

  /** 机型馆缩略图：背面斜侧 + 摄影棚光 */
  snapshot(size = 160) {
    const keep = {
      y: this.rotY,
      x: this.rotX,
      ex: this.explode,
      set: this.stageSet.visible,
      mix: this.stageMix,
      py: this.pivot.position.y,
      flash: this.postMat.uniforms.flash.value,
      cam: this.camera.position.clone(),
    };
    this.explode = 0;
    this._applyExplode();
    this.stageSet.visible = false;
    this._setStageMix(0);
    this.postMat.uniforms.flash.value = 0;
    this.pivot.rotation.set(-0.06, Math.PI + 0.5, 0);
    this.pivot.position.y = 0;
    if (this.phone) this.phone.root.scale.set(1, 1, 1);
    this.camera.position.set(0, 14, this.baseZ);
    this.camera.lookAt(0, 0, 0);
    this.render();
    const src = this.renderer.domElement;
    const sw = Math.min(src.width, src.height * 0.78);
    const sx = (src.width - sw) / 2;
    const c = document.createElement('canvas');
    c.width = size;
    c.height = Math.round((size * src.height) / sw);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, sx, 0, sw, src.height, 0, 0, c.width, c.height);
    this.rotY = keep.y;
    this.rotX = keep.x;
    this.explode = keep.ex;
    this._applyExplode();
    this.stageSet.visible = keep.set;
    this._setStageMix(keep.mix);
    this.postMat.uniforms.flash.value = keep.flash;
    this.pivot.position.y = keep.py;
    this.camera.position.copy(keep.cam);
    return c.toDataURL('image/png');
  }

  _setStageMix(m) {
    this.stageMix = m;
    const u = this.postMat.uniforms;
    u.bgTop.value.set(IDLE_BG.top).lerp(new THREE.Color(STAGE_BG.top), m);
    u.bgBot.value.set(IDLE_BG.bot).lerp(new THREE.Color(STAGE_BG.bot), m);
    u.spotCol.value.set(IDLE_BG.spot).lerp(new THREE.Color(STAGE_BG.spot), m);
    u.spot.value = 0.42 * (1 - m);
    this.hemi.intensity = 0.75 * (1 - m) + 0.12 * m;
    this.key.intensity = 2.0 * (1 - m) + 0.5 * m;
    this.rim.intensity = 1.2 * (1 - m) + 2.6 * m;
    this.rimWarm.intensity = 2.2 * m;
    this.spot.intensity = 14 * m;
    this.scene.environmentIntensity = 0.85 * (1 - m) + 0.55 * m;
    this.dust.material.opacity = 0.55 + 0.35 * m;
  }

  /** 释放 WebGL 资源（游戏切换阶段时卸载） */
  dispose() {
    this._dead = true;
    this._ro?.disconnect();
    if (this.phone) disposeObject(this.phone.root);
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    this.rt.dispose();
    this.nrt.dispose();
    this.scene.environment?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss?.();
    this.renderer.domElement.remove();
  }

  _loop(now) {
    if (this._dead) return;
    const dt = Math.min(0.05, (now - (this._last || now)) / 1000);
    this._last = now;
    const idle = now - this.lastInteract > 2600;
    let camZ = this.baseZ + this.explode * 150;
    let camY = 14;

    const ex = this.explode + (this.explodeTarget - this.explode) * Math.min(1, dt * 4.5);
    if (Math.abs(ex - this.explode) > 1e-4) {
      this.explode = Math.abs(ex - this.explodeTarget) < 0.002 ? this.explodeTarget : ex;
      this._applyExplode();
    }

    if (this.reveal) {
      const r = this.reveal;
      const t = ((now - r.t0) / 1000) * r.speed;
      const fire = (key, at, fn) => {
        if (t >= at && !r.fired[key]) {
          r.fired[key] = true;
          fn();
        }
      };
      this._setStageMix(easeInOut(seg(t, 0, 0.7)));
      this.cones.forEach((c, i) => {
        const target = t < 3.6 ? Math.sin(t * 2.2 + i * 2.1) * 0.5 : [0.33, 0, -0.33][i];
        c.rotation.z += (target - c.rotation.z) * 0.12;
        c.material.opacity = 0.02 + 0.035 * seg(t, 0.6, 1.2) + (t > 3.6 ? 0.02 : 0);
      });
      fire('drum', 0.5, () => r.onBeat?.('drumroll'));
      if (t < 3.6 && Math.floor(t * 4) !== r.lastWall) {
        r.lastWall = Math.floor(t * 4);
        this._drawWall('tease', r.design, now);
      }
      const rise = easeOutCubic(seg(t, 1.3, 3.6));
      this.pivot.position.y = -this.dims.h * 1.25 * (1 - rise);
      if (t < 3.6) {
        this.rotY = r.startRot - (1 - rise) * Math.PI * 5;
        this.rotX = -0.06;
      } else {
        this.rotY += dt * 0.35;
      }
      this.ledMat.color.setHSL((t * 0.4) % 1, 0.9, 0.6);
      fire('boom', 3.6, () => {
        this._drawWall('name', r.design);
        this.burst(140, { speed: 2.4 });
        r.onBeat?.('boom');
      });
      this.postMat.uniforms.flash.value = t >= 3.6 ? Math.max(0, 1 - (t - 3.6) / 0.45) * 0.9 : 0;
      const fc = this.flashPts.geometry.attributes.color;
      this.flashes.forEach((f, i) => {
        if (t > 3.7 && f.t < 0 && Math.random() < dt * 1.4) {
          f.t = 0;
          if (Math.random() < 0.4) r.onBeat?.('shutter');
        }
        let v = 0;
        if (f.t >= 0) {
          f.t += dt;
          v = Math.max(0, 1 - f.t / 0.18);
          if (f.t > 0.18) f.t = -1;
        }
        fc.setXYZ(i, v, v, v * 0.95);
      });
      fc.needsUpdate = true;
      camZ = this.baseZ - 34 * easeInOut(seg(t, 3.6, 6));
      camY = 14 - 28 * easeInOut(seg(t, 0.5, 3.6));
      fire('done', 4.8, () => {
        r.done = true;
        r.onBeat?.('done');
      });
      this.pivot.rotation.set(this.rotX, this.rotY, 0);
    } else {
      if (this.stageMix > 0) this._setStageMix(Math.max(0, this.stageMix - dt * 1.8));
      this.ledMat.color.lerp(new THREE.Color(0xff9a3c), 0.1);
      if (this.targetRot) {
        this.rotY += (this.targetRot.y - this.rotY) * 0.1;
        this.rotX += (this.targetRot.x - this.rotX) * 0.1;
        if (Math.abs(this.targetRot.y - this.rotY) < 0.002 && Math.abs(this.targetRot.x - this.rotX) < 0.002) this.targetRot = null;
      } else if (idle && this.explodeTarget === 0) {
        this.rotY += dt * 0.32;
        this.rotX += (-0.06 - this.rotX) * 0.02;
      } else if (!this.dragging) {
        this.rotY += this.velY;
        this.velY *= 0.9;
      }
      this.pivot.rotation.set(this.rotX, this.rotY, 0);
      this.pivot.position.y = Math.sin(now * 0.0015) * 2.5 + 4;
    }

    if (this.phone) for (const f of this.phone.anim) f(now);
    if (this.phone && this.morph) {
      const k = Math.min(1, (now - this.morph.t0) / 460);
      const e = easeOutBack(k);
      const f = this.morph.from;
      this.phone.root.scale.set(f.x + (1 - f.x) * e, f.y + (1 - f.y) * e, f.z + (1 - f.z) * e);
      if (k >= 1) {
        this.morph = null;
        this.phone.root.scale.set(1, 1, 1);
      }
    }

    this.camera.position.z += (camZ - this.camera.position.z) * 0.08;
    this.camera.position.y += (camY - this.camera.position.y) * 0.08;
    this.camera.lookAt(0, this.reveal ? 8 : 0, 0);

    const dp = this.dust.geometry.attributes.position;
    for (let i = 0; i < dp.count; i++) {
      let y = dp.getY(i) + dt * (6 + (i % 5));
      if (y > 260) y = -260;
      dp.setY(i, y);
      dp.setX(i, dp.getX(i) + Math.sin(now * 0.0005 + i) * dt * 4);
    }
    dp.needsUpdate = true;

    const sp = this.sparkPts.geometry.attributes.position;
    const sc = this.sparkPts.geometry.attributes.color;
    this.sparks.forEach((s, i) => {
      if (s.life > 0) {
        s.life -= dt;
        s.v.y -= 90 * dt;
        s.p.addScaledVector(s.v, dt);
        const a = Math.max(0, s.life / s.max);
        sp.setXYZ(i, s.p.x, s.p.y, s.p.z);
        sc.setXYZ(i, s.c.r * a, s.c.g * a, s.c.b * a);
      } else {
        sc.setXYZ(i, 0, 0, 0);
      }
    });
    sp.needsUpdate = true;
    sc.needsUpdate = true;

    this.render();
    this.onFrame?.(this);
    requestAnimationFrame(this._loop);
  }
}
