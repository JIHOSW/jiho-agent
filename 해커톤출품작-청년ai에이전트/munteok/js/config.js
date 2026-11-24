// AI 추출 API 주소
// 같은 서버(Vercel)에서 열면 상대 경로 api/extract를 쓴다.
// GitHub Pages처럼 서버 기능이 없는 곳에서 열면 아래 VERCEL_URL의 API를 부른다.
// Vercel 배포 주소가 정해지면 VERCEL_URL을 채운다. 예: 'https://munteok.vercel.app/'
const VERCEL_URL = 'https://hankkeut-app.vercel.app/';

// 공개 체험 주소(munteok-open)에서만 바꾸는 설정. 제출용 주소에서는 둘 다 꺼 둔다.
// CLARITY_ID: Microsoft Clarity 프로젝트 ID. 넣으면 동의한 사람에게만 사용 기록을 모은다.
// AI_OFF: true면 AI 공고 읽기를 끄고 직접 입력과 예시만 쓴다.
export const CLARITY_ID = null;
export const AI_OFF = false;

const onPages = location.hostname.endsWith('github.io');
export const API_BASE = onPages ? VERCEL_URL : '';
export const AI_AVAILABLE = !AI_OFF && (!onPages || Boolean(VERCEL_URL));
