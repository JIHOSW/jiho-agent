// 가상 SaaS "워크브릿지(WorkBridge)"의 고객사 온보딩 환경.
// 실제 회사·제품과 무관한 가상 데이터입니다.
// 에이전트의 도구는 이 상태를 읽고, 승인된 조치는 이 상태를 바꿉니다.

export type CheckStatus = "pass" | "warn" | "fail" | "partial" | "skip";

export interface Contact {
  name: string;
  role: string;
  email: string;
}

export interface RoleUsage {
  role: string;
  headcount: number;
  weeklyActiveRate: number; // 0~1
  mobileInstallRate: number; // 0~1
}

export interface SentMessage {
  to: string;
  subject: string;
  body: string;
  sentAtTurn: number;
}

export interface CustomerReply {
  from: string;
  subject: string;
  body: string;
}

export interface EnvState {
  customerId: CustomerId;
  sso: {
    contracted: boolean;
    expectedAcsUrl: string;
    acsUrlOnIdp: string;
    certExpiresInDays: number;
  };
  orgImport: {
    totalRows: number;
    fileEncoding: "utf-8" | "euc-kr";
    importEncoding: "utf-8" | "euc-kr";
    encodingRows: number; // 인코딩이 맞지 않으면 실패하는 행 수
    parenRows: number; // 부서명에 괄호가 있는 행 (제품 버그로 500 오류)
    parenRenamedByCustomer: boolean;
  };
  accounts: {
    lockedFieldAccounts: number;
  };
  approval: {
    templates: string[];
  };
  usage: {
    daysSinceGoLive: number; // 음수면 오픈 전
    roles: RoleUsage[];
    featureUsage: Record<string, number>; // 최근 7일 사용 건수
  };
  outbox: SentMessage[];
  pendingReplies: CustomerReply[];
  deliveredReplies: CustomerReply[];
  configChanges: { change: string; value: string; reason: string }[];
  tickets: { id: string; title: string; severity: string }[];
  trainingPlans: { id: string; audience: string; goal: string }[];
  milestone: { milestone: string; metric: string; targetDate: string } | null;
  reportAttempts?: number;
}

export type CustomerId = "hanbit" | "greenfood" | "seum";

export interface CustomerProfile {
  id: CustomerId;
  company: string;
  industry: string;
  plan: string;
  seats: number;
  contractDate: string;
  goLiveDate: string;
  goals: string[];
  requirements: string[];
  contacts: Contact[];
  salesNote: string;
  // UI 카드용 요약 (에이전트에는 보내지 않음)
  cardSummary: string;
}

export const TODAY = "2026-11-04";

export const PROFILES: Record<CustomerId, CustomerProfile> = {
  hanbit: {
    id: "hanbit",
    company: "한빛물류 (가상)",
    industry: "물류·창고 운영",
    plan: "Business",
    seats: 1240,
    contractDate: "2026-10-01",
    goLiveDate: "2026-11-10",
    goals: [
      "사내 계정(Azure AD)으로 한 번에 로그인(SSO)",
      "11월 10일 전 직원 오픈",
      "배차 변경 요청을 전자결재로 처리",
    ],
    requirements: ["SAML SSO 필수 (보안팀 요구사항)", "조직도 1,240명 일괄 등록"],
    contacts: [
      { name: "박서준", role: "IT 인프라 담당 (SSO 설정 권한)", email: "sj.park@hanbit-logis.example" },
      { name: "이하은", role: "경영지원팀장 (도입 책임자)", email: "he.lee@hanbit-logis.example" },
    ],
    salesNote: "보안팀이 SSO 없이는 오픈 불가 입장. 오픈일 연기 시 계약 갱신에 영향 우려.",
    cardSummary: "오픈 6일 전 · SSO 로그인 실패",
  },
  greenfood: {
    id: "greenfood",
    company: "그린푸드 (가상)",
    industry: "식품 제조·유통",
    plan: "Standard",
    seats: 450,
    contractDate: "2026-10-15",
    goLiveDate: "2026-11-07",
    goals: ["전 직원 조직도 등록 후 메신저·결재 동시 오픈", "공장별 부서 구조 그대로 반영"],
    requirements: ["기존 인사시스템에서 내려받은 CSV로 조직도 등록", "SSO는 이번 계약 범위 아님"],
    contacts: [
      { name: "최민지", role: "인사팀 대리 (조직도 담당)", email: "mj.choi@greenfood.example" },
      { name: "정우성", role: "전산실장", email: "ws.jung@greenfood.example" },
    ],
    salesNote: "인사팀이 CSV 업로드를 직접 했는데 '일부만 들어갔다'고 문의. 오픈 3일 전.",
    cardSummary: "오픈 3일 전 · 조직도 일부 누락",
  },
  seum: {
    id: "seum",
    company: "세움건설 (가상)",
    industry: "건설 (본사 + 현장 12곳)",
    plan: "Business",
    seats: 320,
    contractDate: "2026-09-01",
    goLiveDate: "2026-10-14",
    goals: [
      "현장 일일보고를 종이 대신 모바일 전자결재로",
      "본사-현장 간 지시·보고 시간 단축",
    ],
    requirements: ["현장 작업반장은 모바일만 사용", "현장 일일보고 결재 하루 40건 목표"],
    contacts: [
      { name: "한지민", role: "경영혁신팀 과장 (도입 챔피언)", email: "jm.han@seum-cnc.example" },
      { name: "오세훈", role: "공무팀장 (현장 대표)", email: "sh.oh@seum-cnc.example" },
    ],
    salesNote: "오픈 3주 지났는데 현장에서 '안 쓴다'는 말이 나옴. 경영진이 도입 효과를 묻는 중.",
    cardSummary: "오픈 3주 후 · 현장 사용률 저조",
  },
};

