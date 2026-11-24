// 소개서.html → PDF. 헤드리스 Chrome을 직접 띄워 CDP로 인쇄한다(설치할 것 없음, Node 22 이상).
// 실행: node 기획/소개서/render.mjs            → 같은 폴더에 [AXPO]_한끗_AI 해커톤_261123.pdf (제출일자는 대회 자료 파일명처럼 6자리)
//       node 기획/소개서/render.mjs --check    → PDF는 만들지 않고 칸 넘침만 검사
// 글꼴(Pretendard)은 jsDelivr에서 받으므로 인터넷이 연결돼 있어야 한다.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(HERE, '소개서.html');
const OUT = path.join(HERE, '[AXPO]_한끗_AI 해커톤_261123.pdf');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.CDP_PORT || 9461);
const checkOnly = process.argv.includes('--check');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hankkeut-pdf-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--force-color-profile=srgb', 'about:blank'], { stdio: 'ignore' });

async function connect() {
  let list;
  for (let i = 0; i < 60 && !list; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); } catch { await sleep(250); }
  }
  if (!list) throw new Error('Chrome에 연결하지 못했어요');
  const page = list.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); } else if (m.method) events.push(m);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method, params })); });
  return { ws, send, events };
}

async function evaluate(send, expression) {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

try {
  const { ws, send, events } = await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Emulation.setEmulatedMedia', { media: 'print' });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: pathToFileURL(HTML).href });
  for (let i = 0; i < 120; i++) { if (events.some((e) => e.method === 'Page.loadEventFired')) break; await sleep(250); }

  // 글꼴과 그림이 다 들어올 때까지 기다린다
  const ready = await evaluate(send, `
    const weights = [400, 500, 600, 700, 800];
    await Promise.all(weights.map((w) => document.fonts.load(w + ' 16px Pretendard', '한끗가나다ABC123')));
    await document.fonts.ready;
    const imgs = [...document.images];
    await Promise.all(imgs.map((im) => im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; })));
    const broken = imgs.filter((im) => !im.naturalWidth).map((im) => decodeURI(im.src));
    const fams = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight);
    return { images: imgs.length, broken, fonts: [...new Set(fams)] };
  `);
  console.log('그림', ready.images, '장, 깨진 그림', ready.broken.length, ready.broken);
  console.log('불러온 글꼴', ready.fonts.join(', '));
  if (!ready.fonts.some((f) => f.startsWith('Pretendard'))) throw new Error('Pretendard를 불러오지 못했어요(인터넷 연결 확인)');

  // 칸 넘침 검사: 쪽 밖으로 나간 요소, 넘친 상자(.card·.body 등), 쪽 아래 여백 침범
  const issues = await evaluate(send, `
    const out = [];
    const slides = [...document.querySelectorAll('.slide')];
    slides.forEach((s, i) => {
      const sr = s.getBoundingClientRect();
      const body = s.querySelector('.body');
      const limitBottom = body ? body.getBoundingClientRect().bottom : sr.bottom;
      for (const el of s.querySelectorAll('*')) {
        if (el.closest('svg') && el.tagName !== 'svg') continue;
        if (el.parentElement && el.parentElement.closest('.crop')) continue; // 자르기 틀 안의 그림은 틀이 잘라 보여 줌
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        const name = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).join('.') : '');
        const text = (el.innerText || '').trim().slice(0, 40);
        if (r.right > sr.right + 0.5 || r.bottom > sr.bottom + 0.5 || r.left < sr.left - 0.5 || r.top < sr.top - 0.5) out.push({ page: i + 1, kind: '쪽 밖', name, text, r: [r.left - sr.left, r.top - sr.top, r.right - sr.left, r.bottom - sr.top].map(Math.round) });
        else if (body && body.contains(el) && r.bottom > limitBottom + 0.5 && !el.closest('.demo .phone')) out.push({ page: i + 1, kind: '본문 아래 침범', name, text, by: Math.round(r.bottom - limitBottom) });
        const st = getComputedStyle(el);
        if (['hidden', 'clip'].includes(st.overflow) || ['hidden', 'clip'].includes(st.overflowY)) {
          if (el.classList.contains('crop') || el.classList.contains('slide') || el.classList.contains('phone') || el.classList.contains('pc') || el.tagName === 'svg') continue;
          if (el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1) out.push({ page: i + 1, kind: '상자 안 넘침', name, text, by: [el.scrollWidth - el.clientWidth, el.scrollHeight - el.clientHeight] });
        }
      }
      // 글자가 들어 있는 카드가 내용보다 작아 잘렸는지(그리드 칸이 늘어나지 못한 경우)
      for (const el of s.querySelectorAll('.card, .stat, .kpi, .stuck, .grow, .oneline, .kw')) {
        if (el.scrollHeight > el.clientHeight + 1) out.push({ page: i + 1, kind: '카드 넘침', name: el.className, text: (el.innerText || '').trim().slice(0, 40), by: el.scrollHeight - el.clientHeight });
      }
    });
    return { pages: slides.length, out };
  `);
  console.log('쪽 수', issues.pages);
  if (issues.out.length) { console.log('넘침', issues.out.length, '곳'); for (const o of issues.out) console.log(' ', JSON.stringify(o)); } else console.log('넘침 없음');
  const logs = events.filter((e) => e.method === 'Log.entryAdded' || (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error'));
  for (const l of logs) console.log('콘솔', JSON.stringify(l.params.entry ? [l.params.entry.level, l.params.entry.text, l.params.entry.url] : l.params.args?.map((a) => a.value)));

  if (!checkOnly) {
    const pdf = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, scale: 1, generateDocumentOutline: false, generateTaggedPDF: true });
    fs.writeFileSync(OUT, Buffer.from(pdf.data, 'base64'));
    console.log('PDF', OUT, Math.round(fs.statSync(OUT).size / 1024) + 'KB');
  }
  ws.close();
} finally {
  chrome.kill();
  await sleep(300);
  fs.rmSync(profile, { recursive: true, force: true });
}
