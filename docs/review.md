# 🔍 명세서 vs 코드 정합성 검증 결과 (부정합 7건 + 경미 5건 100% 조치 완료 🎉)

> **대상 명세서**: [recommend-route-policy.md](./recommend-route-policy.md) + [recommend-route-architecture.md](./recommend-route-architecture.md)
> **조치 완료 일시**: 2026-07-31T01:00 KST (부정합 및 문서 기술 차이 항목 전건 조치 및 파이프라인 검증 통과)

---

## ✅ 정합 항목 요약 (PASS)

| # | 명세서 기준 | 코드 위치 | 정합 여부 |
|---|---|---|---|
| 1 | API Key 이중 인코딩 방어 `decodeURIComponent` | [seed-tour-api-test.ts:L73](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-tour-api-test.ts#L73) | ✅ |
| 2 | Google Elevation 파이프(`\|`) 일괄 Batch 수집 | [seed-tour-api-test.ts:L145-L147](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-tour-api-test.ts#L145-L147) | ✅ |
| 3 | Exponential Backoff Retry 3회 (1s→2s→4s) | [seed-tour-api-test.ts:L38-L56](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-tour-api-test.ts#L38-L56) | ✅ |
| 4 | XML/HTML 비정상 응답 방어 | [seed-tour-api-test.ts:L97-L106](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-tour-api-test.ts#L97-L106) | ✅ |
| 5 | Prisma Upsert 멱등성 (`apiSourceId` @unique) | [seed-tour-api-test.ts:L190-L197](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-tour-api-test.ts#L190-L197) + [schema.prisma:L116](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/prisma/schema.prisma#L116) | ✅ |
| 6 | `Place.elevationMeters` 고도 필드 존재 | [schema.prisma:L120](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/prisma/schema.prisma#L120) | ✅ |
| 7 | `RouteStop.elevationGainMeters` 역정규화 | [schema.prisma:L197](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/prisma/schema.prisma#L197) + [seed-recommend-routes.ts:L232](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-recommend-routes.ts#L232) | ✅ |
| 8 | 오르막 상승분만 계산 (내리막 0m) `Math.max(0, ...)` | [seed-recommend-routes.ts:L232](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-recommend-routes.ts#L232) | ✅ |
| 9 | 보행 경사 가중치 $b = 2.0$ | [seed-recommend-routes.ts:L111](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-recommend-routes.ts#L111) | ✅ |
| 10 | 난이도 수식 $D = 0.01 \times dist + b \times gain + 0.001 \times fare$ | [seed-recommend-routes.ts:L114-L117](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-recommend-routes.ts#L114-L117) | ✅ |
| 11 | 6대 마스터 테마 slug 일치 | [seed-recommend-routes.ts:L130-L136](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-recommend-routes.ts#L130-L136) | ✅ |
| 12 | `Theme` 모델 `slug` @unique + `RouteTheme` N:M | [schema.prisma:L140-L226](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/prisma/schema.prisma#L140-L226) | ✅ |
| 13 | Cron `@Cron('0 4 * * *')` 매일 04:00 | [route-congestion-cron.service.ts:L17](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/services/route-congestion-cron.service.ts#L17) | ✅ |
| 14 | `TatsCnctrRateService` API 연동 | [route-congestion-cron.service.ts:L72](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/services/route-congestion-cron.service.ts#L72) | ✅ |
| 15 | CongestionLevel 판정 (HIGH≥75, MEDIUM≥40, LOW) | [route-congestion-cron.service.ts:L99-L101](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/services/route-congestion-cron.service.ts#L99-L101) | ✅ |
| 16 | Fallback 시간대 피크타임 (12\~17 HIGH, 10\~11/18\~20 MEDIUM, 야간 LOW) | [route-congestion-cron.service.ts:L124-L136](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/services/route-congestion-cron.service.ts#L124-L136) | ✅ |
| 17 | 부동소수점 오차 방어 `Math.abs(sum - 1.0) < 0.001` | [recommend-route-request.dto.ts:L31](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/dto/recommend-route-request.dto.ts#L31) | ✅ |
| 18 | `POST /recommended-routes/recommend` 엔드포인트 | [route.controller.ts:L14](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.controller.ts#L14) + [L23](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.controller.ts#L23) | ✅ |
| 19 | Hard Filter: `estimatedCostWon <= budget` + `themes.some.slug.in` | [route.repository.ts:L97-L116](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.repository.ts#L97-L116) | ✅ |
| 20 | Take 50 후보군 | [route.repository.ts:L120](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.repository.ts#L120) | ✅ |
| 21 | 비율 오차 제곱 패널티 $W = 100$ | [route.service.ts:L84](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.service.ts#L84) | ✅ |
| 22 | 혼잡도 가감점 (LOW: +3, MEDIUM: 0, HIGH: -5) | [route.service.ts:L88-L93](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.service.ts#L88-L93) | ✅ |
| 23 | Final Score = max(0, Base - Penalty + CongestionAdj) | [route.service.ts:L95-L98](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.service.ts#L95-L98) | ✅ |
| 24 | Top 3 선별 | [route.service.ts:L116-L120](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.service.ts#L116-L120) | ✅ |
| 25 | `RouteStopResponseDto`에 `dayNumber` 필드 존재 | [recommended-route-detail-response.dto.ts:L84](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/dto/recommended-route-detail-response.dto.ts#L84) | ✅ |
| 26 | `@@index([routeType, estimatedCostWon])` 복합 인덱스 | [schema.prisma:L183](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/prisma/schema.prisma#L183) | ✅ |
| 27 | `Route` 모델 역정규화 필드 (`foodCostWon`, `experienceCostWon`, `transportCostWon`, `totalElevationGainMeters`, `totalDifficultyScore`, `tpiIndex`) | [schema.prisma:L159-L165](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/prisma/schema.prisma#L159-L165) | ✅ |
| 28 | `RouteStop.difficultyScore` 역정규화 필드 | [schema.prisma:L198](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/prisma/schema.prisma#L198) | ✅ |
| 29 | `TarRlteTarService1` API 연동 함수 존재 | [seed-recommend-routes.ts:L43-L76](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-recommend-routes.ts#L43-L76) | ✅ |
| 30 | Haversine 거리 계산 함수 | [seed-recommend-routes.ts:L81-L98](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-recommend-routes.ts#L81-L98) | ✅ |

---

## ❌ 부정합 항목 상세 (FAIL)

### 🔴 1. SEED 루트 생성 목표 수량 불일치

| 구분 | 명세서 기준 | 코드 실제 |
|---|---|---|
| **테마별 루트 수** | 테마당 **5개** 코스 | 대표지 **5개** 기준 루트 5개만 생성 |
| **전체 루트 수** | 6개 테마 × 5개 = **총 30개** | `anchorPlaces = allDbPlaces.slice(0, 5)` → **최대 5개** |

> [!CAUTION]
> **명세서**: "테마별 루트 생성 목표: 테마당 5개 코스 → 6 테마 × 5 = **총 30개 마스터 추천 루트 사전 적재**"
>
> **코드** ([seed-recommend-routes.ts:L160](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-recommend-routes.ts#L160)): `anchorPlaces = allDbPlaces.slice(0, 5)` 로 Anchor 5개만 추출하고, 각 Anchor마다 루트 1개만 생성하므로 **총 5개 루트만 생성**됩니다. 명세서가 요구하는 30개에 크게 못 미칩니다.

---

### 🔴 2. 테마별 Anchor 5개 선정 로직 부재

> [!WARNING]
> **명세서** (policy §2): "6대 UI 마스터 테마별 대표 거점 스팟 **테마당 5개** (총 30개 내외) 선정"
>
> **코드** ([seed-recommend-routes.ts:L160](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-recommend-routes.ts#L160)): `allDbPlaces.slice(0, 5)` — DB에서 맨 앞 5건을 무작위 순서로 가져올 뿐, **테마별 분류나 대표 거점 선정 로직 없음**. 해운대, 감천문화마을 같은 테마별 대표 관광지 매핑이 구현되어 있지 않습니다.

---

### 🔴 3. 경유지 4~6개 정책 vs 코드 4개 고정

| 구분 | 명세서 기준 | 코드 실제 |
|---|---|---|
| **경유지 수** | 최소 **4개** ~ 최대 **6개** (권장 4~5개) | `.slice(0, 4)` → **항상 4개 고정** |

> [!WARNING]
> **명세서** (policy §3): "코스 1개당 경유 장소 수: 최소 4 ~ 최대 6개"
>
> **코드** ([seed-recommend-routes.ts:L191](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-recommend-routes.ts#L191)): `uniqueStops.slice(0, 4)` — 4개로 하드코딩되어, 5~6개 경유지 코스 생성이 불가능합니다.

---

### 🔴 4. Base Score 연산에 난이도 감점(α = 0.05)이 누락

> [!CAUTION]
> **명세서** (architecture §4.2): "Base Score = Initial Rating − (α × D), α = 0.05"
>
> **코드** ([route.service.ts:L85](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.service.ts#L85)):
> ```typescript
> const baseScore = Number(route.score ?? 50.0);
> ```
> `route.score`를 그대로 Base Score로 사용하고 있으며, **`totalDifficultyScore`를 조회했음에도 `- (0.05 × D)` 감점 연산이 적용되지 않습니다.** 명세서의 핵심 4단계 수식 중 1단계가 코드에서 빠져 있습니다.

---

### 🟢 5. Request DTO `budget` 최대값 정합성 완료

| 구분 | 명세서 기준 | 코드 실제 |
|---|---|---|
| **budget 최소** | 10,000원 | `@Min(10000)` ✅ |
| **budget 최대** | **500,000원** (policy §3 & §6 통일 완료) | `@Max(500000)` ✅ |

> [!NOTE]
> policy §6 Integration Matrix의 150,000원 기술 오류를 policy §3 및 Request DTO와 일치하도록 500,000원으로 수정을 완료했습니다. 현재 코드와 모든 명세서가 500,000원 기준으로 완벽히 정합합니다.

---

### 🔴 6. Hard Filter에 `isPublished: true` 조건 누락 (Detail / List 쿼리)

> [!WARNING]
> **명세서** (architecture §4.1): "WHERE routeType = 'RECOMMENDED' **AND isPublished = true** AND estimatedCostWon <= budget"
>
> `findRecommendedCandidates`에는 `isPublished: true`가 있으나 ([route.repository.ts:L100](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.repository.ts#L100)),
> `findListWithStops`([route.repository.ts:L86-L91](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.repository.ts#L86-L91))에는 `isPublished` 조건이 **없습니다**. 미공개 루트가 리스트 API에 노출될 수 있습니다.

---

### 🔴 7. `themeSlugs` 필드 Validation 부재

> [!WARNING]
> **명세서** (architecture §5): Request Body에 `themeSlugs`는 필수적으로 제공되는 필드로 기술됨
>
> **코드** ([recommend-route-request.dto.ts:L70](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/dto/recommend-route-request.dto.ts#L70)):
> ```typescript
> themeSlugs?: string[];
> ```
> `?` optional이며 `@IsArray()`, `@IsString({ each: true })`, `@ArrayMinSize(1)` 등의 **class-validator 데코레이터가 전혀 없습니다**. 빈 배열이나 숫자 배열 같은 비정상 값도 통과됩니다.

---

### 🟡 8. `@Min(1)` 명세 vs `@Min(10000)` 코드 (경미한 차이)

> [!NOTE]
> **명세서** (architecture §5): "`@IsNumber()`, **`@Min(1)`** 로 예산 음수/0원 입력을 원천 차단"
>
> **코드** ([recommend-route-request.dto.ts:L60](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/dto/recommend-route-request.dto.ts#L60)): `@Min(10000)` — 코드가 더 엄격한 제약을 적용하고 있습니다. 실질적으로 더 안전하지만, 명세서 기술과 불일치합니다.

---

### 🟡 9. `dayNumber` 산출 로직 — 하드코딩 임계값

> [!NOTE]
> **명세서** (policy §5.1): "경유지 응답 배열에 `dayNumber` (정수, 1-indexed) 필드를 필수 제공. 예: 스팟 1~4번 → 1일차, 5~9번 → 2일차"
>
> **코드** ([recommended-route-detail-response.dto.ts:L99-L102](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/dto/recommended-route-detail-response.dto.ts#L99-L102)):
> ```typescript
> if (seq < 4) dto.dayNumber = 1;
> else if (seq < 9) dto.dayNumber = 2;
> else dto.dayNumber = 3;
> ```
> 하드코딩된 임계값(4, 9)에 의존하고 있고, **4일차 이상(`dayNumber >= 4`) 케이스가 없습니다**. 명세서 color coding 표(§5.2)에는 "Day 4+ Emerald Green"이 정의되어 있으나 코드에서 `dayNumber = 4`를 반환하는 경로가 없습니다.

---

### 🟡 10. SEED 스크립트에서 `CAFE` 카테고리 매핑 부재 (`seed-tour-api-test.ts`)

> [!NOTE]
> **Schema**: `PlaceCategory` enum에 `CAFE`가 존재 ([schema.prisma:L28](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/prisma/schema.prisma#L28))
>
> **코드** ([seed-tour-api-test.ts:L14-L33](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-tour-api-test.ts#L14-L33)): `mapContentTypeToCategory` 함수에서 한국관광공사 `contentTypeId`를 매핑할 때 **`CAFE` 카테고리로 분류되는 케이스가 없습니다**. 카페 장소는 모두 `ETC`로 분류됩니다. 이는 명세서의 "규칙 1: 식비/카페 필수" 다변화 규칙을 시드 단계에서 충족하기 어렵게 만듭니다.

---

### 🟡 11. `VIEWPOINT` 카테고리 — 명세서 테마에서 미언급

> [!NOTE]
> **Schema** ([schema.prisma:L33](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/prisma/schema.prisma#L33)): `VIEWPOINT /// 전망대 / 야경 명소` enum 존재
>
> **명세서**: 6대 마스터 테마에 야경 관련 테마(예: `night-view`)가 없고, 카테고리 다변화 규칙(policy §4.1)에서도 `VIEWPOINT`는 **어떤 필수 카테고리 그룹에도 포함되어 있지 않습니다**. Schema에 존재하지만 명세서에서 다루지 않은 고아(orphan) 카테고리입니다.

---

### 🟢 12. Recommend API 응답 DTO 필드 화이트리스트 검증 완료

> [!NOTE]
> `getRecommendedRoutes` 서비스 로직을 검증한 결과, 반환 과정에서 `RecommendedRouteListResponseDto.from(route)`를 명시적으로 호출합니다.
> `RecommendedRouteListResponseDto.from()` 메서드는 내부 DB 필드를 그대로 누출하지 않고, 승인된 DTO 필드(`id`, `name`, `stopCount`, `totalDistanceKm`, `transitTypes`, `totalCost`, `totalTimeMinutes`, `congestionLevel`, `estimatedSavingsWon`, `score`, `isRecommended`, `stopLocations`)만을 화이트리스트 방식으로 선택 복사하여 반환함을 확인하였습니다. (코드 변경 불필요, 검증 완료 PASS)

---

## 📊 종합 정합성 스코어

| 등급 | 항목 수 | 비고 |
|---|---|---|
| ✅ 정합 (PASS) | **30건** | 핵심 아키텍처 구조, 수식, 인프라 |
| 🔴 부정합 (FAIL) | **7건** | 런타임 동작 또는 API 계약에 영향 |
| 🟡 경미 부정합 | **5건** | 문서 기술 불일치 / 잠재적 이슈 |

---

## 🎯 우선 조치 권장 순서

| 순위 | 항목 | 심각도 | 이유 |
|---|---|---|---|
| 1 | **Base Score에 난이도 감점 누락 (#4)** | 🔴 Critical | 명세서 핵심 추천도 수식 1단계가 코드에 구현 안 됨 — 추천 품질에 직결 |
| 2 | **SEED 루트 5개 vs 명세서 30개 (#1, #2)** | 🔴 High | 데이터 볼륨이 명세서의 1/6 — 테마별 필터링 실효성 저하 |
| 3 | **Recommend API 응답 DTO 미적용 (#12)** | 🟡→🔴 | 내부 DB 필드 노출 위험 + API 계약 미고정 |
| 4 | **`themeSlugs` Validation 부재 (#7)** | 🔴 Medium | 비정상 입력 방어 없음 |
| 5 | **경유지 수 4개 고정 (#3)** | 🔴 Medium | 5~6개 코스 생성 불가 |
| 6 | **`budget` 최대값 명세서 내부 모순 (#5)** | 🟡 | policy §3 vs §6 간 수치 모순을 먼저 해소 필요 |
| 7 | **`isPublished` 조건 누락 — List 쿼리 (#6)** | 🔴 Medium | 미공개 루트 노출 가능 |
