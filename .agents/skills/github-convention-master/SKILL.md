---
name: github-convention-master
description: OISO-BE 프로젝트의 GitHub 워크플로우 텍스트(Issue, Branch, Commit, PR) 생성을 돕는 어시스턴트 스킬입니다. Use when generating or writing GitHub Issues (feature, bug, chore), git branch commands, commit messages, or Pull Request templates.
---

# GitHub Convention Master

## 목적
당신은 OISO-BE 프로젝트의 GitHub 워크플로우 텍스트(Issue, Branch, Commit, PR) 생성을 돕는 어시스턴트입니다. 사용자가 작업을 설명하면, 요청한 단계에 맞추어 아래의 팀 컨벤션을 100% 준수하는 텍스트를 출력합니다.
`docs/conventions/git.md`를 원천 기준으로 삼고, 이 스킬은 해당 기준을 실행하기 위한 지침입니다. 두 문서가 충돌하면 `docs/conventions/git.md`를 우선합니다.

## 공통 규칙 (Prefix & Scope)
- **Prefix:**
  - `feat`: 새로운 기능 추가
  - `refactor`: 코드 리팩토링
  - `fix`: 버그 수정
  - `style`: 코드 동작 변경이 없는 formatting 변경
  - `name`: 파일 또는 폴더명 수정
  - `file`: 파일 또는 폴더 이동
  - `remove`: 파일 삭제만 수행
  - `comment`: 필요한 주석 추가 및 변경
  - `docs`: 문서 수정
  - `chore`: 패키지 매니저, 설정, CI, 기타 작업
  - `test`: 테스트 코드 추가 및 수정
- **Scope:**
  - `root`: 프로젝트 전역 설정, package manager, CI, Nest 부트스트랩
  - `auth`: 인증/인가 관련
  - `user`: 사용자 모듈
  - `{domain}`: order, product 등 실제 모듈 폴더명
  - `common`: 공통 guard, interceptor, filter 등
  - `prisma`: Prisma schema, migration, seed
  - `docs`: 문서 변경
  - `github`: .github/ 템플릿 및 워크플로우

- **언어:**
  - 이슈, 커밋, PR 제목과 본문은 한국어로 작성합니다.
  - prefix, scope, 이슈 번호, 명령어, 코드 식별자는 컨벤션 형식을 그대로 유지합니다.
- **이슈 없음 표기:**
  - 사소한 변경으로 이슈 번호가 없다면 브랜치, 커밋, PR에서 이슈 번호 대신 `no-issue`를 사용합니다.

---

## 1. Issue 요청 시 출력 형식
사용자가 작업 내용을 주며 이슈 생성을 요청하면, 작업의 성격(Prefix)을 분석하여 아래 3가지 중 알맞은 템플릿을 선택해 마크다운 코드로 출력합니다. 빈칸(TODO나 빈 줄)을 사용자의 맥락에 맞게 직접 채워서 완성된 형태로 제공하세요.

- **이슈 제목 형식:** `[PREFIX] 작업 요약`
  - Prefix는 대문자로 표기하고, 제목은 반드시 `[FIX]`, `[FEAT]`, `[CHORE]`처럼 대괄호로 감싼 prefix로 시작합니다.

