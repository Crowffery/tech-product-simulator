# Audio sources & licenses

All shipped game audio under `public/audio/` is **original** to this repository (procedural synthesis and/or open-source TTS). **No** copyrighted game rips, **no** paid/closed TTS or music APIs.

## Toolchain

| Step | Tool | Notes |
|------|------|-------|
| SFX / BGM PCM | Python 3 + NumPy (`tools/generate_audio.py`) | Oscillators, noise, simple envelopes |
| Encode | ffmpeg (`libvorbis` OGG + `libmp3lame` MP3) | Web-friendly dual format |
| Chinese VO | [Piper](https://github.com/rhasspy/piper) + voice `zh_CN-huayan-medium` from [rhasspy/piper-voices](https://huggingface.co/rhasspy/piper-voices) | Offline TTS; MIT-style / open model cards — check upstream for exact terms |
| Runtime fallback | Web Audio API in `src/studio/sfx.js` | Zero-file synth for dense studio / launch cues |

Bundled Piper builds also ship **espeak-ng** data (used as phonemizer). System `apt` install of espeak was unavailable in the build environment; Piper’s own binary was used instead.

## File map

### UI — `public/audio/ui/`
| File | Role |
|------|------|
| `click.ogg/.mp3` | Generic tap |
| `confirm.ogg/.mp3` | Affirm / lock-in |
| `cancel.ogg/.mp3` | Back / dismiss |
| `page-turn.ogg/.mp3` | Soft whoosh for screen change |

### Feedback — `public/audio/feedback/`
| File | Role |
|------|------|
| `add-points.ogg/.mp3` | Small reward / RP tick |
| `level-up.ogg/.mp3` | Upgrade fanfare |
| `event-popup.ogg/.mp3` | Incident modal attention |
| `bankruptcy.ogg/.mp3` | Fail stinger |
| `save.ogg/.mp3` | Save / load acknowledge |

### Marketing — `public/audio/marketing/`
| File | Role |
|------|------|
| `press-reveal.ogg/.mp3` | Press-conference reveal |
| `media-score.ogg/.mp3` | Score reveal |
| `first-month-sales-big-number.ogg/.mp3` | Big sales number |
| `cheer.ogg/.mp3` | Crowd-ish cheer |

### BGM — `public/audio/bgm/`
| File | Role |
|------|------|
| `office.ogg/.mp3` | Light Kairosoft-ish office loop (~16s) |
| `press.ogg/.mp3` | Brighter press-conference loop (~14s) |

### VO — `public/audio/vo/` (optional, playful button-hint length)
| File | Line (zh) |
|------|-----------|
| `hint-start` | 点下面开始 |
| `hint-confirm` | 就这样定了 |
| `hint-cancel` | 先算了 |
| `hint-save` | 存好啦 |
| `hint-launch` | 发布会开始 |
| `hint-cheer` | 卖爆了 |
| `hint-bust` | 倒闭了…再开一局吧 |

### VO quality note
Piper `huayan` Mandarin is **intelligible but clearly synthetic** — fine for casual hints, not for cinematic VO. Prosody can sound flat; we keep lines short. If you replace VO, keep filenames or update `FILE` map in `src/studio/sfx.js`.

## License of repo outputs

- **Procedural SFX & BGM WAV→OGG/MP3** produced by `tools/generate_audio.py`: original composition/synthesis for 《电子产品发展国》— treat as **CC0** (waive to the extent possible) for reuse in this game and demos.
- **VO**: audio renderings produced locally with Piper + `zh_CN-huayan-medium`; redistribution should respect Piper and voice-model licenses (open / research-friendly — verify current Hugging Face model card before shipping in a commercial storefront if you fork this).

## Mute preference

`localStorage` key: `epdg-studio-mute` (`1` = muted). Shared by main HUD and studio mute button.
