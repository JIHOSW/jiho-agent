import { ApiError, GoogleGenAI, type Content, type FunctionCall, type Part } from "@google/genai";
import { GATED_TOOLS, REPORT_TOOL, TOOLS, executeTool } from "./tools";
import { PROFILES, TODAY, createEnv, type CustomerId } from "./scenarios";
import type { PendingApproval, RunState } from "./run-state";

// 에이전트의 "두뇌": Google Gemini API (무료 요금제로 사용 가능한 모델)
export const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";
export const MAX_TURNS = Number(process.env.MAX_TURNS ?? 24);

export type AgentEvent =
  | { type: "run_started"; customerId: CustomerId; model: string }
  | { type: "turn_started"; turn: number }
  | { type: "thinking_delta"; text: string }
  | { type: "text_delta"; text: string }
  | { type: "tool_call"; id: string; name: string; input: unknown; gated: boolean }
  | { type: "tool_result"; id: string; name: string; result: unknown; isError: boolean }
  | { type: "approval_required"; pending: PendingApproval[]; state: string; sig: string }
  | { type: "approval_decision"; id: string; name: string; approved: boolean; comment?: string }
  | { type: "report"; report: unknown }
  | { type: "done"; reason: string; turns: number; usage: RunState["usage"]; models?: string[] }
  | { type: "error"; message: string };

const SYSTEM_PROMPT = `당신은 B2B 협업·전자결재 SaaS "워크브릿지(WorkBridge)"의 고객 온보딩 매니저 에이전트입니다.
담당 고객사 한 곳을 맡아, 도입 상황을 파악하고 막힌 문제를 해결하고, 사용자가 실제 업무에서 첫 활용에 성공하도록 이끄는 것이 목표입니다.

일하는 방식
- 먼저 고객 프로필과 설정 진단으로 현재 상황을 파악하세요. 추측하지 말고 도구 결과(진단, 로그, 사용 데이터, 지식베이스)를 근거로 판단하세요.
- 문제를 발견하면 로그로 원인을 좁히고 지식베이스에서 해결책을 찾으세요. 해결책을 적용한 뒤에는 반드시 연동 테스트로 실제로 해결됐는지 검증하세요.
- 우리가 운영 콘솔에서 고칠 수 있는 것(apply_config_change)과 고객사가 자기 시스템에서 직접 해야 하는 것(고객에게 안내)을 구분하세요. 고객에게 조치를 요청할 때는 고객이 그대로 따라 할 수 있도록 정확한 설정 항목과 값을 적으세요.
- 문제를 하나 해결했다고 끝내지 말고, 조치 후 설정 진단을 다시 실행해 남은 경고(warn)나 오픈 일정에 영향을 줄 위험이 없는지 검수하세요.
- 고객에게 메일을 보냈다면 check_customer_replies로 회신을 확인하고, 회신 내용(되묻는 질문, 제약 조건, 새 요청)을 반영해 다음 행동을 정하세요. 회신을 확인하지 않은 채 보고서를 제출하지 마세요.
- HTTP 500, 서버 예외(Exception) 같은 오류는 고객 데이터 문제가 아니라 제품 결함의 신호입니다. 지식베이스로 해결되지 않는 결함은 개발자가 바로 재현할 수 있는 이슈로 등록하고, 고객에게는 임시 우회책을 안내하세요. 우회책으로 당장 해결됐더라도 결함 자체는 개발팀에 넘겨야 합니다.
- 개발 일정이나 수정 시점처럼 확인되지 않은 내용을 고객에게 약속하지 마세요. 개발팀에서 받은 답이 있을 때만 전달하세요.
- 교육 계획이나 첫 활용 목표를 세우기 전에, 그 업무에 필요한 기능·양식·계정이 실제로 준비돼 있는지 확인하세요. 없으면 먼저 준비하세요.
- 기술 문제가 없어도 일이 끝난 게 아닙니다. 사용 데이터를 보고 가장 중요한데 가장 덜 쓰는 대상에게 맞는 교육 계획을 세우고, 측정 가능한 첫 활용 목표를 등록하세요.
- apply_config_change, send_customer_message, create_dev_ticket는 담당 매니저(사람)의 승인 후 실행됩니다. 승인자가 판단할 수 있게 근거를 함께 적으세요. 근거로 문서 번호나 로그를 적을 때는 이번 작업에서 실제로 조회한 것만 쓰세요. 거절되면 사유를 반영해 다른 방법을 찾거나, 보고서에 대기 항목으로 남기세요.
- 고객에게 보낼 메일은 오픈 일정과 고객 담당자의 역할을 고려해 정중하고 간결한 한국어로 쓰세요.
- 도구를 쓸 때마다 무엇을 왜 확인하려는지 한두 문장으로 먼저 짧게 말하세요.
- 생각 과정을 포함한 모든 설명은 한국어로 하세요.
- 할 일을 마치면 마지막에 submit_onboarding_report로 보고서를 제출하고 끝내세요.

오늘 날짜: ${TODAY}`;

