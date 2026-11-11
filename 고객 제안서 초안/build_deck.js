// 대현테크 제안서 초안 생성 스크립트 (pptxgenjs)
// 실행: node build_deck.js  →  대현테크_제안서_초안.pptx
const path = require("path");
const pptxgen = require("pptxgenjs");
const { applyTheme } = require(process.env.PPTX_SKILL_DIR + "/scripts/apply_theme.js");

const FONT = "Malgun Gothic";
const THEME = {
  name: "Daehyun Proposal",
  headFontFace: FONT,
  bodyFontFace: FONT,
  colors: {
    dk1: "1B2B38", lt1: "FFFFFF", dk2: "1F3A4D", lt2: "EEF3F6",
    accent1: "1F3A4D", accent2: "F2A541", accent3: "5B7C8F",
    accent4: "DCE6EC", accent5: "8FA9B8", accent6: "D62828",
    hlink: "1F3A4D", folHlink: "5B7C8F",
  },
};
const RED = "D62828";
const HEX = { navy: "1F3A4D", amber: "F2A541", slate: "5B7C8F", pale: "DCE6EC", light: "EEF3F6", ink: "1B2B38" };

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9"; // 10 x 5.625
pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
pres.title = "대현테크 공장 간 운송 개선 제안 (초안)";
const C = pres.SchemeColor;

// ---- [ ] 빈칸을 빨간 굵은 글씨로 나누는 함수 ----
function runs(text, base = {}) {
  const out = [];
  const re = /\[[^\]]*\]/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ text: text.slice(last, m.index), options: { ...base } });
    out.push({ text: m[0], options: { ...base, color: RED, bold: true } });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), options: { ...base } });
  return out;
}
// 글머리표 없는 여러 줄 (줄 끝 run에만 breakLine)
function plainLines(lines, base = {}) {
  const out = [];
  lines.forEach((ln, i) => {
    const r = runs(ln, base);
    if (i < lines.length - 1) r[r.length - 1].options = { ...r[r.length - 1].options, breakLine: true };
    out.push(...r);
  });
  return out;
}
// 여러 줄 글머리표: 글머리표 설정은 텍스트 상자 쪽에서 (bodyBox)
function bullets(lines, base = {}) {
  const out = plainLines(lines, base);
  // 줄의 첫 run에만 글머리표 (pptxgenjs는 bullet이 붙은 run에서 새 문단을 시작함)
  let start = true;
  out.forEach((r) => {
    if (start) r.options = { ...r.options, bullet: { indent: 14 }, paraSpaceAfter: 8 };
    start = !!r.options.breakLine;
  });
  return out;
}

// ---- 레이아웃 ----
pres.defineSlideMaster({
  title: "DARK",
  background: { color: C.text2 },
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.7, y: 1.5, w: 8.6, h: 1.3, fontSize: 32, bold: true, color: C.background1, valign: "bottom", align: "left", fontFace: FONT }, text: "" } },
    { placeholder: { options: { name: "body", type: "body", x: 0.7, y: 2.95, w: 8.6, h: 1.6, fontSize: 16, color: C.accent4, valign: "top", fontFace: FONT }, text: "" } },
  ],
});
pres.defineSlideMaster({
  title: "CONTENT",
  background: { color: C.background1 },
  margin: [0.5, 0.5, 0.5, 0.5],
  objects: [
    { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.75, w: 9.0, h: 0.75, fontSize: 24, bold: true, color: C.text2, valign: "middle", fontFace: FONT }, text: "" } },
    { text: { text: "대현테크 운송 개선 제안 · 초안", options: { x: 0.5, y: 5.2, w: 5, h: 0.3, fontSize: 9, color: C.accent3, fontFace: FONT } } },
  ],
  slideNumber: { x: 9.0, y: 5.2, w: 0.5, h: 0.3, fontSize: 9, color: "5B7C8F", align: "right" },
});

