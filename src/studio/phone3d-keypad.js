/**
 * 按键机 3D 机身（功能机 / 老年机 / 翻盖 / 滑盖 / 旋转屏）
 * 由 buildPhone 在 isKeypadForm(formFactor) 时分派；返回结构与 buildPhone 一致。
 *
 * 外形参考那个年代精心设计过的造型语言（见 docs/KEYPAD_DESIGN.md）：
 *   鹅卵石 pebble  —— 宽肩、微收腰、圆下巴，整机像一颗被握暖的石头
 *   沙漏 waist     —— 屏幕与键盘之间明显收腰，表面处处是细微弧度
 *   糖果 candy     —— 大圆角、厚实饱满（老年机 / 滑盖）
 *   超薄 slim      —— 平直金属薄片 + 圆润两端，蚀刻平板键盘（翻盖）
 *   蛤壳 clam      —— 翻盖：圆顶上盖 + 圆底下盖 + 铰链筒
 * 轮廓用样条曲线生成，挤出时用大倒角做出圆润鼓包的侧面，而不是方块。
 */
import * as THREE from 'three';
import { physical } from './parts.js';
import { archetypeOf, kpShapeOf, KP_SHAPES } from './kpShapes.js';

const FX = 1;

// ═════════════════════════ 轮廓 ═════════════════════════

/** 半边轮廓：[y 占高度比例（+0.5 顶 → -0.5 底）, 半宽占比]，镜像后用闭合样条连成整机轮廓 */
const PROFILES = {
  pebble: [[0.5, 0], [0.497, 0.5], [0.48, 0.86], [0.43, 1.0], [0.2, 0.99], [0.04, 0.9], [-0.12, 0.93], [-0.36, 0.96], [-0.46, 0.8], [-0.495, 0.42], [-0.5, 0]],
  waist: [[0.5, 0], [0.496, 0.66], [0.47, 0.97], [0.38, 1.0], [0.16, 0.95], [0.02, 0.84], [-0.14, 0.9], [-0.4, 0.99], [-0.475, 0.86], [-0.497, 0.5], [-0.5, 0]],
  candy: [[0.5, 0], [0.494, 0.72], [0.46, 0.97], [0.36, 1.0], [-0.36, 1.0], [-0.46, 0.97], [-0.494, 0.72], [-0.5, 0]],
  slim: [[0.5, 0], [0.498, 0.8], [0.485, 0.98], [0.45, 1.0], [-0.45, 1.0], [-0.485, 0.98], [-0.498, 0.8], [-0.5, 0]],
  clamLower: [[0.5, 0], [0.5, 0.86], [0.47, 1.0], [-0.22, 0.99], [-0.42, 0.9], [-0.49, 0.58], [-0.5, 0]],
  clamLid: [[0.5, 0], [0.49, 0.62], [0.42, 0.93], [0.25, 1.0], [-0.47, 1.0], [-0.5, 0.88], [-0.5, 0]],
};

function silhouette(w, h, profile) {
  const right = profile.map(([fy, fx]) => new THREE.Vector3(fx * (w / 2), fy * h, 0));
  const left = right
    .slice(1, -1)
    .reverse()
    .map((v) => new THREE.Vector3(-v.x, v.y, 0));
  const curve = new THREE.CatmullRomCurve3([...right, ...left], true, 'centripetal');
  const pts = curve.getPoints(140).map((p) => new THREE.Vector2(p.x, p.y));
  return { shape: new THREE.Shape(pts), curve };
}

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

/** 屏幕窗：上沿微微拱起的「镜片」形 */
function lensShape(w, h, arch = 0.18, r = 2.2) {
  const s = new THREE.Shape();
  const x0 = -w / 2;
  const y0 = -h / 2;
  s.moveTo(x0 + r, y0);
  s.lineTo(x0 + w - r, y0);
  s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r);
  s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h + h * arch * 0.15);
  s.quadraticCurveTo(0, y0 + h + h * arch, x0 + r, y0 + h + h * arch * 0.15);
  s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  s.lineTo(x0, y0 + r);
  s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}

function shade(hex, k) {
  const c = new THREE.Color(hex);
  const hsl = {};
  c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l + k)));
  return c;
}

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

function bodyMaterial(matId, hex) {
  const color = new THREE.Color(hex);
  switch (matId) {
    case 1:
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.16, metalness: 0, clearcoat: 0.8, clearcoatRoughness: 0.08, envMapIntensity: 1.0 });
    case 2:
      return new THREE.MeshStandardMaterial({ color: color.clone().offsetHSL(0, -0.08, 0.08), roughness: 0.32, metalness: 0.8, envMapIntensity: 1.15 });
    default:
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5, envMapIntensity: 0.6 });
  }
}
const chromeMat = () => new THREE.MeshStandardMaterial({ color: 0xd8dde4, metalness: 0.95, roughness: 0.18, envMapIntensity: 1.3 });
const darkMat = () => new THREE.MeshBasicMaterial({ color: 0x07070a });

