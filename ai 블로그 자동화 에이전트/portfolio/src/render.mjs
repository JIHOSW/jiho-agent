// 사용법: node render.mjs <deps 폴더> <출력 폴더>
import { writeFileSync, mkdirSync, readFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { slides, iconSvg } from './deck.mjs';

const [depsDir, outDir] = process.argv.slice(2).map(p => resolve(p));
const require = createRequire(join(depsDir, 'package.json'));
const pptxgen = require('pptxgenjs');
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const FONT = 'file:///C:/Windows/Fonts/NotoSansKR-VF.ttf';
const work = join(outDir, '_work');
mkdirSync(work, { recursive: true });

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const textHtml = el => (el.runs || [{ text: el.text }]).map(r => {
  const st = [r.color && `color:#${r.color}`, r.weight && `font-weight:${r.weight}`].filter(Boolean).join(';');
  const body = esc(r.text).replace(/\n/g, '<br>');
  return st ? `<span style="${st}">${body}</span>` : body;
}).join('');

function elHtml(el) {
  const box = `left:${el.x}px;top:${el.y}px;width:${el.w}px;height:${el.h}px`;
  if (el.t === 'rect') return `<div class="e" style="${box};background:#${el.fill};border-radius:${el.r || 0}px;${el.shadow ? 'box-shadow:0 12px 32px rgba(120,30,40,.10)' : ''}"></div>`;
  if (el.t === 'circle') return `<div class="e" style="left:${el.x}px;top:${el.y}px;width:${el.d}px;height:${el.d}px;border-radius:50%;background:#${el.fill};${el.shadow ? 'box-shadow:0 10px 28px rgba(196,35,47,.30)' : ''}"></div>`;
  if (el.t === 'line') return `<div class="e" style="left:${el.x1}px;top:${el.y}px;width:${el.x2 - el.x1}px;height:2px;background:#${el.color}"></div>`;
  if (el.t === 'icon') return `<div class="e" style="left:${el.x}px;top:${el.y}px">${iconSvg(el.name, el.s)}</div>`;
  const deco = el.link ? 'text-decoration:underline;text-underline-offset:6px;' : '';
  return `<div class="e t" data-h="${el.h}" style="${box};font-size:${el.size}px;font-weight:${el.weight};color:#${el.color};text-align:${el.align || 'left'};line-height:${el.lh || 1.3};${deco}">${textHtml(el)}</div>`;
}
const CSS = `@font-face{font-family:'Noto Sans KR';src:url('${FONT}');font-weight:100 900}
*{margin:0;padding:0;box-sizing:border-box}html,body{background:#fff}
body{font-family:'Noto Sans KR';word-break:keep-all;-webkit-font-smoothing:antialiased}
.s{position:relative;width:1920px;height:1080px;overflow:hidden;page-break-after:always}
.e{position:absolute}.t{white-space:normal}
@page{size:1920px 1080px;margin:0}`;
const slideHtml = s => `<section class="s" style="background:#${s.bg}">${s.els.map(elHtml).join('')}</section>`;
const page = body => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>${CSS}</style></head><body>${body}</body></html>`;

// 넘침 검사용 스크립트: 글자 상자보다 내용이 크면 표시
const check = `<script>document.fonts.ready.then(()=>{const bad=[...document.querySelectorAll('.t')].filter(e=>e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2).map(e=>e.textContent.slice(0,30)+' ('+e.scrollHeight+'>'+e.clientHeight+')');document.title='OVERFLOW:'+JSON.stringify(bad)})</script>`;

const edge = args => execFileSync(EDGE, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--allow-file-access-from-files', ...args], { stdio: 'pipe', timeout: 120000 });
// Edge 실행 파일은 결과를 다 쓰기 전에 끝날 수 있어, 파일 크기가 멈출 때까지 기다린다.
const pause = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function waitFile(path, limit = 60000) {
  let last = -1;
  for (let t = 0; t < limit; t += 300) {
    pause(300);
    if (existsSync(path)) { const size = statSync(path).size; if (size > 0 && size === last) return; last = size; }
  }
  throw new Error(`Edge output missing: ${path}`);
}
const shot = (out, args) => { if (existsSync(out)) rmSync(out); edge([`--screenshot=${out}`, ...args]); waitFile(out); };

// 1) 슬라이드별 PNG
slides.forEach((s, i) => {
  const f = join(work, `slide-${i + 1}.html`);
  writeFileSync(f, page(slideHtml(s)));
  shot(join(outDir, `slide-${i + 1}.png`), ['--window-size=1920,1080', '--virtual-time-budget=4000', pathToFileURL(f).href]);
});
// 2) 넘침 검사: 결과를 페이지에 크게 써서 화면으로 확인
const all = join(work, 'deck.html');
const report = `<script>document.fonts.ready.then(()=>{const bad=[...document.querySelectorAll('.t')].filter(e=>e.scrollHeight>e.clientHeight+2||e.scrollWidth>e.clientWidth+2).map(e=>e.textContent.slice(0,24)+' '+e.scrollHeight+'/'+e.clientHeight);document.body.innerHTML='<pre style="font:28px sans-serif;white-space:pre-wrap">OVERFLOW '+bad.length+'\\n'+bad.join('\\n')+'</pre>'})</script>`;
writeFileSync(join(work, 'check.html'), page(slides.map(slideHtml).join('') + report));
shot(join(work, 'check.png'), ['--window-size=1920,1080', '--virtual-time-budget=6000', pathToFileURL(join(work, 'check.html')).href]);
// 3) PDF (글꼴 포함)
writeFileSync(all, page(slides.map(slideHtml).join('')));
const pdf = join(outDir, 'deck.pdf');
if (existsSync(pdf)) rmSync(pdf);
edge([`--print-to-pdf=${pdf}`, '--no-pdf-header-footer', '--virtual-time-budget=6000', pathToFileURL(all).href]);
waitFile(pdf);
// 4) 아이콘 PNG (투명 배경)
const iconPng = {};
for (const name of new Set(slides.flatMap(s => s.els.filter(e => e.t === 'icon').map(e => e.name)))) {
  const f = join(work, `icon-${name}.html`), out = join(work, `icon-${name}.png`);
  writeFileSync(f, `<!doctype html><html><body style="margin:0;background:transparent">${iconSvg(name, 256)}</body></html>`);
  shot(out, ['--window-size=256,256', '--default-background-color=00000000', pathToFileURL(f).href]);
  iconPng[name] = 'image/png;base64,' + readFileSync(out).toString('base64');
}
const overflow = 'see _work/check.png';

// 5) PPTX: 20 x 11.25 in, 1px = 1/96 in, 글자 pt = px * 0.75
const pres = new pptxgen();
pres.defineLayout({ name: 'P1920', width: 20, height: 11.25 });
pres.layout = 'P1920';
pres.title = 'AI 블로그 자동화 에이전트 포트폴리오';
pres.author = '김지호';
pres.theme = { headFontFace: 'Noto Sans KR', bodyFontFace: 'Noto Sans KR' };
const inch = px => px / 96;
const face = w => (w >= 800 ? { fontFace: 'Noto Sans KR ExtraBold', bold: false } : { fontFace: 'Noto Sans KR', bold: w >= 700 });
let n = 0;
for (const s of slides) {
  const sl = pres.addSlide();
  sl.background = { color: s.bg };
  for (const el of s.els) {
    const objectName = `${el.t}-${++n}`;
    if (el.t === 'rect') {
      const y = Math.max(el.y, -60);
      sl.addShape(el.r ? pres.shapes.ROUNDED_RECTANGLE : pres.shapes.RECTANGLE, {
        x: inch(el.x), y: inch(y), w: inch(el.w), h: inch(el.h), objectName,
        fill: { color: el.fill }, line: { type: 'none' },
        ...(el.r ? { rectRadius: Math.min(0.5, el.r / Math.min(el.w, el.h)) } : {}),
        ...(el.shadow ? { shadow: { type: 'outer', color: '78202A', opacity: 0.10, blur: 24, offset: 8, angle: 90 } } : {}),
      });
    } else if (el.t === 'circle') {
      sl.addShape(pres.shapes.OVAL, { x: inch(el.x), y: inch(el.y), w: inch(el.d), h: inch(el.d), objectName, fill: { color: el.fill }, line: { type: 'none' },
        ...(el.shadow ? { shadow: { type: 'outer', color: el.fill, opacity: 0.3, blur: 20, offset: 6, angle: 90 } } : {}) });
    } else if (el.t === 'line') {
      sl.addShape(pres.shapes.LINE, { x: inch(el.x1), y: inch(el.y), w: inch(el.x2 - el.x1), h: 0, objectName, line: { color: el.color, width: 1.5 } });
    } else if (el.t === 'icon') {
      sl.addImage({ data: iconPng[el.name], x: inch(el.x), y: inch(el.y), w: inch(el.s), h: inch(el.s), objectName, altText: '' });
    } else {
      const base = { fontSize: el.size * 0.75, color: el.color, ...face(el.weight) };
      const runs = (el.runs || [{ text: el.text }]).flatMap(r => {
        const parts = r.text.split('\n');
        return parts.map((p, k) => ({ text: p, options: { ...base, ...(r.color ? { color: r.color } : {}), ...(r.weight ? face(r.weight) : {}),
          ...(el.link ? { hyperlink: { url: el.link } , underline: { style: 'sng' } } : {}), ...(k < parts.length - 1 ? { breakLine: true } : {}) } }));
      });
      sl.addText(runs, { x: inch(el.x), y: inch(el.y), w: inch(el.w), h: inch(el.h), objectName, isTextBox: true, margin: 0,
        valign: 'top', align: el.align || 'left', lineSpacingMultiple: el.lh || 1.3, fit: 'none' });
    }
  }
  sl.addNotes(s.notes);
}
await pres.writeFile({ fileName: join(outDir, 'deck.pptx') });
console.log(JSON.stringify({ slides: slides.length, overflow, pdf: existsSync(pdf) }));
