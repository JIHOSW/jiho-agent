// 가상 SaaS "워크브릿지"의 사내 지식베이스. 부서명 괄호 오류(제품 결함)에 대한 문서는 일부러 없습니다.

export interface KbArticle {
  id: string;
  title: string;
  keywords: string[];
  body: string;
}

export const KNOWLEDGE_BASE: KbArticle[] = [
  {
    id: "KB-101",
    title: "SAML SSO 로그인 실패: SAML_RESPONSE_INVALID (ACS URL 불일치)",
    keywords: ["sso", "saml", "saml_response_invalid", "acs", "destination", "azure", "idp", "로그인 실패"],
    body:
      "원인: 고객 IdP(Azure AD 등)에 등록된 회신 URL(ACS URL)이 워크브릿지의 ACS URL과 다르면 SAML 응답의 Destination 검증에 실패합니다. 구 도메인(*.workbridge.io)을 쓰는 경우가 많습니다.\n" +
      "해결: 고객사 IdP 관리자가 엔터프라이즈 앱 > SAML 설정 > 회신 URL(Assertion Consumer Service URL)을 https://{테넌트}.workbridge.app/sso/acs 로 수정해야 합니다. IdP 설정은 고객사 시스템이므로 워크브릿지 운영 콘솔에서 대신 바꿀 수 없습니다.\n" +
      "확인: 수정 후 run_integration_test(sso)로 테스트 계정 로그인을 재확인합니다.",
  },
  {
    id: "KB-102",
    title: "SSO 서명 인증서 만료 대응",
    keywords: ["sso", "cert", "certificate", "인증서", "만료", "cert_expiring"],
    body:
      "IdP 서명 인증서가 만료되면 모든 사용자의 SSO 로그인이 즉시 중단됩니다. 만료 14일 이내면 고객사 IdP 관리자에게 새 인증서 발급과 페더레이션 메타데이터 재업로드를 요청하세요. 오픈일 직후 만료되는 경우 특히 오픈 전에 교체를 권장합니다.",
  },
  {
    id: "KB-201",
    title: "조직도 CSV 가져오기 ENCODING_MISMATCH",
    keywords: ["org", "import", "csv", "조직도", "encoding", "encoding_mismatch", "인코딩", "euc-kr", "깨짐"],
    body:
      "국내 인사시스템에서 내려받은 CSV는 EUC-KR 인코딩인 경우가 많아, 기본값(UTF-8)으로 가져오면 한글 이름이 포함된 일부 행이 실패합니다.\n" +
      "해결: 운영 콘솔에서 조직도 가져오기 인코딩을 euc-kr로 바꾼 뒤 가져오기를 다시 실행합니다(apply_config_change: org_import.encoding). 고객 테넌트 설정 변경이므로 담당 매니저 승인이 필요합니다.",
  },
  {
    id: "KB-202",
    title: "조직도 CSV 필수 컬럼과 부서 경로 형식",
    keywords: ["org", "import", "csv", "조직도", "부서", "컬럼", "dept"],
    body:
      "필수 컬럼: 사번, 이름, 이메일, 부서 경로, 직위. 부서 경로는 '본사>생산본부>생산1팀' 처럼 '>'로 구분합니다. 부서명에 사용할 수 있는 문자 규칙은 별도로 정해져 있지 않습니다.",
  },
  {
    id: "KB-301",
    title: "계정 잠김(ACCOUNT_LOCKED) 일괄 해제",
    keywords: ["account_locked", "잠김", "lock", "비밀번호", "password", "로그인", "모바일", "현장"],
    body:
      "비밀번호를 5회 틀리면 계정이 잠깁니다. 초기 비밀번호를 바꾸지 않은 모바일 사용자에게 자주 발생합니다.\n" +
      "해결: 운영 콘솔에서 잠긴 계정을 일괄 해제하고 비밀번호 재설정 문자를 발송합니다(apply_config_change: accounts.bulk_unlock, 승인 필요). 재발 방지를 위해 현장 사용자에게 '첫 로그인 → 비밀번호 변경' 절차를 1장짜리 안내로 배포하세요.",
  },
  {
    id: "KB-302",
    title: "현장직 모바일 앱 배포 가이드",
    keywords: ["모바일", "mobile", "설치", "현장", "앱", "qr"],
    body:
      "PC가 없는 현장직은 QR 코드 한 장으로 설치 → 로그인 → 첫 메시지 보내기까지 5분 안에 끝나도록 안내합니다. 조회·안전교육 시간처럼 이미 모여 있는 시간을 활용하는 것이 가장 효과적입니다. 교육은 15~20분을 넘기지 않습니다.",
  },
  {
    id: "KB-401",
    title: "전자결재 양식 추가: 현장 일일보고 템플릿",
    keywords: ["전자결재", "결재", "양식", "템플릿", "일일보고", "approval", "template"],
    body:
      "건설·제조 현장에서 많이 쓰는 '현장 일일보고' 양식(작업 내용, 인원, 장비, 안전 특이사항, 사진 첨부)을 기본 제공합니다. 운영 콘솔에서 고객 테넌트에 양식을 추가할 수 있습니다(apply_config_change: approval.add_template, 승인 필요). 고객의 기존 종이 양식 항목과 맞추면 정착이 빠릅니다.",
  },
  {
    id: "KB-501",
    title: "첫 활용(First Value) 목표 정하는 법",
    keywords: ["첫 활용", "first value", "마일스톤", "milestone", "정착", "사용률", "교육", "training", "온보딩"],
    body:
      "첫 활용은 '고객이 도입한 이유'가 처음으로 실제 업무에서 일어나는 순간입니다. 로그인 수가 아니라 업무 결과(예: 첫 결재 완료, 종이 보고 대체)로 정의하고, 2주 안에 측정 가능한 숫자와 날짜를 정하세요. 교육은 사용률이 가장 낮고 목표에 가장 중요한 역할부터 시작합니다.",
  },
];