/** 待机小屏：大时钟 + 运营商，像素感 */
function standbyTexture(design, { elder = false } = {}) {
  const W = elder ? 96 : 128;
  const H = elder ? 80 : 120;
  const accent = design.color || '#e67e22';
  return canvasTex(
    W,
    H,
    (g, w, h) => {
      g.fillStyle = '#0a1420';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#9bbc0f';
      g.font = `bold ${elder ? 8 : 7}px monospace`;
      g.textAlign = 'left';
      g.fillText('星联通信', 4, 10);
      g.textAlign = 'right';
      g.fillText('||||  █', w - 4, 10);
      g.fillStyle = elder ? '#f5f5f5' : accent;
      g.font = `bold ${elder ? 28 : 22}px monospace`;
      g.textAlign = 'center';
      g.fillText('10:24', w / 2, elder ? 42 : 48);
      g.fillStyle = '#8fa0b0';
      g.font = `${elder ? 11 : 9}px monospace`;
      g.fillText('11月3日 周二', w / 2, elder ? 58 : 64);
      if (elder) {
        g.fillStyle = '#e74c3c';
        g.font = 'bold 10px monospace';
        g.fillText('SOS 一键求助', w / 2, h - 8);
      } else {
        g.fillStyle = '#6a7a8a';
        g.font = '8px monospace';
        g.fillText('菜单          名片夹', w / 2, h - 6);
      }
    },
    { nearest: true },
  );
}

function keyLabelTex(labels, color = '#e8eaef') {
  const n = labels.length;
  const cw = 32;
  const ch = 24;
  return canvasTex(
    cw,
    ch * n,
    (g) => {
      for (let i = 0; i < n; i++) {
        const y = i * ch;
        g.clearRect(0, y, cw, ch);
        g.fillStyle = color;
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const parts = String(labels[i]).split('\n');
        if (parts.length === 1) {
          g.font = 'bold 12px sans-serif';
          g.fillText(parts[0], cw / 2, y + ch / 2);
        } else {
          g.font = 'bold 11px sans-serif';
          g.fillText(parts[0], cw / 2, y + ch / 2 - 4);
          g.globalAlpha = 0.7;
          g.font = '7px sans-serif';
          g.fillText(parts[1], cw / 2, y + ch / 2 + 6);
          g.globalAlpha = 1;
        }
      }
    },
    {},
  );
}

/** 用轮廓挤出一块圆润的机身：大倒角做出鼓包侧面 */
function pillowBody(w, h, t, profile, material, { bevel = 0.34 } = {}) {
  const bt = Math.min(t * bevel, 5);
  const bs = Math.min(bt * 0.9, w * 0.08);
  const { shape } = silhouette(w - 2 * bs, h - 2 * bs, profile);
  const depth = Math.max(0.3, t - 2 * bt);
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 7, curveSegments: 48 });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

/** 前脸面板（可撞色）+ 可选镀铬描边 */
function faceplate(group, w, h, profile, z, hex, { matId = 0, chrome = false, scale = 0.86 } = {}) {
  // 面板要缩在机身正面的平面之内，否则侧面会翘出一条边
  scale = Math.min(scale, 0.8);
  const { shape, curve } = silhouette(w * scale, h * (scale + 0.08), profile);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.25, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.6, bevelSegments: 4, curveSegments: 48 });
  geo.translate(0, 0, z - 0.45);
  const plate = new THREE.Mesh(geo, bodyMaterial(matId === 2 ? 1 : matId, hex));
  group.add(plate);
  if (chrome) {
    const pts = curve.getPoints(160).map((p) => new THREE.Vector3(p.x * 1.03, p.y * 1.015, z + 0.15));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 200, 0.32, 6, true), chromeMat());
    group.add(tube);
  }
  return plate;
}

/** 屏幕窗：黑色镜片 + 显示面 */
function screenWindow(group, { cy, dw, dh, z, map, arch = 0.16, screenMaps, anchors }) {
  const lens = new THREE.Mesh(
    new THREE.ExtrudeGeometry(lensShape(dw + 5, dh + 6, arch, 3), { depth: 0.2, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.3, bevelSegments: 2, curveSegments: 24 }),
    new THREE.MeshPhysicalMaterial({ color: 0x0b0c10, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.2 }),
  );
  lens.position.set(0, cy - 0.6, z);
  group.add(lens);
  const sm = new THREE.MeshBasicMaterial({ map, toneMapped: false });
  screenMaps.push(sm);
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(dw, dh), sm);
  disp.position.set(0, cy, z + 0.45);
  group.add(disp);
  const a = new THREE.Object3D();
  a.position.set(0, cy, z + 0.5);
  group.add(a);
  anchors.screen = a;
  return disp;
}

/** 听筒：胶囊形开槽 + 细栅 */
function earpiece(group, { cy, z, w = 12 }) {
  const slot = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(w, 2.2, 1.1), 10), new THREE.MeshBasicMaterial({ color: 0x15161a }));
  slot.position.set(0, cy, z);
  group.add(slot);
  const dark = darkMat();
  const n = Math.round(w / 1.7);
  for (let i = 0; i < n; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.4, 0.15), dark);
    bar.position.set(-w / 2 + 1.2 + i * ((w - 2.4) / Math.max(1, n - 1)), cy, z + 0.08);
    group.add(bar);
  }
}

/**
 * 导航区 + 数字键盘：键帽是胶囊形，按「微笑弧线」排布（越靠两侧越高）；
 * etched = 超薄机型的金属蚀刻平板键盘。
 */