// 단계 꼬리표 (왜 지금 / 무엇을 ...)
function tag(slide, label, chapter) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y: 0.35, w: 1.55, h: 0.34, fill: { color: C.accent2 }, line: { color: C.accent2 }, rectRadius: 0.08, objectName: "stage-tag" });
  slide.addText(`${chapter}장 · ${label}`, { x: 0.5, y: 0.35, w: 1.55, h: 0.34, fontSize: 11, bold: true, color: C.text2, align: "center", valign: "middle", margin: 0, isTextBox: true, objectName: "stage-tag-text" });
}
function content(sectionTitle, stage, chapter, title) {
  const s = pres.addSlide({ masterName: "CONTENT", sectionTitle });
  tag(s, stage, chapter);
  s.addText(title, { placeholder: "title" });
  return s;
}
function bodyBox(slide, lines, pos) {
  slide.addText(bullets(lines, { fontSize: 14, color: C.text1 }), { ...pos, valign: "top", isTextBox: true, objectName: "body-lines" });
}
function card(slide, x, y, w, h, fill, name) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: fill }, rectRadius: 0.1, objectName: name });
}
function label(slide, text, pos, opts = {}) {
  slide.addText(runs(text, { fontSize: opts.fontSize || 13, color: opts.color || C.text1, bold: !!opts.bold }), { ...pos, align: opts.align || "center", valign: "middle", margin: 0.05, isTextBox: true, objectName: opts.name || "label" });
}

// ================= 1. 표지 =================
pres.addSection({ title: "표지" });
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: "표지" });
  s.addText("평택 1·2공장 운송비, 2공장 가동 전에 잡겠습니다", { placeholder: "title" });
  s.addText(plainLines(["대현테크 공장 간 운송 개선 제안 (초안)", "[우리 회사명: 확인 필요] · [제안 날짜: 확인 필요]"]), { placeholder: "body" });
  s.addShape(pres.shapes.OVAL, { x: 0.7, y: 0.8, w: 0.45, h: 0.45, fill: { color: C.accent2 }, line: { color: C.accent2 }, objectName: "cover-dot" });
  s.addNotes(
`오늘 자리 마련해 주셔서 감사합니다.
지난번 미팅에서 O과장님, 김대리님께서 말씀해 주신 내용을 바탕으로 정리한 제안입니다.
핵심은 하나입니다. 3분기에 오른 운송비를, 2공장이 가동되기 전에 잡아두자는 것입니다.
순서는 왜 지금 해야 하는지, 무엇을 하는지, 얼마나 줄어드는지, 어떻게 진행하는지, 마지막으로 왜 저희인지로 말씀드리겠습니다.`);
}

// ================= 2. 1장 운송비 18% =================
pres.addSection({ title: "왜 지금" });
{
  const s = content("왜 지금", "왜 지금", 1, "운송비가 18%나 올랐는데, 왜 그런 거예요?");
  card(s, 0.5, 1.75, 3.0, 3.1, HEX.light, "stat-card");
  label(s, "18%", { x: 0.5, y: 2.05, w: 3.0, h: 1.3 }, { fontSize: 60, bold: true, color: C.text2, name: "stat-number" });
  label(s, "3분기 운송비 상승 (고객 말씀)", { x: 0.5, y: 3.4, w: 3.0, h: 0.4 }, { fontSize: 12, color: C.accent3 });
  label(s, "[분기별 운송비 그래프: 확인 필요]", { x: 0.7, y: 3.95, w: 2.6, h: 0.6 }, { fontSize: 11 });
  bodyBox(s, [
    "3분기 운송비 18% 상승, 팀장님께서 원가 절감을 지시하신 상황",
    "상승 원인: [물량 증가 / 단가 인상 / 동선 문제: 확인 필요]",
    "원인을 나눠 봐야 줄일 곳이 보입니다 → [3분기 운송 내역: 확인 필요]",
  ], { x: 3.9, y: 1.85, w: 5.6, h: 2.9 });
  s.addNotes(
`먼저 왜 지금인지입니다.
과장님께서 3분기 운송비가 18% 올랐고, 팀장님께서 원가를 줄이라고 하셨다고 말씀해 주셨습니다.
다만 18%가 물량이 늘어서인지, 단가가 올라서인지, 동선 문제인지는 아직 저희가 모릅니다.
3분기 운송 내역을 주시면 원인을 나눠서 보여드리겠습니다. 원인을 알아야 어디를 줄일지 정할 수 있습니다.
(확인할 것: 3분기 운송 내역 공유 가능 여부, 분기별 운송비 자료)`);
}

