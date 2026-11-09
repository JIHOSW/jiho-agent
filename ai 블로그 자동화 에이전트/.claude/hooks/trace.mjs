// 실행 기록 훅: Claude Code가 보내는 이벤트를 07_실행기록/<날짜>_<세션>.jsonl 에 한 줄씩 남깁니다.
// 관제 대시보드(에이전트 팀 관제 대시보드)가 이 파일을 읽어 실제 흐름·시간·토큰을 보여 줍니다.
// 기록하는 것: 시각, 이벤트 종류, 도구 이름, 파일 경로·URL·검색어(짧게). 프롬프트 본문과 파일 내용은 남기지 않습니다.
// 어떤 오류가 나도 에이전트 작업을 막지 않도록 항상 조용히 끝납니다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

function readStdin() {
  try { return fs.readFileSync(0, 'utf8'); } catch { return ''; }
}

function cut(s, n) {
  s = String(s ?? '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function main() {
  const raw = readStdin();
  if (!raw) return;
  let d;
  try { d = JSON.parse(raw); } catch { return; }

  const proj = process.env.CLAUDE_PROJECT_DIR || d.cwd || path.resolve(here, '..', '..');
  const rel = p => {
    if (!p) return undefined;
    const r = path.relative(proj, String(p)).split(path.sep).join('/');
    return r.startsWith('..') ? cut(String(p).split(/[\\/]/).slice(-2).join('/'), 120) : cut(r, 160);
  };

  const dir = path.join(proj, '07_실행기록');
  fs.mkdirSync(dir, { recursive: true });
  const sid = String(d.session_id || 'nosession').slice(0, 8);
  let file = fs.readdirSync(dir).find(f => f.endsWith(`_${sid}.jsonl`));
  if (!file) {
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    file = `${day}_${sid}.jsonl`;
  }
  const out = path.join(dir, file);
  const lines = [];
  const t = new Date().toISOString();
  const ev = d.hook_event_name;

  if (ev === 'SessionStart') {
    lines.push({ t, e: 'start', src: d.source });
  } else if (ev === 'UserPromptSubmit') {
    const p = String(d.prompt || '').trim();
    const slash = p.startsWith('/') ? p.split(/\s+/)[0] : undefined;
    lines.push({ t, e: 'prompt', len: p.length, slash });
  } else if (ev === 'PreToolUse') {
    const i = d.tool_input || {};
    const rec = { t, e: 'tool', tool: d.tool_name };
    if (i.file_path || i.notebook_path) rec.path = rel(i.file_path || i.notebook_path);
    else if (i.path) rec.path = rel(i.path);
    if (i.pattern) rec.pattern = cut(i.pattern, 60);
    if (i.url) rec.url = cut(i.url, 200);
    if (i.query) rec.q = cut(i.query, 80);
    if (i.skill) rec.skill = cut(i.skill, 60);
    if (i.command) rec.cmd = cut(i.command, 60);
    if (i.subagent_type || i.description) rec.agent = cut(i.subagent_type || i.description, 60);
    lines.push(rec);
  } else if (ev === 'Stop') {
    lines.push({ t, e: 'stop' });
    // 토큰: 대화 기록(transcript)에서 응답마다 usage를 모아 누적 목록으로 남깁니다.
    try {
      const seen = new Map();
      for (const line of fs.readFileSync(d.transcript_path, 'utf8').split('\n')) {
        if (!line.includes('"usage"')) continue;
        let j; try { j = JSON.parse(line); } catch { continue; }
        const m = j.message;
        if (j.type !== 'assistant' || !m || !m.usage) continue;
        const u = m.usage;
        seen.set(m.id || j.uuid, [j.timestamp, u.input_tokens || 0, u.output_tokens || 0, u.cache_read_input_tokens || 0, u.cache_creation_input_tokens || 0]);
      }
      if (seen.size) lines.push({ t, e: 'usage', msgs: [...seen.values()] });
    } catch { /* 토큰 집계 실패는 무시 */ }
  } else {
    return;
  }
  fs.appendFileSync(out, lines.map(l => JSON.stringify(l)).join('\n') + '\n');
}

try { main(); } catch { /* 기록 실패가 작업을 막지 않게 */ }
