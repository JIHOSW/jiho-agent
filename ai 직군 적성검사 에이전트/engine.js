// 규칙 기반 채점 엔진 — 화면과 분리된 순수 계산 로직
(function (root) {
  const D = root.DATA;
  const KIND = {};
  Object.keys(D.COMP).forEach(k => (KIND[k] = 'comp'));
  Object.keys(D.VAL).forEach(k => (KIND[k] = 'val'));
  Object.keys(D.STYLE).forEach(k => (KIND[k] = 'style'));

  const MAX_FIELDS = 3;

  // 상황·관심 영역 갈래에 따라 이번 검사에서 물을 문항 목록을 만든다
  function buildQuestions(state) {
    const base = D.QUESTIONS.filter(q => q.sec !== 'deep');
    const picked = (state.fields || []).filter(f => f !== 'unknown').slice(0, MAX_FIELDS);
    const deepFields = picked.length ? picked : ['unknown'];
    // 영역을 골랐더라도 '잘 모르겠음'을 함께 고르면 탐색 문항을 더한다
    if (picked.length && (state.fields || []).includes('unknown')) deepFields.push('unknown');
    const deep = D.QUESTIONS.filter(q => q.sec === 'deep' && deepFields.includes(q.field));
    return [...base, ...deep];
  }

  function score(state) {
    const qs = buildQuestions(state);
    const raw = { comp: {}, val: {}, style: {} };
    const max = { comp: {}, val: {}, style: {} };
    const jobBonus = {};
    const fieldBonus = {};
    Object.keys(KIND).forEach(k => { raw[KIND[k]][k] = 0; max[KIND[k]][k] = 0; });

    for (const q of qs) {
      // 문항마다 각 키가 얻을 수 있는 최대치(스타일은 절댓값)를 누적해 정규화 기준으로 쓴다
      const best = {};
      for (const opt of q.options) {
        for (const [k, v] of Object.entries(opt.fx)) {
          if (!KIND[k]) continue;
          const m = KIND[k] === 'style' ? Math.abs(v) : Math.max(0, v);
          best[k] = Math.max(best[k] || 0, m);
        }
      }
      Object.entries(best).forEach(([k, m]) => (max[KIND[k]][k] += m));

      const idx = state.answers[q.id];
      if (idx == null || !q.options[idx]) continue;
      const fx = q.options[idx].fx;
      for (const [k, v] of Object.entries(fx)) {
        if (KIND[k]) raw[KIND[k]][k] += v;
        else if (k === 'jobs') Object.entries(v).forEach(([id, p]) => (jobBonus[id] = (jobBonus[id] || 0) + p));
        else if (k === 'fields') Object.entries(v).forEach(([f, p]) => (fieldBonus[f] = (fieldBonus[f] || 0) + p));
      }
    }

    const norm = kind => {
      const out = {};
      for (const k of Object.keys(raw[kind])) {
        const m = max[kind][k];
        out[k] = m ? raw[kind][k] / m : 0;
        if (kind !== 'style') out[k] = Math.max(0, Math.min(1, out[k]));
        else out[k] = Math.max(-1, Math.min(1, out[k]));
      }
      return out;
    };
    const comp = norm('comp');
    const val = norm('val');
    const style = norm('style');

    // 직군 매칭은 '모양'을 본다: 가장 높은 항목을 1로 맞춘 상대 점수
    const rel = obj => {
      const top = Math.max(...Object.values(obj), 0.0001);
      return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v / top]));
    };
    const rc = rel(comp);
    const rv = rel(val);
    const fieldsPicked = new Set((state.fields || []).filter(f => f !== 'unknown'));

    const weighted = (w, u) => {
      let s = 0, t = 0;
      for (const [k, wt] of Object.entries(w)) { s += wt * (u[k] || 0); t += wt; }
      return t ? s / t : 0;
    };

    const jobs = D.JOBS.map(job => {
      const compFit = weighted(job.c, rc);
      const valFit = weighted(job.v, rv);
      let sNum = 0, sDen = 0;
      for (const [k, target] of Object.entries(job.s)) {
        const wt = Math.abs(target);
        sNum += wt * (1 - Math.abs(style[k] - target) / 2);
        sDen += wt;
      }
      const styleFit = sDen ? sNum / sDen : 0.6;

      let bonus = 0;
      if (fieldsPicked.has(job.field)) bonus += 0.05;
      bonus += 0.035 * (jobBonus[job.id] || 0);
      bonus += 0.02 * (fieldBonus[job.field] || 0);
      if (state.sit === 'switcher' && job.diff === 1) bonus += 0.02;
      if (state.sit === 'itpro' && job.c.build) bonus += 0.01;

      const rawFit = 0.5 * compFit + 0.25 * valFit + 0.25 * styleFit + bonus;
      // 사람이 읽는 적합도(%) — 40~99 사이로 펼친다
      const fit = Math.round(Math.max(40, Math.min(99, 40 + (rawFit - 0.35) * 110)));
      return { job, fit, rawFit, compFit, valFit, styleFit };
    }).sort((a, b) => b.rawFit - a.rawFit);

    return { comp, val, style, jobs, questions: qs };
  }

  // 왜 맞는지, 무엇을 보완하면 좋은지
  function explain(result, entry, sit) {
    const { comp, val, style } = result;
    const { job } = entry;
    const strengths = Object.keys(job.c)
      .map(k => ({ k, s: job.c[k] * comp[k] }))
      .sort((a, b) => b.s - a.s)
      .filter(x => comp[x.k] >= 0.35)
      .slice(0, 2)
      .map(x => D.COMP[x.k]);
    const values = Object.keys(job.v)
      .filter(k => val[k] >= 0.4)
      .sort((a, b) => job.v[b] * val[b] - job.v[a] * val[a])
      .slice(0, 2)
      .map(k => D.VAL[k]);
    const styleMatch = Object.entries(job.s)
      .filter(([k, t]) => Math.abs(t) >= 0.5 && Math.sign(t) === Math.sign(style[k]) && Math.abs(style[k]) >= 0.2)
      .map(([k, t]) => D.STYLE[k][t < 0 ? 0 : 1]);
    const gap = Object.keys(job.c)
      .filter(k => job.c[k] >= 2 && comp[k] < 0.35)
      .sort((a, b) => comp[a] - comp[b])
      .slice(0, 2)
      .map(k => D.COMP[k]);

    const why = [];
    if (strengths.length) why.push(`강점인 ${strengths.join(', ')} 역량이 이 직무의 핵심과 맞아요.`);
    if (values.length) why.push(`중요하게 여기는 가치(${values.join(', ')})를 이 일에서 얻기 좋아요.`);
    if (styleMatch.length) why.push(`${styleMatch.join(' · ')} 업무 스타일과 잘 어울려요.`);
    if (!why.length) why.push('여러 역량이 고르게 쓰이는 직무라 전반적인 성향과 잘 맞아요.');

    return { why, gap, firstStep: firstStep(job, sit, result) };
  }

  function firstStep(job, sit, result) {
    if (sit === 'student') return `학기 중 첫걸음: ${job.steps[0]}. 수업 과제를 이 직무 관점으로 바꿔 해보세요.`;
    if (sit === 'jobseeker') return `포트폴리오 아이디어: ${job.pf}`;
    if (sit === 'itpro') return `지금 업무에서 시작하기: 현재 하는 일에 붙일 작은 과제로 '${job.pf}'에 도전해 보세요.`;
    // 비IT 직무 전환자: 진입 난이도에 따라 다른 경로를 안내
    if (job.diff === 1) return `비전공·직무 전환자도 진입 사례가 많은 직무예요. 기존 경력의 도메인 지식이 강점이 됩니다. 첫걸음: ${job.steps[0]}.`;
    if (job.diff === 2) return `기초 코딩·데이터 역량을 6개월~1년 쌓으면 도전할 수 있어요. 첫걸음: ${job.steps[0]}.`;
    // 내 결과에서 순위가 가장 높은 '더 쉬운' 직군을 징검다리로 추천 (같은 영역이면 우선)
    const easier = result.jobs.map(e => e.job).filter(x => x.diff < job.diff);
    const bridge = easier.find(x => x.field === job.field) || easier[0];
    const where = bridge.field === job.field ? '같은 영역의' : '내 결과에서 순위가 높은';
    return `전공 수준 지식이 필요한 직무예요. ${where} '${bridge.name}'처럼 진입이 쉬운 직무로 먼저 들어가 경험을 쌓은 뒤 옮겨 가는 경로를 추천해요.`;
  }

  // 공유 링크용 상태 인코딩 (영문 id와 숫자만 담기므로 base64로 충분)
  function encode(state) {
    const qs = buildQuestions(state);
    const a = qs.map(q => (state.answers[q.id] == null ? '-' : state.answers[q.id])).join('');
    const json = JSON.stringify({ s: state.sit, f: state.fields, a });
    return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(str) {
    const json = JSON.parse(atob(str.replace(/-/g, '+').replace(/_/g, '/')));
    if (!D.SITUATIONS[json.s] || !Array.isArray(json.f)) throw new Error('bad state');
    const state = { sit: json.s, fields: json.f.filter(f => D.FIELDS[f] || f === 'unknown'), answers: {} };
    buildQuestions(state).forEach((q, i) => {
      const c = json.a[i];
      if (c != null && c !== '-' && q.options[+c]) state.answers[q.id] = +c;
    });
    return state;
  }

  root.ENGINE = { buildQuestions, score, explain, encode, decode, MAX_FIELDS };
})(typeof window !== 'undefined' ? window : globalThis);
