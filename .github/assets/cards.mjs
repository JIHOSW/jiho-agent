// README 프로젝트 카드 생성기
// 새 프로젝트를 추가할 때: 아래 cards 배열에 한 줄을 추가하고
//   node .github/assets/cards.mjs
// 를 실행하면 .github/assets/<파일명>.svg 가 만들어집니다.
// 항목: [파일명, 번호, 구분, 제목(14자 안팎), [소개 1줄, 소개 2줄](각 18자 안팎), [키워드 최대 3개], 강조색]
import { writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const out = dirname(fileURLToPath(import.meta.url));
const FONT = `'Pretendard','Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif`;
const w = (s, fs) => [...s].reduce((a, c) => a + (/[ㄱ-힝]/.test(c) ? fs * 0.98 : c === ' ' ? fs * 0.3 : fs * 0.58), 0);
const cards = [
  ['card-saas', '01', '개인 기획·구현', '고객 온보딩 지원 서비스', ['가상의 문서관리 SaaS 고객의', '첫 활용을 돕는 규칙 기반 프로토타입'], ['웹 프로토타입', '업무 시나리오'], '#E1323F'],
  ['card-onboarding', '02', '개인 학습·실습', '고객 온보딩 에이전트', ['LLM이 도구를 골라 진단부터', '교육 계획까지 이어 가는 에이전트'], ['Gemini', '사람 승인', '시연판'], '#F97316'],
  ['card-blog', '03', '개인 학습·실습', 'AI 블로그 자동화 에이전트', ['자료 수집, 출처 확인, 검수를 잇는', 'Claude Code 기반 글쓰기 에이전트'], ['Claude Code', '출처 검증', '글 3편'], '#8B5CF6'],
  ['card-motion', '04', '개인 학습·실습', 'HTML 모션 PPT', ['발표 노트, 화면 전환, 계산 기능을', '담은 10장 HTML 발표자료'], ['HTML', '모션', '오프라인 단일 파일'], '#3B82F6'],
  ['card-career', '05', '개인 기획·구현', 'AI 직군 적성검사', ['상황·관심 영역에 따라 갈래가 나뉘는', '대화형 AI 직군 적성검사 에이전트'], ['규칙 기반', 'AI 직군 42개', '웹 체험'], '#06B6D4'],
  ['card-switchboard', '06', '개인 학습·실습', '에이전트 팀 관제 대시보드', ['블로그 에이전트의 역할과 업무 흐름을', '애니메이션으로 보여 주는 관제 화면'], ['Tailwind', '애니메이션', '시연용 수치 표시'], '#EAB308'],
];
for (const [file, num, cat, title, lines, tags, ac] of cards) {
  let x = 40;
  const pills = tags.map(t => { const pw = Math.round(w(t, 15) + 32); const s = `<rect x="${x}" y="244" width="${pw}" height="34" rx="17" fill="#FFFFFF" fill-opacity="0.08" stroke="#FFFFFF" stroke-opacity="0.16"/><text x="${x + pw / 2}" y="266" fill="#E5E7EB" text-anchor="middle">${t}</text>`; x += pw + 10; return s; }).join('');
  writeFileSync(`${out}/${file}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="320" viewBox="0 0 600 320">
<defs><radialGradient id="g" cx="1" cy="0" r="0.95"><stop offset="0" stop-color="${ac}" stop-opacity="0.5"/><stop offset="1" stop-color="${ac}" stop-opacity="0"/></radialGradient>
<clipPath id="c"><rect width="600" height="320" rx="24"/></clipPath></defs>
<g clip-path="url(#c)" font-family="${FONT}">
<rect width="600" height="320" fill="#0F1422"/><rect width="600" height="320" fill="url(#g)"/>
<text x="566" y="124" fill="#FFFFFF" fill-opacity="0.07" font-size="140" font-weight="800" text-anchor="end">${num}</text>
<circle cx="45" cy="45" r="5" fill="${ac}"/>
<text x="60" y="51" fill="#94A3B8" font-size="16" font-weight="700" letter-spacing="1">${num} · ${cat}</text>
<text x="40" y="120" fill="#FFFFFF" font-size="34" font-weight="800">${title}</text>
<text x="40" y="170" fill="#CBD5E1" font-size="20">${lines[0]}</text>
<text x="40" y="200" fill="#CBD5E1" font-size="20">${lines[1]}</text>
<g font-size="15" font-weight="700">${pills}</g>
</g></svg>`);
}
console.log('cards', cards.length);