function keypadFace(group, { padW, top, bottom, z, elder = false, etched = false, smile = 1, backHex, navStyle = 'oval', noNav = false }) {
  const keyMat = etched
    ? new THREE.MeshStandardMaterial({ color: shade(backHex, -0.05), metalness: 0.85, roughness: 0.28, envMapIntensity: 1.2 })
    : new THREE.MeshPhysicalMaterial({ color: elder ? 0x3a3f48 : 0x2a2d34, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3 });
  const keyTopMat = etched ? keyMat : new THREE.MeshPhysicalMaterial({ color: elder ? 0x4b515c : 0x3a3d46, roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  // —— 导航区：中间圆 / 椭圆方向键，两侧弧形软键，下方接听 / 挂断 ——
  const navH = noNav ? 0 : elder ? 16 : 13;
  const navY = top - navH / 2;
  const navRx = elder ? 7 : 5.8;
  const navRy = navStyle === 'joystick' ? navRx : navRx * 0.78;
  const navMat = new THREE.MeshPhysicalMaterial({ color: etched ? shade(backHex, 0.1) : 0x2e323a, metalness: etched ? 0.8 : 0.1, roughness: 0.3, clearcoat: 0.6 });
  const navParts = new THREE.Group();
  navParts.visible = !noNav;
  group.add(navParts);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(navRx, 0.9, 10, 40), navMat);
  ring.scale.set(1, navRy / navRx, 0.6);
  ring.position.set(0, navY, z + 0.6);
  navParts.add(ring);
  const center = new THREE.Mesh(new THREE.SphereGeometry(navStyle === 'joystick' ? 2.2 : navRx * 0.45, 20, 12), new THREE.MeshPhysicalMaterial({ color: navStyle === 'joystick' ? 0x9aa3ad : 0x50565f, metalness: 0.5, roughness: 0.25, clearcoat: 0.8 }));
  center.scale.set(1, navStyle === 'joystick' ? 1 : navRy / navRx, 0.45);
  center.position.set(0, navY, z + 0.8);
  navParts.add(center);
  const wing = (side, color, dy) => {
    const s = new THREE.Shape();
    const x0 = side * (navRx + 2.2);
    const x1 = side * (padW / 2 - 1);
    s.moveTo(x0, dy + 2.4);
    s.quadraticCurveTo((x0 + x1) / 2, dy + 3.8, x1, dy + 2.2);
    s.quadraticCurveTo(x1 + side * 0.8, dy, x1, dy - 2.2);
    s.quadraticCurveTo((x0 + x1) / 2, dy - 1.2, x0, dy - 2.0);
    s.quadraticCurveTo(x0 - side * 0.8, dy, x0, dy + 2.4);
    const m = new THREE.Mesh(
      new THREE.ExtrudeGeometry(s, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 3, curveSegments: 16 }),
      color,
    );
    m.position.set(0, navY, z + 0.15);
    navParts.add(m);
  };
  const soft = new THREE.MeshPhysicalMaterial({ color: etched ? shade(backHex, 0.06) : 0x2b2e36, metalness: etched ? 0.8 : 0, roughness: 0.35, clearcoat: 0.5 });
  const green = new THREE.MeshPhysicalMaterial({ color: 0x27ae60, roughness: 0.35, clearcoat: 0.5, emissive: 0x145a32, emissiveIntensity: 0.25 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0xc0392b, roughness: 0.35, clearcoat: 0.5, emissive: 0x5a1510, emissiveIntensity: 0.2 });
  wing(-1, soft, navRy * 0.55);
  wing(1, soft, navRy * 0.55);
  wing(-1, green, -navRy * 0.65);
  wing(1, red, -navRy * 0.65);

  // —— 数字键 ——
  const labels = ['1', '2\nabc', '3\ndef', '4\nghi', '5\njkl', '6\nmno', '7\npqrs', '8\ntuv', '9\nwxyz', '*', '0\n+', '#'];
  const atlas = keyLabelTex(labels, etched ? '#1a1d22' : '#e8eaef');
  const keyScale = elder ? 1.55 : 1.0;
  const cols = 3;
  const rows = 4;
  const gapX = elder ? 2.4 : 1.4;
  const gapY = elder ? 2.2 : 1.3;
  const gridTop = top - navH - (noNav ? 0 : elder ? 3 : 2.4);
  const gridBottom = bottom;
  const gridH = gridTop - gridBottom;
  const kw = (padW - gapX * (cols - 1)) / cols;
  const kh = Math.min((gridH - gapY * (rows - 1)) / rows, kw * (elder ? 0.72 : 0.6));
  const keyDepth = etched ? 0.18 : elder ? 1.35 : 0.95;
  const keypadGroup = new THREE.Group();
  group.add(keypadGroup);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const kx = -padW / 2 + kw / 2 + c * (kw + gapX);
      // 微笑弧线：两侧列略高
      const ky = gridTop - kh / 2 - r * (kh + gapY) + (c === 1 ? 0 : smile * (elder ? 1.2 : 1.6));
      const shape = etched ? roundedRectShape(kw - 0.3, kh - 0.3, 0.6) : roundedRectShape(kw - 0.6, kh - 0.6, (kh - 0.6) / 2);
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: keyDepth,
        bevelEnabled: true,
        bevelThickness: etched ? 0.05 : elder ? 0.4 : 0.3,
        bevelSize: etched ? 0.05 : elder ? 0.35 : 0.28,
        bevelSegments: etched ? 1 : 3,
        curveSegments: 12,
      });
      const mesh = new THREE.Mesh(geo, [keyMat, keyMat, keyMat, keyMat, keyTopMat, keyMat]);
      mesh.position.set(kx, ky, z + 0.05);
      keypadGroup.add(mesh);
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(kw * 0.62, kh * 1.3), kh * 0.62),
        new THREE.MeshBasicMaterial({ map: atlas, transparent: true, depthWrite: false, toneMapped: false }),
      );
      const uvs = label.geometry.attributes.uv;
      const v0 = 1 - (idx + 1) / labels.length;
      const v1 = 1 - idx / labels.length;
      for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i), v0 + uvs.getY(i) * (v1 - v0));
      // 贴在键帽顶面（顶面 = 挤出深度 + 倒角厚度）
      label.position.set(kx, ky, z + 0.05 + keyDepth + (etched ? 0.07 : elder ? 0.42 : 0.32));
      keypadGroup.add(label);
    }
  }
  return { keypadGroup, gridTop, gridBottom, keyScale };
}

