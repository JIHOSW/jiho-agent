# 한끗: 심사위원용 개발 설명 README (의도)

2026-11-23 16:20쯤 인터뷰로 확정했어요. 대회 제출 마감은 17:00이에요. 새 세션은 맨 아래 "새 세션에 넘길 프롬프트"로 시작하면 돼요.

## 목표 (Why)
- 심사위원이 GitHub 저장소 링크로 들어왔을 때, 첫 화면(README)에서 한끗을 어떻게 만들었는지(구조, 계산 검증, AI 사용, 품질)를 한눈에 보게 해요.
- 소개서 PDF는 서비스 소개가 중심이라, README는 개발 설명에 집중해요. 소개서와 같은 말을 되풀이하지 않아요.

## 대상 (Who)
- 제출서의 GitHub 링크로 들어오는 심사위원

## 인터뷰에서 정한 것
| 항목 | 결정 |
|---|---|
| 형식 | 저장소 첫 화면 README.md를 다시 씀 (PDF 아님) |
| 내부용 내용 | '협업 방법: 팀원별 브랜치', '마감까지의 규칙' 같은 팀 내부용 내용은 뺌 |
| 담을 것 | 제출 주소·시연 영상 링크, 구조(화면 munteok/js/app.js, 계산 엔진 munteok/js/engine.js, 규칙표 munteok/data/rules.json, AI 공고 읽기 munteok/api/extract.js), 계산 검증(원문 확인한 규칙 4개, 시험 172건, AI 추출 시험), 품질(QA 19건 수정, 글자 대비, 키보드 초점, 동작 줄이기), 실행 방법, 제출 시점 태그 |
| 올릴 곳 | main. 심사위원이 운영본과 같은 코드·시연 영상을 보도록 design/hankkeut도 main에 함께 합침 |

## 쓸 사실 (확인된 것만)
- 제출 주소 https://hankkeut-app.vercel.app (munteok-five.vercel.app도 같은 배포). 체험 주소 https://munteok-open.vercel.app 는 AI 공고 읽기를 끈 별도 주소
- 제출 시점 태그 `submit-2026-11-23` → 커밋 `8c04d09` (운영 배포 dpl_FudJGyyVt5T1acctueQhu5KcEFWH)
- 시연 영상: docs/demo/hankkeut-demo-20261123.mp4 (커밋 2d9fe05, 1분 45초, 92MB라 GitHub에서는 받기로 열림). main에 합친 뒤에는 main 경로 링크로
- 계산 시험: `cd munteok && npm test` → 전체 172건 통과(QA 뒤 4건 추가)
- 계산하는 규칙 4개: 부모 연말정산 부양가족 공제, 건강보험 피부양자, 구직촉진수당, 주 15시간 기준(주휴수당·4대보험). 근거 조문·적용 연도·확인일은 rules.json. 그 밖의 지원(실업급여·근로장려금 등)은 계산하지 않고 문의처만 안내(기능명세서 REQ-003·005 원칙)
- AI 추출 시험: munteok/tests/extract-eval.mjs (배경 영상 세션 보고: 가상 공고 8건 35/35, 실제 공고 확인). 숫자는 저장소 파일에서 다시 확인하고 쓰기
- QA: 19건(P0 1, P1 1, P2 5, P3 12) 모두 고쳐 배포. 보고서 docs/qa/는 QA 세션이 일부러 커밋하지 않았으니 링크하지 말고 숫자만
- 기술: 바닐라 JS 모듈(프레임워크 없음), Vercel 정적 배포 + 서버리스 함수(api/extract.js, Anthropic Claude — 모델 이름은 파일에서 확인), Pretendard, 의존성은 munteok/package.json
- 기존 README에 있는 '왜 필요한가', '어떻게 동작하나', '저장소 구조', '실행하기' 중 맞는 내용은 살리고 지금 상태에 맞게 고침

## 성공 기준
- 16:50 전에 main의 README.md가 바뀌고, 안의 링크(제출 주소, 체험 주소, 시연 영상, 태그, 파일 경로)가 모두 열려요.
- 숫자는 소개서·AI 활용내역과 같아요(시험 172건 등).

## 제약
- 17:00 제출 마감. 마감 뒤에는 안정화만 허용이라 README도 17:00 전에 끝내요.
- 앱 코드는 건드리지 않아요. 배포도 하지 않아요(README는 배포와 무관).
- 작업 폴더 /Users/ansangwoo/Desktop/해커톤/.claude/worktrees/design-hankkeut (브랜치 design/hankkeut). 원래 폴더의 브랜치는 바꾸지 않아요. docs/qa/(커밋 안 된 QA 보고서)는 건드리지 않아요.
- push·main 합치기 직전에 사용자에게 한 번 묻고 해요(의도 확인 때 main에 합치는 것까지 동의함).

## 하지 않을 것 (Out of scope)
- 앱 코드 변경, 배포
- 소개서 PDF·AI 활용내역 수정
- 새 그림·다이어그램 이미지 만들기(이미 있는 캡처 기획/디자인시안/한끗_새화면/ 는 써도 됨)
- 확인하지 않은 내용·숫자 쓰기
- 팀 내부용 협업 안내

## 새 세션에 넘길 프롬프트

```text
docs/intent/hankkeut-readme.md를 끝까지 읽고 그대로 해 줘. 17:00 제출 마감이라 16:50까지 끝내야 해.

작업 폴더는 /Users/ansangwoo/Desktop/해커톤/.claude/worktrees/design-hankkeut (브랜치 design/hankkeut)야. 원래 폴더의 브랜치는 바꾸지 마. docs/qa/는 건드리지 마.

1. git fetch 후 origin/main의 README.md와 design/hankkeut의 차이를 보고, 의도 문서의 '쓸 사실'을 저장소에서 확인해(npm test 건수, rules.json의 규칙 4개, api/extract.js의 모델 이름, extract-eval 결과).
2. 루트 README.md를 심사위원용 개발 설명으로 다시 써. 팀 내부용 협업·마감 규칙은 빼. 제출 주소, 시연 영상, 구조, 계산 검증, AI 사용, 품질, 실행 방법, 제출 태그를 담아. 한국어, 짧고 정확하게.
3. design/hankkeut에 커밋하고(이 의도 문서도 같이), 사용자에게 "push하고 main에 합칠까요?" 한 번만 묻고, 허락하면 push 후 PR을 만들어 main에 합쳐(PR #9처럼).
4. main에서 README의 링크가 모두 열리는지 확인하고, 바꾼 것·확인한 것·확인 못 한 것을 보고해.
```
