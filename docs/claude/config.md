# Claude Code Config

이 문서는 OISO-BE에서 Claude Code 설정을 어디에 둘지 정의합니다.

## Default Policy

Repo에는 기본적으로 `.claude/settings.json`을 두지 않습니다.

개인 선호, 모델 선택, 권한 승인 방식 같은 로컬 설정은 사용자 전역 설정에 둡니다.

```text
~/.claude/settings.json
~/.claude/CLAUDE.md
```

OISO-BE의 팀 공통 기준은 Claude Code 설정이 아니라 저장소 파일과 문서에서 확인합니다.

```text
CLAUDE.md (@AGENTS.md import)
package.json
nest-cli.json
tsconfig.json
tsconfig.build.json
prisma/schema.prisma
docs/conventions/
workflows/
```

DB 접속 정보, API key, token, 로컬 secret은 repo에 커밋하지 않습니다. 로컬 실행에는 `.env`를 사용할 수 있지만, Claude Code는 `.env` 값을 읽거나 출력하지 않습니다. 예시가 필요하면 secret 값 없이 `.env.example`만 둡니다.

## When To Add Repo Settings

다음 조건 중 하나가 있을 때만 repo-local `.claude/settings.json`을 검토합니다.

- 모든 팀원이 같은 권한(`permissions.allow`/`permissions.deny`) 규칙을 공유해야 합니다.
- repo-local MCP server(`.mcp.json`) 또는 팀 공통 hook이 필요합니다.
- 팀 공통 subagent, 통계, 또는 워크플로 관련 설정을 강제해야 합니다.

이 경우 위치는 다음 중 하나를 사용합니다.

```text
.claude/settings.json          # 팀 공통, git에 커밋
.claude/settings.local.json    # 개인 로컬 override, gitignore 대상
```

개인 실험이나 이 저장소에서만 쓰는 override는 `.claude/settings.json`이 아니라 `.claude/settings.local.json`에 둡니다. Claude Code가 이 파일을 직접 만들면 자동으로 gitignore 처리하지만, 직접 만들었다면 `.gitignore`에 추가합니다.

## Responsibility Split

| Setting type | Location | Rule |
| --- | --- | --- |
| model preference | `~/.claude/settings.json` | 개인 설정 |
| permission/approval preference | `~/.claude/settings.json` 또는 `.claude/settings.local.json` | 개인 설정, 팀 합의 전 `.claude/settings.json`(공유) 금지 |
| local DB URL / secret | `.env` 또는 repo 밖 개인 env file | 개인 secret, 값 읽기/출력 금지 |
| package scripts | `package.json` | 팀 공통 실행 기준 |
| Nest config | `nest-cli.json`, `tsconfig*.json` | 팀 공통 빌드 기준 |
| Prisma schema | `prisma/schema.prisma` | DB 모델 source of truth |
| personal hook policy | `~/.claude/settings.json`의 `hooks` 항목 | 개인 자동화, repo 금지 |
| shared hook policy | `.claude/settings.json`의 `hooks` 항목 | 팀 정책이 있을 때만 |
| shared MCP servers | `.mcp.json` | repo 공통 MCP 서버가 필요할 때만 |
| repo-local skill | `.claude/skills/*/SKILL.md` | 팀 공통, git에 커밋 |

## Package Manager Note

현재 저장소에는 `package-lock.json`과 `pnpm-lock.yaml`이 함께 있습니다. 의존성 추가, lockfile 갱신, install 명령 실행 전에는 어떤 package manager를 기준으로 할지 확인합니다.

문서와 일반 코드 변경만으로는 lockfile을 수정하지 않습니다.

## Git Identity Guard

개인 장비에서 Claude Code가 이 repo의 commit 또는 push 명령을 실행할 때는 로컬 정책(예: 개인 `~/.claude/settings.json`의 hook 또는 사용자별 git hook)으로 본인 계정 기준을 강제할 수 있습니다.

이 정책은 협업자에게 전파되지 않도록 해야 하므로 repo의 `.githooks/`나 `core.hooksPath`로 관리하지 않습니다. 팀 전체에 적용해야 하는 hook은 별도 합의 후 `.claude/settings.json`의 `hooks` 항목에 추가하고, PR에서 영향 범위와 trust 요구사항을 명시합니다.

## Verification

설정을 추가하거나 바꾼 뒤 확인할 것:

```bash
git diff --check
```

repo-local `.claude/settings.json`을 추가했다면 PR 설명에 팀 공통 정책으로 둔 이유를 적습니다.