export { archetypeOf, kpShapeOf, KP_SHAPES };

function shell() {
  const root = new THREE.Group();
  const layers = { front: new THREE.Group(), frame: new THREE.Group(), inner: new THREE.Group(), back: new THREE.Group() };
  Object.values(layers).forEach((g) => root.add(g));
  return { root, layers, anchors: {}, anim: [], screenMaps: [] };
}

function backDetails(group, { w, h, design, camY, z, elder = false }) {
  const backHex = design.color || '#3a3d46';
  // 电池盖接缝
  const seam = roundedRectShape(w * 0.72, h * 0.5, 6, 0, -h * 0.12).getPoints(40);
  seam.push(seam[0]);
  const sl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(seam), new THREE.LineBasicMaterial({ color: shade(backHex, -0.3) }));
  sl.position.z = z + 0.02;
  sl.layers.set(FX);
  group.add(sl);
  if ((design.parts?.camera ?? 0) > 0) {
    const r = elder ? 2.4 : 2.8;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.6, 0.55, 10, 28), chromeMat());
    ring.position.set(0, camY, z + 0.4);
    const glass = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x101830, roughness: 0.05, clearcoat: 1, iridescence: 0.6 }));
    glass.rotation.x = Math.PI / 2;
    glass.scale.set(1, 0.3, 1);
    glass.position.set(0, camY, z + 0.1);
    group.add(ring, glass);
  }
  // 外放喇叭孔阵列
  const dark = darkMat();
  for (let i = 0; i < 9; i++) {
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.45, 8), dark);
    dot.position.set(-3 + (i % 3) * 3, camY - 9 - Math.floor(i / 3) * 2.6, z + 0.03);
    group.add(dot);
  }
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(w * 0.5, 7),
    new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      map: canvasTex(128, 24, (g) => {
        g.fillStyle = shade(backHex, 0.4).getStyle();
        g.font = 'bold 14px sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText((design.company || design.modelName || '').slice(0, 8), 64, 12);
      }),
    }),
  );
  logo.position.set(0, -h * 0.18, z + 0.05);
  group.add(logo);
}

// ═════════════════════════ 直板 / 老年机 ═════════════════════════

