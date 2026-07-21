# Agent Indexing

이 문서는 OISO-BE의 agent 문서가 Codex에 어떻게 노출되는지 정의합니다.

## Automatically Loaded

Codex는 작업 시작 시 `AGENTS.md` 계층을 읽습니다.

- 전역: `~/.codex/AGENTS.override.md` 또는 `~/.codex/AGENTS.md`
- 프로젝트: repo root부터 현재 작업 디렉터리까지 각 경로의 `AGENTS.override.md` 또는 `AGENTS.md`
- 하위 디렉터리 문서가 나중에 합쳐지므로 더 가까운 지침이 우선합니다.

OISO-BE의 현재 자동 로드 지침:

```text
AGENTS.md
```

`AGENTS.md`는 상세 설명서가 아니라 agent entrypoint입니다. 프로젝트 개요, 작업 원칙, 금지 사항, 필수 검증 기준만 남기고 상세 구현 규칙은 `docs/`, `workflows/`, `.github/`로 연결합니다.

## Source Layers

| Path | Indexed as | Rule |
| --- | --- | --- |
| `AGENTS.md` | 자동 instruction entrypoint | 짧은 라우팅과 필수 원칙만 둡니다. |
| `README.md` | 사람용 repo entrypoint | 프로젝트 소개와 빠른 시작을 둡니다. |
| `docs/conventions/git.md` | Git convention | Issue, branch, commit, PR 제목 규칙을 둡니다. |
| `docs/conventions/coding.md` | Coding convention | NestJS, Prisma, DTO, 테스트 기준을 둡니다. |
| `docs/agent/*` | agent harness policy | Codex 인덱싱, config, hook 책임을 설명합니다. |
| `workflows/*` | workflow guide | PR 작성, 체크리스트, CI 기준을 둡니다. |
| `.github/*` | GitHub templates | Issue/PR template 기준을 둡니다. |
| `src/**` | runtime source | 실제 NestJS 구현을 확인합니다. |
| `test/**` | test source | e2e 테스트와 테스트 설정을 확인합니다. |
| `prisma/**` | DB source | Prisma schema와 migration을 확인합니다. |
| `package.json` | scripts/package source | 실행 스크립트와 의존성 기준을 확인합니다. |

## Repo Skills

Repo-scoped Codex skill은 필요해질 때만 `.agents/skills` 아래에 둡니다.

```text
.agents/
  skills/
    <workflow-name>/
      SKILL.md
      agents/
        openai.yaml
```

현재 `.agents/`는 비어 있으므로 문서에서 존재하지 않는 skill을 전제로 하지 않습니다.

각 skill은 `SKILL.md` frontmatter에 `name`과 `description`을 가져야 합니다. Codex는 처음에는 skill의 이름, 설명, 경로만 컨텍스트에 넣고, 실제로 skill을 선택할 때 전체 `SKILL.md`를 읽습니다.

UI에서 직접 호출할 필요가 있는 skill은 같은 디렉터리 아래 `agents/openai.yaml`을 둘 수 있습니다. 이 파일은 skill 본문을 대체하지 않고 호출 prompt metadata만 담당합니다.

## Referenced Documents

다음 문서는 자동 instruction chain이 아니라 `AGENTS.md` 또는 agent가 필요할 때 참조하는 자료입니다.

- `docs/conventions/`: Git, PR, NestJS/Prisma 코딩 기준
- `docs/agent/`: agent 문서, config, hook 운영 기준
- `workflows/`: PR 작성, CI, 체크리스트 기준
- `.github/`: PR template과 GitHub issue template

이 파일들은 실행 지침이 아니라 근거 문서입니다. 모든 내용을 `AGENTS.md`에 복사하지 않고 링크로 유지합니다.

## Path Rules

- 새 agent 문서는 `docs/agent/` 아래에 추가합니다.
- 새 repo skill은 `.agents/skills/*/SKILL.md`에 둡니다.
- skill UI metadata 경로는 `.agents/skills/*/agents/openai.yaml`만 사용합니다.
- `skills/` 루트 디렉터리는 사용하지 않습니다.
- `.agents/skills` 아래에 skill을 중첩 그룹으로 만들지 않습니다.
- 하위 디렉터리에 다른 규칙이 꼭 필요할 때만 해당 디렉터리에 `AGENTS.md`를 추가합니다.
- 하위 `AGENTS.md`에는 root 문서의 긴 규칙을 복사하지 않고, local 추가 규칙만 둡니다.
- runtime, package manager, 테스트 명령은 Codex skill이나 config에 고정하지 않고 `package.json`을 참조합니다.

## Verification

문서 인덱싱을 바꾼 뒤 확인할 것:

```bash
rg --files -g "AGENTS.md" -g "AGENTS.override.md"
rg -n "OISO-BE|OISO|recommended-routes|OISO-[0-9]+|/recommended-routes|src/route|prisma/schema.prisma" AGENTS.md docs workflows .github
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

Codex 인식 문제가 있으면 Codex 세션을 재시작합니다. Codex는 새 세션을 시작할 때 instruction chain을 다시 구성합니다.

## Official References

- [AGENTS.md discovery](https://developers.openai.com/codex/guides/agents-md)
- [Skills discovery](https://developers.openai.com/codex/skills)
