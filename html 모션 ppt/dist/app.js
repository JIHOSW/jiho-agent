(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const slides = $$('.slide');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const charts = new Map();
  let current = 0;
  let priorFocus;
  let flowStep = 0;
  function animateEntrance(slide) {
    if (!reducedMotion) slide.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
  }

  function showSlide(index, updateHash = true) {
    const next = Math.max(0, Math.min(slides.length - 1, index));
    const changed = next !== current;
    current = next;
    slides.forEach((slide, i) => {
      const selected = i === current;
      slide.classList.toggle('active', selected);
      slide.inert = !selected;
      slide.setAttribute('aria-hidden', String(!selected));
    });
    $('#pageCount').innerHTML = `${String(current + 1).padStart(2, '0')} <i>/ ${slides.length}</i>`;
    $('#prevBtn').disabled = current === 0;
    $('#nextBtn').disabled = current === slides.length - 1;
    $('#chapterName').textContent = slides[current].dataset.title;
    $('#progressFill').style.width = `${(current + 1) / slides.length * 100}%`;
    $('#noteText').textContent = $('.note', slides[current]).content.textContent.trim();
    $$('#overviewGrid button').forEach((b, i) => b.setAttribute('aria-current', String(i === current)));
    if (updateHash) history.replaceState(null, '', `#slide-${current + 1}`);
    requestAnimationFrame(() => {
      $$('canvas', slides[current]).forEach(canvas => {
        const chart = charts.get(canvas.id);
        if (chart) { chart.resize(); chart.update(reducedMotion ? 'none' : undefined); }
      });
    });
    if (changed && matchMedia('(max-width:900px)').matches) scrollTo({ top: 0, behavior: 'instant' });
    if (changed) animateEntrance(slides[current]);
  }
  function fromHash() {
    const match = location.hash.match(/^#slide-(\d+)$/);
    showSlide(match ? Number(match[1]) - 1 : 0, false);
  }
  $('#prevBtn').addEventListener('click', () => showSlide(current - 1));
  $('#nextBtn').addEventListener('click', () => showSlide(current + 1));
  $$('[data-go]').forEach(b => b.addEventListener('click', () => showSlide(Number(b.dataset.go))));
  addEventListener('hashchange', fromHash);

  const dialogs = $$('dialog');
  function openDialog(dialog) {
    priorFocus = document.activeElement;
    dialog.showModal();
    if (!reducedMotion) dialog.animate([
      { opacity: 0 },
      { opacity: 1 }
    ], { duration: 160, easing: 'ease-out' });
  }
  dialogs.forEach(dialog => {
    $('.close-dialog', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => {
      const rect = dialog.getBoundingClientRect();
      if (e.target === dialog && (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => priorFocus?.focus());
  });
  slides.forEach((slide, i) => {
    const b = document.createElement('button');
    const number = document.createElement('span');
    number.textContent = String(i + 1).padStart(2, '0');
    b.append(number, document.createTextNode(slide.dataset.title));
    b.addEventListener('click', () => { $('#overviewDialog').close(); showSlide(i); });
    $('#overviewGrid').append(b);
  });
  $('#overviewBtn').addEventListener('click', () => openDialog($('#overviewDialog')));
  $('#sourcesBtn').addEventListener('click', () => openDialog($('#sourcesDialog')));
  $('#checklistBtn').addEventListener('click', () => openDialog($('#checklistDialog')));
  function toggleNotes() {
    const panel = $('#notesPanel');
    panel.hidden = !panel.hidden;
    $('#notesBtn').setAttribute('aria-pressed', String(!panel.hidden));
    if (!panel.hidden && !reducedMotion) panel.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease-out' });
  }
  $('#notesBtn').addEventListener('click', toggleNotes);
  $('#closeNotes').addEventListener('click', toggleNotes);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { $('#fullscreenBtn').title = '이 환경에서는 브라우저의 전체화면 기능을 사용하세요'; }
  }
  $('#fullscreenBtn').addEventListener('click', toggleFullscreen);
  $('#printBtn').addEventListener('click', () => print());
  document.addEventListener('keydown', e => {
    if (dialogs.some(d => d.open) || e.ctrlKey || e.metaKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.target.closest('[role="tablist"]') && ['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    const moves = { ArrowRight: current + 1, PageDown: current + 1, ArrowLeft: current - 1, PageUp: current - 1, Home: 0, End: slides.length - 1 };
    if (e.key in moves) { e.preventDefault(); showSlide(moves[e.key]); }
    else if (e.key.toLowerCase() === 'o') { e.preventDefault(); openDialog($('#overviewDialog')); }
    else if (e.key.toLowerCase() === 'n') { e.preventDefault(); toggleNotes(); }
    else if (e.key.toLowerCase() === 'f') { e.preventDefault(); toggleFullscreen(); }
    else if (e.key === ' ' && e.target === document.body) { e.preventDefault(); showSlide(current + 1); }
  });
  let touch;
  $('#deck').addEventListener('touchstart', e => {
    if (e.target.closest('button,input,a,[role="tablist"]')) return;
    const t = e.changedTouches[0]; touch = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  $('#deck').addEventListener('touchend', e => {
    if (!touch) return;
    const t = e.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.8) showSlide(current + (dx < 0 ? 1 : -1));
    touch = null;
  }, { passive: true });

  const steps = [
    { title: '요청 정보를 같은 기준으로', desc: '품목명, 규격, 수량, 희망 납기를 확인해 구매 요청의 재확인을 줄입니다.', output: '표준 품목·요청 목록', heading: '구매 요청', status: '입력 기준 확인', rows: [['품목', '산업용 보호장갑'], ['규격 · 수량', '작업 규격 확인 · 수량 입력'], ['희망 납기', '현업 요청일 확인']], footer: '규격과 납품 조건을 먼저 확인합니다' },
    { title: '가격과 공급 조건을 함께 비교', desc: '구매 전문인력이 소싱을 지원하고, 품질·납기·물류비를 포함한 조건을 검토합니다.', output: '비교 조건·선정 사유', heading: '소싱·조건 검토', status: '비교 기준 합의', rows: [['비교 항목', '품질 · 가격 · 납기'], ['물류 조건', '배송비 · 최소 주문량 확인'], ['선정 기준', '고객의 구매 정책 반영']], footer: '같은 조건의 총비용으로 비교합니다' },
    { title: '발주 이후의 상태까지 연결', desc: '납품 일정과 검수 기준을 공유하고, 지연·수량 차이 같은 예외의 담당자를 정합니다.', output: '발주·납품·검수 이력', heading: '발주·납품', status: '운영 기준 협의', rows: [['발주 조건', '확정 규격 · 수량 · 납기'], ['확인 항목', '배송 상태 · 검수 결과'], ['예외 대응', '담당자 · 처리 기한 합의']], footer: '현업과 구매팀의 확인 흐름을 맞춥니다' },
    { title: '다음 구매의 근거로 남기기', desc: '정산 기준을 맞추고 품목·부서·공급사별 내역을 검토해 다음 개선 대상을 찾습니다.', output: '정산 기준·지출 검토 자료', heading: '정산·분석', status: '성과 검증 준비', rows: [['정산 기준', '발주 · 검수 · 청구 대조'], ['분류 기준', '품목 · 부서 · 공급사'], ['개선 후보', '반복 구매 · 계약 외 구매']], footer: '데이터 범위와 분석 방법은 협의합니다' }
  ];
  function setStep(index, focus = false) {
    flowStep = index;
    const step = steps[index];
    $('#flowTitle').textContent = step.title; $('#flowDesc').textContent = step.desc; $('#flowOutput').textContent = step.output;
    $('#flowPanel').setAttribute('aria-labelledby', `flowTab${index}`);
    $$('[data-step]').forEach((b, i) => { b.setAttribute('aria-selected', String(i === index)); b.tabIndex = i === index ? 0 : -1; });
    $('#demoBody').replaceChildren();
    const h = document.createElement('div'); h.className = 'demo-heading';
    const s = document.createElement('span'); s.textContent = step.status; h.append(document.createTextNode(step.heading), s); $('#demoBody').append(h);
    step.rows.forEach(row => { const div = document.createElement('div'); div.className = 'demo-row'; row.forEach(text => { const span = document.createElement('span'); span.textContent = text; div.append(span); }); $('#demoBody').append(div); });
    const footer = document.createElement('p'); footer.className = 'demo-status'; footer.append(document.createElement('i'), document.createTextNode(step.footer)); $('#demoBody').append(footer);
    if (!reducedMotion) $('#demoBody').animate([{ opacity: .65 }, { opacity: 1 }], { duration: 160 });
    if (focus) $(`#flowTab${index}`).focus();
  }
  $$('[data-step]').forEach(b => b.addEventListener('click', () => setStep(Number(b.dataset.step))));
  $('.workflow-tabs').addEventListener('keydown', e => {
    if (['ArrowRight','ArrowLeft','Home','End'].includes(e.key)) {
      e.preventDefault();
      const index = e.key === 'Home' ? 0 : e.key === 'End' ? 3 : (flowStep + (e.key === 'ArrowRight' ? 1 : -1) + 4) % 4;
      setStep(index, true);
    }
  });
  setStep(0);

  function valueModel(spend, saving, orders) {
    return { cash: spend * saving / 100, capacity: orders * 10 / 60 * 30000 / 100000000 };
  }
  function updateValue() {
    const spend = Number($('#spend').value), saving = Number($('#saving').value), orders = Number($('#orders').value);
    const { cash, capacity } = valueModel(spend, saving, orders);
    $('#spendOut').textContent = `${spend}억 원`; $('#savingOut').textContent = `${saving}%`; $('#ordersOut').textContent = `${orders.toLocaleString('ko-KR')}건`;
    $('#cashValue').innerHTML = `${cash.toFixed(2)}<small>억 원</small>`; $('#capacityValue').innerHTML = `${capacity.toFixed(2)}<small>억 원</small>`;
    $('#valueChart').setAttribute('aria-label', `가정 기반 연간 구매비 절감 ${cash.toFixed(2)}억 원, 비현금 업무 여력 환산 ${capacity.toFixed(2)}억 원`);
    const chart = charts.get('valueChart');
    if (chart) { chart.data.datasets[0].data = [cash, capacity]; chart.update(reducedMotion ? 'none' : undefined); }

  }
  $$('.controls input').forEach(input => input.addEventListener('input', updateValue));

  function initCharts() {
    if (!window.Chart) {
      $$('canvas').forEach(canvas => { const p = document.createElement('p'); p.textContent = canvas.getAttribute('aria-label'); canvas.replaceWith(p); });
      return;
    }
    Chart.defaults.font.family = 'JoseonGulim, sans-serif';
    const chartLabelSize = matchMedia('(max-width:900px)').matches ? 11 : 13;
    Chart.defaults.font.size = chartLabelSize;
    Chart.defaults.color = '#3c5274';
    // Preserve Chart.js's default interpolation keys (type, fn, from, to).
    Chart.defaults.animation.duration = reducedMotion ? 0 : 300;
    Chart.defaults.animation.easing = 'easeOutQuart';
    const labelsPlugin = {
      id: 'directValues',
      afterDatasetsDraw(chart) {
        if (!chart.options.plugins.directValues?.enabled) return;
        const ctx = chart.ctx;
        chart.getDatasetMeta(0).data.forEach((bar, i) => {
          const v = chart.data.datasets[0].data[i];
          ctx.save(); ctx.font = 'bold 14px JoseonGulim'; ctx.fillStyle = '#2a4683';
          ctx.textAlign = 'center'; ctx.fillText(Number(v).toLocaleString('ko-KR'), bar.x, bar.y - 9); ctx.restore();
        });
      }
    };
    Chart.register(labelsPlugin);
    const common = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#183568', padding: 12, titleFont: { family: 'JoseonGulim' }, bodyFont: { family: 'JoseonGulim' } } }, scales: { x: { grid: { display: false }, border: { display: false }, ticks: { maxRotation: 0, color: '#647796' } }, y: { beginAtZero: true, grid: { color: '#dce5f2' }, border: { display: false }, ticks: { padding: 8 } } } };
    charts.set('revenueChart', new Chart($('#revenueChart'), {
      type: 'bar', data: { labels: ['2024년', '2025년'], datasets: [{ data: [33183, 30544], backgroundColor: ['#afc0f1', '#315bfa'], borderRadius: 8, barPercentage: .5, categoryPercentage: .75 }] },
      options: { ...common, layout: { padding: { top: 22 } }, plugins: { ...common.plugins, directValues: { enabled: true }, tooltip: { ...common.plugins.tooltip, callbacks: { label: ctx => `연결 매출 ${ctx.parsed.y.toLocaleString('ko-KR')}억 원` } } }, scales: { ...common.scales, y: { ...common.scales.y, max: 40000, ticks: { stepSize: 10000, callback: v => v === 0 ? '0' : `${v / 10000}만` } } } }
    }));
    charts.set('valueChart', new Chart($('#valueChart'), {
      type: 'bar', data: { labels: ['구매비 절감 잠재액', '업무 여력 환산 · 비현금'], datasets: [{ data: [3, .5], backgroundColor: ['#315bfa', '#0abfa6'], borderRadius: 7, barPercentage: .47 }] },
      options: { ...common, plugins: { ...common.plugins, tooltip: { ...common.plugins.tooltip, callbacks: { label: ctx => `가정 ${ctx.parsed.y.toFixed(2)}억 원 / 연` } } }, scales: { ...common.scales, x: { ...common.scales.x, ticks: { font: { size: chartLabelSize }, maxRotation: 0 } }, y: { ...common.scales.y, suggestedMax: 3.5 } } }
    }));
    charts.set('timelineChart', new Chart($('#timelineChart'), {
      type: 'bar', data: { labels: ['현황 진단', '프로세스 설계', '시범 운영', '성과 평가'], datasets: [{ data: [[0,2],[1,4],[3,6],[6,8]], backgroundColor: ['#94acee','#6485f7','#315bfa','#0abfa6'], borderRadius: 7, borderSkipped: false, barPercentage: .53 }] },
      options: { ...common, indexAxis: 'y', plugins: { ...common.plugins, tooltip: { ...common.plugins.tooltip, callbacks: { label: ctx => `제안 일정: ${ctx.raw[0] + 1}~${ctx.raw[1]}주차` } } }, scales: { x: { min: 0, max: 8, position: 'top', border: { display: false }, grid: { color: '#dce5f2' }, ticks: { stepSize: 1, callback: v => v ? `${v}주` : '시작', font: { size: chartLabelSize } } }, y: { border: { display: false }, grid: { display: false }, ticks: { font: { size: chartLabelSize }, padding: 10 } } } }
    }));
    updateValue(); showSlide(current, false);
  }
  $('#copyChecklist').addEventListener('click', async () => {
    const text = $$('.checklist label').map(label => `${$('input', label).checked ? '☑' : '☐'} ${label.textContent.trim()}`).join('\n');
    try { await navigator.clipboard.writeText(`파일럿 준비 항목\n${text}`); $('#copyStatus').textContent = '복사했습니다.'; }
    catch { $('#copyStatus').textContent = '현재 환경에서 복사를 허용하지 않습니다.'; }
  });
  let activeBeforePrint = 0;
  addEventListener('beforeprint', () => {
    activeBeforePrint = current;
    slides.forEach(s => { s.inert = false; s.removeAttribute('aria-hidden'); });
    charts.forEach(c => { c.resize(600,280); c.update('none'); });
  });
  addEventListener('afterprint', () => { charts.forEach(c => c.resize()); showSlide(activeBeforePrint, false); });
  fromHash();
  document.fonts.ready.then(() => { initCharts(); animateEntrance(slides[current]); });
})();
