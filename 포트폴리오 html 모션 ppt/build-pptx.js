// 포트폴리오 모션 HTML(index.html)과 같은 내용으로 편집 가능한 PPT를 만든다.
// 프로젝트 문구는 index.html의 projects 배열을 그대로 읽어 와서 두 파일이 어긋나지 않게 한다.
// 실행: APPLY_THEME=<apply_theme.js 경로> node build-pptx.js [출력 경로]   (pptxgenjs 필요)
const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');

const DIR = __dirname;
const OUT = process.argv[2] || path.join(DIR, '김지호_입사지원_포트폴리오.pptx');
const IMG = n => path.join(DIR, 'assets', n + '.jpg');

/* ---- index.html에서 프로젝트 데이터 읽기 ---- */
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const src = html.slice(html.indexOf('const projects = ['), html.indexOf('/* 프로젝트 장 번호'));
const PAGES = 'https://jihosw.github.io/jiho-agent/';
const REPO = 'https://github.com/JIHOSW/jiho-agent/tree/main/';
const gh = p => REPO + encodeURI(p);
const projects = new Function('PAGES', 'gh', src + '; return projects;')(PAGES, gh);
const slideNo = i => 7 + i + projects.slice(0, i).filter(p => p.extra).length;
const AFTER = slideNo(projects.length);

/* ---- 테마 ---- */
const FONT = '맑은 고딕';
const THEME = {
  name: 'JIHO Portfolio', headFontFace: FONT, bodyFontFace: FONT,
  colors: {
    dk1: '18202F', lt1: 'FFFFFF', dk2: '4A5568', lt2: 'F4F7FC',
    accent1: '3F82EC', accent2: '1F56C8', accent3: 'DCE9FD', accent4: 'EEF4FE',
    accent5: '12B5A0', accent6: '8792A6', hlink: '1F56C8', folHlink: '163E96',
  },
};
const pres = new pptxgen();
pres.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 in
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.author = '김지호';
pres.title = '김지호 입사지원 포트폴리오';
const C = pres.SchemeColor;
const W = 13.333, H = 7.5, L = 0.6;
const INK = C.text1, INK2 = C.text2, MUTED = C.accent6, BLUE = C.accent1, BLUE_D = C.accent2, BLUE_L = C.accent3, BLUE_LL = C.accent4, WHITE = C.background1, BG = C.background2;

/* ---- 글자 폭 어림 (한글 1em, 그 밖 0.56em) ---- */
const textW = (s, pt) => [...s].reduce((a, ch) => a + (/[ㄱ-힝]/.test(ch) ? 1 : ch === ' ' ? 0.3 : 0.56), 0) * pt / 72;
const lines = (s, pt, w) => s.split('\n').reduce((a, seg) => a + Math.max(1, Math.ceil(textW(seg, pt) / (w * 0.93))), 0);
const lh = pt => pt * 1.42 / 72;

/* ---- 레이아웃 ---- */
pres.defineSlideMaster({
  title: 'CONTENT', background: { color: BG },
  objects: [
    { text: { text: 'KIM JIHO · PORTFOLIO', options: { x: W - 4.1, y: 0.28, w: 3.5, h: 0.3, fontSize: 10, bold: true, color: MUTED, align: 'right', charSpacing: 3, margin: 0 } } },
    { placeholder: { options: { name: 'label', type: 'body', x: 1.4, y: 0.42, w: 9, h: 0.3, fontSize: 12, bold: true, color: BLUE_D, margin: 0, valign: 'middle', align: 'left' }, text: '구분' } },
    { placeholder: { options: { name: 'title', type: 'title', x: 1.4, y: 0.7, w: 10.2, h: 0.6, fontSize: 28, bold: true, color: INK, margin: 0, valign: 'middle', align: 'left' }, text: '제목' } },
  ],
  slideNumber: { x: W - 1.1, y: H - 0.5, w: 0.5, h: 0.3, fontSize: 10, color: '8792A6', align: 'right' },
});
pres.defineSlideMaster({ title: 'PLAIN', background: { color: WHITE }, objects: [] });
pres.defineSlideMaster({ title: 'BLUE', background: { color: BLUE }, objects: [] });

