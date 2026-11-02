#!/usr/bin/env python3
"""
Procedural SFX + light Kairosoft-ish BGM for 《电子产品发展国》.
Toolchain: Python3 + numpy → WAV → ffmpeg (ogg/mp3).
Original synthesis only — no ripped game audio, no paid APIs.
License of outputs: CC0 / public-domain equivalent (original work for this repo).
"""
from __future__ import annotations

import math
import struct
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parents[1] / "public" / "audio"
TAU = 2 * math.pi


def env_adsr(n: int, a=0.01, d=0.05, s=0.6, r=0.08) -> np.ndarray:
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    sustain_n = max(0, n - a_n - d_n - r_n)
    parts = []
    if a_n:
        parts.append(np.linspace(0, 1, a_n, endpoint=False))
    if d_n:
        parts.append(np.linspace(1, s, d_n, endpoint=False))
    if sustain_n:
        parts.append(np.full(sustain_n, s))
    if r_n:
        parts.append(np.linspace(s, 0, r_n, endpoint=False))
    e = np.concatenate(parts) if parts else np.zeros(0)
    if len(e) < n:
        e = np.pad(e, (0, n - len(e)))
    return e[:n].astype(np.float64)


def tone(freq, dur, *, typ="sine", vol=0.4, a=0.005, d=0.04, s=0.5, r=0.06, slide=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    if slide != 1.0:
        # exponential-ish freq glide
        freqs = freq * (slide ** (t / max(dur, 1e-6)))
        phase = np.cumsum(TAU * freqs / SR)
    else:
        phase = TAU * freq * t
    if typ == "sine":
        wave_ = np.sin(phase)
    elif typ == "square":
        wave_ = np.sign(np.sin(phase))
    elif typ == "triangle":
        wave_ = 2 / math.pi * np.arcsin(np.clip(np.sin(phase), -1, 1))
    elif typ == "saw":
        wave_ = 2 * ((freq * t * (slide if slide != 1 else 1)) % 1) - 1
        if slide != 1.0:
            wave_ = 2 * ((np.cumsum(freqs) / SR) % 1) - 1
    else:
        wave_ = np.sin(phase)
    return (wave_ * env_adsr(n, a, d, s, r) * vol).astype(np.float64)


def noise(dur, *, vol=0.2, hp=0.0):
    n = int(dur * SR)
    x = np.random.uniform(-1, 1, n)
    if hp > 0:
        # simple 1-pole highpass-ish
        alpha = hp / (hp + SR / (2 * math.pi))
        y = np.zeros(n)
        prev_x = prev_y = 0.0
        for i in range(n):
            y[i] = alpha * (prev_y + x[i] - prev_x)
            prev_x, prev_y = x[i], y[i]
        x = y
    return (x * env_adsr(n, 0.002, 0.02, 0.4, 0.05) * vol).astype(np.float64)


def mix(*parts, gap=0.0):
    if not parts:
        return np.zeros(1)
    if gap > 0:
        pad = np.zeros(int(gap * SR))
        seq = []
        for i, p in enumerate(parts):
            if i:
                seq.append(pad)
            seq.append(p)
        return np.concatenate(seq)
    length = max(len(p) for p in parts)
    out = np.zeros(length)
    for p in parts:
        out[: len(p)] += p
    peak = np.max(np.abs(out)) or 1.0
    if peak > 0.95:
        out *= 0.95 / peak
    return out


def concat(*parts, silence=0.02):
    pad = np.zeros(int(silence * SR))
    chunks = []
    for i, p in enumerate(parts):
        if i:
            chunks.append(pad)
        chunks.append(p)
    return np.concatenate(chunks)


def write_wav(path: Path, mono: np.ndarray):
    path.parent.mkdir(parents=True, exist_ok=True)
    peak = np.max(np.abs(mono)) or 1.0
    mono = mono / peak * 0.9
    pcm = np.clip(mono * 32767, -32767, 32767).astype(np.int16)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def to_ogg_mp3(wav: Path):
    ogg = wav.with_suffix(".ogg")
    mp3 = wav.with_suffix(".mp3")
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libvorbis", "-q:a", "4", str(ogg)],
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", "libmp3lame", "-q:a", "4", str(mp3)],
        check=True,
    )
    return ogg, mp3


def render(name: str, data: np.ndarray, sub: str):
    wav = ROOT / sub / f"{name}.wav"
    write_wav(wav, data)
    ogg, mp3 = to_ogg_mp3(wav)
    wav.unlink(missing_ok=True)  # keep web-friendly only
    print(f"  {sub}/{name}.ogg (+mp3)  {len(data)/SR:.2f}s")
    return ogg


