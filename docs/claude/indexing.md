# Claude Code Indexing

이 문서는 OISO-BE의 agent 문서가 Claude Code에 어떻게 노출되는지 정의합니다.

## Automatically Loaded

Claude Code는 세션 시작 시 현재 작업 디렉터리에서 저장소 루트까지 각 경로의 `CLAUDE.md`/`CLAUDE.local.md`를 읽어 하나로 합칩니다. 더 가까운(작업 디렉터리에 가까운) 지침이 나중에 읽혀 더 우선합니다.

- 전역: `~/.claude/CLAUDE.md`
- 프로젝트: repo root의 `CLAUDE.md` 또는 `.claude/CLAUDE.md`
- 로컬(개인, gitignore 대상): `CLAUDE.local.md`
- 하위 디렉터리의 `CLAUDE.md`/`CLAUDE.local.md`는 Claude가 그 디렉터리 파일을 읽을 때 필요에 따라 로드됩니다.

Claude Code는 `AGENTS.md`를 직접 읽지 않습니다. OISO-BE는 이미 Codex용 `AGENTS.md`를 갖고 있으므로, 루트 `CLAUDE.md`에서 `@AGENTS.md`로 import하여 두 agent가 같은 프로젝트 원칙을 공유합니다.

```markdown
@AGENTS.md

## Claude Code 전용 사항
...
```

OISO-BE의 현재 자동 로드 지침:

```text
CLAUDE.md  (→ @AGENTS.md import 포함)
```

`CLAUDE.md`는 상세 설명서가 아니라 agent entrypoint입니다. 프로젝트 개요, 작업 원칙, 금지 사항, 필수 검증 기준은 import된 `AGENTS.md`가 담당하고, `CLAUDE.md`에는 Claude Code 전용 사항만 추가로 남깁니다.

## Source Layers

| Path | Indexed as | Rule |
| --- | --- | --- |
| `CLAUDE.md` | 자동 instruction entrypoint | `@AGENTS.md` import + Claude 전용 사항만 둡니다. |
| `AGENTS.md` | import 대상 | Codex와 공유하는 프로젝트 원칙의 source of truth입니다. |
| `README.md` | 사람용 repo entrypoint | 프로젝트 소개와 빠른 시작을 둡니다. |
| `docs/conventions/git.md` | Git convention | Issue, branch, commit, PR 제목 규칙을 둡니다. (Codex와 공유) |
| `docs/conventions/coding.md` | Coding convention | NestJS, Prisma, DTO, 테스트 기준을 둡니다. (Codex와 공유) |
| `docs/claude/*` | agent harness policy | Claude Code 인덱싱, config, hook 책임을 설명합니다. |
| `docs/agent/*` | agent harness policy (Codex) | Codex 인덱싱, config, hook 책임을 설명합니다. |
| `workflows/*` | workflow guide | PR 작성, 체크리스트, CI 기준을 둡니다. (Codex와 공유) |
| `.github/*` | GitHub templates | Issue/PR template 기준을 둡니다. |
| `src/**` | runtime source | 실제 NestJS 구현을 확인합니다. |
| `test/**` | test source | e2e 테스트와 테스트 설정을 확인합니다. |
| `prisma/**` | DB source | Prisma schema와 migration을 확인합니다. |
| `package.json` | scripts/package source | 실행 스크립트와 의존성 기준을 확인합니다. |

## Repo Skills

Repo-scoped Claude Code skill은 `.claude/skills` 아래에 둡니다. Codex의 `.agents/skills`와 이름과 내용을 동일하게 유지합니다.

```text
.claude/
  skills/
    backend-api-workflow/
      SKILL.md
    backend-architecture-review/
      SKILL.md
    backend-quality-verification/
      SKILL.md
    github-convention-master/
      SKILL.md
```

각 skill은 `SKILL.md` frontmatter에 `name`과 `description`을 가져야 합니다. Claude Code는 처음에는 skill의 이름과 설명(frontmatter)만 컨텍스트에 넣고, 실제로 skill이 관련 있다고 판단할 때 전체 `SKILL.md` 본문을 읽습니다.

## Referenced Documents

다음 문서는 자동 instruction chain이 아니라 `CLAUDE.md`(또는 import된 `AGENTS.md`) 또는 Claude Code가 필요할 때 참조하는 자료입니다.

- `docs/conventions/`: Git, PR, NestJS/Prisma 코딩 기준
- `docs/claude/`: Claude Code 문서, config, hook 운영 기준
- `docs/agent/`: Codex 문서, config, hook 운영 기준
- `workflows/`: PR 작성, CI, 체크리스트 기준
- `.github/`: PR template과 GitHub issue template

이 파일들은 실행 지침이 아니라 근거 문서입니다. 모든 내용을 `CLAUDE.md`에 복사하지 않고 링크와 import로 유지합니다.

## Path Rules

- 새 Claude Code 전용 agent 문서는 `docs/claude/` 아래에 추가합니다.
- 새 repo skill은 `.claude/skills/*/SKILL.md`에 두고, Codex용 `.agents/skills/*/SKILL.md`와 이름/내용을 맞춥니다.
- `skills/` 루트 디렉터리는 사용하지 않습니다.
- `.claude/skills` 아래에 skill을 중첩 그룹으로 만들지 않습니다.
- 하위 디렉터리에 다른 규칙이 꼭 필요할 때만 해당 디렉터리에 `CLAUDE.md`를 추가합니다. (Claude Code는 하위 디렉터리 `CLAUDE.md`도 필요 시 자동으로 읽습니다.)
- 하위 `CLAUDE.md`에는 root 문서의 긴 규칙을 복사하지 않고, local 추가 규칙만 둡니다.
- runtime, package manager, 테스트 명령은 Claude skill이나 설정에 고정하지 않고 `package.json`을 참조합니다.

## Verification

문서 인덱싱을 바꾼 뒤 확인할 것:

```bash
rg --files -g "CLAUDE.md" -g "CLAUDE.local.md" -g "AGENTS.md"
rg -n "OISO-BE|OISO|recommended-routes|OISO-[0-9]+|/recommended-routes|src/route|prisma/schema.prisma" CLAUDE.md AGENTS.md docs workflows .github
git diff --check
```

코드나 Prisma 변경이 함께 있으면 변경 범위에 따라 아래 명령을 추가로 검토합니다.

```bash
npm run build
npm run test
npm run test:e2e
npm run lint
npx prisma validate
npx prisma migrate status
```

Claude Code 인식 문제가 있으면 `/context`로 실제 로드된 memory 파일을 확인하고, 필요하면 세션을 재시작합니다.

## Official References

- [CLAUDE.md and memory](https://code.claude.com/docs/en/memory)
- [Skills](https://code.claude.com/docs/en/skills)
