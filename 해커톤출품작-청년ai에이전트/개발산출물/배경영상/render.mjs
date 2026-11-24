// scene.html을 헤드리스 Chrome(포트 9333)에서 열고 setT(초)로 한 장씩 찍는다.
// 쓰는 법: node render.mjs <저장 폴더> [fps=30] [시작 초=0] [장 수=전체]   또는   node render.mjs <저장 폴더> --at 1.5,9,17.5
// 시작 초를 주면 그 장면부터 한 바퀴를 찍는다(포스터 = 첫 장). 한 바퀴가 이어지므로 어디서 시작해도 끊기지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { open, sleep } from './cdp.mjs';

const OUT = process.argv[2];
const atIdx = process.argv.indexOf('--at');
const AT = atIdx > 0 ? process.argv[atIdx + 1].split(',').map(Number) : null;
const FPS = Number(process.argv[3] && !AT ? process.argv[3] : 30);
const START = Number(!AT && process.argv[4] ? process.argv[4] : 0);
const T = 24;
const COUNT = Number(!AT && process.argv[5] ? process.argv[5] : T * FPS);
// 장면 1200×1080을 1.25배(1500×1350)로 찍는다. 앱에서는 보통 0.65~1배로 줄여 보여서, 레티나 화면에서도 글자가 덜 흐리다.
// 1500×1350·30장/초는 H.264 level 4.0 안이라 거의 모든 PC 브라우저가 튼다.
const W = 1200, HT = 1080, DPR = 1.25;
fs.mkdirSync(OUT, { recursive: true });

const page = await open();
await page.send('Emulation.setDeviceMetricsOverride', { width: W, height: HT, deviceScaleFactor: DPR, mobile: false });
await page.goto('file://' + path.resolve(new URL('./scene.html', import.meta.url).pathname));
const fonts = await page.eval(`return await window.ready;`);
console.log('글꼴 조각', fonts);
const shot = async (t, file) => {
  await page.eval(`setT(${t}); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));`);
  const r = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: W, height: HT, scale: 1 } });
  fs.writeFileSync(file, Buffer.from(r.data, 'base64'));
};
if (AT) {
  for (const t of AT) await shot(t, path.join(OUT, `at-${String(t).replace('.', '_')}.png`));
} else {
  const t0 = Date.now();
  for (let i = 0; i < COUNT; i++) {
    await shot(START + i / FPS, path.join(OUT, `f${String(i).padStart(4, '0')}.png`));
    if (i % 60 === 0) console.log(i, '/', COUNT, Math.round((Date.now() - t0) / 1000) + 's');
  }
}
await page.send('Page.close').catch(() => {});
page.close();
process.exit(0);
