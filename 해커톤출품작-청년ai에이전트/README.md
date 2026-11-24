# 한끗

> 알바를 시작하기 전에, 보험료와 줄어드는 정부 지원까지 빼고 실제로 남는 돈을 확인하세요.

한끗은 정부 지원(구직촉진수당, 부모의 부양가족 공제, 건강보험 피부양자)을 받으며 알바를 시작하려는 청년이 공고를 올리면, 그 일로 **실제로 남는 돈**과 자격·신고 변화를 계산해 주는 웹 서비스입니다. 이 문서는 심사위원을 위한 개발 설명입니다.

| 바로 보기 | |
|---|---|
| **제출 주소** | **https://hankkeut-app.vercel.app** (AI 공고 읽기 포함. https://munteok-five.vercel.app 도 같은 배포) |
| 체험 주소 | https://munteok-open.vercel.app (AI 공고 읽기를 끈 별도 주소. 예시와 직접 입력만) |
| 시연 영상 | [docs/demo/hankkeut-demo-20261123.mp4](docs/demo/hankkeut-demo-20261123.mp4) (1분 45초, 92MB라 GitHub에서는 내려받아 엽니다) |
| 제출 시점 코드 | 태그 [`submit-2026-11-23`](https://github.com/JIHOSW/Hackathon/tree/submit-2026-11-23) → 커밋 [`8c04d09`](https://github.com/JIHOSW/Hackathon/commit/8c04d09) |

폴더 이름 `munteok`은 이전 서비스 이름 '문턱'에서 왔습니다.

## 구조

AI는 공고를 **읽기만** 하고, 판정과 금액은 **코드가** 규칙표로 계산합니다. AI가 계산값을 바꾸는 경로는 없습니다.

```text
브라우저 (바닐라 JS 모듈, 프레임워크 없음)
  js/app.js 화면 ──▶ js/engine.js 계산 엔진 ──▶ data/rules.json 규칙표
      │  공고 글·사진
      ▼
Vercel 서버 함수 api/extract.js ──▶ Anthropic Claude (claude-opus-5-5)
  (시급·주당 시간·시작 월·개월 수·소득 종류만 돌려줌)
```

| 경로 | 하는 일 |
|---|---|
| [`munteok/js/app.js`](munteok/js/app.js) | 화면 흐름과 입력. 계산은 엔진에 맡김 |
| [`munteok/js/engine.js`](munteok/js/engine.js) | 계산 엔진. 급여, 보험료, 제도별 판정, 근무조건 비교. 화면(DOM)과 분리된 순수 함수 |
| [`munteok/data/rules.json`](munteok/data/rules.json) | 규칙표. 기준 금액, 근거 조문, 적용 연도(2026), 확인일, 확인 수준 |
| [`munteok/api/extract.js`](munteok/api/extract.js) | AI 공고 읽기 서버 함수. API 키는 서버 환경 변수에만 있음 |
| [`munteok/tests/`](munteok/tests) | 계산 엔진 기대값 시험, AI 추출 시험 |
| [`munteok-open/`](munteok-open) | 체험 주소용 빌드(`build.sh`가 `AI_OFF = true`로 바꿔 올림) |
| [`기획/`](기획) | 기능명세서, PRD, 유저플로우, 조사 자료, 소개서, [AI 활용내역](기획/AI_활용내역.md) |
| [`docs/intent/`](docs/intent) | 기능마다 정한 목표와 하지 않을 것 기록 |

기술: HTML·CSS·바닐라 JS, Pretendard 글꼴, Vercel(정적 파일 + 서버 함수). 의존성은 서버 함수용 `@anthropic-ai/sdk`, `zod` 두 개입니다([`munteok/package.json`](munteok/package.json)).

## 계산 검증

**원문을 확인한 규칙 4개만 계산합니다.** 규칙마다 근거 조문과 확인일을 `rules.json`에 적고, 화면에도 함께 보여 줍니다.

| 규칙 | 근거 (rules.json) | 확인일 |
|---|---|---|
| 부모 연말정산 부양가족 공제 | 소득세법 제50조. 정부 세제개편안(2026.8)은 '추정'으로 함께 표시 | 2026-11-20 |
| 건강보험 피부양자 | 국민건강보험법 시행규칙 제2조, 별표 1의2 | 2026-11-20 |
| 구직촉진수당 | 구직자 취업촉진 및 생활안정지원에 관한 법률 시행령 제9조의2(감액·지급 정지) | 2026-11-20 |
| 주 15시간 기준(주휴수당·4대보험) | 근로기준법 제18조 제3항·제55조, 4대보험 단시간근로자 적용 시행령 | 2026-11-20 |

- **확인 수준 3단계**: `official`(원문 확인, 화면에 '확정') · `secondary`(2차 자료나 원문 수치로 계산, '추정'으로 따로 표시) · `unverified`(금액·판정에 쓰지 않고 '확인 필요'로만 안내).
- **계산하지 않는 지원**: 실업급여, 근로장려금, 훈련장려금, 청년월세지원, 국가장학금, 지역 청년수당은 원문 확인 전이라 계산하지 않고 문의처만 안내합니다(기능명세서 REQ-003·005).
- **기대값 시험**: `cd munteok && npm test` → **전체 172건 통과**. 손으로 계산한 기대값과 엔진 결과를 비교합니다([`munteok/tests/engine.test.js`](munteok/tests/engine.test.js)).

## AI 사용

| 항목 | 내용 |
|---|---|
| 모델 | `claude-opus-5-5`, effort `low`, 구조화 출력(zod 스키마)으로 형식 고정 |
| 하는 일 | 공고 글이나 사진(최대 3장)에서 시급, 주당 시간, 시작 월, 개월 수, 소득 종류를 뽑고 항목마다 확정·추정·확인 필요를 붙임 |
| 하지 않는 일 | 기준선 판정, 금액 계산, 추천. 모두 `engine.js`가 함 |
| 안전장치 | 글 4,000자·사진 크기 제한, 범위를 벗어난 값은 버리고 '확인 필요'로 바꿈, 공고가 아닌 글은 거절(422). 입력 내용은 서버에 저장하지 않음 |
| 실패 시 | 이유와 다시 하기를 보여 주고, 직접 입력이나 예시로 이어 갈 수 있음 |

**AI 추출 시험** [`munteok/tests/extract-eval.mjs`](munteok/tests/extract-eval.mjs): 지어낸 공고 8건(화면 예시 3건 + 월급·일당·프리랜서·해를 넘기는 공고 4건 + 공고가 아닌 글 1건)을 제출 주소에 보내 기대값과 비교합니다. 2026-11-23 제출 주소에서 **항목 35/35, 공고 8/8** 맞았습니다.

개발 과정에서 AI 도구를 쓴 내역은 [기획/AI_활용내역.md](기획/AI_활용내역.md)에 있습니다.

## 품질

- **QA**: 제출 주소를 휴대폰(375px)·PC(1440px) 폭에서 검수해 찾은 19건(P0 1, P1 1, P2 5, P3 12)을 모두 고쳐 배포했습니다. 금액이 틀리던 P0(소수 주당 시간)는 엔진 시험을 더해 막았습니다.
- **키보드 초점**: 화면이 바뀌면 새 화면 제목으로 초점이 옮겨 가고, 아래에서 올라오는 창은 닫으면 초점을 원래 버튼에 돌려줍니다.
- **동작 줄이기**: 기기의 '동작 줄이기' 설정을 따르고 '움직임 멈춤' 버튼을 둡니다. 이때 PC 첫 화면 배경 영상은 그림 한 장으로 바뀝니다.
- **글자 대비**: 배경 영상 위 글자까지 화면 캡처로 대비를 재서 확인했습니다.
- **개인정보**: 입력값과 기록은 브라우저 안에만 둡니다. 시연과 시험은 지어낸 공고로만 합니다.

## 실행 방법

Node.js 20 이상이면 설치 없이 계산 시험을 돌릴 수 있습니다.

```bash
cd munteok && npm test
```

화면은 정적 서버로 엽니다. 브라우저로 http://localhost:8770 을 엽니다(시험 페이지는 http://localhost:8770/tests/).

```bash
python3 -m http.server 8770 --directory munteok
```

- 로컬 정적 서버에는 서버 함수가 없어 AI 공고 읽기는 실패 안내를 보여 주고, 예시와 직접 입력으로 끝까지 동작합니다.
- `index.html`을 파일로 바로 열면 규칙표를 불러오지 못합니다.
- AI 추출 시험(API 크레딧이 조금 쓰입니다):

```bash
node munteok/tests/extract-eval.mjs https://hankkeut-app.vercel.app
```

제출 주소는 `munteok/` 폴더를 Vercel 프로젝트(Root Directory `munteok`, 환경 변수 `ANTHROPIC_API_KEY`)로 올린 것입니다.

## 제출 시점

- 제출 시점 코드는 태그 [`submit-2026-11-23`](https://github.com/JIHOSW/Hackathon/tree/submit-2026-11-23)(커밋 [`8c04d09`](https://github.com/JIHOSW/Hackathon/commit/8c04d09))입니다. 제출 주소의 화면·엔진·규칙표 파일이 이 커밋과 같습니다.
- 그 뒤 `main`에는 시연 영상과 문서만 더해졌고, `munteok/` 앱 코드는 이 커밋과 같습니다.

## 라이선스

[MIT License](LICENSE)
