// 실시간 관제용 로컬 서버 (설치할 것 없음, Node.js만 있으면 됩니다)
//   node serve.mjs
// 그다음 브라우저에서 http://localhost:4173 을 열면, 블로그 에이전트가 남기는
// 실행 기록(ai 블로그 자동화 에이전트/07_실행기록/*.jsonl) 중 가장 최근 파일을 1.5초마다 읽어 화면에 보여 줍니다.
// 다른 폴더의 기록을 보려면: TRACE_DIR=<폴더> node serve.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const TRACE_DIR = process.env.TRACE_DIR || path.resolve(here, '..', 'ai 블로그 자동화 에이전트', '07_실행기록');
const PORT = Number(process.env.PORT || 4173);

function latest() {
  try {
    const files = fs.readdirSync(TRACE_DIR).filter(f => f.endsWith('.jsonl'))
      .map(f => ({ f, m: fs.statSync(path.join(TRACE_DIR, f)).mtimeMs }))
      .sort((a, b) => b.m - a.m);
    return files[0]?.f;
  } catch { return undefined; }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/trace') {
    const name = latest();
    const body = { name: name || null, text: name ? fs.readFileSync(path.join(TRACE_DIR, name), 'utf8') : '' };
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(JSON.stringify(body));
    return;
  }
  if (url.pathname === '/' || url.pathname === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(fs.readFileSync(path.join(here, 'index.html')));
    return;
  }
  res.writeHead(404); res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`관제 대시보드: http://localhost:${PORT}`);
  console.log(`읽는 기록 폴더: ${TRACE_DIR}`);
});
