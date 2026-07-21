# PR Checklist

PR을 만들기 전에 아래 항목을 확인합니다. PR 본문은 `.github/pull_request_template.md`와 `workflows/pull-request-writing.md`를 기준으로 작성합니다.

## Scope

- [ ] GitHub Issue를 먼저 만들고 발급된 이슈 번호를 확인함
- [ ] 브랜치 이름이 `prefix/{scope}/{ISSUE_NUMBER}-work-summary` 형식임
- [ ] 커밋 메시지가 `prefix(scope): #ISSUE_NUMBER work summary` 형식임
- [ ] PR 제목이 `prefix: work summary (#ISSUE_NUMBER)` 형식임
- [ ] 사소한 변경으로 이슈 없이 진행한다면 이슈 번호 대신 `no-issue`를 사용함
- [ ] scope가 `root`, `auth`, `user`, `route`, `common`, `prisma`, `docs`, `github` 등 실제 변경 범위와 맞음
- [ ] unrelated 변경이 섞이지 않음
- [ ] 서로 관련 없는 변경이면 커밋을 나눔

## API And Domain

- [ ] Controller는 HTTP routing, parameter 처리, 응답 위임만 담당함
- [ ] Service는 입력 정규화, 도메인 규칙, 예외 처리를 담당함
- [ ] Repository는 Prisma query와 DB 접근만 담당함
- [ ] DTO는 외부 API 응답 형태를 고정하는 경계로 사용함
- [ ] path param, query param, body 값 검증 위치가 명확함
- [ ] 빈 문자열, 잘못된 입력, 리소스 없음 케이스가 명시적인 NestJS 예외로 처리됨
- [ ] 내부 DB 오류, stack trace, 민감한 값이 API 응답으로 노출되지 않음

## Prisma And DB

- [ ] Prisma query는 가능한 repository 계층에 있음
- [ ] 조회 결과가 없을 수 있는 `findUnique`, `findFirst` 결과를 service에서 처리함
- [ ] API에 필요한 필드만 `select`로 조회하는지 검토함
- [ ] `include` 사용 시 N+1 문제와 과도한 데이터 조회를 검토함
- [ ] `Decimal`, `DateTime`, `Json` 필드의 API 직렬화 영향을 확인함
- [ ] `schema.prisma` 변경 시 migration 필요 여부를 확인함
- [ ] 필수 컬럼 추가, enum 변경, unique 제약 추가, 컬럼 삭제는 기존 데이터와 배포 위험을 검토함
- [ ] `prisma/erd.svg` 생성물을 직접 수정하지 않음

## Tests

- [ ] 성공 케이스 테스트를 확인함
- [ ] 잘못된 입력 케이스를 확인함
- [ ] 리소스 없음 케이스를 확인함
- [ ] DTO 변환 로직이 바뀌면 DTO 테스트 또는 service 테스트를 갱신함
- [ ] DB 상태에 의존하는 테스트가 실행 순서에 의존하지 않음
- [ ] e2e 테스트가 필요한 API 변경인지 검토함

## Docs

- [ ] API 계약이 바뀌면 문서 또는 PR의 `API Spec`에 endpoint, request, response를 적음
- [ ] Git 규칙 변경은 `docs/conventions/git.md`와 함께 확인함
- [ ] 코딩 규칙 변경은 `docs/conventions/coding.md`와 함께 확인함
- [ ] agent/workflow 문서 변경은 `AGENTS.md`, `docs/agent/`, `workflows/` 링크가 어긋나지 않는지 확인함

## PR Body

- [ ] `ISSUE`에 `close #ISSUE_NUMBER` 형식으로 GitHub Issue 연결을 적음
- [ ] `Background`에 왜 이 작업이 필요한지 적음
- [ ] `What is this PR?`에 변경된 도메인, 모듈, endpoint를 구체적으로 적음
- [ ] `API Spec`에 추가/변경된 endpoint의 요청/응답 스펙 또는 Swagger 링크를 적음
- [ ] `DB Migration`에 Prisma migration 포함 여부와 배포 시 실행 필요 여부를 명시함
- [ ] `Test Checklist`에 실제 실행한 검증만 체크함
- [ ] 남은 리스크나 후속 작업이 있으면 숨기지 않고 적음

## Verification

문서-only 변경:

```bash
git diff --check
```

일반 코드 변경:

```bash
npm run build
npm run test
```

API 변경:

```bash
npm run build
npm run test
```

Prisma 변경:

```bash
npx prisma validate
npx prisma migrate status
npm run build
npm run test
```

lint 확인이 필요한 변경:

```bash
npm run lint
```

`npm run lint`는 `--fix`가 포함되어 파일을 수정할 수 있으므로 실행 전 변경 범위를 확인합니다. 실제 실행하지 않은 명령은 PR 본문에서 체크하지 않습니다.

## PR Body Template

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

- [ ] `git diff --check`
- [ ] `npm run build`
- [ ] `npm run test`
```
