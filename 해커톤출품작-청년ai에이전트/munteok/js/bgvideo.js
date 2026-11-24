// PC 첫 화면 배경 영상 (docs/intent/hankkeut-bg-video.md)
// - PC(1024px 이상) 첫 화면에서만 화면 뒤에 깐다. 다른 화면으로 가거나 창이 좁아지면 지운다.
// - 휴대폰(1023px 이하)에서는 영상·그림 요소를 만들지 않아 아무것도 받지 않는다.
// - 영상에는 띠가 둘 있다(위 띠: 공고 입력 칸·로고, 아래 띠: 영수증·한 줄 문구). 첫 화면의 위 빈칸(위쪽 막대 아래 ~ 제목 위)과
//   아래 빈칸(내용 아래 ~ 창 아래)을 재서, 두 띠를 각자 자기 빈칸 가운데에 놓는다. 위 띠는 영상을 띠 모양 창으로 잘라 보여 주고,
//   아래 띠는 같은 영상의 그 부분을 캔버스에 옮겨 그린다(영상은 하나만 받고 하나만 재생해서 두 띠가 어긋나지 않는다).
//   그래서 띠가 창 끝에서 잘리거나 글·예시 영수증 뒤로 들어가지 않는다. 빈칸이 아주 좁은 창(높이 약 650px 미만)에는 넣지 않는다.
// - 동작 줄이기를 켰거나 '움직임 멈춤'을 고른 사람, 데이터 절약을 켠 사람에게는 영상 없이 그림 한 장만 둔다.
//   영상이 돌던 중에 '움직임 멈춤'을 누르면 보던 장면에서 멈춘다.
// - AI 공고 읽기를 끈 체험 주소에도 같은 영상을 넣는다(영상 속 AI 장면도 그대로. 사용자 결정, 2026-11-23).
//   체험 주소는 munteok-open/build.sh가 media 폴더까지 복사해 만든다.
// - 소리 없음, 반복, 화면 읽기 프로그램은 읽지 않음(aria-hidden). 막·자리는 css/bgvideo.css.
// 영상은 개발산출물/배경영상/의 scene.html을 render.mjs로 찍어 만든다. 장면에서 띠 자리를 바꾸면 아래 FRAME·BAND도 같이 바꾼다.
const DIR = 'media/';
const POSTER = `${DIR}start-bg.jpg`; // 영상의 첫 장면과 같은 그림
// 장면 좌표(scene.html, 1200×1080. 영상·그림은 1.25배인 1500×1350). 띠마다 보여 줄 영역: 테두리, 영수증 톱니, 나타날 때 움직이는 만큼까지
const FRAME = { w: 1200, h: 1080, px: 1.25 };
const BAND = {
  top: { x0: 52, x1: 1148, y0: 22, y1: 138 }, // 공고 입력 칸·로고(가운데 80)
  bottom: { x0: 52, x1: 1148, y0: 858, y1: 1034 }, // 영수증·한 줄 문구(가운데 946)
};
// 창이 넉넉할 때의 띠 크기: 두 빈칸 가운데 사이 거리 ÷ 장면의 두 띠 가운데 사이 거리(946 - 80)
const CENTER_GAP = 866;
// 빈칸 안쪽 여유(px): 위쪽 막대 아래, 제목 위(글 뒤 막 8px보다 바깥), 내용 아래(예시 영수증 톱니 7px·글 뒤 막 8px보다 바깥), 창 아래
const GAP = { nav: 6, above: 10, below: 12, edge: 8 };
const MIN_SCALE = 0.42; // 이보다 작게 줄여야 하면(창 높이 약 650px 미만) 글자가 너무 작아 넣지 않는다
const MAX_SCALE = 1;
const wide = window.matchMedia('(min-width: 1024px)');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
let layer = null;
let pageLoaded = document.readyState === 'complete';

