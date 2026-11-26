"""career_packet.py 테스트. 실행: python3 -m unittest discover -s .claude/skills/jiho-career-agent/tests"""
import copy
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SKILL / "scripts"))
import career_packet as cp  # noqa: E402

EXAMPLE = SKILL / "examples" / "stalab-brief.json"


def example():
    return json.loads(EXAMPLE.read_text(encoding="utf-8"))


def errors_of(brief):
    return cp.validate(brief).errors


class ValidateTest(unittest.TestCase):
    def test_example_is_clean(self):
        rep = cp.validate(example())
        self.assertEqual(rep.errors, [])
        self.assertEqual(rep.warnings, [])

    def test_unknown_evidence_id(self):
        b = example()
        b["cover_letter"][1]["evidence"].append("made-up-fact")
        self.assertTrue(any("made-up-fact" in e for e in errors_of(b)))

    def test_section_without_evidence(self):
        b = example()
        b["cover_letter"][2]["evidence"] = []
        self.assertTrue(any("evidence" in e for e in errors_of(b)))

    def test_unverified_claim_is_error(self):
        b = example()
        b["cover_letter"][1]["body"] += " 사내 ERP와 연결하는 MCP 서버를 직접 만들었습니다."
        self.assertTrue(any("MCP" in e for e in errors_of(b)))

    def test_negated_claim_is_only_warning(self):
        b = example()
        b["cover_letter"][1]["body"] += " Claude Team 관리자로 운영해 본 경험은 아직 없습니다."
        rep = cp.validate(b)
        self.assertEqual(rep.errors, [])
        self.assertTrue(any("Claude Team" in w for w in rep.warnings))

    def test_number_needs_context(self):
        b = example()
        b["cover_letter"][4]["body"] += " 그 결과 300명이 지금도 매일 접속합니다."
        self.assertTrue(any("300" in e for e in errors_of(b)))

    def test_hackathon_cannot_lead(self):
        b = example()
        b["cover_letter"].insert(0, b["cover_letter"].pop(3))
        self.assertTrue(any("해커톤" in e for e in errors_of(b)))

    def test_private_info_blocked_in_portfolio(self):
        b = example()
        b["portfolio"]["closing"] = "연락: 010-1234-5678"
        self.assertTrue(any("전화번호" in e for e in errors_of(b)))
        b = example()
        b["portfolio"]["why"]["paragraphs"].append("공백기에는 자격증을 공부했습니다.")
        self.assertTrue(any("공개 화면" in e for e in errors_of(b)))

    def test_internal_notes_blocked_in_portfolio(self):
        b = example()
        b["portfolio"]["hero"]["lead"] += " (Git 수준 미확인)"
        self.assertTrue(any("내부 검토" in e for e in errors_of(b)))

    def test_char_limit(self):
        b = example()
        b["meta"]["limits"] = {"cover_letter_chars": 1000, "count_spaces": True}
        self.assertTrue(any("제한 1000자" in e for e in errors_of(b)))

    def test_section_length_warning(self):
        b = example()
        b["meta"]["limits"].pop("section_chars", None)  # 기본값(500~700자) 적용
        rep = cp.validate(b)
        self.assertTrue(any("문항 본문" in w for w in rep.warnings))
        b["meta"]["limits"]["section_chars"] = [1, 5000]
        self.assertFalse(any("문항 본문" in w for w in cp.validate(b).warnings))

    def test_mapping_match_needs_evidence(self):
        b = example()
        b["mapping"].append({"kind": "preferred", "item": "영어", "status": "match", "evidence": []})
        self.assertTrue(any("근거 ID가 필요" in e for e in errors_of(b)))


class RenderTest(unittest.TestCase):
    def test_html_is_escaped_and_urls_are_safe(self):
        b = example()
        b["portfolio"]["projects"][0]["headline"] = "<script>alert(1)</script>"
        profile = cp.load_profile()
        profile["projects"]["project-blog"]["links"].append({"label": "x", "url": "javascript:alert(1)"})
        out = cp.render_portfolio(b, profile)
        self.assertNotIn("<script>alert(1)</script>", out)
        self.assertIn("&lt;script&gt;", out)
        self.assertNotIn('href="javascript:', out)
        self.assertNotRegex(out, r"\{\{[A-Z_]+\}\}")

    def test_portfolio_keeps_scope_notes_and_roles(self):
        b = example()
        profile = cp.load_profile()
        out = cp.render_portfolio(b, profile)
        for pr in b["portfolio"]["projects"]:
            base = profile["projects"][pr["id"]]
            self.assertIn(cp.esc(base["scope_note"]), out)
            self.assertIn(cp.esc(base["kind"]), out)
        self.assertNotIn("unresolved", out)
        for u in profile["unresolved"]:
            self.assertNotIn(cp.esc(u[:20]), out)

    def test_portfolio_has_controls_and_no_external_scripts(self):
        out = cp.render_portfolio(example(), cp.load_profile())
        for needle in ('id="motion-toggle"', 'id="print-btn"', 'id="bh"', 'href="#s-1"', "prefers-reduced-motion", "@media print", 'class="skip"', "max-width:899px"):
            self.assertIn(needle, out)
        self.assertIsNone(re.search(r"<script[^>]+src=", out))
        self.assertIsNone(re.search(r"<link[^>]+stylesheet", out))
        self.assertNotIn("data-count", out)  # 카운트업 성과 연출 금지

    def test_slide_links_point_to_existing_slides(self):
        out = cp.render_portfolio(example(), cp.load_profile())
        ids = set(re.findall(r'id="(s-\d+)"', out))
        for href in re.findall(r'href="#(s-\d+)"', out):
            self.assertIn(href, ids)