let client: GoogleGenAI | null = null;
function getClient() {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

const functionDeclarations = TOOLS.map((t) => ({
  name: t.name,
  description: t.description,
  parametersJsonSchema: t.input_schema,
}));

export function initialState(customerId: CustomerId, note?: string): RunState {
  const profile = PROFILES[customerId];
  const extra = note?.trim() ? `\n\n담당 매니저 추가 지시: ${note.trim()}` : "";
  return {
    customerId,
    messages: [
      {
        role: "user",
        parts: [{ text: `새로 배정된 고객사입니다: ${profile.company}. 이 고객이 첫 활용에 성공하도록 온보딩을 진행해 주세요.${extra}` }],
      },
    ],
    env: createEnv(customerId),
    turn: 0,
    partialResults: [],
    pending: [],
    toolOrder: [],
    usage: { input: 0, output: 0, cacheRead: 0 },
    startedAt: Date.now(),
  };
}

interface Call {
  id: string;
  name: string;
  args: unknown;
  apiId?: string; // 모델이 준 호출 id가 있으면 응답에 그대로 돌려줍니다
}

function responsePart(call: Pick<Call, "name" | "apiId">, response: Record<string, unknown>): Part {
  return { functionResponse: { ...(call.apiId ? { id: call.apiId } : {}), name: call.name, response } };
}

function runTool(state: RunState, call: Call, emit: (e: AgentEvent) => void): Part {
  try {
    const result = executeTool(state.env, call.name, call.args, state.turn);
    emit({ type: "tool_result", id: call.id, name: call.name, result, isError: false });
    return responsePart(call, { output: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emit({ type: "tool_result", id: call.id, name: call.name, result: { error: message }, isError: true });
    return responsePart(call, { error: message });
  }
}

export interface Decision {
  id: string;
  approved: boolean;
  comment?: string;
}

// 승인 결정을 반영해 대기 중이던 턴의 도구 응답을 완성합니다.
export function applyDecisions(state: RunState, decisions: Decision[], emit: (e: AgentEvent) => void) {
  const results = new Map(state.partialResults.map((r) => [r.id, r.part]));
  for (const p of state.pending) {
    const d = decisions.find((x) => x.id === p.id);
    const approved = d?.approved ?? false;
    const call: Call = { id: p.id, name: p.name, args: p.input, apiId: p.apiId };
    emit({ type: "approval_decision", id: p.id, name: p.name, approved, comment: d?.comment });
    if (approved) {
      results.set(p.id, runTool(state, call, emit));
    } else {
      const comment = d?.comment?.trim() ?? "";
      emit({ type: "tool_result", id: p.id, name: p.name, result: { rejected: true, comment }, isError: false });
      results.set(
        p.id,
        responsePart(call, {
          rejected: true,
          message: `담당 매니저가 이 조치를 승인하지 않아 실행되지 않았습니다.${comment ? ` 사유: ${comment}` : ""}`,
        }),
      );
    }
  }
  const parts = state.toolOrder.map((id) => results.get(id)).filter((p): p is Part => !!p);
  state.messages.push({ role: "user", parts });
  state.partialResults = [];
  state.pending = [];
  state.toolOrder = [];
}

export type LoopOutcome =
  | { kind: "paused"; state: RunState }
  | { kind: "finished"; reason: string; state: RunState };

export async function runLoop(state: RunState, emit: (e: AgentEvent) => void, signal?: AbortSignal): Promise<LoopOutcome> {
  while (state.turn < MAX_TURNS) {
    if (signal?.aborted) return { kind: "finished", reason: "aborted", state };
    state.turn += 1;
    emit({ type: "turn_started", turn: state.turn });

    const response = await generateWithRetry(state, signal);

    const u = response.usageMetadata;
    state.usage.input += u?.promptTokenCount ?? 0;
    state.usage.output += (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0);
    state.usage.cacheRead += u?.cachedContentTokenCount ?? 0;

    const candidate = response.candidates?.[0];
    const content: Content | undefined = candidate?.content;
    if (!content?.parts?.length) {
      const reason = candidate?.finishReason ?? response.promptFeedback?.blockReason ?? "empty_response";
      return { kind: "finished", reason: String(reason).toLowerCase(), state };
    }

    // 모델 응답은 생각 서명(thoughtSignature)까지 그대로 기록에 남겨야 다음 턴 판단이 이어집니다.
    state.messages.push({ role: "model", parts: content.parts });

    for (const part of content.parts) {
      if (part.text && part.thought) emit({ type: "thinking_delta", text: part.text });
      else if (part.text) emit({ type: "text_delta", text: part.text });
    }

    const calls: Call[] = content.parts
      .filter((p): p is Part & { functionCall: FunctionCall } => !!p.functionCall)
      .map((p, i) => ({
        id: p.functionCall.id ?? `t${state.turn}-${i}`,
        apiId: p.functionCall.id,
        name: p.functionCall.name ?? "",
        args: p.functionCall.args ?? {},
      }));

    if (calls.length === 0) {
      if (candidate?.finishReason === "MAX_TOKENS") return { kind: "finished", reason: "max_tokens", state };
      // 보고서 없이 말로만 끝내면, 두 번까지 작업을 이어가도록 요청합니다.
      state.nudges = (state.nudges ?? 0) + 1;
      if (state.nudges > 2) return { kind: "finished", reason: "end_turn", state };
      state.messages.push({
        role: "user",
        parts: [{ text: "아직 온보딩 보고서가 제출되지 않았습니다. 도구를 사용해 필요한 확인과 조치를 계속 진행하고, 마지막에 submit_onboarding_report로 보고서를 제출하세요." }],
      });
      continue;
    }

    state.toolOrder = calls.map((c) => c.id);
    let reported = false;

    for (const call of calls) {
      const gated = GATED_TOOLS.has(call.name);
      emit({ type: "tool_call", id: call.id, name: call.name, input: call.args, gated });
      if (gated) {
        state.pending.push({ id: call.id, name: call.name, input: call.args, apiId: call.apiId });
        continue;
      }
      const part = runTool(state, call, emit);
      state.partialResults.push({ id: call.id, part });
      if (call.name === REPORT_TOOL && !part.functionResponse?.response?.error) {
        reported = true;
        emit({ type: "report", report: call.args });
      }
    }

    if (state.pending.length > 0) return { kind: "paused", state };

    state.messages.push({ role: "user", parts: state.partialResults.map((r) => r.part) });
    state.partialResults = [];
    state.toolOrder = [];

    if (reported) return { kind: "finished", reason: "report_submitted", state };
  }

  return { kind: "finished", reason: "max_turns", state };
}

// 무료 모델은 혼잡(503)이 잦습니다. 잠시 기다렸다 다시 시도하고, 계속 막히면 다른 무료 모델로 넘어갑니다.
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.8-flash,gemini-3.5-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const RETRYABLE = new Set([500, 502, 503, 504]);
const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      resolve();
    });
  });

