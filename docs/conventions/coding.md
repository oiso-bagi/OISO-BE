# Coding Convention

## OISO-BE Import Path

- `src/**`에서 프로젝트 내부 코드를 import할 때는 `@/` 절대 alias를 사용합니다.
- 새로 작성하거나 수정하는 코드에는 `./`, `../` 상대 import를 추가하지 않습니다.
- 내부 도메인, DTO, common, prisma, guard, decorator import는 `@/`로 시작하게 작성합니다.
- Node 내장 모듈과 npm 패키지는 기존처럼 패키지명으로 import합니다.
- 기존 파일에 상대 import가 남아 있더라도, 변경하는 import부터 `@/` alias로 정리합니다. 요청 범위를 벗어나는 대규모 import 정리는 별도 작업으로 분리합니다.

```tsx
import { AuthService } from '@/auth/services/auth.service';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PrismaService } from '@/prisma/prisma.service';
```

---

## OISO-BE Endpoint And Domain Addition

- Canonical domain structure follows the current `src/auth/` module layout.
- New domains use plural responsibility folders: `controllers/`, `services/`, `repositories/`, `dto/`, and `types/`.
- Domain modules are registered from `src/app.module.ts`; each domain module wires controllers and providers like `src/auth/auth.module.ts`.
- Existing auth example:

```tsx
src/
  auth/
    controllers/
      auth.controller.ts
    dto/
      current-user-response.dto.ts
    repositories/
      auth.repository.ts
    services/
      auth.service.ts
      social-auth.service.ts
      auth-token.service.ts
      auth-cookie.service.ts
      oauth-flow.service.ts
      kakao-auth.service.ts
      google-auth.service.ts
    types/
      auth-result.types.ts
      auth-user.types.ts
      social-auth.types.ts
    auth.module.ts
```

- 새 엔드포인트를 추가하기 전에 먼저 어느 도메인 책임인지 결정합니다.
- 기존 도메인 기능이면 해당 도메인 폴더의 controller/service/repository/dto 패턴을 따릅니다.
- 새 도메인이면 `src/<domain>/` 아래에 다음 구조를 기본으로 만듭니다.

```tsx
src/
  <domain>/
    controllers/
    services/
    repositories/
    dto/
    types/
    <domain>.module.ts
```

- 새 도메인 module은 `src/app.module.ts`에 import합니다.
- Controller는 HTTP method, route, param/query/body 수집, guard/decorator, response 위임만 담당합니다.
- Service는 입력 정규화, 도메인 규칙, 신규/기존 상태 분기, 예외 처리를 담당합니다.
- Repository는 Prisma query와 DB 접근만 담당합니다.
- DTO는 외부 API 응답 계약을 고정합니다.
- 새 API는 path, method, 요청 값, 응답 DTO, 실패 케이스, 인증 필요 여부를 함께 정리한 뒤 구현합니다.
- API route prefix는 같은 도메인의 기존 controller 패턴을 우선 따릅니다. 새 인증/회원/동의성 API는 `api/v1` prefix 사용을 우선 검토합니다.

## File And Folder

| Target | Convention | Example |
| --- | --- | --- |
| 모듈 폴더 | `kebab-case` | `user-profile/` |
| Controller 파일 | `kebab-case` + `.controller.ts` | `user.controller.ts` |
| Service 파일 | `kebab-case` + `.service.ts` | `user.service.ts` |
| Module 파일 | `kebab-case` + `.module.ts` | `user.module.ts` |
| Repository 파일 | `kebab-case` + `.repository.ts` | `user.repository.ts` |
| DTO 파일 | `kebab-case` + `.dto.ts` | `create-user.dto.ts`, `update-user.dto.ts` |
| Entity / Model 파일 | `kebab-case` + `.entity.ts` | `user.entity.ts` |
| Interface/Type 파일 | `kebab-case` + `.types.ts` | `user.types.ts` |
| Guard | `kebab-case` + `.guard.ts` | `auth.guard.ts` |
| Interceptor | `kebab-case` + `.interceptor.ts` | `logging.interceptor.ts` |
| Filter | `kebab-case` + `.filter.ts` | `http-exception.filter.ts` |
| Decorator | `kebab-case` + `.decorator.ts` | `current-user.decorator.ts` |
| Pipe | `kebab-case` + `.pipe.ts` | `parse-int.pipe.ts` |
| 테스트 파일 | 대상 파일명 + `.spec.ts` | `user.service.spec.ts` |
| Class (Controller/Service 등) | `PascalCase` | `UserController`, `UserService` |

