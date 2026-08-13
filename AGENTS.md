# AGENTS.md

## Canonical Domain Structure

- New or expanded domains should follow the current `src/auth/` layout as the canonical NestJS pattern.
- Put HTTP handlers in `controllers/`, business rules in `services/`, Prisma access in `repositories/`, API DTOs in `dto/`, and shared domain-only types in `types/`.
- Register new domain modules in `src/app.module.ts`. Inside each domain module, wire controllers and providers like `src/auth/auth.module.ts`.

```text
src/
  <domain>/
    controllers/
    services/
    repositories/
    dto/
    types/
    <domain>.module.ts
```

## 추가 코드 작성 규칙

- 새로 추가하거나 수정하는 `src/**` 내부 import는 `@/` 절대 alias를 사용합니다.
  - 예: `import { AuthService } from '@/auth/services/auth.service';`
  - `./`, `../` 상대 import는 새 코드에 추가하지 않습니다.
  - Node 내장 모듈과 npm 패키지 import는 기존 방식대로 둡니다.
- 새 엔드포인트를 추가하기 전에 기존 도메인 확장인지 새 도메인 생성인지 먼저 결정합니다.
- 새 도메인은 `src/<domain>/` 아래에 module/controller/service/repository/dto/types 경계를 만들고 `AppModule`에 연결합니다.
- 기존 도메인의 새 API는 해당 도메인 module/controller/service/repository/DTO 패턴을 따릅니다.
- Controller는 HTTP 라우팅과 요청 값 수집만 담당하고, 도메인 규칙과 상태 분기는 Service에 둡니다.

이 문서는 OISO-BE 저장소에서 AI 에이전트가 작업할 때 따라야 할 프로젝트별 기준입니다.

## 프로젝트 개요

- OISO-BE는 NestJS 11 기반 백엔드 API 프로젝트입니다.
- TypeScript, Prisma 5, PostgreSQL, Jest를 사용합니다.
- 현재 구현된 주요 기능은 추천 여행 경로 상세 조회 API입니다.

## 현재 구조

- `src/main.ts`: NestJS 애플리케이션 진입점
- `src/app.module.ts`: 루트 모듈
- `src/route/route.controller.ts`: `recommended-routes` API 컨트롤러
- `src/route/route.service.ts`: 추천 경로 도메인 로직
- `src/route/route.repository.ts`: Prisma 기반 경로 조회
- `src/route/dto/`: API 응답 DTO
- `src/prisma/`: Prisma 모듈과 서비스
- `prisma/schema.prisma`: PostgreSQL 데이터 모델
- `prisma/migrations/`: DB 마이그레이션 SQL
- `test/`: e2e 테스트
- `.github/`: PR 및 이슈 템플릿

## 작업 원칙

- 현재 NestJS 계층 구조를 유지합니다.
- 컨트롤러는 HTTP 라우팅, 파라미터 처리, 응답 위임만 담당합니다.
- 서비스는 입력 정규화, 도메인 규칙, 예외 처리를 담당합니다.
- 리포지토리는 Prisma 쿼리와 DB 접근만 담당합니다.
- DTO는 외부 API 응답 형태를 고정하는 경계로 사용합니다.
- 기존 사용자의 변경을 되돌리지 않습니다.
- `.env` 값과 로컬 DB 비밀값을 읽거나 출력하지 않습니다.

## GitHub 작업 컨벤션

- 이 저장소에서 이슈, 브랜치, 커밋, PR 텍스트를 만들 때는 `.agents/skills/github-convention-master/SKILL.md`의 컨벤션을 우선합니다.
- 이슈, 커밋, PR 제목과 본문은 한국어로 작성합니다. 단, prefix, scope, 이슈 번호, 명령어, 코드 식별자는 컨벤션 형식을 그대로 유지합니다.
- 브랜치명은 `{prefix}/{scope}/{ISSUE_NUMBER}-work-summary` 형식을 사용합니다.
  - 예: `fix/auth/67-oauth-cors-preview`
- Codex 앱의 기본 브랜치 prefix인 `codex/`는 이 저장소의 브랜치 컨벤션보다 우선하지 않습니다.

## 코딩 규칙

- 파일명은 NestJS 관례와 현재 저장소 패턴을 따릅니다.
  - 컨트롤러: `*.controller.ts`
  - 서비스: `*.service.ts`
  - 리포지토리: `*.repository.ts`
  - 모듈: `*.module.ts`
  - DTO: `*.dto.ts`
  - 테스트: `*.spec.ts`
