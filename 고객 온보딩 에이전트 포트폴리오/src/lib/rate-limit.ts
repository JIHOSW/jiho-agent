// 공개 데모용 실행 횟수 제한 (서버 인스턴스 메모리 기준, 최선 노력 방식).
// Gemini 무료 요금제의 하루 요청 한도를 여러 방문자가 나눠 쓰도록 실행 횟수를 제한합니다.

const PER_IP = Number(process.env.RUNS_PER_IP_PER_DAY ?? 5);
const GLOBAL = Number(process.env.RUNS_PER_DAY ?? 60);

const day = () => new Date().toISOString().slice(0, 10);
let currentDay = day();
let globalCount = 0;
const perIp = new Map<string, number>();
const usedStates = new Set<string>();

function roll() {
  const d = day();
  if (d !== currentDay) {
    currentDay = d;
    globalCount = 0;
    perIp.clear();
    usedStates.clear();
  }
}

export function takeRun(ip: string): { ok: true } | { ok: false; message: string } {
  roll();
  if (globalCount >= GLOBAL) return { ok: false, message: "오늘의 데모 실행 한도를 모두 사용했습니다. 녹화된 실행 기록을 확인해 주세요." };
  const n = perIp.get(ip) ?? 0;
  if (n >= PER_IP) return { ok: false, message: `한 사용자당 하루 ${PER_IP}회까지 실행할 수 있습니다. 녹화된 실행 기록을 확인해 주세요.` };
  perIp.set(ip, n + 1);
  globalCount += 1;
  return { ok: true };
}

// 같은 승인 대기 상태로 여러 번 재개하지 못하게 합니다.
export function consumeState(sig: string): boolean {
  roll();
  if (usedStates.has(sig)) return false;
  usedStates.add(sig);
  return true;
}
