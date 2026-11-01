/**
 * 像素化 3D 机型渲染：参数化生成机身 → 低分辨率渲染 → 减色 + 深度描边 → 最近邻放大
 * 单位：毫米。手机正面朝 +Z，Y 向上。
 */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CORNERS, SCREEN_FORMS, physical, tier } from './parts.js';

// ———————————————————— 工具 ————————————————————

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

/** 圆角矩形的上半段（y >= splitY），用于上下拼色 */
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

// ———————————————————— 材质 ————————————————————

let leatherTex = null;
function leatherTexture() {
  if (leatherTex) return leatherTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 140; i++) {
    const v = 236 + Math.floor(Math.random() * 20);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(Math.random() * 64, Math.random() * 64, 2, 2);
  }
  leatherTex = new THREE.CanvasTexture(c);
  leatherTex.wrapS = leatherTex.wrapT = THREE.RepeatWrapping;
  leatherTex.repeat.set(0.05, 0.05);
  leatherTex.colorSpace = THREE.SRGBColorSpace;
  return leatherTex;
}

function bodyMaterial(matId, hex) {
  const color = new THREE.Color(hex);
  switch (matId) {
    case 1: // 玻璃
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05 });
    case 2: // 金属
      return new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.85 });
    case 3: // 素皮
      return new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, map: leatherTexture() });
    default: // 塑料
      return new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0 });
  }
}

function frameMaterial(matId, hex) {
  if (matId === 0) return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.5 });
  // 玻璃 / 金属 / 素皮 都配金属中框
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.28, metalness: 0.9 });
}

// ———————————————————— 贴图：屏幕壁纸 / 后盖文字 ————————————————————

