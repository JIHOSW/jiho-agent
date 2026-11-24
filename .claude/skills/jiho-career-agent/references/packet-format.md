# brief JSON 형식과 명령

brief는 한 지원 건의 전체 입력이다. Claude가 직접 쓰고, `scripts/career_packet.py`가 검사·조립한다. 전체 예시는 `examples/stalab-brief.json`.

## 최상위 키

| 키 | 내용 |
|---|---|
| `meta` | `company`(폴더명용 짧은 이름), `company_display`, `role`, `track`(`ax`/`onboarding`), `track_reason`, `date`(YYYY-MM-DD), `posting_source`{`type`,`detail`,`status_note`}, `limits`{`cover_letter_chars`(없으면 null), `count_spaces`} |
| `posting` | `summary`, `duties`[], `required`[], `preferred`[], `conditions`[], `period` |
| `company` | 기업 조사: `title`, `points`[] (출처로 확인한 사실만, 포트폴리오 '지원 이유' 장에 표시), `public_basis`(화면에 보일 출처 한 줄), `sources`[{`title`,`url`,`read_on`,`how`}] (points가 있으면 필수), `note`(쓰지 않은 정보·확인 한계, 비공개), `use_in_letter` |
| `resume_title` | 겸손한 이력서 제목 |
| `cover_letter` | [{`heading`, `body`, `evidence`[fact ID]}] — 문항형 공고는 문항마다 한 항목. 문단을 나누려면 body 안에 줄바꿈 |
| `mapping` | [{`kind`: duty/required/preferred/condition, `item`, `status`: match/partial/gap/unknown, `evidence`[], `note`}] |
| `questions_for_user` | 사용자에게 한 번에 물을 것 |
| `review` | [{`issue`, `fix`}] 채용 담당자 관점 검토 기록 |
| `sources_read` | [{`repo`, `ref`, `commit`, `read_on`, `files`[]}] 이번에 실제로 읽은 것만 |
| `checks_run` | [{`what`, `result`}] 이번에 직접 실행한 검사만 |
| `portfolio` | 아래 |

### portfolio

| 키 | 내용 |
|---|---|
| `accent` | `#RRGGBB` |
| `hero` | `eyebrow`, `title`, `lead` |
| `flow` | 첫 화면 업무 흐름 모션: `title`, `caption`, `steps`[{`label`, `desc`, `say`}] (4~6단계). 단계는 차례로 강조될 뿐 클릭 대상이 아니다 |
| `why` | `title`, `paragraphs`[] |
| `fit` | [{`duty`, `experience`, `evidence`[]}] 공고 업무와 이어지는 경험 (gap은 넣지 않음) |
| `highlights` | 숫자 카드 ID 최대 4개 (profile.highlights: edu-300, slides-44, tools-13, skills-2, tests-172, projects-n=실린 작업물 수). 숫자는 카운트업 없이 맥락과 함께 표시 |
| `projects` | [{`id`(profile.projects 키), `headline`, `summary`, `verify`[]}] — 종류·역할·기술·구현 범위·링크·프로젝트 흐름·화면 이미지는 profile에서 자동. 사용 가능한 ID: project-hankkeut, project-ticket, project-onboarding, project-saas, project-blog, project-switchboard, project-b2b, project-motion, project-career, project-study, project-lms, project-training. 여기 적은 것이 앞에 오고 나머지는 기본 문구로 자동 추가 |
| `include_all_projects` | 기본 true: 저장소 모든 프로젝트를 싣는다. false면 `projects`에 적은 것만 |
| `closing` | 맺음말 한두 문장 |

경력·교육 타임라인은 `profile.json`의 `experience`, `education`에서 자동으로 들어간다.

## 검사 규칙 (check)

오류(빌드 거부): 필수 키 누락, 알 수 없는 fact/프로젝트 ID, 근거 없는 소제목, 미확인 주장(MCP 서버 제작·Claude Team 관리자·수상·정확도 100%·측정 안 된 절감 수치·PM/PL 총괄 등), 맥락 없는 숫자, 해커톤이 첫 소제목, 글자 수 제한 초과, 포트폴리오의 연락처·퇴사·공백·내부 검토 표현.

경고: 부정 문맥의 민감 표현("아직 없습니다"), 권장 분량(2,000~3,000자) 벗어남, 해커톤 소제목 2개 이상, 검토 기록 없음, 읽은 자료 기록 없음.

## 결과 폴더

`applications/<회사>_<직무>_<track>/<날짜>_v<N>/`

```
자기소개서.txt   자기소개서.md   portfolio.html   공고분석.md   근거검토.md
입력/brief.json  입력/profile_snapshot.json  입력/<첨부한 공고 파일>  입력/README.md
checks/  (check_portfolio.mjs 실행 후: 스크린샷, PDF, 검수결과.md)
```

`applications/`는 `.gitignore`에 있다. 공개 저장소에 지원서·근거검토가 올라가지 않게 하려는 것이다.

## 읽을 파일 (GitHub)

`JIHOSW/jiho-agent`
- README.md
- 고객 온보딩 에이전트 포트폴리오/README.md, src/lib/agent.ts, src/lib/tools.ts, public/replays/
- 기술지원 티켓 에이전트/README.md
- ai 블로그 자동화 에이전트/.claude/skills/blog-trend/SKILL.md, blog-analysis/SKILL.md, .claude/settings.json, .claude/hooks/trace.mjs
- 에이전트 팀 관제 대시보드/serve.mjs

`JIHOSW/Hackathon` (제출 태그 `submit-2026-11-23`, 커밋 8c04d09)
- README.md, 기획/소개서/원고.md(팀원별 역할), 기획/AI_활용내역.md
- 기획/한끗_PRD_수정본.md, 기획/한끗_기능명세서_확정본.md
- munteok/api/extract.js, munteok/js/engine.js, munteok/data/rules.json, munteok/tests/
- 계산 엔진 시험: `cd munteok && node tests/run.mjs` (의존성 설치 없이 실행됨). AI 추출 시험은 Claude API 키가 필요하므로 실행하지 않았다면 그렇게 적는다.

AX 흐름은 블로그 스킬·훅, 온보딩 에이전트, 해커톤 구조를 우선 읽고, 온보딩·기술지원 흐름은 티켓 에이전트, 온보딩 에이전트, 해커톤 UX를 우선 읽는다.

## 테스트

```bash
python3 -m unittest discover -s .claude/skills/jiho-career-agent/tests -v
```
