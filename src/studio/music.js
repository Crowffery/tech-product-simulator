/**
 * 生成式背景音乐（WebAudio 合成，不用音频文件）
 *
 * 每个阶段一种情绪（mood）：标题的梦幻、办公室的 lo-fi、研发的专注、出事时的紧张、
 * 发布会的燃、卖爆时的欢快、倒闭时的落寞。
 * 和弦进行、旋律动机、鼓组花样每 8 小节重新生成一次，偶尔转调、偶尔留白（breakdown），
 * 所以永远不会听到完全一样的一段。
 */

const MOODS = {
  title: { bpm: 74, root: 53, mode: 'lydian', progs: [[0, 4, 5, 3], [0, 5, 3, 4], [3, 4, 0, 0]], voice: 'pad', lead: 'bell', drums: 'none', bass: 'soft', swing: 0, density: 0.35 },
  office: { bpm: 86, root: 48, mode: 'major', progs: [[0, 5, 3, 4], [1, 4, 0, 5], [3, 4, 2, 5], [0, 3, 1, 4]], voice: 'ep', lead: 'pluck', drums: 'lofi', bass: 'walk', swing: 0.16, density: 0.45 },
  focus: { bpm: 98, root: 45, mode: 'minor', progs: [[0, 5, 2, 6], [0, 3, 4, 4], [5, 6, 0, 0], [0, 6, 5, 4]], voice: 'arp', lead: 'pluck', drums: 'tick', bass: 'pulse', swing: 0.05, density: 0.4 },
  tension: { bpm: 92, root: 50, mode: 'phrygian', progs: [[0, 1, 0, 6], [0, 0, 1, 1]], voice: 'drone', lead: 'stab', drums: 'heart', bass: 'drone', swing: 0, density: 0.25 },
  press: { bpm: 114, root: 52, mode: 'major', progs: [[0, 4, 5, 3], [5, 3, 0, 4], [0, 3, 4, 4], [3, 4, 5, 5]], voice: 'pad', lead: 'lead', drums: 'four', bass: 'octave', swing: 0, density: 0.55 },
  win: { bpm: 106, root: 55, mode: 'major', progs: [[0, 3, 4, 3], [0, 5, 1, 4], [3, 0, 4, 0]], voice: 'ep', lead: 'lead', drums: 'funk', bass: 'funk', swing: 0.12, density: 0.55 },
  bust: { bpm: 64, root: 45, mode: 'minor', progs: [[0, 5, 3, 4], [0, 3, 6, 4]], voice: 'ep', lead: 'bell', drums: 'none', bass: 'soft', swing: 0, density: 0.3 },
};

const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

/** 节奏型（16 分音符位置），旋律从里面挑 */
const RHYTHMS = [
  [0, 3, 6, 8, 11, 14],
  [0, 4, 6, 10, 12],
  [0, 2, 4, 7, 8, 12, 14],
  [2, 6, 8, 10, 14],
  [0, 6, 8, 9, 12],
  [0, 8, 10, 12],
];

