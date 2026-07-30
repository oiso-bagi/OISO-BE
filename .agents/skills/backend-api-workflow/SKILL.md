---
name: backend-api-workflow
description: NestJS API 엔드포인트를 구현하거나 수정할 때 controller, service, repository, DTO, 예외 처리, 테스트 범위를 정리하는 백엔드 작업 흐름입니다. Use when adding or changing OISO-BE API routes, request validation, response DTOs, Prisma reads/writes, or endpoint behavior.
---

# Backend API Workflow

## OISO-BE 추가 필수 규칙

- 새로 추가하거나 수정하는 `src/**` 코드는 프로젝트 내부 import에 상대 경로(`./`, `../`)를 쓰지 말고 `@/` 절대 alias를 사용합니다.
  - 예: `import { AuthService } from '@/auth/services/auth.service';`
  - Node 내장 모듈과 npm 패키지 import는 기존 방식 그대로 둡니다.
  - 기존 파일을 고칠 때는 내가 만지는 import부터 `@/` alias로 정리하고, 요청 범위를 벗어나는 대규모 import 정리는 별도 작업으로 분리합니다.
- 새 엔드포인트를 추가하기 전에 도메인 위치를 먼저 결정합니다.
  - 기존 도메인의 기능이면 해당 도메인 폴더의 controller/service/repository/dto 패턴을 따릅니다.
  - 새 도메인이면 `src/<domain>/` 아래에 `<domain>.module.ts`, `<domain>.controller.ts`, `<domain>.service.ts`, 필요한 경우 `<domain>.repository.ts`, `dto/`, `types/`를 만들고 `AppModule`에 모듈을 연결합니다.
  - Controller는 HTTP 라우팅과 파라미터 수집만 담당하고, 도메인 규칙과 분기는 Service에 둡니다.
- 새 API route는 명확한 resource 이름, HTTP method, 요청 값, 응답 DTO, 오류 케이스를 함께 정의합니다.
- API 경로 prefix는 같은 도메인의 기존 controller 패턴을 우선 따르고, 새 인증/회원/동의성 API는 `api/v1` prefix를 우선 검토합니다.
- 구현 완료 전 추가/수정한 내부 import가 `@/` alias인지, 새 endpoint가 올바른 domain/module/controller/service/repository/DTO 경계에 있는지 확인합니다.

## 목적

OISO-BE의 NestJS 계층 구조를 유지하면서 API 변경을 작게 구현합니다.

## 입력 확인

- HTTP method와 path
- path param, query param, body
- response shape
- 리소스 없음, 잘못된 입력, 권한/상태 오류 처리 방식
- DB 모델 또는 Prisma 쿼리 변경 여부

계약이 불명확하면 임의로 API 응답을 확정하지 말고, 기존 컨트롤러와 DTO 패턴을 먼저 확인합니다.

## 작업 흐름

1. 기존 `src/`와 `prisma/schema.prisma`에서 가까운 도메인 패턴을 찾습니다.
2. Controller는 라우팅, 파라미터 수집, 응답 위임만 담당하게 둡니다.
3. Service는 입력 정규화, 도메인 규칙, 리소스 없음/잘못된 입력 예외를 담당하게 둡니다.
4. Repository는 Prisma 쿼리와 DB 접근만 담당하게 둡니다.
5. DTO는 외부 응답 형태를 고정하는 경계로 사용합니다.
6. Prisma 조회는 필요한 필드 중심으로 `select`를 우선 검토합니다.
7. API 변경에 맞춰 단위 테스트 또는 e2e 테스트 필요 여부를 판단합니다.

## 완료 기준

- Controller에 Prisma 쿼리나 복잡한 비즈니스 로직이 없습니다.
- Service에서 nullable 조회 결과와 잘못된 입력을 명시적으로 처리합니다.
- Repository가 API 응답 shape이나 HTTP 예외 정책에 과하게 의존하지 않습니다.
- DTO 변환이 API 계약을 안정적으로 표현합니다.
- 성공, 잘못된 입력, 리소스 없음 케이스의 검증 범위를 확인했습니다.

## 예외

- `schema.prisma`를 바꾸면 migration 필요 여부와 기존 데이터 영향을 함께 확인합니다.
- 내부 DB 오류, stack trace, 민감한 값은 API 응답으로 노출하지 않습니다.