/* ---- 그리기 도구 ---- */
const shadow = () => ({ type: 'outer', color: '1F3C78', opacity: 0.1, blur: 10, offset: 3, angle: 90 });
function card(s, x, y, w, h, o = {}) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: o.r ?? 0.14, fill: { color: o.fill || WHITE }, line: { color: o.line || 'E8EEF8', width: 0.75 }, shadow: o.noShadow ? undefined : shadow(), objectName: o.name || 'card' });
}
function txt(s, text, o) { s.addText(text, { isTextBox: true, margin: 0, fontFace: FONT, valign: 'top', ...o }); }
function circleNo(s, n, x, y, d = 0.55, o = {}) {
  s.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: o.fill || BLUE }, line: { color: o.fill || BLUE, width: 0 }, objectName: 'number' });
  txt(s, String(n), { x, y, w: d, h: d, fontSize: o.pt || 15, bold: true, color: o.color || WHITE, align: 'center', valign: 'middle' });
}
function chipRow(s, items, x, y, o = {}) {
  const pt = o.pt || 12, h = 0.36;
  for (const t of items) {
    const w = textW(t, pt) + 0.36;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: h / 2, fill: { color: o.dark ? INK : BLUE_LL }, line: { color: o.dark ? INK : BLUE_L, width: 0.75 }, objectName: 'chip' });
    txt(s, t, { x, y, w, h, fontSize: pt, bold: true, color: o.dark ? WHITE : BLUE_D, align: 'center', valign: 'middle' });
    x += w + 0.12;
  }
  return y + h;
}
function button(s, label, url, x, y, primary) {
  const pt = 13, h = 0.44, w = textW(label + ' ↗', pt) + 0.5;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, rectRadius: h / 2, fill: { color: primary ? BLUE : WHITE }, line: { color: primary ? BLUE : BLUE_L, width: 1.25 }, objectName: 'button' });
  txt(s, [{ text: label + ' ↗', options: { hyperlink: { url, tooltip: url } } }], { x, y, w, h, fontSize: pt, bold: true, color: primary ? WHITE : BLUE_D, align: 'center', valign: 'middle' });
  return x + w + 0.14;
}
function header(s, sec, label, title, back) {
  circleNo(s, sec, L, 0.5, 0.6, { pt: 15 });
  s.addText(label, { placeholder: 'label' });
  s.addText(title, { placeholder: 'title' });
  if (back) {
    const w = 1.75, x = W - L - w, y = 0.68;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h: 0.42, rectRadius: 0.21, fill: { color: WHITE }, line: { color: BLUE_L, width: 1.25 }, objectName: 'back' });
    txt(s, [{ text: '▦ 전체 작업물로', options: { hyperlink: { slide: 6, tooltip: '프로젝트 한눈에' } } }], { x, y, w, h: 0.42, fontSize: 12, bold: true, color: BLUE_D, align: 'center', valign: 'middle' });
  }
}
// 이미지 원본 크기(JPEG 머리에서 읽음). 틀 비율에 맞춰 위쪽 기준으로 잘라 넣는 데 쓴다.
const SIZES = {};
for (const f of fs.readdirSync(path.join(DIR, 'assets'))) {
  const b = fs.readFileSync(path.join(DIR, 'assets', f));
  let i = 2; while (i < b.length) { if (b[i] !== 0xFF) { i++; continue; } const m = b[i + 1]; if (m >= 0xC0 && m <= 0xC3) { SIZES[f.replace('.jpg', '')] = [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; break; } i += 2 + b.readUInt16BE(i + 2); }
}
function pic(s, img, x, y, w, h) {
  const [iw, ih] = SIZES[img], r = iw / ih;
  // 표시 상자 비율에 맞게 원본의 위쪽을 기준으로 잘라 넣는다
  let cw = w, ch = w / r;
  if (ch < h) { ch = h; cw = h * r; }
  s.addImage({ path: IMG(img), x, y, w: cw, h: ch, sizing: { type: 'crop', w, h, x: (cw - w) / 2, y: 0 }, altText: '작업물 화면' });
}
function frameImg(s, img, x, y, w, h, url) {
  const bar = url ? 0.3 : 0;
  s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, fill: { color: WHITE }, line: { color: 'D9E2F1', width: 0.75 }, shadow: shadow(), objectName: 'frame' });
  if (url) {
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h: bar, fill: { color: BLUE_LL }, line: { color: 'D9E2F1', width: 0.75 }, objectName: 'frame-bar' });
    ['F26B64', 'F5BD4F', '5CC55B'].forEach((c, k) => s.addShape(pres.shapes.OVAL, { x: x + 0.14 + k * 0.17, y: y + 0.1, w: 0.1, h: 0.1, fill: { color: c }, line: { color: c, width: 0 }, objectName: 'dot' }));
    txt(s, url, { x: x + 0.75, y: y + 0.04, w: w - 0.9, h: 0.22, fontSize: 10, color: MUTED, valign: 'middle' });
  }
  pic(s, img, x, y + bar, w, h - bar);
}
const ratio = img => SIZES[img][0] / SIZES[img][1];

