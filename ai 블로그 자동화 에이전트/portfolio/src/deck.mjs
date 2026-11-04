// 슬라이드 정의 (1920x1080 px). HTML과 PPTX가 같은 좌표를 쓴다.
export const C = {
  red: 'C4232F', redSoft: 'F3D3D6', bgCover: 'F9F5F5', bg: 'F5EDED',
  card: 'FFFDFC', ink: '1E1A1B', body: '4A4447', muted: '6F6769', white: 'FFFFFF',
};
export const FOOT = 'jihodev · AI 블로그 자동화 에이전트';

const L = 128, R = 1792, W = R - L;

function head(num, label, title) {
  return [
    { t: 'rect', x: 0, y: 128, w: 16, h: 112, fill: C.red, r: 8, name: 'tab' },
    { t: 'text', x: L, y: 128, w: W, h: 44, text: `${num} · ${label}`, size: 30, weight: 700, color: C.red },
    { t: 'text', x: L, y: 174, w: W, h: 92, text: title, size: 64, weight: 800, color: C.ink },
  ];
}
function foot(page) {
  return [
    { t: 'text', x: L, y: 982, w: 900, h: 36, text: FOOT, size: 24, weight: 400, color: C.muted },
    { t: 'text', x: R - 200, y: 982, w: 200, h: 36, text: page, size: 24, weight: 400, color: C.muted, align: 'right' },
  ];
}
function card(x, y, w, h, hot = false) {
  return { t: 'rect', x, y, w, h, fill: hot ? C.red : C.card, r: 28, shadow: true };
}