export function createEnv(id: CustomerId): EnvState {
  const base: EnvState = {
    customerId: id,
    sso: {
      contracted: false,
      expectedAcsUrl: "",
      acsUrlOnIdp: "",
      certExpiresInDays: 365,
    },
    orgImport: {
      totalRows: 0,
      fileEncoding: "utf-8",
      importEncoding: "utf-8",
      encodingRows: 0,
      parenRows: 0,
      parenRenamedByCustomer: false,
    },
    accounts: { lockedFieldAccounts: 0 },
    approval: { templates: ["일반 품의", "휴가 신청", "지출 결의"] },
    usage: { daysSinceGoLive: -1, roles: [], featureUsage: {} },
    outbox: [],
    pendingReplies: [],
    deliveredReplies: [],
    configChanges: [],
    tickets: [],
    trainingPlans: [],
    milestone: null,
  };

  if (id === "hanbit") {
    base.sso = {
      contracted: true,
      expectedAcsUrl: "https://hanbit.workbridge.app/sso/acs",
      acsUrlOnIdp: "https://hanbit.workbridge.io/sso/acs",
      certExpiresInDays: 5,
    };
    base.orgImport.totalRows = 1240;
    base.approval.templates.push("배차 변경 요청");
    base.usage = {
      daysSinceGoLive: -6,
      roles: [
        { role: "파일럿 사용자 (경영지원팀)", headcount: 20, weeklyActiveRate: 0.65, mobileInstallRate: 0.5 },
      ],
      featureUsage: { 메신저: 212, 전자결재: 9, 게시판: 14 },
    };
  }

  if (id === "greenfood") {
    base.orgImport = {
      totalRows: 450,
      fileEncoding: "euc-kr",
      importEncoding: "utf-8",
      encodingRows: 30,
      parenRows: 8,
      parenRenamedByCustomer: false,
    };
    base.usage = {
      daysSinceGoLive: -3,
      roles: [{ role: "인사·전산 관리자", headcount: 4, weeklyActiveRate: 1, mobileInstallRate: 0.25 }],
      featureUsage: { 메신저: 31, 전자결재: 0, 게시판: 2 },
    };
  }

  if (id === "seum") {
    base.orgImport.totalRows = 320;
    base.accounts.lockedFieldAccounts = 23;
    base.usage = {
      daysSinceGoLive: 21,
      roles: [
        { role: "본사 사무직", headcount: 120, weeklyActiveRate: 0.78, mobileInstallRate: 0.61 },
        { role: "현장 관리자", headcount: 60, weeklyActiveRate: 0.22, mobileInstallRate: 0.4 },
        { role: "현장 작업반장", headcount: 140, weeklyActiveRate: 0.06, mobileInstallRate: 0.18 },
      ],
      featureUsage: { 메신저: 2140, 전자결재: 3, 게시판: 96, "근태 기록": 410 },
    };
  }

  return base;
}

