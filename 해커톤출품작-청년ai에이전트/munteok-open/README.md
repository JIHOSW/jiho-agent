# 한끗 공개 체험 주소 (munteok-open)

사용자 동향을 보려고 따로 연 체험용 주소입니다. 대회 제출 주소(https://hankkeut-app.vercel.app)와는 다른 Vercel 프로젝트입니다.

## munteok과 다른 점
- **Microsoft Clarity 사용 기록 (프로젝트 ID `zghjoh7fqi`)**
  - 처음 들어오면 동의 여부를 묻고, 동의한 사람에게만 Clarity를 불러옵니다. 두 버튼은 같은 모양입니다.
  - 화면 본문과 아래 창은 `data-clarity-mask`로 가려서, 입력값과 계산 금액은 보내지 않습니다.
  - 화면이 바뀔 때마다 `step_화면이름` 이벤트를 남깁니다. Clarity의 Filters → Custom events에서 어디서 멈추는지 볼 수 있습니다.
  - 개인정보 처리 안내 화면에서 동의를 거두거나 다시 고를 수 있습니다.
- **AI 공고 읽기 끔**: 직접 입력과 예시만 씁니다. 공고 사진·글을 외부 AI로 보내지 않고, API 비용도 들지 않습니다.

계산 엔진, 규칙표, 화면은 munteok과 같습니다.

## 고친 내용 반영하기
munteok을 고친 뒤 이 폴더에서:

```bash
./build.sh
npx vercel@65.11.0 deploy --prod --yes
```

`index.html`, `css`, `js`, `data`, `media`(PC 첫 화면 배경 영상)는 build.sh가 munteok에서 복사해 만드는 파일이라 직접 고치지 않습니다.

## Clarity 관리 화면에서 직접 할 것
- 마스킹(Masking)을 Strict로 바꾸기
- Copilot 등 AI 요약 기능을 쓰지 않기 (실제 사용자 기록을 외부 AI로 보내지 않기 위해)