// '움직임 멈춤' 버튼(app.js)이 body[data-motion]에 auto·on·off를 남긴다. auto면 기기 설정을 따른다.
function still() {
  const m = document.body.dataset.motion;
  if (m === 'on') return false;
  if (m === 'off') return true;
  const c = navigator.connection;
  return reduce.matches || Boolean(c && (c.saveData || /2g/.test(c.effectiveType || '')));
}

function makeVideo() {
  const v = document.createElement('video');
  for (const a of ['muted', 'loop', 'playsinline', 'autoplay', 'disablepictureinpicture', 'disableremoteplayback']) v.setAttribute(a, '');
  v.muted = true;
  v.preload = 'auto';
  v.poster = POSTER;
  v.tabIndex = -1;
  // 평평한 화면이라 H.264(mp4)가 VP9(webm)보다 작고 선명하다. webm은 H.264를 못 트는 브라우저용.
  v.innerHTML = `<source src="${DIR}start-bg.mp4" type="video/mp4"><source src="${DIR}start-bg.webm" type="video/webm">`;
  return v;
}

function makeImg() {
  const img = new Image();
  img.alt = '';
  img.decoding = 'async';
  img.src = POSTER;
  return img;
}

// 첫 화면의 위·아래 빈칸을 재서 띠 크기(s)와 두 띠의 자리를 정한다. 빈칸이 너무 좁으면 null
function fit() {
  const nav = document.querySelector('.nav');
  const app = document.getElementById('app');
  if (!nav || !app) return null;
  const H = window.innerHeight;
  const W = document.documentElement.clientWidth;
  // 내용 위·아래 끝. 들어올 때의 움직임(transform)에 흔들리지 않게 offset으로 잰다.
  // 창이 낮아 첫 화면이 스크롤될 정도면 빈칸이 거의 없어 영상을 넣지 않게 된다.
  const docTop = (el) => { let y = 0; for (let e = el; e; e = e.offsetParent) y += e.offsetTop; return y; };
  let top = Infinity;
  let bottom = -Infinity;
  for (const k of app.children) {
    if (!k.offsetParent) continue; // 숨긴 요소
    const y = docTop(k) - window.scrollY;
    top = Math.min(top, y);
    bottom = Math.max(bottom, y + k.offsetHeight);
  }
  if (!Number.isFinite(top)) return null;
  const t0 = nav.getBoundingClientRect().bottom + GAP.nav;
  const t1 = top - GAP.above;
  const b0 = bottom + GAP.below;
  const b1 = H - GAP.edge;
  const T = BAND.top;
  const B = BAND.bottom;
  const w = T.x1 - T.x0;
  // 두 띠는 같은 크기로. 창이 넉넉하면 빈칸 가운데 사이 거리에 맞춘 크기, 빈칸이 좁으면 띠가 빈칸에 들어가는 크기, 창 폭도 넘지 않게
  const s = Math.min(((b0 + b1) - (t0 + t1)) / 2 / CENTER_GAP, (t1 - t0) / (T.y1 - T.y0), (b1 - b0) / (B.y1 - B.y0), (W - 32) / w, MAX_SCALE);
  if (!(s >= MIN_SCALE)) return null;
  const place = (band, mid) => ({ band, x: W / 2 - (w * s) / 2, y: mid - ((band.y1 - band.y0) * s) / 2, w: w * s, h: (band.y1 - band.y0) * s });
  return { s, top: place(T, (t0 + t1) / 2), bottom: place(B, (b0 + b1) / 2) };
}

// 띠 모양 창(overflow hidden)과 그 안의 장면 전체(영상·그림)를 자리에 놓는다
function placeBand(box, el, s) {
  Object.assign(el.style, { left: `${box.x.toFixed(1)}px`, top: `${box.y.toFixed(1)}px`, width: `${box.w.toFixed(1)}px`, height: `${box.h.toFixed(1)}px` });
  for (const m of el.querySelectorAll('img, video')) {
    Object.assign(m.style, { left: `${(-box.band.x0 * s).toFixed(1)}px`, top: `${(-box.band.y0 * s).toFixed(1)}px`, width: `${(FRAME.w * s).toFixed(1)}px`, height: `${(FRAME.h * s).toFixed(1)}px` });
  }
}

