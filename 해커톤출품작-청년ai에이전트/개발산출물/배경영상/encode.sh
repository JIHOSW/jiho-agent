#!/bin/bash
# render.mjs가 찍은 PNG(30장/초, 한 바퀴 720장)를 앱에서 쓰는 영상·포스터로 묶는다. 소리 없음.
# 쓰는 법: ./encode.sh <PNG 폴더> <저장 폴더(munteok/media)>
# - start-bg.mp4: H.264(첫 번째로 고르는 파일). 평평한 화면이라 VP9보다 작고 선명하다.
# - start-bg.webm: VP9. H.264를 못 트는 브라우저용.
# - start-bg.jpg: 첫 장면(포스터). 영상 첫 장과 같아 영상이 시작될 때 바뀌어 보이지 않는다.
# 색은 BT.709로 바꾸고 표시해 둔다. 영상 바탕(#F2F4F6)이 앱 바탕과 같아야 영상 가장자리가 보이지 않는다.
set -euo pipefail
IN="$1"; OUT="$2"
FF=${FFMPEG:-ffmpeg}
VF="scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p"
COL=(-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv)
mkdir -p "$OUT"
"$FF" -v error -y -framerate 30 -i "$IN/f%04d.png" -vf "$VF" -c:v libx264 -preset veryslow -tune animation -crf 20 -profile:v high -level 4.0 -x264-params colorprim=bt709:transfer=bt709:colormatrix=bt709 "${COL[@]}" -movflags +faststart -an "$OUT/start-bg.mp4"
"$FF" -v error -y -framerate 30 -i "$IN/f%04d.png" -vf "$VF" -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -deadline good -cpu-used 1 "${COL[@]}" -an "$OUT/start-bg.webm"
"$FF" -v error -y -i "$IN/f0000.png" -q:v 3 "$OUT/start-bg.jpg"
ls -l "$OUT"/start-bg.*