class AllProjectsTest(unittest.TestCase):
    def test_all_repo_projects_included_and_no_letter(self):
        b = example()
        profile = cp.load_profile()
        out = cp.render_portfolio(b, profile)
        for pid in profile["projects"]:
            self.assertIn(f'id="{pid}"', out) if False else self.assertIn(cp.esc(profile["projects"][pid]["title"]), out)
        self.assertNotIn(cp.esc(b["cover_letter"][0]["body"][:40]), out)
        self.assertNotIn(cp.esc(b["resume_title"]), out)

    def test_featured_projects_come_first(self):
        ids = [x["id"] for x in cp.all_projects(example(), cp.load_profile())]
        self.assertEqual(ids[:5], [x["id"] for x in example()["portfolio"]["projects"]])
        self.assertEqual(len(ids), len(set(ids)))

    def test_include_all_false(self):
        b = example()
        b["portfolio"]["include_all_projects"] = False
        self.assertEqual(len(cp.all_projects(b, cp.load_profile())), len(b["portfolio"]["projects"]))


class CompanyTest(unittest.TestCase):
    def test_company_points_need_sources(self):
        b = example()
        b["company"]["sources"] = []
        self.assertTrue(any("company.sources" in e for e in errors_of(b)))

    def test_company_points_checked_for_claims(self):
        b = example()
        b["company"]["points"].append("업계 최고의 기술력을 가진 회사")
        self.assertTrue(any("과장" in e for e in errors_of(b)))

    def test_unknown_highlight(self):
        b = example()
        b["portfolio"]["highlights"].append("growth-300pct")
        self.assertTrue(any("숫자 카드" in e for e in errors_of(b)))


class BuildTest(unittest.TestCase):
    def test_build_creates_new_version_without_overwriting(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp)
            d1 = cp.build(EXAMPLE, out, [])
            marker = d1 / "자기소개서.txt"
            original = marker.read_text(encoding="utf-8")
            d2 = cp.build(EXAMPLE, out, [])
            self.assertNotEqual(d1, d2)
            self.assertTrue(d1.name.endswith("_v1") and d2.name.endswith("_v2"))
            self.assertEqual(marker.read_text(encoding="utf-8"), original)
            for name in ("자기소개서.txt", "자기소개서.md", "portfolio.html", "공고분석.md", "근거검토.md", "입력/brief.json", "입력/profile_snapshot.json"):
                self.assertTrue((d2 / name).exists(), name)

    def test_build_refuses_invalid_brief(self):
        b = example()
        b["cover_letter"][0]["evidence"] = ["nope"]
        with tempfile.TemporaryDirectory() as tmp:
            bad = Path(tmp) / "bad.json"
            bad.write_text(json.dumps(b, ensure_ascii=False), encoding="utf-8")
            with self.assertRaises(SystemExit):
                cp.build(bad, Path(tmp) / "out", [])
            self.assertFalse((Path(tmp) / "out").exists())

    def test_txt_contains_full_letter(self):
        b = example()
        txt = cp.render_letter_txt(b)
        for s in b["cover_letter"]:
            self.assertIn(s["heading"], txt)
            self.assertIn(s["body"].strip(), txt)


class PublishTest(unittest.TestCase):
    def test_publish_copies_and_rejects_bad_slug(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = cp.build(EXAMPLE, Path(tmp) / "out", [])
            with self.assertRaises(SystemExit):
                cp.publish(d, "x", Path(tmp))  # 화면 검수 전
            (d / "checks").mkdir()
            (d / "checks" / "검수결과.md").write_text("| 실패 | PC 넘침 |", encoding="utf-8")
            with self.assertRaises(SystemExit):
                cp.publish(d, "stalab-ax-engineer", Path(tmp))  # 실패 항목이 있으면 공개 거부
            (d / "checks" / "검수결과.md").write_text("| 통과 | PC 넘침 |", encoding="utf-8")
            with self.assertRaises(SystemExit):
                cp.publish(d, "Bad Slug!", Path(tmp))
            dst = cp.publish(d, "stalab-ax-engineer", Path(tmp))
            self.assertEqual(dst, Path(tmp) / "apply" / "stalab-ax-engineer" / "index.html")
            self.assertTrue((d / "공개주소.txt").exists())


class SkillFileTest(unittest.TestCase):
    def test_skill_frontmatter(self):
        text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
        m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
        self.assertIsNotNone(m, "SKILL.md 앞머리(frontmatter)가 없습니다")
        fields = dict(line.split(":", 1) for line in m.group(1).splitlines() if ":" in line and not line.startswith(" "))
        name = fields["name"].strip()
        self.assertRegex(name, r"^[a-z0-9-]{1,64}$")
        self.assertEqual(name, SKILL.name)
        desc = fields["description"].strip()
        self.assertTrue(0 < len(desc) <= 1024)
        for ref in re.findall(r"`((?:references|scripts|assets|examples)/[^`\s]+)`", text):
            self.assertTrue((SKILL / ref).exists(), f"SKILL.md가 가리키는 파일이 없습니다: {ref}")


if __name__ == "__main__":
    unittest.main()