// ───────────────────────── 진단 로직 ─────────────────────────

export function orgImportResult(env: EnvState) {
  const o = env.orgImport;
  if (o.totalRows === 0) return null;
  const encodingFailed = o.fileEncoding !== o.importEncoding ? o.encodingRows : 0;
  const parenFailed = o.parenRenamedByCustomer ? 0 : o.parenRows;
  const imported = o.totalRows - encodingFailed - parenFailed;
  return { imported, total: o.totalRows, encodingFailed, parenFailed };
}

export function ssoResult(env: EnvState) {
  if (!env.sso.contracted) return null;
  const acsOk = env.sso.acsUrlOnIdp === env.sso.expectedAcsUrl;
  return { acsOk, certExpiresInDays: env.sso.certExpiresInDays };
}

export function buildLogs(env: EnvState): string[] {
  const logs: string[] = [];
  const sso = ssoResult(env);
  if (sso) {
    if (!sso.acsOk) {
      logs.push(
        `2026-11-04 09:12:03 ERROR sso.saml SAML_RESPONSE_INVALID destination="${env.sso.acsUrlOnIdp}" expected="${env.sso.expectedAcsUrl}" idp=login.microsoftonline.com`,
        `2026-11-04 09:12:03 ERROR sso.saml SAML_RESPONSE_INVALID (동일 오류 최근 24시간 37건)`,
      );
    } else {
      logs.push(`2026-11-04 10:40:11 INFO  sso.saml login success user=test01 idp=login.microsoftonline.com`);
    }
    if (sso.certExpiresInDays <= 14) {
      logs.push(
        `2026-11-04 00:00:01 WARN  sso.cert IdP 서명 인증서 만료 임박 days_left=${sso.certExpiresInDays} thumbprint=7F:A2:...:19`,
      );
    }
  }
  const org = orgImportResult(env);
  if (org) {
    if (org.encodingFailed > 0) {
      logs.push(
        `2026-11-03 17:02:44 ERROR org.import ENCODING_MISMATCH rows=${org.encodingFailed} sample="?λ???" detected=euc-kr configured=${env.orgImport.importEncoding}`,
      );
    }
    if (org.parenFailed > 0) {
      logs.push(
        `2026-11-03 17:02:45 ERROR org.import HTTP 500 InternalServerError at DeptPathParser.parse rows=${org.parenFailed} sample_dept="생산1팀(음성공장)"`,
        `2026-11-03 17:02:45 ERROR org.import java.lang.IllegalStateException: unbalanced token '(' in dept path`,
      );
    }
    if (org.encodingFailed === 0 && org.parenFailed === 0) {
      logs.push(`2026-11-04 11:05:20 INFO  org.import completed rows=${org.total} failed=0`);
    }
  }
  if (env.accounts.lockedFieldAccounts > 0) {
    logs.push(
      `2026-11-03 07:31:09 WARN  auth.login ACCOUNT_LOCKED reason=5_failed_attempts client=mobile-android role=현장 작업반장`,
      `2026-11-03 07:31:09 WARN  auth.login ACCOUNT_LOCKED (현재 잠긴 계정 ${env.accounts.lockedFieldAccounts}개, 전원 초기 비밀번호 미변경, 모바일 접속)`,
      `2026-11-02 06:58:40 INFO  auth.login password_reset_requested=0 role=현장 작업반장 (최근 21일)`,
    );
  }
  if (env.customerId === "seum") {
    logs.push(
      `2026-11-04 08:15:00 INFO  approval.form 템플릿 검색 "일일보고" 결과 0건 (최근 21일 검색 17회)`,
    );
  }
  return logs;
}

// ───────────────────────── 고객 회신 시뮬레이션 ─────────────────────────
// 고객에게 보낸 메시지의 "내용"에 따라 고객이 다르게 반응합니다.
// 필요한 정보를 정확히 안내했는지가 결과를 바꿉니다.

