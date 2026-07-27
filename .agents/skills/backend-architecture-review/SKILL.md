---
name: backend-architecture-review
description: OISO-BE NestJS 백엔드의 controller, service, repository, DTO, module, Prisma 책임 경계와 폴더 구조를 판단하거나 리뷰할 때 사용하는 아키텍처 점검 스킬입니다. Use when deciding where backend code should live, reviewing layering, or checking module/domain boundaries.
---

# Backend Architecture Review

## OISO-BE 도메인/Import 판단 규칙

- `src/**` 내부 프로젝트 import는 `@/` 절대 alias를 기준으로 판단합니다. 새 코드나 수정 코드에서 상대 import(`./`, `../`)가 생기면 구조상 필요한 예외인지 먼저 의심합니다.
- 새 기능이 기존 도메인의 행위인지, 새 도메인인지 먼저 결정합니다.
  - 기존 도메인의 하위 행위: 기존 module에 controller/service/repository/DTO를 추가하거나 기존 파일에 좁게 확장합니다.
  - 독립 도메인: `src/<domain>/` 폴더와 module을 만들고 `AppModule`에 import합니다.
  - 여러 도메인을 조합하는 workflow: HTTP endpoint는 사용자 행위의 주 도메인 controller에 두고, cross-domain 조합은 service에서 명시적으로 orchestration합니다.
- Controller route prefix가 도메인 경계를 흐리게 만들면 route 이름보다 module 위치를 우선 검토합니다.
- 새 endpoint 리뷰 시 HTTP path/method, controller 위치, service 책임, repository 조회 범위, DTO 응답 계약을 한 세트로 확인합니다.
- 리뷰 완료 전 신규/수정 내부 import가 `@/` 절대 alias를 사용하는지 확인합니다.

## 목적

NestJS 계층 책임과 도메인 경계를 기준으로 변경 위치와 구조가 적절한지 판단합니다.

## 기준

- Controller: HTTP route, param/query/body 수집, service 호출, 응답 위임
- Service: 입력 정규화, 도메인 규칙, 예외 처리, transaction 단위 판단
- Repository: Prisma 쿼리, DB 접근, 필요한 필드 조회
- DTO: 외부 API 응답 형태 고정, 직렬화 영향 관리
- Module: provider/controller wiring과 도메인 의존성 표현
- Prisma schema/migration: 데이터 모델과 배포 위험의 source of truth

## 점검 흐름

1. 변경이 어느 도메인에 속하는지 먼저 확인합니다.
2. 기존 가까운 도메인의 파일명, module wiring, DTO 패턴을 우선 따릅니다.
3. 새 추상화는 중복이나 복잡도를 실제로 줄일 때만 추가합니다.
4. Controller에서 DB 접근이나 복잡한 조건 분기를 제거할 수 있는지 봅니다.
5. Repository가 HTTP 예외나 API 응답 정책을 알 필요가 없는지 봅니다.
6. Prisma 모델이 외부 응답으로 그대로 새지 않는지 봅니다.
7. schema 변경은 migration과 기존 데이터 영향을 함께 판단합니다.

## 출력 형식

```markdown
## Architecture Review

- Decision:
- Rationale:
- Affected files:
- Risks:
- Verification:
```

## 완료 기준

- 현재 NestJS 계층 구조와 파일명 패턴을 유지합니다.
- API 계약, DB 접근, 도메인 규칙의 책임 위치가 분리되어 있습니다.
- 변경 범위가 요청된 기능과 검증에 필요한 범위로 제한되어 있습니다.