const DRUMS = {
  none: [],
  lofi: [
    { k: [0, 7, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] },
    { k: [0, 6, 10], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14], o: [14] },
  ],
  tick: [
    { k: [0, 8], s: [12], h: [2, 6, 10, 14] },
    { k: [0, 6, 8], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14] },
  ],
  heart: [{ k: [0, 3], s: [], h: [8] }],
  four: [
    { k: [0, 4, 8, 12], s: [4, 12], h: [2, 6, 10, 14], o: [6, 14] },
    { k: [0, 4, 8, 12], s: [4, 12, 15], h: [0, 2, 4, 6, 8, 10, 12, 14] },
  ],
  funk: [
    { k: [0, 6, 10], s: [4, 12], h: [0, 2, 3, 4, 6, 8, 10, 11, 12, 14] },
    { k: [0, 3, 8, 11], s: [4, 12], h: [0, 2, 4, 6, 8, 10, 12, 14], o: [7] },
  ],
};

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function createMusic(getCtx) {
  let ctx = null;
  let out = null;
  let bus = null;
  let verb = null;
  let noise = null;
  let mood = null;
  let next = null;
  let timer = null;
  let step = 0; // 16 分音符计数
  let nextTime = 0;
  let section = null;
  let volume = 0.16;
  let enabled = true;

  function init() {
    if (ctx) return true;
    ctx = getCtx();
    if (!ctx) return false;
    out = ctx.createGain();
    out.gain.value = 0;
    out.connect(ctx.destination);
    bus = ctx.createGain();
    bus.gain.value = 1;
    // 简易混响：两路反馈延迟
    verb = ctx.createGain();
    verb.gain.value = 0.22;
    [0.11, 0.17].forEach((t) => {
      const d = ctx.createDelay(1);
      d.delayTime.value = t;
      const fb = ctx.createGain();
      fb.gain.value = 0.38;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      verb.connect(d).connect(lp).connect(fb).connect(d);
      lp.connect(out);
    });
    bus.connect(out);
    bus.connect(verb);
    const len = ctx.sampleRate;
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const ch = noise.getChannelData(0);
    for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    return true;
  }

  // ═════════════ 乐器 ═════════════

  function env(g, t, a, peak, d, sus, rel, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * sus), t + a + d);
    g.gain.setValueAtTime(Math.max(0.0001, peak * sus), end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
  }

  function osc(type, f, t, end, dest, detune = 0) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    o.detune.value = detune;
    o.connect(dest);
    o.start(t);
    o.stop(end + 0.05);
    return o;
  }

  const V = {
    pad(notes, t, dur, vel = 1) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(500, t);
      lp.frequency.linearRampToValueAtTime(1500, t + dur * 0.5);
      lp.frequency.linearRampToValueAtTime(700, t + dur);
      const g = ctx.createGain();
      env(g, t, Math.min(0.6, dur * 0.3), 0.05 * vel, 0.3, 0.8, 0.8, t + dur);
      lp.connect(g).connect(bus);
      notes.forEach((n) => {
        osc('sawtooth', mtof(n), t, t + dur + 0.8, lp, -8);
        osc('sawtooth', mtof(n), t, t + dur + 0.8, lp, 8);
      });
    },
    ep(notes, t, dur, vel = 1) {
      notes.forEach((n, i) => {
        const g = ctx.createGain();
        const tt = t + i * 0.012;
        env(g, tt, 0.008, 0.07 * vel, 0.5, 0.35, 0.4, tt + dur);
        g.connect(bus);
        osc('sine', mtof(n), tt, tt + dur + 0.4, g);
        const g2 = ctx.createGain();
        env(g2, tt, 0.004, 0.025 * vel, 0.12, 0.05, 0.1, tt + 0.2);
        g2.connect(bus);
        osc('triangle', mtof(n + 12), tt, tt + 0.3, g2);
      });
    },
    arp(notes, t, dur, vel = 1) {
      const s16 = 60 / mood.bpm / 4;
      const seq = [...notes, notes[1] + 12, notes[2], notes[1]];
      for (let i = 0; i * s16 < dur - 0.01; i++) V.pluck(seq[i % seq.length], t + i * s16, s16 * 0.9, 0.55 * vel);
    },
    drone(notes, t, dur) {
      V.pad([notes[0] - 12, notes[0]], t, dur, 0.8);
    },
    pluck(n, t, dur, vel = 1) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(3200, t);
      lp.frequency.exponentialRampToValueAtTime(500, t + 0.25);
      const g = ctx.createGain();
      env(g, t, 0.004, 0.08 * vel, 0.18, 0.2, 0.15, t + Math.max(0.05, dur));
      lp.connect(g).connect(bus);
      osc('triangle', mtof(n), t, t + dur + 0.2, lp);
      osc('square', mtof(n), t, t + dur + 0.2, lp, 5);
    },
    bell(n, t, dur, vel = 1) {
      const g = ctx.createGain();
      env(g, t, 0.005, 0.06 * vel, 1.2, 0.01, 0.4, t + dur);
      g.connect(bus);
      osc('sine', mtof(n), t, t + dur + 1.4, g);
      const g2 = ctx.createGain();
      env(g2, t, 0.003, 0.02 * vel, 0.4, 0.01, 0.2, t + 0.4);
      g2.connect(bus);
      osc('sine', mtof(n) * 2.76, t, t + 0.6, g2);
    },
    lead(n, t, dur, vel = 1) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2200;
      const g = ctx.createGain();
      env(g, t, 0.02, 0.05 * vel, 0.1, 0.7, 0.12, t + dur);
      lp.connect(g).connect(bus);
      const o = osc('square', mtof(n), t, t + dur + 0.15, lp);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 5.5;
      const lg = ctx.createGain();
      lg.gain.value = 6;
      lfo.connect(lg).connect(o.detune);
      lfo.start(t + 0.12);
      lfo.stop(t + dur + 0.15);
      osc('sawtooth', mtof(n), t, t + dur + 0.15, lp, 7);
    },
    stab(n, t, dur, vel = 1) {
      V.pluck(n, t, dur, vel * 0.8);
      V.pluck(n + 1, t, dur, vel * 0.35);
    },
    bass(n, t, dur, vel = 1) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      const g = ctx.createGain();
      env(g, t, 0.01, 0.13 * vel, 0.15, 0.6, 0.08, t + dur);
      lp.connect(g).connect(out);
      osc('sine', mtof(n), t, t + dur + 0.1, lp);
      osc('triangle', mtof(n), t, t + dur + 0.1, lp);
    },
    kick(t, vel = 1) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(0.32 * vel, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.32);
    },
    noiseHit(t, type, freq, dur, vol) {
      const s = ctx.createBufferSource();
      s.buffer = noise;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(out);
      s.start(t, Math.random() * 0.5);
      s.stop(t + dur + 0.02);
    },
  };

  // ═════════════ 作曲 ═════════════

  function chordOf(deg, root, scale) {
    const at = (d) => root + scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    return [at(deg), at(deg + 2), at(deg + 4), at(deg + 6)];
  }

  /** 生成一个 8 小节段落：和弦进行 × 2、旋律动机（A A' B A''）、鼓型、是否留白 */
  function newSection(m) {
    const prog = pick(m.progs);
    const shift = Math.random() < 0.18 ? pick([2, -2, 5]) : 0; // 偶尔转调
    const root = (section?.root ?? m.root) + shift > m.root + 7 ? m.root : (section?.root ?? m.root) + shift;
    const scale = SCALES[m.mode];
    const rhythm = pick(RHYTHMS);
    const motif = [];
    let d = pick([0, 2, 4, 7]);
    for (const r of rhythm) {
      d += pick([-2, -1, -1, 1, 1, 2, 0, 3, -3]);
      d = Math.max(-1, Math.min(11, d));
      if (Math.random() < m.density + 0.35) motif.push({ s: r, d, len: pick([1, 2, 2, 3, 4]) });
    }
    const variant = motif.map((n) => ({ ...n, d: n.d + pick([0, 0, 1, -1, 2]) }));
    const answer = motif.map((n) => ({ ...n, s: (n.s + 2) % 16, d: n.d + pick([2, 3, -2]) }));
    const breakdown = section && Math.random() < 0.18;
    return {
      prog,
      root,
      scale,
      motifs: [motif, variant, answer, motif.map((n) => ({ ...n, d: n.d + pick([0, -1, 1]) }))],
      drum: pick(DRUMS[m.drums] || [{ k: [], s: [], h: [] }]),
      breakdown,
      leadOn: !breakdown && Math.random() < 0.85,
      bars: 8,
    };
  }

  function scheduleStep(t) {
    const m = mood;
    if (!m) return;
    const bar = Math.floor(step / 16);
    const s = step % 16;
    if (s === 0 && bar % 8 === 0) section = newSection(m);
    const sec = section;
    const s16 = 60 / m.bpm / 4;
    const swing = s % 2 === 1 ? s16 * m.swing : 0;
    const tt = t + swing;
    const deg = sec.prog[bar % 4];
    const chord = chordOf(deg, sec.root, sec.scale);
    const barLen = s16 * 16;

    // 和声：每小节一次
    if (s === 0) {
      const voicing = chord.map((n) => n + 12);
      V[m.voice](m.voice === 'ep' ? voicing.slice(0, 3) : voicing, tt, barLen * (m.voice === 'ep' ? 0.9 : 1), sec.breakdown ? 0.7 : 1);
      if (m.voice === 'ep' && s === 0 && Math.random() < 0.5) V.ep(voicing.slice(1, 3), tt + s16 * 10, barLen * 0.3, 0.6);
    }
    // 低音
    if (!sec.breakdown || m.bass === 'drone') {
      const b = chord[0] - 12;
      if (m.bass === 'soft' && s === 0) V.bass(b, tt, barLen * 0.9, 0.7);
      if (m.bass === 'drone' && s === 0) V.bass(b - 12, tt, barLen, 0.6);
      if (m.bass === 'walk' && s % 4 === 0) V.bass([b, b + 7, b + 12, chord[2] - 12][s / 4], tt, s16 * 3, 0.8);
      if (m.bass === 'pulse' && s % 2 === 0) V.bass(b, tt, s16 * 1.4, s % 4 === 0 ? 0.9 : 0.55);
      if (m.bass === 'octave' && s % 2 === 0) V.bass(s % 4 === 0 ? b : b + 12, tt, s16 * 1.6, 0.85);
      if (m.bass === 'funk' && [0, 3, 6, 10, 12].includes(s)) V.bass([b, b, b + 12, b + 7, b][[0, 3, 6, 10, 12].indexOf(s)], tt, s16 * 1.5, 0.9);
    }
    // 鼓
    if (!sec.breakdown && sec.drum) {
      const fill = bar % 8 === 7 && s >= 12;
      if (sec.drum.k?.includes(s)) V.kick(tt, 0.9);
      if (sec.drum.s?.includes(s) || (fill && s % 1 === 0 && m.drums !== 'heart' && m.drums !== 'tick')) V.noiseHit(tt, 'bandpass', 1800, 0.13, fill ? 0.05 : 0.09);
      if (sec.drum.h?.includes(s)) V.noiseHit(tt, 'highpass', 7000, 0.04, s % 4 === 0 ? 0.035 : 0.022);
      if (sec.drum.o?.includes(s)) V.noiseHit(tt, 'highpass', 6000, 0.2, 0.025);
    }
    // 旋律：A A' B A''，每两小节一个动机
    if (sec.leadOn) {
      const motif = sec.motifs[Math.floor((bar % 8) / 2)];
      const half = bar % 2;
      for (const n of motif) {
        if (n.s !== s) continue;
        if (half === 1 && Math.random() < 0.4) continue; // 第二小节稀疏一点，留呼吸
        const at = (d) => sec.root + sec.scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7) + 24;
        V[m.lead](at(n.d), tt, s16 * n.len, half ? 0.75 : 1);
      }
    }
  }

  function tick() {
    if (!ctx || !mood) return;
    const s16 = 60 / mood.bpm / 4;
    while (nextTime < ctx.currentTime + 0.25) {
      // 换情绪：在小节线上切
      if (next && step % 16 === 0) {
        mood = MOODS[next];
        next = null;
        section = null;
        step = 0;
      }
      scheduleStep(nextTime);
      nextTime += s16;
      step++;
    }
  }

  function fadeTo(v, sec = 1.2) {
    if (!out) return;
    const t = ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(v, t + sec);
  }

  return {
    setMood(id) {
      if (!MOODS[id]) return;
      if (!init()) return;
      if (!mood) {
        mood = MOODS[id];
        step = 0;
        nextTime = ctx.currentTime + 0.1;
      } else if (MOODS[id] !== mood) next = id;
      if (!timer) timer = setInterval(tick, 60);
      fadeTo(enabled ? volume : 0);
    },
    setEnabled(on) {
      enabled = on;
      if (!ctx) return;
      fadeTo(on ? volume : 0, 0.6);
      if (!on) {
        clearInterval(timer);
        timer = null;
      } else if (mood && !timer) {
        nextTime = ctx.currentTime + 0.1;
        timer = setInterval(tick, 60);
      }
    },
    /** 频谱分析节点（测试 / 可视化用） */
    analyser() {
      if (!init()) return null;
      if (!this._an) {
        this._an = ctx.createAnalyser();
        this._an.fftSize = 2048;
        out.connect(this._an);
      }
      return this._an;
    },
    get mood() {
      return Object.keys(MOODS).find((k) => MOODS[k] === mood) || null;
    },
  };
}

export const MOOD_OF_PHASE = {
  title: 'title',
  create: 'title',
  plan: 'office',
  design: 'office',
  supply: 'office',
  next: 'office',
  dev: 'focus',
  factory: 'focus',
  event: 'tension',
  rescue: 'tension',
  launch: 'press',
  score: 'press',
  sales: 'win',
  ending: 'win',
  bust: 'bust',
};
