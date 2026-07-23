# Claude Code Hooks

이 문서는 OISO-BE에서 Claude Code hooks를 도입할 때의 기준을 정의합니다.

## Default Policy

Repo에는 기본적으로 hook을 두지 않습니다.

Hook은 Claude Code lifecycle(`PreToolUse`, `PostToolUse` 등) 중 정해진 시점에 shell command, HTTP endpoint, 또는 prompt를 실행하므로, 잘못 만들면 모든 세션에 비용과 실패 지점을 추가합니다. 문서나 `CLAUDE.md`/`AGENTS.md` 지침으로 충분한 규칙은 hook으로 만들지 않습니다.

## When To Add Hooks

다음처럼 반복적이고 안전성이 중요한 정책만 hook 후보입니다.

- destructive shell command 차단 또는 확인 (`PreToolUse` + `Bash` matcher)
- `.env`, DB URL, API key, token 전송 방지
- 문서 변경 PR에서 필수 검증 누락 경고
- Prisma schema 변경 시 migration 확인 안내
- lockfile 변경 시 package manager 확인 안내
- 특정 디렉터리 작업 시 필요한 로컬 검증 안내

## Recommended First Hook

도입한다면 첫 hook은 `PreToolUse` 기반 destructive command guard로 제한합니다.

차단 또는 확인 후보:

- `git reset --hard`
- `git clean -fd`
- `git checkout --`
- recursive delete (`rm -rf`)
- `.env` 삭제 또는 출력
- `prisma/migrations/` 삭제
- lockfile 삭제 또는 강제 재생성

## Repo Shape

Hook을 추가할 때는 `.claude/settings.json`의 `hooks` 항목에 등록하고, 실제 스크립트는 다음 위치에 둡니다.

```text
.claude/
  settings.json
  hooks/
    block-destructive-bash.sh
```

예시 (`PreToolUse` + `Bash` matcher):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PROJECT_DIR}/.claude/hooks/block-destructive-bash.sh"
          }
        ]
      }
    ]
  }
}
```

## Review Rule

- 새 hook은 PR에서 동작 목적, event(`PreToolUse` 등), matcher, 실패 시 처리 방식을 설명합니다.
- hook script는 작고 deterministic해야 합니다.
- 네트워크 호출, 긴 실행, 사용자 데이터 전송은 기본 금지합니다. 필요하면 `async` hook으로 분리합니다.
- secret 값을 로그나 Claude 응답에 남기지 않습니다.
- hook 도입 후 세션 시작 시 표시되는 trust 승인 상태를 확인합니다.

## Verification

hook을 추가하거나 수정한 뒤 확인할 것:

```bash
git diff --check
```

코드 hook을 추가했다면 hook 자체의 단위 검증 또는 dry-run 결과를 PR에 적습니다.

## Official References

- [Hooks reference](https://code.claude.com/docs/en/hooks)
- [Automate actions with hooks](https://code.claude.com/docs/en/hooks-guide)
