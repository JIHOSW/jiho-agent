// 이미 끝난 실행을 실행 기록으로 바꾸는 도구 (훅을 켜기 전에 돌린 실행용)
//   node from-transcript.mjs <Claude Code 대화 기록 .jsonl>
// 대화 기록은 보통 %USERPROFILE%\.claude\projects\<폴더 이름>\<세션 id>.jsonl 에 있습니다.
// 블로그 스킬을 처음 부른 입력부터 끝까지를 07_실행기록/<날짜>_<세션>.jsonl 로 만듭니다.
// 훅과 같은 형식이라 관제 대시보드에서 그대로 열 수 있습니다. 프롬프트 본문과 파일 내용은 옮기지 않습니다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BLOG = path.resolve(here, '..', '..');
const DIR = path.join(BLOG, '07_실행기록');
const NOISE = /^(mcp__ccd_|ToolSearch$|TodoWrite$|TaskCreate$|TaskUpdate$)/;
const cut = (s, n) => { s = String(s ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n) + '…' : s; };
const rel = p => {
  if (!p) return undefined;
  const r = path.relative(BLOG, String(p)).split(path.sep).join('/');
  return r.startsWith('..') ? cut(String(p).split(/[\\/]/).slice(-2).join('/'), 120) : cut(r, 160);
};

const src = process.argv[2];
if (!src) { console.error('사용법: node from-transcript.mjs <대화 기록 .jsonl>'); process.exit(1); }
const rows = fs.readFileSync(src, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

const out = []; const usage = new Map();
let started = false, lastAssistant = null, sid = null;
const flushStop = () => { if (started && lastAssistant) { out.push({ t: lastAssistant, e: 'stop' }); lastAssistant = null; } };

for (const j of rows) {
  sid = sid || j.sessionId;
  if (j.type === 'user' && typeof j.message?.content === 'string' && !j.isMeta) {
    const p = j.message.content.trim();
    const m = p.match(/\/?blog[-\s](trend|analysis)/);
    if (!started && m) started = true;
    if (!started) continue;
    flushStop();
    out.push({ t: j.timestamp, e: 'prompt', len: p.length, slash: m && p.startsWith('/') ? '/blog-' + m[1] : undefined });
  } else if (j.type === 'assistant' && Array.isArray(j.message?.content)) {
    for (const c of j.message.content) {
      if (c.type !== 'tool_use') continue;
      const i = c.input || {};
      if (!started && c.name === 'Skill' && /^blog-/.test(String(i.skill || ''))) started = true;
      if (!started || NOISE.test(c.name)) continue;
      const rec = { t: j.timestamp, e: 'tool', tool: c.name };
      if (i.file_path || i.notebook_path) rec.path = rel(i.file_path || i.notebook_path);
      else if (i.path) rec.path = rel(i.path);
      if (i.pattern) rec.pattern = cut(i.pattern, 60);
      if (i.url) rec.url = cut(i.url, 200);
      if (i.query) rec.q = cut(i.query, 80);
      if (i.skill) rec.skill = cut(i.skill, 60);
      if (i.command) rec.cmd = cut(String(i.command).replace(/^\s*cd\s+("[^"]*"|\S+)\s*(&&|;)\s*/, ''), 60);
      out.push(rec);
    }
    if (started) {
      lastAssistant = j.timestamp;
      const u = j.message.usage;
      if (u) usage.set(j.message.id || j.uuid, [j.timestamp, u.input_tokens || 0, u.output_tokens || 0, u.cache_read_input_tokens || 0, u.cache_creation_input_tokens || 0]);
    }
  }
}
flushStop();
if (!out.length) { console.error('블로그 스킬을 쓴 부분을 찾지 못했습니다.'); process.exit(1); }
out.sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
if (usage.size) out.push({ t: out[out.length - 1].t, e: 'usage', msgs: [...usage.values()] });

fs.mkdirSync(DIR, { recursive: true });
const d0 = new Date(out[0].t);
const name = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}-${String(d0.getDate()).padStart(2, '0')}_${String(sid || 'transcript').slice(0, 8)}.jsonl`;
fs.writeFileSync(path.join(DIR, name), out.map(o => JSON.stringify(o)).join('\n') + '\n');
console.log(`${name} 에 ${out.length}줄을 남겼습니다.`);