async function generateWithRetry(state: RunState, signal?: AbortSignal) {
  // 한 번 대체 모델로 넘어가면 이번 실행은 그 모델을 계속 씁니다(혼잡한 모델을 매 단계 다시 기다리지 않도록).
  const all = [MODEL, ...FALLBACK_MODELS.filter((m) => m !== MODEL)];
  const startAt = Math.max(0, all.indexOf(state.activeModel ?? MODEL));
  const models = all.slice(startAt);
  let lastErr: unknown;
  for (const model of models) {
    for (const wait of [0, 2500]) {
      if (wait) await sleep(wait, signal);
      if (signal?.aborted) throw new Error("실행이 중단되었습니다.");
      try {
        const response = await getClient().models.generateContent({
          model,
          contents: state.messages,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            tools: [{ functionDeclarations }],
            thinkingConfig: { includeThoughts: true },
            abortSignal: signal,
          },
        });
        state.activeModel = model;
        state.modelsUsed ??= [];
        if (!state.modelsUsed.includes(model)) state.modelsUsed.push(model);
        return response;
      } catch (err) {
        lastErr = err;
        if (!(err instanceof ApiError)) throw err;
        if (err.status === 429) {
          // 분당 한도: 안내된 대기 시간이 짧으면 기다렸다가 같은 모델로 재시도. 길면(일일 한도 등) 다음 모델로.
          const delay = retryDelayMs(err.message);
          if (delay !== null && delay <= 65_000) {
            await sleep(delay + 1000, signal);
            continue;
          }
          break;
        }
        if (!RETRYABLE.has(err.status)) throw err;
      }
    }
  }
  throw lastErr;
}

function retryDelayMs(message: string): number | null {
  const m = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return m ? Math.ceil(Number(m[1]) * 1000) : null;
}

export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return "오늘 무료 사용 한도에 도달했거나 요청이 너무 잦습니다. 잠시 후 다시 시도하거나 녹화본을 확인해 주세요.";
    if (err.status === 400 || err.status === 403) return `Gemini API 요청 오류 (${err.status}): API 키나 모델 이름을 확인해 주세요. ${err.message}`;
    if (RETRYABLE.has(err.status)) return "무료 모델 서버가 지금 혼잡합니다. 잠시 후 다시 시도하거나 녹화본을 확인해 주세요.";
    return `Gemini API 오류 (${err.status}): ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
