"use client";

import { useCallback, useRef, useState } from "react";
import type { AgentEvent } from "@/lib/agent";
import type { PendingApproval } from "@/lib/run-state";
import type { CustomerId } from "@/lib/scenarios";

export type Item =
  | { kind: "turn"; turn: number }
  | { kind: "thinking"; text: string }
  | { kind: "text"; text: string }
  | {
      kind: "tool";
      id: string;
      name: string;
      input: unknown;
      gated: boolean;
      result?: unknown;
      isError?: boolean;
      decision?: { approved: boolean; comment?: string };
    }
  | { kind: "report"; report: Report }
  | { kind: "notice"; tone: "error" | "info"; text: string };

export interface Report {
  status: "on_track" | "at_risk" | "blocked";
  summary: string;
  findings: string[];
  actions_taken: string[];
  waiting_on: string[];
  next_steps: string[];
}

export type Status = "idle" | "running" | "awaiting" | "done" | "error";

export interface Decision {
  id: string;
  approved: boolean;
  comment?: string;
}

export interface Recording {
  customerId: CustomerId;
  recordedAt: string;
  events: AgentEvent[];
}

function reduce(items: Item[], e: AgentEvent): Item[] {
  const last = items[items.length - 1];
  switch (e.type) {
    case "turn_started":
      return [...items, { kind: "turn", turn: e.turn }];
    case "thinking_delta":
      if (last?.kind === "thinking") return [...items.slice(0, -1), { ...last, text: last.text + e.text }];
      return [...items, { kind: "thinking", text: e.text }];
    case "text_delta":
      if (last?.kind === "text") return [...items.slice(0, -1), { ...last, text: last.text + e.text }];
      return [...items, { kind: "text", text: e.text }];
    case "tool_call":
      return [...items, { kind: "tool", id: e.id, name: e.name, input: e.input, gated: e.gated }];
    case "tool_result":
      return items.map((it) =>
        it.kind === "tool" && it.id === e.id ? { ...it, result: e.result, isError: e.isError } : it,
      );
    case "approval_decision":
      return items.map((it) =>
        it.kind === "tool" && it.id === e.id ? { ...it, decision: { approved: e.approved, comment: e.comment } } : it,
      );
    case "report":
      return [...items, { kind: "report", report: e.report as Report }];
    case "error":
      return [...items, { kind: "notice", tone: "error", text: e.message }];
    case "done": {
      const reasons: Record<string, string> = {
        report_submitted: "에이전트가 보고서를 제출하고 작업을 마쳤습니다.",
        end_turn: "에이전트가 작업을 마쳤습니다.",
        max_turns: "최대 단계 수에 도달해 실행을 멈췄습니다.",
        refusal: "모델이 요청 처리를 거절해 실행을 멈췄습니다.",
        max_tokens: "응답 길이 한도에 걸려 실행을 멈췄습니다.",
        aborted: "실행이 중단되었습니다.",
      };
      return [...items, { kind: "notice", tone: "info", text: reasons[e.reason] ?? `종료: ${e.reason}` }];
    }
    default:
      return items;
  }
}

export function useAgentRun() {
  const [items, setItems] = useState<Item[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [pending, setPending] = useState<PendingApproval[]>([]);
  const [meta, setMeta] = useState<{ model?: string; turns?: number; usage?: { input: number; output: number; cacheRead: number } }>({});
  const [customerId, setCustomerId] = useState<CustomerId | null>(null);
  const [replaying, setReplaying] = useState(false);
  const resumeRef = useRef<{ state: string; sig: string } | null>(null);
  const eventsRef = useRef<AgentEvent[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const handle = useCallback((e: AgentEvent, record: boolean) => {
    if (record) {
      // 녹화본에는 서명된 상태값을 남기지 않습니다.
      eventsRef.current.push(e.type === "approval_required" ? { ...e, state: "", sig: "" } : e);
    }
    setItems((prev) => reduce(prev, e));
    if (e.type === "run_started") setMeta((m) => ({ ...m, model: e.model }));
    if (e.type === "approval_required") {
      resumeRef.current = { state: e.state, sig: e.sig };
      setPending(e.pending);
      setStatus("awaiting");
    }
    if (e.type === "done") {
      setMeta((m) => ({ ...m, turns: e.turns, usage: e.usage, model: e.models?.length ? e.models.join(", ") : m.model }));
      setStatus("done");
    }
    if (e.type === "error") setStatus("error");
  }, []);

  const consume = useCallback(
    async (body: unknown) => {
      abortRef.current = new AbortController();
      setStatus("running");
      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: abortRef.current.signal,
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          handle({ type: "error", message: data.error ?? `HTTP ${res.status}` }, false);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (line) handle(JSON.parse(line) as AgentEvent, true);
          }
        }
        setStatus((s) => (s === "running" ? "done" : s));
      } catch (err) {
        if ((err as Error).name === "AbortError") {
          handle({ type: "done", reason: "aborted", turns: 0, usage: { input: 0, output: 0, cacheRead: 0 } }, true);
        } else {
          handle({ type: "error", message: `연결 오류: ${(err as Error).message}` }, false);
        }
      }
    },
    [handle],
  );

  const reset = useCallback((id: CustomerId | null) => {
    abortRef.current?.abort();
    setItems([]);
    setPending([]);
    setMeta({});
    setStatus("idle");
    setReplaying(false);
    setCustomerId(id);
    resumeRef.current = null;
    eventsRef.current = [];
  }, []);

  const start = useCallback(
    (id: CustomerId, note?: string) => {
      reset(id);
      void consume({ action: "start", customerId: id, note: note || undefined });
    },
    [consume, reset],
  );

  const resume = useCallback(
    (decisions: Decision[]) => {
      const r = resumeRef.current;
      if (!r) return;
      resumeRef.current = null;
      setPending([]);
      void consume({ action: "resume", state: r.state, sig: r.sig, decisions });
    },
    [consume],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  const replay = useCallback(
    async (rec: Recording, speed = 1) => {
      reset(rec.customerId);
      setReplaying(true);
      setStatus("running");
      const ac = new AbortController();
      abortRef.current = ac;
      for (const e of rec.events) {
        if (ac.signal.aborted) return;
        if (e.type === "approval_required") {
          setPending(e.pending);
          setStatus("awaiting");
          await new Promise((r) => setTimeout(r, 2200 / speed));
          setPending([]);
          setStatus("running");
          continue;
        }
        const delay =
          e.type === "thinking_delta" || e.type === "text_delta" ? 18 : e.type === "tool_result" ? 500 : e.type === "turn_started" ? 300 : 250;
        await new Promise((r) => setTimeout(r, delay / speed));
        if (ac.signal.aborted) return;
        handle(e, false);
      }
      setStatus((s) => (s === "running" ? "done" : s));
    },
    [handle, reset],
  );

  const download = useCallback(() => {
    if (!customerId) return;
    const rec: Recording = { customerId, recordedAt: new Date().toISOString(), events: eventsRef.current };
    const blob = new Blob([JSON.stringify(rec, null, 1)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${customerId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [customerId]);

  return { items, status, pending, meta, customerId, replaying, start, resume, stop, replay, reset, download };
}
