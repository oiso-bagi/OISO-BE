---
name: backend-quality-verification
description: OISO-BE 백엔드 변경 후 변경 범위에 맞춰 build, test, e2e, lint, Prisma validate 같은 검증 명령을 고르고 실행 결과와 미검증 위험을 정리하는 스킬입니다. Use after NestJS, Prisma, DTO, test, workflow, or documentation changes.
---

# Backend Quality Verification

## OISO-BE 추가 검증

- 새로 추가/수정한 `src/**` 내부 import가 `@/` 절대 alias를 쓰는지 확인합니다.
- 새 endpoint/domain 변경이면 controller, service, repository, DTO, module wiring이 OISO-BE 경계 규칙을 따르는지 확인합니다.
- 상대 import 점검 명령:

```bash
rg -n "from ['\"]\\.\\.?/" src
```

- 위 명령은 기존 상대 import도 찾을 수 있으므로, 변경한 파일에서 새 상대 import가 생기지 않았는지 중심으로 판단합니다.
- 새 endpoint가 있으면 `AppModule` 또는 해당 domain module wiring, controller prefix, DTO 응답 계약을 함께 확인합니다.

## 목적

변경 범위에 맞는 최소 검증을 선택하고, 실행한 검증과 남은 위험을 분리해 보고합니다.

## 먼저 확인할 것

- 변경 파일 목록
- 문서만 바뀐 변경인지, 런타임 코드가 바뀐 변경인지
- Prisma schema 또는 migration 변경 여부
- API 계약이나 DTO 변경 여부
- 테스트가 DB 상태에 의존하는지 여부

## 권장 검증

문서 또는 agent 문서만 변경:

```bash
git diff --check
```

일반 NestJS 코드 변경:

```bash
npm run build
npm run test
```

API 계약, controller, DTO, module wiring 변경:

```bash
npm run build
npm run test
npm run test:e2e
```

Prisma schema, repository, migration 변경:

```bash
npx prisma validate
npm run build
npm run test
```

PR 전 또는 넓은 변경:

```bash
npm run lint
npm run build
npm run test
npm run test:e2e
```

## 보고 형식

```markdown
## Verification Report

| Check | Status | Notes |
| --- | --- | --- |
| `npm run build` | PASS/FAIL/SKIPPED | - |

Residual risk:
- <실행하지 못한 검증과 이유>
```

## 주의

- `npm run lint`는 설정에 따라 파일을 수정할 수 있으므로 실행 전 변경 범위를 의식합니다.
- `package-lock.json`과 `pnpm-lock.yaml`이 함께 있으므로 의존성 작업 전 패키지 매니저 기준을 확인합니다.
- `.env` 값은 읽거나 출력하지 않습니다.