/* ================= 슬라이드 ================= */
const sec = t => pres.addSection({ title: t });

// 1. 표지
sec('표지');
{
  const s = pres.addSlide({ masterName: 'PLAIN', sectionTitle: '표지' });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 2.55, fill: { color: BLUE }, line: { color: BLUE, width: 0 }, objectName: 'band' });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: L, y: 0.5, w: 0.42, h: 0.42, rectRadius: 0.1, fill: { color: WHITE }, line: { color: WHITE, width: 0 } });
  txt(s, 'J', { x: L, y: 0.5, w: 0.42, h: 0.42, fontSize: 16, bold: true, color: BLUE, align: 'center', valign: 'middle' });
  txt(s, 'JIHO KIM', { x: L + 0.58, y: 0.5, w: 3, h: 0.42, fontSize: 18, bold: true, color: WHITE, valign: 'middle' });
  txt(s, 'PORTFOLIO 2026', { x: L, y: 3.15, w: 6, h: 0.45, fontSize: 20, bold: true, color: BLUE });
  txt(s, [{ text: '김지호', options: { bold: true, breakLine: true } }, { text: '입사지원 포트폴리오' }], { x: L, y: 3.65, w: 6.6, h: 1.9, fontSize: 44, color: INK, lineSpacingMultiple: 1.1 });
  txt(s, '제품을 직접 배우고, 사용자가 활용할 수 있도록 설명합니다.', { x: L, y: 5.7, w: 6.8, h: 0.45, fontSize: 18, bold: true, color: INK });
  txt(s, '2026.11', { x: W - L - 2, y: H - 0.85, w: 2, h: 0.4, fontSize: 16, bold: true, color: INK, align: 'right' });
  // 대표 작업물 세 장을 겹쳐 보여 준다
  [['onboarding', 7.6, 1.35, -4], ['b2b', 9.55, 2.2, 3], ['support', 8.2, 3.55, -1]].forEach(([img, x, y, rot]) => {
    const w = 4.1, h = w / 1.6;
    s.addShape(pres.shapes.RECTANGLE, { x, y, w, h, rotate: rot, fill: { color: WHITE }, line: { color: 'D9E2F1', width: 0.75 }, shadow: shadow(), objectName: 'cover-frame' });
    const [iw, ih] = SIZES[img]; const cw = w - 0.1, ch = Math.max((w - 0.1) * ih / iw, h - 0.1);
    s.addImage({ path: IMG(img), x: x + 0.05, y: y + 0.05, w: cw, h: ch, rotate: rot, sizing: { type: 'crop', w: w - 0.1, h: h - 0.1, x: 0, y: 0 }, altText: '대표 작업물 화면' });
  });
}

// 2. 목차
sec('소개');
{
  const s = pres.addSlide({ masterName: 'PLAIN', sectionTitle: '소개' });
  s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: 5.2, h: H, fill: { color: BLUE }, line: { color: BLUE, width: 0 }, objectName: 'panel' });
  txt(s, 'Contents', { x: L + 0.2, y: 1.1, w: 4.3, h: 0.9, fontSize: 44, bold: true, color: WHITE });
  txt(s, '기술지원과 IT 사업관리, 사용자 교육 경험을 바탕으로 만든 AI 에이전트와 업무용 발표자료, 웹 앱을 차례로 소개합니다.', { x: L + 0.2, y: 2.3, w: 3.9, h: 1.6, fontSize: 15, color: WHITE, lineSpacingMultiple: 1.3 });
  const items = [['01', '소개', '한눈에 보기', 3], ['02', '경력과 역량', '경력 · 기술 · 교육', 4], ['03', '프로젝트', `작업물 ${projects.length}개`, 6], ['04', '일하는 방식', '작업물에 공통으로 넣은 원칙', AFTER], ['05', '마무리', '연락처', AFTER + 1]];
  items.forEach(([n, t, sub, go], k) => {
    const y = 1.2 + k * 1.02, x = 6.0, w = W - x - 0.9;
    txt(s, n, { x, y, w: 0.7, h: 0.8, fontSize: 16, bold: true, color: BLUE, valign: 'middle' });
    txt(s, [{ text: t, options: { hyperlink: { slide: go, tooltip: t } } }], { x: x + 0.8, y, w: 2.6, h: 0.8, fontSize: 22, bold: true, color: INK, valign: 'middle' });
    txt(s, sub, { x: x + 3.4, y, w: w - 3.4, h: 0.8, fontSize: 13, color: MUTED, align: 'right', valign: 'middle' });
    s.addShape(pres.shapes.LINE, { x, y: y + 0.9, w, h: 0, line: { color: 'DDE5F2', width: 1 }, objectName: 'divider' });
  });
}