export const slides = [
  // 1. 표지
  {
    bg: C.bgCover, notes: 'AI 블로그 자동화 에이전트 포트폴리오입니다. 공개 자료를 모으고 출처를 확인해 초안과 검수까지 이어 가고, 발행은 사람이 결정하는 글쓰기 에이전트를 만들었습니다.',
    els: [
      { t: 'rect', x: 280, y: -40, w: 1360, h: 112, fill: C.red, r: 40 },
      { t: 'text', x: 0, y: 270, w: 1920, h: 50, text: 'AI 에이전트 포트폴리오', size: 34, weight: 700, color: C.red, align: 'center' },
      { t: 'text', x: 0, y: 340, w: 1920, h: 170, text: 'AI 블로그 자동화 에이전트', size: 120, weight: 800, color: C.ink, align: 'center' },
      { t: 'text', x: 360, y: 528, w: 1200, h: 120, text: '공개 자료를 모으고, 출처를 확인하고, 초안과 검수까지 이어 가는\n블로그 글쓰기 에이전트', size: 34, weight: 400, color: C.body, align: 'center', lh: 1.6 },
      { t: 'line', x1: 360, x2: 860, y: 824, color: 'E8C4C7' },
      { t: 'line', x1: 1060, x2: 1560, y: 824, color: 'E8C4C7' },
      { t: 'circle', x: 912, y: 776, d: 96, fill: C.red, shadow: true },
      { t: 'icon', name: 'pen', x: 932, y: 796, s: 56 },
      { t: 'text', x: 0, y: 900, w: 1920, h: 44, text: '김지호 · 2026. 11', size: 28, weight: 400, color: C.body, align: 'center' },
    ],
  },
  // 2. 왜 만들었나
  {
    bg: C.bgCover, notes: '글을 쓰는 일은 문장을 쓰는 시간보다 사실을 확인하는 시간이 더 깁니다. 금융 고객의 질문으로 기술 변화를 설명하는 블로그를 혼자 꾸준히, 정확하게 쓰고 싶어서, 사람이 빠뜨리기 쉬운 네 가지를 에이전트의 작업 순서로 만들었습니다.',
    els: [
      ...head('01', '왜 만들었나', '글보다 확인이 더 오래 걸렸습니다'),
      { t: 'text', x: L, y: 306, w: 560, h: 330, runs: [
        { text: '좋은 기술 글은\n문장보다 ' }, { text: '확인한 사실', color: C.red }, { text: '에서\n나온다고 생각했습니다.' },
      ], size: 44, weight: 800, color: C.ink, lh: 1.45 },
      { t: 'text', x: L, y: 540, w: 560, h: 170, text: '금융 고객의 질문으로 기술 변화를 설명하는 블로그를, 공개 자료만으로 꾸준히 쓰기 위해 만들었습니다.', size: 28, weight: 400, color: C.body, lh: 1.6 },
      card(752, 298, 508, 258), card(1284, 298, 508, 258), card(752, 580, 508, 258), card(1284, 580, 508, 258, true),
      ...[
        [752, 298, '빠지기 쉬운 일 1', '사실 확인', '공식 원문을 직접 열어 확인한 자료에만 출처 번호를 붙입니다.', false],
        [1284, 298, '빠지기 쉬운 일 2', '문체 일관성', '분석한 문체 가이드로 글마다 같은 목소리를 유지합니다.', false],
        [752, 580, '빠지기 쉬운 일 3', '검수 누락', '체크리스트로 매번 같은 기준을 점검하고 결과를 남깁니다.', false],
        [1284, 580, '주 1회 동향 요약', '꾸준함', '스킬 한 번 호출로 수집부터 검수까지 이어서 실행합니다.', true],
      ].flatMap(([x, y, k, h, b, hot]) => [
        { t: 'text', x: x + 40, y: y + 40, w: 428, h: 36, text: k, size: 24, weight: 700, color: hot ? C.white : C.red },
        { t: 'text', x: x + 40, y: y + 84, w: 428, h: 52, text: h, size: 36, weight: 700, color: hot ? C.white : C.ink },
        { t: 'text', x: x + 40, y: y + 146, w: 428, h: 92, text: b, size: 26, weight: 400, color: hot ? C.white : C.body, lh: 1.55 },
      ]),
      ...foot('02'),
    ],
  },
  // 3. 어떻게 동작하나
  {
    bg: C.bg, notes: '에이전트는 공식 출처에서 자료를 모으고, 원문을 연 자료만 번호를 붙여 정리합니다. 확인하지 못한 내용은 확인 필요 번호로 남기고, 문체 가이드와 체크리스트로 초안을 점검합니다. 내 관점과 발행 여부는 작성자가 결정합니다. 동향 요약은 한 번에, 분석 글은 단계마다 확인을 받습니다.',
    els: [
      ...head('02', '어떻게 동작하나', '자료는 에이전트가, 결정은 사람이'),
      ...[
        [128, '01', '자료 수집', '공식 블로그·문서와 금융당국 보도자료에서 원문을 직접 엽니다.', false],
        [550, '02', '출처 정리', '확인한 자료에 번호를 붙이고, 못 한 것은 [확인 필요]로 남깁니다.', false],
        [972, '03', '초안과 검수', '문체 가이드와 체크리스트로 점검하고 검수 기록을 남깁니다.', false],
        [1394, '04', '사람의 결정', '내 관점과 발행 여부는 작성자가 직접 정합니다.', true],
      ].flatMap(([x, n, h, b, hot]) => [
        card(x, 298, 398, 312, hot),
        { t: 'text', x: x + 36, y: 336, w: 330, h: 50, text: n, size: 32, weight: 800, color: hot ? C.white : C.red },
        { t: 'text', x: x + 36, y: 392, w: 330, h: 54, text: h, size: 36, weight: 700, color: hot ? C.white : C.ink },
        { t: 'text', x: x + 36, y: 458, w: 330, h: 130, text: b, size: 26, weight: 400, color: hot ? C.white : C.body, lh: 1.55 },
      ]),
      card(128, 650, 1664, 172),
      { t: 'text', x: 176, y: 690, w: 900, h: 96, runs: [
        { text: '동향 요약은 수집부터 검수까지 한 번에 실행하고,\n' }, { text: '분석 글은 단계마다 사람의 확인을 받습니다.', weight: 700, color: C.ink },
      ], size: 28, weight: 400, color: C.body, lh: 1.6 },
      ...[[1180, '2', '에이전트 스킬'], [1390, '3', '완성한 글'], [1600, '32', '원문 확인 출처']].flatMap(([x, n, k]) => [
        { t: 'text', x, y: 668, w: 180, h: 104, text: n, size: 72, weight: 800, color: C.red, align: 'center' },
        { t: 'text', x: x - 20, y: 772, w: 220, h: 36, text: k, size: 24, weight: 400, color: C.body, align: 'center' },
      ]),
      ...foot('03'),
    ],
  },
  // 4. 원한 가치
  {
    bg: C.bgCover, notes: '제가 원한 가치는 믿고 읽을 수 있는 글입니다. 원문을 연 자료만 근거로 쓰고, 같은 기준으로 검수하고, 판단은 사람이 합니다. 왼쪽은 실제 2편 초안 검수 기록으로, 출처 번호를 원문과 대조해 잘못 붙은 번호를 찾아 고친 과정입니다.',
    els: [
      ...head('03', '원한 가치', '믿고 읽을 수 있는 글'),
      card(128, 298, 600, 520),
      { t: 'text', x: 168, y: 330, w: 520, h: 36, text: '에이전트승인_검수결과_v1.md', size: 24, weight: 700, color: C.muted },
      { t: 'rect', x: 168, y: 380, w: 520, h: 2, fill: 'EADFE0' },
      ...[
        [400, '검수 항목', '출처를 열어 내용 일치 확인', null],
        [496, '발견', '"확인 없이 실행" 문장에 붙은 [A12]에는 그 내용이 없음', 'warn'],
        [628, '조치', '원문을 찾아 [A15]로 교체하고 범위를 좁힘', 'ok'],
      ].flatMap(([y, k, v, s]) => [
        { t: 'text', x: 168, y, w: 140, h: 36, text: k, size: 24, weight: 700, color: C.red },
        { t: 'text', x: 168, y: y + 38, w: 520, h: s === 'warn' ? 80 : 40, text: v, size: 26, weight: 400, color: C.ink, lh: 1.5 },
      ]),
      { t: 'rect', x: 168, y: 728, w: 150, h: 48, fill: 'FBE3E5', r: 24 },
      { t: 'text', x: 168, y: 734, w: 150, h: 36, text: 'v1 수정 필요', size: 24, weight: 700, color: C.red, align: 'center' },
      { t: 'rect', x: 334, y: 728, w: 150, h: 48, fill: 'E3F3EA', r: 24 },
      { t: 'text', x: 334, y: 734, w: 150, h: 36, text: 'v2 통과', size: 24, weight: 700, color: '1F7A4D', align: 'center' },
      { t: 'text', x: 128, y: 846, w: 700, h: 36, text: '2편 초안 검수 기록 · 출처 번호를 원문과 대조', size: 24, weight: 400, color: C.muted },
      ...[
        [300, 'search', '근거로 씁니다', '원문을 직접 연 자료만 출처로 붙입니다. 확인하지 못한 내용은 [확인 필요]로 남깁니다.'],
        [470, 'check', '같은 기준으로 검수합니다', '문체 가이드와 체크리스트로 매번 같은 품질을 점검하고, 검수 결과를 파일로 남깁니다.'],
        [640, 'user', '판단은 사람이 합니다', '내 관점과 발행 여부는 작성자가 정합니다. 기준 문서도 승인 없이 바꾸지 않습니다.'],
      ].flatMap(([y, ic, h, b]) => [
        { t: 'circle', x: 792, y, d: 72, fill: C.red },
        { t: 'icon', name: ic, x: 808, y: y + 16, s: 40 },
        { t: 'text', x: 892, y: y - 6, w: 900, h: 56, text: h, size: 40, weight: 700, color: C.ink },
        { t: 'text', x: 892, y: y + 56, w: 900, h: 90, text: b, size: 26, weight: 400, color: C.body, lh: 1.55 },
      ]),
      ...foot('04'),
    ],
  },
  // 5. 배운 것
  {
    bg: C.bg, notes: '직접 돌려 보며 세 가지를 배웠습니다. 규칙끼리 부딪히면 결과는 항상 실패로 나와서 검수 단계를 나눴습니다. 검색 결과 요약을 원문처럼 쓰면 출처가 틀려서, 출처 번호마다 원문을 대조하는 규칙을 넣었고 다음 버전에서 같은 오류를 하나 더 잡았습니다. 그리고 원문 확인, 내 관점, 발행 결정처럼 사람의 몫은 남겨 두도록 설계했습니다.',
    els: [
      ...head('04', '배운 것', '직접 돌려 보며 배운 세 가지'),
      ...[
        [128, '01', '규칙끼리 부딪히면\n늘 실패합니다', '초안에는 [확인 필요]를 남기라면서 검수는 0건을 요구했습니다. 초안 검수와 발행 전 검수로 나눴습니다.', false],
        [691, '02', '검색 요약은\n원문이 아닙니다', '요약에서 본 내용에 다른 문서 번호가 붙었습니다. 출처마다 원문을 대조하는 규칙을 넣자 다음 버전에서 하나를 더 잡았습니다.', true],
        [1254, '03', '사람의 몫은\n남겨 둡니다', 'PDF 원문 확인, 내 관점, 발행 결정은 에이전트가 대신하지 않도록 설계했습니다.', false],
      ].flatMap(([x, n, h, b, hot]) => [
        card(x, 298, 538, 452, hot),
        { t: 'text', x: x + 40, y: 330, w: 458, h: 92, text: n, size: 64, weight: 800, color: hot ? 'FBE3E5' : C.red },
        { t: 'text', x: x + 40, y: 420, w: 458, h: 112, text: h, size: 36, weight: 700, color: hot ? C.white : C.ink, lh: 1.4 },
        { t: 'text', x: x + 40, y: 548, w: 458, h: 180, text: b, size: 26, weight: 400, color: hot ? C.white : C.body, lh: 1.55 },
      ]),
      card(128, 790, 1664, 116),
      { t: 'rect', x: 128, y: 790, w: 10, h: 116, fill: C.red, r: 5 },
      { t: 'text', x: 184, y: 826, w: 1560, h: 46, text: '두 편 모두 v1은 수정 필요, v2에서 초안 검수를 통과했습니다. 실패를 기록하고 규칙으로 바꾼 결과입니다.', size: 28, weight: 700, color: C.ink },
      ...foot('05'),
    ],
  },
  // 6. 연락처
  {
    bg: C.red, notes: '감사합니다. 확인한 사실 위에서 기술을 설명하는 일을 하고 싶습니다. 연락처와 GitHub 주소를 남깁니다.',
    els: [
      { t: 'text', x: L, y: 364, w: 640, h: 44, text: '05 · 연락처', size: 30, weight: 700, color: C.white },
      { t: 'text', x: L - 6, y: 420, w: 660, h: 170, text: '감사합니다', size: 120, weight: 800, color: C.white },
      { t: 'text', x: L, y: 600, w: 640, h: 110, text: '확인한 사실 위에서\n기술을 설명하는 일을 하고 싶습니다.', size: 30, weight: 400, color: C.white, lh: 1.6 },
      { t: 'rect', x: 832, y: 254, w: 960, h: 540, fill: C.card, r: 36, shadow: true },
      ...[
        [312, '이름', '김지호', false],
        [430, '연락처', '010-8713-3332', false],
        [548, 'GitHub', 'github.com/JIHOSW/jiho-agent', true],
        [666, '프로젝트 폴더', 'jiho-agent / ai 블로그 자동화 에이전트', false],
      ].flatMap(([y, k, v, link]) => [
        { t: 'text', x: 888, y, w: 860, h: 36, text: k, size: 24, weight: 700, color: C.red },
        { t: 'text', x: 888, y: y + 38, w: 860, h: 50, text: v, size: 32, weight: link ? 400 : (k === '이름' ? 700 : 400), color: C.ink, link: link ? 'https://github.com/JIHOSW/jiho-agent' : undefined },
      ]),
      { t: 'text', x: L, y: 982, w: 900, h: 36, text: FOOT, size: 24, weight: 400, color: C.white },
      { t: 'text', x: R - 200, y: 982, w: 200, h: 36, text: '06', size: 24, weight: 400, color: C.white, align: 'right' },
    ],
  },
];

// 아이콘: 24 viewBox 선 아이콘 (흰색)
export const ICONS = {
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  check: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  user: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="m16 11 2 2 4-4"/>',
};
export const iconSvg = (name, px) => `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
