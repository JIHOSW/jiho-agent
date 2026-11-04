import { z } from "zod";
import { MODEL, applyDecisions, describeError, initialState, runLoop, type AgentEvent } from "@/lib/agent";
import { sign, verify, type RunState } from "@/lib/run-state";
import { consumeState, takeRun } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    customerId: z.enum(["hanbit", "greenfood", "seum"]),
    note: z.string().max(300).optional(),
  }),
  z.object({
    action: z.literal("resume"),
    state: z.string().max(2_000_000),
    sig: z.string().max(200),
    decisions: z.array(
      z.object({ id: z.string(), approved: z.boolean(), comment: z.string().max(500).optional() }),
    ),
  }),
]);

const friendlyError = describeError;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  const body = parsed.data;

  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: "서버에 GEMINI_API_KEY가 설정되지 않아 라이브 실행을 할 수 없습니다. 녹화된 실행 기록을 확인해 주세요." },
      { status: 503 },
    );
  }

  let state: RunState;
  if (body.action === "start") {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    const gate = takeRun(ip);
    if (!gate.ok) return Response.json({ error: gate.message }, { status: 429 });
    state = initialState(body.customerId, body.note);
  } else {
    try {
      state = verify(body.state, body.sig);
    } catch (err) {
      return Response.json({ error: friendlyError(err) }, { status: 400 });
    }
    if (!consumeState(body.sig)) return Response.json({ error: "이미 처리된 승인 요청입니다." }, { status: 409 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: AgentEvent) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          // 클라이언트 연결이 끊긴 경우
        }
      };
      try {
        if (body.action === "start") emit({ type: "run_started", customerId: state.customerId, model: MODEL });
        else applyDecisions(state, body.decisions, emit);

        const outcome = await runLoop(state, emit, req.signal);
        if (outcome.kind === "paused") {
          const signed = sign(outcome.state);
          emit({ type: "approval_required", pending: outcome.state.pending, ...signed });
        } else {
          emit({
            type: "done",
            reason: outcome.reason,
            turns: outcome.state.turn,
            usage: outcome.state.usage,
            models: outcome.state.modelsUsed,
          });
        }
      } catch (err) {
        emit({ type: "error", message: friendlyError(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