// 3. 한눈에 보기
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '소개' });
  header(s, '01', '소개', '배운 것을 사용자의 언어로 옮기는 사람입니다');
  txt(s, [{ text: '서버·솔루션 지원과 공공기관 IT 사업관리, 사용자 교육을 경험했습니다. 지금은 그 경험을 바탕으로 ' }, { text: 'AI 에이전트', options: { bold: true, color: INK } }, { text: '와 ' }, { text: '업무용 발표자료', options: { bold: true, color: INK } }, { text: '를 직접 만들며 학습하고 있습니다.' }],
    { x: L, y: 1.65, w: 11.5, h: 0.85, fontSize: 17, color: INK2, lineSpacingMultiple: 1.25 });
  const st = [['300', '명', '사용자 교육', '각 지방소 이용자 약 300명에게 시스템 교육과 기능 시연을 진행했습니다.'], ['44', '장', '교육자료', '교육자료 44장과 발표 대본을 직접 작성했습니다.'], [String(projects.length), '개', '작업물', 'AI 에이전트, 발표자료, 웹 앱, 팀 프로젝트, 실무 산출물을 담았습니다.'], ['2', '개사', 'IT 실무 경력', '솔루션 기술지원과 공공 IT 사업관리(PL·PMO 실무)를 경험했습니다.']];
  const cw = (W - 2 * L - 3 * 0.3) / 4;
  st.forEach(([n, u, h3, p], k) => {
    const x = L + k * (cw + 0.3), y = 2.75;
    card(s, x, y, cw, 3.05);
    txt(s, [{ text: n, options: { fontSize: 50, bold: true } }, { text: ' ' + u, options: { fontSize: 20, bold: true } }], { x: x + 0.3, y: y + 0.3, w: cw - 0.6, h: 0.95, color: BLUE_D, valign: 'bottom' });
    txt(s, h3, { x: x + 0.3, y: y + 1.45, w: cw - 0.6, h: 0.4, fontSize: 16, bold: true, color: INK });
    txt(s, p, { x: x + 0.3, y: y + 1.9, w: cw - 0.6, h: 1.0, fontSize: 14, color: INK2, lineSpacingMultiple: 1.2 });
  });
  txt(s, '관심 분야', { x: L, y: 6.2, w: 1.1, h: 0.36, fontSize: 12, bold: true, color: MUTED, valign: 'middle' });
  chipRow(s, ['AI·SaaS 제품의 도입과 활용 지원', '고객 온보딩과 사용자 교육', 'AI를 활용한 자료 제작', 'AX 교육 · IT 사업운영'], L + 1.15, 6.2);
}

