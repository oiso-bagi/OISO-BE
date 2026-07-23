---
name: backend-api-workflow
description: NestJS API 엔드포인트를 구현하거나 수정할 때 controller, service, repository, DTO, 예외 처리, 테스트 범위를 정리하는 백엔드 작업 흐름입니다. Use when adding or changing OISO-BE API routes, request validation, response DTOs, Prisma reads/writes, or endpoint behavior.
---

# Backend API Workflow

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
