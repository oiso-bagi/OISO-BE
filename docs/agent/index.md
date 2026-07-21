# Agent Harness

이 디렉터리는 OISO-BE에서 Codex와 다른 coding agent가 참고하는 문서 운영 기준을 정리합니다.

OISO-BE는 NestJS 11, TypeScript, Prisma 5, PostgreSQL, Jest 기반의 단일 백엔드 API 저장소입니다.

## Layer Model

| Layer | Source of truth | Role |
| --- | --- | --- |
| Entry point | `AGENTS.md` | agent가 먼저 읽는 프로젝트별 작업 원칙 |
| Project guide | `README.md`, `package.json`, `prisma/schema.prisma` | 프로젝트 실행, 의존성, DB 모델 확인 |
| Conventions | `docs/conventions/git.md`, `docs/conventions/coding.md` | Git, PR, NestJS/Prisma 코딩 기준 |
| Workflows | `workflows/*.md` | PR 작성, 체크리스트, CI 운영 기준 |
| Agent policy | `docs/agent/*.md` | agent 문서, config, hook 운영 기준 |
| GitHub automation | `.github/**` | Issue/PR template 기준 |
| Runtime source | `package.json`, `tsconfig*.json`, `nest-cli.json` | Node/Nest/TypeScript 실행 기준 |

## Documents

- [Indexing](./indexing.md): agent가 어떤 문서를 언제 참고해야 하는지 설명합니다.
- [Config](./config.md): 전역 Codex 설정과 repo-local 설정의 책임 범위를 설명합니다.
- [Hooks](./hooks.md): repo-local hook 도입 기준과 안전 원칙을 설명합니다.

## Current Shape

```text
AGENTS.md
.github/
  ISSUE_TEMPLATE/
  pull_request_template.md
docs/
  agent/
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
src/
  prisma/
  route/
test/
prisma/
  schema.prisma
  migrations/
package.json
```

`.agents/` 디렉터리는 현재 비어 있습니다. repo-local skill이 실제로 필요해질 때만 `.agents/skills/*/SKILL.md` 구조를 추가합니다.

## Maintenance Rule

- `AGENTS.md`는 agent가 작업 전 확인해야 하는 짧은 허브로 유지합니다.
- 상세 Git 규칙은 `docs/conventions/git.md`에 둡니다.
- 상세 코딩 규칙은 `docs/conventions/coding.md`에 둡니다.
- PR 작성, CI, 체크리스트 기준은 `workflows/`에 둡니다.
- NestJS 계층 책임은 Controller, Service, Repository, DTO 경계를 기준으로 설명합니다.
- Prisma schema, migration, seed 변경 기준은 `docs/conventions/coding.md`와 실제 `prisma/` 파일을 우선합니다.
- GitHub Issue 번호 기반 branch, commit, PR 제목 규칙은 `docs/conventions/git.md`를 따릅니다.
- 개인 선호 설정은 repo에 커밋하지 않고 사용자 전역 Codex config에 둡니다.
- repo-local config와 hook은 팀 공통 정책이 필요할 때만 추가합니다.
- `.env` 값과 로컬 DB secret은 읽거나 출력하지 않습니다.
- `package-lock.json`과 `pnpm-lock.yaml`이 함께 있으므로 의존성 작업 전 사용할 package manager를 확인합니다.

## Refresh Checklist

agent 문서를 갱신할 때는 아래 순서로 확인합니다.

- 실제 구조는 `src/`, `test/`, `prisma/`, `.github/`, `workflows/`에서 먼저 확인합니다.
- 실행 스크립트와 package manager 정보는 `package.json`을 확인합니다.
- Git 규칙은 `docs/conventions/git.md`와 `.github/pull_request_template.md`가 같은 기준을 설명하는지 확인합니다.
- 코딩 규칙은 `docs/conventions/coding.md`와 실제 NestJS 계층 구조가 어긋나지 않는지 확인합니다.
- 문서-only 변경은 최소 `git diff --check`로 공백 문제를 확인합니다.
- 코드나 Prisma 변경이 포함되면 변경 범위에 따라 `npm run build`, `npm run test`, `npm run test:e2e`, `npm run lint`, `npx prisma validate`를 검토합니다.

## Official References

- [AGENTS.md](https://developers.openai.com/codex/guides/agents-md)
- [Skills](https://developers.openai.com/codex/skills)
- [Config basics](https://developers.openai.com/codex/config-basic)
- [Hooks](https://developers.openai.com/codex/hooks)
