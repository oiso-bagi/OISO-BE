# CI

OISO-BE의 CI는 GitHub Actions 기준으로 운영합니다. 실제 workflow는 `.github/workflows/ci.yml`에 두고, 이 문서는 CI를 검토하거나 수정할 때의 기준입니다.

## Workflow

권장 workflow file:

```text
.github/workflows/ci.yml
```

Trigger:

- `pull_request`
- `push` to `main`
- `push` to `develop`
- 필요 시 `workflow_dispatch`

Runtime:

- Node.js: 프로젝트에서 합의한 LTS 버전
- package manager: 의존성 작업 전 `package-lock.json`과 `pnpm-lock.yaml` 중 기준 lockfile을 확인
- database: 테스트용 PostgreSQL service 또는 테스트 전용 DB URL 사용

Secret:

- `DATABASE_URL`은 GitHub Actions secret으로 주입합니다.
- CI에는 운영 DB가 아니라 테스트 또는 CI 전용 DB URL을 사용합니다.
- secret, token, raw `.env` 값은 CI log에 출력하지 않습니다.

## Pipeline

기본 CI는 NestJS build, lint, unit test, Prisma schema validation을 중심으로 구성합니다. DB 상태가 필요한 e2e는 기본 CI에서 제외하고, 필요할 때 테스트 DB 준비 후 별도로 실행합니다.

| Stage | Responsibility |
| --- | --- |
| `Install` | 의존성 설치와 cache 복구 |
| `Prisma validate` | `prisma/schema.prisma` 문법과 generator 설정 확인 |
| `Build` | NestJS TypeScript build 확인 |
| `Lint` | ESLint 기준 확인 |
| `Unit test` | `src/**/*.spec.ts` 단위 테스트 실행 |

권장 순서:

```bash
npm ci
npx prisma validate
npm run build
npm run lint
npm run test
```

`npm run lint`는 `--fix`가 포함되어 있으므로 CI에서는 파일 수정이 발생하지 않는지 확인해야 합니다. CI에서 자동 수정을 원하지 않으면 별도 lint check script를 추가하는 방안을 검토합니다.

## Local Verification

문서-only 변경:

```bash
git diff --check
```

일반 코드 변경:

```bash
npm run build
npm run test
```

API endpoint, controller, service, repository, DTO 변경:

```bash
npm run build
npm run test
```

Prisma schema 또는 migration 변경:

```bash
npx prisma validate
npx prisma migrate status
npm run build
npm run test
```

coverage가 필요한 변경:

```bash
npm run test:cov
```

## Package Manager

현재 저장소에는 `package-lock.json`과 `pnpm-lock.yaml`이 함께 있지만, CI의 기준 package manager는 npm입니다.

- CI는 `.github/workflows/ci.yml`의 `npm ci`와 `actions/setup-node` npm cache 설정을 기준으로 동작합니다.
- 의존성 추가, 제거, 버전 변경 시 `package-lock.json`을 반드시 함께 갱신합니다.
- `pnpm-lock.yaml`만 갱신한 변경은 CI 기준 lockfile 갱신으로 보지 않습니다.
- 문서 변경만으로 lockfile을 수정하지 않습니다.

## E2E Workflow

E2E는 테스트 DB 상태에 민감하므로 기본 CI와 분리해서 봅니다.

권장 확인 항목:

- 테스트 DB가 준비되어 있음
- `DATABASE_URL`이 테스트 전용 DB를 가리킴
- 필요한 migration이 적용되어 있음
- 테스트가 실행 순서에 의존하지 않음

명령:

```bash
npm run test:e2e
```

실패 시 확인할 것:

- DB 연결 실패인지
- migration 누락인지
- seed/test fixture 누락인지
- API 계약 변경으로 인한 assertion 실패인지

## Required Check

branch protection을 적용한다면 기본 required check는 하나의 집계 job 또는 CI workflow 전체 성공으로 둡니다.

권장 required check:

```text
CI
```

여러 job으로 분리하더라도 PR에서는 어떤 job이 실패했는지 명확히 보이게 합니다.

## When CI Fails

1. 실패한 job과 step을 먼저 확인합니다.
2. install 또는 lockfile 문제면 기준 package manager와 lockfile 변경 여부를 확인합니다.
3. Prisma validation 실패면 `prisma/schema.prisma`와 migration 변경을 먼저 확인합니다.
4. build 실패면 타입 오류, Nest module wiring, import 경로를 확인합니다.
5. unit test 실패면 변경된 service/repository/DTO 변환 로직을 확인합니다.
6. 별도 e2e job이 실패하면 테스트 DB 연결, migration, endpoint path, status code, response body를 확인합니다.

## Metrics

GitHub 저장소의 `Insights` -> `Actions Performance Metrics`에서 workflow 평균 실행 시간, queue time, failure rate를 확인합니다.

- [Viewing GitHub Actions metrics](https://docs.github.com/en/actions/how-tos/administer/view-metrics)
- [Viewing workflow run history](https://docs.github.com/en/actions/how-tos/monitor-workflows/view-workflow-run-history)
