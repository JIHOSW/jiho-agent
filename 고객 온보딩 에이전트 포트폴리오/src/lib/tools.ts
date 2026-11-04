import { z } from "zod";
import {
  PROFILES,
  TODAY,
  buildLogs,
  orgImportResult,
  simulateReply,
  ssoResult,
  type EnvState,
} from "./scenarios";
import { KNOWLEDGE_BASE } from "./knowledge-base";

// 모델 제공사와 무관한 도구 정의 (JSON Schema). agent.ts에서 모델 API 형식으로 변환합니다.
interface Tool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

// 사람이 승인해야 실행되는 도구: 고객 환경을 바꾸거나, 회사 밖/다른 팀으로 나가는 행동
export const GATED_TOOLS = new Set(["apply_config_change", "send_customer_message", "create_dev_ticket"]);
export const REPORT_TOOL = "submit_onboarding_report";

const schemas = {
  get_customer_profile: z.object({}),
  run_setup_diagnostics: z.object({}),
  run_integration_test: z.object({ target: z.enum(["sso", "org_import", "mobile_login"]) }),
  search_logs: z.object({ keyword: z.string().optional() }),
  search_knowledge_base: z.object({ query: z.string().min(1) }),
  analyze_usage: z.object({}),
  apply_config_change: z.object({
    change: z.enum(["org_import.encoding", "accounts.bulk_unlock", "approval.add_template"]),
    value: z.string(),
    reason: z.string(),
  }),
  send_customer_message: z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
  }),
  check_customer_replies: z.object({}),
  create_dev_ticket: z.object({
    title: z.string(),
    severity: z.enum(["blocker", "major", "minor"]),
    repro_steps: z.array(z.string()),
    expected: z.string(),
    actual: z.string(),
    evidence: z.string(),
    customer_impact: z.string(),
    workaround: z.string(),
  }),
  create_training_plan: z.object({
    audience: z.string(),
    goal: z.string(),
    sessions: z.array(
      z.object({ title: z.string(), duration_min: z.number(), agenda: z.array(z.string()) }),
    ),
    why_this_audience: z.string(),
  }),
  set_first_value_milestone: z.object({
    milestone: z.string(),
    success_metric: z.string(),
    target_date: z.string(),
  }),
  submit_onboarding_report: z.object({
    status: z.enum(["on_track", "at_risk", "blocked"]),
    summary: z.string(),
    findings: z.array(z.string()),
    actions_taken: z.array(z.string()),
    waiting_on: z.array(z.string()),
    next_steps: z.array(z.string()),
  }),
} as const;

export type ToolName = keyof typeof schemas;

