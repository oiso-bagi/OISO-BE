@AGENTS.md

## Claude Code 전용 사항

- Claude Code는 `AGENTS.md`를 직접 읽지 않고 `CLAUDE.md`만 세션 시작 시 자동으로 읽습니다. 위 `@AGENTS.md` import로 Codex와 동일한 프로젝트 원칙을 그대로 적용받습니다.
- 이 import 덕분에 `AGENTS.md` 내용을 이 파일에 복사하지 않습니다. `AGENTS.md`가 바뀌면 이 파일도 다음 세션부터 최신 내용을 자동으로 반영합니다.
- Claude Code 전용 운영 문서는 `docs/claude/`에 있습니다. 시작점은 [`docs/claude/index.md`](./docs/claude/index.md)입니다.
- repo-local skill은 `.claude/skills/`에 있습니다. Codex의 `.agents/skills/`와 이름·내용이 동일한 4개 skill(`backend-api-workflow`, `backend-architecture-review`, `backend-quality-verification`, `github-convention-master`)을 그대로 둡니다.
- 개인 설정(모델 선택, 권한 승인 방식 등)은 `~/.claude/settings.json`에 두고 repo에 커밋하지 않습니다. 팀 공통 설정 기준은 [`docs/claude/config.md`](./docs/claude/config.md)를 따릅니다.
- repo-local hook 도입 기준은 [`docs/claude/hooks.md`](./docs/claude/hooks.md)를 따릅니다.
- `.env` 값과 로컬 DB secret은 읽거나 출력하지 않습니다.
