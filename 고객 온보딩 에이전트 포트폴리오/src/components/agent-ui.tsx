"use client";

import { useState } from "react";
import type { Decision, Item, Report } from "./use-agent-run";
import type { PendingApproval } from "@/lib/run-state";

export const TOOL_LABELS: Record<string, { label: string; icon: string }> = {
  get_customer_profile: { label: "고객 프로필 조회", icon: "👤" },
  run_setup_diagnostics: { label: "설정 진단", icon: "🩺" },
  run_integration_test: { label: "연동 테스트", icon: "🔌" },
  search_logs: { label: "로그 조회", icon: "📜" },
  search_knowledge_base: { label: "지식베이스 검색", icon: "📚" },
  analyze_usage: { label: "사용 데이터 분석", icon: "📊" },
  apply_config_change: { label: "고객 설정 변경", icon: "⚙️" },
  send_customer_message: { label: "고객 메일 발송", icon: "✉️" },
  check_customer_replies: { label: "고객 회신 확인", icon: "📥" },
  create_dev_ticket: { label: "개발 이슈 등록", icon: "🐞" },
  create_training_plan: { label: "교육 계획 수립", icon: "🎓" },
  set_first_value_milestone: { label: "첫 활용 목표 등록", icon: "🎯" },
  submit_onboarding_report: { label: "온보딩 보고서 제출", icon: "📝" },
};

const label = (name: string) => TOOL_LABELS[name] ?? { label: name, icon: "🔧" };

type Rec = Record<string, unknown>;
const asRec = (v: unknown): Rec => (v && typeof v === "object" ? (v as Rec) : {});
const str = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));

// ───────────── 도구 입력을 사람이 읽기 쉬운 형태로 ─────────────

export function ToolInput({ name, input }: { name: string; input: unknown }) {
  const a = asRec(input);
  if (name === "send_customer_message") {
    return (
      <div className="rounded-lg border border-slate-200 bg-white text-sm">
        <div className="border-b border-slate-100 px-3 py-2 text-slate-500">
          <div>받는 사람: <span className="text-slate-800">{str(a.to)}</span></div>
          <div>제목: <span className="font-medium text-slate-800">{str(a.subject)}</span></div>
        </div>
        <p className="whitespace-pre-wrap px-3 py-2 leading-relaxed text-slate-800">{str(a.body)}</p>
      </div>
    );
  }
  if (name === "create_dev_ticket") {
    return (
      <div className="space-y-1.5 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <div className="font-medium">
          <span className="mr-2 rounded bg-rose-100 px-1.5 py-0.5 text-xs text-rose-700">{str(a.severity)}</span>
          {str(a.title)}
        </div>
        <Field k="재현 절차">
          <ol className="list-decimal pl-5">{(a.repro_steps as string[] | undefined)?.map((s, i) => <li key={i}>{s}</li>)}</ol>
        </Field>
        <Field k="기대 결과">{str(a.expected)}</Field>
        <Field k="실제 결과">{str(a.actual)}</Field>
        <Field k="근거"><code className="font-mono text-xs break-all">{str(a.evidence)}</code></Field>
        <Field k="고객 영향">{str(a.customer_impact)}</Field>
        <Field k="임시 우회책">{str(a.workaround)}</Field>
      </div>
    );
  }
  if (name === "create_training_plan") {
    const sessions = (a.sessions as { title: string; duration_min: number; agenda: string[] }[] | undefined) ?? [];
    return (
      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <Field k="대상">{str(a.audience)}</Field>
        <Field k="목표">{str(a.goal)}</Field>
        <Field k="근거">{str(a.why_this_audience)}</Field>
        {sessions.map((s, i) => (
          <div key={i} className="rounded-md bg-slate-50 p-2">
            <div className="font-medium">{s.title} <span className="text-slate-500">· {s.duration_min}분</span></div>
            <ul className="mt-1 list-disc pl-5 text-slate-700">{s.agenda?.map((x, j) => <li key={j}>{x}</li>)}</ul>
          </div>
        ))}
      </div>
    );
  }
  if (name === "submit_onboarding_report") return null;
  const entries = Object.entries(a);
  if (!entries.length) return null;
  return (
    <div className="space-y-1 text-sm">
      {entries.map(([k, v]) => (
        <Field key={k} k={k}>{str(v)}</Field>
      ))}
    </div>
  );
}

