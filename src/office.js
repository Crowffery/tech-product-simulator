/** 像素办公室场景：工位 + 小人走动/工作动画 */

const W = 320;
const H = 180;

const PAL = {
  floorA: '#c4b59a',
  floorB: '#b8a88a',
  wall: '#6b8cae',
  wallDark: '#4a6d8c',
  desk: '#8b5a2b',
  deskTop: '#c68642',
  monitor: '#2d3436',
  screen: '#74b9ff',
  carpet: '#5d6d7e',
  plant: '#27ae60',
  pot: '#a0522d',
};

const ROLE_COLORS = {
  id: { hair: '#f1c40f', shirt: '#e17055' },
  pm: { hair: '#2d3436', shirt: '#0984e3' },
  cam: { hair: '#6c5ce7', shirt: '#fd79a8' },
  osdev: { hair: '#00b894', shirt: '#55efc4' },
  supply: { hair: '#636e72', shirt: '#fdcb6e' },
  pr: { hair: '#d63031', shirt: '#ffffff' },
};

let canvas;
let ctx;
let actors = [];
let tick = 0;
let raf = 0;
let lastStaffKey = '';

function deskPositions() {
  return [
    { x: 36, y: 88 },
    { x: 100, y: 88 },
    { x: 164, y: 88 },
    { x: 228, y: 88 },
    { x: 68, y: 128 },
    { x: 148, y: 128 },
  ];
}

export function mountOffice(el) {
  if (!el) return;
  canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  canvas.className = 'office-canvas';
  canvas.setAttribute('aria-label', '公司办公室像素场景');
  el.innerHTML = '';
  el.appendChild(canvas);
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  if (!raf) loop();
}

export function syncOffice(state) {
  if (!state) {
    actors = [];
    lastStaffKey = '';
    return;
  }
  const key = state.staff.map((s) => `${s.roleId}:${s.assigned}`).join('|') + `|${state.phase}|${state.month}`;
  if (key === lastStaffKey && actors.length) return;
  lastStaffKey = key;
  const desks = deskPositions();
  actors = state.staff.map((s, i) => {
    const desk = desks[i % desks.length];
    const colors = ROLE_COLORS[s.roleId] || { hair: '#333', shirt: '#888' };
    return {
      roleId: s.roleId,
      assigned: s.assigned,
      desk,
      x: desk.x + (Math.random() * 10 - 5),
      y: desk.y + 6,
      tx: desk.x,
      ty: desk.y + 6,
      frame: Math.floor(Math.random() * 4),
      colors,
      mood: state.phase === 'bust' ? 'sad' : state.phase === 'launch' || state.phase === 'score' ? 'cheer' : 'work',
    };
  });
  // boss ghost if empty
  if (!actors.length) {
    actors.push({
      roleId: 'founder',
      assigned: 'idle',
      desk: desks[0],
      x: 160,
      y: 100,
      tx: 160,
      ty: 100,
      frame: 0,
      colors: { hair: '#2c3e50', shirt: '#e67e22' },
      mood: 'idle',
    });
  }
}

function loop() {
  tick += 1;
  draw();
  // wander / work
  for (const a of actors) {
    a.frame += 0.08;
    if (a.mood === 'work' && a.assigned !== 'idle' && a.assigned !== 'launch') {
      // sit at desk with bob
      a.tx = a.desk.x;
      a.ty = a.desk.y + 4;
    } else if (a.mood === 'cheer') {
      a.ty = a.desk.y + 2 + Math.sin(tick / 6 + a.x) * 3;
      a.tx = a.desk.x;
    } else {
      // wander occasionally
      if (tick % 90 === Math.floor(a.x) % 90) {
        a.tx = 40 + Math.random() * 240;
        a.ty = 70 + Math.random() * 80;
      }
    }
    a.x += (a.tx - a.x) * 0.06;
    a.y += (a.ty - a.y) * 0.06;
  }
  raf = requestAnimationFrame(loop);
}

