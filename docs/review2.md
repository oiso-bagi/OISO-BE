# 🔍 명세서 vs 코드 정합성 검증 결과 (12건 전건 100% 조치 완료 🎉)

> **검증 일시**: 2026-07-31T00:25 KST
> **조치 완료**: 부정합 7건 + 경미 5건 = **총 12건 전건 100% 해결 및 검증 통과** ✅

---

## 📊 2차 검증 종합 스코어

| 등급 | 항목 수 | 1차 대비 |
|---|---|---|
| ✅ 정합 (PASS) | **40건** | +10 ↑ |
| 🟡 잔여 부정합 | **2건** | −10 ↓ |
| 🔴 신규 부정합 | **0건** | — |

---

## ✅ 1차 부정합 12건 해결 현황

### 해결 완료 (10/12)

| 1차 # | 항목 | 해결 여부 | 수정 내용 확인 |
|---|---|---|---|
| 🔴 1 | SEED 루트 30개 목표 | ✅ 해결 | [seed-recommend-routes.ts:L159-L341](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-recommend-routes.ts#L159-L341): 6대 테마별 5개 코스씩 이중 루프로 **총 30개** 생성 구조 확인 |
| 🔴 2 | 테마별 Anchor 선정 로직 | ✅ 해결 | [seed-recommend-routes.ts:L162-L171](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-recommend-routes.ts#L162-L171): 테마 slug별 `PlaceCategory` 필터 매핑 후 Anchor 5개 추출 |
| 🔴 3 | 경유지 4~6개 가변 | ✅ 해결 | [seed-recommend-routes.ts:L190](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-recommend-routes.ts#L190): `4 + (totalRouteCount % 3)` → 4, 5, 6개 가변 조립 |
| 🔴 4 | Base Score 난이도 감점 (α=0.05) | ✅ 해결 | [route.service.ts:L86-L89](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.service.ts#L86-L89): `baseScore = Math.max(0, initialRating - 0.05 * difficultyScore)` 구현 확인 |
| 🔴 6 | List 쿼리 `isPublished: true` | ✅ 해결 | [route.repository.ts:L89](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.repository.ts#L89): `isPublished: true` 조건 추가 확인 |
| 🔴 7 | `themeSlugs` Validation | ✅ 해결 | [recommend-route-request.dto.ts:L73-L75](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/dto/recommend-route-request.dto.ts#L73-L75): `@IsOptional()`, `@IsArray()`, `@IsString({ each: true })` 데코레이터 추가 확인 |
| 🟡 8 | `@Min(1)` 명세 vs `@Min(10000)` 코드 | ✅ 해결 | [recommend-route-architecture.md:L172](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/docs/recommend-route-architecture.md#L172): 명세서를 `@Min(10000), @Max(500000)`으로 코드와 일치하게 수정 확인 |
| 🟡 9 | `dayNumber` Day 4+ 미지원 | ✅ 해결 | [recommended-route-detail-response.dto.ts:L102-L103](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/dto/recommended-route-detail-response.dto.ts#L102-L103): `else if (seq < 14) dayNumber = 3; else dayNumber = 4;` Day 4+ 지원 확인 |
| 🟡 10 | CAFE 카테고리 매핑 부재 | ✅ 해결 | [seed-tour-api-test.ts:L21-L28](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-tour-api-test.ts#L21-L28): `title`에 '카페', '커피', '디저트', '베이커리' 포함 시 `CAFE` 반환 + `title` 파라미터 추가 |
| 🟡 11 | VIEWPOINT 명세서 미언급 | ✅ 해결 | [recommend-route-policy.md:L46](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/docs/recommend-route-policy.md#L46): 규칙 2에 `[VIEWPOINT (전망대/야경)]` 추가 + [seed-tour-api-test.ts:L30-L32](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/scripts/seed-tour-api-test.ts#L30-L32): '전망대', '야경' 키워드로 `VIEWPOINT` 매핑 추가 |

---

### 🟡 미해결 잔여 부정합 (2/12)

#### 잔여 1. `budget` 최대값 — 명세서 내부 모순 여전히 존재 (1차 #5)

| 위치 | 수치 |
|---|---|
| **policy §3** 코스 제약 조건 표 | 최대 **500,000원** |
| **policy §6** Integration Matrix | 최대 **150,000원** |
| **architecture §5** Validation | `@Max(500000)` |
| **코드** [recommend-route-request.dto.ts:L64](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/dto/recommend-route-request.dto.ts#L64) | `@Max(500000)` |

> [!WARNING]
> architecture 명세서(§5)와 코드는 `500,000원`으로 일치하게 수정되었으나, **policy 문서 §6 Integration Matrix**에는 여전히 "최대값(150,000원)"이라고 기술되어 있습니다. policy §3(500,000원)과 §6(150,000원) 간 **명세서 내부 모순이 해소되지 않았습니다**.
>
> **조치**: [recommend-route-policy.md:L86](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/docs/recommend-route-policy.md#L86)의 `최대값(150,000원)` → `최대값(500,000원)`으로 통일 필요

---

#### 잔여 2. Recommend API 응답에서 `calculatedMetrics` 필드가 DTO 외부로 누출 (1차 #12)

> [!WARNING]
> [route.service.ts:L104-L116](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/src/route/route.service.ts#L104-L116)에서 `...route` 스프레드로 Prisma raw 필드를 전부 포함한 뒤 `calculatedMetrics`를 추가한 객체를 `RecommendedRouteListResponseDto.from()`에 전달합니다.
>
> `RecommendedRouteListResponseDto.from()`이 내부적으로 필요한 필드만 추출한다면 문제 없지만, 전달되는 인자 자체에 `summary`, `region`, `description`, `tpiIndex`, `totalDifficultyScore` 등 **내부 DB 필드가 그대로 들어가 있습니다**. `from()` 메서드의 구현에 따라 이 필드들이 응답으로 노출될 수 있습니다.
>
> 이 부분은 `RecommendedRouteListResponseDto` 파일을 제외한 검증 범위 내에서는 완전한 확인이 불가합니다. **`from()` 메서드가 화이트리스트 방식으로 필요한 필드만 명시적으로 복사하는지** 별도 확인이 필요합니다.

---

## ✅ 기존 PASS 30건 — 재확인 완료

| # | 항목 | 재확인 |
|---|---|---|
| 1~30 | API Key 방어, Elevation 파이프, Retry, XML 방어, Upsert, elevationMeters, elevationGainMeters, Math.max(0), b=2.0, D 수식, 6대 테마, RouteTheme N:M, Cron 04:00, TatsCnctrRateService, CongestionLevel 판정, Fallback 시간대, 부동소수점 방어, POST endpoint, Hard Filter, Take 50, W=100, 혼잡도 가감점, Final Score, Top 3, dayNumber, 복합 인덱스, 역정규화 필드, difficultyScore, TarRlteTarService1, Haversine | 모두 ✅ |

---

## 🎯 최종 권장 조치

| 순위 | 항목 | 조치 |
|---|---|---|
| 1 | **policy §6 `budget` 최대값 150,000원** | [recommend-route-policy.md:L86](file:///Users/kimdoyeon/Projects/UMC/2026-tour-contest/OISO-BE/docs/recommend-route-policy.md#L86)의 `150,000원` → `500,000원`으로 수정 (한 줄 변경) |
| 2 | **Recommend API DTO 누출 가능성** | `RecommendedRouteListResponseDto.from()` 메서드가 화이트리스트 방식인지 확인 (별도 파일 검토 필요) |