# ─── SFX recipes ─────────────────────────────────────────────

def sfx_click():
    return tone(1200, 0.045, typ="square", vol=0.18, a=0.001, d=0.02, s=0.2, r=0.02)


def sfx_confirm():
    return mix(
        tone(660, 0.07, typ="triangle", vol=0.28),
        tone(990, 0.1, typ="triangle", vol=0.22, a=0.01),
    )


def sfx_cancel():
    return mix(
        tone(520, 0.08, typ="triangle", vol=0.22, slide=0.7),
        tone(390, 0.1, typ="sine", vol=0.18, a=0.02),
    )


def sfx_page_turn():
    return mix(
        noise(0.09, vol=0.12, hp=1800),
        tone(880, 0.05, typ="sine", vol=0.08, a=0.001, r=0.03),
    )


def sfx_add_points():
    return concat(
        tone(784, 0.05, typ="square", vol=0.2),
        tone(988, 0.07, typ="square", vol=0.22),
        silence=0.03,
    )


def sfx_level_up():
    notes = [523, 659, 784, 1046]
    parts = [tone(f, 0.09 if i < 3 else 0.22, typ="triangle", vol=0.26) for i, f in enumerate(notes)]
    return concat(*parts, silence=0.04)


def sfx_event_popup():
    return mix(
        tone(440, 0.12, typ="square", vol=0.2, slide=1.6),
        noise(0.1, vol=0.08, hp=900),
    )


def sfx_bankruptcy():
    return concat(
        tone(220, 0.25, typ="saw", vol=0.22, slide=0.5, a=0.01, r=0.12),
        tone(165, 0.35, typ="sine", vol=0.28, slide=0.7),
        silence=0.05,
    )


def sfx_save():
    return mix(
        tone(880, 0.06, typ="sine", vol=0.2),
        tone(1320, 0.08, typ="sine", vol=0.16, a=0.03),
        noise(0.04, vol=0.04, hp=4000),
    )


def sfx_press_reveal():
    # drumroll-ish + boom + fanfare hit
    roll = []
    for i in range(14):
        vol = 0.04 + 0.08 * (i / 14)
        roll.append(noise(0.035, vol=vol, hp=200))
    roll_a = concat(*roll, silence=0.01)
    boom = tone(90, 0.45, typ="sine", vol=0.45, slide=0.4, a=0.005, r=0.2)
    fan = mix(
        tone(523, 0.35, typ="triangle", vol=0.25),
        tone(784, 0.35, typ="triangle", vol=0.2),
        tone(1046, 0.4, typ="triangle", vol=0.18),
    )
    return concat(roll_a, mix(boom, fan), silence=0.02)


def sfx_media_score():
    return concat(
        tone(698, 0.08, typ="triangle", vol=0.24),
        tone(880, 0.1, typ="triangle", vol=0.26),
        tone(1175, 0.22, typ="triangle", vol=0.28),
        silence=0.035,
    )


def sfx_sales_big():
    # rising arpeggio + sparkle
    notes = [392, 523, 659, 784, 1046, 1318]
    parts = [tone(f, 0.07, typ="square", vol=0.2 + 0.02 * i) for i, f in enumerate(notes)]
    sparkle = mix(
        tone(1568, 0.25, typ="sine", vol=0.15),
        tone(2093, 0.2, typ="sine", vol=0.1, a=0.05),
    )
    return concat(*(parts + [sparkle]), silence=0.025)


def sfx_cheer():
    claps = [noise(0.03, vol=0.05 + 0.03 * (i % 3), hp=1500) for i in range(40)]
    bed = concat(*claps, silence=0.012)
    yay = mix(
        tone(784, 0.4, typ="triangle", vol=0.18),
        tone(988, 0.4, typ="triangle", vol=0.14),
        tone(1175, 0.45, typ="triangle", vol=0.12),
    )
    return mix(bed, yay)


# ─── BGM (loopable soft chiptune / soft synth) ───────────────

def midi(n):
    return 440.0 * (2 ** ((n - 69) / 12))


def note_evt(midi_n, start, dur, buf, *, typ="triangle", vol=0.12):
    i0 = int(start * SR)
    wave_ = tone(midi(midi_n), dur, typ=typ, vol=vol, a=0.01, d=0.05, s=0.55, r=0.08)
    i1 = min(len(buf), i0 + len(wave_))
    buf[i0:i1] += wave_[: i1 - i0]


def soft_hat(buf, t, vol=0.03):
    i0 = int(t * SR)
    n = noise(0.04, vol=vol, hp=5000)
    i1 = min(len(buf), i0 + len(n))
    buf[i0:i1] += n[: i1 - i0]


