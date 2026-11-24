#!/usr/bin/env node
// 슬라이드형 포트폴리오 HTML 브라우저 검수 (Playwright 필요)
//   node check_portfolio.mjs <패킷 폴더 또는 portfolio.html> [--online]
// 결과: <패킷>/checks/ 에 장별 스크린샷·PDF·검수결과.md를 만들고, 근거검토.md 끝에 결과를 덧붙입니다.
// --online 을 주면 외부 링크의 HTTP 상태도 확인합니다(네트워크 필요).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { try { ({ chromium } = await import('playwright')); } catch { console.error('playwright를 찾지 못했습니다. 브라우저 검수를 건너뜁니다.'); process.exit(3); } }

const args = process.argv.slice(2);
const online = args.includes('--online');
const target = args.find(a => !a.startsWith('--'));
if (!target) { console.error('사용법: node check_portfolio.mjs <패킷 폴더|portfolio.html> [--online]'); process.exit(2); }
const htmlPath = fs.statSync(target).isDirectory() ? path.join(target, 'portfolio.html') : target;
const packetDir = path.dirname(path.resolve(htmlPath));
const outDir = path.join(packetDir, 'checks');
fs.mkdirSync(outDir, { recursive: true });
const url = pathToFileURL(path.resolve(htmlPath)).href;

