/**
 * 按键机 3D 机身（功能机 / 老年机）
 * 由 buildPhone 在 formFactor === feature|elder 时分派。
 * 返回结构与 buildPhone 一致，PhoneStage 无需感知差异。
 * 完整按键时代内容包（parts/keynote/market）属 v0.12+，此处仅机身视觉切片。
 */
import * as THREE from 'three';
import { physical, tier } from './parts.js';

const FX = 1;

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
      return new THREE.MeshPhysicalMaterial({ color, roughness: 0.18, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.12, envMapIntensity: 0.9 });
    case 2:
      return new THREE.MeshStandardMaterial({ color: color.clone().offsetHSL(0, -0.05, 0.08), roughness: 0.35, metalness: 0.75, envMapIntensity: 1.1 });
    default:
      // 塑料砖头感：更高粗糙度
      return new THREE.MeshStandardMaterial({ color, roughness: 0.62, envMapIntensity: 0.55 });
  }
}

function frameMaterial(matId, hex) {
  if (matId === 0) return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.55, envMapIntensity: 0.7 });
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(hex).offsetHSL(0, -0.1, 0.08), roughness: 0.3, metalness: 0.85, envMapIntensity: 1.2 });
}

/** 待机小彩屏：大时钟 + 运营商，像素感 */
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
      // 状态栏
      g.fillStyle = '#9bbc0f';
      g.font = `bold ${elder ? 8 : 7}px monospace`;
      g.textAlign = 'left';
      g.fillText('华夏通信', 4, 10);
      g.textAlign = 'right';
      g.fillText('||||  █', w - 4, 10);
      // 大时间
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

function keyLabelTex(labels) {
  // 一张竖条图集：每行一个键面文字
  const n = labels.length;
  const cw = 32;
  const ch = 24;
  return canvasTex(
    cw,
    ch * n,
    (g) => {
      for (let i = 0; i < n; i++) {
        const y = i * ch;
        g.fillStyle = 'rgba(0,0,0,0)';
        g.clearRect(0, y, cw, ch);
        g.fillStyle = '#e8eaef';
        g.font = 'bold 11px monospace';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        const line = labels[i];
        const parts = String(line).split('\n');
        if (parts.length === 1) {
          g.fillText(parts[0], cw / 2, y + ch / 2);
        } else {
          g.font = 'bold 10px monospace';
          g.fillText(parts[0], cw / 2, y + ch / 2 - 4);
          g.fillStyle = '#9aa0ab';
          g.font = '7px monospace';
          g.fillText(parts[1], cw / 2, y + ch / 2 + 6);
        }
      }
    },
    { nearest: true },
  );
}

/**
 * @param {object} design
 * @param {{ hdScreen?: boolean, liveScreen?: object|null }} opts
 */