export function buildKeypadPhone(design, { hdScreen = false, liveScreen = null } = {}) {
  const arch = archetypeOf(design);
  if (arch === 'flip') return buildFlipPhone(design, { hdScreen, liveScreen });
  if (arch === 'slider') return buildSliderPhone(design, { hdScreen, liveScreen });
  if (arch === 'swivel') return buildSwivelPhone(design, { hdScreen, liveScreen });
  const phys = physical(design);
  const ff = design.formFactor || phys.formFactor || 'feature';
  const elder = ff === 'elder';
  const shapeId = kpShapeOf(design);
  const w = elder ? 56 : shapeId === 'waist' ? 47 : 49;
  const h = elder ? 120 : 112;
  const t = Math.max(phys.thickness, elder ? 17 : 15);
  const matId = design.parts?.material ?? 0;
  const backHex = design.color || '#3a3d46';
  const faceHex = design.twoTone !== 'none' && design.color2 ? design.color2 : backHex;
  const profile = PROFILES[shapeId] || PROFILES.pebble;
  const { root, layers, anchors, anim, screenMaps } = shell();
  const ctl = { id: null, t0: 0, until: 0 };
  const zf = t / 2;

  // —— 机身：圆润鼓包 ——
  layers.frame.add(pillowBody(w, h, t, profile, bodyMaterial(matId, backHex)));
  // 侧键（音量）：贴着侧面的弧形小条
  const vol = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, elder ? 14 : 10, 4, 10), bodyMaterial(matId, shade(backHex, -0.1).getStyle()));
  vol.position.set(w / 2 - 0.4, h * 0.16, 0);
  layers.frame.add(vol);

  // 天线短桩（功能机必有；老年机为小凸起）
  {
    const antMat = new THREE.MeshPhysicalMaterial({ color: 0x23262c, roughness: 0.35, clearcoat: 0.5 });
    const stubLen = elder ? 7 : 12;
    const stub = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, stubLen, 4, 12), antMat);
    stub.position.set(w / 2 - 7, h / 2 + stubLen * 0.35, -t * 0.12);
    layers.frame.add(stub);
    anchors.antenna = stub;
  }

  // 老年机：顶部手电筒 LED + 挂绳孔
  if (elder) {
    const ledMat = new THREE.MeshStandardMaterial({ color: 0xfff6d0, emissive: 0xfff1b8, emissiveIntensity: 0.85, roughness: 0.35 });
    const led = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 1.4, 20), ledMat);
    led.rotation.x = Math.PI / 2;
    led.position.set(-w / 2 + 12, h / 2 - 1.2, 0);
    layers.frame.add(led);
    anchors.flashlight = led;
    anim.push((now) => {
      ledMat.emissiveIntensity = 0.55 + 0.35 * Math.sin(now * 0.004);
    });
    const holeRing = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.45, 8, 16), chromeMat());
    holeRing.rotation.y = Math.PI / 2;
    holeRing.position.set(w / 2 - 5, -h / 2 + 7, 0);
    layers.frame.add(holeRing);
    anchors.lanyard = holeRing;
  }

  // —— 前脸 ——
  // 舞台会把 front 层整体前移 t/2、back 层后移 t/2（拆解动画用），这里抵消掉，部件才贴在机身上
  const fa = new THREE.Group();
  fa.position.z = -t / 2;
  layers.front.add(fa);
  faceplate(fa, w, h, profile, zf, faceHex, { matId, chrome: shapeId === 'waist' || matId === 2 });
  const fz = zf + 0.5;
  const dispW = w * (elder ? 0.66 : 0.6);
  const dispH = h * (elder ? 0.24 : 0.25);
  const screenY = h * 0.44 - 8 - dispH / 2 - (elder ? 2 : 1.5);
  const map = liveScreen?.texture || standbyTexture(design, { elder });
  screenWindow(fa, { cy: screenY, dw: dispW, dh: dispH, z: fz, map, arch: shapeId === 'pebble' ? 0.22 : 0.12, screenMaps, anchors });
  if (liveScreen) anim.push((now) => liveScreen.paint(now));
  // 听筒放在前脸面板之内（面板高约 0.88h）
  const grilleY = h * 0.44 - 4;
  earpiece(fa, { cy: grilleY, z: fz + 0.1, w: elder ? 14 : 12 });

  const padW = w * (elder ? 0.7 : 0.7);
  const { keypadGroup, gridTop, gridBottom, keyScale } = keypadFace(fa, {
    padW,
    top: screenY - dispH / 2 - 5.5,
    bottom: -h / 2 + (elder ? 11 : 12),
    z: fz,
    elder,
    smile: shapeId === 'candy' ? 0.3 : 1,
    backHex,
    navStyle: shapeId === 'waist' ? 'joystick' : 'oval',
  });

  // 老年机：左侧红色大 SOS 键
  if (elder) {
    const sosMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.35, emissive: 0xc0392b, emissiveIntensity: 0.35, metalness: 0.15 });
    const sos = new THREE.Mesh(new THREE.CapsuleGeometry(2.6, 14, 6, 14), sosMat);
    sos.position.set(-w / 2 + 0.6, h * 0.02, 0);
    layers.frame.add(sos);
    const sosLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(4.4, 9),
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        map: canvasTex(24, 48, (g) => {
          g.fillStyle = '#fff';
          g.font = 'bold 11px sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          ['S', 'O', 'S'].forEach((ch, i) => g.fillText(ch, 12, 10 + i * 14));
        }),
      }),
    );
    sosLabel.rotation.y = -Math.PI / 2;
    sosLabel.position.set(-w / 2 - 2.1, h * 0.02, 0);
    layers.frame.add(sosLabel);
    anchors.sos = sos;
    anim.push((now) => {
      sosMat.emissiveIntensity = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(now * 0.005));
    });
  }

  anchors.keypad = new THREE.Object3D();
  anchors.keypad.position.set(0, (gridTop + gridBottom) / 2, fz + 1);
  fa.add(anchors.keypad);
  anchors['c-keypad'] = anchors.keypad;
  anchors['c-keyboard'] = anchors.keypad;

  // —— 后盖细节 ——
  const back = layers.back;
  back.rotation.y = Math.PI;
  backDetails(back, { w, h, design, camY: h * 0.3, z: 0, elder });
  anchors.back = new THREE.Object3D();
  anchors.back.position.set(0, 0, 0.2);
  back.add(anchors.back);

  // —— 内层（拆解可见）——
  const bat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, h * 0.32, Math.max(3, t - 6)), new THREE.MeshStandardMaterial({ color: 0x26282e, roughness: 0.5 }));
  bat.position.set(0, -h * 0.12, 0);
  layers.inner.add(bat);
  anchors.battery = bat;
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, h * 0.22, 0.8), new THREE.MeshStandardMaterial({ color: 0x1e7a46, roughness: 0.55 }));
  pcb.position.set(0, h * 0.18, 0.2);
  layers.inner.add(pcb);
  anchors.chip = pcb;

  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  root.userData.formFactor = ff;
  root.userData.keypadChassis = true;
  root.userData.keypadShape = shapeId;
  root.userData.keyScale = keyScale;
  root.userData.hasSos = elder;
  root.userData.hasAntenna = true;
  root.userData.hasFlashlight = elder;
  void keypadGroup;
  return { root, layers, anchors, anim, ctl, dims: { w, h, t }, screen: liveScreen, screenMaps };
}

/** 是否应由按键机身构建 */
export function isKeypadForm(formFactor) {
  return formFactor === 'feature' || formFactor === 'elder' || formFactor === 'flip' || formFactor === 'slider' || formFactor === 'swivel';
}

/** 开合动画：没被手动拨过时自动循环展示；拨过就停在那里 */
function openDriver(ctl, period, apply) {
  return (now) => {
    if (!ctl.id) {
      const ph = (now / 1000) % period;
      const half = period / 2;
      const k = ph < half ? ph / half : 1 - (ph - half) / half;
      // 停留在两端各一会儿
      ctl.open = Math.max(0, Math.min(1, (k - 0.15) / 0.7));
    }
    apply(ctl.open);
  };
}