function draw() {
  if (!ctx) return;
  const g = ctx;
  // wall
  g.fillStyle = PAL.wall;
  g.fillRect(0, 0, W, 56);
  g.fillStyle = PAL.wallDark;
  g.fillRect(0, 50, W, 8);
  // windows
  for (let i = 0; i < 4; i++) {
    const wx = 24 + i * 72;
    g.fillStyle = '#dfefff';
    g.fillRect(wx, 10, 40, 28);
    g.fillStyle = '#a0c4e8';
    g.fillRect(wx + 2, 12, 16, 24);
    g.fillRect(wx + 22, 12, 16, 24);
  }
  // company plaque
  g.fillStyle = '#f5e6c8';
  g.fillRect(118, 8, 84, 14);
  g.fillStyle = '#5d4037';
  g.fillRect(118, 8, 84, 2);
  g.fillRect(118, 20, 84, 2);
  g.fillStyle = '#3e2723';
  g.font = 'bold 8px monospace';
  g.fillText('DEV OFFICE', 130, 18);

  // floor tiles
  for (let y = 58; y < H; y += 16) {
    for (let x = 0; x < W; x += 16) {
      g.fillStyle = ((x + y) / 16) % 2 === 0 ? PAL.floorA : PAL.floorB;
      g.fillRect(x, y, 16, 16);
    }
  }
  // carpet
  g.fillStyle = PAL.carpet;
  g.fillRect(40, 78, 240, 86);
  g.fillStyle = '#717d8a';
  g.fillRect(40, 78, 240, 3);

  // desks + monitors
  for (const d of deskPositions()) {
    drawDesk(g, d.x, d.y);
  }
  // plant
  drawPlant(g, 12, 140);
  drawPlant(g, 300, 140);
  // whiteboard
  g.fillStyle = '#eceff1';
  g.fillRect(250, 58, 60, 28);
  g.strokeStyle = '#546e7a';
  g.strokeRect(250.5, 58.5, 59, 27);
  g.fillStyle = '#e74c3c';
  g.fillRect(256, 66, 20, 2);
  g.fillStyle = '#3498db';
  g.fillRect(256, 72, 30, 2);
  g.fillStyle = '#2ecc71';
  g.fillRect(256, 78, 14, 2);

  // actors
  for (const a of actors) {
    drawPerson(g, Math.round(a.x), Math.round(a.y), a);
  }
}

function drawDesk(g, x, y) {
  g.fillStyle = PAL.desk;
  g.fillRect(x - 14, y, 36, 12);
  g.fillStyle = PAL.deskTop;
  g.fillRect(x - 14, y, 36, 4);
  // legs
  g.fillStyle = '#5d4037';
  g.fillRect(x - 12, y + 12, 3, 8);
  g.fillRect(x + 17, y + 12, 3, 8);
  // monitor
  g.fillStyle = PAL.monitor;
  g.fillRect(x - 4, y - 14, 18, 14);
  g.fillStyle = PAL.screen;
  g.fillRect(x - 2, y - 12, 14, 10);
  // screen blink
  if (Math.floor(tick / 20) % 5 !== 0) {
    g.fillStyle = '#a29bfe';
    g.fillRect(x, y - 10, 6, 2);
    g.fillRect(x + 2, y - 7, 8, 2);
  }
  // keyboard
  g.fillStyle = '#b2bec3';
  g.fillRect(x - 6, y + 5, 16, 4);
}

function drawPlant(g, x, y) {
  g.fillStyle = PAL.pot;
  g.fillRect(x - 4, y, 10, 8);
  g.fillStyle = PAL.plant;
  g.fillRect(x - 2, y - 10, 6, 10);
  g.fillRect(x - 6, y - 6, 4, 4);
  g.fillRect(x + 4, y - 8, 4, 5);
}

function drawPerson(g, x, y, a) {
  const bob = a.mood === 'work' ? Math.sin(a.frame) * 1 : 0;
  const walk = Math.abs(a.tx - a.x) > 1 || Math.abs(a.ty - a.y) > 1;
  const leg = walk ? Math.sin(a.frame * 2) * 2 : 0;
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.18)';
  g.fillRect(x - 5, y + 12, 12, 3);
  // legs
  g.fillStyle = '#2d3436';
  g.fillRect(x - 3, y + 8, 3, 5 + leg);
  g.fillRect(x + 2, y + 8, 3, 5 - leg);
  // body
  g.fillStyle = a.colors.shirt;
  g.fillRect(x - 5, y - 2 + bob, 12, 11);
  // head
  g.fillStyle = '#f5cba7';
  g.fillRect(x - 4, y - 12 + bob, 10, 10);
  // hair
  g.fillStyle = a.colors.hair;
  g.fillRect(x - 4, y - 14 + bob, 10, 4);
  g.fillRect(x - 5, y - 12 + bob, 2, 5);
  // eyes
  g.fillStyle = '#2d3436';
  if (a.mood === 'sad') {
    g.fillRect(x - 2, y - 8 + bob, 2, 1);
    g.fillRect(x + 3, y - 8 + bob, 2, 1);
  } else {
    g.fillRect(x - 2, y - 9 + bob, 2, 2);
    g.fillRect(x + 3, y - 9 + bob, 2, 2);
  }
  // arms typing
  g.fillStyle = '#f5cba7';
  if (a.mood === 'work' && !walk) {
    g.fillRect(x - 7, y + 2 + bob + Math.sin(a.frame * 3), 3, 3);
    g.fillRect(x + 6, y + 2 + bob + Math.cos(a.frame * 3), 3, 3);
  } else if (a.mood === 'cheer') {
    g.fillRect(x - 8, y - 6 + bob, 3, 6);
    g.fillRect(x + 7, y - 6 + bob, 3, 6);
  } else {
    g.fillRect(x - 7, y + 1 + bob, 3, 5);
    g.fillRect(x + 6, y + 1 + bob, 3, 5);
  }
}

export function destroyOffice() {
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
}
