#!/usr/bin/env python3
"""brief JSON <-> humanize-korean(im-not-ai) 윤문 단계를 잇는 도구 (표준 라이브러리만 사용).

윤문은 문체만 바꿔야 한다. 이 도구는 그 약속을 기계로 확인한다.
  export  BRIEF --run-dir DIR          cover_letter를 '소제목\\n본문' 블록으로 DIR/01_input.txt에 쓴다
  import  BRIEF --final FINAL --out NEW 윤문본 본문을 brief에 되돌려 새 brief를 쓴다
  verify  BEFORE AFTER                  두 텍스트 파일(스토리 초안 등)을 같은 기준으로 대조만 한다

대조 기준(하나라도 어기면 exit 1, 새 brief를 쓰지 않음)
  - 블록(문항) 수와 순서, 소제목 줄이 그대로인지
  - 문항마다 숫자·영문 토큰(회사명·도구명·기간 등)의 모음이 같은지
  - ⟦ ⟧ 표시 개수가 같은지 (스토리 초안의 지어낸 장면 표시가 사라지면 안 됨)
  - 본문 글자 수가 meta.limits.section_chars(기본 500~700) 안인지는 career_packet.py check가 본다
"""
import argparse
import collections
import json
import re
import sys
from pathlib import Path

SUMMARY_MARK = "<!-- HUMANIZE-SUMMARY"
TOKEN_RE = re.compile(r"[0-9]+(?:[.,:][0-9]+)*|[A-Za-z][A-Za-z0-9.+#\-]*")


def strip_summary(text: str) -> str:
    i = text.find(SUMMARY_MARK)
    return (text[:i] if i >= 0 else text).strip()


def blocks(text: str):
    """빈 줄로 나눈 블록 → (첫 줄, 나머지) 목록. 머리말 '※'·'[이력서 제목]' 블록도 그대로 한 블록."""
    out = []
    for raw in re.split(r"\n\s*\n", text.strip()):
        lines = raw.strip().split("\n")
        out.append((lines[0].strip(), "\n".join(l.strip() for l in lines[1:]).strip()))
    return out


def tokens(s: str):
    return collections.Counter(TOKEN_RE.findall(s))


def compare(before, after):
    errs = []
    if len(before) != len(after):
        return [f"블록 수가 다릅니다: 원문 {len(before)} / 윤문 {len(after)}"]
    for i, ((h1, b1), (h2, b2)) in enumerate(zip(before, after), 1):
        if h1 != h2:
            errs.append(f"{i}번 블록 첫 줄(소제목)이 바뀌었습니다: '{h1}' → '{h2}'")
        t1, t2 = tokens(h1 + " " + b1), tokens(h2 + " " + b2)
        if t1 != t2:
            lost = dict(t1 - t2)
            added = dict(t2 - t1)
            errs.append(f"{i}번 블록 숫자·영문 토큰 불일치 — 빠짐 {lost} / 생김 {added}")
        for mark in ("⟦", "⟧"):
            if (b1 + h1).count(mark) != (b2 + h2).count(mark):
                errs.append(f"{i}번 블록 '{mark}' 개수가 다릅니다")
    return errs


def cmd_export(a):
    brief = json.loads(Path(a.brief).read_text(encoding="utf-8"))
    text = "\n\n".join(f"{s['heading']}\n{s['body']}" for s in brief["cover_letter"])
    d = Path(a.run_dir)
    d.mkdir(parents=True, exist_ok=True)
    (d / "01_input.txt").write_text(text + "\n", encoding="utf-8")
    print(f"wrote {d / '01_input.txt'} ({len(brief['cover_letter'])}문항)")


def cmd_import(a):
    brief = json.loads(Path(a.brief).read_text(encoding="utf-8"))
    before = [(s["heading"], s["body"]) for s in brief["cover_letter"]]
    after = blocks(strip_summary(Path(a.final).read_text(encoding="utf-8")))
    errs = compare(before, after)
    if errs:
        print("윤문본을 받지 않았습니다(원문 유지):", *errs, sep="\n  - ")
        sys.exit(1)
    changed = 0
    for s, (_, body) in zip(brief["cover_letter"], after):
        if s["body"] != body:
            changed += 1
        s["body"] = body
    brief.setdefault("meta", {})["humanized"] = {"tool": "humanize-korean", "final": str(a.final)}
    Path(a.out).write_text(json.dumps(brief, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {a.out} — {changed}/{len(after)}문항 본문 반영, 대조 통과")


def cmd_verify(a):
    before = blocks(strip_summary(Path(a.before).read_text(encoding="utf-8")))
    after = blocks(strip_summary(Path(a.after).read_text(encoding="utf-8")))
    errs = compare(before, after)
    if errs:
        print("대조 실패:", *errs, sep="\n  - ")
        sys.exit(1)
    print(f"대조 통과 ({len(after)}블록)")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = p.add_subparsers(dest="cmd", required=True)
    e = sp.add_parser("export"); e.add_argument("brief"); e.add_argument("--run-dir", required=True)
    i = sp.add_parser("import"); i.add_argument("brief"); i.add_argument("--final", required=True); i.add_argument("--out", required=True)
    v = sp.add_parser("verify"); v.add_argument("before"); v.add_argument("after")
    a = p.parse_args()
    {"export": cmd_export, "import": cmd_import, "verify": cmd_verify}[a.cmd](a)


if __name__ == "__main__":
    main()