// ═════════════════════════ 翻盖 ═════════════════════════

/** 翻盖：圆底下盖（键盘）+ 圆顶上盖（主屏 / 外屏），绕铰链真正开合 */
function buildFlipPhone(design, { liveScreen = null } = {}) {
  const phys = physical(design);
  const shapeId = kpShapeOf(design);
  const slim = shapeId === 'slim';
  const w = slim ? 53 : 48;
  const L = slim ? 52 : 50; // 下盖长
  const U = slim ? 51 : 49; // 上盖长（合上时略短于下盖，不会伸出来）
  const tAll = slim ? 13.9 : Math.max(phys.thickness + 2, 19);
  const tL = tAll * 0.52;
  const tU = tAll - tL;
  const matId = slim ? 2 : design.parts?.material ?? 0;
  const backHex = design.color || '#3a3d46';
  const faceHex = design.twoTone !== 'none' && design.color2 ? design.color2 : backHex;
  const { root, layers, anchors, anim, screenMaps } = shell();
  const ctl = { open: 0.9, id: null, t0: 0, until: 0 };

  // 整机向下偏移，让开盖状态居中
  const rig = new THREE.Group();
  rig.position.y = -(U - L) / 2 - 2;
  layers.frame.add(rig);

  // —— 下盖 ——
  const lower = new THREE.Group();
  rig.add(lower);
  const lowProfile = slim ? PROFILES.slim : PROFILES.clamLower;
  const lowBody = pillowBody(w, L, tL, lowProfile, bodyMaterial(matId, backHex), { bevel: slim ? 0.3 : 0.38 });
  lowBody.position.y = -L / 2;
  lower.add(lowBody);
  const lz = tL / 2 + 0.05;
  const lowFace = new THREE.Group();
  lowFace.position.y = -L / 2;
  lower.add(lowFace);
  if (!slim) faceplate(lowFace, w, L, lowProfile, lz - 0.3, faceHex, { matId, scale: 0.84 });
  const { gridTop, gridBottom } = keypadFace(lowFace, {
    padW: w * (slim ? 0.78 : 0.66),
    top: L / 2 - 6,
    bottom: -L / 2 + (slim ? 6 : 9),
    z: lz,
    etched: slim,
    smile: slim ? 0 : 0.8,
    backHex,
  });
  anchors.keypad = new THREE.Object3D();
  anchors.keypad.position.set(0, -L / 2 + (gridTop + gridBottom) / 2, lz + 1);
  lower.add(anchors.keypad);
  anchors['c-keypad'] = anchors.keypad;
  // 下盖背面：电池盖接缝 + 喇叭
  const lowBack = new THREE.Group();
  lowBack.rotation.y = Math.PI;
  lowBack.position.y = -L / 2;
  lower.add(lowBack);
  backDetails(lowBack, { w, h: L, design: { ...design, parts: { ...design.parts, camera: 0 } }, camY: L * 0.2, z: tL / 2 });

  // —— 铰链筒 ——
  const hingeR = tL * 0.5;
  const barrelMat = slim ? chromeMat() : bodyMaterial(matId, shade(backHex, -0.12).getStyle());
  const barrel = new THREE.Mesh(new THREE.CapsuleGeometry(hingeR, w - hingeR * 2 - 4, 6, 16), barrelMat);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0, 0, tL / 2 - hingeR * 0.6);
  rig.add(barrel);
  if (!slim) {
    for (const sx of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(hingeR * 0.7, hingeR * 0.7, 0.6, 20), chromeMat());
      cap.rotation.z = Math.PI / 2;
      cap.position.set(sx * (w / 2 - 1.6), 0, tL / 2 - hingeR * 0.6);
      rig.add(cap);
    }
  }

  // —— 上盖（绕铰链轴旋转）——
  // 转轴在下盖正面所在平面：上盖局部中心放在 z = -tU/2，
  // 合上（绕 X 转 180°）时正好叠在键盘上方，打开时与下盖大致同一平面
  const pivot = new THREE.Group();
  pivot.position.set(0, 0, tL / 2);
  rig.add(pivot);
  const lid = new THREE.Group();
  pivot.add(lid);
  const lidInner = new THREE.Group();
  lidInner.position.set(0, U / 2 + 0.5, -tU / 2);
  lid.add(lidInner);
  const lidProfile = slim ? PROFILES.slim : PROFILES.clamLid;
  lidInner.add(pillowBody(w, U, tU, lidProfile, bodyMaterial(matId, backHex), { bevel: slim ? 0.3 : 0.38 }));
  const iz = tU / 2 + 0.05;
  // 内侧：主屏 + 听筒
  const inner = new THREE.Group();
  lidInner.add(inner);
  const dispW = w * 0.7;
  const dispH = U * 0.5;
  const map = liveScreen?.texture || standbyTexture(design);
  screenWindow(inner, { cy: -U * 0.04, dw: dispW, dh: dispH, z: iz, map, arch: slim ? 0 : 0.1, screenMaps, anchors });
  if (liveScreen) anim.push((now) => liveScreen.paint(now));
  earpiece(inner, { cy: U / 2 - 6, z: iz + 0.1, w: 12 });
  // 外侧：小外屏 + 摄像头 + 品牌
  const outer = new THREE.Group();
  outer.rotation.y = Math.PI;
  lidInner.add(outer);
  const oz = tU / 2 + 0.05;
  if (!slim) faceplate(outer, w, U, lidProfile, oz - 0.3, faceHex, { matId, chrome: matId === 2, scale: 0.8 });
  const outerTex = canvasTex(64, 48, (g, W, H) => {
    g.fillStyle = '#0d1a2a';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#7ec8ff';
    g.font = 'bold 15px monospace';
    g.textAlign = 'center';
    g.fillText('10:24', W / 2, H / 2 + 2);
    g.font = '8px monospace';
    g.fillStyle = '#9bbc0f';
    g.fillText('▮▮▮▮  ▬', W / 2, H - 6);
  }, { nearest: true });
  const outerLens = new THREE.Mesh(
    slim ? new THREE.ShapeGeometry(roundedRectShape(w * 0.36, U * 0.2, 2), 12) : new THREE.CircleGeometry(U * 0.15, 36),
    new THREE.MeshPhysicalMaterial({ color: 0x07080b, roughness: 0.05, clearcoat: 1 }),
  );
  outerLens.position.set(0, -U * 0.04, oz + 0.35);
  outer.add(outerLens);
  const outerDisp = new THREE.Mesh(slim ? new THREE.PlaneGeometry(w * 0.3, U * 0.15) : new THREE.CircleGeometry(U * 0.12, 36), new THREE.MeshBasicMaterial({ map: outerTex, toneMapped: false }));
  outerDisp.position.set(0, -U * 0.04, oz + 0.42);
  outer.add(outerDisp);
  if ((design.parts?.camera ?? 0) > 0) {
    const cam = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.5, 10, 24), chromeMat());
    cam.position.set(0, U * 0.3, oz + 0.3);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(2.3, 20), new THREE.MeshPhysicalMaterial({ color: 0x101830, roughness: 0.05, clearcoat: 1 }));
    glass.position.set(0, U * 0.3, oz + 0.25);
    outer.add(cam, glass);
  }
  anchors.back = new THREE.Object3D();
  anchors.back.position.set(0, 0, oz);
  outer.add(anchors.back);

  // 开合：open=1 时上盖略向后仰（约 160°），open=0 时合上压在键盘上，屏幕朝下、外屏朝外
  anim.push(
    openDriver(ctl, 6, (open) => {
      pivot.rotation.x = Math.PI - (Math.PI + 0.22) * open;
    }),
  );

  const bat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, L * 0.5, 3), new THREE.MeshStandardMaterial({ color: 0x26282e }));
  bat.position.y = rig.position.y - L / 2;
  layers.inner.add(bat);
  anchors.battery = bat;

  root.userData.formFactor = 'flip';
  root.userData.keypadChassis = true;
  root.userData.keypadArchetype = 'flip';
  root.userData.keypadShape = shapeId;
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { root, layers, anchors, anim, ctl, dims: { w, h: L + U, t: tAll }, screen: liveScreen, screenMaps };
}