export const TOOLS: Tool[] = [
  {
    name: "get_customer_profile",
    description:
      "담당 고객사의 계약 정보, 도입 목표, 요구사항, 담당자 연락처, 영업 메모, 오픈 예정일을 조회합니다. 온보딩을 시작할 때 가장 먼저 상황 파악용으로 사용하세요.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "run_setup_diagnostics",
    description:
      "고객사 테넌트의 초기 설정 상태(SSO, 조직도 가져오기, 계정 상태, 전자결재 양식, 모바일 접속)를 한 번에 점검합니다. 항목별 pass/warn/fail/partial/skip 상태와 오류 코드를 돌려줍니다.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "run_integration_test",
    description:
      "특정 연동을 실제로 다시 실행해 지금 동작하는지 확인합니다. 조치 후 해결됐는지 검증할 때 사용하세요. target: sso(테스트 계정 SSO 로그인), org_import(조직도 가져오기 재실행), mobile_login(현장 계정 모바일 로그인).",
    input_schema: {
      type: "object",
      properties: { target: { type: "string", enum: ["sso", "org_import", "mobile_login"] } },
      required: ["target"],
      additionalProperties: false,
    },
  },
  {
    name: "search_logs",
    description:
      "고객사 테넌트의 최근 시스템 로그를 조회합니다. keyword를 주면 해당 단어(오류 코드, 모듈명 등)가 포함된 줄만 돌려줍니다. 진단에서 이상이 보이면 원인을 찾기 위해 사용하세요.",
    input_schema: {
      type: "object",
      properties: { keyword: { type: "string", description: "예: SAML, org.import, ACCOUNT_LOCKED" } },
      additionalProperties: false,
    },
  },
  {
    name: "search_knowledge_base",
    description:
      "사내 기술 지식베이스(해결 가이드, 설정 방법, 교육 가이드)를 검색합니다. 오류 코드나 증상, 주제어로 검색하세요. 결과가 없으면 알려진 해결책이 없다는 뜻입니다.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
      additionalProperties: false,
    },
  },
  {
    name: "analyze_usage",
    description:
      "고객사의 역할별 주간 활성 사용률, 모바일 앱 설치율, 기능별 최근 7일 사용 건수를 조회합니다. 교육 대상과 첫 활용 목표를 정할 때 근거로 사용하세요.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "apply_config_change",
    description:
      "[사람 승인 필요] 운영 관리 콘솔에서 고객사 테넌트 설정을 대신 변경합니다. 고객 환경을 바꾸므로 담당 매니저 승인 후 실행됩니다. change: org_import.encoding(조직도 가져오기 인코딩, value: utf-8|euc-kr), accounts.bulk_unlock(잠긴 계정 일괄 해제 및 비밀번호 재설정 링크 발송, value: 대상 설명), approval.add_template(전자결재 양식 추가, value: 양식 이름). 고객 IdP 등 고객사 시스템의 설정은 이 도구로 바꿀 수 없습니다.",
    input_schema: {
      type: "object",
      properties: {
        change: { type: "string", enum: ["org_import.encoding", "accounts.bulk_unlock", "approval.add_template"] },
        value: { type: "string" },
        reason: { type: "string", description: "승인자가 판단할 수 있도록 근거(로그, KB 문서 번호)를 포함한 변경 사유" },
      },
      required: ["change", "value", "reason"],
      additionalProperties: false,
    },
  },
  {
    name: "send_customer_message",
    description:
      "[사람 승인 필요] 고객사 담당자에게 이메일을 보냅니다. 승인자가 내용을 검토한 뒤 발송됩니다. 고객이 직접 해야 하는 조치는 정확한 설정 항목과 값을 적어야 고객이 실행할 수 있습니다. to에는 고객 프로필의 담당자 이메일을 쓰세요.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["to", "subject", "body"],
      additionalProperties: false,
    },
  },
  {
    name: "check_customer_replies",
    description: "보낸 메일에 대한 고객 회신을 확인합니다. 고객에게 조치를 요청한 뒤 결과를 확인할 때 사용하세요.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "create_dev_ticket",
    description:
      "[사람 승인 필요] 지식베이스로 해결되지 않는 제품 결함을 개발팀에 이슈로 등록합니다. 개발자가 바로 재현할 수 있도록 재현 절차, 기대 결과, 실제 결과, 로그 근거, 고객 영향, 임시 우회책을 구체적으로 작성하세요.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        severity: { type: "string", enum: ["blocker", "major", "minor"] },
        repro_steps: { type: "array", items: { type: "string" } },
        expected: { type: "string" },
        actual: { type: "string" },
        evidence: { type: "string", description: "로그 줄, 오류 코드 등" },
        customer_impact: { type: "string" },
        workaround: { type: "string" },
      },
      required: ["title", "severity", "repro_steps", "expected", "actual", "evidence", "customer_impact", "workaround"],
      additionalProperties: false,
    },
  },
  {
    name: "create_training_plan",
    description:
      "특정 대상자 그룹을 위한 교육 계획을 만들어 고객사 온보딩 기록에 저장합니다. 사용 데이터와 고객 제약(시간, 장소, 기기)에 맞춰 짧고 실습 중심으로 설계하세요.",
    input_schema: {
      type: "object",
      properties: {
        audience: { type: "string" },
        goal: { type: "string", description: "교육이 끝나면 대상자가 할 수 있어야 하는 것" },
        sessions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              duration_min: { type: "number" },
              agenda: { type: "array", items: { type: "string" } },
            },
            required: ["title", "duration_min", "agenda"],
            additionalProperties: false,
          },
        },
        why_this_audience: { type: "string", description: "이 대상을 고른 데이터 근거" },
      },
      required: ["audience", "goal", "sessions", "why_this_audience"],
      additionalProperties: false,
    },
  },
  {
    name: "set_first_value_milestone",
    description:
      "고객이 제품의 가치를 처음 체감하는 '첫 활용' 목표를 측정 가능한 지표와 날짜로 등록합니다.",
    input_schema: {
      type: "object",
      properties: {
        milestone: { type: "string" },
        success_metric: { type: "string" },
        target_date: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["milestone", "success_metric", "target_date"],
      additionalProperties: false,
    },
  },
  {
    name: "submit_onboarding_report",
    description:
      "온보딩 작업을 마칠 때 반드시 마지막에 한 번 호출해 담당 매니저에게 결과 보고서를 제출합니다. 승인이 거절된 조치나 아직 고객·개발팀을 기다리는 일은 waiting_on에 적으세요.",
    input_schema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["on_track", "at_risk", "blocked"] },
        summary: { type: "string" },
        findings: { type: "array", items: { type: "string" } },
        actions_taken: { type: "array", items: { type: "string" } },
        waiting_on: { type: "array", items: { type: "string" } },
        next_steps: { type: "array", items: { type: "string" } },
      },
      required: ["status", "summary", "findings", "actions_taken", "waiting_on", "next_steps"],
      additionalProperties: false,
    },
  },
];

