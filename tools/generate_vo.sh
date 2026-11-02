#!/usr/bin/env bash
# Optional Chinese VO via open-source Piper TTS (zh_CN-huayan-medium).
# Requires: piper binary + onnx model (see docs/AUDIO_SOURCES.md).
# Usage:
#   PIPER_BIN=/path/to/piper MODEL=/path/to/zh_CN-huayan-medium.onnx \
#   ESPEAK_DATA=/path/to/espeak-ng-data ./tools/generate_vo.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/audio/vo"
mkdir -p "$OUT"
PIPER_BIN="${PIPER_BIN:-}"
MODEL="${MODEL:-}"
ESPEAK_DATA="${ESPEAK_DATA:-}"
if [[ -z "$PIPER_BIN" || -z "$MODEL" ]]; then
  echo "Set PIPER_BIN and MODEL (and preferably ESPEAK_DATA). Skipping."
  exit 0
fi
export LD_LIBRARY_PATH="$(dirname "$PIPER_BIN"):${LD_LIBRARY_PATH:-}"
gen() {
  local id="$1" text="$2"
  local wav
  wav="$(mktemp --suffix=.wav)"
  echo "$text" | "$PIPER_BIN" -m "$MODEL" ${ESPEAK_DATA:+--espeak_data "$ESPEAK_DATA"} -f "$wav" --length_scale 0.95 -q
  ffmpeg -y -loglevel error -i "$wav" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a libvorbis -q:a 4 "$OUT/$id.ogg"
  ffmpeg -y -loglevel error -i "$wav" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a libmp3lame -q:a 4 "$OUT/$id.mp3"
  rm -f "$wav"
  echo "vo/$id — $text"
}
gen hint-start "点下面开始"
gen hint-confirm "就这样定了"
gen hint-cancel "先算了"
gen hint-save "存好啦"
gen hint-launch "发布会开始"
gen hint-cheer "卖爆了"
gen hint-bust "倒闭了…再开一局吧"