// 4. 경력
sec('경력과 역량');
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '경력과 역량' });
  header(s, '02', '경력과 역량', '고객 문의 대응에서 사업관리, 사용자 교육까지');
  const cols = [
    { yr: '2024', h: '엔엔소프트', h4: '솔루션지원팀', li: ['Linux 서버 관리·구축·고도화', 'Oracle DB 설치·운영', '고객 기술 문의 대응과 시스템 사용 안내'], w: 3.5 },
    { yr: '2025 – 2026', h: '아이리스닷넷', h4: 'IT 사업관리 및 사용자 교육', li: ['국립문화유산연구원 사업의 일정관리, 고객 요청 정리, 개발자 협의, 테스트·검수와 보고 등 PL·PMO 실무', 'RFP 분석, 제안서 작업과 산출물 정리, 고객 미팅 참여', '교육자료 44장과 발표 대본 작성, 이용자 약 300명 대상 교육과 시연', '테스트 이슈를 엑셀과 오류 화면 캡처로 정리해 PM·개발자와 공유'], w: 4.9 },
    { yr: '2026.10 – 2027.01', h: 'L.L.M Academy', h4: 'CJ올리브네트웍스 · AX 과정', li: ['수강 중 (수료 예정)', 'AI 에이전트와 업무 자동화 실습', '이 포트폴리오의 AI 작업물을 이 시기에 제작'], w: 3.13, now: 1 },
  ];
  const ty = 1.95;
  s.addShape(pres.shapes.LINE, { x: L, y: ty, w: W - 2 * L, h: 0, line: { color: BLUE, width: 2.5 }, objectName: 'timeline' });
  let x = L;
  for (const c of cols) {
    const y = 2.35, h = 4.55;
    s.addShape(pres.shapes.OVAL, { x: x + 0.25, y: ty - 0.12, w: 0.24, h: 0.24, fill: { color: WHITE }, line: { color: BLUE, width: 4 }, objectName: 'timeline-dot' });
    card(s, x, y, c.w, h, c.now ? { fill: BLUE, line: BLUE } : {});
    const fg = c.now ? WHITE : INK, sub = c.now ? BLUE_L : MUTED, body = c.now ? WHITE : INK2;
    txt(s, c.yr, { x: x + 0.3, y: y + 0.3, w: c.w - 0.6, h: 0.3, fontSize: 13, bold: true, color: c.now ? BLUE_L : BLUE_D });
    txt(s, c.h, { x: x + 0.3, y: y + 0.62, w: c.w - 0.6, h: 0.5, fontSize: 21, bold: true, color: fg });
    txt(s, c.h4, { x: x + 0.3, y: y + 1.12, w: c.w - 0.6, h: 0.35, fontSize: 13, bold: true, color: sub });
    txt(s, c.li.map((t, k) => ({ text: t, options: { bullet: { indent: 14 }, breakLine: k < c.li.length - 1, paraSpaceAfter: 6 } })), { x: x + 0.3, y: y + 1.6, w: c.w - 0.55, h: h - 1.8, fontSize: 14, color: body, lineSpacingMultiple: 1.15 });
    x += c.w + 0.3;
  }
}

// 5. 역량
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '경력과 역량' });
  header(s, '02', '경력과 역량', '실무, 개발, AI 활용을 함께 다룹니다');
  const sk = [['실무', '현장에서 맡아 온 일', ['Linux', 'Oracle DB', '고객 기술지원', '사용자 교육', '테스트·검수', 'IT 사업관리'], 1], ['개발', '교육 과정과 프로젝트에서 사용', ['Java', 'JSP', 'Spring', 'Oracle', 'MySQL', '전자정부 표준프레임워크'], 0], ['AI 활용', '작업물 제작에 사용', ['Claude', 'ChatGPT', 'Gemini', 'AI 에이전트 제작', 'HTML 모션 발표자료'], 0]];
  const cw = (W - 2 * L - 2 * 0.3) / 3;
  sk.forEach(([h3, p, items, dark], k) => {
    const x = L + k * (cw + 0.3), y = 1.6, h = 2.7;
    card(s, x, y, cw, h);
    circleNo(s, k + 1, x + 0.3, y + 0.3, 0.42, { fill: BLUE_LL, color: BLUE_D, pt: 13 });
    txt(s, h3, { x: x + 0.85, y: y + 0.3, w: cw - 1.1, h: 0.42, fontSize: 17, bold: true, color: INK, valign: 'middle' });
    txt(s, p, { x: x + 0.3, y: y + 0.82, w: cw - 0.6, h: 0.3, fontSize: 12, color: MUTED });
    // 칩을 여러 줄로 배치
    let cx = x + 0.3, cy = y + 1.25;
    for (const t of items) { const w = textW(t, 12) + 0.48; if (cx + w > x + cw - 0.25) { cx = x + 0.3; cy += 0.46; } chipRow(s, [t], cx, cy, { dark }); cx += w; }
  });
  const ey = 4.55, eh = 2.4;
  card(s, L, ey, 7.3, eh);
  txt(s, '교육', { x: L + 0.35, y: ey + 0.25, w: 3, h: 0.35, fontSize: 15, bold: true, color: BLUE_D });
  const edu = [['2026.10 – 2027.01', 'CJ올리브네트웍스 L.L.M Academy', ' · AX 과정 (수강 중)'], ['2023.07 – 2024.02', '대덕인재개발원', ' · 전자정부 표준프레임워크 기반 풀스택 개발자 과정'], ['전문학사', '컴퓨터네트워크 전공 졸업', '']];
  s.addTable(edu.map(r => [{ text: r[0], options: { color: MUTED } }, { text: [{ text: r[1], options: { bold: true, color: INK } }, { text: r[2], options: { color: INK2 } }] }]),
    { x: L + 0.35, y: ey + 0.75, w: 6.6, colW: [1.85, 4.75], fontSize: 13, fontFace: FONT, rowH: 0.48, valign: 'middle', border: { type: 'solid', pt: 0.75, color: 'DDE5F2' }, margin: 0.04 });
  const cx2 = L + 7.6, cw2 = W - L - cx2;
  card(s, cx2, ey, cw2, eh);
  txt(s, '자격증', { x: cx2 + 0.35, y: ey + 0.25, w: 3, h: 0.35, fontSize: 15, bold: true, color: BLUE_D });
  s.addTable([['SQLD', 'SQL 개발자'], ['ADsP', '데이터분석 준전문가'], ['네트워크관리사 2급', '']].map(r => [{ text: r[0], options: { bold: true, color: INK } }, { text: r[1], options: { color: INK2 } }]),
    { x: cx2 + 0.35, y: ey + 0.75, w: cw2 - 0.7, colW: [2.1, cw2 - 2.8], fontSize: 13, fontFace: FONT, rowH: 0.48, valign: 'middle', border: { type: 'solid', pt: 0.75, color: 'DDE5F2' }, margin: 0.04 });
}