// ═════════════════════════ 滑盖 ═════════════════════════

/** 滑盖：上片（屏幕 + 导航）向上滑出，露出下片的数字键 */
function buildSliderPhone(design, { liveScreen = null } = {}) {
  const phys = physical(design);
  const shapeId = kpShapeOf(design);
  const w = 48;
  const h = 100;
  const tAll = Math.max(phys.thickness + 1, 17);
  const tL = tAll * 0.48;
  const tU = tAll - tL;
  const matId = design.parts?.material ?? 0;
  const backHex = design.color || '#3a3d46';
  const faceHex = design.twoTone !== 'none' && design.color2 ? design.color2 : shade(backHex, -0.25).getStyle();
  const profile = PROFILES[shapeId] || PROFILES.candy;
  const { root, layers, anchors, anim, screenMaps } = shell();
  const ctl = { open: 0.8, id: null, t0: 0, until: 0 };

  const lower = new THREE.Group();
  lower.position.z = -tU / 2;
  layers.frame.add(lower);
  lower.add(pillowBody(w, h, tL, profile, bodyMaterial(matId, backHex)));
  // 下片正面：深色键区（只在上片滑开后露出）
  const kz = tL / 2 + 0.05;
  const keys = new THREE.Group();
  lower.add(keys);
  const pad = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(w * 0.8, h * 0.44, 4, 0, -h * 0.24), 12), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.5 }));
  pad.position.z = kz;
  keys.add(pad);
  // 下片只有数字键（导航键在上片）
  const { gridTop, gridBottom } = keypadFace(keys, { padW: w * 0.66, top: -h * 0.02 + 2, bottom: -h / 2 + 8, z: kz, backHex, noNav: true });
  anchors.keypad = new THREE.Object3D();
  anchors.keypad.position.set(0, (gridTop + gridBottom) / 2, kz + 1);
  lower.add(anchors.keypad);
  anchors['c-keypad'] = anchors.keypad;
  const back = new THREE.Group();
  back.rotation.y = Math.PI;
  lower.add(back);
  backDetails(back, { w, h, design, camY: h * 0.3, z: tL / 2 });

  const upper = new THREE.Group();
  // 上片中心在世界 z = tL/2（叠在下片正面上）；front 层自带 +tAll/2 偏移，需扣掉
  upper.position.z = tL / 2 - tAll / 2;
  layers.front.add(upper);
  upper.add(pillowBody(w - 1, h * 0.98, tU, profile, bodyMaterial(matId, backHex)));
  const uz = tU / 2 + 0.05;
  faceplate(upper, w - 1, h * 0.98, profile, uz - 0.3, faceHex, { matId, chrome: true, scale: 0.88 });
  const dispW = w * 0.66;
  const dispH = h * 0.36;
  const map = liveScreen?.texture || standbyTexture(design);
  screenWindow(upper, { cy: h * 0.13, dw: dispW, dh: dispH, z: uz + 0.4, map, arch: 0.1, screenMaps, anchors });
  if (liveScreen) anim.push((now) => liveScreen.paint(now));
  earpiece(upper, { cy: h / 2 - 7, z: uz + 0.5, w: 12 });
  // 上片下半：导航键（不含数字键）
  const navTop = h * 0.13 - dispH / 2 - 4;
  const navGroup = new THREE.Group();
  upper.add(navGroup);
  keypadFace(navGroup, { padW: w * 0.66, top: navTop, bottom: navTop - 14, z: uz + 0.4, backHex }).keypadGroup.visible = false;

  anim.push(
    openDriver(ctl, 5, (open) => {
      const e = 1 - Math.pow(1 - open, 3);
      upper.position.y = e * h * 0.42;
    }),
  );

  // 电路板藏在下片里面（只在拆解时露出）
  const pcb = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, h * 0.3, 1.2), new THREE.MeshStandardMaterial({ color: 0x1e7a46 }));
  pcb.position.z = -tU / 2 - tL * 0.15;
  layers.inner.add(pcb);
  anchors.chip = pcb;
  root.userData.formFactor = 'slider';
  root.userData.keypadChassis = true;
  root.userData.keypadArchetype = 'slider';
  root.userData.keypadShape = shapeId;
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { root, layers, anchors, anim, ctl, dims: { w, h: h * 1.25, t: tAll }, screen: liveScreen, screenMaps };
}