// ================= 3. 2장 2공장 =================
{
  const s = content("왜 지금", "왜 지금", 2, "2공장 돌아가면 더 늘 텐데, 지금 손써야 하나요?");
  // 공장 그림
  card(s, 0.6, 2.0, 1.6, 1.0, C.text2, "plant1");
  label(s, "1공장", { x: 0.6, y: 2.0, w: 1.6, h: 1.0 }, { fontSize: 16, bold: true, color: C.background1 });
  card(s, 3.2, 2.0, 1.6, 1.0, C.accent3, "plant2");
  label(s, "2공장", { x: 3.2, y: 2.0, w: 1.6, h: 1.0 }, { fontSize: 16, bold: true, color: C.background1 });
  s.addShape(pres.shapes.LINE, { x: 2.3, y: 2.35, w: 0.8, h: 0, line: { color: C.accent2, width: 3, endArrowType: "triangle" }, objectName: "arrow-go" });
  s.addShape(pres.shapes.LINE, { x: 2.3, y: 2.65, w: 0.8, h: 0, line: { color: C.accent2, width: 3, beginArrowType: "triangle" }, objectName: "arrow-back" });
  label(s, "왕복 [늘어날 횟수: 확인 필요]", { x: 0.6, y: 3.2, w: 4.2, h: 0.45 }, { fontSize: 12 });
  label(s, "2공장 가동 [내년 3월 예정, 확정 여부: 확인 필요]", { x: 0.6, y: 3.7, w: 4.2, h: 0.45 }, { fontSize: 12 });
  bodyBox(s, [
    "2공장이 가동되면 1·2공장 왕복이 늘어납니다 (고객 말씀)",
    "지금 대비하지 않으면 오른 운송비에 늘어난 왕복이 더해집니다",
    "3월 전에 준비를 끝낼 수 있는 일정으로 짰습니다 (6장)",
  ], { x: 5.2, y: 1.85, w: 4.3, h: 2.9 });
  s.addNotes(
`두 번째는 2공장입니다.
2공장이 내년 3월에 가동되면 1·2공장 왕복이 더 늘 거라고 말씀하셨습니다.
지금도 운송비가 오른 상태인데, 여기에 왕복까지 늘어나면 부담은 더 커집니다.
그래서 2공장이 돌아가기 전에 운송 방식을 정리해 두는 게 좋겠다고 봤습니다. 일정은 6장에서 자세히 말씀드리겠습니다.
(확인할 것: 3월 가동이 확정인지, 왕복이 얼마나 늘어날지 예상치)`);
}

// ================= 4. 3장 해결 방법 =================
pres.addSection({ title: "무엇을" });
{
  const s = content("무엇을", "무엇을", 3, "그래서 뭘 해주신다는 거예요?");
  const steps = [
    ["① 동선 진단", "2주 · 무료"],
    ["② 시범 운영", "3개월"],
    ["③ 매주 보고", "결과를 숫자로"],
  ];
  steps.forEach(([h, sub], i) => {
    const x = 0.5 + i * 3.1;
    card(s, x, 1.8, 2.8, 1.15, i === 0 ? HEX.amber : HEX.light, `step-${i + 1}`);
    label(s, h, { x, y: 1.88, w: 2.8, h: 0.55 }, { fontSize: 17, bold: true, color: C.text2 });
    label(s, sub, { x, y: 2.4, w: 2.8, h: 0.45 }, { fontSize: 13, color: C.text1 });
    if (i < 2) s.addShape(pres.shapes.LINE, { x: x + 2.83, y: 2.375, w: 0.24, h: 0, line: { color: C.accent3, width: 2, endArrowType: "triangle" }, objectName: `step-arrow-${i + 1}` });
  });
  bodyBox(s, [
    "2주 무료 진단으로 1·2공장 사이 운송 동선에서 비용이 새는 곳을 찾습니다",
    "3개월 시범 운영: 평택센터를 거쳐 운송을 묶고, 배차는 화면으로 합니다",
    "매주 결과를 보고해 실무는 매주, 팀장님은 단계마다 숫자로 확인하십니다",
  ], { x: 0.5, y: 3.25, w: 9.0, h: 1.8 });
  s.addNotes(
`그래서 저희가 무엇을 하느냐입니다. 세 단계입니다.
첫째, 2주 동안 무료로 공장 간 운송 동선을 진단합니다. 어디서 비용이 새는지 먼저 찾습니다.
둘째, 3개월 시범 운영입니다. 평택센터를 거쳐 1·2공장 운송을 묶고, 배차는 저희가 드리는 화면으로 하시게 됩니다.
셋째, 매주 결과를 보고드립니다. 과장님, 대리님은 매주, 팀장님께는 단계마다 숫자로 보여드리겠습니다.
진단이 무료라서, 먼저 해보시고 시범 운영을 할지 판단하셔도 됩니다.`);
}

