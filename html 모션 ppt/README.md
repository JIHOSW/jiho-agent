# 아이마켓코리아 구매 혁신 제안

**[발표자료 바로 보기](https://jihosw.github.io/jiho-agent/)** — 브라우저에서 슬라이드와 모션을 실행할 수 있습니다.

10장 HTML 인터랙티브 발표입니다. `dist/imarket-proposal.html`은 이미지·조선굴림체·Chart.js가 포함된 단일 파일로, 더블클릭해 오프라인에서 열 수 있습니다. `dist/index.html`은 웹 배포용으로 같은 폴더의 리소스를 사용합니다.

- 이동: 좌우 화살표, PageUp / PageDown, 화면 하단 버튼, 모바일 좌우 스와이프
- 목차 O / 전체화면 F / 발표 노트 N / 처음 Home / 마지막 End
- 구매 흐름: 5장 단계 클릭, 좌우 키로 탭 전환
- 가정 기반 효과 계산: 7장 슬라이더
- 인쇄 버튼: 브라우저 PDF 저장 가능. 전체 10장 출력.
- 출처 버튼: 자료·수치·가정의 근거 확인
- 발표자: 서비스 개발팀 김지호 대리 (표지, 마지막 장, 하단)
- 카드의 장식용 클릭·반동·퍼짐 효과는 제거했습니다. 슬라이드와 탭에는 짧은 페이드만 남기고 계산 결과는 즉시 표시합니다.
- 본문·숫자·차트 레이블의 크기와 대비를 높이고, 제목의 불필요한 강제 줄바꿈과 바깥 여백을 줄였습니다.
- 제목, 설명, 카드 본문을 중앙 정렬. 이미지 캡션 제거. OS/브라우저 동작 줄이기 설정 지원.

자료는 AI 실습용이며 아이마켓코리아의 공식 제안서 또는 견적이 아닙니다. 화면·업무 흐름은 제안용 개념으로 실제 기능, 지원 범위, 보안·연동·가격은 공급사 검토가 필요합니다. 고객 효과와 파일럿 일정은 제안 가정입니다.

제공 자료: 디자인레퍼런스.jpg, 리포트.png, 아이마켓코리아 핵심 기업분석 - 2026년 하반기.pdf. 원본은 수정하지 않았습니다. 매출은 제공 이미지와 상충하는 공식 2025년 4분기 IR의 연결 매출을 채택했습니다.

## 현재 표지 이미지

아이마켓코리아 공식 홈페이지의 MRO 사업 사진을 사용합니다. 저장: `dist/assets/imarket-mro.jpg`. 원본: https://www.imarketkorea.com/image/section-home-introduce-252.jpg . 첫 장의 원형 장식·기울임·이미지 확대·패럴랙스·순차 등장 효과를 제외하고 짧은 페이드만 적용했습니다. 제목과 설명은 위쪽에 배치했습니다. 오른쪽 상단 실습 문구를 삭제했습니다.

## 초기 생성 이미지 보관 기록
Built-in image_gen 사용. 저장: dist/assets/procurement-ecosystem.png. 이 초기 이미지는 보관하며 현재 표지에는 사용하지 않습니다.

최종 프롬프트: Use case: stylized-concept. Asset type: hero illustration for a Korean enterprise procurement software HTML presentation. Create a premium isometric 3D illustration showing a centralized digital procurement platform connecting a manufacturing factory, a warehouse, delivery vehicle, supplier packages, and a floating glass dashboard at the center. Visual metaphor of unified sourcing and supply chain, fine glowing connection paths. Cobalt royal blue, frosted pale blue glass, white ceramic, and small mint accents on a very pale cool gray background. Art direction: clean sophisticated corporate 3D editorial, soft studio lighting, realistic translucent materials, restrained shadows, generous space, no people. Landscape 3:2 composition, all objects comfortably inside frame. No text, no numbers, no letters, no logos, no watermark. This is an illustrative conceptual ecosystem, not an actual product screenshot.

## 폰트와 라이브러리
조선굴림체 / 조선일보: https://noonnu.cc/font_page/415 . 원본 WOFF를 수정하지 않고 탑재했습니다. 개인·기업 무료 제공, 원본 배포 허용. 수정·유료 재판매 금지.

Chart.js 4.4.8 / MIT license, 번들 헤더에 라이선스 표시 보존.

## 재생성
`node build-offline.mjs` — 원본 HTML/CSS/JS에서 단일 HTML 생성. 수정 후 이 명령을 실행해야 단일 파일에도 반영됩니다.
