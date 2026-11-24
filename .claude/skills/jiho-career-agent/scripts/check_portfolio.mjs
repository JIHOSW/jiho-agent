#!/usr/bin/env node
// 포트폴리오 HTML 브라우저 검수 (Playwright 필요)
//   node check_portfolio.mjs <패킷 폴더 또는 portfolio.html> [--online]
// 결과: <패킷>/checks/ 에 스크린샷·PDF·검수결과.md를 만들고, 근거검토.md 끝에 결과를 덧붙입니다.
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

const browser = await chromium.launch();
try {
  // 1) PC 1440px
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const consoleErrors = [];
  const external = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push(String(e)));
  page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) external.push(r.url()); });
  await page.goto(url);
  await wait(400);
  rec('PC 1440px 가로 넘침 없음', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await page.screenshot({ path: path.join(outDir, 'pc-1440-first.png') });
  // 전체 화면 캡처 전에 등장 효과를 모두 보이게 한다
  await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in')));
  await page.screenshot({ path: path.join(outDir, 'pc-1440-full.png'), fullPage: true });

  // 2) 페이지 안 링크
  const anchors = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href')));
  const missing = await page.evaluate(hs => hs.filter(h => h !== '#' && !document.getElementById(h.slice(1))), anchors);
  rec('페이지 안 링크 대상 존재', missing.length === 0 && !anchors.includes('#'), missing.length ? missing.join(', ') : `${anchors.length}개 확인`);

  // 3) 홈으로 돌아가기
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await wait(300);
  await page.click('a.home');
  await page.waitForFunction(() => scrollY < 5, null, { timeout: 4000 }).catch(() => {});
  rec('상단 홈 링크로 첫 화면 복귀', await page.evaluate(() => scrollY < 5));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await wait(300);
  await page.click('footer a[href="#top"]');
  await page.waitForFunction(() => scrollY < 5, null, { timeout: 4000 }).catch(() => {});
  rec('하단 "처음으로" 링크 복귀', await page.evaluate(() => scrollY < 5));

  // 4) 모션: 흐름 강조가 실제로 움직이는지, 멈춤 버튼이 멈추는지
  await page.evaluate(() => window.scrollTo(0, 0));
  const s1 = await page.evaluate(() => document.querySelector('.hero .flow .status').textContent);
  await wait(1800);
  const s2 = await page.evaluate(() => document.querySelector('.hero .flow .status').textContent);
  rec('모션 켜짐 상태에서 업무 흐름 단계가 진행', s1 !== s2, `"${s1}" → "${s2}"`);
  await page.click('#motion-toggle');
  const off = await page.evaluate(() => ({ m: document.documentElement.dataset.motion, p: document.getElementById('motion-toggle').getAttribute('aria-pressed'), t: document.getElementById('motion-toggle').textContent }));
  const a1 = await page.evaluate(() => document.querySelectorAll('.flow li.is-on').length);
  await wait(1800);
  const a2 = await page.evaluate(() => document.querySelectorAll('.flow li.is-on').length);
  rec('모션 멈춤 버튼 동작', off.m === 'off' && off.p === 'true' && a1 === 0 && a2 === 0, `data-motion=${off.m}, aria-pressed=${off.p}, 버튼="${off.t}"`);
  await page.click('#motion-toggle');
  rec('모션 다시 켜기', await page.evaluate(() => document.documentElement.dataset.motion === 'on'));

  // 5) 눌리지 않는데 눌릴 것처럼 보이는 요소(손가락 커서) 찾기
  const fakeClick = await page.evaluate(() => [...document.querySelectorAll('body *')].filter(el => {
    if (el.closest('a,button,summary,label,input,select,textarea')) return false;
    return getComputedStyle(el).cursor === 'pointer';
  }).map(el => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '')).slice(0, 10));
  rec('장식 요소에 클릭 커서 없음', fakeClick.length === 0, fakeClick.join(', '));
  const flowCursor = await page.evaluate(() => [...document.querySelectorAll('.flow li')].every(li => getComputedStyle(li).cursor !== 'pointer' && !li.onclick && !li.hasAttribute('tabindex')));
  rec('흐름 단계는 조작 요소가 아님(커서·탭 이동 없음)', flowCursor);

  // 6) 키보드
  // 앞선 클릭의 포커스가 남지 않도록 새 페이지에서 검사한다
  const kp = await ctx.newPage();
  await kp.goto(url);
  await kp.keyboard.press('Tab');
  const first = await kp.evaluate(() => document.activeElement.className);
  rec('첫 Tab이 "본문으로 건너뛰기"', first.includes('skip'), first);
  const order = [];
  for (let i = 0; i < 9; i++) { await kp.keyboard.press('Tab'); order.push(await kp.evaluate(() => document.activeElement.id || document.activeElement.textContent.trim().slice(0, 12))); }
  rec('키보드로 모션·인쇄 버튼 도달', order.includes('motion-toggle') && order.includes('print-btn'), order.join(' → '));
  await kp.focus('#motion-toggle');
  await kp.keyboard.press('Enter');
  const kb = await kp.evaluate(() => document.documentElement.dataset.motion);
  await kp.keyboard.press('Enter');
  rec('Enter 키로 모션 버튼 조작', kb === 'off');
  await kp.close();

  // 7) 인쇄 화면
  let printCalled = false;
  await page.exposeFunction('__printCalled', () => { printCalled = true; });
  await page.evaluate(() => { window.print = () => window.__printCalled(); });
  await page.click('#print-btn');
  await wait(200);
  rec('인쇄·PDF 버튼이 window.print 호출', printCalled);
  await page.emulateMedia({ media: 'print' });
  const pr = await page.evaluate(() => ({
    nav: getComputedStyle(document.querySelector('.top')).display,
    hidden: [...document.querySelectorAll('.reveal')].filter(e => getComputedStyle(e).opacity !== '1').length,
  }));
  rec('인쇄 시 상단 메뉴 숨김·모든 내용 표시', pr.nav === 'none' && pr.hidden === 0, `상단=${pr.nav}, 숨은 블록=${pr.hidden}`);
  await page.screenshot({ path: path.join(outDir, 'print-preview.png'), fullPage: true });
  await page.pdf({ path: path.join(outDir, 'portfolio-print.pdf'), format: 'A4', printBackground: true });
  const pdfPages = (fs.readFileSync(path.join(outDir, 'portfolio-print.pdf'), 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  rec('A4 PDF 저장', pdfPages > 0, `${pdfPages}쪽`);
  await page.emulateMedia({ media: 'screen' });

  rec('콘솔 오류 없음', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  rec('외부 요청·추적 없음', external.length === 0, external.slice(0, 3).join(', '));

  // 8) 외부 링크 목록(선택: 상태 확인)
  const links = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href^="http"]')].map(a => a.href))]);
  if (online) {
    const bad = [];
    for (const l of links) {
      try { const r = await ctx.request.get(l, { timeout: 15000, maxRedirects: 5 }); if (r.status() >= 400) bad.push(`${r.status()} ${l}`); }
      catch (e) { bad.push(`오류 ${l}`); }
    }
    rec('외부 링크 응답', bad.length === 0, bad.length ? bad.join(' | ') : `${links.length}개 정상`);
  } else {
    rec('외부 링크 목록 작성(응답 확인은 --online)', true, `${links.length}개`);
  }
  await ctx.close();

  // 9) 모바일 375px
  const m = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  await mp.goto(url);
  await wait(400);
  const mw = await mp.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  rec('모바일 375px 가로 넘침 없음', mw.sw <= mw.iw + 1, `scrollWidth=${mw.sw}, innerWidth=${mw.iw}`);
  await mp.screenshot({ path: path.join(outDir, 'mobile-375-first.png') });
  if (await mp.$('a.to-top')) {
    await mp.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await wait(300);
    await mp.click('a.to-top');
    await mp.waitForFunction(() => scrollY < 5, null, { timeout: 4000 }).catch(() => {});
    rec('모바일 고정 "처음으로" 링크 복귀', await mp.evaluate(() => scrollY < 5));
  }
  await mp.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in')));
  await mp.screenshot({ path: path.join(outDir, 'mobile-375-full.png'), fullPage: true });
  const small = await mp.evaluate(() => [...document.querySelectorAll('a,button')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 24 && !e.classList.contains('skip') && !e.closest('p'); }).length);
  rec('모바일 탭 대상 높이 24px 이상(본문 속 링크 제외)', small === 0, `작은 대상 ${small}개`);
  await m.close();

  // 10) OS '동작 줄이기'
  const r = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const rp = await r.newPage();
  await rp.goto(url);
  await wait(300);
  const rm = await rp.evaluate(() => ({ m: document.documentElement.dataset.motion, vis: [...document.querySelectorAll('.reveal')].every(e => e.classList.contains('in')) }));
  rec('OS 동작 줄이기 설정 시 모션 꺼짐·내용 표시', rm.m === 'off' && rm.vis, `data-motion=${rm.m}`);
  await r.close();
} finally {
  await browser.close();
}

const failed = results.filter(x => !x.pass);
const when = new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
const md = [`## 브라우저 화면 검수 (${when}, Playwright Chromium 자동 검사)`, '',
  '| 결과 | 항목 | 세부 |', '|---|---|---|',
  ...results.map(x => `| ${x.pass ? '통과' : '실패'} | ${x.name} | ${String(x.detail).replace(/\|/g, '/')} |`), '',
  `스크린샷·PDF: checks/ 폴더 (pc-1440-*.png, mobile-375-*.png, print-preview.png, portfolio-print.pdf).`,
  '자동 검사는 사람이 화면을 보고 판단하는 시각 검수를 대신하지 않습니다. 스크린샷을 직접 열어 본 경우에만 근거검토에 "시각 확인"을 따로 적습니다.', ''].join('\n');
fs.writeFileSync(path.join(outDir, '검수결과.md'), md);
const ev = path.join(packetDir, '근거검토.md');
if (fs.existsSync(ev)) fs.appendFileSync(ev, '\n' + md);
console.log(`\n${results.length}개 중 ${results.length - failed.length}개 통과. 결과: ${path.join(outDir, '검수결과.md')}`);
process.exit(failed.length ? 1 : 0);