// 아래 띠: 영상의 아래 띠 부분을 새 장면이 나올 때마다 캔버스에 옮겨 그린다(멈추면 마지막 장면이 남는다)
function mirror(v, canvas) {
  const B = BAND.bottom;
  const k = FRAME.px;
  const ctx = canvas.getContext('2d');
  const draw = () => { if (v.readyState >= 2) ctx.drawImage(v, B.x0 * k, B.y0 * k, (B.x1 - B.x0) * k, (B.y1 - B.y0) * k, 0, 0, canvas.width, canvas.height); };
  const step = () => {
    if (!layer || !layer.contains(v)) return; // 층을 지우면 그만 그린다
    draw();
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(step);
    else requestAnimationFrame(step);
  };
  // 첫 장면, 멈춘 장면, 건너뛴 장면은 새 장면 알림이 늦거나 오지 않을 수 있어 바로 그린다
  for (const e of ['loadeddata', 'seeked', 'pause']) v.addEventListener(e, draw);
  step();
}

function sync() {
  const f = wide.matches && document.body.dataset.step === 'start' ? fit() : null;
  if (!f) {
    if (layer) { layer.remove(); layer = null; }
    document.body.classList.remove('bgv-on');
    return;
  }
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'bgv';
    layer.setAttribute('aria-hidden', 'true');
    const top = document.createElement('div');
    top.className = 'bgv-band bgv-top';
    const bottom = document.createElement('div');
    bottom.className = 'bgv-band bgv-bottom';
    // 그림 한 장을 먼저 깔고, 다 받으면 0.3초에 걸쳐 나타낸다(동작 줄이기면 바로).
    const img = makeImg();
    const host = layer;
    img.addEventListener('load', () => host.classList.add('on'), { once: true });
    top.append(img);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round((BAND.bottom.x1 - BAND.bottom.x0) * FRAME.px);
    canvas.height = Math.round((BAND.bottom.y1 - BAND.bottom.y0) * FRAME.px);
    bottom.append(makeImg(), canvas);
    layer.append(top, bottom);
    document.body.prepend(layer);
  }
  placeBand(f.top, layer.querySelector('.bgv-top'), f.s);
  placeBand(f.bottom, layer.querySelector('.bgv-bottom'), f.s);
  document.body.classList.add('bgv-on');
  let v = layer.querySelector('video');
  if (still()) { if (v && !v.paused) v.pause(); return; }
  // 영상은 앱 파일을 다 받은 뒤에 받기 시작한다(첫 화면이 늦게 뜨지 않게).
  if (!pageLoaded) return;
  if (!v) {
    v = makeVideo();
    const host = layer;
    v.addEventListener('playing', () => host.classList.add('on'), { once: true }); // 그림을 못 받았어도 영상이 돌면 보인다
    const top = layer.querySelector('.bgv-top');
    top.append(v);
    placeBand(f.top, top, f.s);
    mirror(v, layer.querySelector('.bgv-bottom canvas'));
  }
  if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } // 자동 재생이 막히면 그림 그대로
}

// 화면이 바뀌거나(단계·움직임 설정·첫 화면 다시 그림), 창 크기·글꼴이 바뀌면 다음 그림 때 한 번 다시 맞춘다
let queued = 0;
const later = () => { if (!queued) queued = requestAnimationFrame(() => { queued = 0; sync(); }); };
new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['data-step', 'data-motion'] });
const appEl = document.getElementById('app');
if (appEl) new MutationObserver(later).observe(appEl, { childList: true });
window.addEventListener('resize', later);
wide.addEventListener('change', later);
reduce.addEventListener('change', later);
if (document.fonts) {
  document.fonts.ready.then(later);
  if (document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', later);
}
if (!pageLoaded) window.addEventListener('load', () => { pageLoaded = true; sync(); }, { once: true });
sync();
