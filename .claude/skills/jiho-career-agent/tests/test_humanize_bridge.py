"""humanize_bridge.py 테스트. 실행: python3 -m unittest discover -s .claude/skills/jiho-career-agent/tests"""
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import humanize_bridge as hb  # noqa: E402

BEFORE = [("첫 소제목", "Claude Code로 29항목을 검사했고, 사흘 동안 썼습니다."),
          ("둘째 소제목", "13개 도구 중 필요한 것을 골랐습니다. ⟦지어낸 장면.⟧")]


class BridgeTest(unittest.TestCase):
    def test_style_only_change_passes(self):
        after = [("첫 소제목", "Claude Code로 29항목을 검사했고 사흘 동안 썼습니다."), BEFORE[1]]
        self.assertEqual(hb.compare(BEFORE, after), [])

    def test_number_change_rejected(self):
        after = [("첫 소제목", "Claude Code로 30항목을 검사했습니다."), BEFORE[1]]
        self.assertTrue(any("토큰" in e for e in hb.compare(BEFORE, after)))

    def test_heading_and_marker_and_count(self):
        self.assertTrue(hb.compare(BEFORE, BEFORE[:1]))
        after = [("다른 소제목", BEFORE[0][1]), ("둘째 소제목", "13개 도구 중 필요한 것을 골랐습니다. 지어낸 장면.")]
        errs = hb.compare(BEFORE, after)
        self.assertTrue(any("소제목" in e for e in errs))
        self.assertTrue(any("⟦" in e for e in errs))

    def test_blocks_strip_summary(self):
        text = "가\n나\n\n다\n라\n\n<!-- HUMANIZE-SUMMARY v1\nx -->"
        self.assertEqual(hb.blocks(hb.strip_summary(text)), [("가", "나"), ("다", "라")])


if __name__ == "__main__":
    unittest.main()
