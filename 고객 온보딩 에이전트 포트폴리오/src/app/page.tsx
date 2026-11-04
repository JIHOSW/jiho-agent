"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PROFILES, type CustomerId } from "@/lib/scenarios";
import { ApprovalPanel, Dots, TOOL_LABELS, Timeline } from "@/components/agent-ui";
import { useAgentRun, type Recording } from "@/components/use-agent-run";

const IDS: CustomerId[] = ["hanbit", "greenfood", "seum"];
const GATED = ["apply_config_change", "send_customer_message", "create_dev_ticket"];
// 정적 시연판(GitHub Pages)은 서버가 없어 녹화본만 재생합니다.
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const DEMO_ONLY = process.env.NEXT_PUBLIC_DEMO_ONLY === "1";
const LIVE_URL = process.env.NEXT_PUBLIC_LIVE_URL ?? "";

export default function Home() {
  const run = useAgentRun();
  const [selected, setSelected] = useState<CustomerId>("hanbit");
  const [note, setNote] = useState("");
  const [replays, setReplays] = useState<Partial<Record<CustomerId, Recording>>>({});
  const endRef = useRef<HTMLDivElement>(null);

  const autoplayed = useRef(false);

  useEffect(() => {
    IDS.forEach((id) =>
      fetch(`${BASE}/replays/${id}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .then((rec: Recording | null) => rec && setReplays((m) => ({ ...m, [id]: rec })))
        .catch(() => {}),
    );
  }, []);

  // ?play=hanbit 처럼 링크로 들어오면 해당 녹화본을 바로 재생합니다(README 바로 보기 링크용).
  useEffect(() => {
    if (autoplayed.current) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("play") as CustomerId | null;
    if (!id || !IDS.includes(id) || !replays[id]) return;
    autoplayed.current = true;
    setSelected(id);
    run.replay(replays[id]!, Number(params.get("speed")) || 2);
  }, [replays, run]);

  useEffect(() => {
    if (run.status === "running" || run.status === "awaiting") endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [run.items, run.status]);

  const busy = run.status === "running" || run.status === "awaiting";
  const toolCount = useMemo(() => run.items.filter((i) => i.kind === "tool").length, [run.items]);
  const approvals = useMemo(() => run.items.filter((i) => i.kind === "tool" && i.decision).length, [run.items]);
  const turns = useMemo(() => run.items.filter((i) => i.kind === "turn").length, [run.items]);
  const active = run.customerId ? PROFILES[run.customerId] : null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <div className="mb-1 font-mono text-sm text-indigo-600">jihodev</div>
        <h1 className="text-2xl font-bold sm:text-3xl">고객 온보딩 에이전트</h1>
        <p className="mt-2 max-w-3xl leading-relaxed text-slate-600">
          새로 배정된 고객사를 맡기면, 에이전트가 <b>스스로 상황을 파악</b>하고 <b>필요한 도구를 골라 실행</b>하며
          <b> 결과를 보고 다음 행동을 정합니다</b>. 고객 환경을 바꾸거나 고객·개발팀에 나가는 행동은 <b>사람이 승인</b>해야 실행됩니다.
          정해진 답이 아니라 LLM(Gemini)이 실시간으로 판단하므로 실행할 때마다 경로가 달라질 수 있습니다.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          고객사, 제품(워크브릿지), 로그, 지식베이스는 모두 시연용 가상 데이터입니다.
        </p>
      </header>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-slate-500">1. 담당할 고객사를 고르세요</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {IDS.map((id) => {
            const p = PROFILES[id];
            const on = selected === id;
            return (
              <button
                key={id}
                disabled={busy}
                onClick={() => setSelected(id)}
                className={`rounded-xl border p-4 text-left transition ${on ? "border-indigo-500 bg-white ring-2 ring-indigo-200" : "border-slate-200 bg-white hover:border-slate-300"} disabled:opacity-60`}
              >
                <div className="font-bold">{p.company}</div>
                <div className="text-sm text-slate-500">{p.industry} · {p.seats.toLocaleString()}명</div>
                <div className="mt-2 inline-block rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700">{p.cardSummary}</div>
                <p className="mt-2 text-sm leading-snug text-slate-600">{p.salesNote}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-500">2. 실행 방식을 고르세요</h2>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-slate-500">매니저 추가 지시 (선택, 300자)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              disabled={busy}
              placeholder="예: 고객이 메일 답장을 늦게 하는 편이니 한 번에 필요한 걸 다 요청해줘"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            {busy ? (
              <button onClick={run.stop} className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white">
                중단
              </button>
            ) : (
              <>
                {DEMO_ONLY ? (
                  LIVE_URL && (
                    <a href={LIVE_URL} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                      ▶ 라이브 실행판으로 이동
                    </a>
                  )
                ) : (
                  <button
                    onClick={() => run.start(selected, note)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                  >
                    ▶ 라이브 실행
                  </button>
                )}
                <button
                  disabled={!replays[selected]}
                  onClick={() => replays[selected] && run.replay(replays[selected]!, 2)}
                  title={replays[selected] ? "실제로 실행했던 기록을 재생합니다 (API 비용 없음)" : "이 고객사의 녹화본이 아직 없습니다"}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  ⏵ 녹화본 보기
                </button>
              </>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {DEMO_ONLY
            ? "이 페이지는 시연판입니다. 서버 없이 실제로 실행했던 기록(녹화본)을 그대로 재생합니다. LLM을 호출하는 라이브 실행은 서버가 있는 배포판에서 할 수 있습니다."
            : "라이브 실행은 LLM API를 실제로 호출합니다(1회 1~3분 소요, 무료 한도 때문에 하루 실행 횟수 제한). 녹화본은 실제 실행 기록을 그대로 재생합니다."}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="min-w-0">
          {run.items.length === 0 && run.status === "idle" ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
              실행하면 에이전트의 판단, 도구 실행, 승인 요청이 여기에 실시간으로 나타납니다.
            </div>
          ) : (
            <>
              {active && (
                <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
                  <span className="font-medium text-slate-800">{active.company}</span>
                  {run.replaying && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs">녹화본 재생</span>}
                  {run.status === "running" && <Dots />}
                </div>
              )}
              <Timeline items={run.items} running={run.status === "running"} />
              {run.status === "awaiting" && run.pending.length > 0 && (
                <div className="mt-4">
                  <ApprovalPanel key={run.pending.map((p) => p.id).join()} pending={run.pending} onSubmit={run.resume} readOnly={run.replaying} />
                </div>
              )}
            </>
          )}
          <div ref={endRef} />
        </section>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="mb-2 font-medium">실행 현황</div>
            <dl className="space-y-1 text-slate-600">
              <Row k="상태" v={{ idle: "대기", running: "실행 중", awaiting: "승인 대기", done: "완료", error: "오류" }[run.status]} />
              <Row k="판단 단계" v={`${turns}`} />
              <Row k="도구 실행" v={`${toolCount}회`} />
              <Row k="사람 결정" v={`${approvals}건`} />
              {run.meta.model && <Row k="모델" v={run.meta.model} />}
              {run.meta.usage && (
                <Row k="토큰" v={`입력 ${(run.meta.usage.input / 1000).toFixed(1)}k · 출력 ${(run.meta.usage.output / 1000).toFixed(1)}k`} />
              )}
            </dl>
            {run.status === "done" && !run.replaying && (
              <button onClick={run.download} className="mt-3 w-full rounded-lg border border-slate-200 py-1.5 text-xs text-slate-600 hover:bg-slate-50">
                실행 기록 내려받기 (녹화본용)
              </button>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <div className="mb-2 font-medium">에이전트가 쓸 수 있는 도구</div>
            <p className="mb-2 text-xs text-slate-500">순서는 정해져 있지 않습니다. 에이전트가 상황에 맞게 고릅니다.</p>
            <ul className="space-y-1">
              {Object.entries(TOOL_LABELS).map(([name, t]) => (
                <li key={name} className="flex items-center gap-2 text-slate-700">
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                  {GATED.includes(name) && <span className="ml-auto rounded bg-amber-100 px-1.5 text-[11px] text-amber-800">승인</span>}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{k}</dt>
      <dd className="truncate text-right text-slate-900">{v}</dd>
    </div>
  );
}