function wallpaperTexture(accent) {
  const c = document.createElement('canvas');
  c.width = 72;
  c.height = 152;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 152);
  grd.addColorStop(0, shade(accent, 0.15).getStyle());
  grd.addColorStop(1, shade(accent, -0.3).getStyle());
  g.fillStyle = grd;
  g.fillRect(0, 0, 72, 152);
  // 时钟（10:24，极客梗）
  g.fillStyle = '#fff';
  g.font = 'bold 16px monospace';
  g.textAlign = 'center';
  g.fillText('10:24', 36, 40);
  g.font = '6px monospace';
  g.fillText('周五 · 发布会倒计时', 36, 50);
  // 图标格
  const icons = ['#ff7675', '#fdcb6e', '#55efc4', '#74b9ff', '#a29bfe', '#fab1a0', '#81ecec', '#ffeaa7'];
  for (let i = 0; i < 8; i++) {
    const x = 9 + (i % 4) * 15;
    const y = 104 + Math.floor(i / 4) * 16;
    g.fillStyle = icons[i];
    g.fillRect(x, y, 10, 10);
  }
  g.fillStyle = 'rgba(255,255,255,.35)';
  g.fillRect(6, 138, 60, 10);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function backTextTexture(design, w, h, bgHex) {
  const scale = 4; // px / mm
  const c = document.createElement('canvas');
  c.width = Math.round(w * scale);
  c.height = Math.round(h * scale);
  const g = c.getContext('2d');
  const light = luminance(bgHex) < 0.45;
  g.fillStyle = light ? 'rgba(255,255,255,.85)' : 'rgba(30,25,20,.8)';
  g.textAlign = 'center';
  g.font = `900 ${Math.round(9 * scale)}px "Noto Sans SC", sans-serif`;
  g.fillText(design.modelName || '', c.width / 2, c.height * 0.8);
  g.font = `700 ${Math.round(4.2 * scale)}px "Noto Sans SC", sans-serif`;
  g.fillText(design.company || '', c.width / 2, c.height * 0.88);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ———————————————————— 镜头模组布局 ————————————————————

/** 返回背面（观看者视角坐标：X 右、Y 下，原点在背面左上角）的模组与镜头 */
function cameraLayout(layoutId, w, h, lensCount, tierId) {
  const R = [3.6, 4.2, 5.3][tierId]; // 主摄半径
  const r2 = R * 0.78;
  const m = 7.5; // 边距
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
      module = { type: 'circle', x: w / 2, y: m + Rc + 2, r: Rc };
      const cy = m + Rc + 2;
      if (lensCount === 1) lenses.push({ x: w / 2, y: cy, r: R * 1.15 });
      if (lensCount === 2) lenses.push({ x: w / 2, y: cy - Rc * 0.42, r: R * 0.95 }, { x: w / 2, y: cy + Rc * 0.45, r: r2 });
      if (lensCount === 3)
        lenses.push(
          { x: w / 2, y: cy - Rc * 0.45, r: R * 0.9 },
          { x: w / 2 - Rc * 0.45, y: cy + Rc * 0.38, r: r2 * 0.9 },
          { x: w / 2 + Rc * 0.45, y: cy + Rc * 0.38, r: r2 * 0.9 },
        );
      flash = { x: w / 2 + Rc + 4, y: cy - Rc * 0.5 };
      break;
    }
    case 'hpill': {
      const step = R * 2 + 2.6;
      const len = lensCount * step + 6;
      const ph = R * 2 + 4.5;
      module = { type: 'rrect', x: m + len / 2, y: m + ph / 2, w: len, h: ph, r: ph / 2 };
      for (let i = 0; i < lensCount; i++) lenses.push({ x: m + 3 + step / 2 + i * step, y: m + ph / 2, r: radii[i] });
      flash = { x: m + len + 4, y: m + ph / 2 };
      break;
    }
    case 'float': {
      const step = R * 2 + 4;
      for (let i = 0; i < lensCount; i++) lenses.push({ x: m + R + 1, y: m + R + 1 + i * step, r: radii[i], ring: true });
      flash = { x: m + R * 2 + 6, y: m + R };
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
      if (lensCount === 3) lenses.push({ x: w / 2, y: cy + Rc + 3.5, r: r2 * 0.7 });
      flash = { x: w / 2, y: cy - Rc * 0.3 };
      break;
    }
    case 'diamond': {
      const D = R * 2 + r2 * 2 + 9; // 对角线长
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

// ———————————————————— 机型构建 ————————————————————

export function buildPhone(design) {
  const group = new THREE.Group();
  const phys = physical(design);
  const { w, h, thickness: t } = phys;
  const corner = CORNERS[design.corner] || CORNERS[1];
  const b = Math.min(corner.bevel, t / 2 - 0.3);
  const matId = design.parts.material;
  const camTier = tier(design, 'camera');
  const form = SCREEN_FORMS.find((f) => f.id === design.screenForm) || SCREEN_FORMS[0];

  const backHex = design.color;
  const frameHex = design.twoTone === 'frame' ? design.color2 : design.color;

  // 机身：圆角矩形挤出 + 倒角
  const shape = roundedRectShape(w - 2 * b, h - 2 * b, Math.max(0.5, corner.r - b));
  const depth = t - 2 * b;
  const bodyGeo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 4,
    curveSegments: 18,
  });
  bodyGeo.translate(0, 0, -depth / 2);
  const body = new THREE.Mesh(bodyGeo, [bodyMaterial(matId, backHex), frameMaterial(matId, frameHex)]);
  group.add(body);

  const capW = w - 2 * b;
  const capH = h - 2 * b;
  const capR = Math.max(0.5, corner.r - b);

  // —— 正面 ——
  const front = new THREE.Group();
  front.position.z = t / 2 + 0.02;
  const glass = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRectShape(capW + 0.4, capH + 0.4, capR + 0.2), 24),
    new THREE.MeshPhysicalMaterial({ color: 0x0b0c10, roughness: 0.1, clearcoat: 1 }),
  );
  front.add(glass);
  const bez = form.bezel;
  const topExtra = form.id === 'bezel' ? 6 : 0;
  const dispW = capW - 2 * bez;
  const dispH = capH - 2 * bez - topExtra * 2;
  const dispGeo = new THREE.ShapeGeometry(roundedRectShape(dispW, dispH, Math.max(0.5, capR - bez)), 24);
  // ShapeGeometry 的 UV 是原始坐标 → 归一化
  const uv = dispGeo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / dispW + 0.5, uv.getY(i) / dispH + 0.5);
  const display = new THREE.Mesh(dispGeo, new THREE.MeshBasicMaterial({ map: wallpaperTexture(design.color), toneMapped: false }));
  display.position.z = 0.03;
  front.add(display);
  const holeMat = new THREE.MeshBasicMaterial({ color: 0x050507 });
  if (form.id === 'punch' || form.id === 'center') {
    const hole = new THREE.Mesh(new THREE.CircleGeometry(1.7, 16), holeMat);
    hole.position.set(form.id === 'punch' ? -dispW / 2 + 5.5 : 0, dispH / 2 - 5, 0.06);
    front.add(hole);
  }
  if (form.id === 'bezel') {
    const slot = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(12, 1.4, 0.7)), new THREE.MeshBasicMaterial({ color: 0x2a2a30 }));
    slot.position.set(0, capH / 2 - bez - topExtra, 0.06);
    front.add(slot);
    const cam = new THREE.Mesh(new THREE.CircleGeometry(1.4, 12), holeMat);
    cam.position.set(9, capH / 2 - bez - topExtra, 0.06);
    front.add(cam);
  }
  group.add(front);

  // —— 背面（观看者坐标）——
  const back = new THREE.Group();
  back.rotation.y = Math.PI;
  back.position.z = -t / 2 - 0.02;
  const toLocal = (X, Y) => [-w / 2 + X, h / 2 - Y];

  if (design.twoTone === 'band') {
    const split = h / 2 - Math.max(42, h * 0.3);
    const band = new THREE.Mesh(new THREE.ShapeGeometry(topBandShape(capW, capH, capR, split), 24), bodyMaterial(matId, design.color2));
    back.add(band);
  }
  const text = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: backTextTexture(design, w, h, backHex), transparent: true, depthWrite: false }),
  );
  text.position.z = 0.04;
  back.add(text);

  const lay = cameraLayout(design.layout, w, h, camTier.lenses, design.parts.camera);
  const bump = camTier.bump;
  const modHex = design.twoTone === 'band' ? design.color2 : design.color;
  const modMat = bodyMaterial(matId === 3 ? 2 : matId, shade(modHex, -0.08).getStyle());
  const extrude = (s, d) =>
    new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.35, bevelSegments: 2, curveSegments: 28 });
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
    surf = bump + 0.35;
  }
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x8d9097, metalness: 0.9, roughness: 0.25 });
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x10142a, roughness: 0.05, metalness: 0.2, clearcoat: 1 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xbfd8ff });
  for (const L of lay.lenses) {
    const [x, y] = toLocal(L.x, L.y);
    const ringH = L.ring ? bump + 0.8 : 0.9;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(L.r, L.r, ringH, 28), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, y, surf + ringH / 2);
    back.add(ring);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(L.r * 0.74, 28), lensMat);
    lens.position.set(x, y, surf + ringH + 0.02);
    back.add(lens);
    const glint = new THREE.Mesh(new THREE.CircleGeometry(L.r * 0.18, 10), glintMat);
    glint.position.set(x - L.r * 0.28, y + L.r * 0.28, surf + ringH + 0.05);
    back.add(glint);
  }
  if (lay.flash) {
    const [x, y] = toLocal(lay.flash.x, lay.flash.y);
    const fz = lay.module && design.layout !== 'circle' ? surf : 0.05;
    const fl = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.5, 14), new THREE.MeshBasicMaterial({ color: 0xfff1b8 }));
    fl.rotation.x = Math.PI / 2;
    fl.position.set(x, y, fz + 0.25);
    back.add(fl);
  }
  group.add(back);

  // —— 侧键 / 接口 ——
  const keyMat = frameMaterial(matId, shade(frameHex, -0.05).getStyle());
  const addKey = (y, len) => {
    const k = new THREE.Mesh(new THREE.BoxGeometry(1.2, len, Math.min(3, t * 0.38)), keyMat);
    k.position.set(w / 2 + 0.3, y, 0);
    group.add(k);
  };
  addKey(h * 0.22, 14);
  addKey(h * 0.07, 9);
  const port = new THREE.Mesh(new THREE.BoxGeometry(9, 1, Math.min(3, t * 0.4)), holeMat);
  port.position.set(0, -h / 2 + 0.2, 0);
  group.add(port);

  return group;
}