export function validateToolInput(name: string, input: unknown) {
  const schema = (schemas as Record<string, z.ZodType>)[name];
  if (!schema) return { ok: false as const, error: `알 수 없는 도구: ${name}` };
  const parsed = schema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false as const, error: `입력 형식 오류: ${parsed.error.message}` };
  return { ok: true as const, data: parsed.data };
}

// 도구 실행. 반환값은 JSON으로 직렬화되어 모델에 전달됩니다.
export function executeTool(env: EnvState, name: string, input: unknown, turn: number): unknown {
  const v = validateToolInput(name, input);
  if (!v.ok) throw new Error(v.error);
  const args = v.data as Record<string, unknown>;
  const profile = PROFILES[env.customerId];

  switch (name as ToolName) {
    case "get_customer_profile": {
      const { cardSummary: _omit, ...rest } = profile;
      void _omit;
      return { ...rest, today: TODAY };
    }

    case "run_setup_diagnostics": {
      const sso = ssoResult(env);
      const org = orgImportResult(env);
      const checks: Record<string, { status: string; code?: string; detail: string }> = {};
      if (!sso) checks.sso = { status: "skip", detail: "SSO 미계약" };
      else if (!sso.acsOk) checks.sso = { status: "fail", code: "SAML_RESPONSE_INVALID", detail: "테스트 계정 SSO 로그인 실패" };
      else if (sso.certExpiresInDays <= 14)
        checks.sso = { status: "warn", code: "CERT_EXPIRING", detail: `로그인 정상. IdP 인증서 ${sso.certExpiresInDays}일 후 만료` };
      else checks.sso = { status: "pass", detail: "테스트 계정 SSO 로그인 정상" };

      if (org) {
        const failed = org.total - org.imported;
        checks.org_import = failed
          ? { status: "partial", code: "IMPORT_ROWS_FAILED", detail: `${org.total}명 중 ${org.imported}명 등록, ${failed}명 실패` }
          : { status: "pass", detail: `${org.total}명 전원 등록` };
      }
      checks.accounts = env.accounts.lockedFieldAccounts
        ? { status: "warn", code: "ACCOUNT_LOCKED", detail: `잠긴 계정 ${env.accounts.lockedFieldAccounts}개` }
        : { status: "pass", detail: "잠긴 계정 없음" };
      checks.approval_templates = { status: "pass", detail: `등록된 결재 양식: ${env.approval.templates.join(", ")}` };
      checks.mobile = { status: "pass", detail: "모바일 앱 서버 접속 정상" };
      return { tenant: `${env.customerId}.workbridge.app`, checked_at: TODAY, checks };
    }

    case "run_integration_test": {
      const target = args.target as string;
      if (target === "sso") {
        const sso = ssoResult(env);
        if (!sso) return { target, result: "skip", detail: "SSO 미계약 고객" };
        const warnings =
          sso.certExpiresInDays <= 14
            ? [`CERT_EXPIRING: IdP 서명 인증서 ${sso.certExpiresInDays}일 후 만료 예정. 만료되면 전 사용자 SSO 로그인 중단`]
            : [];
        return sso.acsOk
          ? { target, result: "success", detail: "테스트 계정 SSO 로그인 성공", cert_days_left: sso.certExpiresInDays, warnings }
          : { target, result: "failed", error: "SAML_RESPONSE_INVALID", detail: "IdP가 보낸 SAML 응답의 Destination이 서비스 ACS URL과 다름" };
      }
      if (target === "org_import") {
        const org = orgImportResult(env);
        if (!org) return { target, result: "skip" };
        const failures: string[] = [];
        if (org.encodingFailed) failures.push(`ENCODING_MISMATCH ${org.encodingFailed}행`);
        if (org.parenFailed) failures.push(`HTTP 500 ${org.parenFailed}행 (부서명 예: 생산1팀(음성공장))`);
        return {
          target,
          result: failures.length ? "partial" : "success",
          imported: org.imported,
          total: org.total,
          import_encoding: env.orgImport.importEncoding,
          failures,
        };
      }
      // mobile_login
      return env.accounts.lockedFieldAccounts
        ? { target, result: "failed", detail: `현장 작업반장 샘플 계정 로그인 실패: ACCOUNT_LOCKED (잠긴 계정 ${env.accounts.lockedFieldAccounts}개)` }
        : { target, result: "success", detail: "현장 샘플 계정 모바일 로그인 성공" };
    }

    case "search_logs": {
      const kw = (args.keyword as string | undefined)?.toLowerCase();
      const logs = buildLogs(env);
      const lines = kw ? logs.filter((l) => l.toLowerCase().includes(kw)) : logs;
      return { count: lines.length, lines: lines.slice(0, 15) };
    }

    case "search_knowledge_base": {
      const q = (args.query as string).toLowerCase();
      const terms = q.split(/[\s,/]+/).filter((t) => t.length >= 2);
      // 제목·키워드에 하나 이상 걸린 문서만 돌려줍니다(본문 우연 일치로 엉뚱한 문서가 나오지 않게).
      const scored = KNOWLEDGE_BASE.map((a) => {
        const head = `${a.id} ${a.title} ${a.keywords.join(" ")}`.toLowerCase();
        const body = a.body.toLowerCase();
        const headHits = terms.filter((t) => head.includes(t)).length;
        const bodyHits = terms.filter((t) => body.includes(t)).length;
        return { a, headHits, score: headHits * 2 + bodyHits };
      })
        .filter((x) => x.headHits > 0)
        .sort((x, y) => y.score - x.score)
        .slice(0, 3);
      if (!scored.length) return { results: [], note: "일치하는 문서가 없습니다." };
      return { results: scored.map(({ a }) => ({ id: a.id, title: a.title, body: a.body })) };
    }

    case "analyze_usage": {
      const u = env.usage;
      return {
        go_live: profile.goLiveDate,
        days_since_go_live: u.daysSinceGoLive,
        roles: u.roles.map((r) => ({
          role: r.role,
          headcount: r.headcount,
          weekly_active_rate: `${Math.round(r.weeklyActiveRate * 100)}%`,
          mobile_install_rate: `${Math.round(r.mobileInstallRate * 100)}%`,
        })),
        feature_usage_last_7_days: u.featureUsage,
      };
    }

    case "apply_config_change": {
      const change = args.change as string;
      const value = args.value as string;
      env.configChanges.push({ change, value, reason: args.reason as string });
      if (change === "org_import.encoding") {
        const enc = value.toLowerCase().includes("euc") ? "euc-kr" : "utf-8";
        env.orgImport.importEncoding = enc;
        return { applied: true, change, value: enc, note: "다음 가져오기 실행부터 적용됩니다." };
      }
      if (change === "accounts.bulk_unlock") {
        const n = env.accounts.lockedFieldAccounts;
        env.accounts.lockedFieldAccounts = 0;
        return { applied: true, change, unlocked: n, note: `${n}개 계정 잠금 해제, 비밀번호 재설정 문자 발송됨` };
      }
      env.approval.templates.push(value);
      return { applied: true, change, templates: env.approval.templates };
    }

    case "send_customer_message": {
      const to = args.to as string;
      const known = profile.contacts.some((c) => c.email === to);
      if (!known) throw new Error(`등록된 고객 담당자 이메일이 아닙니다: ${to}`);
      const msg = { to, subject: args.subject as string, body: args.body as string, sentAtTurn: turn };
      env.outbox.push(msg);
      env.pendingReplies.push(simulateReply(env, msg));
      return { sent: true, to, note: "발송 완료. 회신은 check_customer_replies로 확인하세요." };
    }

    case "check_customer_replies": {
      const replies = env.pendingReplies.splice(0);
      env.deliveredReplies.push(...replies);
      return replies.length ? { new_replies: replies } : { new_replies: [], note: "새 회신 없음" };
    }

    case "create_dev_ticket": {
      const id = `WB-${4800 + env.tickets.length + 17}`;
      env.tickets.push({ id, title: args.title as string, severity: args.severity as string });
      return {
        created: true,
        ticket_id: id,
        assignee: "조직도 모듈 담당 개발자",
        status: "접수됨",
        dev_comment: "재현 절차 확인했습니다. 부서 경로 파서 수정 건으로 11/12 정기 배포에 포함 예정입니다.",
      };
    }

    case "create_training_plan": {
      const id = `TP-${env.trainingPlans.length + 1}`;
      env.trainingPlans.push({ id, audience: args.audience as string, goal: args.goal as string });
      return { saved: true, plan_id: id };
    }

    case "set_first_value_milestone": {
      env.milestone = {
        milestone: args.milestone as string,
        metric: args.success_metric as string,
        targetDate: args.target_date as string,
      };
      return { saved: true, milestone: env.milestone };
    }

    case "submit_onboarding_report": {
      // 제출 체크리스트: 첫 활용 목표와 교육 계획이 없으면 첫 제출은 반려합니다(사유를 적어 다시 내면 접수).
      env.reportAttempts = (env.reportAttempts ?? 0) + 1;
      const missing = [
        !env.milestone && "첫 활용 목표(set_first_value_milestone)",
        env.trainingPlans.length === 0 && "교육 계획(create_training_plan)",
      ].filter(Boolean);
      if (missing.length && env.reportAttempts === 1) {
        throw new Error(
          `보고서 반려: ${missing.join(", ")}이(가) 없습니다. 기술 문제 해결만으로는 온보딩이 끝나지 않습니다. 준비하고 다시 제출하거나, 지금 세울 수 없는 이유가 있다면 waiting_on에 적어 다시 제출하세요.`,
        );
      }
      return { submitted: true };
    }
  }
}
