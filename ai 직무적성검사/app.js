// AI 직군 적성검사 — 대화형 화면
(() => {
  const D = window.DATA;
  const E = window.ENGINE;
  const KEY = 'aiCareerTest.v1';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const fresh = () => ({ sit: null, fields: [], fieldsDone: false, answers: {}, history: [] });
  let S = fresh();
  let draftFields = [];

  // ── 저장 (브라우저에만, 실패해도 검사는 계속 진행) ──
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 저장 불가 환경 */ } };
  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY)); return v && Array.isArray(v.history) ? v : null; } catch (e) { return null; } };
  const clear = () => { try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ } };

  const tok = text => text.replace(/\{(\w+)\}/g, (_, k) => (S.sit && D.SITUATIONS[S.sit].tok[k]) || '');

  function show(id) {
    ['intro', 'chat', 'result'].forEach(s => ($(s).hidden = s !== id));
    $('restartBtn').hidden = id === 'intro';
    window.scrollTo({ top: 0 });
  }

  function toast(msg) {
    const t = $('toast');
    t.textContent = msg; t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (t.hidden = true), 2200);
  }

  // ── 진행 단계 계산 ──
  const questions = () => E.buildQuestions({ sit: S.sit, fields: S.fieldsDone ? S.fields : ['unknown'], answers: S.answers });
  function currentStep() {
    if (!S.sit) return { kind: 'sit' };
    if (!S.fieldsDone) return { kind: 'fields' };
    const q = questions().find(x => S.answers[x.id] == null);
    return q ? { kind: 'q', q } : { kind: 'done' };
  }
  const currentStepOf = st => { const keep = S; S = st; const k = currentStep().kind; S = keep; return k; };
  const qById = id => D.QUESTIONS.find(q => q.id === id);

  // ── 채팅 렌더링 ──
  const agentMsg = (html, { old = false, tag = '', sys = false } = {}) =>
    `<div class="agent-row"><div class="avatar" aria-hidden="true">AI</div><div class="msg agent${sys ? ' sys' : ''}${old ? ' old' : ''}">${tag ? `<span class="qtag">${esc(tag)}</span>` : ''}${html}</div></div>`;
  const userMsg = (text, old = true) => `<div class="msg user${old ? ' old' : ''}">${esc(text)}</div>`;

  const SIT_PROMPT = '안녕하세요! AI 직군 적성검사 에이전트예요. 먼저 지금 어떤 상황인지 알려 주세요. 상황에 맞춰 질문 표현과 마지막 조언이 달라져요.';
  const FIELD_PROMPT = `관심 있는 AI 영역을 최대 ${E.MAX_FIELDS}개까지 골라 주세요. 고른 영역마다 직무를 좁히는 심화 질문이 2개씩 추가돼요. 아직 모르겠다면 '잘 모르겠음'을 골라도 괜찮아요.`;

  function fieldsText(fields) {
    return fields.map(f => (f === 'unknown' ? '잘 모르겠음' : D.FIELDS[f].label)).join(', ');
  }

  function renderChat() {
    const step = currentStep();
    if (step.kind === 'done') return finish();

    let html = '';
    let lastSec = null;
    let n = 0;
    const qs = questions();
    const qNum = id => qs.findIndex(q => q.id === id) + 1;

    for (const h of S.history) {
      if (h === 'sit') {
        html += agentMsg(esc(SIT_PROMPT), { old: true });
        html += userMsg(D.SITUATIONS[S.sit].label);
      } else if (h === 'fields') {
        html += agentMsg(esc(FIELD_PROMPT), { old: true });
        html += userMsg(fieldsText(S.fields));
      } else {
        const q = qById(h);
        if (!q) continue;
        if (q.sec !== lastSec) { html += agentMsg(esc(D.SECTIONS[q.sec].intro), { old: true, sys: true }); lastSec = q.sec; }
        html += agentMsg(esc(tok(q.text)), { old: true, tag: `Q${qNum(q.id)}` });
        html += userMsg(tok(q.options[S.answers[q.id]].label));
        n++;
      }
    }
    // 오래된 대화는 접어서 화면을 가볍게 유지
    const log = $('log');
    log.innerHTML = html;
    const rows = log.children;
    const keep = 9;
    if (rows.length > keep) {
      for (let i = 0; i < rows.length - keep; i++) rows[i].style.display = 'none';
      log.insertAdjacentHTML('afterbegin', `<button class="ghost small" id="showAll">이전 대화 ${n}개 모두 보기</button>`);
      $('showAll').onclick = () => { [...log.children].forEach(r => (r.style.display = '')); $('showAll').remove(); };
    }

    const ans = $('answers');
    ans.className = 'answers';
    let label = '시작';

    if (step.kind === 'sit') {
      log.insertAdjacentHTML('beforeend', agentMsg(esc(SIT_PROMPT)));
      ans.classList.add('grid2');
      ans.innerHTML = Object.entries(D.SITUATIONS).map(([id, s]) =>
        `<button class="opt" data-sit="${id}">${esc(s.label)}<small>${esc(s.desc)}</small></button>`).join('');
      ans.querySelectorAll('[data-sit]').forEach(b => (b.onclick = () => {
        S.sit = b.dataset.sit; S.history.push('sit'); save(); renderChat();
      }));
      label = '1단계 · 현재 상황';
    } else if (step.kind === 'fields') {
      log.insertAdjacentHTML('beforeend', agentMsg(esc(FIELD_PROMPT)));
      ans.classList.add('grid2');
      const opts = [...Object.entries(D.FIELDS), ['unknown', { label: '잘 모르겠음', desc: '탐색 질문으로 방향부터 찾기' }]];
      ans.innerHTML = opts.map(([id, f]) =>
        `<button class="opt${draftFields.includes(id) ? ' selected' : ''}" data-field="${id}" aria-pressed="${draftFields.includes(id)}">${esc(f.label)}<small>${esc(f.desc)}</small></button>`).join('')
        + `<p class="hint" id="fieldHint"></p><button class="primary" id="fieldsOk">선택 완료</button>`;
      const sync = () => {
        ans.querySelectorAll('[data-field]').forEach(b => {
          const on = draftFields.includes(b.dataset.field);
          b.classList.toggle('selected', on); b.setAttribute('aria-pressed', on);
        });
        const real = draftFields.filter(f => f !== 'unknown').length;
        $('fieldHint').textContent = draftFields.length ? `${real}개 영역 선택${draftFields.includes('unknown') ? ' + 탐색 질문' : ''}` : '하나 이상 골라 주세요.';
        $('fieldsOk').disabled = !draftFields.length;
      };
      ans.querySelectorAll('[data-field]').forEach(b => (b.onclick = () => {
        const id = b.dataset.field;
        if (draftFields.includes(id)) draftFields = draftFields.filter(f => f !== id);
        else if (id !== 'unknown' && draftFields.filter(f => f !== 'unknown').length >= E.MAX_FIELDS) return toast(`관심 영역은 최대 ${E.MAX_FIELDS}개까지 고를 수 있어요.`);
        else draftFields.push(id);
        sync();
      }));
      $('fieldsOk').onclick = () => {
        S.fields = [...draftFields]; S.fieldsDone = true; S.history.push('fields'); save(); renderChat();
      };
      sync();
      label = '2단계 · 관심 영역';
    } else {
      const q = step.q;
      if (q.sec !== lastSec) log.insertAdjacentHTML('beforeend', agentMsg(esc(D.SECTIONS[q.sec].intro), { sys: true }));
      log.insertAdjacentHTML('beforeend', agentMsg(esc(tok(q.text)), { tag: `Q${qNum(q.id)} / ${qs.length}` }));
      if (q.type === 'pair') ans.classList.add('pair');
      ans.innerHTML = q.options.map((o, i) => `<button class="opt" data-i="${i}">${esc(tok(o.label))}</button>`).join('');
      ans.querySelectorAll('[data-i]').forEach(b => (b.onclick = () => {
        S.answers[q.id] = +b.dataset.i; S.history.push(q.id); save(); renderChat();
      }));
      label = D.SECTIONS[q.sec].label;
    }

    // 진행률
    const total = 2 + qs.length;
    const done = S.history.length;
    $('secLabel').textContent = label;
    $('countLabel').textContent = `${done} / ${total}`;
    $('barFill').style.width = `${Math.round((done / total) * 100)}%`;
    $('backBtn').disabled = !S.history.length;
    $('backBtn').style.visibility = S.history.length ? 'visible' : 'hidden';

    requestAnimationFrame(() => {
      const first = ans.querySelector('.opt');
      const top = ans.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.45;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      if (first && document.activeElement && document.activeElement.classList.contains('opt')) first.focus({ preventScroll: true });
    });
  }

  function back() {
    const last = S.history.pop();
    if (!last) return;
    if (last === 'sit') S.sit = null;
    else if (last === 'fields') { S.fieldsDone = false; draftFields = [...S.fields]; }
    else delete S.answers[last];
    save(); renderChat();
  }

  function finish() {
    const code = E.encode(S);
    history.replaceState(null, '', `#r=${code}`);
    renderResult(S, false);
  }

  // ── 결과 ──
  const pct = v => Math.round(v * 100);
  const DIFF = { 1: '진입 난이도 낮음', 2: '진입 난이도 보통', 3: '진입 난이도 높음' };

  function hbars(obj, labels) {
    const rows = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    return rows.map(([k, v]) => `<div class="hbar" data-tip="${esc(labels[k])} ${pct(v)}점 / 100">
      <span class="name">${esc(labels[k])}</span>
      <div class="track"><div class="fill" style="width:${Math.max(1, pct(v))}%"></div></div>
      <span class="num">${pct(v)}</span></div>`).join('');
  }
  function table(obj, labels, head) {
    return `<details class="more"><summary>표로 보기</summary><div class="tablewrap"><table><thead><tr><th>${head}</th><th class="n">점수</th></tr></thead><tbody>${
      Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(labels[k])}</td><td class="n">${pct(v)}</td></tr>`).join('')
    }</tbody></table></div></details>`;
  }
  function axes(style) {
    return Object.entries(D.STYLE).map(([k, [L, R, dl, dr]]) => {
      const v = style[k];
      const w = Math.abs(v) * 50;
      const side = v < 0 ? 'left' : 'right';
      const pos = v < 0 ? `right:50%;width:${w}%` : `left:50%;width:${w}%`;
      const lean = Math.abs(v) < 0.2 ? '균형' : v < 0 ? L : R;
      const desc = Math.abs(v) < 0.2 ? '두 방식을 상황에 따라 고르게 써요.' : v < 0 ? dl : dr;
      return `<div class="axis" title="${esc(L)} ↔ ${esc(R)}: ${esc(lean)} (${Math.round(Math.abs(v) * 100)}%)">
        <div class="axis-labels"><span class="${v <= -0.2 ? 'on' : ''}">${esc(L)}</span><span class="${v >= 0.2 ? 'on' : ''}">${esc(R)}</span></div>
        <div class="axis-track"><div class="axis-fill ${side}" style="${pos}"></div></div>
        <div class="axis-desc">${esc(lean)} · ${esc(desc)}</div></div>`;
    }).join('');
  }

  function renderResult(state, shared) {
    const r = E.score(state);
    const top = r.jobs.slice(0, 5);
    const type = E.typeOf(r);
    const comps = Object.entries(r.comp).sort((a, b) => b[1] - a[1]);
    const vals = Object.entries(r.val).sort((a, b) => b[1] - a[1]);
    const styleWords = Object.entries(r.style).filter(([, v]) => Math.abs(v) >= 0.2)
      .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 2)
      .map(([k, v]) => D.STYLE[k][v < 0 ? 0 : 1]);
    const fieldsLabel = state.fields.length ? fieldsText(state.fields) : '-';

    const jobCard = (e, i) => {
      const x = E.explain(r, e, state.sit);
      const j = e.job;
      return `<article class="job">
        <div class="job-top">
          <div class="rank">${i + 1}</div>
          <div class="job-title"><h3>${esc(j.name)}<span class="diff">${DIFF[j.diff]}</span></h3><div class="field">${esc(D.FIELDS[j.field].label)}</div></div>
          <div class="fit"><b>${e.fit}%</b><span>적합도</span></div>
        </div>
        <div class="fitbar" role="img" aria-label="적합도 ${e.fit}%"><div style="width:${e.fit}%"></div></div>
        <p>${esc(j.desc)}</p>
        <span class="label">이런 점이 맞아요</span>
        <ul>${x.why.map(w => `<li>${esc(w)}</li>`).join('')}</ul>
        ${x.gap.length ? `<span class="label">보완하면 좋은 역량</span><p>${esc(x.gap.join(', '))}: 이 직무에서 많이 쓰이지만 이번 답변에서는 낮게 나왔어요.</p>` : ''}
        <div class="tip">${esc(x.firstStep)}</div>
        <details><summary>준비 로드맵과 키워드</summary>
          <ul>${j.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ul>
          <div class="chips">${j.tags.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
        </details>
      </article>`;
    };

    $('result').innerHTML = `
      <div class="r-head">
        <p class="eyebrow">${shared ? '공유된 결과 · ' : ''}${esc(D.SITUATIONS[state.sit].label)} · 관심 영역: ${esc(fieldsLabel)}</p>
        <p class="type-label">나의 유형</p>
        <h1>${esc(type.name)}</h1>
        <p class="type-desc">${esc(type.desc)}</p>
        <div class="best">가장 잘 맞는 직군 <b>${esc(top[0].job.name)}</b> <span>${top[0].fit}%</span></div>
        <p>강점은 <b>${esc(D.COMP[comps[0][0]])}</b>·<b>${esc(D.COMP[comps[1][0]])}</b>, 중요하게 여기는 가치는 <b>${esc(D.VAL[vals[0][0]])}</b>·<b>${esc(D.VAL[vals[1][0]])}</b>예요.
        ${styleWords.length ? `일할 때는 <b>${esc(styleWords.join(' · '))}</b>에 가까워요.` : '일하는 방식은 어느 한쪽에 치우치지 않고 균형 잡혀 있어요.'}</p>
        <div class="chips">${comps.slice(0, 3).map(([k]) => `<span class="chip accent">${esc(D.COMP[k])}</span>`).join('')}${vals.slice(0, 2).map(([k]) => `<span class="chip">${esc(D.VAL[k])}</span>`).join('')}${styleWords.map(w => `<span class="chip">${esc(w)}</span>`).join('')}</div>
      </div>

      <section class="r-sec">
        <h2>추천 AI 직군 TOP 5</h2>
        <p class="sub">역량 50% · 가치관 25% · 업무 스타일 25%로 계산하고, 관심 영역과 심화 문항 답변을 더했어요.</p>
        ${top.map(jobCard).join('')}
        <details class="more"><summary>AI 직군 ${r.jobs.length}개 전체 순위 보기</summary>
          <div class="tablewrap"><table><thead><tr><th>순위</th><th>직군</th><th>영역</th><th class="n">적합도</th></tr></thead><tbody>
          ${r.jobs.map((e, i) => `<tr><td>${i + 1}</td><td>${esc(e.job.name)}</td><td>${esc(D.FIELDS[e.job.field].label)}</td><td class="n">${e.fit}%</td></tr>`).join('')}
          </tbody></table></div></details>
      </section>

      <section class="r-sec">
        <h2>나의 분석 결과</h2>
        <p class="sub">점수는 0~100이며, 이번 검사에서 해당 항목을 고를 수 있었던 최대치 대비 비율이에요.</p>
        <div class="grid-2">
          <div class="card"><h3>역량</h3>${hbars(r.comp, D.COMP)}${table(r.comp, D.COMP, '역량')}</div>
          <div class="card"><h3>직업 가치관</h3>${hbars(r.val, D.VAL)}${table(r.val, D.VAL, '가치관')}</div>
        </div>
        <div class="card" style="margin-top:12px"><h3>업무 스타일</h3>${axes(r.style)}</div>
      </section>

      <div class="share">
        ${shared ? '<button class="primary" id="mineBtn">나도 검사하기</button>' : ''}
        <button class="${shared ? 'ghost' : 'primary'}" id="copyBtn">결과 링크 복사</button>
        <button class="ghost" id="imgBtn">이미지로 저장</button>
        <button class="ghost" id="pdfBtn">PDF로 저장</button>
        ${shared ? '' : '<button class="ghost" id="againBtn">다시 검사하기</button>'}
      </div>
      <p class="disclaimer">이 결과는 응답을 규칙에 따라 계산한 진로 탐색용 참고 자료이며, 공인된 심리검사나 채용 기준이 아닙니다. 직무 정보는 2026년 기준 일반적인 설명입니다.</p>`;

    show('result');
    $('copyBtn').onclick = copyLink;
    $('imgBtn').onclick = saveImage;
    $('pdfBtn').onclick = () => {
      document.querySelectorAll('#result details').forEach(d => (d.open = true));
      window.print();
    };
    if ($('againBtn')) $('againBtn').onclick = restart;
    if ($('mineBtn')) $('mineBtn').onclick = restart;
  }

  async function copyLink() {
    const url = location.href;
    try { await navigator.clipboard.writeText(url); toast('결과 링크를 복사했어요.'); }
    catch (e) { window.prompt('아래 링크를 복사하세요', url); }
  }

  function loadScript(src) {
    return new Promise((ok, fail) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = fail;
      document.head.appendChild(s);
    });
  }
  async function saveImage() {
    toast('이미지를 만드는 중이에요…');
    try {
      if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
      const el = $('result');
      const bg = getComputedStyle(document.body).backgroundColor;
      const canvas = await window.html2canvas(el, {
        backgroundColor: bg, scale: 2,
        ignoreElements: n => n.classList && (n.classList.contains('share') || n.classList.contains('more')),
      });
      const a = document.createElement('a');
      a.download = 'AI직군-적성검사-결과.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
      toast('이미지를 저장했어요.');
    } catch (e) {
      toast('이미지 저장에 실패했어요. PDF로 저장을 이용해 주세요.');
    }
  }

  function restart() {
    S = fresh(); draftFields = []; clear();
    history.replaceState(null, '', location.pathname + location.search);
    show('intro');
    $('resumeBtn').hidden = true;
  }

  // ── 시작 ──
  $('startBtn').onclick = () => { S = fresh(); draftFields = []; save(); show('chat'); renderChat(); };
  $('resumeBtn').onclick = () => { show('chat'); renderChat(); };
  $('backBtn').onclick = back;
  $('restartBtn').onclick = () => { if (S.history.length && !confirm('처음부터 다시 시작할까요? 지금까지의 답변은 지워져요.')) return; restart(); };

  const m = location.hash.match(/^#r=([\w-]+)/);
  if (m) {
    try {
      const st = E.decode(m[1]);
      const mine = load();
      const own = !!(mine && currentStepOf(mine) === 'done' && E.encode(mine) === m[1]);
      if (own) S = mine;
      renderResult(st, !own); return;
    }
    catch (e) { history.replaceState(null, '', location.pathname); }
  }
  const saved = load();
  if (saved && saved.history.length) {
    S = saved; draftFields = [...(S.fields || [])];
    $('resumeBtn').hidden = false;
    $('resumeBtn').textContent = currentStep().kind === 'done' ? '지난 결과 보기' : `이어서 하기 (${S.history.length}개 답변)`;
  }
})();
