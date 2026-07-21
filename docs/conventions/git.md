# Git Convention

## Branch

```text
prefix/{scope}/{ISSUE_NUMBER}-work-summary
```

Examples:

```text
chore/root/1-nest-cli-initial-setup
feat/auth/5-login-api
feat/user/6-user-signup-api
fix/order/9-order-status-bug
docs/root/3-readme
```

설정, 문서, CI, 패키지 변경은 `chore` 또는 `docs`를 우선 사용합니다.

## Issue

작업 시작 전 GitHub Issue를 먼저 생성하고, 발급된 이슈 번호를 branch, commit, PR 제목에 동일하게 사용합니다.

- 사소한 변경(오타, 간단한 설정 수정)은 이슈 없이 진행할 수 있으며, 이 경우 커밋/PR에는 이슈 번호 대신 `no-issue`로 표기합니다.

## Commit

```text
prefix(scope): #ISSUE_NUMBER work summary

body
```

`scope`는 변경된 도메인/모듈 단위를 적습니다. `#ISSUE_NUMBER`는 GitHub에서 자동으로 해당 이슈에 링크됩니다.

Examples:

```text
chore(root): #1 Nest CLI 초기 세팅 및 ESLint/Prettier 구성

feat(auth): #5 로그인 API 구현

feat(user): #6 회원가입 API 구현

fix(order): #9 주문 상태 업데이트 버그 수정

chore(prisma): #7 User, Order 스키마 초기 작성

docs(root): #3 README 및 API 문서 작성
```

## Scope

| Scope      | Use when                                                           |
| ---------- | ------------------------------------------------------------------ |
| `root`     | 프로젝트 전역 설정, package manager, CI, Nest 부트스트랩 설정 변경 |
| `auth`     | 인증/인가(로그인, 회원가입, 토큰) 관련 모듈 변경                   |
| `user`     | 사용자 도메인 모듈 변경                                            |
| `{domain}` | 그 외 도메인 모듈은 실제 모듈 폴더명(`order`, `product` 등)을 사용 |
| `common`   | 공통 guard, interceptor, filter, decorator, pipe 변경              |
| `prisma`   | Prisma schema, migration, seed 변경                                |
| `docs`     | 문서(`docs/*`, README 등) 변경                                     |
| `github`   | `.github/*` template, workflow 변경                                |

여러 도메인이 함께 바뀌는 경우 가장 중요한 변경 범위를 scope로 잡고, 나머지는 body에 적습니다. 서로 관련 없는 변경이면 커밋을 나눕니다.

## Prefix

| Prefix     | Description                             |
| ---------- | --------------------------------------- |
| `feat`     | 새로운 기능 추가                        |
| `refactor` | 코드 리팩토링                           |
| `fix`      | 버그 수정                               |
| `style`    | 코드 동작 변경이 없는 formatting 변경   |
| `name`     | 파일 또는 폴더명 수정                   |
| `file`     | 파일 또는 폴더 이동                     |
| `remove`   | 파일 삭제만 수행                        |
| `comment`  | 필요한 주석 추가 및 변경                |
| `docs`     | 문서 수정                               |
| `chore`    | 패키지 매니저, 설정, 기타 작업          |
| `test`     | 테스트 코드 추가 및 수정                |

## PR

- PR 제목은 `prefix: work summary (#ISSUE_NUMBER)` 형식을 사용합니다.
- `prefix`는 소문자로 적습니다.

Example:

```text
feat: 로그인 API 구현 (#5)
feat: 회원가입 API 구현 (#6)
fix: 주문 상태 업데이트 버그 수정 (#9)
```

- PR 본문은 `.github/pull_request_template.md`를 기준으로 작성합니다.
- `ISSUE`에는 GitHub issue 연결을 명시합니다. (`close #5` 형식이면 머지 시 이슈가 자동으로 닫힙니다.)
- `Background`에는 왜 이 작업이 필요한지 적습니다.
- `What is this PR?`에는 변경된 도메인/endpoint를 구체적으로 적습니다.
- `API Spec`에는 추가/변경된 endpoint의 요청/응답 스펙 또는 Swagger 링크를 첨부합니다.
- `DB Migration`에는 Prisma 마이그레이션 포함 여부와 배포 시 실행 필요 여부를 명시합니다.
- `Test Checklist`에는 실제 실행한 검증(단위 테스트, E2E, Swagger 수동 테스트 등)을 적습니다.

Template:

```md
## ISSUE 🔗

<!-- ex) close #5 -->

<br><br>

## Background 🧭

<!-- 왜 이 작업이 필요한지 설명해 주세요 -->

<br><br>

## What is this PR? 🔍

<!-- 작업 내용을 설명해 주세요 -->

<br><br>

## API Spec 📝

<!-- 추가/변경된 endpoint, request/response 스펙 또는 Swagger 링크 -->

<br><br>

## DB Migration 🗄️

<!-- Prisma migration 포함 여부, 배포 시 실행 필요 여부 -->

- [ ] 이번 PR에 Prisma migration이 포함되어 있습니다.
- [ ] migration이 필요 없는 작업입니다.

<br><br>

## Test Checklist ✔

<!-- 어떤 내용을 테스트했는지/해야 하는지 -->

- [ ] TODO
- [ ] TODO
```