// ================= 5. 4장 배차 =================
{
  const s = content("무엇을", "무엇을", 4, "김대리가 매일 전화로 맞추는 건 없어지나요?");
  card(s, 0.5, 1.75, 4.3, 1.75, HEX.light, "before-card");
  label(s, "지금", { x: 0.7, y: 1.85, w: 3.9, h: 0.4 }, { fontSize: 13, bold: true, color: C.accent3, align: "left" });
  label(s, "엑셀 + 매일 전화", { x: 0.7, y: 2.3, w: 3.9, h: 0.5 }, { fontSize: 18, bold: true, color: C.text2, align: "left" });
  label(s, "하루 [배차 시간: 확인 필요]", { x: 0.7, y: 2.85, w: 3.9, h: 0.45 }, { fontSize: 13, align: "left" });
  card(s, 5.2, 1.75, 4.3, 1.75, HEX.navy, "after-card");
  label(s, "바뀐 뒤", { x: 5.4, y: 1.85, w: 3.9, h: 0.4 }, { fontSize: 13, bold: true, color: C.accent2, align: "left" });
  label(s, "배차 화면 하나로 확인", { x: 5.4, y: 2.3, w: 3.9, h: 0.5 }, { fontSize: 18, bold: true, color: C.background1, align: "left" });
  label(s, "하루 [개선 후 시간: 확인 필요]", { x: 5.4, y: 2.85, w: 3.9, h: 0.45 }, { fontSize: 13, color: C.background1, align: "left" });
  s.addShape(pres.shapes.LINE, { x: 4.85, y: 2.625, w: 0.3, h: 0, line: { color: C.accent2, width: 3, endArrowType: "triangle" }, objectName: "before-after-arrow" });
  bodyBox(s, [
    "엑셀과 전화로 하던 배차를 배차 화면으로 옮깁니다",
    "한 사람에게 기대던 배차를 누구나 보고 이어받을 수 있게 됩니다",
    "김대리님 하루 업무가 전후로 어떻게 달라지는지 진단 때 함께 재겠습니다",
  ], { x: 0.5, y: 3.75, w: 9.0, h: 1.35 });
  s.addNotes(
`다음은 배차입니다.
지금은 엑셀로 배차하고, 김대리님께서 매일 전화로 맞추신다고 들었습니다.
시범 운영 동안은 배차 화면에서 한 번에 보시게 됩니다. 전화로 하나하나 확인하시던 일을 줄이는 게 목표입니다.
또 김대리님이 자리를 비우셔도 다른 분이 화면을 보고 이어받을 수 있습니다.
지금 배차에 하루 얼마나 쓰시는지는 진단 때 같이 재서, 전후를 숫자로 비교해 드리겠습니다.
(확인할 것: 현재 배차에 드는 하루 시간 — 김대리님께 직접 여쭤보기)`);
}

