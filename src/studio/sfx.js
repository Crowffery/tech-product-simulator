/** Game + studio audio: file SFX/BGM/VO + WebAudio synth fallback. */

import { lsGet, lsSet } from '../game/storage.js';

const MUTE_KEY = 'epdg-studio-mute';
const BASE = `${import.meta.env.BASE_URL}audio`;

/** @type {Record<string, string>} relative paths under public/audio */
const FILE = {
  click: 'ui/click',
  confirm: 'ui/confirm',
  cancel: 'ui/cancel',
  'page-turn': 'ui/page-turn',
  'add-points': 'feedback/add-points',
  'level-up': 'feedback/level-up',
  'event-popup': 'feedback/event-popup',
  bankruptcy: 'feedback/bankruptcy',
  save: 'feedback/save',
  'press-reveal': 'marketing/press-reveal',
  'media-score': 'marketing/media-score',
  'first-month-sales-big-number': 'marketing/first-month-sales-big-number',
  cheer: 'marketing/cheer',
  // VO (optional; playful short hints)
  'vo-start': 'vo/hint-start',
  'vo-confirm': 'vo/hint-confirm',
  'vo-cancel': 'vo/hint-cancel',
  'vo-save': 'vo/hint-save',
  'vo-launch': 'vo/hint-launch',
  'vo-cheer': 'vo/hint-cheer',
  'vo-bust': 'vo/hint-bust',
};

const BGM_FILE = {
  office: 'bgm/office',
  press: 'bgm/press',
};

let ctx = null;
let master = null;
let noiseBuf = null;
let muted = lsGet(MUTE_KEY) === '1';
/** @type {Map<string, HTMLAudioElement[]>} */
const pools = new Map();
/** @type {HTMLAudioElement | null} */
let bgmEl = null;
let bgmId = null;
let unlocked = false;
const VO_COOLDOWN_MS = 4500;
let lastVoAt = 0;

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

function unlock() {
  if (unlocked) return;
  unlocked = true;
  ac();
  // Warm one silent buffer play for mobile autoplay policies
  try {
    const a = new Audio();
    a.src = `${BASE}/ui/click.ogg`;
    a.volume = 0;
    a.play()?.catch(() => {});
  } catch {
    /* ignore */
  }
}

function srcFor(stem) {
  // Prefer ogg; browsers that hate ogg still get mp3 via <source> pattern — we pick one URL.
  const canOgg = typeof Audio !== 'undefined' && document.createElement('audio').canPlayType('audio/ogg; codecs=vorbis');
  return `${BASE}/${stem}.${canOgg ? 'ogg' : 'mp3'}`;
}

function obtain(stem) {
  let list = pools.get(stem);
  if (!list) {
    list = [];
    pools.set(stem, list);
  }
  for (const a of list) {
    if (a.paused || a.ended) return a;
  }
  if (list.length >= 3) return list[0];
  const a = new Audio(srcFor(stem));
  a.preload = 'auto';
  a.volume = 0.7;
  list.push(a);
  return a;
}

function playFile(id, { volume = 0.7 } = {}) {
  if (muted) return false;
  const stem = FILE[id];
  if (!stem) return false;
  unlock();
  try {
    const a = obtain(stem);
    a.volume = volume;
    a.currentTime = 0;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
    return true;
  } catch {
    return false;
  }
}