// ═════════════════════════ 旋转屏 ═════════════════════════

/** 旋转屏：屏幕片绕底部一角的转轴旋开，露出下面的键盘 */
function buildSwivelPhone(design, { liveScreen = null } = {}) {
  const phys = physical(design);
  const shapeId = kpShapeOf(design);
  const w = 48;
  const h = 96;
  const tAll = Math.max(phys.thickness + 1, 17);
  const tL = tAll * 0.5;
  const tU = tAll - tL;
  const matId = design.parts?.material ?? 0;
  const backHex = design.color || '#3a3d46';
  const faceHex = design.twoTone !== 'none' && design.color2 ? design.color2 : backHex;
  const profile = PROFILES[shapeId] || PROFILES.candy;
  const { root, layers, anchors, anim, screenMaps } = shell();
  const ctl = { open: 0.7, id: null, t0: 0, until: 0 };

  const lower = new THREE.Group();
  lower.position.z = -tU / 2;
  layers.frame.add(lower);
  lower.add(pillowBody(w, h, tL, profile, bodyMaterial(matId, shade(backHex, -0.15).getStyle())));
  const kz = tL / 2 + 0.05;
  const { gridTop, gridBottom } = keypadFace(lower, { padW: w * 0.66, top: h / 2 - 8, bottom: -h / 2 + 10, z: kz, backHex });
  anchors.keypad = new THREE.Object3D();
  anchors.keypad.position.set(0, (gridTop + gridBottom) / 2, kz + 1);
  lower.add(anchors.keypad);
  anchors['c-keypad'] = anchors.keypad;
  const back = new THREE.Group();
  back.rotation.y = Math.PI;
  lower.add(back);
  backDetails(back, { w, h, design, camY: h * 0.3, z: tL / 2 });

  // 转轴在左上角：屏幕片逆时针转 90° 甩向右上方，露出整片键盘
  const px = -w / 2 + 7;
  const py = h / 2 - 7;
  const pivot = new THREE.Group();
  pivot.position.set(px, py, tL / 2 - tAll / 2);
  layers.front.add(pivot);
  const swivel = new THREE.Group();
  swivel.position.set(-px, -py, 0);
  pivot.add(swivel);
  swivel.add(pillowBody(w, h, tU, profile, bodyMaterial(matId, backHex)));
  const sz = tU / 2 + 0.05;
  faceplate(swivel, w, h, profile, sz - 0.3, faceHex, { matId, chrome: true, scale: 0.88 });
  const map = liveScreen?.texture || standbyTexture(design);
  screenWindow(swivel, { cy: h * 0.06, dw: w * 0.7, dh: h * 0.46, z: sz + 0.4, map, arch: 0.1, screenMaps, anchors });
  if (liveScreen) anim.push((now) => liveScreen.paint(now));
  earpiece(swivel, { cy: h / 2 - 7, z: sz + 0.5, w: 12 });
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.8, 28), chromeMat());
  knob.rotation.x = Math.PI / 2;
  knob.position.set(px, py, tL / 2 + tU / 2 + 0.25 - tAll / 2);
  layers.front.add(knob);

  anim.push(
    openDriver(ctl, 8, (open) => {
      pivot.rotation.z = open * Math.PI * 0.5;
    }),
  );

  root.userData.formFactor = 'swivel';
  root.userData.keypadChassis = true;
  root.userData.keypadArchetype = 'swivel';
  root.userData.keypadShape = shapeId;
  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { root, layers, anchors, anim, ctl, dims: { w, h, t: tAll }, screen: liveScreen, screenMaps };
}
