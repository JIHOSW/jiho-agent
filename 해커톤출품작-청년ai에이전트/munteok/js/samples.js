// 시연용 가상 샘플 3개. 실제 공고나 실제 인물이 아니다.
// extraction은 AI 추출 결과의 형식과 같다: 항목마다 값, 표시 등급, 원문 근거를 가진다.

export const SAMPLES = [
  {
    id: 'cafe',
    title: '주말 카페 알바 공고',
    scenario: 'A. 구직촉진수당을 받는 훈련생',
    text: '[가상 샘플] 카페 한끗 주말 스태프 모집\n근무: 금·토·일 10:00~19:00 (휴게 1시간)\n시급: 10,500원\n기간: 1월부터 6개월 이상\n4대보험 가입, 주휴수당 별도 지급',
    extraction: {
      hourlyWage: { value: 10500, status: '확정', evidence: '시급: 10,500원' },
      weeklyHours: { value: 24, status: '추정', evidence: '금·토·일 10:00~19:00 (휴게 1시간): 하루 8시간 × 3일로 계산' },
      startMonth: { value: 1, status: '확정', evidence: '기간: 1월부터' },
      months: { value: 12, toYearEnd: true, status: '추정', evidence: '6개월 이상: 연말까지 일한다고 가정' },
      incomeType: { value: 'wage', status: '확정', evidence: '4대보험 가입, 주휴수당 별도 지급' },
      holidayIncluded: { value: false, status: '확정', evidence: '주휴수당 별도 지급' },
    },
    profile: { age: 27, maxHours: 30, allowance: 'yes', allowanceEndMonth: 6, allowanceEndDate: '2026-06-19', healthDependent: 'no', taxDependent: 'no', ytdIncome: { wage: 0, daily: 0, business: 0 }, otherSupports: [] },
  },
  {
    id: 'tutor',
    title: '3.3% 떼는 제안 메시지',
    scenario: 'B. 부모의 피부양자인 대학생',
    text: '[가상 샘플] 안녕하세요, 학원 채점 보조 구합니다. 주 3회(월·수·금) 저녁 6시~10시, 시급 13,000원이고 급여는 3.3% 떼고 월말에 입금해 드려요. 3월부터 12월까지 가능하실까요?',
    extraction: {
      hourlyWage: { value: 13000, status: '확정', evidence: '시급 13,000원' },
      weeklyHours: { value: 12, status: '추정', evidence: '주 3회(월·수·금) 저녁 6시~10시: 하루 4시간 × 3일로 계산' },
      startMonth: { value: 3, status: '확정', evidence: '3월부터 12월까지' },
      months: { value: 10, status: '확정', evidence: '3월부터 12월까지' },
      incomeType: { value: 'business', status: '확정', evidence: '급여는 3.3% 떼고' },
    },
    profile: { age: 20, maxHours: 16, allowance: 'no', healthDependent: 'yes', taxDependent: 'yes', ytdIncome: { wage: 0, daily: 0, business: 0 }, otherSupports: [] },
  },
  {
    id: 'store',
    title: '지급 방식이 없는 공고',
    scenario: 'C. 조건이 모호한 공고',
    text: '[가상 샘플] 편의점 평일 저녁 알바 구함\n월~목 18:00~22:00\n시급 11,000원\n장기 근무자 우대',
    extraction: {
      hourlyWage: { value: 11000, status: '확정', evidence: '시급 11,000원' },
      weeklyHours: { value: 16, status: '추정', evidence: '월~목 18:00~22:00: 하루 4시간 × 4일로 계산' },
      startMonth: { value: null, status: '확인 필요', evidence: '시작 시점이 적혀 있지 않음' },
      months: { value: null, status: '확인 필요', evidence: '장기 근무자 우대: 기간이 적혀 있지 않음' },
      incomeType: { value: 'unknown', status: '확인 필요', evidence: '급여 지급 방식이 적혀 있지 않음' },
    },
    profile: { age: 23, maxHours: 20, allowance: 'no', healthDependent: 'yes', taxDependent: 'yes', ytdIncome: { wage: 0, daily: 0, business: 0 }, otherSupports: ['youthRent'] },
  },
];

export const EMPTY_PROFILE = { age: null, maxHours: null, allowance: 'no', allowanceEndMonth: 'unknown', healthDependent: 'unknown', taxDependent: 'unknown', ytdIncome: { wage: 0, daily: 0, business: 0 }, otherSupports: [], unemploymentEndMonth: null };

export const INCOME_TYPES = {
  wage: '근로소득 (4대보험 공제)',
  daily: '일용근로소득 (일당으로 그때그때)',
  business: '사업소득 (3.3% 공제)',
  unknown: '모름',
};