function playVo(_id) {
  // VO / female narration disabled — keep SFX/BGM only
  return;
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

const MUSIC_KEY = 'epdg-music-off';
const BGM_VOL = 0.14;
let musicOff = lsGet(MUSIC_KEY) === '1';
let bgmRest = null;

function setBgmVolume(v) {
  if (bgmEl) bgmEl.volume = muted || musicOff ? 0 : v;
}

/** 放完一遍歇 20～45 秒再放，避免同一段旋律一直循环 */
function scheduleNext(a, id) {
  a.addEventListener('ended', () => {
    clearTimeout(bgmRest);
    bgmRest = setTimeout(() => {
      if (bgmEl !== a || bgmId !== id || muted || musicOff) return;
      a.currentTime = 0;
      const p = a.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }, 20000 + Math.random() * 25000);
  });
}

export const sfx = {
  /** Prefetch common UI + feedback clips (light; skips BGM/VO). */
  warm() {
    ['click', 'confirm', 'cancel', 'add-points', 'event-popup', 'save'].forEach((id) => {
      const stem = FILE[id];
      if (!stem) return;
      obtain(stem);
    });
  },

  click() {
    if (!playFile('click', { volume: 0.55 })) tone(880, 0.05, { vol: 0.035 });
  },
  confirm() {
    if (!playFile('confirm')) {
      tone(660, 0.07, { type: 'triangle', vol: 0.05 });
      tone(990, 0.1, { type: 'triangle', vol: 0.045, at: 0.06 });
    }
  },
  cancel() {
    if (!playFile('cancel')) {
      tone(520, 0.08, { type: 'triangle', vol: 0.04, slide: 0.7 });
    }
  },
  'page-turn'() {
    if (!playFile('page-turn')) {
      noise(0.08, { vol: 0.05, hp: 1800 });
    }
  },
  pageTurn() {
    sfx['page-turn']();
  },
  'add-points'() {
    if (!playFile('add-points')) {
      tone(784, 0.05, { vol: 0.04 });
      tone(988, 0.07, { vol: 0.045, at: 0.05 });
    }
  },
  addPoints() {
    sfx['add-points']();
  },
  'level-up'() {
    if (!playFile('level-up')) {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, i === 3 ? 0.22 : 0.08, { type: 'triangle', vol: 0.05, at: i * 0.08 }));
    }
  },
  levelUp() {
    sfx['level-up']();
  },
  'event-popup'() {
    if (!playFile('event-popup')) {
      tone(440, 0.12, { vol: 0.05, slide: 1.6 });
      noise(0.1, { vol: 0.05, hp: 900 });
    }
  },
  eventPopup() {
    sfx['event-popup']();
  },
  bankruptcy() {
    if (!playFile('bankruptcy', { volume: 0.75 })) {
      tone(220, 0.25, { type: 'sawtooth', vol: 0.05, slide: 0.5 });
      tone(165, 0.35, { type: 'sine', vol: 0.08, at: 0.2, slide: 0.7 });
    }
  },
  save() {
    if (!playFile('save')) {
      tone(880, 0.06, { type: 'sine', vol: 0.04 });
      tone(1320, 0.08, { type: 'sine', vol: 0.035, at: 0.05 });
    }
  },
  'press-reveal'() {
    if (!playFile('press-reveal', { volume: 0.8 })) {
      sfx.drumroll(0.7);
      sfx.boom(0.75);
      sfx.fanfare(0.85);
    }
  },
  pressReveal() {
    sfx['press-reveal']();
  },
  'media-score'() {
    if (!playFile('media-score')) {
      [698, 880, 1175].forEach((f, i) => tone(f, 0.1 + i * 0.04, { type: 'triangle', vol: 0.05, at: i * 0.09 }));
    }
  },
  mediaScore() {
    sfx['media-score']();
  },
  'first-month-sales-big-number'() {
    if (!playFile('first-month-sales-big-number', { volume: 0.8 })) {
      [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, 0.07, { vol: 0.045, at: i * 0.05 }));
    }
  },
  salesBig() {
    sfx['first-month-sales-big-number']();
  },
  cheer() {
    if (!playFile('cheer', { volume: 0.75 })) sfx.applause(1.4);
  },

  // ── studio / legacy WebAudio API (kept for phone3d / launch show) ──
  part(tierIdx = 0) {
    // map progress ticks to add-points file occasionally; keep synth crisp for spam
    if (tierIdx >= 2 && playFile('add-points', { volume: 0.45 })) return;
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
    if (open) playFile('event-popup', { volume: 0.65 });
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
    if (at === 0 && playFile('level-up', { volume: 0.65 })) return;
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
    if (at === 0 && dur >= 1.2 && playFile('cheer', { volume: 0.7 })) return;
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
    if (playFile('confirm', { volume: 0.65 })) return;
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, i === 3 ? 0.25 : 0.08, { vol: 0.05, at: i * 0.08 }));
  },

  /** @param {'office'|'press'|null|string} id */
  setBgm(id) {
    unlock();
    if (!id) {
      if (bgmEl) {
        bgmEl.pause();
        bgmEl = null;
      }
      bgmId = null;
      return;
    }
    if (bgmId === id && bgmEl) {
      setBgmVolume(BGM_VOL);
      return;
    }
    const stem = BGM_FILE[id];
    if (!stem) return;
    if (bgmEl) {
      bgmEl.pause();
      bgmEl = null;
    }
    bgmId = id;
    const a = new Audio(srcFor(stem));
    a.loop = false;
    a.preload = 'auto';
    a.volume = muted || musicOff ? 0 : BGM_VOL;
    bgmEl = a;
    scheduleNext(a, id);
    if (musicOff || muted) return;
    const p = a.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  },

  /** Map game phase → bed. */
  syncBgm(phase) {
    if (!phase || phase === 'title' || phase === 'create' || phase === 'bust') {
      // soft office bed on title; silence on bust after stinger
      if (phase === 'bust') return;
      return sfx.setBgm('office');
    }
    if (phase === 'launch' || phase === 'score' || phase === 'launchPrep') return sfx.setBgm('press');
    return sfx.setBgm('office');
  },

  voStart() {
    /* VO disabled */
  },
  voConfirm() {
    /* VO disabled */
  },

  setMuted(v) {
    muted = !!v;
    lsSet(MUTE_KEY, muted ? '1' : '0');
    setBgmVolume(BGM_VOL);
    if (muted && bgmEl) bgmEl.pause();
    else if (!muted && bgmEl && bgmId) {
      const p = bgmEl.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  },
  get muted() {
    return muted;
  },

  /** 音乐单独开关（音效不受影响） */
  setMusic(on) {
    musicOff = !on;
    lsSet(MUSIC_KEY, musicOff ? '1' : '0');
    setBgmVolume(BGM_VOL);
    if (musicOff && bgmEl) bgmEl.pause();
    else if (!musicOff && !muted && bgmEl) {
      const p = bgmEl.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  },
  get musicOn() {
    return !musicOff;
  },
};