// ================= 6. 5장 기대 효과 =================
pres.addSection({ title: "얼마나" });
{
  const s = content("얼마나", "얼마나", 5, "얼마나 줄어요? 구매팀에 낼 숫자로요");
  const B = "[확인 필요]";
  const hdr = (t) => ({ text: t, options: { bold: true, color: HEX.navy, fill: { color: HEX.pale }, align: "center" } });
  const cell = (t, o = {}) => ({ text: runs(t, { color: HEX.ink }), options: { align: "center", ...o } });
  const rows = [
    [hdr("항목"), hdr("현재"), hdr("시범 후"), hdr("차이"), hdr("근거 자료")],
    [cell("운송비", { bold: true }), cell(B), cell(B), cell(B), cell(B)],
    [cell("운행 횟수", { bold: true }), cell(B), cell(B), cell(B), cell(B)],
    [cell("배차 시간", { bold: true }), cell(B), cell(B), cell(B), cell(B)],
  ];
  s.addTable(rows, { x: 0.5, y: 1.75, w: 5.6, colW: [1.1, 1.1, 1.1, 1.1, 1.2], rowH: 0.48, fontSize: 11, fontFace: FONT, border: { type: "solid", pt: 0.75, color: "C7D3DA" }, valign: "middle", objectName: "compare-table" });
  label(s, "항목은 [구매팀 검토 기준: 확인 필요]에 맞춰 조정", { x: 0.5, y: 3.8, w: 5.6, h: 0.4 }, { fontSize: 11, color: C.accent3, align: "left" });
  bodyBox(s, [
    "운송비 [운송비 절감액: 확인 필요] 절감, 절감률 [절감률: 확인 필요]",
    "비용: 진단은 무료, 시범 운영 [시범 운영 비용: 확인 필요]",
    "모든 숫자에 근거 자료를 붙여 구매팀에 그대로 올릴 수 있게 드립니다",
  ], { x: 6.4, y: 1.75, w: 3.1, h: 3.3 });
  s.addNotes(
`가장 궁금하실 부분입니다. 얼마나 줄어드느냐입니다.
구매팀을 거쳐야 해서 숫자가 분명해야 한다고 말씀하셨습니다. 그래서 이 장은 지금 일부러 비워 두었습니다.
진단을 마치면 현재 비용과 시범 운영 비용을 이 표에 나란히 넣고, 칸마다 근거 자료를 붙여 드리겠습니다.
진단은 무료이고, 시범 운영 비용은 진단 결과를 보고 확정해서 말씀드리겠습니다.
구매팀에서 어떤 기준으로 보시는지 알려주시면 표 항목도 거기에 맞추겠습니다.
(주의: 진단 전에는 절감 숫자를 말하지 않기. 확인할 것: 구매팀 검토 기준, 시범 운영 가격)`);
}

// ================= 7. 6장 일정 =================
pres.addSection({ title: "어떻게" });
{
  const s = content("어떻게", "어떻게", 6, "언제 시작해서 언제 결과가 나와요?");
  // 타임라인
  const y = 2.3;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.5, y, w: 1.8, h: 0.6, fill: { color: C.accent2 }, line: { color: C.accent2 }, rectRadius: 0.08, objectName: "tl-diag" });
  label(s, "진단 2주", { x: 0.5, y, w: 1.8, h: 0.6 }, { fontSize: 14, bold: true, color: C.text2 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 2.4, y, w: 5.2, h: 0.6, fill: { color: C.text2 }, line: { color: C.text2 }, rectRadius: 0.08, objectName: "tl-pilot" });
  label(s, "시범 운영 3개월 (매주 보고)", { x: 2.4, y, w: 5.2, h: 0.6 }, { fontSize: 14, bold: true, color: C.background1 });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.7, y, w: 1.8, h: 0.6, fill: { color: C.accent4 }, line: { color: C.accent4 }, rectRadius: 0.08, objectName: "tl-plant2" });
  label(s, "2공장 가동", { x: 7.7, y, w: 1.8, h: 0.6 }, { fontSize: 14, bold: true, color: C.text2 });
  label(s, "[시작일: 확인 필요]", { x: 0.5, y: 1.8, w: 2.6, h: 0.4 }, { fontSize: 11, align: "left" });
  label(s, "[3월 가동 확정 여부: 확인 필요]", { x: 6.4, y: 1.8, w: 3.1, h: 0.4 }, { fontSize: 11, align: "right" });
  label(s, "진단 보고서", { x: 0.5, y: 3.0, w: 1.8, h: 0.35 }, { fontSize: 11, color: C.accent3 });
  label(s, "주간 보고 → 최종 보고", { x: 2.4, y: 3.0, w: 5.2, h: 0.35 }, { fontSize: 11, color: C.accent3 });
  bodyBox(s, [
    "진단 2주 → 시범 3개월, 2공장 가동 전에 결과가 나오도록 거꾸로 짰습니다",
    "단계마다 받으시는 것: 진단 보고서, 주간 보고, 최종 보고",
    "시작이 늦어지면 시범 결과가 가동 뒤로 밀리므로 시작일을 먼저 정하고 싶습니다",
  ], { x: 0.5, y: 3.55, w: 9.0, h: 1.55 });
  s.addNotes(
`일정입니다.
진단 2주, 시범 운영 3개월입니다. 2공장 가동 전에 시범 결과를 손에 쥐실 수 있도록 거꾸로 계산해서 짰습니다.
단계마다 진단 보고서, 주간 보고, 최종 보고를 드립니다.
시작이 늦어지면 시범 결과가 2공장 가동 뒤로 밀릴 수 있어서, 오늘 시작 가능한 날짜를 여쭤보고 싶습니다.
(확인할 것: 진단 시작 가능 날짜, 3월 가동 확정 여부 — 시작일에 따라 3월 전 종료 가능한지 다시 계산)`);
}

