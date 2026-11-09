// 실행 기록 훅: 블로그 에이전트가 일한 과정을 07_실행기록/<날짜>_<세션>.jsonl 에 한 줄씩 남깁니다.
// 관제 대시보드(에이전트 팀 관제 대시보드)가 이 파일을 읽어 실제 흐름·시간·토큰을 보여 줍니다.
//
// - 블로그 스킬(/blog-trend, /blog-analysis)을 쓴 세션만 기록합니다. 같은 저장소의 다른 작업은 남기지 않습니다.
// - 기록하는 것: 시각, 이벤트 종류, 도구 이름, 파일 경로·URL·검색어(짧게), 토큰 수.
//   프롬프트 본문과 파일 내용은 남기지 않습니다.
// - 블로그 폴더에서 열어도, 저장소 맨 위 폴더에서 열어도 같은 07_실행기록 폴더에 남깁니다.
// - 어떤 오류가 나도 에이전트 작업을 막지 않도록 항상 조용히 끝납니다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BLOG = path.resolve(here, '..', '..');            // ai 블로그 자동화 에이전트 폴더
const DIR = path.join(BLOG, '07_실행기록');
const STATE = path.join(DIR, '.state');
const NOISE = /^(mcp__ccd_|ToolSearch$|TodoWrite$|TaskCreate$|TaskUpdate$)/;   // 화면 표시용 도구는 빼기

function cut(s, n) {
  s = String(s ?? '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}
function rel(p) {
  if (!p) return undefined;
  const r = path.relative(BLOG, String(p)).split(path.sep).join('/');
  return r.startsWith('..') ? cut(String(p).split(/[\\/]/).slice(-2).join('/'), 120) : cut(r, 160);
}
const isBlogPrompt = p => /^\/blog[-\s]?(trend|analysis)/.test(p) || /<command-name>\/?blog-(trend|analysis)/.test(p);

function main() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch { return; }
  let d; try { d = JSON.parse(raw); } catch { return; }

  const sid = String(d.session_id || 'nosession').slice(0, 8);
  const ev = d.hook_event_name;
  const t = new Date().toISOString();
  fs.mkdirSync(STATE, { recursive: true });
  const onFile = path.join(STATE, `${sid}.on`);
  const pendFile = path.join(STATE, `${sid}.pending`);
  let active = fs.existsSync(onFile);
  const lines = [];

  const activate = () => {
    if (active) return;
    fs.writeFileSync(onFile, t);
    active = true;
    try { lines.push(JSON.parse(fs.readFileSync(pendFile, 'utf8'))); fs.unlinkSync(pendFile); } catch { /* 대기 중인 입력 없음 */ }
  };

  if (ev === 'UserPromptSubmit') {
    const p = String(d.prompt || '').trim();
    const m = p.match(/\/blog-(trend|analysis)/);
    const rec = { t, e: 'prompt', len: p.length, slash: (p.startsWith('/') || p.includes('<command-name>')) && m ? m[0] : undefined };
    if (isBlogPrompt(p)) activate();
    if (!active) { fs.writeFileSync(pendFile, JSON.stringify(rec)); return; }
    lines.push(rec);
  } else if (ev === 'PreToolUse') {
    const i = d.tool_input || {};
    if (d.tool_name === 'Skill' && /^blog-(trend|analysis)/.test(String(i.skill || ''))) activate();
    if (!active || NOISE.test(String(d.tool_name || ''))) { if (lines.length) write(sid, lines); return; }
    const rec = { t, e: 'tool', tool: d.tool_name };
    if (i.file_path || i.notebook_path) rec.path = rel(i.file_path || i.notebook_path);
    else if (i.path) rec.path = rel(i.path);
    if (i.pattern) rec.pattern = cut(i.pattern, 60);
    if (i.url) rec.url = cut(i.url, 200);
    if (i.query) rec.q = cut(i.query, 80);
    if (i.skill) rec.skill = cut(i.skill, 60);
    if (i.command) rec.cmd = cut(String(i.command).replace(/^\s*cd\s+("[^"]*"|\S+)\s*(&&|;)\s*/, ''), 60);   // 앞쪽 cd "<내 컴퓨터 경로>" 는 빼기
    if (i.subagent_type || i.description) rec.agent = cut(i.subagent_type || i.description, 60);
    lines.push(rec);
  } else if (ev === 'Stop') {
    if (!active) return;
    lines.push({ t, e: 'stop' });
    // 토큰: 대화 기록(transcript)에서 기록을 시작한 뒤의 응답마다 usage를 모읍니다.
    try {
      const since = Date.parse(fs.readFileSync(onFile, 'utf8')) - 60e3;
      const seen = new Map();
      for (const line of fs.readFileSync(d.transcript_path, 'utf8').split('\n')) {
        if (!line.includes('"usage"')) continue;
        let j; try { j = JSON.parse(line); } catch { continue; }
        const m = j.message;
        if (j.type !== 'assistant' || !m || !m.usage || Date.parse(j.timestamp) < since) continue;
        const u = m.usage;
        seen.set(m.id || j.uuid, [j.timestamp, u.input_tokens || 0, u.output_tokens || 0, u.cache_read_input_tokens || 0, u.cache_creation_input_tokens || 0]);
      }
      if (seen.size) lines.push({ t, e: 'usage', msgs: [...seen.values()] });
    } catch { /* 토큰 집계 실패는 무시 */ }
  } else {
    return;
  }
  if (lines.length) write(sid, lines);
}

function write(sid, lines) {
  let file = fs.readdirSync(DIR).find(f => f.endsWith(`_${sid}.jsonl`));
  if (!file) {
    const now = new Date();
    file = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${sid}.jsonl`;
  }
  fs.appendFileSync(path.join(DIR, file), lines.map(l => JSON.stringify(l)).join('\n') + '\n');
}

try { main(); } catch { /* 기록 실패가 작업을 막지 않게 */ }