export function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of mats) {
      if (m.map && m.map !== leatherTex) m.map.dispose();
      m.dispose();
    }
  });
}

// ———————————————————— 像素化后处理 ————————————————————

const postVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const postFrag = /* glsl */ `
#include <packing>
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 res;
uniform float near;
uniform float far;
uniform float levels;
uniform float outline;
uniform vec3 bgTop;
uniform vec3 bgBot;
uniform float spot;
varying vec2 vUv;

float viewZ(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return -perspectiveDepthToViewZ(d, near, far);
}
float rawD(vec2 uv) { return texture2D(tDepth, uv).x; }

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
  vec3 col;
  if (d >= 0.9999) {
    // 背景：竖向渐变 + 聚光圈 + 抖动减色
    vec3 bg = mix(bgBot, bgTop, cell.y);
    float r = distance(cell * vec2(res.x / res.y, 1.0), vec2(0.5 * res.x / res.y, 0.55));
    bg += spot * vec3(1.0, 0.92, 0.7) * smoothstep(0.55, 0.0, r) * 0.35;
    col = floor(bg * (levels + 3.0) + dith * 0.45 + 0.5) / (levels + 3.0);
  } else {
    vec3 c = toSRGB(texture2D(tColor, cell).rgb);
    col = floor(c * levels + dith * 0.6 + 0.5) / levels;
    if (outline > 0.5) {
      // 用 1/z 的二阶差分找边：平面上 1/z 在屏幕空间线性 → 掠射角不会误判
      vec2 o = 1.0 / res;
      float w0 = 1.0 / viewZ(cell);
      float edge = 0.0;
      vec2 axes[2];
      axes[0] = vec2(o.x, 0.0); axes[1] = vec2(0.0, o.y);
      for (int k = 0; k < 2; k++) {
        vec2 pa = cell + axes[k];
        vec2 pb = cell - axes[k];
        bool bgA = rawD(pa) >= 0.9999;
        bool bgB = rawD(pb) >= 0.9999;
        if (bgA || bgB) { edge = 1.0; continue; }
        float lap = (1.0 / viewZ(pa) + 1.0 / viewZ(pb) - 2.0 * w0) / w0;
        if (lap < -0.0035) edge = max(edge, 0.6);
      }
      col = mix(col, vec3(0.105, 0.075, 0.05), edge);
    }
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

// ———————————————————— 舞台 ————————————————————

export class PhoneStage {
  constructor(host) {
    this.host = host;
    this.pixel = 3; // 0 = 关闭像素化
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    host.appendChild(this.renderer.domElement);
    this.renderer.domElement.className = 'stage3d-canvas';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(28, 1, 50, 2000);
    this.camera.position.set(0, 12, 430);
    this.camera.lookAt(0, 0, 0);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.75;

    this.hemi = new THREE.HemisphereLight(0xfff4e0, 0x403020, 0.9);
    this.scene.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xffffff, 1.8);
    this.key.position.set(160, 220, 300);
    this.scene.add(this.key);
    this.rim = new THREE.DirectionalLight(0x9fc7ff, 1.1);
    this.rim.position.set(-260, 80, -200);
    this.scene.add(this.rim);
    this.spot = new THREE.SpotLight(0xfff0c8, 0, 900, Math.PI / 7, 0.5, 0);
    this.spot.position.set(0, 420, 260);
    this.scene.add(this.spot);
    this.scene.add(this.spot.target);

    // 手办底座
    this.pedestal = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(58, 62, 10, 40), new THREE.MeshStandardMaterial({ color: 0x3b2a1e, roughness: 0.7 }));
    const rimRing = new THREE.Mesh(new THREE.CylinderGeometry(62.5, 62.5, 3, 40), new THREE.MeshStandardMaterial({ color: 0xe67e22, roughness: 0.5 }));
    rimRing.position.y = 1.5;
    this.pedestal.add(top, rimRing);
    this.scene.add(this.pedestal);

    this.pivot = new THREE.Group(); // 旋转
    this.scene.add(this.pivot);
    this.phone = null;
    this.phoneH = 152;

    // 低分辨率渲染目标
    this.rt = new THREE.WebGLRenderTarget(4, 4, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.HalfFloatType,
    });
    this.rt.depthTexture = new THREE.DepthTexture(4, 4);
    this.postMat = new THREE.ShaderMaterial({
      vertexShader: postVert,
      fragmentShader: postFrag,
      uniforms: {
        tColor: { value: this.rt.texture },
        tDepth: { value: this.rt.depthTexture },
        res: { value: new THREE.Vector2(4, 4) },
        near: { value: this.camera.near },
        far: { value: this.camera.far },
        levels: { value: 7 },
        outline: { value: 1 },
        bgTop: { value: new THREE.Color('#9eb6cc') },
        bgBot: { value: new THREE.Color('#3d4f63') },
        spot: { value: 0.35 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.postMat));

    // 交互
    this.rotY = 0.55;
    this.rotX = -0.08;
    this.velY = 0;
    this.targetRot = null;
    this.lastInteract = 0;
    this.autoSpin = true;
    this.reveal = null;
    this._bindPointer();

    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(host);
    this.resize();
    this._t0 = performance.now();
    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  _bindPointer() {
    const el = this.renderer.domElement;
    let drag = null;
    el.addEventListener('pointerdown', (e) => {
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
      this.rotX = Math.max(-0.7, Math.min(0.7, this.rotX + dy * 0.008));
      this.lastInteract = performance.now();
    });
    const end = () => { drag = null; this.dragging = false; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  setPixel(n) {
    this.pixel = n;
    this.resize();
  }

  setDesign(design) {
    if (this.phone) {
      this.pivot.remove(this.phone);
      disposeObject(this.phone);
    }
    this.phone = buildPhone(design);
    this.phoneH = physical(design).h;
    this.pivot.add(this.phone);
    this.pedestal.position.y = -this.phoneH / 2 - 16;
  }

  /** 预设视角：front / back / side / hero */
  view(name) {
    const base = Math.round(this.rotY / (Math.PI * 2)) * Math.PI * 2;
    const map = { front: 0, back: Math.PI, side: Math.PI / 2, hero: 0.55 };
    this.targetRot = { y: base + (map[name] ?? 0.55), x: name === 'hero' ? -0.08 : 0 };
    this.lastInteract = performance.now();
  }

  /** 发布会揭幕：灯暗 → 聚光 → 升起旋转 → 定格 */
  playReveal(onDone) {
    this.reveal = { t0: performance.now(), dur: 3600, onDone, startRot: this.rotY };
    this.targetRot = null;
  }

  resize() {
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // 竖屏时拉远，保证整机可见
    this.camera.position.z = w / h < 0.8 ? 600 : w / h < 1.1 ? 520 : 470;
    this.camera.updateProjectionMatrix();
    const p = this.pixel || 1;
    const lw = Math.max(1, Math.floor(w / p));
    const lh = Math.max(1, Math.floor(h / p));
    this.rt.setSize(lw, lh);
    this.postMat.uniforms.res.value.set(lw, lh);
  }

  render() {
    if (this.pixel > 0) {
      this.renderer.setRenderTarget(this.rt);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.postScene, this.postCam);
    } else {
      this.scene.background = this.postMat.uniforms.bgBot.value;
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
      this.scene.background = null;
    }
  }

  /** 截图（用于机型馆缩略图） */
  snapshot(size = 160) {
    const prev = { y: this.rotY, x: this.rotX };
    this.rotY = Math.PI + 0.45;
    this.rotX = -0.05;
    this._applyPose(0);
    this.render();
    const src = this.renderer.domElement;
    const c = document.createElement('canvas');
    const ratio = src.height / src.width;
    c.width = size;
    c.height = Math.round(size * ratio);
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, c.width, c.height);
    this.rotY = prev.y;
    this.rotX = prev.x;
    return c.toDataURL('image/png');
  }

  _applyPose(time) {
    this.pivot.rotation.set(this.rotX, this.rotY, 0);
    this.pivot.position.y = Math.sin(time * 0.0016) * 2.5;
  }

  _loop(now) {
    const dt = Math.min(50, now - (this._last || now));
    this._last = now;
    const idle = now - this.lastInteract > 2500;

    if (this.reveal) {
      const r = this.reveal;
      const k = Math.min(1, (now - r.t0) / r.dur);
      const e = 1 - Math.pow(1 - k, 3);
      this.hemi.intensity = 0.9 - 0.75 * Math.min(1, k * 3) + 0.75 * Math.max(0, (k - 0.85) / 0.15);
      this.key.intensity = 1.8 * (1 - 0.8 * Math.min(1, k * 3)) + 1.44 * Math.max(0, (k - 0.85) / 0.15);
      this.spot.intensity = k < 0.15 ? 0 : 9;
      this.postMat.uniforms.spot.value = k < 0.15 ? 0 : 1.4;
      this.postMat.uniforms.bgTop.value.set(k < 0.9 ? '#1d1a24' : '#9eb6cc');
      this.postMat.uniforms.bgBot.value.set(k < 0.9 ? '#08070b' : '#3d4f63');
      this.rotY = r.startRot + (1 - e) * -Math.PI * 4;
      this.rotX = -0.08;
      this.pivot.position.y = -this.phoneH * 1.6 * (1 - Math.min(1, k * 1.8));
      this.pivot.rotation.set(this.rotX, this.rotY, 0);
      if (k >= 1) {
        this.reveal = null;
        this.postMat.uniforms.spot.value = 0.35;
        this.spot.intensity = 0;
        this.lastInteract = now;
        r.onDone?.();
      }
    } else {
      if (this.targetRot) {
        this.rotY += (this.targetRot.y - this.rotY) * 0.12;
        this.rotX += (this.targetRot.x - this.rotX) * 0.12;
        if (Math.abs(this.targetRot.y - this.rotY) < 0.002) this.targetRot = null;
      } else if (idle && this.autoSpin) {
        this.rotY += dt * 0.00045;
      } else if (!this.dragging) {
        this.rotY += this.velY;
        this.velY *= 0.9;
      }
      this._applyPose(now);
    }
    this.render();
    requestAnimationFrame(this._loop);
  }
}
