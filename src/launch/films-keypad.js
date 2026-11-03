/**
 * 按键时代产品短片（v0.14）— 纯 canvas 函数，供 keynote film 字段调用。
 */
export const KEYPAD_FILMS = {
  kp_material(g, W, H, t) {
    g.fillStyle = '#1a1c20'; g.fillRect(0, 0, W, H);
    const y = H * 0.35 + Math.sin(t * 2) * 8;
    g.fillStyle = '#3a3d46'; g.fillRect(W * 0.25, y, W * 0.5, H * 0.35);
    g.fillStyle = '#9bbc0f'; g.fillRect(W * 0.32, y + 12, W * 0.36, H * 0.12);
    g.fillStyle = '#2b2e36';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
      g.fillRect(W * 0.34 + c * 28, y + H * 0.16 + r * 18, 22, 12);
    g.fillStyle = 'rgba(255,255,255,.15)'; g.fillRect(W * 0.25, y, W * 0.5, 4);
  },
  kp_colorbloom(g, W, H, t) {
    const cols = ['#0f380f', '#306230', '#9bbc0f', '#1a3a5c', '#7ec8ff', '#e8f0ff', '#f5b041', '#ff8a80'];
    const cells = 12; const cw = W / cells; const ch = H / cells;
    const R = t * Math.max(W, H) * 0.35;
    for (let y = 0; y < cells; y++) for (let x = 0; x < cells; x++) {
      const cx = (x + 0.5) * cw - W / 2; const cy = (y + 0.5) * ch - H / 2;
      const d = Math.hypot(cx, cy);
      g.fillStyle = d < R ? cols[Math.min(cols.length - 1, Math.floor((d / (R + 1)) * cols.length))] : '#0f380f';
      g.fillRect(x * cw, y * ch, cw + 1, ch + 1);
    }
  },
  kp_ringtone(g, W, H, t) {
    g.fillStyle = '#1a1028'; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ffb0e0'; g.lineWidth = 3;
    for (let i = 1; i <= Math.min(3, 1 + Math.floor(t * 1.2)); i++) {
      g.beginPath(); g.arc(W / 2, H / 2, 20 + i * 28 + (t * 40) % 28, 0, Math.PI * 2); g.stroke();
    }
    g.fillStyle = '#ffe08a'; g.font = 'bold 28px sans-serif'; g.textAlign = 'center';
    g.fillText('♪', W / 2 + Math.sin(t * 5) * 40, H / 2 - 60);
  },
  kp_standby(g, W, H, t) {
    g.fillStyle = '#102030'; g.fillRect(0, 0, W, H);
    const day = Math.min(20, 1 + Math.floor(t * 4));
    g.fillStyle = '#7ec8ff'; g.font = 'bold 36px sans-serif'; g.textAlign = 'center';
    g.fillText(`第 ${day} 天`, W / 2, H / 2);
    g.fillStyle = '#2ecc71'; g.fillRect(W / 2 - 60, H / 2 + 30, 120 * (1 - day / 40), 16);
    g.strokeStyle = '#fff'; g.strokeRect(W / 2 - 60, H / 2 + 30, 120, 16);
    g.fillStyle = '#e74c3c'; g.font = '14px sans-serif';
    g.fillText(day > 5 ? '竞品：已关机' : '竞品电量…', W / 2, H / 2 + 70);
  },
  kp_drop(g, W, H, t) {
    g.fillStyle = '#2a2010'; g.fillRect(0, 0, W, H);
    const phase = t % 3;
    const phoneY = phase < 1.2 ? 40 + phase * 120 : 180 - Math.abs(Math.sin((phase - 1.2) * 4)) * 40;
    g.fillStyle = '#3a3d46'; g.fillRect(W / 2 - 25, phoneY, 50, 80);
    g.fillStyle = '#9bbc0f'; g.fillRect(W / 2 - 18, phoneY + 8, 36, 24);
    if (phase > 1.0) {
      g.fillStyle = '#8B4513';
      for (let i = 0; i < 6; i++) g.fillRect(W / 2 - 40 + i * 18 + Math.sin(t + i) * 10, H - 50, 12, 10);
    }
  },
  kp_bigtext(g, W, H, t) {
    g.fillStyle = '#182018'; g.fillRect(0, 0, W, H);
    const s = 14 + Math.min(48, t * 20);
    g.fillStyle = '#c6e48b'; g.font = `bold ${s}px sans-serif`; g.textAlign = 'center';
    g.fillText('12:30', W / 2, H / 2);
  },
  kp_sos(g, W, H, t) {
    g.fillStyle = '#401818'; g.fillRect(0, 0, W, H);
    g.fillStyle = `rgba(255,80,80,${0.3 + 0.3 * Math.sin(t * 8)})`; g.fillRect(0, 0, W, H);
    g.fillStyle = '#fff'; g.font = 'bold 28px sans-serif'; g.textAlign = 'center';
    g.fillText(t > 1 ? '正在呼叫：儿子' : 'SOS', W / 2, H / 2);
  },
  kp_camera(g, W, H, t) {
    const block = Math.max(4, 16 - Math.floor(t * 4));
    for (let y = 0; y < H; y += block) for (let x = 0; x < W; x += block) {
      const n = ((x * 13 + y * 7) % 255);
      g.fillStyle = `rgb(${n},${n * 0.9},${n * 0.8})`;
      g.fillRect(x, y, block, block);
    }
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(W * 0.2, H * 0.2, W * 0.6, H * 0.6);
  },
  kp_dualsim(g, W, H, t) {
    g.fillStyle = '#182028'; g.fillRect(0, 0, W, H);
    for (let s = 0; s < 2; s++) {
      const x0 = W * 0.25 + s * W * 0.35;
      g.fillStyle = '#7ec8ff';
      for (let i = 0; i < 5; i++) {
        const on = t > 0.3 + i * 0.15;
        g.globalAlpha = on ? 1 : 0.2;
        g.fillRect(x0 + i * 10, H / 2 - i * 6, 7, 10 + i * 6);
      }
      g.globalAlpha = 1;
      g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.textAlign = 'center';
      g.fillText(`卡${s + 1}`, x0 + 20, H / 2 + 50);
    }
  },
  kp_t9(g, W, H, t) {
    g.fillStyle = '#0f380f'; g.fillRect(0, 0, W, H);
    const msg = '我爱你';
    const n = Math.min(msg.length, Math.floor(t * 2));
    g.fillStyle = '#0f380f'; g.fillStyle = '#9bbc0f';
    g.font = 'bold 32px monospace'; g.textAlign = 'center';
    g.fillText(msg.slice(0, n), W / 2, H / 2);
  },
};

export function playKeypadFilm(name, g, W, H, t, data) {
  const fn = KEYPAD_FILMS[name];
  if (fn) fn(g, W, H, t, data);
}
