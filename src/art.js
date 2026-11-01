/** 像素产品 / 部件 / 供应商 / 职员小图 */

const SLOT_META = {
  perf: { label: '芯片', color: '#3498db' },
  design: { label: '外观屏', color: '#9b59b6' },
  camera: { label: '影像', color: '#e67e22' },
  battery: { label: '续航', color: '#27ae60' },
  os: { label: '系统', color: '#e74c3c' },
};

export function slotMeta(id) {
  return SLOT_META[id] || { label: id, color: '#888' };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  return { c, g };
}

/** 职员头像 */
export function faceDataUrl(roleId) {
  const { c, g } = canvas(48, 48);
  const colors = {
    id: ['#f1c40f', '#e17055'],
    pm: ['#2d3436', '#0984e3'],
    cam: ['#6c5ce7', '#fd79a8'],
    osdev: ['#00b894', '#55efc4'],
    supply: ['#636e72', '#fdcb6e'],
    pr: ['#d63031', '#ffffff'],
  }[roleId] || ['#333', '#888'];
  g.fillStyle = '#3d2914';
  g.fillRect(0, 0, 48, 48);
  g.fillStyle = '#f5cba7';
  g.fillRect(10, 14, 28, 26);
  g.fillStyle = colors[0];
  g.fillRect(8, 8, 32, 12);
  g.fillRect(8, 14, 8, 12);
  g.fillStyle = colors[1];
  g.fillRect(10, 36, 28, 10);
  g.fillStyle = '#2d3436';
  g.fillRect(16, 22, 5, 5);
  g.fillRect(28, 22, 5, 5);
  g.fillRect(18, 30, 12, 2);
  return c.toDataURL();
}