// 6. 프로젝트 한눈에
sec('프로젝트');
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '프로젝트' });
  header(s, '03', '프로젝트', `작업물 ${projects.length}개를 한눈에`);
  const cols = 4, gap = 0.25, cw = (W - 2 * L - (cols - 1) * gap) / cols, ch = 1.55, y0 = 1.55;
  projects.forEach((p, i) => {
    const x = L + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
    card(s, x, y, cw, ch, { r: 0.1 });
    pic(s, p.vis.img, x + 0.04, y + 0.04, cw - 0.08, 0.8);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x + 0.12, y: y + 0.12, w: textW(String(i + 1).padStart(2, '0') + ' · ' + p.cat, 10) + 0.26, h: 0.26, rectRadius: 0.13, fill: { color: BLUE }, line: { color: BLUE, width: 0 }, objectName: 'tag' });
    txt(s, String(i + 1).padStart(2, '0') + ' · ' + p.cat, { x: x + 0.12, y: y + 0.12, w: textW(String(i + 1).padStart(2, '0') + ' · ' + p.cat, 10) + 0.26, h: 0.26, fontSize: 10, bold: true, color: WHITE, align: 'center', valign: 'middle' });
    txt(s, [{ text: p.title, options: { hyperlink: { slide: slideNo(i), tooltip: p.title + ' 장으로' } } }], { x: x + 0.18, y: y + 0.9, w: cw - 0.3, h: 0.34, fontSize: textW(p.title, 13) > cw - 0.4 ? 11.5 : 13, bold: true, color: INK });
    txt(s, p.short, { x: x + 0.18, y: y + 1.2, w: cw - 0.3, h: 0.26, fontSize: 10.5, color: MUTED });
  });
  const i = projects.length, x = L + (i % cols) * (cw + gap), y = y0 + Math.floor(i / cols) * (ch + gap);
  card(s, x, y, cw, ch, { fill: BLUE, line: BLUE, r: 0.1 });
  txt(s, String(projects.length), { x: x + 0.3, y: y + 0.25, w: cw - 0.6, h: 0.65, fontSize: 36, bold: true, color: WHITE });
  txt(s, '제목을 누르면 해당 장으로 이동합니다.', { x: x + 0.3, y: y + 0.9, w: cw - 0.6, h: 0.55, fontSize: 12, color: WHITE });
  txt(s, 'AI·HTML 프로젝트는 개인 학습·실습 작업물이며, 등장하는 고객사와 데이터는 가상입니다.', { x: L, y: H - 0.5, w: 9, h: 0.3, fontSize: 10, color: MUTED, valign: 'middle' });
}

