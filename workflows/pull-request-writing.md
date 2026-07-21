# Pull Request Writing

PR 본문은 변경 파일 목록이 아니라 reviewer가 변경 의도, API 계약, DB 영향, 검증 상태, 남은 리스크를 빠르게 판단하게 하는 문서입니다.

## Principles

- GitHub Issue 기반으로 씁니다. 이슈가 있다면 `close #ISSUE_NUMBER`로 연결합니다.
- 구현 의도를 설명합니다. 무엇을 바꿨는지보다 왜 그 구조를 택했는지와 어떤 API/DB 리스크를 줄였는지를 적습니다.
- 실제 검증과 계획된 검증을 분리합니다. 실행하지 않은 명령은 체크하거나 성공처럼 쓰지 않습니다.
- reviewer가 봐야 할 위험 지점을 숨기지 않습니다.
- docs-only, API-only, Prisma-only, refactor-only PR은 그 범위를 명확히 적고 없는 증거를 만들지 않습니다.
- GitHub 화면에서 보이는 approval, check 상태는 로컬 명령 실행 결과와 분리해 씁니다.

## Template

PR 본문은 `.github/pull_request_template.md`의 섹션을 유지합니다.

```markdown
## ISSUE 🔗

close #ISSUE_NUMBER

<br><br>

## Background 🧭

왜 이 작업이 필요한지 설명합니다.

<br><br>

## What is this PR? 🔍

변경된 도메인, 모듈, endpoint와 구현 흐름을 설명합니다.

<br><br>

## API Spec 📝

추가/변경된 endpoint, request/response 스펙 또는 Swagger 링크를 적습니다.

<br><br>

## DB Migration 🗄️

Prisma migration 포함 여부와 배포 시 실행 필요 여부를 적습니다.

- [ ] 이번 PR에 Prisma migration이 포함되어 있습니다.
- [ ] migration이 필요 없는 작업입니다.

<br><br>

## Test Checklist ✔

실제 실행한 검증만 체크합니다.

- [ ] `git diff --check`
- [ ] `npm run build`
- [ ] `npm run test`
```

## ISSUE

GitHub Issue 번호를 적고, merge 시 자동 close가 필요한 경우 `close #ISSUE_NUMBER`를 사용합니다.

```markdown
close #5
```

여러 이슈가 연결되면 주 이슈와 관련 이슈를 구분합니다.

```markdown
close #5
related #8
```

사소한 변경으로 이슈 없이 진행한다면 branch, commit, PR 제목에서 이슈 번호 대신 `no-issue`를 사용하고, PR 본문에는 이유를 짧게 적습니다.

## Background

`Background`는 구현 결과보다 먼저 의도와 판단 근거를 설명하는 섹션입니다.

좋은 흐름:

1. 기존 동작 또는 기존 구조를 설명합니다.
2. 그 구조에서 발생한 문제나 한계를 적습니다.
3. 이 작업이 API 사용자, DB 데이터, 테스트 안정성에 왜 필요한지 적습니다.
4. 이번 PR에서 선택한 접근을 설명합니다.
5. 의도적으로 제외한 범위가 있다면 적습니다.

예시:

```text
추천 경로 상세 조회 API는 존재하지 않는 route id에 대해 빈 응답과 서버 오류를 구분하기 어려웠습니다.
이번 작업에서는 service 계층에서 조회 결과 없음 케이스를 명시적으로 처리하고, controller는 HTTP 경로와 파라미터 위임만 담당하도록 유지했습니다.
이를 통해 API 사용자는 404 응답을 안정적으로 받을 수 있고, repository는 Prisma 조회 책임만 갖도록 경계를 분리했습니다.
```

## What Is This PR?

단순 변경 파일 목록으로 끝내지 않습니다. 변경된 도메인과 계층별 역할을 문단형으로 씁니다.

포함하면 좋은 내용:

- 변경한 도메인 또는 모듈
- 추가/변경된 endpoint
- Controller, Service, Repository, DTO 중 바뀐 책임
- 예외 처리 또는 validation 변화
- 테스트 추가/수정 범위

피해야 할 문장:

```text
- 파일 수정
- 테스트 추가
- build 성공
```

좋은 문장:

