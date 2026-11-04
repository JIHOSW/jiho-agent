# FIRSTMILE Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 고객의 첫 문서 활용까지 안내하는 근거 기반 온보딩 포트폴리오.
**Architecture:** React UI → shared domain/retrieval → same-origin AI API; browser task store. Sites Vinext starter retained.
**Tech Stack:** React, Vinext, Node test runner, server fetch to Responses API.
**Spec:** ../specs/2026-11-04-firstmile-design.md

## Global Constraints
- 모든 고객·제품 문서는 가상. 실제 경력 성과와 분리.
- 본문 15~16px, 상태는 문구 병기. 키는 서버에만.
- 6고객, 5단계, 근거·추정·추가 확인·조치·초안 구분.
- AI 오류를 데모 성공으로 대체하지 않음.

## Review Focus
- 다른 고객의 기록 인용 금지 → Task 1 retrieval tests.
- 근거 부족/충돌에서 단정 금지 → Task 1 scenario tests.
- AI가 존재하지 않는 인용 반환 → Task 2 validation tests.
- 재분석 중 고객 변경/작업 중복 → Task 3 UI state guard + Task 1 task tests.
- 손상된 저장 데이터/보관 차단 → Task 3 recoverable UI message and storage tests.

### Task 1: Domain, documents, scenarios and task state
Files: lib/firstmile/{data,domain}.mjs; tests/domain.test.mjs.
Interfaces: getCase(clientId, variant); analyzeDemo(context); createTask(tasks,input); restoreState(raw).
- [ ] Write failing tests for missing evidence, changed event records, isolated retrieval, task duplicate and corrupt state.
- [ ] Run `node --test tests/domain.test.mjs`; verify failure before implementation.
- [ ] Implement domain/data then run same command; expected all pass.

### Task 2: AI server boundary
Files: lib/firstmile/ai.mjs; app/api/analyze/route.ts; app/api/status/route.ts; tests/ai.test.mjs.
Interfaces: analyzeAI(context,{apiKey,model,fetchImpl}); validateAnalysis(output,context); handleAnalysis(body,env).
- [ ] Write failing tests: missing key 503, unknown client 400, invalid citations rejected, upstream failure sanitized, structured response parsed.
- [ ] Run `node --test tests/ai.test.mjs`; verify failure, implement, rerun.
- [ ] API calls use same-origin POST, input limits, timeout, allowlisted models via environment. Server obtains Cloudflare env with process fallback locally.

### Task 3: Responsive workflow and delivery
Files: app/page.tsx, app/globals.css, app/layout.tsx, README.md, docs/PORTFOLIO.md, .env.example.
Consumes: shared domain + server endpoint; produces six-client dashboard, editable notes, reference viewer, draft/task dialogs, persistence/export, activity and project explanation.
- [ ] Build blue/navy responsive screen with accessible dialogs and explicit demo/live modes.
- [ ] Run full domain/API tests, TypeScript check and production build.
- [ ] Start local preview, inspect available browser surface (respect prior file URL denial; do not bypass it), use native Sites published preview for visual verification when available.
- [ ] Package/publish owner-private Site; save source archive, execution and API-key setup instructions. Record unverified live API limitation.