- Prettier 설정은 `.prettierrc` 기준입니다.
  - single quote 사용
  - trailing comma 사용
- ESLint는 `eslint.config.mjs` 기준입니다.
  - `no-explicit-any`는 꺼져 있지만, 불필요한 `any`는 피합니다.
  - floating promise와 unsafe argument 경고는 실제 런타임 위험으로 봅니다.
- `npm run lint`는 `--fix`가 포함되어 파일을 수정할 수 있으므로 실행 전 변경 범위를 의식합니다.

## API / NestJS 기준

- 새 API는 명확한 route prefix와 HTTP method를 사용합니다.
- path param, query param, body 값은 컨트롤러 또는 서비스 경계에서 검증합니다.
- 빈 문자열, 존재하지 않는 리소스, 잘못된 상태는 명시적인 NestJS 예외로 처리합니다.
- 내부 DB 오류, stack trace, 민감한 값은 API 응답으로 노출하지 않습니다.
- 컨트롤러에 Prisma 쿼리나 복잡한 비즈니스 로직을 넣지 않습니다.

## Prisma / DB 기준

- Prisma 쿼리는 가능한 리포지토리 계층에 둡니다.
- 조회 결과가 없을 수 있는 `findUnique`, `findFirst` 결과는 서비스에서 명시적으로 처리합니다.
- `select`를 우선 사용해 API에 필요한 필드만 조회합니다.
- `include`를 사용할 때는 N+1 문제와 과도한 데이터 조회를 함께 확인합니다.
- `Decimal`, `DateTime`, `Json` 필드는 API 직렬화 영향을 확인합니다.
- `schema.prisma`를 바꾸면 migration 필요 여부를 반드시 확인합니다.
- 필수 컬럼 추가, enum 변경, unique 제약 추가, 컬럼 삭제는 기존 데이터와 배포 위험을 먼저 검토합니다.
- `prisma/erd.svg`는 생성물로 보고 직접 수정하지 않습니다.

## 테스트 기준

- 단위 테스트는 `src/**/*.spec.ts`에 둡니다.
- e2e 테스트는 `test/**/*.e2e-spec.ts`에 둡니다.
- API 변경 시 성공 케이스뿐 아니라 잘못된 입력과 리소스 없음 케이스를 함께 검토합니다.
- DB 상태에 의존하는 테스트는 테스트 순서에 의존하지 않게 작성합니다.
- DTO 변환 로직이 바뀌면 DTO 테스트 또는 서비스 테스트를 함께 갱신합니다.

## 검증 명령

가능하면 변경 범위에 맞춰 아래 명령을 사용합니다.

```bash
npm run build
npm run test
npm run test:e2e
npm run test:cov
npm run lint
```

Prisma 관련 변경에는 필요에 따라 아래 명령을 사용합니다.

```bash
npx prisma validate
npx prisma migrate status
```

문서만 수정한 경우 최소한 다음을 확인합니다.

```bash
git diff --check
```

## 리뷰 및 수정 우선순위

다음 문제를 우선적으로 찾고 수정합니다.

- 실제 런타임 버그
- API 계약 깨짐
- 데이터 무결성 문제
- Prisma migration 실패 가능성
- 보안 또는 민감정보 노출
- 테스트 누락
- 현재 구조와 어긋나는 책임 분리

단순 취향, 과한 추상화, 현재 기능 범위를 벗어난 대규모 리팩터링은 피합니다.

## 생성물과 제외 대상

다음 파일이나 디렉터리는 보통 직접 수정하지 않습니다.

- `node_modules/`
- `dist/`
- `coverage/`
- `*.tsbuildinfo`
- `prisma/erd.svg`
- lockfile은 의존성 변경이 있을 때만 수정합니다.

## 현재 주의사항

- 저장소에는 `package-lock.json`과 `pnpm-lock.yaml`이 함께 있습니다. 의존성 작업 전 어떤 패키지 매니저를 기준으로 할지 확인합니다.
- 일부 기존 한글 문서와 주석은 인코딩이 깨져 보일 수 있습니다. 새로 작성하는 문서는 UTF-8 한국어로 저장합니다.
- README는 NestJS 기본 템플릿 내용이 많이 남아 있으므로, 구현 판단의 최종 근거는 실제 `src/`, `prisma/`, `package.json`을 우선합니다.