// 7~. 프로젝트 장
const LAYOUT_REPORT = [];
function projectSlide(p, num, label, title) {
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '프로젝트' });
  header(s, num, label, title, true);
  const cw = 6.45;
  let y = 1.6;
  const subH = lines(p.sub, 15, cw) * lh(15);
  txt(s, p.sub, { x: L, y, w: cw, h: subH + 0.05, fontSize: 15, bold: true, color: INK2, lineSpacingMultiple: 1.15 });
  y += subH + 0.18;
  p.pts.forEach(([h4, body], k) => {
    const tw = cw - 0.9, bh = lines(body, 14, tw) * lh(14), hh = lh(15), ch = 0.15 + hh + 0.02 + bh + 0.15;
    card(s, L, y, cw, ch, { r: 0.12 });
    circleNo(s, k + 1, L + 0.18, y + 0.15, 0.36, { pt: 12 });
    txt(s, h4, { x: L + 0.7, y: y + 0.14, w: tw, h: hh, fontSize: 15, bold: true, color: INK, valign: 'middle' });
    txt(s, body, { x: L + 0.7, y: y + 0.15 + hh + 0.02, w: tw, h: bh, fontSize: 14, color: INK2, lineSpacingMultiple: 1.15 });
    y += ch + 0.12;
  });
  LAYOUT_REPORT.push([title, (y - 0.12).toFixed(2)]);
  if (p.note) txt(s, p.note, { x: L, y: H - 0.48, w: 10, h: 0.3, fontSize: 10, color: MUTED, valign: 'middle' });

  // 오른쪽: 아래에서부터 버튼, 칩을 놓고 남은 높이에 화면을 넣는다
  const vx = 7.4, vw = W - L - vx, bottom = 6.95;
  const rows = []; let row = [], rw = 0;
  for (const t of p.chips) { const w = textW(t, 12) + 0.48; if (rw + w > vw && row.length) { rows.push(row); row = []; rw = 0; } row.push(t); rw += w; }
  rows.push(row);
  const by = bottom - 0.44, cy0 = by - 0.18 - rows.length * 0.46 + 0.1;
  rows.forEach((r, k) => chipRow(s, r, vx, cy0 + k * 0.46));
  let bx = vx; p.links.forEach(([lb, url], k) => { bx = button(s, lb, url, bx, by, k === 0); });
  const v = p.vis, vy = 1.55, vh = cy0 - 0.25 - vy;
  if (v.type === 'phone') {
    const ph = vh, pw = ph * 0.47, px = vx + (vw - pw) / 2;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: px, y: vy, w: pw, h: ph, rectRadius: 0.3, fill: { color: INK }, line: { color: INK, width: 0 }, shadow: shadow(), objectName: 'phone' });
    pic(s, v.img, px + 0.09, vy + 0.09, pw - 0.18, ph - 0.18);
  } else if (v.type === 'solo') {
    const bar = v.plain ? 0 : 0.3, fh = Math.min(vh, vw / ratio(v.img) + bar), fw = Math.min(vw, (fh - bar) * ratio(v.img));
    frameImg(s, v.img, vx, vy, fw, fh, v.plain ? null : v.url);
  } else {
    const bar = v.plain ? 0 : 0.3, w2 = v.w2 ? 2.0 : 2.5, h2 = w2 / ratio(v.img2);
    const fh = Math.min(vh - h2 * 0.45, (vw - 0.5) / ratio(v.img) + bar), fw = (fh - bar) * ratio(v.img);
    frameImg(s, v.img, vx, vy, fw, fh, v.plain ? null : v.url);
    frameImg(s, v.img2, W - L - w2, vy + vh - h2, w2, h2, null);
  }
  return s;
}
projects.forEach((p, i) => {
  const num = String(i + 1).padStart(2, '0');
  projectSlide(p, num, `프로젝트 · ${p.cat}`, p.title);
  if (p.extra) projectSlide(p.extra, num, p.extra.label, p.extra.h);
});