### A. 새로운 기능 추가 이슈 (Prefix: feat)
```markdown
## 작업이 필요한 이유
> 왜 이 기능이 필요한지 설명해주세요. 사용자, API 클라이언트, 운영 관점의 기대 효과를 함께 적어주세요.
<br><br>

## 작업 상세 내용
- [ ] TODO
- [ ] TODO
<br><br>

## API Spec
> 추가 또는 변경될 endpoint, method, request, response, status code를 적어주세요. API 변경이 없다면 `API 변경 없음`이라고 적어주세요.
<br><br>

## DB Migration
- [ ] Prisma migration이 필요합니다.
- [ ] migration이 필요 없는 작업입니다.
<br><br>

## Test Checklist
- [ ] 단위 테스트가 필요합니다.
- [ ] e2e 테스트 검토가 필요합니다.
- [ ] 테스트 변경이 필요 없는 작업입니다.
<br><br>

## 참고 자료
> 관련 문서, API 예시, 로그, 논의 링크가 있다면 첨부해주세요.
```
### B. 버그 수정 이슈 (Prefix: fix)
```markdown
## 어떤 버그인가요?
> 어떤 문제가 발생했는지 간결하게 설명해주세요.
<br><br>

## 발생 상황
> 가능하면 Given-When-Then 형식으로 적어주세요.
- Given:
- When:
- Then:
<br><br>

## 예상 결과
> 기대했던 정상 동작, status code, response body 등을 적어주세요.
<br><br>

## 실제 결과
> 실제 status code, response body, 로그, 에러 메시지를 적어주세요. 민감한 값은 제거해주세요.
<br><br>

## 영향 범위
> 영향을 받는 endpoint, 모듈, 사용자 흐름, 데이터 범위를 적어주세요.
<br><br>

## Test Checklist
- [ ] 재현 테스트가 필요합니다.
- [ ] 회귀 테스트가 필요합니다.
- [ ] 테스트 변경이 필요 없는 작업입니다.
<br><br>

## 참고 자료
> 관련 문서, API 요청 예시, 로그, 논의 링크가 있다면 첨부해주세요.
```
### C. Chore/ 기타이슈 (Prefix: chore, docs, refactor, style, test 등)
```markdown
## 작업 유형
> 해당되는 항목을 선택해주세요.
- [ ] 설정 변경
- [ ] 문서 수정
- [ ] 리팩터링
- [ ] 테스트 정리
- [ ] CI / GitHub 설정 변경
- [ ] 기타 유지보수
<br><br>

## 작업이 필요한 이유
> 왜 이 작업이 필요한지 설명해주세요. 현재 문제와 기대 효과를 함께 적어주세요.
<br><br>

## 작업 상세 내용
- [ ] TODO
- [ ] TODO
<br><br>

## 영향 범위
> 영향을 받는 파일, 모듈, workflow, 문서를 적어주세요.
<br><br>

## DB Migration
- [ ] Prisma migration이 필요합니다.
- [ ] migration이 필요 없는 작업입니다.
<br><br>

## Test Checklist
- [ ] `git diff --check` 확인이 필요합니다.
- [ ] `npm run build` 확인이 필요합니다.
- [ ] `npm run test` 확인이 필요합니다.
- [ ] 테스트 변경이 필요 없는 작업입니다.
<br><br>

## 참고 자료
> 관련 문서, 로그, 논의 링크가 있다면 첨부해주세요.
```


## 2. Branch 요청 시 출력 형식
사용자가 이슈 번호와 작업 내용을 주면 즉시 복사/붙여넣기 할 수 있는 git CLI 명령어를 출력합니다.

형식: `git checkout -b {prefix}/{scope}/{ISSUE_NUMBER}-work-summary`
이슈 번호가 없다면 `{ISSUE_NUMBER}` 자리에 `no-issue`를 사용합니다.

## 3. Commit 요청 시 출력 형식
형식: `{prefix}({scope}): #{ISSUE_NUMBER} work summary \n\n body`

커밋 제목의 `work summary`와 본문은 한국어로 작성합니다.

주의: 사소한 변경(오타 등)으로 이슈 번호가 없다면 `#ISSUE_NUMBER` 대신 `no-issue`로 표기합니다.

## 4. PR 요청 시 출력 형식
PR 제목: `{prefix}: work summary (#{ISSUE_NUMBER})`
(주의: PR 제목의 prefix는 소문자이며 scope는 생략)
이슈 번호가 없다면 `#{ISSUE_NUMBER}` 대신 `no-issue`를 사용합니다.

PR 내용: 아래 템플릿의 주석 부분을 실제 내용으로 꼼꼼히 채워서 마크다운 코드로 출력합니다.
```markdown
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

## 동작 지침
사용자의 프롬프트를 분석하여 현재 Issue, Branch, Commit, PR 중 어느 단계의 결과물이 필요한지 파악하고, 그에 맞는 형식만 깔끔하게 코드 블록으로 감싸서 응답하세요. Issue 요청의 경우 사용자의 맥락을 분석하여 A(기능), B(버그), C(Chore/기타) 중 적합한 템플릿을 선택하여 출력합니다.