// ================= 8. 7장 준비물·보고 =================
{
  const s = content("어떻게", "어떻게", 7, "우리 쪽은 뭘 준비하고, 결과는 어떻게 받아요?");
  const who = [
    ["실무", "매주", "주간 보고로 배차·운행 확인"],
    ["팀장", "단계마다", "진단·최종 보고로 결정"],
    ["구매팀", "최종", "근거 붙은 비교표로 검토"],
  ];
  who.forEach(([r, when, what], i) => {
    const x = 0.5 + i * 3.1;
    card(s, x, 1.75, 2.8, 1.45, HEX.light, `who-${i + 1}`);
    s.addShape(pres.shapes.OVAL, { x: x + 0.2, y: 1.95, w: 0.55, h: 0.55, fill: { color: C.text2 }, line: { color: C.text2 }, objectName: `who-dot-${i + 1}` });
    label(s, String(i + 1), { x: x + 0.2, y: 1.95, w: 0.55, h: 0.55 }, { fontSize: 14, bold: true, color: C.background1 });
    label(s, `${r} · ${when}`, { x: x + 0.85, y: 1.95, w: 1.9, h: 0.55 }, { fontSize: 14, bold: true, color: C.text2, align: "left" });
    label(s, what, { x: x + 0.2, y: 2.6, w: 2.45, h: 0.45 }, { fontSize: 12, align: "left" });
  });
  bodyBox(s, [
    "준비해 주실 것: 3분기 운송 내역, 지금 쓰시는 배차 엑셀",
    "매주 같은 양식으로 결과를 보고드립니다 (양식 샘플 첨부 예정)",
    "누가 언제 보실지는 [보고 대상·주기: 고객과 협의 필요]",
  ], { x: 0.5, y: 3.45, w: 9.0, h: 1.65 });
  s.addNotes(
`대현테크에서 준비해 주실 것은 두 가지입니다. 3분기 운송 내역, 그리고 지금 쓰시는 배차 엑셀입니다.
보고는 매주 같은 양식으로 드립니다.
저희 생각에는 과장님, 대리님은 매주 보시고, 팀장님은 진단과 최종 단계에서, 구매팀은 최종 비교표를 보시는 흐름이 맞을 것 같습니다.
이 부분은 저희 짐작이라, 실제로 누가 언제 보실지는 맞춰 주시면 그대로 따르겠습니다.
(확인할 것: 보고 대상과 주기, 주간 보고 양식 샘플 준비)`);
}