// 일하는 방식
sec('일하는 방식');
{
  const s = pres.addSlide({ masterName: 'CONTENT', sectionTitle: '일하는 방식' });
  header(s, '04', '일하는 방식', '작업물마다 공통으로 넣은 네 가지 원칙');
  const pr = [
    ['근거가 없으면 추측하지 않습니다', [['티켓 에이전트는 '], ['KB 일치도 50% 이상', 1], ['일 때만 답하고, 블로그 에이전트는 '], ['[확인 필요]', 1], ['를 남기며, 제안서의 모르는 숫자는 '], ['빨간 빈칸', 1], ['으로 둡니다.']]],
    ['밖으로 나가는 일은 사람이 승인합니다', [['고객에게 보내는 답변과 메일, 설정 변경, 개발 이슈 등록, 글 발행은 모두 '], ['사람이 확인한 뒤', 1], [' 실행되도록 설계했습니다.']]],
    ['직접 돌려 보고 고칩니다', [['온보딩 에이전트는 실제 실행에서 드러난 '], ['문제 6가지', 1], ['를 원칙으로 보완했고, 티켓 에이전트는 배포 후 '], ['Clarity 녹화', 1], ['를 보고 시작 버튼과 측정 이벤트를 넣었습니다.']]],
    ['범위와 한계를 먼저 밝힙니다', [['가상 데이터, 규칙 기반 동작, 실습용 비공식 자료라는 점을 화면과 문서에 적었습니다. '], ['만든 것과 만들지 않은 것', 1], ['을 구분해 설명합니다.']]],
  ];
  const cw = (W - 2 * L - 0.3) / 2, chh = 2.45;
  pr.forEach(([h3, runs], k) => {
    const x = L + (k % 2) * (cw + 0.3), y = 1.65 + Math.floor(k / 2) * (chh + 0.3);
    card(s, x, y, cw, chh);
    txt(s, String(k + 1), { x: x + 0.35, y: y + 0.3, w: 0.8, h: 0.9, fontSize: 48, bold: true, color: BLUE_L });
    txt(s, h3, { x: x + 1.25, y: y + 0.35, w: cw - 1.5, h: 0.45, fontSize: 17, bold: true, color: INK });
    txt(s, runs.map(([t, b]) => ({ text: t, options: b ? { bold: true, color: BLUE_D } : {} })), { x: x + 1.25, y: y + 0.95, w: cw - 1.5, h: 1.3, fontSize: 14, color: INK2, lineSpacingMultiple: 1.25 });
  });
}

// 마무리
sec('마무리');
{
  const s = pres.addSlide({ masterName: 'BLUE', sectionTitle: '마무리' });
  txt(s, '감사합니다', { x: L + 0.2, y: 1.0, w: 8, h: 1.1, fontSize: 54, bold: true, color: WHITE });
  txt(s, '제품을 먼저 배우고, 고객과 사용자가 실제로 쓸 수 있을 때까지\n설명하고 지원하는 일을 하고 싶습니다.', { x: L + 0.2, y: 2.3, w: 9, h: 0.95, fontSize: 18, color: WHITE, lineSpacingMultiple: 1.3 });
  const ct = [['NAME', '김지호', null, 2.6], ['PHONE', '010-8713-3332', 'tel:010-8713-3332', 3.1], ['EMAIL', 'ghdignsdl5@gmail.com', 'mailto:ghdignsdl5@gmail.com', 3.9], ['GITHUB', 'github.com/JIHOSW/jiho-agent', 'https://github.com/JIHOSW/jiho-agent', 5.0]];
  let x = L + 0.2, y = 3.65;
  ct.forEach(([k, v, url, w], i) => {
    if (i === 3) { x = L + 0.2; y += 1.25; }
    card(s, x, y, w, 1.05, { noShadow: true, line: WHITE });
    txt(s, k, { x: x + 0.3, y: y + 0.2, w: w - 0.5, h: 0.28, fontSize: 11, bold: true, color: BLUE_D, charSpacing: 2 });
    txt(s, url ? [{ text: v, options: { hyperlink: { url } } }] : v, { x: x + 0.3, y: y + 0.5, w: w - 0.4, h: 0.4, fontSize: 16, bold: true, color: INK });
    x += w + 0.2;
  });
  txt(s, 'AI·HTML 프로젝트는 개인 학습과 실습을 위한 작업물이며, 관련 기업의 공식 서비스나 공식 제안서가 아닙니다. 학습과 경력 정보는 2026년 11월 기준입니다.', { x: L + 0.2, y: H - 0.85, w: 11, h: 0.5, fontSize: 11, color: WHITE });
}

(async () => {
  await pres.writeFile({ fileName: OUT });
  // 테마 색을 파일에 써 넣는다(pptx 스킬의 apply_theme.js). 없으면 Office 기본 색으로 보이므로 경로를 지정해 실행한다.
  try { const { applyTheme } = require(process.env.APPLY_THEME || './apply_theme.js'); await applyTheme(OUT, THEME); }
  catch (e) { console.warn('테마 적용 생략:', e.message); }
  console.log('slides', pres.slides.length, '→', OUT);
  console.log('프로젝트 장 왼쪽 열 끝(in, 한도 6.9):', LAYOUT_REPORT.map(r => r.join(' ')).join(' | '));
})();
