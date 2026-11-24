#!/usr/bin/env python3
"""김지호 지원서 패킷 조립·검사 도구 (표준 라이브러리만 사용).

이 스크립트는 글을 쓰지 않는다. 공고 분석·자기소개서·포트폴리오 문장은 Claude가
brief JSON에 직접 쓰고, 이 도구는 그 내용을
  1) profile.json의 근거 ID·금지 주장·숫자 맥락·분량 규칙으로 검사하고
  2) 회사/직무/날짜/버전 폴더에 덮어쓰지 않고 파일로 조립한다.

사용법
  python3 career_packet.py check  BRIEF.json
  python3 career_packet.py build  BRIEF.json [--out DIR] [--attach FILE ...]
  python3 career_packet.py count  FILE.txt
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import shutil
import urllib.parse
import sys
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parent.parent
PROFILE_PATH = SKILL_DIR / "references" / "profile.json"
TEMPLATE_PATH = SKILL_DIR / "assets" / "portfolio.html"
DEFAULT_OUT = Path.cwd() / "applications"

TRACKS = {"ax": "AX 개발", "onboarding": "온보딩·기술지원"}
DEFAULT_RANGE = (2000, 3000)  # 분량 제한이 없을 때 공백 포함 권장 범위

# 근거 없이 쓰면 안 되는 표현. (패턴, 설명). 같은 문장에 부정 표현이 있으면 경고로 낮춘다.
BANNED = [
    (r"합격\s*(을\s*)?보장", "합격 보장 표현"),
    (r"최고의|최고\s*수준|완벽(한|하게)|혁신적|패러다임|시너지|극대화", "과장된 추상어"),
    (r"(AI|에이전트|자동화)\s*전문가", "전문가 페르소나"),
    (r"MCP\s*서버를?\s*(직접\s*)?(만들었|개발했|제작했|구축했|운영했)", "MCP 서버 제작 경험(미확인)"),
    (r"Claude\s*Team\s*(관리자|을\s*운영|운영)", "Claude Team 관리자 경험(미확인)"),
    (r"서브\s*에이전트를?\s*(직접\s*)?(만들었|제작했|운영했)", "서브에이전트 제작 경험(미확인)"),
    (r"수상|우승|입상|대상을\s*받", "해커톤 수상·순위(미확인)"),
    (r"정확도\s*100|100\s*%\s*정확", "정확도 100% 주장"),
    (r"(시간|업무|문의|비용)[^.。\n]{0,12}\d+\s*%\s*(절감|단축|감소|줄)", "측정되지 않은 성과 수치"),
    (r"만족도\s*\d|만족도가\s*(높|올)", "측정되지 않은 만족도"),
    (r"(PM|PL)\s*(으로서|로서|을\s*맡|로\s*총괄|총괄)", "공식 PM·PL 총괄 표현"),
    (r"(전체|모든)\s*(서비스|코드|기능)를?\s*(혼자|단독)", "팀 결과물 단독 개발 표현"),
    (r"DBA|튜닝\s*전문", "DBA 전문성(미확인)"),
    (r"반도체\s*장비를?\s*(제어|개발|다뤄\s*봤)", "반도체 장비 경험(미확인)"),
    (r"상용\s*(운영|서비스)\s*(중|하고|했)", "상용 운영 주장"),
    (r"벤치마킹(했|하였|을\s*진행)", "특정 기관 벤치마킹(미확인)"),
]
NEGATION = re.compile(r"없습니다|없었|않았|않습니다|아직|미확인|아닙니다|아니라|처음")

# 숫자 옆에 반드시 있어야 할 맥락 (숫자 패턴, 맥락 패턴, 설명)
NUMBER_CONTEXT = [
    (r"300\s*명", r"교육|시연|이용자|사용자", "약 300명은 교육 대상 규모"),
    (r"44\s*장", r"교육|자료|슬라이드", "44장은 교육자료 장수"),
    (r"13\s*개", r"도구", "13개는 에이전트 도구 수"),
    (r"172\s*건", r"시험|테스트", "172건은 팀 계산 엔진 시험"),
    (r"8\s*건", r"가상|시험|공고", "8건은 가상 공고 추출 시험"),
]

PRIVATE = [
    (r"01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}", "전화번호"),
    (r"[\w.+-]+@[\w-]+\.[\w.]+", "이메일"),
    (r"생년월일|주민등록", "생년월일·주민번호"),
    (r"공백기|퇴사\s*사유|계약\s*만료", "퇴사·공백 설명(공개 화면 금지)"),
]
INTERNAL_ONLY = [
    (r"미확인|확인\s*필요|근거\s*ID|fact\s*id", "내부 검토 표현"),
]


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.stats: dict[str, object] = {}

    def err(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)

    @property
    def ok(self) -> bool:
        return not self.errors

    def text(self) -> str:
        out = []
        for k, v in self.stats.items():
            out.append(f"- {k}: {v}")
        out += [f"- 오류: {e}" for e in self.errors]
        out += [f"- 경고: {w}" for w in self.warnings]
        if not self.errors and not self.warnings:
            out.append("- 오류·경고 없음")
        return "\n".join(out)


def load_json(path: Path) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def load_profile() -> dict:
    return load_json(PROFILE_PATH)


def char_counts(text: str) -> tuple[int, int]:
    """(공백 포함, 공백 제외) 글자 수."""
    t = text.replace("\r", "")
    return len(t), len(re.sub(r"\s", "", t))


def letter_text(brief: dict, with_headings: bool = True) -> str:
    parts = []
    for s in brief.get("cover_letter", []):
        if with_headings:
            parts.append(s.get("heading", ""))
        parts.append(s.get("body", "").strip())
    return "\n\n".join(parts)


def sentences(text: str) -> list[str]:
    return [s for s in re.split(r"(?<=[.!?。])\s+|\n+", text) if s.strip()]


def scan_banned(label: str, text: str, rep: Report) -> None:
    for sent in sentences(text):
        for pat, why in BANNED:
            m = re.search(pat, sent)
            if not m:
                continue
            msg = f"{label}: {why} - \"{sent.strip()[:70]}\""
            if NEGATION.search(sent):
                rep.warn(msg + " (부정 문맥이라 경고로 처리, 의도 확인)")
            else:
                rep.err(msg)


def scan_numbers(label: str, text: str, rep: Report) -> None:
    for num, ctx, why in NUMBER_CONTEXT:
        for m in re.finditer(num, text):
            window = text[max(0, m.start() - 45): m.end() + 45]
            if not re.search(ctx, window):
                rep.err(f"{label}: '{m.group(0)}' 주변에 맥락이 없습니다 ({why}) - \"{window.strip()}\"")


def scan_private(label: str, text: str, rep: Report, public: bool) -> None:
    for pat, why in PRIVATE:
        if re.search(pat, text):
            if public:
                rep.err(f"{label}: 공개 화면에 {why}가 들어 있습니다")
            elif why.startswith("퇴사"):
                rep.warn(f"{label}: {why} 언급. 공고가 묻지 않았다면 빼세요")
    if public:
        for pat, why in INTERNAL_ONLY:
            if re.search(pat, text, re.I):
                rep.err(f"{label}: 제출용 화면에 {why}가 섞였습니다")


def portfolio_texts(brief: dict) -> list[tuple[str, str]]:
    p = brief.get("portfolio", {})
    out: list[tuple[str, str]] = []
    hero = p.get("hero", {})
    for k in ("eyebrow", "title", "lead"):
        out.append((f"portfolio.hero.{k}", hero.get(k, "")))
    why = p.get("why", {})
    out.append(("portfolio.why.title", why.get("title", "")))
    for i, para in enumerate(why.get("paragraphs", [])):
        out.append((f"portfolio.why.paragraphs[{i}]", para))
    for i, row in enumerate(p.get("fit", [])):
        out.append((f"portfolio.fit[{i}]", row.get("duty", "") + " " + row.get("experience", "")))
    flow = p.get("flow", {})
    out.append(("portfolio.flow", " ".join([flow.get("title", ""), flow.get("caption", "")] + [s.get("label", "") + " " + s.get("desc", "") for s in flow.get("steps", [])])))
    for i, pr in enumerate(p.get("projects", [])):
        out.append((f"portfolio.projects[{i}]", " ".join([pr.get("headline", ""), pr.get("summary", "")] + pr.get("verify", []))))
    out.append(("portfolio.closing", p.get("closing", "")))
    return out


def validate(brief: dict, profile: dict | None = None) -> Report:
    profile = profile or load_profile()
    facts = profile["facts"]
    projects = profile["projects"]
    rep = Report()

    meta = brief.get("meta", {})
    for key in ("company", "role", "track", "date"):
        if not meta.get(key):
            rep.err(f"meta.{key}가 비어 있습니다")
    if meta.get("track") and meta["track"] not in TRACKS:
        rep.err(f"meta.track은 {list(TRACKS)} 중 하나여야 합니다: {meta.get('track')}")
    if meta.get("date") and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", meta["date"]):
        rep.err("meta.date는 YYYY-MM-DD 형식이어야 합니다")
    if not brief.get("resume_title"):
        rep.err("resume_title(이력서 제목)이 비어 있습니다")
    if not brief.get("posting", {}).get("duties"):
        rep.err("posting.duties(주요 업무)가 비어 있습니다")

    sections = brief.get("cover_letter", [])
    if len(sections) < 3:
        rep.err("cover_letter 소제목이 3개 미만입니다")
    hack_sections = 0
    for i, s in enumerate(sections):
        label = f"cover_letter[{i}] '{s.get('heading', '')[:20]}'"
        if not s.get("heading") or not s.get("body"):
            rep.err(f"{label}: heading/body가 비어 있습니다")
        ev = s.get("evidence", [])
        if not ev:
            rep.err(f"{label}: evidence(근거 ID)가 없습니다")
        for e in ev:
            if e not in facts:
                rep.err(f"{label}: 알 수 없는 근거 ID '{e}'")
        if any(e.startswith("hackathon") for e in ev):
            hack_sections += 1
            if i == 0:
                rep.err(f"{label}: 해커톤은 추가 경험입니다. 첫 소제목의 주인공으로 두지 마세요")
    if hack_sections > 1:
        rep.warn(f"해커톤 근거를 쓴 소제목이 {hack_sections}개입니다. 기존 경력 중심을 유지하세요")

    full = letter_text(brief)
    body_only = letter_text(brief, with_headings=False)
    scan_banned("자기소개서", full + "\n" + brief.get("resume_title", ""), rep)
    scan_numbers("자기소개서", full, rep)
    scan_private("자기소개서", full, rep, public=False)

    with_sp, no_sp = char_counts(full)
    b_sp, b_no = char_counts(body_only)
    rep.stats["글자 수(소제목 포함)"] = f"공백 포함 {with_sp}자 / 공백 제외 {no_sp}자"
    rep.stats["글자 수(본문만)"] = f"공백 포함 {b_sp}자 / 공백 제외 {b_no}자"
    limits = meta.get("limits") or {}
    limit = limits.get("cover_letter_chars")
    if limit:
        counted = with_sp if limits.get("count_spaces", True) else no_sp
        if counted > limit:
            rep.err(f"글자 수 {counted}자가 제한 {limit}자를 넘습니다")
        elif counted < limit * 0.8:
            rep.warn(f"글자 수 {counted}자가 제한 {limit}자의 80% 미만입니다")
    else:
        lo, hi = DEFAULT_RANGE
        if not lo <= with_sp <= hi:
            rep.warn(f"분량 제한이 없을 때 권장 범위({lo}~{hi}자, 공백 포함)를 벗어났습니다: {with_sp}자")

    for i, row in enumerate(brief.get("mapping", [])):
        if row.get("status") not in {"match", "partial", "gap", "unknown"}:
            rep.err(f"mapping[{i}].status는 match/partial/gap/unknown 중 하나여야 합니다")
        for e in row.get("evidence", []):
            if e not in facts:
                rep.err(f"mapping[{i}]: 알 수 없는 근거 ID '{e}'")
        if row.get("status") in {"match", "partial"} and not row.get("evidence"):
            rep.err(f"mapping[{i}] '{row.get('item', '')[:20]}': 연결했다면 근거 ID가 필요합니다")
    if not brief.get("mapping"):
        rep.err("mapping(공고 요건과 경험 연결)이 비어 있습니다")
    if not brief.get("review"):
        rep.warn("review(채용 담당자 관점 검토 기록)가 비어 있습니다")
    if not brief.get("sources_read"):
        rep.warn("sources_read(이번에 실제로 읽은 저장소·파일)가 비어 있습니다")

    p = brief.get("portfolio")
    if not p:
        rep.err("portfolio가 비어 있습니다")
    else:
        for key in ("hero", "why", "flow", "projects"):
            if not p.get(key):
                rep.err(f"portfolio.{key}가 비어 있습니다")
        for i, pr in enumerate(p.get("projects", [])):
            if pr.get("id") not in projects:
                rep.err(f"portfolio.projects[{i}]: 알 수 없는 프로젝트 ID '{pr.get('id')}'")
        for i, row in enumerate(p.get("fit", [])):
            for e in row.get("evidence", []):
                if e not in facts:
                    rep.err(f"portfolio.fit[{i}]: 알 수 없는 근거 ID '{e}'")
        accent = p.get("accent", "#2457d6")
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", accent):
            rep.err("portfolio.accent는 #RRGGBB 형식이어야 합니다")
        for label, text in portfolio_texts(brief):
            scan_banned(label, text, rep)
            scan_numbers(label, text, rep)
            scan_private(label, text, rep, public=True)
    return rep


# ---------------------------------------------------------------- 출력 만들기

def esc(s: object) -> str:
    return html.escape(str(s or ""), quote=True)


def safe_url(url: str) -> str:
    url = str(url or "").strip()
    if url.startswith(("https://", "http://", "#", "mailto:")):
        return esc(url)
    return "#"


def flow_html(title: str, steps: list[dict], caption: str = "", compact: bool = False) -> str:
    items = []
    for s in steps:
        if isinstance(s, str):
            s = {"label": s}
        say = s.get("say") or s.get("desc") or s.get("label")
        desc = f"<small>{esc(s['desc'])}</small>" if s.get("desc") else ""
        items.append(f'<li data-say="{esc(say)}"><b>{esc(s.get("label"))}</b>{desc}</li>')
    cls = "flow compact" if compact else "flow"
    head = f'<p class="flow-title">{esc(title)}</p>' if title else ""
    cap = f'<p class="muted">{esc(caption)}</p>' if caption else ""
    return (f'<div class="{cls}" aria-label="{esc(title or "업무 흐름")}">{head}{cap}'
            f'<ol>{"".join(items)}</ol><p class="status" aria-hidden="true"></p></div>')


def render_portfolio(brief: dict, profile: dict) -> str:
    tpl = TEMPLATE_PATH.read_text(encoding="utf-8")
    meta, p = brief["meta"], brief["portfolio"]
    company = meta.get("company_display") or meta["company"]
    hero, why, flow = p["hero"], p["why"], p["flow"]

    fit_rows = "".join(
        f'<div class="fit-row"><dt>{esc(r.get("duty"))}</dt><dd>{esc(r.get("experience"))}</dd></div>'
        for r in p.get("fit", []))
    exp = []
    for e in profile["experience"]:
        pts = "".join(f"<li>{esc(x)}</li>" for x in e["points"])
        exp.append(f'<li><div class="period">{esc(e["period"])}</div><div><h3>{esc(e["org"])}</h3>'
                   f'<div class="muted">{esc(e["title"])}</div><ul>{pts}</ul></div></li>')
    edu = "".join(f"<li>{esc(x)}</li>" for x in profile["education"])

    cards = []
    for pr in p["projects"]:
        base = profile["projects"][pr["id"]]
        links = "".join(f'<a href="{safe_url(l["url"])}" data-print="{esc(urllib.parse.unquote(l["url"]))}" target="_blank" rel="noopener">{esc(l["label"])} ↗</a>'
                        for l in base.get("links", []))
        verify = "".join(f"<li>{esc(v)}</li>" for v in pr.get("verify", []))
        verify_html = f'<h4>과정과 검증</h4><ul class="verify">{verify}</ul>' if verify else ""
        cards.append(
            f'<article class="project reveal" id="{esc(pr["id"])}">'
            f'<h3>{esc(base["title"])}</h3>'
            f'<p class="meta"><strong>{esc(base["kind"])}</strong> · {esc(base["stack"])}</p>'
            f'<p><b>{esc(pr.get("headline", ""))}</b></p>'
            f'<p>{esc(pr.get("summary", ""))}</p>'
            f'<p class="muted"><b>본인 역할</b> · {esc(base["role"])}</p>'
            f'{flow_html("업무 흐름", base.get("flow", []), compact=True)}'
            f'{verify_html}'
            f'<div class="scope"><b>구현 범위</b>{esc(base["scope_note"])}</div>'
            f'<div class="links">{links}</div></article>')

    letter = "".join(
        f"<h3>{esc(s['heading'])}</h3>" + "".join(f"<p>{esc(par)}</p>" for par in s["body"].split("\n") if par.strip())
        for s in brief["cover_letter"])

    values = {
        "PAGE_TITLE": f"김지호 · {company} {meta['role']} 지원 포트폴리오",
        "ACCENT": p.get("accent", "#2457d6"),
        "COMPANY": company,
        "ROLE": meta["role"],
        "HERO_EYEBROW": hero.get("eyebrow", ""),
        "HERO_TITLE": hero.get("title", ""),
        "HERO_LEAD": hero.get("lead", ""),
        "WHY_TITLE": why.get("title", ""),
        "RESUME_TITLE": brief["resume_title"],
        "CLOSING": p.get("closing", ""),
        "FOOTNOTE": f"{meta['date']} 작성 · 이 문서는 지원서 첨부용 단일 HTML이며 외부 스크립트나 추적 코드를 쓰지 않습니다.",
    }
    raw = {
        "HERO_FLOW": flow_html(flow.get("title", ""), flow.get("steps", []), flow.get("caption", "")),
        "WHY_PARAGRAPHS": "".join(f"<p>{esc(x)}</p>" for x in why.get("paragraphs", [])),
        "FIT_ROWS": fit_rows,
        "EXPERIENCE": "".join(exp),
        "EDUCATION": edu,
        "PROJECTS": "".join(cards),
        "LETTER": letter,
    }
    out = tpl
    for k, v in values.items():
        out = out.replace("{{" + k + "}}", esc(v))
    for k, v in raw.items():
        out = out.replace("{{" + k + "}}", v)
    left = re.findall(r"\{\{[A-Z_]+\}\}", out)
    if left:
        raise ValueError(f"템플릿 자리 표시자가 남았습니다: {left}")
    return out


def render_letter_md(brief: dict, rep: Report) -> str:
    meta = brief["meta"]
    lines = [f"# {meta.get('company_display') or meta['company']} · {meta['role']} 자기소개서", "",
             f"- 흐름: {TRACKS[meta['track']]}", f"- 작성일: {meta['date']}",
             f"- {rep.stats.get('글자 수(소제목 포함)')}", "",
             "## 이력서 제목", "", brief["resume_title"], ""]
    for s in brief["cover_letter"]:
        lines += [f"## {s['heading']}", "", s["body"].strip(), ""]
    return "\n".join(lines)


def render_letter_txt(brief: dict) -> str:
    out = [f"[이력서 제목] {brief['resume_title']}", ""]
    for s in brief["cover_letter"]:
        out += [s["heading"], s["body"].strip(), ""]
    return "\n".join(out).rstrip() + "\n"


STATUS_KO = {"match": "충족", "partial": "일부 관련", "gap": "부족", "unknown": "미확인"}
KIND_KO = {"duty": "주요 업무", "required": "필수", "preferred": "우대", "condition": "근무 조건"}


def render_analysis(brief: dict, profile: dict) -> str:
    meta, post = brief["meta"], brief["posting"]
    src = meta.get("posting_source", {})
    L = [f"# 공고분석 · {meta.get('company_display') or meta['company']} {meta['role']}", "",
         f"- 선택한 흐름: {TRACKS[meta['track']]} ({meta.get('track_reason', '')})",
         f"- 공고 출처: {src.get('type', '')} · {src.get('detail', '')}",
         f"- 상태 메모: {src.get('status_note', '')}", ""]
    if post.get("summary"):
        L += ["## 회사·직무 요약", "", post["summary"], ""]
    for key, title in (("duties", "주요 업무"), ("required", "필수 요건"), ("preferred", "우대 사항"), ("conditions", "근무 조건")):
        if post.get(key):
            L += [f"## {title}", ""] + [f"- {x}" for x in post[key]] + [""]
    if post.get("period"):
        L += [f"- 모집기간(공고 기재): {post['period']}", ""]
    L += ["## 요건과 경험 연결", "", "| 구분 | 공고 항목 | 판단 | 관련 근거 | 메모 |", "|---|---|---|---|---|"]
    for r in brief.get("mapping", []):
        ev = ", ".join(r.get("evidence", [])) or "-"
        L.append(f"| {KIND_KO.get(r.get('kind'), r.get('kind', ''))} | {r.get('item', '')} | {STATUS_KO[r['status']]} | {ev} | {r.get('note', '')} |")
    gaps = [r for r in brief.get("mapping", []) if r["status"] in {"gap", "unknown"}]
    L += ["", "## 부족·미확인 사항", ""]
    L += [f"- **{r.get('item')}** ({STATUS_KO[r['status']]}): {r.get('note', '')}" for r in gaps] or ["- 없음"]
    if brief.get("questions_for_user"):
        L += ["", "## 사용자에게 확인할 것 (한 번에 묶어서)", ""] + [f"- {q}" for q in brief["questions_for_user"]]
    return "\n".join(L) + "\n"


def render_evidence(brief: dict, profile: dict, rep: Report, out_dir: Path) -> str:
    facts, meta = profile["facts"], brief["meta"]
    L = [f"# 근거검토 (비공개) · {meta.get('company_display') or meta['company']} {meta['role']}", "",
         "제출하지 않는 내부 문서입니다. 자기소개서와 포트폴리오의 주장마다 근거와 표현 한계를 적었습니다.", "",
         "## 문단별 근거", ""]
    for i, s in enumerate(brief["cover_letter"], 1):
        L += [f"### {i}. {s['heading']}", ""]
        for e in s["evidence"]:
            f = facts[e]
            L.append(f"- `{e}` ({', '.join(f['sources'])}): {f['text']}")
            L.append(f"  - 표현 한계: {f['limit']}")
        L.append("")
    L += ["## 포트폴리오에 쓴 프로젝트", ""]
    for pr in brief["portfolio"]["projects"]:
        base = profile["projects"][pr["id"]]
        L.append(f"- **{base['title']}** ({base['kind']}): 근거 {', '.join('`'+e+'`' for e in base['evidence'])}; 저장소 파일 {', '.join(base.get('source_files', []))}")
    L += ["", "## 이번에 실제로 읽은 자료", "", "| 저장소 | ref | commit | 읽은 날 | 파일 |", "|---|---|---|---|---|"]
    for s in brief.get("sources_read", []):
        L.append(f"| {s.get('repo')} | {s.get('ref', '')} | {s.get('commit', '')} | {s.get('read_on', '')} | {'<br>'.join(s.get('files', []))} |")
    if not brief.get("sources_read"):
        L.append("| (기록 없음: 2026-11-24 스냅샷 프로필만 사용) | | | | |")
    L += ["", "## 실행한 검사", ""]
    L += [f"- {c.get('what')}: {c.get('result')}" for c in brief.get("checks_run", [])] or ["- 없음"]
    L += [f"- career_packet.py 규칙 검사 ({dt.datetime.now().strftime('%Y-%m-%d %H:%M')}):", rep.text().replace("\n", "\n  ").join(["  ", ""]),
          "- 브라우저 화면 검수: `scripts/check_portfolio.mjs` 실행 결과가 아래 절에 추가됩니다. 이 절이 없으면 아직 검수하지 않은 것입니다.", ""]
    L += ["## 채용 담당자 관점 검토 기록", ""]
    L += [f"{i}. 문제: {r.get('issue')}\n   - 고친 내용: {r.get('fix')}" for i, r in enumerate(brief.get("review", []), 1)] or ["- 기록 없음"]
    L += ["", "## 쓰지 않은 미확인 사항 (프로필 unresolved)", ""] + [f"- {u}" for u in profile.get("unresolved", [])]
    if profile.get("repo_discrepancies"):
        L += ["", "## 저장소 문서와 프로필의 차이", ""] + [f"- {u}" for u in profile["repo_discrepancies"]]
    return "\n".join(L) + "\n"


def slug(s: str) -> str:
    s = re.sub(r"[\\/:*?\"<>|()\[\]]+", "", s.strip())
    s = re.sub(r"\s+", "-", s)
    return s[:40] or "untitled"


def next_version_dir(out_root: Path, brief: dict) -> Path:
    meta = brief["meta"]
    base = out_root / f"{slug(meta['company'])}_{slug(meta['role'])}_{meta['track']}"
    base.mkdir(parents=True, exist_ok=True)
    n = 1
    while True:
        d = base / f"{meta['date']}_v{n}"
        try:
            d.mkdir()  # 이미 있으면 FileExistsError → 다음 버전
            return d
        except FileExistsError:
            n += 1


def build(brief_path: Path, out_root: Path, attach: list[Path]) -> Path:
    brief = load_json(brief_path)
    profile = load_profile()
    rep = validate(brief, profile)
    print(rep.text())
    if not rep.ok:
        raise SystemExit("검사 오류가 있어 파일을 만들지 않았습니다.")
    html_text = render_portfolio(brief, profile)
    d = next_version_dir(out_root, brief)
    (d / "자기소개서.md").write_text(render_letter_md(brief, rep), encoding="utf-8")
    (d / "자기소개서.txt").write_text(render_letter_txt(brief), encoding="utf-8")
    (d / "portfolio.html").write_text(html_text, encoding="utf-8")
    (d / "공고분석.md").write_text(render_analysis(brief, profile), encoding="utf-8")
    (d / "근거검토.md").write_text(render_evidence(brief, profile, rep, d), encoding="utf-8")
    inp = d / "입력"
    inp.mkdir()
    shutil.copy2(brief_path, inp / "brief.json")
    shutil.copy2(PROFILE_PATH, inp / "profile_snapshot.json")
    for a in attach:
        shutil.copy2(a, inp / a.name)
    (inp / "README.md").write_text(
        "# 재생성 방법\n\n이 폴더의 brief.json이 이 패킷의 전체 입력입니다. 고친 뒤 아래처럼 다시 만들면 새 버전 폴더가 생깁니다(기존 폴더는 덮어쓰지 않음).\n\n"
        "```bash\npython3 .claude/skills/jiho-career-agent/scripts/career_packet.py build \"<이 폴더>/brief.json\"\n```\n\n"
        "profile_snapshot.json은 작성 당시의 프로필 사본입니다.\n", encoding="utf-8")
    print(f"\n만든 폴더: {d}")
    return d


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    c = sub.add_parser("check")
    c.add_argument("brief", type=Path)
    b = sub.add_parser("build")
    b.add_argument("brief", type=Path)
    b.add_argument("--out", type=Path, default=DEFAULT_OUT)
    b.add_argument("--attach", type=Path, nargs="*", default=[])
    n = sub.add_parser("count")
    n.add_argument("file", type=Path)
    a = ap.parse_args(argv)
    if a.cmd == "check":
        rep = validate(load_json(a.brief))
        print(rep.text())
        return 0 if rep.ok else 1
    if a.cmd == "build":
        build(a.brief, a.out, a.attach)
        return 0
    if a.cmd == "count":
        w, n_ = char_counts(a.file.read_text(encoding="utf-8"))
        print(f"공백 포함 {w}자 / 공백 제외 {n_}자")
        return 0
    return 2


if __name__ == "__main__":
    sys.exit(main())