export function buildKeypadPhone(design, { hdScreen = false, liveScreen = null } = {}) {
  const phys = physical(design);
  const ff = design.formFactor || phys.formFactor || 'feature';
  const elder = ff === 'elder';
  // 按键砖头尺寸：明显异于现代直板（72×152）
  const w = elder ? 56 : 48;
  const h = elder ? 118 : 108;
  const t = Math.max(phys.thickness, elder ? 17 : 14.5);
  const matId = design.parts?.material ?? 0;
  const camTier = design.parts?.camera ?? 0;
  const backHex = design.color || '#3a3d46';
  const frameHex = design.twoTone === 'frame' ? design.color2 || backHex : backHex;
  const cornerR = elder ? 5.5 : 4.2;

  const root = new THREE.Group();
  const layers = { front: new THREE.Group(), frame: new THREE.Group(), inner: new THREE.Group(), back: new THREE.Group() };
  const ctl = { id: null, t0: 0, until: 0 };
  Object.values(layers).forEach((g) => root.add(g));
  const anchors = {};
  const anim = [];
  const screenMaps = [];

  const capW = w - 1.2;
  const capH = h - 1.2;
  const capR = cornerR;

  // —— 厚塑料中框 ——
  const inset = 2.2;
  const holeW = w - 2 * inset;
  const holeH = h - 2 * inset;
  const outer = roundedRectShape(capW, capH, capR);
  const hole = roundedRectShape(holeW, holeH, Math.max(1, cornerR - inset));
  outer.holes.push(new THREE.Path(hole.getPoints(12).reverse()));
  const depth = t - 2.4;
  const frameGeo = new THREE.ExtrudeGeometry(outer, {
    depth,
    bevelEnabled: true,
    bevelThickness: 1.1,
    bevelSize: 1.0,
    bevelSegments: 3,
    curveSegments: 16,
  });
  frameGeo.translate(0, 0, -depth / 2);
  layers.frame.add(new THREE.Mesh(frameGeo, frameMaterial(matId, frameHex)));
  const mid = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRectShape(holeW - 0.4, holeH - 0.4, Math.max(0.8, cornerR - inset)), 12),
    new THREE.MeshStandardMaterial({ color: 0x6a6e78, roughness: 0.55, metalness: 0.4, side: THREE.DoubleSide }),
  );
  mid.position.z = t / 2 - 1.2;
  layers.frame.add(mid);

  // 侧键（音量）
  const keySide = frameMaterial(matId, shade(frameHex, -0.08).getStyle());
  const vol = new THREE.Mesh(new THREE.BoxGeometry(1.4, elder ? 18 : 14, Math.min(3.2, t * 0.35)), keySide);
  vol.position.set(w / 2 + 0.4, h * 0.18, 0);
  layers.frame.add(vol);

  // 充电口 + 喇叭孔
  const dark = new THREE.MeshBasicMaterial({ color: 0x07070a });
  const port = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.2, 12), dark);
  port.rotation.x = Math.PI / 2;
  port.position.set(0, -h / 2 + 0.3, 0);
  layers.frame.add(port);
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.9, 0.9), dark);
    g.position.set(-10 + i * 2.6, -h / 2 + 0.25, 0);
    layers.frame.add(g);
  }

  // 天线短桩（功能机必有；老年机可选小 stub）
  {
    const antMat = new THREE.MeshStandardMaterial({ color: 0x2a2d34, metalness: 0.55, roughness: 0.4 });
    const stubLen = elder ? 10 : 16;
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.35, stubLen, 10), antMat);
    stub.position.set(w / 2 - 5, h / 2 + stubLen * 0.35, -t * 0.08);
    stub.rotation.z = elder ? 0.15 : 0.28;
    const tip = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 10, 8),
      new THREE.MeshStandardMaterial({ color: elder ? 0xc0392b : 0xe67e22, roughness: 0.4 }),
    );
    tip.position.copy(stub.position);
    tip.position.y += stubLen * 0.48;
    tip.position.x += elder ? 0.6 : 1.4;
    layers.frame.add(stub, tip);
    anchors.antenna = stub;
  }

  // 老年机：顶部手电筒 LED
  if (elder) {
    const ledMat = new THREE.MeshStandardMaterial({ color: 0xfff6d0, emissive: 0xfff1b8, emissiveIntensity: 0.85, roughness: 0.35 });
    const led = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 1.4, 16), ledMat);
    led.rotation.x = Math.PI / 2;
    led.position.set(-w / 2 + 8, h / 2 + 0.2, 0);
    layers.frame.add(led);
    anchors.flashlight = led;
    anim.push((now) => {
      ledMat.emissiveIntensity = 0.55 + 0.35 * Math.sin(now * 0.004);
    });
    // 挂绳孔
    const holeRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.45, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x4a4e57, metalness: 0.6, roughness: 0.4 }),
    );
    holeRing.rotation.y = Math.PI / 2;
    holeRing.position.set(w / 2 - 3, -h / 2 + 4, 0);
    layers.frame.add(holeRing);
    anchors.lanyard = holeRing;
  }

  // —— 前脸：小屏 + 键盘 ——
  const front = layers.front;
  const fa = new THREE.Group();
  front.add(fa);

  const faceGeo = new THREE.ExtrudeGeometry(roundedRectShape(capW + 0.05, capH + 0.05, capR + 0.05), {
    depth: 0.45,
    bevelEnabled: true,
    bevelThickness: 0.18,
    bevelSize: 0.18,
    bevelSegments: 2,
    curveSegments: 16,
  });
  faceGeo.translate(0, 0, -0.5);
  fa.add(new THREE.Mesh(faceGeo, new THREE.MeshPhysicalMaterial({ color: 0x0c0d12, roughness: 0.12, clearcoat: 0.8, envMapIntensity: 0.9 })));

  // 屏幕：上部约 38% 高度
  const screenFrac = elder ? 0.32 : 0.36;
  const dispW = capW * 0.78;
  const dispH = capH * screenFrac;
  const screenY = capH / 2 - dispH / 2 - (elder ? 10 : 9);
  const bezMat = new THREE.MeshBasicMaterial({ color: 0x050507 });
  const bezel = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRectShape(dispW + 3.2, dispH + 3.2, 2.2), 12),
    bezMat,
  );
  bezel.position.set(0, screenY, 0.12);
  fa.add(bezel);

  const primaryMap = liveScreen?.texture || standbyTexture(design, { elder });
  const screenMat = new THREE.MeshBasicMaterial({ map: primaryMap, toneMapped: false });
  screenMaps.push(screenMat);
  const display = new THREE.Mesh(new THREE.PlaneGeometry(dispW, dispH), screenMat);
  display.position.set(0, screenY, 0.18);
  fa.add(display);
  if (liveScreen) anim.push((now) => liveScreen.paint(now));

  anchors.screen = new THREE.Object3D();
  anchors.screen.position.set(0, screenY, 0.2);
  fa.add(anchors.screen);

  // 听筒格栅（屏幕上方）
  {
    const grilleY = screenY + dispH / 2 + 3.2;
    const slot = new THREE.Mesh(
      new THREE.ShapeGeometry(roundedRectShape(elder ? 16 : 14, 2.2, 1.0), 8),
      new THREE.MeshBasicMaterial({ color: 0x1a1b20 }),
    );
    slot.position.set(0, grilleY, 0.2);
    fa.add(slot);
    for (let i = 0; i < 7; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.5, 0.2), dark);
      bar.position.set(-5 + i * 1.65, grilleY, 0.28);
      fa.add(bar);
    }
  }

  // —— 数字键盘 ——
  // feature: 标准 T9 3×4（1-9 *0#）+ 上方功能行
  // elder: 更大键帽、更少视觉密度，红色 SOS
  const padTop = screenY - dispH / 2 - (elder ? 5 : 4);
  const padBottom = -capH / 2 + (elder ? 7 : 6);
  const padH = padTop - padBottom;
  const padW = capW * (elder ? 0.88 : 0.86);

  const softY = padTop - (elder ? 5.5 : 4.5);
  // 软键 / 导航
  {
    const softMat = new THREE.MeshStandardMaterial({ color: 0x2b2e36, roughness: 0.45 });
    const green = new THREE.MeshStandardMaterial({ color: 0x27ae60, roughness: 0.4, emissive: 0x145a32, emissiveIntensity: 0.25 });
    const red = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.4, emissive: 0x5a1510, emissiveIntensity: 0.2 });
    const navR = elder ? 5.2 : 3.6;
    const softW = elder ? 11 : 8;
    const softH = elder ? 5.5 : 4.2;
    const leftSoft = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedRectShape(softW, softH, 1.2), { depth: 0.7, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 1 }),
      softMat,
    );
    leftSoft.position.set(-padW * 0.32, softY, 0.15);
    const rightSoft = leftSoft.clone();
    rightSoft.position.x = padW * 0.32;
    const call = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedRectShape(softW * 0.9, softH, 1.1), { depth: 0.7, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 1 }),
      green,
    );
    call.position.set(-padW * 0.32, softY - softH - 2.2, 0.15);
    const end = call.clone();
    end.material = red;
    end.position.x = padW * 0.32;
    const nav = new THREE.Mesh(new THREE.CylinderGeometry(navR, navR * 1.05, 1.1, 24), softMat);
    nav.rotation.x = Math.PI / 2;
    nav.position.set(0, softY - softH * 0.35, 0.55);
    const navDot = new THREE.Mesh(new THREE.CylinderGeometry(navR * 0.42, navR * 0.42, 0.5, 16), new THREE.MeshStandardMaterial({ color: 0x4a5560, roughness: 0.4 }));
    navDot.rotation.x = Math.PI / 2;
    navDot.position.set(0, softY - softH * 0.35, 1.05);
    fa.add(leftSoft, rightSoft, call, end, nav, navDot);
  }

  const labels = ['1', '2\nabc', '3\ndef', '4\nghi', '5\njkl', '6\nmno', '7\npqrs', '8\ntuv', '9\nwxyz', '*', '0\n+', '#'];
  const atlas = keyLabelTex(labels);

  const keyMat = new THREE.MeshStandardMaterial({ color: elder ? 0x343840 : 0x2a2c33, roughness: 0.48, emissive: shade(backHex, -0.35), emissiveIntensity: 0.08 });
  const keyTopMat = new THREE.MeshStandardMaterial({ color: elder ? 0x454a55 : 0x3a3c45, roughness: 0.4 });

  let cols = 3;
  let rows = 4;
  const keyScale = elder ? 1.55 : 1.0;
  const gapX = elder ? 2.8 : 1.6;
  const gapY = elder ? 2.6 : 1.5;
  const gridTop = softY - (elder ? 16 : 13);
  const gridBottom = padBottom + (elder ? 2 : 1.5);
  const gridH = gridTop - gridBottom;
  const gridW = padW;

  const kw = ((gridW - gapX * (cols - 1)) / cols) * (elder ? 0.98 : 1);
  const kh = ((gridH - gapY * (rows - 1)) / rows) * (elder ? 0.98 : 1);
  const keyDepth = elder ? 1.35 : 0.95;

  const keypadGroup = new THREE.Group();
  fa.add(keypadGroup);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const kx = -gridW / 2 + kw / 2 + c * (kw + gapX);
      const ky = gridTop - kh / 2 - r * (kh + gapY);
      const shape = roundedRectShape(kw - 0.6, kh - 0.6, elder ? 2.4 : 1.4);
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: keyDepth,
        bevelEnabled: true,
        bevelThickness: elder ? 0.35 : 0.22,
        bevelSize: elder ? 0.35 : 0.2,
        bevelSegments: 2,
        curveSegments: 8,
      });
      const mesh = new THREE.Mesh(geo, [keyMat, keyMat, keyMat, keyMat, keyTopMat, keyMat]);
      mesh.position.set(kx, ky, 0.2);
      keypadGroup.add(mesh);

      // 键面文字
      const label = new THREE.Mesh(
        new THREE.PlaneGeometry(kw * 0.7, kh * 0.55),
        new THREE.MeshBasicMaterial({
          map: atlas,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      // UV 切片：每键取图集一行
      const uvs = label.geometry.attributes.uv;
      const v0 = 1 - (idx + 1) / labels.length;
      const v1 = 1 - idx / labels.length;
      for (let i = 0; i < uvs.count; i++) {
        const u = uvs.getX(i);
        const v = uvs.getY(i);
        uvs.setXY(i, u, v0 + v * (v1 - v0));
      }
      label.position.set(kx, ky, 0.2 + keyDepth + 0.05);
      keypadGroup.add(label);
    }
  }

  // 老年机：左侧红色超大 SOS 键（明显异于功能机）
  if (elder) {
    const sosMat = new THREE.MeshStandardMaterial({
      color: 0xe74c3c,
      roughness: 0.35,
      emissive: 0xc0392b,
      emissiveIntensity: 0.35,
      metalness: 0.15,
    });
    const sosW = 7.5;
    const sosH = gridH * 0.72;
    const sos = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedRectShape(sosW, sosH, 2.2), {
        depth: 1.5,
        bevelEnabled: true,
        bevelThickness: 0.35,
        bevelSize: 0.3,
        bevelSegments: 2,
      }),
      sosMat,
    );
    sos.position.set(-padW / 2 - sosW * 0.55 - 0.5, (gridTop + gridBottom) / 2, 0.25);
    keypadGroup.add(sos);
    const sosLabel = new THREE.Mesh(
      new THREE.PlaneGeometry(sosW * 0.7, 6),
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        map: canvasTex(48, 24, (g) => {
          g.fillStyle = '#fff';
          g.font = 'bold 14px monospace';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('SOS', 24, 12);
        }, { nearest: true }),
      }),
    );
    sosLabel.position.set(sos.position.x, sos.position.y, 0.25 + 1.55);
    keypadGroup.add(sosLabel);
    anchors.sos = sos;
    anim.push((now) => {
      sosMat.emissiveIntensity = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(now * 0.005));
    });
  }

  anchors.keypad = new THREE.Object3D();
  anchors.keypad.position.set(0, (gridTop + gridBottom) / 2, 0.8);
  fa.add(anchors.keypad);
  // spotlight 用 c-keypad / c-keyboard
  anchors['c-keypad'] = anchors.keypad;
  anchors['c-keyboard'] = anchors.keypad;

  // —— 后盖 ——
  const back = layers.back;
  back.rotation.y = Math.PI;
  const plateGeo = new THREE.ExtrudeGeometry(roundedRectShape(capW, capH, capR), {
    depth: 0.55,
    bevelEnabled: true,
    bevelThickness: 0.15,
    bevelSize: 0.15,
    bevelSegments: 1,
    curveSegments: 16,
  });
  plateGeo.translate(0, 0, -0.6);
  back.add(new THREE.Mesh(plateGeo, bodyMaterial(matId, backHex)));

  // 电池盖接缝
  {
    const seam = roundedRectShape(capW - 6, capH * 0.72, 3, 0, -capH * 0.04).getPoints(20);
    seam.push(seam[0]);
    const sl = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(seam),
      new THREE.LineBasicMaterial({ color: shade(backHex, -0.3) }),
    );
    sl.position.z = 0.12;
    sl.layers.set(FX);
    back.add(sl);
  }

  // 单颗小摄像头（非多摄模组）；camera tier 0 可省略
  if (camTier > 0) {
    const cx = 0;
    const cy = h * 0.32;
    const r = elder ? 2.4 : 2.8;
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(r + 0.6, r + 0.7, 1.0, 20),
      new THREE.MeshStandardMaterial({ color: 0x8a8e96, metalness: 0.85, roughness: 0.25 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cx, cy, 0.55);
    const barrel = new THREE.Mesh(new THREE.CircleGeometry(r, 20), new THREE.MeshBasicMaterial({ color: 0x0a0b10 }));
    barrel.position.set(cx, cy, 1.05);
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.7, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({ color: 0x101830, roughness: 0.05, clearcoat: 1, iridescence: 0.6 }),
    );
    glass.rotation.x = Math.PI / 2;
    glass.scale.set(1, 0.35, 1);
    glass.position.set(cx, cy, 1.08);
    back.add(ring, barrel, glass);
  }

  // Logo 贴花
  {
    const logo = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.5, 8),
      new THREE.MeshBasicMaterial({
        transparent: true,
        depthWrite: false,
        map: canvasTex(96, 24, (g) => {
          g.fillStyle = shade(backHex, 0.35).getStyle();
          g.font = 'bold 12px sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          const name = (design.company || design.modelName || '华兴').slice(0, 6);
          g.fillText(name, 48, 12);
        }),
      }),
    );
    logo.position.set(0, -h * 0.12, 0.14);
    back.add(logo);
  }

  anchors.back = new THREE.Object3D();
  anchors.back.position.set(0, 0, 0.2);
  back.add(anchors.back);

  // —— 内层（拆解可见）——
  const inner = layers.inner;
  const bat = new THREE.Mesh(
    new THREE.BoxGeometry(holeW * 0.82, holeH * 0.42, Math.max(3, t - 4)),
    new THREE.MeshStandardMaterial({ color: 0x26282e, roughness: 0.5 }),
  );
  bat.position.set(0, -h * 0.12, 0);
  inner.add(bat);
  anchors.battery = bat;
  const pcb = new THREE.Mesh(
    new THREE.BoxGeometry(holeW * 0.78, holeH * 0.28, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x1e7a46, roughness: 0.55 }),
  );
  pcb.position.set(0, h * 0.18, 0.2);
  inner.add(pcb);
  anchors.chip = pcb;

  root.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });

  // 标记：供测试与调试识别形态路径
  root.userData.formFactor = ff;
  root.userData.keypadChassis = true;
  root.userData.keyScale = keyScale;
  root.userData.hasSos = elder;
  root.userData.hasAntenna = true;
  root.userData.hasFlashlight = elder;

  return {
    root,
    layers,
    anchors,
    anim,
    ctl,
    dims: { w, h, t },
    screen: liveScreen,
    screenMaps,
  };
}

/** 是否应由按键机身构建（仅 feature / elder；flip 等属 v0.12+） */
export function isKeypadForm(formFactor) {
  return formFactor === 'feature' || formFactor === 'elder';
}