/** 部件图标 40x40 */
export function partIconDataUrl(slotId, progress = 0) {
  const { c, g } = canvas(40, 40);
  const p = Math.max(0, Math.min(100, progress)) / 100;
  g.fillStyle = '#2c2416';
  g.fillRect(0, 0, 40, 40);
  g.fillStyle = '#4a3b28';
  g.fillRect(2, 2, 36, 36);

  if (slotId === 'perf') {
    // chip
    g.fillStyle = '#1a5276';
    g.fillRect(10, 10, 20, 20);
    g.fillStyle = `rgb(${40 + p * 80},${140 + p * 80},${220})`;
    g.fillRect(12, 12, 16, 16);
    g.fillStyle = '#f1c40f';
    for (let i = 0; i < 4; i++) {
      g.fillRect(6, 12 + i * 5, 4, 2);
      g.fillRect(30, 12 + i * 5, 4, 2);
      g.fillRect(12 + i * 5, 6, 2, 4);
      g.fillRect(12 + i * 5, 30, 2, 4);
    }
  } else if (slotId === 'design') {
    g.fillStyle = '#1c2833';
    g.fillRect(12, 4, 16, 32);
    g.fillStyle = `rgb(${80 + p * 100},${180},${220})`;
    g.fillRect(14, 8, 12, 22);
    g.fillStyle = '#ecf0f1';
    g.fillRect(18, 32, 4, 2);
  } else if (slotId === 'camera') {
    g.fillStyle = '#17202a';
    g.fillRect(8, 10, 24, 20);
    g.fillStyle = '#5d6d7e';
    g.beginPath();
    g.arc(20, 20, 7 + p * 2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#85c1e9';
    g.beginPath();
    g.arc(20, 20, 3 + p * 2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.fillRect(22, 14, 2, 2);
  } else if (slotId === 'battery') {
    g.fillStyle = '#566573';
    g.fillRect(8, 12, 22, 16);
    g.fillStyle = '#abb2b9';
    g.fillRect(30, 16, 3, 8);
    const w = Math.max(2, Math.floor(18 * p));
    g.fillStyle = p > 0.3 ? '#2ecc71' : '#e74c3c';
    g.fillRect(10, 14, w, 12);
  } else if (slotId === 'os') {
    g.fillStyle = '#1a252f';
    g.fillRect(8, 8, 24, 24);
    g.fillStyle = '#5dade2';
    g.fillRect(11, 11, 8, 8);
    g.fillStyle = '#58d68d';
    g.fillRect(21, 11, 8, 8);
    g.fillStyle = '#f5b041';
    g.fillRect(11, 21, 8, 8);
    g.fillStyle = '#af7ac5';
    g.fillRect(21, 21, 8, 8);
    if (p > 0.5) {
      g.fillStyle = '#fff';
      g.fillRect(18, 18, 4, 4);
    }
  }
  // progress rim
  g.strokeStyle = p > 0.6 ? '#2ecc71' : p > 0.3 ? '#f39c12' : '#7f8c8d';
  g.lineWidth = 2;
  g.strokeRect(1, 1, 38, 38);
  return c.toDataURL();
}

/** 供应商小图 */
export function supplierIconDataUrl(id) {
  const { c, g } = canvas(48, 48);
  g.fillStyle = '#2c2416';
  g.fillRect(0, 0, 48, 48);
  if (id === 'cheap') {
    g.fillStyle = '#e74c3c';
    g.fillRect(8, 16, 32, 20);
    g.fillStyle = '#f5b041';
    g.fillRect(12, 10, 24, 8);
    g.fillStyle = '#fff';
    g.fillRect(20, 22, 8, 8);
  } else if (id === 'premium') {
    g.fillStyle = '#1a5276';
    g.fillRect(6, 12, 36, 28);
    g.fillStyle = '#f1c40f';
    g.fillRect(14, 8, 20, 6);
    g.fillRect(18, 20, 12, 12);
  } else {
    g.fillStyle = '#27ae60';
    g.fillRect(8, 14, 32, 24);
    g.fillStyle = '#d5f5e3';
    g.fillRect(14, 20, 20, 12);
  }
  return c.toDataURL();
}

/**
 * 手机产品像素画：随各槽进度变化
 * slots: { perf, design, camera, battery, os } progress 0-100
 */
export function drawPhone(g, x, y, slots = {}, gen = 1) {
  const perf = (slots.perf?.progress || 0) / 100;
  const design = (slots.design?.progress || 0) / 100;
  const camera = (slots.camera?.progress || 0) / 100;
  const battery = (slots.battery?.progress || 0) / 100;
  const os = (slots.os?.progress || 0) / 100;

  const bodyW = 52;
  const bodyH = 96;
  const radiusHint = design > 0.5;

  // shadow
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(x + 4, y + 4, bodyW, bodyH);

  // body color shifts with design
  const br = Math.floor(40 + design * 40);
  const bg = Math.floor(44 + design * 30);
  const bb = Math.floor(52 + design * 50);
  g.fillStyle = `rgb(${br},${bg},${bb})`;
  g.fillRect(x, y, bodyW, bodyH);
  if (radiusHint) {
    g.fillStyle = `rgb(${br + 20},${bg + 20},${bb + 20})`;
    g.fillRect(x + 2, y + 2, bodyW - 4, bodyH - 4);
  }

  // screen
  const screenPad = 4;
  const sx = x + screenPad;
  const sy = y + 10;
  const sw = bodyW - screenPad * 2;
  const sh = 70;
  const screenBright = 80 + design * 100 + os * 40;
  g.fillStyle = `rgb(${30},${40 + design * 40},${50 + screenBright / 3})`;
  g.fillRect(sx, sy, sw, sh);

  // OS UI mock
  if (os > 0.15) {
    g.fillStyle = '#5dade2';
    g.fillRect(sx + 4, sy + 8, 14, 14);
    g.fillStyle = '#58d68d';
    g.fillRect(sx + 22, sy + 8, 14, 14);
    if (os > 0.4) {
      g.fillStyle = '#f5b041';
      g.fillRect(sx + 4, sy + 28, 14, 14);
      g.fillStyle = '#af7ac5';
      g.fillRect(sx + 22, sy + 28, 14, 14);
    }
    if (os > 0.7) {
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(sx + 6, sy + 50, sw - 12, 8);
    }
  } else {
    g.fillStyle = '#1b2631';
    g.fillRect(sx + 8, sy + 24, sw - 16, 6);
  }

  // camera bump
  if (camera > 0.1) {
    g.fillStyle = '#17202a';
    g.fillRect(x + bodyW - 18, y + 6, 14, 14 + camera * 6);
    g.fillStyle = '#85929e';
    g.beginPath();
    g.arc(x + bodyW - 11, y + 14, 3 + camera * 2, 0, Math.PI * 2);
    g.fill();
    if (camera > 0.5) {
      g.fillStyle = '#5dade2';
      g.beginPath();
      g.arc(x + bodyW - 11, y + 22, 2, 0, Math.PI * 2);
      g.fill();
    }
  }

  // chip glow strip (perf)
  if (perf > 0.2) {
    g.fillStyle = `rgba(52,152,219,${0.3 + perf * 0.5})`;
    g.fillRect(x + 2, y + bodyH - 18, bodyW - 4, 3);
  }

  // battery indicator
  g.fillStyle = '#2c3e50';
  g.fillRect(x + 14, y + bodyH - 12, 24, 6);
  g.fillStyle = battery > 0.35 ? '#2ecc71' : '#e74c3c';
  g.fillRect(x + 15, y + bodyH - 11, Math.max(2, Math.floor(22 * battery)), 4);

  // home bar / gen badge
  g.fillStyle = '#bdc3c7';
  g.fillRect(x + 18, y + bodyH - 5, 16, 2);
  g.fillStyle = '#f1c40f';
  g.font = 'bold 8px monospace';
  g.fillText(`G${gen}`, x + 4, y + 9);
}

export function phoneShowcaseDataUrl(slots, gen = 1) {
  const { c, g } = canvas(140, 160);
  // backdrop
  const grd = g.createLinearGradient(0, 0, 0, 160);
  grd.addColorStop(0, '#3d566e');
  grd.addColorStop(1, '#1c2833');
  g.fillStyle = grd;
  g.fillRect(0, 0, 140, 160);
  // podium
  g.fillStyle = '#5d4e37';
  g.fillRect(20, 130, 100, 16);
  g.fillStyle = '#8b7355';
  g.fillRect(30, 124, 80, 8);
  drawPhone(g, 44, 18, slots, gen);
  return c.toDataURL();
}

export function partsRowHtml(slotsObj) {
  const ids = ['perf', 'design', 'camera', 'battery', 'os'];
  return `<div class="parts-row">${ids.map((id) => {
    const prog = slotsObj?.[id]?.progress || 0;
    const meta = slotMeta(id);
    return `<div class="part-chip" title="${meta.label} ${prog}%">
      <img src="${partIconDataUrl(id, prog)}" width="40" height="40" alt="${meta.label}" />
      <span class="part-name">${meta.label}</span>
      <span class="part-pct">${Math.round(prog)}%</span>
      <div class="part-bar"><i style="width:${prog}%"></i></div>
    </div>`;
  }).join('')}</div>`;
}