> Nest CLI 스키매틱스(`nest g module/controller/service`) 결과물과 동일한 네이밍을 그대로 따릅니다.

---

## Module Structure

<aside>
💡

- 하나의 도메인(리소스) 단위로 모듈 폴더를 구성합니다.
- 모듈 폴더 내부는 `dto/`, `entities/` (또는 Prisma 모델 참조), `repository`, `types` 등으로 하위 분리합니다.
- 공통 로직은 `common/` 또는 `shared/` 폴더에 위치시키고, 특정 도메인에 종속되지 않게 합니다.
- Prisma Client 관련 코드는 `prisma/` 모듈(전역 모듈, `@Global()`)로 분리하여 각 도메인 모듈에서 주입받아 사용합니다.

```tsx
src/
  user/
    dto/
      create-user.dto.ts
      update-user.dto.ts
    user.controller.ts
    user.service.ts
    user.repository.ts
    user.module.ts
    user.types.ts
  prisma/
    prisma.service.ts
    prisma.module.ts
  common/
    filters/
    interceptors/
    decorators/
    guards/
```

</aside>

---

## Controller

<aside>
💡

- Controller는 요청/응답 처리와 라우팅만 담당하고, 비즈니스 로직은 Service에 위임합니다.
- 라우트 경로는 kebab-case, 복수형 리소스명을 사용합니다. (`/user-profiles`)
- HTTP 메서드와 실제 동작이 일치하도록 작성합니다. (`GET` 조회, `POST` 생성, `PATCH` 부분 수정, `PUT` 전체 치환, `DELETE` 삭제)
- 요청 값 검증은 DTO + `class-validator`로 처리하고, Controller 내부에서 별도 검증 로직을 작성하지 않습니다.
- 응답 타입은 명시적으로 선언합니다. (`Promise<UserResponseDto>` 등)

```tsx
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<UserResponseDto> {
    return this.userService.findOne(id);
  }
}
```

</aside>

---

## Service

<aside>
💡

- Service는 비즈니스 로직만 담당하며, Prisma 접근은 가능한 Repository 계층으로 분리합니다. (단순 CRUD만 있는 도메인은 Service에서 직접 Prisma를 호출해도 무방하나, 팀 내 기준을 통일합니다.)
- 하나의 메서드는 하나의 책임만 갖도록 작성합니다.
- 외부에 노출되는 값은 Prisma 모델을 그대로 반환하지 않고, Response DTO로 변환하여 반환합니다.
- 예외는 Nest 내장 HTTP 예외(`NotFoundException`, `BadRequestException` 등)를 사용하고, 필요 시 커스텀 예외 클래스를 정의합니다.

```tsx
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findOne(id: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(`User(${id})를 찾을 수 없습니다.`);
    }

    return UserResponseDto.from(user);
  }
}
```

</aside>

---

## Repository (Prisma 접근 계층)

<aside>
💡

- Prisma Client 호출은 Repository 레이어로 캡슐화하여, Service가 Prisma API에 직접 의존하지 않도록 합니다.
- Repository 메서드명은 동작을 명확히 드러냅니다. (`findById`, `findManyByStatus`, `createOne`, `updateById`, `deleteById`)
- 복잡한 `where`/`include`/`select` 조건은 Repository 내부의 private 헬퍼로 분리합니다.
- 트랜잭션이 필요한 경우 `PrismaService.$transaction`을 Service 레이어에서 오케스트레이션하고, Repository는 트랜잭션 클라이언트(`Prisma.TransactionClient`)를 인자로 받을 수 있게 설계합니다.

```tsx
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number, tx: Prisma.TransactionClient = this.prisma) {
    return tx.user.findUnique({ where: { id } });
  }
}
```

</aside>

---

## DTO (Data Transfer Object)

<aside>
💡

- Request DTO는 `class-validator` / `class-transformer` 데코레이터를 사용해 유효성 검증과 타입 변환을 명시합니다.
- 생성/수정/조회(쿼리) DTO는 목적에 따라 파일과 클래스를 분리합니다. (`CreateUserDto`, `UpdateUserDto`, `GetUserQueryDto`)
- `UpdateUserDto`는 가능하면 `PartialType(CreateUserDto)`를 활용해 중복을 줄입니다.
- Response DTO는 엔티티를 그대로 노출하지 않고, 필요한 필드만 매핑하는 정적 팩토리 메서드(`from`, `of`)를 둡니다.

```tsx
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  nickname: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}

export class UserResponseDto {
  id: number;
  email: string;
  nickname: string;

  static from(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = user.id;
    dto.email = user.email;
    dto.nickname = user.nickname;
    return dto;
  }
}
```

</aside>