// ================= 9. 8장 왜 우리 =================
pres.addSection({ title: "왜 우리" });
{
  const s = content("왜 우리", "왜 우리", 8, "이 일을 왜 거기에 맡겨야 하죠?");
  const items = [
    ["평택센터", "[1·2공장과의 거리·장점: 확인 필요]"],
    ["비슷한 사례", "[운송 개선 사례: 확인 필요]"],
    ["회사 개요", "[회사 소개·담당자 연락처: 확인 필요]"],
  ];
  items.forEach(([h, t], i) => {
    const y = 1.75 + i * 1.1;
    card(s, 0.5, y, 4.6, 0.9, i === 0 ? HEX.navy : HEX.light, `why-${i + 1}`);
    label(s, h, { x: 0.7, y: y + 0.05, w: 4.2, h: 0.4 }, { fontSize: 14, bold: true, color: i === 0 ? C.accent2 : C.text2, align: "left" });
    label(s, t, { x: 0.7, y: y + 0.45, w: 4.2, h: 0.4 }, { fontSize: 12, color: i === 0 ? C.background1 : C.text1, align: "left" });
  });
  bodyBox(s, [
    "평택센터를 거쳐 1·2공장 운송을 묶을 수 있습니다",
    "비슷한 공장 간 운송 개선 경험을 사례로 보여드립니다",
    "진단부터 매주 보고까지 한 담당자가 끝까지 맡습니다",
  ], { x: 5.4, y: 1.85, w: 4.1, h: 3.0 });
  s.addNotes(
`마지막으로 왜 저희인지 짧게 말씀드리겠습니다.
평택센터가 있어서 1·2공장 운송을 한곳에서 묶을 수 있습니다.
비슷한 공장 간 운송 개선 사례도 있습니다. (사례 내용 채워 넣기)
진단부터 매주 보고까지 한 담당자가 끝까지 맡아서, 과장님께서 여러 사람을 상대하실 일은 없게 하겠습니다.
(확인할 것: 평택센터와 1·2공장 거리, 실제 사례, 담당자 배정 — 모두 자료 받은 뒤 채우기)`);
}

// ================= 10. 마무리 =================
pres.addSection({ title: "마무리" });
{
  const s = pres.addSlide({ masterName: "DARK", sectionTitle: "마무리" });
  s.addText("첫걸음은 2주 무료 진단입니다", { placeholder: "title" });
  s.addText(plainLines(["① 3분기 운송 내역과 배차 엑셀 공유", "② 진단 시작일 확정 [시작일: 확인 필요]", "③ 진단 보고 뒤 시범 운영 여부 결정"]), { placeholder: "body" });
  s.addShape(pres.shapes.OVAL, { x: 0.7, y: 0.8, w: 0.45, h: 0.45, fill: { color: C.accent2 }, line: { color: C.accent2 }, objectName: "close-dot" });
  s.addNotes(
`정리하겠습니다. 첫걸음은 2주 무료 진단입니다.
3분기 운송 내역과 배차 엑셀을 주시면, 시작일을 정해 바로 진단에 들어가겠습니다.
진단 결과를 보시고 시범 운영을 할지 정하시면 됩니다. 비용 부담 없이 숫자부터 확인하실 수 있습니다.
오늘 시작 가능한 날짜와 자료 공유 방법만 정해 주시면 감사하겠습니다.
(마무리 후 질문 받기 / 오늘 꼭 받아갈 것: 시작일, 자료 공유 담당자, 구매팀 검토 기준)`);
}

// pptxgenjs는 한 문단 안 run마다 <a:pPr>를 써서 뒤의 것이 글머리표를 지움 → 문단마다 첫 pPr만 남김
async function fixParagraphProps(file) {
  const fs = require("fs");
  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const names = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  for (const n of names) {
    let xml = await zip.file(n).async("string");
    xml = xml.replace(/<a:p>([\s\S]*?)<\/a:p>/g, (whole, inner) => {
      let seen = false;
      const fixed = inner.replace(/<a:pPr\b[^>]*?(?:\/>|>[\s\S]*?<\/a:pPr>)/g, (pp) => {
        if (seen) return "";
        seen = true;
        return pp;
      });
      return "<a:p>" + fixed + "</a:p>";
    });
    zip.file(n, xml);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

(async () => {
  const out = path.join(__dirname, "대현테크_제안서_초안.pptx");
  await pres.writeFile({ fileName: out });
  await fixParagraphProps(out);
  await applyTheme(out, THEME);
  console.log("written", out);
})();
