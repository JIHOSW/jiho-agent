# 출처

- 원본: https://github.com/epoko77-ai/im-not-ai (MIT, LICENSE 동봉)
- 버전: v2.4.8, 커밋 e9793d75a584169108906ee5f7332b27898efef4
- 설치: `CLAUDE_HOME=<임시> ./install.sh --claude-only --copy` 결과에서 `skills/humanize-korean`(런타임 스크립트 포함)과 런타임 에이전트 3종(`.claude/agents/humanize-{monolith,diagnostician,finalizer}.md`)만 가져옴
- 이 폴더의 파일은 고치지 않는다. 지원서 스킬과의 연결은 `.claude/skills/jiho-career-agent/scripts/humanize_bridge.py`와 SKILL.md 6-1단계가 맡는다.
- 업데이트: 원본을 새로 받아 같은 방법으로 덮어쓰고 이 파일의 버전·커밋을 바꾼다.