---

## Variable And Function

<aside>
💡

- `var`는 사용하지 않습니다.
- 재할당이 필요 없으면 `const`를 사용합니다.
- Boolean 값은 `is`, `has`, `should` 등의 prefix를 사용합니다.
- 비동기 함수는 반환 타입에 `Promise<T>`를 명시합니다.
- 문자열 조합은 template literal을 사용합니다.
- 유틸 함수는 arrow function으로 작성하고, 순수 함수로 유지합니다.
- 매직 넘버/문자열은 상수 또는 enum으로 분리합니다.
</aside>

---

## Type

<aside>
💡

- 타입 이름은 `PascalCase`를 사용합니다.
- Request/Response DTO는 `Dto` suffix, 그 외 일반 타입은 `Types` suffix를 사용합니다.
- Prisma가 생성하는 모델 타입은 그대로 사용하고, API 응답 등 확장 가능성이 있는 객체 계약은 `interface`를 우선 검토합니다.
- 열거형 값은 Prisma `enum` 또는 TypeScript `enum` 중 하나로 통일하여 중복 정의를 피합니다.
- `any` 사용을 지양하고, 불가피한 경우 `unknown` + 타입 가드를 사용합니다.
</aside>

---

## Prisma Convention

<aside>
💡

- 모델명은 `PascalCase` 단수형, 필드명은 `camelCase`를 사용합니다. (`@@map`, `@map`으로 DB 테이블/컬럼은 `snake_case` 매핑)
- 스키마 변경은 반드시 `prisma migrate dev`로 마이그레이션 파일을 생성하고, 마이그레이션 파일명은 변경 내용을 알 수 있도록 작성합니다.
- `PrismaService`는 전역 모듈로 등록하여 각 모듈에서 재선언 없이 주입받습니다.
- N+1 문제를 피하기 위해 `include`/`select`를 명시적으로 사용하고, 불필요한 필드 조회를 지양합니다.
- 여러 테이블에 걸친 원자적 작업은 `$transaction`을 사용합니다.

```tsx
model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  nickname  String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

</aside>

---

## Error Handling

<aside>
💡

- 비즈니스 예외는 Nest 내장 HTTP 예외 또는 이를 상속한 커스텀 예외로 던집니다.
- 전역 예외 필터(`AllExceptionsFilter`)를 두어 응답 포맷을 일관되게 유지합니다.
- Prisma 에러(`PrismaClientKnownRequestError` 등)는 Repository/Service 경계에서 캐치하여 도메인 예외로 변환합니다.
- 예외 메시지는 사용자에게 노출 가능한 수준으로 작성하고, 내부 구현 세부사항(쿼리, 스택 트레이스)은 로그에만 남깁니다.
</aside>

---

## Response Format

<aside>
💡

- 성공 응답은 공통 인터셉터(`TransformInterceptor`)를 통해 일관된 포맷으로 감쌉니다.
- 페이지네이션이 필요한 목록 조회는 `data`와 `meta`(총 개수, 페이지 정보)를 분리하여 반환합니다.

```tsx
{
  "data": { "id": 1, "email": "user@example.com" },
  "meta": null
}
```

</aside>

---

## Validation

<aside>
💡

- 모든 요청 DTO는 `ValidationPipe`(전역 등록, `whitelist: true`, `forbidNonWhitelisted: true`)를 통과합니다.
- 환경 변수는 `@nestjs/config` + `Joi`(또는 `zod`) 스키마로 부팅 시점에 검증합니다.
- 입력값 변환(`string` → `number` 등)은 Controller 파라미터가 아닌 DTO의 `@Transform` 데코레이터에서 처리합니다.
</aside>

---

## Testing

<aside>
💡

- 단위 테스트는 Service/Repository 단위로 작성하며, Prisma는 mock(`jest-mock-extended` 등)으로 대체합니다.
- E2E 테스트는 `supertest` + 테스트 전용 DB(또는 Prisma 트랜잭션 롤백 전략)를 사용합니다.
- 테스트 파일은 대상 파일과 동일한 위치에 `.spec.ts`로 둡니다.
</aside>

---

## ESLint / Prettier

```jsx
// .prettierrc
module.exports = {
  singleQuote: true,
  trailingComma: 'all',
  semi: true,
  printWidth: 100,
  arrowParens: 'always',
  bracketSpacing: true,
  endOfLine: 'lf',
};
```

```jsx
// 권장 eslint 플러그인
// @typescript-eslint, eslint-plugin-import, eslint-plugin-unused-imports
// import 순서: node builtin -> external -> internal(alias) -> parent/sibling -> style
```
