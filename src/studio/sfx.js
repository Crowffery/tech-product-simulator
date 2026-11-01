/** 8-bit 合成音效：全部用 WebAudio 现场合成，无音频文件 */

const MUTE_KEY = 'epdg-studio-mute';
let ctx = null;
let master = null;
let noiseBuf = null;
let muted = false;
try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  /* ignore */
}

function ac() {
  if (!ctx) {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, { type = 'square', vol = 0.06, at = 0, slide = 0 } = {}) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.08, at = 0, hp = 800, lp = 8000 } = {}) {
  const c = ac();
  if (!c || muted) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const h = c.createBiquadFilter();
  h.type = 'highpass';
  h.frequency.value = hp;
  const l = c.createBiquadFilter();
  l.type = 'lowpass';
  l.frequency.value = lp;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(h).connect(l).connect(g).connect(master);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

export const sfx = {
  click() {
    tone(880, 0.05, { vol: 0.035 });
  },
  part(tierIdx = 0) {
    const base = [392, 494, 587, 698][tierIdx] || 440;
    tone(base, 0.07, { vol: 0.05 });
    tone(base * 1.5, 0.1, { vol: 0.045, at: 0.06 });
  },
  color() {
    tone(1046, 0.06, { type: 'triangle', vol: 0.06 });
    tone(1318, 0.09, { type: 'triangle', vol: 0.05, at: 0.05 });
  },
  whoosh() {
    noise(0.3, { vol: 0.1, hp: 500, lp: 3500 });
  },
  explode(open) {
    tone(open ? 180 : 360, 0.22, { type: 'sawtooth', vol: 0.035, slide: open ? 2.2 : 0.45 });
    noise(0.18, { vol: 0.05, hp: 1500 });
    if (open) [0.12, 0.2, 0.28].forEach((at) => tone(1200 + Math.random() * 400, 0.04, { vol: 0.03, at }));
  },
  drumroll(dur, at = 0) {
    const n = Math.floor(dur / 0.045);
    for (let i = 0; i < n; i++) noise(0.04, { vol: 0.03 + 0.09 * (i / n), at: at + i * 0.045, hp: 150, lp: 1400 });
  },
  boom(at = 0) {
    tone(110, 0.6, { type: 'sine', vol: 0.3, at, slide: 0.35 });
    noise(0.5, { vol: 0.14, at, hp: 50, lp: 900 });
  },
  fanfare(at = 0) {
    const n = [523, 659, 784, 1046];
    n.forEach((f, i) => {
      tone(f, 0.15, { vol: 0.06, at: at + i * 0.1 });
      tone(f / 2, 0.15, { type: 'triangle', vol: 0.07, at: at + i * 0.1 });
    });
    tone(1046, 0.7, { vol: 0.06, at: at + 0.42 });
    tone(1318, 0.7, { vol: 0.045, at: at + 0.42 });
    tone(1568, 0.7, { vol: 0.035, at: at + 0.42 });
    tone(523, 0.7, { type: 'triangle', vol: 0.08, at: at + 0.42 });
  },
  applause(dur, at = 0) {
    const n = Math.floor(dur / 0.025);
    for (let i = 0; i < n; i++) {
      const fade = i < n * 0.7 ? 1 : 1 - (i - n * 0.7) / (n * 0.3);
      noise(0.025, { vol: (0.015 + Math.random() * 0.035) * fade + 0.0002, at: at + i * 0.025 + Math.random() * 0.02, hp: 1500, lp: 7000 });
    }
  },
  shutter(at = 0) {
    noise(0.025, { vol: 0.08, at, hp: 3500 });
    noise(0.04, { vol: 0.05, at: at + 0.05, hp: 2500 });
  },
  keep() {
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, i === 3 ? 0.25 : 0.08, { vol: 0.05, at: i * 0.08 }));
  },
  setMuted(v) {
    muted = v;
    try {
      localStorage.setItem(MUTE_KEY, v ? '1' : '0');
    } catch {
      /* ignore */
    }
  },
  get muted() {
    return muted;
  },
};