def kick(buf, t, vol=0.18):
    i0 = int(t * SR)
    n = tone(90, 0.18, typ="sine", vol=vol, slide=0.45, a=0.002, d=0.05, s=0.3, r=0.08)
    i1 = min(len(buf), i0 + len(n))
    buf[i0:i1] += n[: i1 - i0]


def make_loop(seconds, pattern_fn):
    n = int(seconds * SR)
    buf = np.zeros(n, dtype=np.float64)
    pattern_fn(buf, seconds)
    # fade edges slightly for seamless-ish loop
    fade = int(0.01 * SR)
    buf[:fade] *= np.linspace(0, 1, fade)
    buf[-fade:] *= np.linspace(1, 0, fade)
    peak = np.max(np.abs(buf)) or 1.0
    buf *= 0.85 / peak
    return buf


def bgm_office(buf, seconds):
    # C major pentatonic-ish office bed, BPM ~96
    bpm = 96
    beat = 60 / bpm
    # chords (root motion C–Am–F–G)
    prog = [60, 57, 53, 55]  # C3 A2 F2 G2 as bass midi-ish; use chord tones
    chord_tones = {
        60: [60, 64, 67],
        57: [57, 60, 64],
        53: [53, 57, 60],
        55: [55, 59, 62],
    }
    bars = int(seconds / (beat * 4))
    for bar in range(bars):
        root = prog[bar % 4]
        t0 = bar * beat * 4
        for tone_m in chord_tones[root]:
            note_evt(tone_m + 12, t0, beat * 3.6, buf, typ="triangle", vol=0.07)
        note_evt(root, t0, beat * 3.5, buf, typ="sine", vol=0.14)
        # soft lead motif
        motif = [72, 74, 76, 79, 76, 74, 72, 67]
        for i, m in enumerate(motif):
            note_evt(m, t0 + i * (beat * 0.5), beat * 0.45, buf, typ="square", vol=0.045)
        for i in range(8):
            soft_hat(buf, t0 + i * (beat * 0.5), vol=0.025 if i % 2 == 0 else 0.015)
        kick(buf, t0, 0.12)
        kick(buf, t0 + beat * 2, 0.1)


def bgm_press(buf, seconds):
    # brighter, slightly faster press-conference energy, BPM ~112
    bpm = 112
    beat = 60 / bpm
    prog = [62, 64, 65, 67]  # D E F G
    chord_tones = {
        62: [62, 66, 69],
        64: [64, 67, 71],
        65: [65, 69, 72],
        67: [67, 71, 74],
    }
    bars = int(seconds / (beat * 4))
    for bar in range(bars):
        root = prog[bar % 4]
        t0 = bar * beat * 4
        for tone_m in chord_tones[root]:
            note_evt(tone_m + 12, t0, beat * 3.5, buf, typ="triangle", vol=0.08)
        note_evt(root, t0, beat * 3.2, buf, typ="sine", vol=0.16)
        motif = [74, 76, 79, 81, 79, 76, 74, 81]
        for i, m in enumerate(motif):
            note_evt(m, t0 + i * (beat * 0.5), beat * 0.4, buf, typ="square", vol=0.055)
        for i in range(8):
            soft_hat(buf, t0 + i * (beat * 0.5), vol=0.035)
        kick(buf, t0, 0.16)
        kick(buf, t0 + beat, 0.08)
        kick(buf, t0 + beat * 2, 0.14)
        kick(buf, t0 + beat * 3, 0.08)


def main():
    np.random.seed(42)
    print("Generating SFX…")
    ui = {
        "click": sfx_click(),
        "confirm": sfx_confirm(),
        "cancel": sfx_cancel(),
        "page-turn": sfx_page_turn(),
    }
    feedback = {
        "add-points": sfx_add_points(),
        "level-up": sfx_level_up(),
        "event-popup": sfx_event_popup(),
        "bankruptcy": sfx_bankruptcy(),
        "save": sfx_save(),
    }
    marketing = {
        "press-reveal": sfx_press_reveal(),
        "media-score": sfx_media_score(),
        "first-month-sales-big-number": sfx_sales_big(),
        "cheer": sfx_cheer(),
    }
    for name, data in ui.items():
        render(name, data, "ui")
    for name, data in feedback.items():
        render(name, data, "feedback")
    for name, data in marketing.items():
        render(name, data, "marketing")

    print("Generating BGM loops…")
    office = make_loop(16.0, bgm_office)  # ~16s @ 96bpm = 6.4 bars-ish
    press = make_loop(14.0, bgm_press)
    render("office", office, "bgm")
    render("press", press, "bgm")
    print("Done.")


if __name__ == "__main__":
    main()
