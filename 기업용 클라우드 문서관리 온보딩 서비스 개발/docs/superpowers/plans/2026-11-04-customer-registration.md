# Customer registration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Execute inline; preserve the existing private Site and its source history.

**Goal:** Add customers to the browser workspace without inventing onboarding evidence; explain the assumed solution and evidence flow.
**Architecture:** Keep seeded sample customers read-only. Store validated manual customers alongside tasks/notes/drafts in backward-compatible v1 state. Server validates submitted manual profile and reconstructs scoped context from authoritative bundled guides, never browser-supplied system logs.
**Tech Stack:** Existing React/Vinext, JavaScript domain, Node tests, Sites private publishing.
**Spec:** Existing approved firstmile-design.md plus current user request for customer registration and process/source clarification.

## Global Constraints
- No API key available; live AI remains unverified.
- A new customer starts at zero completed stages and has no observed system activity.
- Record source labels must distinguish fictional sample logs and manual profile/notes. No claims of live solution connection.
- Preserve all existing saved tasks/drafts when upgrading state.
- Save in current browser only, as disclosed in the existing app.

## Review Focus
- Duplicate names, invalid dates and invalid user counts rejected.
- Persisted custom client IDs must not alias seeded IDs or prototype keys.
- Tasks/notes/drafts for manual customers survive reload.
- New customers cannot fall into the completed seeded scenario.
- The server must not accept injected customer system evidence or override seeded profiles.

### Task 1 — Validated customer domain and persistence
Files: lib/firstmile/customers.mjs (new), domain.mjs, tests/customers.test.mjs.
Interfaces: createCustomer(existing,input): Customer[]; validateCustomer(value): Customer; getCase(id,variant,note,customCustomer?); createTask(tasks,input,customers=[]); restoreState(raw).
- [ ] Write tests for registration, duplicates, invalid fields, no synthetic logs, persistence of associated tasks and old-state compatibility; watch failures.
- [ ] Implement minimal validation, manual context and explicit insufficient-evidence demo.
- [ ] Run all Node tests.

### Task 2 — Server contract
Files: ai.mjs, API size limit, tests/ai.test.mjs.
- [ ] Test manual profile accepted but matching private seeded records excluded; invalid ID / spoofed seeded profile rejected.
- [ ] Pass validated manual profile through getCase; ignore unknown fields and never accept browser system logs.
- [ ] Run all tests and typecheck.

### Task 3 — Registration and explanation UI
Files: app/page.tsx, app/globals.css, README.md, docs/PROCESS.md.
- [ ] Add prominent ‘고객 추가’ action and required fields: company, industry, owner, users, start date, target date, goal.
- [ ] Register, persist, select and show dynamic customer counts; task and AI flow must work for manual customers.
- [ ] Add solution/process and record-source explanation to UI and written guide. New customers show unverified-profile context, not sample telemetry.
- [ ] Verify registration, reload, tasks and validation in browser; run typecheck/build, source helper package and private republish.