```text
`route` 모듈의 상세 조회 흐름을 정리했습니다. Controller는 `recommended-routes/:id` 요청을 service로 위임하고, Service는 id 정규화와 리소스 없음 예외를 처리합니다. Repository는 필요한 필드만 select로 조회하도록 유지해 API 응답 DTO 경계를 명확히 했습니다.
```

## API Spec

API 변경이 있으면 endpoint, request, response, status code를 적습니다. 변경이 없다면 `API 변경 없음`이라고 명시합니다.

예시:

````markdown
### GET /recommended-routes/:id

Request:

- path param: `id` route id

Response 200:

```json
{
  "id": 1,
  "title": "제주 동부 하루 코스"
}
```

Error:

- `400 Bad Request`: id 형식이 잘못된 경우
- `404 Not Found`: 추천 경로가 없는 경우
````

Swagger가 있다면 링크를 첨부하고, 아직 없다면 PR 본문에 최소 request/response 계약을 직접 적습니다.

## DB Migration

Prisma 변경이 있으면 아래를 명시합니다.

- 변경된 model, field, enum, index, relation
- migration 파일명
- 배포 시 migration 실행 필요 여부
- 기존 데이터 backfill 또는 nullable 전략
- rollback 시 주의할 점

예시:

```markdown
- [x] 이번 PR에 Prisma migration이 포함되어 있습니다.
- migration: `prisma/migrations/20260720080145_add_place_operating_hours/migration.sql`
- 배포 시 `prisma migrate deploy` 실행이 필요합니다.
- 기존 row에는 nullable 컬럼으로 추가되어 backfill은 필요하지 않습니다.
```

Prisma 변경이 없으면 아래처럼 씁니다.

```markdown
- [x] migration이 필요 없는 작업입니다.
- Prisma schema와 migration 변경은 없습니다.
```

## Test Checklist

실제 실행한 검증만 체크합니다. 실행하지 못한 명령은 unchecked로 두거나 이유를 적습니다.

문서-only 변경:

```markdown
- [x] `git diff --check`
```

일반 코드 변경:

```markdown
- [x] `npm run build`
- [x] `npm run test`
```

API 변경:

```markdown
- [x] `npm run build`
- [x] `npm run test`
```

Prisma 변경:

```markdown
- [x] `npx prisma validate`
- [x] `npx prisma migrate status`
- [x] `npm run build`
- [x] `npm run test`
```

`npm run lint`를 실행했다면 `--fix`로 인해 파일이 수정됐는지 확인하고, 수정이 발생했다면 그 변경도 PR 범위에 포함합니다.

## Evidence

관찰한 근거만 적습니다.

API:

- 확인한 endpoint
- status code
- request/response body
- validation 또는 error response

Data:

- Prisma query 변경
- migration 파일
- seed 또는 fixture 변경
- 기존 데이터 영향

Logs / CI:

- 실제 실행한 명령
- CI run 또는 action URL
- 실패가 있으면 원인과 남은 처리

PR status:

- draft / ready 여부
- base branch, head branch, head commit
- unresolved review thread
- merge conflict 또는 mergeability blocker

## PR Point

Reviewer가 중점적으로 봐야 할 지점을 좁혀 줍니다.

예시:

- Controller와 Service 책임 분리가 적절한지
- Repository select가 API 응답에 필요한 필드만 조회하는지
- DTO 변환에서 `DateTime`, `Decimal`, `Json` 직렬화 문제가 없는지
- 리소스 없음과 잘못된 입력 예외가 API 계약에 맞는지
- migration이 기존 데이터에 안전한지
- docs-only 변경이라 실제 API 동작을 바꾸지 않았는지

## Risk / Follow-up

아래 항목은 PR 본문에 명시합니다.

- 현재 구현이 기대는 정책 또는 전제
- 이후 DB schema 변경 시 다시 봐야 할 코드
- 의도적으로 제외한 범위
- 임시 fixture, mock, TODO
- 아직 실행하지 못한 테스트와 이유

## Docs-only PR

docs-only PR은 아래처럼 명확히 적습니다.

- Background: 어떤 기준이 불명확했는지
- What is this PR?: 어떤 문서와 template을 갱신했는지
- API Spec: API 변경 없음
- DB Migration: migration 필요 없음
- Test Checklist: `git diff --check`
- Risk / Follow-up: 실제 코드 동작 검증이 필요 없는 이유
