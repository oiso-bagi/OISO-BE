# Claude Agent Harness

이 디렉터리는 OISO-BE에서 Claude Code가 참고하는 문서 운영 기준을 정리합니다.

OISO-BE는 NestJS 11, TypeScript, Prisma 5, PostgreSQL, Jest 기반의 단일 백엔드 API 저장소입니다.

## Layer Model

| Layer | Source of truth | Role |
| --- | --- | --- |
| Entry point | `CLAUDE.md` (`@AGENTS.md` import) | Claude Code가 세션 시작 시 자동으로 읽는 프로젝트별 작업 원칙 |
| Project guide | `README.md`, `package.json`, `prisma/schema.prisma` | 프로젝트 실행, 의존성, DB 모델 확인 |
| Conventions | `docs/conventions/git.md`, `docs/conventions/coding.md` | Git, PR, NestJS/Prisma 코딩 기준 (Codex와 공유) |
| Workflows | `workflows/*.md` | PR 작성, 체크리스트, CI 운영 기준 (Codex와 공유) |
| Agent policy | `docs/claude/*.md` | Claude Code 문서, config, hook 운영 기준 |
| GitHub automation | `.github/**` | Issue/PR template 기준 |
| Runtime source | `package.json`, `tsconfig*.json`, `nest-cli.json` | Node/Nest/TypeScript 실행 기준 |

## Documents

- [Indexing](./indexing.md): Claude Code가 어떤 문서를 언제 참고해야 하는지 설명합니다.
- [Config](./config.md): 전역 Claude Code 설정과 repo-local 설정의 책임 범위를 설명합니다.
- [Hooks](./hooks.md): repo-local hook 도입 기준과 안전 원칙을 설명합니다.

## Current Shape

```text
AGENTS.md
CLAUDE.md
.github/
  ISSUE_TEMPLATE/
  pull_request_template.md
docs/
  agent/            # Codex 전용 harness 문서
    config.md
    hooks.md
    index.md
    indexing.md
  claude/           # Claude Code 전용 harness 문서
    config.md
    hooks.md
    index.md
    indexing.md
  conventions/
    coding.md
    git.md
workflows/
  ci.md
  pr-checklist.md
  pull-request-writing.md
.agents/
  skills/           # Codex repo-local skill
    backend-api-workflow/
    backend-architecture-review/
    backend-quality-verification/
    github-convention-master/
.claude/
  skills/           # Claude Code repo-local skill (Codex와 동일 내용)
    backend-api-workflow/
    backend-architecture-review/
    backend-quality-verification/
    github-convention-master/
src/
  prisma/
  route/
test/
prisma/
  schema.prisma
  migrations/
package.json
```

`.claude/skills/`에는 `.agents/skills/`와 같은 4개 skill을 동일한 이름과 내용으로 둡니다. 두 harness가 같은 기준으로 동작하도록 두 위치의 skill 내용을 어긋나지 않게 유지합니다.

## Maintenance Rule

- `CLAUDE.md`는 `@AGENTS.md`를 import하는 짧은 허브로 유지하고, Claude Code 전용 사항만 추가로 적습니다.
- `AGENTS.md`에 프로젝트 원칙을 변경하면 `CLAUDE.md`를 따로 고칠 필요가 없습니다. import가 최신 내용을 자동으로 반영합니다.
- 상세 Git/코딩 규칙은 Codex와 동일하게 `docs/conventions/`를 그대로 참조합니다. Claude 전용으로 따로 만들지 않습니다.
- PR 작성, CI, 체크리스트 기준도 Codex와 동일하게 `workflows/`를 그대로 참조합니다.
- `.claude/skills/*`와 `.agents/skills/*`는 같은 목적의 skill을 같은 이름으로 유지합니다. 한쪽만 수정하고 다른 쪽을 잊지 않도록 리뷰에서 함께 확인합니다.
- 개인 선호 설정은 repo에 커밋하지 않고 사용자 전역 `~/.claude/settings.json`에 둡니다.
- repo-local `.claude/settings.json`과 hook은 팀 공통 정책이 필요할 때만 추가합니다.
- `.env` 값과 로컬 DB secret은 읽거나 출력하지 않습니다.
- `package-lock.json`과 `pnpm-lock.yaml`이 함께 있으므로 의존성 작업 전 사용할 package manager를 확인합니다.

## Refresh Checklist

Claude Code 문서를 갱신할 때는 아래 순서로 확인합니다.

- 실제 구조는 `src/`, `test/`, `prisma/`, `.github/`, `workflows/`에서 먼저 확인합니다.
- 실행 스크립트와 package manager 정보는 `package.json`을 확인합니다.
- `CLAUDE.md`가 `AGENTS.md`를 import하고 있는지, Codex 쪽 `AGENTS.md`와 어긋나지 않는지 확인합니다.
- `.claude/skills/*`가 `.agents/skills/*`와 이름/내용이 동일한지 확인합니다.
- 문서-only 변경은 최소 `git diff --check`로 공백 문제를 확인합니다.
- 코드나 Prisma 변경이 포함되면 변경 범위에 따라 `npm run build`, `npm run test`, `npm run test:e2e`, `npm run lint`, `npx prisma validate`를 검토합니다.

## Official References

- [CLAUDE.md and memory](https://code.claude.com/docs/en/memory)
- [Settings](https://code.claude.com/docs/en/settings)
- [Hooks](https://code.claude.com/docs/en/hooks)
- [Skills](https://code.claude.com/docs/en/skills)
