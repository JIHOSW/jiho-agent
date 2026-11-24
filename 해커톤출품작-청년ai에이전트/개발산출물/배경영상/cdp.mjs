// 아주 작은 CDP 도우미: 헤드리스 Chrome(포트 9333)의 탭 하나를 조종한다.
import fs from 'node:fs';

export async function open(port = Number(process.env.CDP_PORT || 9333)) {
  let list;
  for (let i = 0; i < 40; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); break; } catch { await sleep(250); }
  }
  if (!list) throw new Error('Chrome에 연결하지 못함');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pending = new Map();
  const listeners = new Set();
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message)); else resolve(msg.result);
    } else if (msg.method) for (const l of listeners) l(msg);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const once = (method, timeout = 15000) => new Promise((resolve, reject) => {
    const t = setTimeout(() => { listeners.delete(fn); reject(new Error('timeout ' + method)); }, timeout);
    const fn = (m) => { if (m.method === method) { clearTimeout(t); listeners.delete(fn); resolve(m.params); } };
    listeners.add(fn);
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Network.setCacheDisabled', { cacheDisabled: true });
  const page = {
    send,
    on: (fn) => listeners.add(fn),
    async viewport(width, height, scale = 1) {
      await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: scale, mobile: width < 768 });
    },
    async reducedMotion(on) {
      await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: on ? 'reduce' : 'no-preference' }] });
    },
    async goto(url) {
      const loaded = once('Page.loadEventFired');
      await send('Page.navigate', { url });
      await loaded;
    },
    async eval(expression) {
      const r = await send('Runtime.evaluate', { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text);
      return r.result.value;
    },
    async shot(path, quality = 88) {
      const r = await send('Page.captureScreenshot', { format: 'jpeg', quality });
      fs.writeFileSync(path, Buffer.from(r.data, 'base64'));
    },
    async key(key, shift = false) {
      const code = key === 'Tab' ? 'Tab' : key;
      const keyCode = key === 'Tab' ? 9 : key === 'Enter' ? 13 : 0;
      const modifiers = shift ? 8 : 0;
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key, code, windowsVirtualKeyCode: keyCode, modifiers });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: keyCode, modifiers });
    },
    close: async () => { await send('Page.close').catch(() => {}); ws.close(); },
  };
  return page;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 앱을 새로 열고(입력 지움) 규칙을 다 불러올 때까지 기다린다. 화면 조작 도우미 __c(선택자)를 심는다.
export async function fresh(page, base) {
  await page.goto(base + '?t=' + Date.now());
  await page.eval(`sessionStorage.clear();`);
  await page.goto(base + '?t=' + Date.now());
  await page.eval(`for (let i = 0; i < 100 && !window.__munteok; i++) await new Promise(r => setTimeout(r, 50)); await document.fonts.ready;`);
  await helpers(page);
}
export async function helpers(page) {
  await page.eval(`
    window.__c = (sel) => { const e = document.querySelector(sel); if (!e) throw new Error('없음 ' + sel + ' @' + window.__munteok.step); e.click(); return window.__munteok.step; };
    window.__set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
  `);
}