function Field({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-slate-500">{k}</span>
      <div className="min-w-0 flex-1 text-slate-800">{children}</div>
    </div>
  );
}

// ───────────── 타임라인 ─────────────

function ThinkingBlock({ text, live }: { text: string; live: boolean }) {
  // 모델이 내부 추론 요약을 영어로 내놓는 경우가 많아 기본은 접어둡니다. 한국어 설명은 바로 아래 본문에 나옵니다.
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 text-left text-xs font-medium text-violet-700">
        <span>💭 모델 내부 추론 요약 (원문)</span>
        {live && <Dots />}
        <span className="ml-auto text-violet-400">{open ? "접기" : "펼치기"}</span>
      </button>
      {open && <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-violet-950/80">{text.trim()}</p>}
    </div>
  );
}

function ToolCard({ item }: { item: Extract<Item, { kind: "tool" }> }) {
  const { label: l, icon } = label(item.name);
  const waiting = item.gated && !item.decision && item.result === undefined;
  const rejected = item.decision && !item.decision.approved;
  const border = waiting
    ? "border-amber-300 bg-amber-50"
    : rejected
      ? "border-slate-300 bg-slate-50"
      : item.isError
        ? "border-rose-300 bg-rose-50"
        : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border ${border} p-3 shadow-sm`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="font-medium">{l}</span>
        <code className="font-mono text-xs text-slate-400">{item.name}</code>
        {item.gated && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">사람 승인 필요</span>
        )}
        {item.decision && (
          <span className={`rounded-full px-2 py-0.5 text-xs ${item.decision.approved ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}>
            {item.decision.approved ? "승인됨" : "거절됨"}
          </span>
        )}
        {item.result === undefined && !waiting && <Dots />}
      </div>
      <ToolInput name={item.name} input={item.input} />
      {item.decision?.comment && (
        <p className="mt-2 text-sm text-slate-600">승인자 의견: {item.decision.comment}</p>
      )}
      {item.result !== undefined && item.name !== "submit_onboarding_report" && (
        <details className="mt-2 group">
          <summary className="cursor-pointer text-xs text-slate-500 select-none">
            {item.isError ? "⚠️ 오류 결과" : "실행 결과"} 보기
          </summary>
          <pre className="mt-1 max-h-72 overflow-auto rounded-md bg-slate-900 p-2 font-mono text-xs leading-relaxed text-slate-100 whitespace-pre-wrap break-all">
            {JSON.stringify(item.result, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export function Timeline({ items, running }: { items: Item[]; running: boolean }) {
  return (
    <ol className="space-y-3">
      {items.map((it, i) => {
        const isLast = i === items.length - 1;
        if (it.kind === "turn")
          return (
            <li key={i} className="flex items-center gap-2 pt-2 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span>{it.turn}단계</span>
              <span className="h-px flex-1 bg-slate-200" />
            </li>
          );
        if (it.kind === "thinking")
          return <li key={i}><ThinkingBlock text={it.text} live={running && isLast} /></li>;
        if (it.kind === "text")
          return (
            <li key={i} className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">
              {it.text.trim()}
            </li>
          );
        if (it.kind === "tool") return <li key={i}><ToolCard item={it} /></li>;
        if (it.kind === "report") return <li key={i}><ReportCard report={it.report} /></li>;
        return (
          <li
            key={i}
            className={`rounded-lg px-3 py-2 text-sm ${it.tone === "error" ? "bg-rose-50 text-rose-800" : "bg-slate-100 text-slate-700"}`}
          >
            {it.text}
          </li>
        );
      })}
      {running && items[items.length - 1]?.kind === "turn" && (
        <li className="flex items-center gap-2 text-sm text-slate-500"><Dots /> 다음 행동을 결정하는 중</li>
      )}
    </ol>
  );
}

export function Dots() {
  return (
    <span className="inline-flex gap-0.5" aria-label="진행 중">
      <span className="dot h-1.5 w-1.5 rounded-full bg-current" />
      <span className="dot h-1.5 w-1.5 rounded-full bg-current" />
      <span className="dot h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}

// ───────────── 승인 패널 ─────────────

export function ApprovalPanel({
  pending,
  onSubmit,
  readOnly,
}: {
  pending: PendingApproval[];
  onSubmit: (d: Decision[]) => void;
  readOnly?: boolean;
}) {
  const [choices, setChoices] = useState<Record<string, { approved?: boolean; comment: string }>>({});
  const allDecided = pending.every((p) => choices[p.id]?.approved !== undefined);
  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 shadow-lg">
      <div className="mb-1 font-bold text-amber-900">✋ 담당 매니저 승인이 필요합니다</div>
      <p className="mb-3 text-sm text-amber-900/80">
        에이전트가 고객 환경을 바꾸거나 외부로 나가는 행동을 하려고 합니다. 내용을 검토하고 승인 또는 거절해 주세요.
        거절하면 에이전트가 사유를 반영해 다른 방법을 찾습니다.
      </p>
      <div className="space-y-3">
        {pending.map((p) => {
          const c = choices[p.id] ?? { comment: "" };
          const set = (patch: Partial<typeof c>) => setChoices({ ...choices, [p.id]: { ...c, ...patch } });
          return (
            <div key={p.id} className="rounded-xl border border-amber-200 bg-white p-3">
              <div className="mb-2 font-medium">{label(p.name).icon} {label(p.name).label}</div>
              <ToolInput name={p.name} input={p.input} />
              {!readOnly && (
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex gap-2">
                    <button
                      onClick={() => set({ approved: true })}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${c.approved === true ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}
                    >
                      승인
                    </button>
                    <button
                      onClick={() => set({ approved: false })}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${c.approved === false ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                    >
                      거절
                    </button>
                  </div>
                  <input
                    value={c.comment}
                    onChange={(e) => set({ comment: e.target.value })}
                    maxLength={500}
                    placeholder={c.approved === false ? "거절 사유 (에이전트에게 전달됩니다)" : "의견 (선택)"}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {readOnly ? (
        <p className="mt-3 text-sm text-amber-900/70">녹화본에서는 당시 승인자의 결정이 이어서 재생됩니다.</p>
      ) : (
        <button
          disabled={!allDecided}
          onClick={() =>
            onSubmit(pending.map((p) => ({ id: p.id, approved: !!choices[p.id]?.approved, comment: choices[p.id]?.comment || undefined })))
          }
          className="mt-3 w-full rounded-lg bg-amber-600 py-2 font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          결정 전달하고 에이전트 계속 실행
        </button>
      )}
    </div>
  );
}

// ───────────── 보고서 ─────────────

const STATUS: Record<Report["status"], { text: string; cls: string }> = {
  on_track: { text: "정상 진행", cls: "bg-emerald-100 text-emerald-800" },
  at_risk: { text: "위험 있음", cls: "bg-amber-100 text-amber-800" },
  blocked: { text: "진행 막힘", cls: "bg-rose-100 text-rose-800" },
};

export function ReportCard({ report }: { report: Report }) {
  const s = STATUS[report.status] ?? STATUS.at_risk;
  const sections: [string, string[]][] = [
    ["발견한 사실", report.findings],
    ["실행한 조치", report.actions_taken],
    ["기다리는 일", report.waiting_on],
    ["다음 단계", report.next_steps],
  ];
  return (
    <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-md">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">📝</span>
        <span className="font-bold">온보딩 보고서</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.text}</span>
      </div>
      <p className="mb-3 leading-relaxed text-slate-800">{report.summary}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {sections.map(([title, list]) =>
          list?.length ? (
            <div key={title} className="rounded-lg bg-slate-50 p-3">
              <div className="mb-1 text-xs font-medium text-slate-500">{title}</div>
              <ul className="list-disc space-y-1 pl-4 text-sm text-slate-800">
                {list.map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
