#!/bin/bash
# 공개 체험 주소(munteok-open)용 파일을 munteok에서 복사해 만든다.
# munteok과 다른 점은 설정 두 가지뿐이다.
#   1. Microsoft Clarity 사용 기록: 동의한 사람에게만 켜고, 화면 본문(입력값·금액)은 가려서 보낸다.
#   2. AI 공고 읽기 끔: 직접 입력과 예시만 쓴다. 공고 사진·글을 외부 AI로 보내지 않는다.
# 계산 엔진, 규칙표, 화면은 munteok과 같다. munteok을 고친 뒤에는 이 스크립트를 다시 돌리고 배포한다.
#
# 쓰는 법:  ./build.sh
# 배포:     npx vercel@65.11.0 deploy --prod --yes   (이 폴더에서)
set -euo pipefail

CLARITY_ID="zghjoh7fqi"
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/../munteok"

# 이전에 만든 파일만 지운다. .vercel(배포 연결 정보)과 이 스크립트는 그대로 둔다.
rm -rf "$HERE/index.html" "$HERE/css" "$HERE/js" "$HERE/data" "$HERE/media"
cp "$SRC/index.html" "$HERE/"
cp -R "$SRC/css" "$SRC/js" "$SRC/data" "$SRC/media" "$HERE/"

CONFIG="$HERE/js/config.js"
perl -pi -e "s/^export const CLARITY_ID = null;/export const CLARITY_ID = '$CLARITY_ID';/" "$CONFIG"
perl -pi -e 's/^export const AI_OFF = false;/export const AI_OFF = true;/' "$CONFIG"

# 설정이 실제로 바뀌었는지 확인한다. munteok의 config.js 모양이 바뀌면 여기서 멈춘다.
grep -q "^export const CLARITY_ID = '$CLARITY_ID';" "$CONFIG" || { echo "CLARITY_ID를 바꾸지 못했어요: $CONFIG" >&2; exit 1; }
grep -q '^export const AI_OFF = true;' "$CONFIG" || { echo "AI_OFF를 바꾸지 못했어요: $CONFIG" >&2; exit 1; }

echo "만들었어요: Clarity $CLARITY_ID, AI 공고 읽기 끔"