export function simulateReply(env: EnvState, msg: SentMessage): CustomerReply {
  const text = `${msg.subject}\n${msg.body}`.toLowerCase();
  const has = (...words: string[]) => words.some((w) => text.includes(w.toLowerCase()));
  const profile = PROFILES[env.customerId];
  const contact = profile.contacts.find((c) => c.email === msg.to) ?? profile.contacts[0];
  const from = `${contact.name} <${contact.email}>`;
  const subject = `RE: ${msg.subject}`;

  if (env.customerId === "hanbit") {
    // 고객은 현재 상태에 맞게 반응합니다: 이미 고친 것은 다시 묻지 않고, 정확한 값이 있어야만 조치합니다.
    const acsFixed = env.sso.acsUrlOnIdp === env.sso.expectedAcsUrl;
    const mentionsAcsWord = has("acs", "reply url", "회신 url", "응답 url");
    const givesExactAcs = mentionsAcsWord && has(env.sso.expectedAcsUrl);
    const mentionsCert = has("인증서", "certificate", "cert");
    const replies: string[] = [];
    if (!acsFixed) {
      if (givesExactAcs) {
        env.sso.acsUrlOnIdp = env.sso.expectedAcsUrl;
        replies.push("Azure AD 엔터프라이즈 앱의 회신 URL(ACS)을 안내해주신 주소로 수정했습니다.");
      } else if (mentionsAcsWord) {
        replies.push("ACS URL을 바꾸라는 건 이해했는데, 정확히 어떤 주소로 바꿔야 하나요? 저희 쪽 값은 https://hanbit.workbridge.io/sso/acs 로 되어 있습니다.");
      }
    }
    if (mentionsCert && env.sso.certExpiresInDays <= 14) {
      env.sso.certExpiresInDays = 730;
      replies.push("만료 임박한 서명 인증서도 새로 발급해 페더레이션 메타데이터를 다시 올렸습니다.");
    }
    if (replies.length === 0) {
      replies.push(
        acsFixed
          ? "확인했습니다. 저희 쪽에서 추가로 할 일이 있으면 알려주세요."
          : "메일 감사합니다. 그런데 저희가 IdP에서 구체적으로 무엇을 바꿔야 하는지 잘 모르겠습니다. 설정 항목과 값을 알려주시면 바로 반영하겠습니다.",
      );
    } else if (!replies[0].includes("어떤 주소")) {
      replies.push("한번 테스트해 주세요.");
    }
    return { from, subject, body: replies.join(" ") };
  }

  if (env.customerId === "greenfood") {
    if (has("괄호", "(", "parenthes")) {
      env.orgImport.parenRenamedByCustomer = true;
      return {
        from,
        subject,
        body: "부서명에서 괄호를 빼고(예: 생산1팀-음성공장) 해당 8명만 다시 올렸습니다. 수정 배포되면 원래 이름으로 바꾸고 싶어요. 일정 알려주세요.",
      };
    }
    if (has("인코딩", "euc-kr", "encoding")) {
      return {
        from,
        subject,
        body: "인코딩 설정 안내 감사합니다. 그런데 아직 8명이 안 들어간 것 같아요. 생산팀 쪽 사람들인데 이유를 알 수 있을까요?",
      };
    }
    return {
      from,
      subject,
      body: "확인했습니다. 저희가 따로 해야 할 일이 있으면 구체적으로 알려주세요.",
    };
  }

  // seum
  const replies: string[] = [];
  if (has("잠", "lock", "비밀번호", "password")) {
    replies.push("잠긴 계정 해제 소식 공유했습니다. 반장님들이 비밀번호 바꾸는 법을 몰라서 그냥 포기했던 것 같아요.");
  }
  if (has("교육", "training", "세션")) {
    replies.push("현장 교육은 매주 월요일 아침 조회 시간(07:00~07:20)에만 가능합니다. 길면 안 들어요.");
  }
  if (has("일일보고", "양식", "템플릿")) {
    replies.push("일일보고 양식이 없어서 못 쓰고 있었다는 얘기도 들었습니다. 기존 종이 양식 사진 보내드릴게요.");
  }
  if (replies.length === 0) {
    replies.push("메일 잘 받았습니다. 현장에서는 '어디서부터 해야 할지 모르겠다'는 반응이 많아요. 구체적으로 뭘 하면 될까요?");
  }
  return { from, subject, body: replies.join(" ") };
}
