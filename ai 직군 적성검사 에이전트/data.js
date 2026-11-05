// AI 직군 적성검사 — 문항·직군 데이터
// 점수 키: 역량(COMP) · 가치관(VAL) · 업무 스타일(STYLE, -값=왼쪽 / +값=오른쪽)
// 문항 효과(fx) 안의 jobs: { 직군id: 가산점 }, fields: { 영역id: 가산점 }

window.DATA = (() => {
  const COMP = {
    analysis: '수리·분석',
    build: '구현·코딩',
    systems: '시스템·인프라',
    data: '데이터 감각',
    product: '문제정의·기획',
    comm: '소통·설명',
    research: '탐구·학습',
    ethics: '리스크·윤리',
    creative: '창의·표현',
  };

  const VAL = {
    growth: '성장·학습',
    stability: '안정',
    reward: '보상',
    impact: '사회적 영향',
    autonomy: '자율',
    expertise: '전문성 인정',
  };

  const STYLE = {
    es: ['탐구형', '실행형', '충분히 이해한 뒤 움직인다', '일단 해보며 방향을 잡는다'],
    st: ['독립형', '협업형', '혼자 깊이 몰입할 때 강하다', '함께 주고받을 때 강하다'],
    sf: ['체계형', '유연형', '계획과 절차를 세워 움직인다', '상황에 맞춰 바꿔 가며 움직인다'],
    db: ['깊이형', '넓이형', '한 분야를 끝까지 판다', '여러 분야를 넓게 연결한다'],
  };

  // 1단계 갈래: 현재 상황 — 문항 속 상황 표현이 바뀌고, 결과의 '첫걸음' 조언이 달라집니다
  const SITUATIONS = {
    student: { label: '학생', desc: '전공 무관, 진로를 탐색 중', tok: { place: '수업 팀 프로젝트', mate: '팀원', work: '과제' } },
    jobseeker: { label: '취업 준비생', desc: '첫 직무를 정하고 준비 중', tok: { place: '부트캠프·공모전 프로젝트', mate: '팀원', work: '프로젝트' } },
    itpro: { label: '개발·IT 현직자', desc: 'AI 분야로 옮기거나 넓히고 싶음', tok: { place: '회사 프로젝트', mate: '동료', work: '업무' } },
    switcher: { label: '비IT 직무 전환', desc: '기획·영업·교육 등에서 AI로 전환', tok: { place: '회사 업무', mate: '동료', work: '업무' } },
  };

  // 2단계 갈래: 관심 AI 영역 — 고른 영역마다 심화 문항 2개가 추가됩니다
  const FIELDS = {
    research: { label: '모델·연구', desc: 'AI 모델을 연구하고 학습시킴' },
    eng: { label: 'AI 엔지니어링', desc: 'AI 서비스·에이전트·인프라 구축' },
    data: { label: '데이터', desc: '데이터 수집·분석·평가' },
    product: { label: '제품·기획', desc: 'AI 서비스 기획과 사용자 경험' },
    biz: { label: '비즈니스·현장', desc: '도입 지원·컨설팅·교육·기술영업' },
    trust: { label: '신뢰·안전·정책', desc: 'AI 안전성·보안·거버넌스' },
    creative: { label: '크리에이티브', desc: '생성형 AI로 콘텐츠 제작' },
    ax: { label: 'AX·업무 혁신', desc: '조직의 AI 전환을 기획·운영·확산' },
  };

  // 결과 유형 이름: 가장 강한 역량(명사) + 가장 뚜렷한 업무 스타일(수식어)
  const TYPES = {
    analysis: ['분석가', '복잡한 문제를 숫자와 논리로 풀어내고, 근거 있는 판단을 내리는 사람이에요.'],
    build: ['메이커', '아이디어를 실제로 돌아가는 결과물로 만들어 내는 사람이에요.'],
    systems: ['설계자', '보이지 않는 곳에서 시스템이 멈추지 않고 커지도록 뼈대를 세우는 사람이에요.'],
    data: ['데이터 탐정', '흩어진 데이터 속에서 단서를 찾아 의미를 만들어 내는 사람이에요.'],
    product: ['문제 정의자', '무엇을 왜 만들어야 하는지 먼저 묻고, 흩어진 의견을 하나의 방향으로 모으는 사람이에요.'],
    comm: ['연결자', '어려운 기술을 사람의 언어로 바꾸고, 사람과 기술을 이어 주는 사람이에요.'],
    research: ['탐험가', '아직 답이 없는 질문을 끝까지 파고들며 새로운 지식을 찾는 사람이에요.'],
    ethics: ['수호자', '기술이 사람에게 해가 되지 않도록 위험을 먼저 보고 기준을 세우는 사람이에요.'],
    creative: ['크리에이터', 'AI를 도구 삼아 남들이 생각하지 못한 표현을 만들어 내는 사람이에요.'],
  };
  const TYPE_MODS = {
    es: ['깊이 묻는', '빠르게 움직이는'],
    st: ['혼자 몰입하는', '함께 일하는'],
    sf: ['체계를 세우는', '유연하게 바꾸는'],
    db: ['한 우물을 파는', '경계를 넘나드는'],
  };

  const SECTIONS = {
    comp: { label: '역량', intro: '먼저 어떤 일에 강한지 볼게요. 상황을 떠올리고, 실제로 할 것 같은 행동을 골라 주세요.' },
    val: { label: '가치관', intro: '좋아요. 이번엔 일에서 무엇을 더 중요하게 여기는지 볼게요. 둘 다 좋아 보여도 하나만 골라 주세요.' },
    style: { label: '업무 스타일', intro: '거의 다 왔어요. 일하는 방식에 대한 질문이에요. 더 편한 쪽을 골라 주세요.' },
    deep: { label: '관심 영역 심화', intro: '마지막으로 고른 관심 영역 안에서 어떤 직무에 더 가까운지 좁혀 볼게요.' },
  };

  const Q = [];
  const choice = (sec, id, text, options) => Q.push({ sec, id, type: 'choice', text, options });
  const pair = (sec, id, text, a, b) => Q.push({ sec, id, type: 'pair', text, options: [a, b] });
  const o = (label, fx) => ({ label, fx });

  // ── 역량 (상황 선택형 14) ──
  choice('comp', 'c1', '{place}에서 새 AI 기능을 맡게 됐어요. 가장 먼저 손이 가는 일은?', [
    o('관련 논문과 사례를 찾아 원리부터 이해한다', { research: 2, analysis: 1, es: -1 }),
    o('일단 API를 붙여 동작하는 프로토타입을 만든다', { build: 2, es: 1 }),
    o('누가, 왜 이 기능을 쓰는지 사용자 시나리오를 정리한다', { product: 2, comm: 1 }),
    o('어떤 데이터가 있고 품질은 어떤지부터 확인한다', { data: 2, analysis: 1 }),
  ]);
  choice('comp', 'c2', 'AI 모델이 가끔 엉뚱한 답을 내요. 가장 먼저 궁금한 건?', [
    o('어떤 입력에서 틀리는지 패턴과 비율', { analysis: 2, data: 1 }),
    o('사용자에게 피해가 갈 수 있는 경우가 무엇인지', { ethics: 2, product: 1 }),
    o('모델 내부의 어떤 원리 때문에 그런지', { research: 2, analysis: 1 }),
    o('서비스에서 당장 어떻게 막을 수 있는지', { build: 2, systems: 1 }),
  ]);
  choice('comp', 'c3', '{mate}에게 어려운 AI 개념을 설명해야 해요. 당신의 방식은?', [
    o('비유와 그림으로 쉽게 풀어 준다', { comm: 2, creative: 1 }),
    o('직접 돌려볼 수 있는 예제 코드를 보여 준다', { build: 2, comm: 1 }),
    o('핵심을 한 장짜리 문서로 구조화한다', { product: 1, comm: 1, sf: -1 }),
    o('수식과 원리부터 차근차근 짚는다', { analysis: 2, research: 1 }),
  ]);
  choice('comp', 'c4', '만든 AI 서비스의 사용자가 갑자기 10배로 늘었어요. 가장 먼저 떠오르는 걱정은?', [
    o('서버·GPU 비용과 응답 속도', { systems: 2, analysis: 1 }),
    o('새 사용자들이 어떤 목적으로 쓰는지', { product: 2, data: 1 }),
    o('악용이나 부적절한 사용', { ethics: 2 }),
    o('쌓이는 로그 데이터로 무엇을 분석할 수 있을지', { data: 2, analysis: 1 }),
  ]);
  choice('comp', 'c5', '주말에 시간이 생기면 가장 해보고 싶은 것은?', [
    o('새로 나온 오픈소스 모델을 직접 설치해 돌려 보기', { build: 2, systems: 1 }),
    o('생성형 AI로 그림·영상·음악 만들어 보기', { creative: 2 }),
    o('AI 관련 글을 쓰거나 강의 영상 만들기', { comm: 2, creative: 1 }),
    o('데이터 분석 대회에 참가해 보기', { data: 2, analysis: 1 }),
  ]);
  choice('comp', 'c6', '"AI로 일하는 방식을 바꿔 보자"는 제안이 나왔어요. 당신이 내놓을 것은?', [
    o('반복 업무 목록과 우선순위를 정리한 도입 계획', { product: 2, sf: -1 }),
    o('업무를 자동화하는 스크립트나 에이전트', { build: 2 }),
    o('모두가 쓸 수 있는 사용 가이드와 교육', { comm: 2 }),
    o('보안·개인정보 이슈를 점검한 체크리스트', { ethics: 2, systems: 1 }),
  ]);
  choice('comp', 'c7', '가장 뿌듯했던 순간에 가까운 것은?', [
    o('복잡한 문제를 논리와 숫자로 풀어냈을 때', { analysis: 2 }),
    o('내가 만든 것이 실제로 돌아갈 때', { build: 2 }),
    o('누군가 내 설명 덕분에 이해했다고 할 때', { comm: 2 }),
    o('흩어진 의견을 하나의 방향으로 정리했을 때', { product: 2 }),
  ]);
  choice('comp', 'c8', '새로운 AI 기술 소식을 접하면 보통 어떻게 하나요?', [
    o('원문 논문이나 기술 문서를 찾아 읽는다', { research: 2 }),
    o('내 {work}에 어디에 써먹을지 생각한다', { product: 2 }),
    o('위험 요소나 사회적 영향부터 따져 본다', { ethics: 2 }),
    o('재밌는 결과물을 만들어 공유한다', { creative: 2, comm: 1 }),
  ]);
  choice('comp', 'c9', '데이터 표 1만 줄을 받았어요. 당신은?', [
    o('빠진 값과 이상한 값부터 정리한다', { data: 2, sf: -1 }),
    o('그래프로 그려 패턴을 찾는다', { analysis: 2, data: 1 }),
    o('이 데이터로 어떤 질문에 답할지부터 정한다', { product: 2 }),
    o('매번 자동으로 처리되는 파이프라인을 짠다', { systems: 2, build: 1 }),
  ]);
  choice('comp', 'c10', '{place}에서 의견 충돌이 생겼어요. 당신이 주로 맡는 역할은?', [
    o('양쪽 이야기를 듣고 조율한다', { comm: 2, st: 1 }),
    o('데이터와 근거로 판단 기준을 제시한다', { analysis: 2 }),
    o('목표를 다시 정의해 방향을 맞춘다', { product: 2 }),
    o('내 파트를 확실히 끝내 일정을 지킨다', { build: 1, st: -1, es: 1 }),
  ]);
  choice('comp', 'c11', 'AI가 만든 결과물을 검토한다면, 가장 자신 있는 부분은?', [
    o('사실관계와 논리의 오류 찾기', { analysis: 2, research: 1 }),
    o('편향되거나 차별적인 표현 찾기', { ethics: 2 }),
    o('문장과 디자인의 완성도 다듬기', { creative: 2 }),
    o('기존 시스템과 연결했을 때 생길 문제 찾기', { systems: 2 }),
  ]);
  choice('comp', 'c12', '다음 중 가장 배우고 싶은 것은?', [
    o('딥러닝 이론과 최신 논문', { research: 2, analysis: 1 }),
    o('클라우드·컨테이너·GPU 운영', { systems: 2 }),
    o('AI 서비스 기획과 사용자 리서치', { product: 2 }),
    o('AI 규제·정책과 안전성', { ethics: 2 }),
  ]);
  choice('comp', 'c13', '결과를 발표하는 날, 가장 공들이는 것은?', [
    o('숫자와 실험 결과의 정확성', { analysis: 2, data: 1 }),
    o('청중이 바로 이해하는 스토리', { comm: 2 }),
    o('눈에 띄는 시각 자료와 데모', { creative: 2 }),
    o('어떤 질문에도 답할 기술적 깊이', { research: 2 }),
  ]);
  choice('comp', 'c14', 'AI 프로젝트가 실패했어요. 원인을 찾는다면 어디부터 볼까요?', [
    o('데이터가 부족하거나 잘못되지 않았는지', { data: 2 }),
    o('문제 정의가 애초에 틀리지 않았는지', { product: 2 }),
    o('모델과 알고리즘 선택이 맞았는지', { research: 2, analysis: 1 }),
    o('배포·운영 환경에 문제가 없었는지', { systems: 2 }),
  ]);

  // ── 가치관 (양자택일 10) ──
  pair('val', 'v1', '둘 중 어떤 회사를 고를까요?',
    o('연봉이 높지만 야근이 잦은 곳', { reward: 2 }),
    o('연봉은 평범하지만 안정적인 곳', { stability: 2 }));
  pair('val', 'v2', '어느 쪽이 더 끌리나요?',
    o('매일 새로운 기술을 배우는 일', { growth: 2, db: 1 }),
    o('한 분야 최고 전문가로 인정받는 일', { expertise: 2, db: -1 }));
  pair('val', 'v3', '어떤 일하는 방식이 더 좋나요?',
    o('일정과 방법을 내가 정하는 일', { autonomy: 2, sf: 1 }),
    o('역할과 절차가 분명한 일', { stability: 2, sf: -1 }));
  pair('val', 'v4', '더 의미 있게 느껴지는 쪽은?',
    o('많은 사람의 삶을 바꾸는 서비스', { impact: 2 }),
    o('성과가 확실하게 보상받는 비즈니스', { reward: 2 }));
  pair('val', 'v5', '어떤 조직에서 일하고 싶나요?',
    o('빠르게 성장하는 AI 스타트업', { growth: 2, sf: 1 }),
    o('체계가 잡힌 대기업이나 공공기관', { stability: 2, sf: -1 }));
  pair('val', 'v6', '어떤 일로 기억되고 싶나요?',
    o('논문·발표로 이름이 알려지는 일', { expertise: 2 }),
    o('조용히 더 안전한 사회를 만드는 일', { impact: 2 }));
  pair('val', 'v7', '하나만 고른다면?',
    o('출퇴근 시간이 자유로운 일', { autonomy: 2 }),
    o('성과급이 큰 일', { reward: 2 }));
  pair('val', 'v8', '어떤 과제를 맡고 싶나요?',
    o('실패해도 배울 게 많은 도전', { growth: 2, es: 1 }),
    o('확실한 결과가 보장된 과제', { stability: 2, es: -1 }));
  pair('val', 'v9', '더 가슴 뛰는 쪽은?',
    o('AI로 사람들의 불편을 덜어 주는 일', { impact: 2 }),
    o('최첨단 기술의 한계를 넓히는 일', { expertise: 1, growth: 1 }));
  pair('val', 'v10', '10년 뒤의 나는?',
    o('혼자서도 깊게 파고드는 전문가', { expertise: 2, autonomy: 1, st: -1, db: -1 }),
    o('여러 팀을 이끄는 리더', { reward: 1, impact: 1, st: 1, db: 1 }));

  // ── 업무 스타일 (양자택일 8) ──
  pair('style', 's1', '{work}를 시작할 때 나는',
    o('충분히 조사하고 계획한 뒤 시작한다', { es: -2, sf: -1 }),
    o('일단 해보면서 방향을 잡는다', { es: 2, sf: 1 }));
  pair('style', 's2', '아이디어가 잘 나오는 때는?',
    o('혼자 조용히 집중할 때', { st: -2 }),
    o('여럿이 이야기를 주고받을 때', { st: 2, comm: 1 }));
  pair('style', 's3', '일정 관리 방식은?',
    o('정해진 일정과 체크리스트대로', { sf: -2 }),
    o('상황에 따라 유연하게 조정하며', { sf: 2 }));
  pair('style', 's4', '공부할 때 나는',
    o('한 가지를 끝까지 깊게 판다', { db: -2, research: 1 }),
    o('여러 분야를 넓게 보고 연결한다', { db: 2 }));
  pair('style', 's5', '더 즐거운 문제는?',
    o('정답이 없어 오래 고민해야 하는 문제', { es: -2, research: 1 }),
    o('바로 결과가 눈에 보이는 문제', { es: 2, build: 1 }));
  pair('style', 's6', '하루를 마치고 더 에너지가 남는 날은?',
    o('회의 없이 작업만 한 날', { st: -2 }),
    o('사람들과 많이 만나고 이야기한 날', { st: 2, comm: 1 }));
  pair('style', 's7', '더 좋아하는 일은?',
    o('규칙과 문서를 깔끔하게 정비하는 일', { sf: -2 }),
    o('기존과 다른 새 방식을 시도하는 일', { sf: 2, creative: 1 }));
  pair('style', 's8', '나에게 더 맞는 커리어는?',
    o('전문 분야 하나를 가진 스페셜리스트', { db: -2 }),
    o('여러 역할을 오가는 제너럴리스트', { db: 2 }));

  // ── 관심 영역 심화 (영역마다 2문항) ──
  const deep = (field, id, text, options) => Q.push({ sec: 'deep', field, id, type: 'choice', text, options });
  const j = (label, jobs, extra = {}) => o(label, { jobs, ...extra });

  deep('research', 'dr1', '[모델·연구] 가장 끌리는 연구 주제는?', [
    j('새로운 모델 구조와 학습 방법 자체', { ai_researcher: 2 }),
    j('이미지·영상을 이해하는 AI', { cv_engineer: 2 }),
    j('언어모델과 텍스트 이해', { nlp_engineer: 2 }),
    j('사람 목소리를 듣고 말하는 AI', { speech_engineer: 2 }),
    j('연구된 모델을 실제 제품 성능으로 끌어올리기', { ml_engineer: 2 }),
  ]);
  deep('research', 'dr2', '[모델·연구] 어느 쪽 하루가 더 좋을까요?', [
    j('실험을 설계하고 논문을 쓰는 하루', { ai_researcher: 2, safety_researcher: 1 }),
    j('대규모 학습을 돌리고 코드를 최적화하는 하루', { ml_engineer: 2, nlp_engineer: 1 }),
    j('데이터를 모으고 모델 튜닝을 반복하는 하루', { cv_engineer: 1, speech_engineer: 1, ml_engineer: 1 }),
  ]);
  deep('eng', 'de1', '[AI 엔지니어링] 가장 만들고 싶은 것은?', [
    j('사람들이 매일 쓰는 AI 챗봇·서비스', { llm_app_dev: 2 }),
    j('스스로 도구를 써서 일을 끝내는 AI 에이전트', { agent_dev: 2 }),
    j('모델 배포와 모니터링을 자동화하는 시스템', { mlops: 2 }),
    j('수천 개 GPU를 묶는 학습·추론 플랫폼', { ai_infra: 2 }),
    j('스마트폰·기기 안에서 바로 도는 AI', { ondevice: 2 }),
  ]);
  deep('eng', 'de2', '[AI 엔지니어링] 가장 짜릿할 것 같은 순간은?', [
    j('출시 첫날 사용자 1만 명이 몰렸을 때', { llm_app_dev: 2 }),
    j('에이전트가 처음으로 업무를 끝까지 혼자 처리했을 때', { agent_dev: 2, fde: 1 }),
    j('버튼 하나로 새 모델이 무중단 교체될 때', { mlops: 2 }),
    j('응답 속도를 30% 줄였을 때', { ondevice: 2, ai_infra: 1 }),
  ]);
  deep('data', 'dd1', '[데이터] 데이터로 하고 싶은 일은?', [
    j('예측 모델 만들기', { data_scientist: 2 }),
    j('대용량 데이터 흐름 설계하기', { data_engineer: 2 }),
    j('지표로 의사결정 돕기', { data_analyst: 2 }),
    j('좋은 학습 데이터의 기준 세우기', { data_curator: 2 }),
    j('AI 성능을 재는 시험 문제 설계하기', { eval_engineer: 2 }),
  ]);
  deep('data', 'dd2', '[데이터] 가장 파고들고 싶은 질문은?', [
    j('"이 모델이 정말 좋아졌다고 말할 수 있을까?"', { eval_engineer: 2, data_scientist: 1 }),
    j('"왜 이번 달 이용률이 떨어졌지?"', { data_analyst: 2 }),
    j('"매일 10억 건을 어떻게 안정적으로 처리하지?"', { data_engineer: 2 }),
    j('"사람마다 정답 기준이 다르면 어떻게 하지?"', { data_curator: 2 }),
  ]);
  deep('product', 'dp1', '[제품·기획] 가장 맡고 싶은 일은?', [
    j('서비스 로드맵과 우선순위 결정', { ai_pm: 2 }),
    j('화면과 기능을 정의하는 기획서 작성', { ai_planner: 2 }),
    j('AI의 말투와 대화 흐름 설계', { conv_designer: 2 }),
    j('프롬프트를 실험해 답변 품질 끌어올리기', { prompt_engineer: 2 }),
    j('사용자 인터뷰로 AI 사용 행태 연구', { ai_ux_researcher: 2 }),
  ]);
  deep('product', 'dp2', '[제품·기획] 가장 자랑스러울 산출물은?', [
    j('출시 후 올라간 핵심 지표', { ai_pm: 2 }),
    j('개발자가 바로 만들 수 있는 꼼꼼한 기획서', { ai_planner: 2 }),
    j('사람처럼 자연스러운 대화 시나리오', { conv_designer: 2 }),
    j('정확도를 크게 올린 프롬프트 세트', { prompt_engineer: 2 }),
    j('팀의 방향을 바꾼 사용자 인사이트 리포트', { ai_ux_researcher: 2 }),
  ]);
  deep('biz', 'db1', '[비즈니스·현장] 고객 앞에서 맡고 싶은 역할은?', [
    j('기술 데모와 도입 제안', { solutions_engineer: 2 }),
    j('업무 진단과 AI 도입 로드맵 수립', { ai_consultant: 2 }),
    j('고객사에 들어가 직접 구축까지', { fde: 2 }),
    j('사용자 교육과 워크숍 진행', { ai_educator: 2 }),
    j('도입 후 잘 쓰도록 꾸준히 관리', { ai_csm: 2 }),
  ]);
  deep('biz', 'db2', '[비즈니스·현장] 가장 자신 있는 표현 방식은?', [
    j('개발자 커뮤니티 발표와 기술 콘텐츠', { devrel: 2 }),
    j('정확하고 읽기 쉬운 문서·가이드', { tech_writer: 2 }),
    j('따라 하기 쉬운 교안과 실습', { ai_educator: 1, tech_writer: 1 }),
    j('고객의 문제를 코드로 바로 해결해 보여 주기', { fde: 2, solutions_engineer: 1 }),
  ]);
  deep('trust', 'dt1', '[신뢰·안전·정책] 가장 관심 가는 일은?', [
    j('AI가 의도대로 행동하도록 연구하기', { safety_researcher: 2 }),
    j('AI의 약점을 공격해서 찾아내기', { red_teamer: 2 }),
    j('규제와 사내 가이드라인 만들기', { ai_governance: 2 }),
    j('유해 콘텐츠 정책을 세우고 운영하기', { trust_safety: 2 }),
    j('모델과 데이터를 해킹·유출에서 지키기', { ai_security: 2 }),
  ]);
  deep('trust', 'dt2', '[신뢰·안전·정책] 더 의미 있다고 느끼는 것은?', [
    j('장기적으로 인류에게 안전한 AI', { safety_researcher: 2 }),
    j('오늘 사용자가 입을 피해를 막는 일', { trust_safety: 2, red_teamer: 1 }),
    j('기업이 법과 원칙을 지키게 돕는 일', { ai_governance: 2 }),
    j('공격자보다 한발 앞서는 일', { ai_security: 2, red_teamer: 1 }),
  ]);
  deep('creative', 'dc1', '[크리에이티브] 가장 하고 싶은 역할은?', [
    j('AI로 직접 작품과 콘텐츠를 만든다', { genai_creator: 2 }),
    j('프로젝트 전체 콘셉트와 품질을 총괄한다', { ai_creative_director: 2 }),
    j('AI 콘텐츠로 브랜드와 제품을 알린다', { genai_marketer: 2 }),
  ]);
  deep('creative', 'dc2', '[크리에이티브] 결과물을 평가하는 내 기준은?', [
    j('조회수와 사람들의 반응', { genai_marketer: 2, genai_creator: 1 }),
    j('작품성과 세계관의 완성도', { ai_creative_director: 2 }),
    j('아무도 안 써 본 새로운 기법', { genai_creator: 2 }),
  ]);
  deep('ax', 'dx1', '[AX·업무 혁신] 회사가 "올해 AI 전환(AX)을 하겠다"고 발표했어요. 맡고 싶은 역할은?', [
    j('어느 부서의 어떤 업무부터 바꿀지 전략과 과제를 정한다', { ax_strategist: 2 }),
    j('도입 사업의 일정·산출물·이해관계자를 관리한다', { ax_pmo: 2 }),
    j('직원들이 AI를 쓰도록 교육 과정을 짜고 운영한다', { ax_edu_planner: 2 }),
    j('반복 업무를 AI·노코드 도구로 직접 자동화한다', { ax_automation: 2 }),
    j('사내 AI 도구의 계정·권한·보안·사용 정책을 운영한다', { ax_platform: 2 }),
    j('바뀐 일하는 방식이 조직에 자리 잡도록 소통하고 설득한다', { ax_change: 2 }),
  ]);
  deep('ax', 'dx2', '[AX·업무 혁신] 가장 해보고 싶은 경험은?', [
    j('공공기관·기업의 AI 도입 사업 제안서를 써서 수주하기', { ax_proposal: 2, ax_pmo: 1 }),
    j('내 부서에서 AI를 가장 잘 쓰는 사람이 되어 동료들을 이끌기', { ax_champion: 2 }),
    j('AI 도입 전후 시간·비용 절감 효과를 숫자로 증명하기', { ax_value: 2, ax_strategist: 1 }),
    j('수백 명이 듣는 사내 AI 교육을 성공적으로 마치기', { ax_edu_planner: 2, ax_change: 1 }),
  ]);
  // 관심 영역을 '잘 모르겠음'으로 고른 경우의 탐색 문항
  deep('unknown', 'du1', '[탐색] AI와 관련해 가장 해보고 싶은 일에 가까운 것은?', [
    o('AI를 직접 만들고 똑똑하게 만든다', { fields: { research: 2, eng: 1 } }),
    o('AI를 서비스로 만들어 연결한다', { fields: { eng: 2, product: 1 } }),
    o('AI가 잘 배우도록 데이터를 다룬다', { fields: { data: 2 } }),
    o('사람들이 AI를 잘 쓰도록 돕는다', { fields: { biz: 2, product: 1 } }),
    o('AI가 안전하고 공정하도록 지킨다', { fields: { trust: 2 } }),
    o('AI로 새로운 것을 표현한다', { fields: { creative: 2 } }),
    o('조직이 AI로 일하는 방식을 바꾸도록 이끈다', { fields: { ax: 2, biz: 1 } }),
  ]);
  deep('unknown', 'du2', '[탐색] 코딩에 대한 내 생각은?', [
    o('매일 코드를 쓰는 일이 좋다', { build: 2, fields: { eng: 1, research: 1 } }),
    o('필요하면 배워서 쓸 수 있다', { build: 1, fields: { data: 1, biz: 1 } }),
    o('코드보다 사람·글·기획이 좋다', { fields: { product: 1, biz: 1, trust: 1, creative: 1, ax: 1 } }),
  ]);

  // ── AI 직군 44개 ──
  // c: 요구 역량 가중치, v: 맞는 가치관, s: 업무 스타일(-1~1), diff: 진입 난이도(1 낮음 ~ 3 높음)
  const JOBS = [
    // 모델·연구
    { id: 'ai_researcher', field: 'research', name: 'AI 리서치 사이언티스트', desc: '새로운 모델 구조와 학습 방법을 연구해 논문과 기술로 만듭니다.',
      c: { research: 3, analysis: 3, build: 1 }, v: { expertise: 3, growth: 2, autonomy: 1 }, s: { es: -1, st: -0.3, db: -1 }, diff: 3,
      steps: ['선형대수·확률·최적화 기초 다지기', '주요 논문을 PyTorch로 재현 구현하기', '연구실 인턴·대학원으로 연구 실적 쌓기'],
      pf: '최신 논문 하나를 재현하고 실험 결과를 블로그로 정리', tags: ['PyTorch', '논문', '실험 설계'] },
    { id: 'ml_engineer', field: 'research', name: '머신러닝 엔지니어', desc: '모델을 학습·최적화해 실제 서비스에 들어갈 수준으로 만듭니다.',
      c: { build: 3, analysis: 2, research: 1, systems: 1 }, v: { growth: 2, reward: 2, expertise: 1 }, s: { es: 0.3, db: -0.5 }, diff: 3,
      steps: ['파이썬과 머신러닝 기초(scikit-learn) 익히기', '딥러닝 프레임워크로 모델 학습·튜닝 경험', '학습부터 서빙까지 이어지는 프로젝트 완성'],
      pf: '공개 데이터로 모델을 학습하고 API로 배포한 프로젝트', tags: ['PyTorch', '모델 튜닝', '서빙'] },
    { id: 'cv_engineer', field: 'research', name: '컴퓨터 비전 엔지니어', desc: '이미지·영상에서 사물과 상황을 인식하는 AI를 개발합니다.',
      c: { analysis: 2, build: 2, research: 2, data: 1 }, v: { expertise: 2, growth: 2 }, s: { es: -0.3, db: -1 }, diff: 3,
      steps: ['영상 처리와 CNN·비전 트랜스포머 기초', '객체 탐지·분할 모델 실습', '실제 카메라 데이터로 프로젝트 진행'],
      pf: '직접 촬영한 이미지로 객체 탐지 모델을 학습시킨 프로젝트', tags: ['OpenCV', '객체 탐지', '멀티모달'] },
    { id: 'nlp_engineer', field: 'research', name: 'NLP·LLM 엔지니어', desc: '언어모델을 파인튜닝하고, 검색 증강(RAG) 등으로 언어 이해 성능을 높입니다.',
      c: { research: 2, build: 2, analysis: 2, data: 1 }, v: { growth: 3, expertise: 2 }, s: { es: -0.3, db: -0.7 }, diff: 3,
      steps: ['트랜스포머 구조와 토크나이저 이해', '오픈소스 LLM 파인튜닝 실습', 'RAG·평가까지 포함한 언어 모델 프로젝트'],
      pf: '한국어 데이터로 소형 LLM을 파인튜닝하고 전후 성능 비교', tags: ['Transformers', '파인튜닝', 'RAG'] },
    { id: 'speech_engineer', field: 'research', name: '음성 AI 엔지니어', desc: '음성 인식, 음성 합성처럼 말을 듣고 말하는 AI를 개발합니다.',
      c: { analysis: 2, build: 2, research: 2, data: 1 }, v: { expertise: 2, stability: 1, growth: 1 }, s: { db: -1 }, diff: 3,
      steps: ['신호 처리와 음향 특징 기초', '음성 인식·합성 오픈소스 모델 실습', '실시간 음성 처리 데모 만들기'],
      pf: '음성 인식과 합성을 이어 붙인 음성 비서 데모', tags: ['ASR', 'TTS', '신호 처리'] },

    // AI 엔지니어링
    { id: 'llm_app_dev', field: 'eng', name: 'LLM 애플리케이션 개발자', desc: 'LLM API를 활용해 챗봇, 검색, 업무 도구 같은 실제 서비스를 만듭니다.',
      c: { build: 3, product: 2, systems: 1 }, v: { growth: 2, impact: 1, autonomy: 1, reward: 1 }, s: { es: 1, st: 0.3, sf: 0.5, db: 0.3 }, diff: 2,
      steps: ['웹 개발 기초(프론트·백엔드 하나 이상)', 'LLM API·RAG로 작은 서비스 만들기', '실사용자 피드백을 받아 개선해 보기'],
      pf: '내 문서를 검색해 답하는 RAG 챗봇을 배포', tags: ['LLM API', 'RAG', '웹 개발'] },
    { id: 'agent_dev', field: 'eng', name: 'AI 에이전트 개발자', desc: 'AI가 도구를 골라 쓰며 여러 단계 업무를 스스로 처리하도록 설계·구현합니다.',
      c: { build: 3, product: 1, systems: 1, research: 1 }, v: { growth: 3, autonomy: 2 }, s: { es: 0.7, sf: 0.7 }, diff: 2,
      steps: ['함수 호출(tool use)과 에이전트 구조 이해', '실제 업무 하나를 자동화하는 에이전트 구현', '사람 승인·실패 처리까지 넣어 안정화'],
      pf: '반복 업무를 끝까지 처리하는 에이전트와 실행 로그 공개', tags: ['Tool use', 'MCP', '워크플로'] },
    { id: 'mlops', field: 'eng', name: 'MLOps 엔지니어', desc: '모델 학습·배포·모니터링을 자동화해 AI가 안정적으로 운영되게 합니다.',
      c: { systems: 3, build: 2, data: 1 }, v: { stability: 2, expertise: 1, reward: 1 }, s: { es: 0.5, sf: -0.7, db: -0.3 }, diff: 2,
      steps: ['Linux·Docker·클라우드 기초', 'CI/CD와 모델 서빙 도구 실습', '모니터링·롤백까지 갖춘 배포 파이프라인 구축'],
      pf: '모델 버전 관리와 자동 배포 파이프라인 구축 기록', tags: ['Docker', 'Kubernetes', 'CI/CD'] },
    { id: 'ai_infra', field: 'eng', name: 'AI 인프라·GPU 플랫폼 엔지니어', desc: '대규모 학습과 추론을 위한 GPU 클러스터와 플랫폼을 설계·운영합니다.',
      c: { systems: 3, build: 2, analysis: 1 }, v: { reward: 2, expertise: 2, stability: 1 }, s: { st: -0.3, sf: -0.7, db: -0.7 }, diff: 3,
      steps: ['Linux·네트워크·분산 시스템 기초', 'GPU 서버와 쿠버네티스 운영 경험', '추론 최적화·자원 스케줄링 프로젝트'],
      pf: 'GPU 추론 서버 성능을 측정하고 최적화한 리포트', tags: ['GPU', '분산 시스템', '쿠버네티스'] },
    { id: 'ondevice', field: 'eng', name: '온디바이스 AI 엔지니어', desc: '스마트폰·가전·차량 같은 기기 안에서 AI가 빠르게 돌도록 경량화합니다.',
      c: { build: 2, systems: 2, analysis: 2 }, v: { expertise: 2, growth: 1 }, s: { es: -0.2, db: -1 }, diff: 3,
      steps: ['C++·모바일 개발 기초', '양자화·경량화 기법 실습', '실제 기기에서 모델을 돌려 성능 측정'],
      pf: '경량화 전후 속도·정확도를 비교한 모바일 AI 앱', tags: ['양자화', '모바일', '임베디드'] },

    // 데이터
    { id: 'data_scientist', field: 'data', name: '데이터 사이언티스트', desc: '데이터로 가설을 검증하고 예측 모델을 만들어 문제를 풉니다.',
      c: { analysis: 3, data: 2, research: 1, build: 1 }, v: { growth: 2, expertise: 2, autonomy: 1 }, s: { es: -0.5, db: -0.3 }, diff: 2,
      steps: ['통계와 SQL·파이썬 분석 기초', '공개 데이터로 예측 모델 프로젝트', '비즈니스 문제를 정의하고 결과를 설명하는 연습'],
      pf: '문제 정의부터 모델·인사이트까지 담은 분석 노트북', tags: ['통계', 'Python', '예측 모델'] },
    { id: 'data_engineer', field: 'data', name: '데이터 엔지니어', desc: 'AI와 분석에 쓰일 데이터를 모으고 정리하는 파이프라인을 만듭니다.',
      c: { systems: 3, data: 2, build: 2 }, v: { stability: 2, reward: 1, expertise: 1 }, s: { es: 0.3, st: -0.3, sf: -1 }, diff: 2,
      steps: ['SQL과 데이터베이스 설계', '배치·스트리밍 파이프라인 도구 실습', '수집부터 적재까지 자동화한 프로젝트'],
      pf: '공개 API 데이터를 매일 수집·적재하는 파이프라인', tags: ['SQL', 'ETL', '데이터 웨어하우스'] },
    { id: 'data_analyst', field: 'data', name: 'AI 서비스 데이터 분석가', desc: '사용 지표를 분석해 AI 서비스의 개선 방향을 찾고 의사결정을 돕습니다.',
      c: { data: 3, analysis: 2, comm: 2, product: 1 }, v: { impact: 1, growth: 1, stability: 1 }, s: { st: 0.5, db: 0.3 }, diff: 1,
      steps: ['SQL과 엑셀·BI 도구 익히기', '지표 설계와 A/B 테스트 이해', '분석 결과를 한 장 리포트로 설명하는 연습'],
      pf: '가상의 AI 서비스 지표 대시보드와 개선 제안서', tags: ['SQL', 'BI', '지표 설계'] },
    { id: 'data_curator', field: 'data', name: 'AI 학습데이터 매니저', desc: '좋은 학습 데이터의 기준을 세우고 수집·라벨링 품질을 관리합니다.',
      c: { data: 3, ethics: 1, comm: 1, product: 1 }, v: { stability: 2, impact: 1 }, s: { st: 0.3, sf: -1 }, diff: 1,
      steps: ['데이터 라벨링 가이드라인 이해', '품질 검수 기준 만들기 실습', '작은 데이터셋을 직접 구축하고 공개'],
      pf: '라벨링 가이드와 검수 결과를 담은 소규모 데이터셋', tags: ['라벨링', '품질 관리', '가이드라인'] },
    { id: 'eval_engineer', field: 'data', name: 'AI 평가(Evals) 엔지니어', desc: 'AI가 정말 좋아졌는지 재는 평가 문항과 자동 채점 체계를 만듭니다.',
      c: { analysis: 3, data: 2, research: 1, build: 1, ethics: 1 }, v: { expertise: 2, growth: 2, impact: 1 }, s: { es: -0.5, sf: -0.3 }, diff: 2,
      steps: ['평가 지표와 통계적 유의성 이해', 'LLM 출력 평가셋 직접 설계', '자동 채점 파이프라인 구현'],
      pf: '특정 업무용 LLM 평가셋과 모델별 비교 결과 공개', tags: ['벤치마크', 'LLM 평가', '통계'] },

    // 제품·기획
    { id: 'ai_pm', field: 'product', name: 'AI 프로덕트 매니저', desc: 'AI 제품의 방향과 우선순위를 정하고 팀을 이끌어 성과를 냅니다.',
      c: { product: 3, comm: 2, analysis: 1, data: 1 }, v: { impact: 2, reward: 2, growth: 1 }, s: { es: 0.5, st: 1, db: 1 }, diff: 2,
      steps: ['AI 기술의 가능성과 한계를 이해', '사용자 문제 정의·지표 설계 연습', '작은 AI 기능을 기획부터 출시까지 경험'],
      pf: 'AI 기능 기획서(PRD)와 출시 후 지표 회고', tags: ['PRD', '로드맵', '지표'] },
    { id: 'ai_planner', field: 'product', name: 'AI 서비스 기획자', desc: 'AI 기능이 들어간 화면과 흐름을 설계하고 기획서로 정리합니다.',
      c: { product: 3, comm: 2, creative: 1 }, v: { impact: 1, stability: 1, growth: 1 }, s: { st: 0.5, sf: -0.5, db: 0.5 }, diff: 1,
      steps: ['서비스 기획 기본(화면 설계·정책서)', '생성형 AI 서비스 사례 분석', 'AI 기능 기획서를 직접 작성해 보기'],
      pf: '기존 서비스에 AI 기능을 더한 기획서와 화면 설계', tags: ['화면 설계', '정책서', 'UX'] },
    { id: 'conv_designer', field: 'product', name: '대화형 AI 디자이너', desc: 'AI의 말투, 대화 흐름, 예외 상황 응답을 설계해 자연스러운 경험을 만듭니다.',
      c: { creative: 2, comm: 2, product: 2 }, v: { impact: 1, autonomy: 1, growth: 1 }, s: { st: 0.3, sf: 0.3 }, diff: 1,
      steps: ['UX 라이팅과 대화 설계 원칙 익히기', '챗봇 대화 시나리오 작성 실습', '사용자 테스트로 대화 흐름 개선'],
      pf: '특정 고객 상황의 챗봇 대화 설계서와 개선 전후 비교', tags: ['UX 라이팅', '대화 설계', '페르소나'] },
    { id: 'prompt_engineer', field: 'product', name: '프롬프트 엔지니어', desc: '프롬프트와 지시문을 설계·실험해 AI 답변의 품질과 일관성을 높입니다.',
      c: { comm: 2, analysis: 2, creative: 1, build: 1, product: 1 }, v: { growth: 2, autonomy: 2 }, s: { es: 0.7, sf: 0.5 }, diff: 1,
      steps: ['주요 LLM의 프롬프트 가이드 정독', '같은 과제를 여러 프롬프트로 비교 실험', '평가 기준을 세워 개선 과정을 기록'],
      pf: '업무 하나의 프롬프트를 개선해 품질을 수치로 비교', tags: ['프롬프트', '실험', '평가'] },
    { id: 'ai_ux_researcher', field: 'product', name: 'AI UX 리서처', desc: '사람들이 AI를 어떻게 쓰고 믿는지 연구해 제품 방향에 반영합니다.',
      c: { research: 2, comm: 2, product: 2, analysis: 1 }, v: { impact: 2, expertise: 1 }, s: { es: -0.7, st: 0.5 }, diff: 2,
      steps: ['사용자 인터뷰·설문 방법론', 'AI 사용 행태 관련 연구 읽기', '실제 사용자 인터뷰 후 인사이트 리포트 작성'],
      pf: 'AI 도구 사용자 5명 인터뷰 리포트', tags: ['인터뷰', '설문', '사용성 테스트'] },

    // 비즈니스·현장
    { id: 'solutions_engineer', field: 'biz', name: 'AI 솔루션 엔지니어', desc: '고객에게 AI 제품을 기술적으로 설명·시연하고 도입 방안을 제안합니다.',
      c: { comm: 3, build: 2, product: 1, systems: 1 }, v: { reward: 3, growth: 1 }, s: { es: 0.5, st: 1, sf: 0.5, db: 1 }, diff: 2,
      steps: ['AI 제품과 API를 직접 써 보며 데모 만들기', '고객 요구를 기술 요건으로 바꾸는 연습', '기술 발표와 제안서 작성 경험'],
      pf: '가상 고객사를 위한 AI 도입 데모와 제안 자료', tags: ['기술 데모', '제안', '고객 대응'] },
    { id: 'ai_consultant', field: 'biz', name: 'AI 도입 컨설턴트', desc: '기업의 업무를 진단해 AI를 어디에 어떻게 도입할지 로드맵을 세웁니다.',
      c: { comm: 3, product: 2, analysis: 2 }, v: { reward: 2, impact: 1, growth: 1 }, s: { st: 0.7, sf: -0.3, db: 1 }, diff: 2,
      steps: ['업무 프로세스 분석 방법 익히기', 'AI 도입 사례와 효과 측정 공부', '실제 조직의 업무 하나를 진단해 보기'],
      pf: '한 부서의 업무를 진단한 AI 도입 로드맵', tags: ['업무 진단', '로드맵', 'ROI'] },
    { id: 'fde', field: 'biz', name: '포워드 디플로이드 엔지니어', desc: '고객사 현장에 들어가 문제를 파악하고 AI 솔루션을 직접 구축합니다.',
      c: { build: 3, comm: 2, product: 2, systems: 1 }, v: { growth: 2, reward: 2, autonomy: 1 }, s: { es: 1, st: 0.7, sf: 1, db: 0.7 }, diff: 3,
      steps: ['개발 실력(백엔드·데이터) 확실히 다지기', '고객 요구를 빠르게 프로토타입으로 만드는 연습', '도메인 지식(제조·금융·공공 등) 하나 쌓기'],
      pf: '실제 업무 담당자와 함께 만든 AI 자동화 사례', tags: ['현장 구축', '프로토타입', '도메인'] },
    { id: 'ai_educator', field: 'biz', name: 'AI 교육 강사·에듀케이터', desc: '사람들이 AI를 이해하고 업무에 활용하도록 교육과 교재를 만듭니다.',
      c: { comm: 3, creative: 1, research: 1, product: 1 }, v: { impact: 3, autonomy: 1 }, s: { st: 0.7, db: 0.5 }, diff: 1,
      steps: ['생성형 AI 도구를 업무별로 깊게 써 보기', '실습 중심 교안 설계', '작은 규모라도 강의·워크숍 진행 경험'],
      pf: '직무별 AI 활용 실습 교안과 강의 후기', tags: ['교안', '워크숍', 'AX 교육'] },
    { id: 'ai_csm', field: 'biz', name: 'AI 고객성공 매니저', desc: 'AI 제품을 도입한 고객이 실제 성과를 내도록 온보딩과 활용을 지원합니다.',
      c: { comm: 3, product: 2, data: 1 }, v: { stability: 2, impact: 1, reward: 1 }, s: { st: 1, sf: -0.3, db: 0.5 }, diff: 1,
      steps: ['SaaS 고객성공·온보딩 업무 이해', '활용 지표로 고객 상태를 진단하는 연습', '고객 교육·안내 자료 만들기'],
      pf: '가상 고객의 온보딩 계획과 활용률 개선안', tags: ['온보딩', '고객 관리', '활용 지표'] },
    { id: 'devrel', field: 'biz', name: '데브렐(DevRel)', desc: '개발자 커뮤니티에 AI 플랫폼을 알리고, 발표·튜토리얼·피드백을 연결합니다.',
      c: { comm: 3, build: 2, creative: 1 }, v: { growth: 2, autonomy: 2, impact: 1 }, s: { st: 0.7, sf: 0.7, db: 0.7 }, diff: 2,
      steps: ['AI API로 예제 앱 여러 개 만들기', '기술 블로그와 튜토리얼 꾸준히 쓰기', '커뮤니티 발표·스터디 운영'],
      pf: '튜토리얼 시리즈와 예제 코드 저장소', tags: ['기술 블로그', '발표', '커뮤니티'] },
    { id: 'tech_writer', field: 'biz', name: 'AI 테크니컬 라이터', desc: 'AI 제품의 API 문서, 가이드, 튜토리얼을 정확하고 읽기 쉽게 씁니다.',
      c: { comm: 3, build: 1, research: 1, product: 1 }, v: { stability: 2, expertise: 1, autonomy: 1 }, s: { st: -0.5, sf: -0.7, db: -0.3 }, diff: 1,
      steps: ['기술 문서 작성 원칙 익히기', 'API를 직접 써 보고 문서로 정리', '오픈소스 문서 기여로 실적 쌓기'],
      pf: '오픈소스 AI 도구의 한국어 가이드 작성·기여', tags: ['API 문서', '가이드', '튜토리얼'] },

    // 신뢰·안전·정책
    { id: 'safety_researcher', field: 'trust', name: 'AI 안전성 연구원', desc: 'AI가 사람의 의도대로 안전하게 행동하도록 정렬(alignment)을 연구합니다.',
      c: { research: 3, analysis: 3, ethics: 2, build: 1 }, v: { impact: 3, expertise: 2 }, s: { es: -1, db: -0.7 }, diff: 3,
      steps: ['머신러닝 기초와 안전성 핵심 논문 읽기', '모델 해석·평가 실험 재현', '연구 프로그램·펠로우십 지원'],
      pf: '공개 안전성 연구 하나를 재현하고 확장한 리포트', tags: ['정렬', '해석 가능성', '평가'] },
    { id: 'red_teamer', field: 'trust', name: 'AI 레드팀 전문가', desc: 'AI를 일부러 공격해 위험한 답변과 허점을 찾아내고 개선을 돕습니다.',
      c: { ethics: 2, creative: 2, analysis: 2, research: 1 }, v: { impact: 2, autonomy: 1, growth: 1 }, s: { es: 0.5, sf: 0.7 }, diff: 2,
      steps: ['AI 위험 유형과 공격 기법 이해', '공개 레드팀 챌린지 참가', '발견한 문제를 재현 가능하게 보고하는 연습'],
      pf: '공개 챌린지 참여 기록과 위험 사례 분석 보고서', tags: ['탈옥 분석', '위험 평가', '보고서'] },
    { id: 'ai_governance', field: 'trust', name: 'AI 거버넌스·정책 전문가', desc: 'AI 관련 법·규제를 해석하고 기업과 기관의 AI 사용 원칙을 만듭니다.',
      c: { ethics: 3, comm: 2, product: 1, research: 1 }, v: { impact: 2, stability: 2 }, s: { st: 0.5, sf: -0.7, db: 0.7 }, diff: 2,
      steps: ['국내외 AI 규제(AI 기본법 등) 공부', '기업 AI 사용 가이드라인 사례 분석', '가상의 조직용 AI 정책 초안 작성'],
      pf: '한 조직을 위한 AI 사용 정책과 위험 점검표', tags: ['AI 규제', '가이드라인', '리스크 관리'] },
    { id: 'trust_safety', field: 'trust', name: '트러스트 & 세이프티 매니저', desc: 'AI 서비스에서 유해 콘텐츠와 악용을 막는 정책을 세우고 운영합니다.',
      c: { ethics: 3, data: 1, comm: 1, product: 1 }, v: { impact: 2, stability: 2 }, s: { es: 0.3, st: 0.3, sf: -0.5 }, diff: 1,
      steps: ['콘텐츠 정책과 신고 처리 흐름 이해', '유해 사례 분류 기준 만들기 실습', '정책 변경의 효과를 데이터로 보는 연습'],
      pf: '가상 AI 서비스의 콘텐츠 정책과 판단 사례집', tags: ['콘텐츠 정책', '악용 대응', '운영'] },
    { id: 'ai_security', field: 'trust', name: 'AI 보안 엔지니어', desc: '프롬프트 주입, 데이터 유출 같은 공격에서 AI 시스템과 데이터를 지킵니다.',
      c: { systems: 3, ethics: 2, analysis: 2, build: 1 }, v: { stability: 2, expertise: 2, reward: 1 }, s: { sf: -0.5, db: -0.7 }, diff: 3,
      steps: ['네트워크·시스템 보안 기초', 'LLM 애플리케이션 보안 위협 정리', '취약한 AI 앱을 진단하고 방어하는 실습'],
      pf: 'AI 챗봇 취약점 진단과 방어 적용 보고서', tags: ['보안', '프롬프트 주입', '접근 통제'] },

    // 크리에이티브
    { id: 'genai_creator', field: 'creative', name: '생성형 AI 콘텐츠 크리에이터', desc: '이미지·영상·음악 생성 AI로 작품과 콘텐츠를 만들어 선보입니다.',
      c: { creative: 3, comm: 1, build: 1 }, v: { autonomy: 3, growth: 1, reward: 1 }, s: { es: 1, st: -0.5, sf: 1 }, diff: 1,
      steps: ['주요 생성형 AI 도구 숙련', '나만의 스타일과 작업 과정 확립', '꾸준히 발행해 포트폴리오 채널 만들기'],
      pf: '한 가지 주제로 연재한 AI 콘텐츠 시리즈', tags: ['이미지 생성', '영상 생성', '연재'] },
    { id: 'ai_creative_director', field: 'creative', name: 'AI 크리에이티브 디렉터', desc: 'AI를 활용한 광고·영상·브랜드 프로젝트의 콘셉트와 품질을 총괄합니다.',
      c: { creative: 3, product: 2, comm: 2 }, v: { expertise: 2, autonomy: 1, reward: 1 }, s: { st: 0.7, sf: 0.3, db: 0.7 }, diff: 2,
      steps: ['디자인·영상 제작 기본기', 'AI 제작 워크플로 설계 경험', '팀 프로젝트를 콘셉트부터 완성까지 이끌기'],
      pf: 'AI로 만든 캠페인 콘셉트와 제작 과정 기록', tags: ['콘셉트', '아트 디렉션', '워크플로'] },
    { id: 'genai_marketer', field: 'creative', name: 'AI 콘텐츠 마케터', desc: '생성형 AI로 마케팅 콘텐츠를 빠르게 만들고 성과 데이터로 개선합니다.',
      c: { creative: 2, comm: 2, data: 2, product: 1 }, v: { reward: 2, growth: 1, impact: 1 }, s: { es: 0.7, st: 0.5, sf: 0.5, db: 0.5 }, diff: 1,
      steps: ['마케팅 기본과 성과 지표 이해', 'AI로 콘텐츠 제작 속도 높이는 워크플로 만들기', '실험 결과를 데이터로 정리'],
      pf: 'AI로 만든 광고 소재 A/B 테스트 결과', tags: ['콘텐츠 마케팅', '성과 분석', 'A/B 테스트'] },

    // AX·업무 혁신
    { id: 'ax_strategist', field: 'ax', name: 'AX 전략 기획자', desc: '조직 전체의 AI 전환 방향을 세우고, 어떤 업무부터 바꿀지 과제를 발굴·선정합니다.',
      c: { product: 3, analysis: 2, comm: 2 }, v: { impact: 2, reward: 2, growth: 1 }, s: { es: -0.3, st: 0.5, sf: -0.3, db: 1 }, diff: 2,
      steps: ['업무 프로세스 분석과 전략 기획 기본기', 'AI 도입 사례를 산업별로 정리해 보기', '한 조직의 AX 과제 후보를 뽑고 우선순위 매기기'],
      pf: '가상 기업의 AX 과제 발굴표와 1년 로드맵', tags: ['AX 전략', '과제 발굴', '로드맵'] },
    { id: 'ax_pmo', field: 'ax', name: 'AX 프로젝트 매니저(PM·PMO)', desc: 'AI 도입 사업의 일정·범위·산출물·이해관계자를 관리해 사업을 끝까지 완수합니다.',
      c: { product: 2, comm: 3, analysis: 1, systems: 1 }, v: { stability: 2, reward: 1, impact: 1 }, s: { es: 0.3, st: 1, sf: -1, db: 0.7 }, diff: 2,
      steps: ['프로젝트 관리 기본(일정·범위·위험·이슈 관리)', 'AI 사업 특유의 데이터·모델 검증 단계 이해', 'AI 도입 사업에 PMO·PL로 참여해 산출물 관리'],
      pf: 'AI 도입 사업 WBS·이슈 관리표·검수 계획서 샘플', tags: ['PMO', '일정 관리', '검수'] },
    { id: 'ax_proposal', field: 'ax', name: 'AX 사업 제안 매니저', desc: '공공기관·기업의 AI 도입 사업 공고(RFP)를 분석하고 제안서와 발표로 사업을 수주합니다.',
      c: { comm: 3, product: 2, analysis: 1, creative: 1 }, v: { reward: 2, growth: 1, expertise: 1 }, s: { es: 0.5, st: 0.7, sf: -0.3, db: 1 }, diff: 2,
      steps: ['RFP 분석과 요구사항 정리 연습', 'AI 사업 제안서 구조와 평가 기준 공부', '제안 발표와 기술 질의 대응 경험'],
      pf: '공개된 AI 사업 RFP로 작성한 제안 요약서', tags: ['RFP', '제안서', '공공 사업'] },
    { id: 'ax_edu_planner', field: 'ax', name: 'AX 교육 기획자', desc: '직무별 AI 활용 교육 과정을 설계하고, 사내 교육을 운영해 효과를 측정합니다.',
      c: { comm: 3, product: 2, creative: 1, data: 1 }, v: { impact: 3, stability: 1 }, s: { st: 0.7, sf: -0.5, db: 0.7 }, diff: 1,
      steps: ['교육 설계(요구 분석·커리큘럼·평가) 기본', '직무별 생성형 AI 활용 사례 수집', '작은 교육을 기획·운영하고 만족도·활용도 측정'],
      pf: '직무별 AI 활용 교육 커리큘럼과 운영 결과 보고서', tags: ['커리큘럼', '교육 운영', '효과 측정'] },
    { id: 'ax_change', field: 'ax', name: 'AX 변화관리 매니저', desc: 'AI로 바뀐 일하는 방식이 조직에 자리 잡도록 소통·설득하고 저항을 관리합니다.',
      c: { comm: 3, product: 2, ethics: 1 }, v: { impact: 2, stability: 1, growth: 1 }, s: { st: 1, sf: 0.3, db: 0.7 }, diff: 2,
      steps: ['조직 변화관리 이론과 사례 공부', '현업 담당자 인터뷰로 도입 장애 요인 찾기', '사내 소통 캠페인과 우수 사례 공유회 기획'],
      pf: 'AI 도입 저항 요인 분석과 변화관리 계획서', tags: ['변화관리', '조직문화', '사내 소통'] },
    { id: 'ax_champion', field: 'ax', name: '현업 AI 활용 리더(AI 챔피언)', desc: '자기 부서 업무를 가장 잘 아는 사람으로서 AI 활용 사례를 만들고 동료들에게 퍼뜨립니다.',
      c: { comm: 2, product: 2, creative: 1, build: 1 }, v: { growth: 2, impact: 2 }, s: { es: 1, st: 0.7, sf: 0.5 }, diff: 1,
      steps: ['지금 업무에 생성형 AI를 매일 써 보기', '시간을 줄인 사례를 전후 비교로 기록', '팀 안에서 짧은 공유 세션 열기'],
      pf: '내 업무 AI 활용 사례집(전후 시간 비교 포함)', tags: ['업무 활용', '사례 공유', '현업 주도'] },
    { id: 'ax_automation', field: 'ax', name: 'AI 업무 자동화 매니저', desc: 'AI와 노코드·RPA 도구로 반복 업무를 자동화하고, 사내 자동화 요청을 처리합니다.',
      c: { build: 2, product: 2, systems: 1, data: 1 }, v: { growth: 2, autonomy: 1, stability: 1 }, s: { es: 1, sf: 0.3, db: 0.5 }, diff: 1,
      steps: ['노코드 자동화 도구와 간단한 스크립트 익히기', '반복 업무 하나를 골라 끝까지 자동화', '자동화 전후 처리 시간과 오류율 비교'],
      pf: '반복 업무 자동화 3건과 절감 시간 기록', tags: ['노코드', 'RPA', '워크플로 자동화'] },
    { id: 'ax_platform', field: 'ax', name: '사내 AI 플랫폼 운영 관리자', desc: '사내 생성형 AI 도구의 계정·권한·보안·사용 정책과 비용을 운영하고 문의에 대응합니다.',
      c: { systems: 3, ethics: 2, comm: 1 }, v: { stability: 3, expertise: 1 }, s: { st: 0.3, sf: -1, db: 0.3 }, diff: 2,
      steps: ['서버·계정·권한 관리 등 IT 운영 기본', '생성형 AI 서비스의 보안·개인정보 이슈 정리', '사용량·비용 모니터링과 사용자 문의 대응 경험'],
      pf: '사내 AI 도구 운영 정책서와 사용량 대시보드 예시', tags: ['IT 운영', '권한 관리', '사용 정책'] },
    { id: 'ax_value', field: 'ax', name: 'AX 성과·ROI 분석가', desc: 'AI 도입 전후의 시간·비용·품질 변화를 측정해 투자 효과를 증명하고 다음 과제를 제안합니다.',
      c: { analysis: 3, data: 2, product: 1, comm: 1 }, v: { expertise: 2, impact: 1, stability: 1 }, s: { es: -0.5, sf: -0.5 }, diff: 2,
      steps: ['업무 측정 지표와 ROI 계산법 익히기', 'SQL·엑셀로 사용 로그 분석', '도입 전후 비교 보고서를 한 장으로 정리'],
      pf: 'AI 도입 전후 업무 시간·비용 비교 분석 보고서', tags: ['ROI', '성과 지표', '분석 보고서'] },
  ];

  return { COMP, VAL, STYLE, SITUATIONS, FIELDS, SECTIONS, QUESTIONS: Q, JOBS, TYPES, TYPE_MODS };
})();