const results = [];
const rec = (name, pass, detail = '') => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' - ' + detail : ''}`); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const activeId = p => p.evaluate(() => document.querySelector('.slide.active')?.id);

const browser = await chromium.launch();
try {
  // 1) PC 1440px 발표 모드
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [], external = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(String(e)));
  page.on('request', r => { if (!/^(file|data):/.test(r.url())) external.push(r.url()); });
  await page.goto(url);
  await wait(500);
  const N = await page.evaluate(() => window.__deck.count);
  rec('PC 발표 모드: 첫 장 표시', (await activeId(page)) === 's-1', `${N}장`);
  rec('PC 1440px 가로 넘침 없음', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));

  // 장별 스크린샷 (모션을 끈 상태로 내용이 다 보이게)
  await page.click('#motion-toggle');
  const overflow = [];
  for (let i = 0; i < N; i++) {
    await page.evaluate(n => window.__deck.go(n), i);
    await wait(120);
    await page.screenshot({ path: path.join(outDir, `pc-${String(i + 1).padStart(2, '0')}.png`) });
    const o = await page.evaluate(() => { const s = document.querySelector('.slide.active'); const r = s.getBoundingClientRect();
      return [...s.querySelectorAll('*')].some(el => { if (el.closest('[aria-hidden="true"]')) return false; const b = el.getBoundingClientRect(); return b.width && (b.bottom > r.bottom + 2 || b.right > r.right + 2); }); });
    if (o) overflow.push(i + 1);
  }
  rec('PC: 슬라이드 밖으로 넘치는 내용 없음', overflow.length === 0, overflow.length ? `넘침: ${overflow.join(', ')}장` : `${N}장 확인`);
  await page.click('#motion-toggle');

  // 2) 장 이동 링크 (목차·작업물 카드·전체 작업물로 버튼)
  const anchors = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')));
  const missing = await page.evaluate(hs => hs.filter(h => h === '#' || !document.getElementById(h.slice(1))), anchors);
  rec('페이지 안 링크 대상 존재', missing.length === 0, missing.length ? missing.join(', ') : `${anchors.length}개`);
  await page.evaluate(() => window.__deck.go(1));
  await wait(200);
  const tocHref = await page.evaluate(() => document.querySelector('.slide.active .toc a, .toc a')?.getAttribute('href'));
  await page.click(`#s-2 a[href="${tocHref}"]`);
  await wait(300);
  rec('목차 항목 클릭 시 해당 장으로 이동', (await activeId(page)) === tocHref.slice(1), `${tocHref} → ${await activeId(page)}`);
  const mapCard = await page.$('.mc');
  if (mapCard) {
    const mapSlide = await page.evaluate(() => document.querySelector('.mc').closest('.slide').id);
    await page.evaluate(id => window.__deck.go(+id.slice(2) - 1), mapSlide);
    await wait(300);
    const href = await page.evaluate(id => document.querySelector(`#${id} .mc`).getAttribute('href'), mapSlide);
    await page.click(`#${mapSlide} .mc`);
    await wait(300);
    const okCard = (await activeId(page)) === href.slice(1);
    await page.click('.slide.active .back');
    await wait(300);
    rec('작업물 카드 → 프로젝트 장 → "전체 작업물로" 복귀', okCard && (await activeId(page)) === mapSlide);
  }

  // 3) 처음으로 / 키보드 이동
  await page.keyboard.press('End');
  await wait(200);
  const atEnd = (await activeId(page)) === `s-${N}`;
  await page.click('#bh');
  await wait(300);
  rec('End로 마지막 장, "처음으로" 버튼으로 첫 장', atEnd && (await activeId(page)) === 's-1');
  await page.locator('body').focus();
  await page.keyboard.press('ArrowRight');
  await wait(200);
  const r1 = await activeId(page);
  await page.keyboard.press('ArrowLeft');
  await wait(200);
  rec('방향키로 다음·이전 장', r1 === 's-2' && (await activeId(page)) === 's-1');
  await page.evaluate(() => window.__deck.go(window.__deck.count - 1));
  await wait(200);
  await page.click(`#s-${N} a[href="#s-1"]`);
  await wait(300);
  rec('마지막 장 "처음으로 돌아가기" 링크', (await activeId(page)) === 's-1');
  await page.click('#bo');
  await wait(200);
  const ovOn = await page.evaluate(() => document.getElementById('ov').classList.contains('on'));
  await page.keyboard.press('Escape');
  rec('전체 보기 열기·Esc로 닫기', ovOn && !(await page.evaluate(() => document.getElementById('ov').classList.contains('on'))));

  // 4) 모션: 일하는 순서 장의 단계 강조가 움직이고, 멈춤 버튼이 멈추는지
  const flowSlide = await page.evaluate(() => document.querySelector('.flow').closest('.slide').id);
  await page.evaluate(id => window.__deck.go(+id.slice(2) - 1), flowSlide);
  await wait(300);
  const st = () => page.evaluate(() => document.querySelector('.slide.active .flow .status').textContent);
  const s1 = await st(); await wait(1800); const s2 = await st();
  rec('모션 켜짐: 업무 흐름 단계가 차례로 강조', s1 !== s2, `"${s1}" → "${s2}"`);
  await page.click('#motion-toggle');
  const off = await page.evaluate(() => ({ m: document.documentElement.dataset.motion, p: document.getElementById('motion-toggle').getAttribute('aria-pressed') }));
  const a1 = await page.evaluate(() => document.querySelectorAll('.is-on').length); await wait(1800);
  const a2 = await page.evaluate(() => document.querySelectorAll('.is-on').length);
  const anim = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
  rec('모션 멈춤 버튼: 강조·애니메이션 정지', off.m === 'off' && off.p === 'true' && a1 === 0 && a2 === 0 && anim === 0, `data-motion=${off.m}, 실행 중 애니메이션 ${anim}개`);
  await page.click('#motion-toggle');
  rec('모션 다시 켜기', await page.evaluate(() => document.documentElement.dataset.motion === 'on'));

  // 5) 눌리지 않는데 눌릴 것처럼 보이는 요소
  const fakeClick = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => !el.closest('a,button,summary,label,input,select,textarea') && getComputedStyle(el).cursor === 'pointer').map(el => el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]).slice(0, 8));
  rec('장식 요소에 클릭 커서 없음', fakeClick.length === 0, fakeClick.join(', '));
  rec('흐름 단계·물결선은 조작 요소가 아님', await page.evaluate(() => [...document.querySelectorAll('.flow li,.pflow li')].every(li => getComputedStyle(li).cursor !== 'pointer' && !li.hasAttribute('tabindex')) && [...document.querySelectorAll('svg.wave')].every(s => s.getAttribute('aria-hidden') === 'true' && getComputedStyle(s).pointerEvents === 'none')));

  // 6) 키보드 탭 이동 (새 페이지)
  const kp = await ctx.newPage();
  await kp.goto(url);
  await kp.keyboard.press('Tab');
  const first = await kp.evaluate(() => document.activeElement.className);
  rec('첫 Tab이 "본문으로 건너뛰기"', first.includes('skip'), first);
  const order = [];
  for (let i = 0; i < 14; i++) { await kp.keyboard.press('Tab'); order.push(await kp.evaluate(() => document.activeElement.id || document.activeElement.textContent.trim().slice(0, 10))); }
  rec('키보드로 처음으로·모션·인쇄 버튼 도달', ['bh', 'motion-toggle', 'print-btn'].every(x => order.includes(x)), order.join(' → '));
  await kp.focus('#motion-toggle'); await kp.keyboard.press('Enter');
  rec('Enter 키로 모션 버튼 조작', (await kp.evaluate(() => document.documentElement.dataset.motion)) === 'off');
  await kp.focus('#bn'); await kp.keyboard.press('Enter'); await wait(200);
  rec('Enter 키로 다음 장 버튼 조작', (await activeId(kp)) === 's-2');
  await kp.close();

  // 7) 인쇄
  let printCalled = false;
  await page.exposeFunction('__printCalled', () => { printCalled = true; });
  await page.evaluate(() => { window.print = () => window.__printCalled(); });
  await page.click('#print-btn'); await wait(200);
  rec('인쇄·PDF 버튼이 window.print 호출', printCalled);
  await page.emulateMedia({ media: 'print' });
  const pr = await page.evaluate(() => ({ nav: getComputedStyle(document.getElementById('nav')).display,
    hidden: [...document.querySelectorAll('.slide')].filter(s => getComputedStyle(s).visibility !== 'visible' || getComputedStyle(s).opacity !== '1').length }));
  rec('인쇄 시 조작 막대 숨김·모든 장 표시', pr.nav === 'none' && pr.hidden === 0, `조작 막대=${pr.nav}, 숨은 장=${pr.hidden}`);
  await page.pdf({ path: path.join(outDir, 'portfolio-print.pdf'), width: '1920px', height: '1080px', printBackground: true });
  const pdfPages = (fs.readFileSync(path.join(outDir, 'portfolio-print.pdf'), 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  rec('PDF 저장: 한 장이 한 쪽', pdfPages === N, `${pdfPages}쪽 / ${N}장`);
  await page.emulateMedia({ media: 'screen' });

  rec('콘솔 오류 없음', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  rec('외부 요청·추적 없음', external.length === 0, external.slice(0, 3).join(', '));

  const links = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="http"]')].map(a => a.href))]);
  if (online) {
    const bad = [];
    for (const l of links) { try { const r = await ctx.request.get(l, { timeout: 15000 }); if (r.status() >= 400) bad.push(`${r.status()} ${l}`); } catch { bad.push(`오류 ${l}`); } }
    rec('외부 링크 응답', bad.length === 0, bad.length ? bad.join(' | ') : `${links.length}개 정상`);
  } else rec('외부 링크 목록 작성(응답 확인은 --online)', true, `${links.length}개`);
  await ctx.close();

  // 8) 모바일 375px 읽기 모드
  const m = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  await mp.goto(url); await wait(500);
  const mw = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, tall: document.body.scrollHeight,
    cut: [...document.querySelectorAll('.slide')].filter(s => { const r = s.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth + 1; }).length }));
  rec('모바일 375px: 세로 읽기 모드·좌우 잘림 없음', mw.sw <= mw.iw + 1 && mw.cut === 0 && mw.tall > 3000, `scrollWidth=${mw.sw}, 화면 밖으로 나간 장=${mw.cut}, 높이=${mw.tall}`);
  await mp.screenshot({ path: path.join(outDir, 'mobile-375-first.png') });
  await mp.evaluate(() => document.documentElement.setAttribute('data-motion', 'off'));
  await mp.screenshot({ path: path.join(outDir, 'mobile-375-full.png'), fullPage: true });
  await mp.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2)); await wait(200);
  await mp.click('#bh');
  await mp.waitForFunction(() => scrollY < 5, null, { timeout: 4000 }).catch(() => {});
  rec('모바일 "처음으로" 버튼 복귀', await mp.evaluate(() => scrollY < 5));
  const small = await mp.evaluate(() => [...document.querySelectorAll('a,button')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 24 && !e.classList.contains('skip'); }).map(e => e.textContent.trim().slice(0, 10)));
  rec('모바일 탭 대상 높이 24px 이상', small.length === 0, small.join(', '));
  await m.close();

  // 9) OS 동작 줄이기
  const r = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rp = await r.newPage();
  await rp.goto(url); await wait(300);
  const rm = await rp.evaluate(() => ({ m: document.documentElement.dataset.motion, op: getComputedStyle(document.querySelector('.slide.active [data-a]')).opacity }));
  rec('OS 동작 줄이기: 모션 꺼짐·내용 바로 표시', rm.m === 'off' && rm.op === '1', `data-motion=${rm.m}`);
  await r.close();
} finally {
  await browser.close();
}

const failed = results.filter(x => !x.pass);
const when = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
const md = [`## 브라우저 화면 검수 (${when}, Playwright Chromium 자동 검사)`, '',
  '| 결과 | 항목 | 세부 |', '|---|---|---|',
  ...results.map(x => `| ${x.pass ? '통과' : '실패'} | ${x.name} | ${String(x.detail).replace(/\|/g, '/')} |`), '',
  '스크린샷·PDF: checks/ 폴더 (pc-NN.png 장별, mobile-375-*.png, portfolio-print.pdf).',
  '자동 검사는 사람이 화면을 보고 판단하는 시각 검수를 대신하지 않습니다. 스크린샷을 직접 열어 본 경우에만 "시각 확인"을 따로 적습니다.', ''].join('\n');
fs.writeFileSync(path.join(outDir, '검수결과.md'), md);
const ev = path.join(packetDir, '근거검토.md');
if (fs.existsSync(ev)) fs.appendFileSync(ev, '\n' + md);
console.log(`\n${results.length}개 중 ${results.length - failed.length}개 통과. 결과: ${path.join(outDir, '검수결과.md')}`);
process.exit(failed.length ? 1 : 0);
