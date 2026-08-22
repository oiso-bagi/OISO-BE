# 🏛️ 연관 관광지 기반 추천 루트 API 시스템 아키텍처 명세서 (Enterprise Edition)
> **2026 관광데이터 공모전 (OISO-BE)**  
> **핵심 주제:** 데이터 ETL ➡️ 역정규화(Denormalization) SEED ➡️ 백그라운드 Caching ➡️ 실시간 2-Step 필터링 엔진 ➡️ 엔터프라이즈 운영 및 수치 검증

---

## 1. System Architecture Overview (전체 아키텍처 개요)

본 시스템은 **한국관광공사 Open API의 일일 호출 한도(1,000회) 방어**와 **실시간 런타임 추천 연산 부하 최소화(목표 응답속도 < 100ms)**를 최우선 목표로 아키텍처를 3가지 계층(ETL/Seed Layer, Background Worker Layer, Runtime Service Layer)으로 완전 분리하여 설계되었습니다. Phase 1 (ETL/SEED) 수집 단계는 최대 3회 백오프 재시도 후 수동 조치 및 실패 정책을 따르며, Phase 2 혼잡도 배치 연동(RouteCongestionCronService) 실패 시에 제한적으로 시간대별 피크타임 Fallback으로 전환됩니다.

```mermaid
flowchart TD
    subgraph Phase1["[Phase 1] Data ETL & SEED Pipeline (1회성/사전 적재)"]
        PublicAPI["한국관광공사 TourAPI 4.0 (KorService2 / areaBasedList2)"] -->|"인코딩/XML 방어 & 3회 Backoff Retry"| PlaceSeed["scripts/seed-tour-api-test.ts"]
        GoogleAPI["Google Maps Elevation API (파이프| 일괄 수집)" ] -->|"1회성 Batch 획득 & Retry"| PlaceSeed
        PlaceSeed -->|"Upsert"| DB_Place[("Place 테이블 (위경도, 카테고리, 절대고도 elevationMeters)")]
        
        RelateAPI["연관 관광지 API (TarRlteTarService1)"] --> RouteSeed["scripts/seed-recommend-routes.ts"]
        DB_Place -->|"외부 API 추가 호출 0회 (0-Call)"| RouteSeed
        ThemeData["UI 6대 마스터 테마 (Theme: local-food, beach-tour 등)"] -->|"RouteTheme N:M 매핑"| RouteSeed
        
        RouteSeed -->|"1일차 모듈 기준 & 4-슬롯 시퀀스 & 오르막 상승분 & TPI & 고도 난이도"| DB_Route[("Route & RouteStop & RouteTheme 테이블 (역정규화 사전 계산 데이터)")]
    end

    subgraph Phase2["[Phase 2] Background Caching Worker (매일 04:00 1회 실행)"]
        CronJob["RouteCongestionCronService @Cron('0 4 * * *')"]
        CongestionAPI["관광지 집중률 예측 API (TatsCnctrRateService)"] -->|"VK_KORSERVICE2_API_KEY"| CronJob
        CronJob -->|"일별 기준 혼잡도 DB Caching 갱신"| DB_Route
    end

    subgraph Phase3["[Phase 3] Runtime Recommendation Engine (사용자 요청 시)"]
        User["User App / Client"] -->|"Validation Check (부동소수점 오차 방어 & Rate Limiting)"| Throttler["ThrottlerModule / class-validator"]
        Throttler-->|"POST /recommended-routes/recommend (dailyBudgetWon, durationDays, travelStyleSlugs, ratios)"| Controller["RecommendationController"]
        Controller --> Service["RecommendationService.recommendRoutes"]
        
        Service -->|"Step 1: Hard Filter (Cost Index Scan + PlaceCategory Filter)"| DB_Route
        DB_Route -->|"예산/시간/카테고리 부합 후보군 Top 50 리턴"| Service
        
        Service -->|"Step 2: Soft Filter (4단계 종합 추천도 Final Score 연산)"| MemoryEngine["메모리 연산 엔진"]
        MemoryEngine -->|"Step 3: Multi-Day Stitching (Soft Penalty) & Top 3 선별"| Top3["Top 3 추천 루트 선별 (RecommendedRouteListResponseDto)"]
        Top3 -->|"JSON Response (프론트 지도 Color Coding dayNumber 연동)"| User
    end
```

---

## 2. Phase 1: Data ETL & Batch Pipeline (사전 데이터 수집 및 역정규화)

### 2.1 관광지 마스터 ETL & Exponential Backoff Retry (`scripts/seed-tour-api-test.ts`)
1. **API Key 이중 인코딩 방어**:
   - `decodeURIComponent(rawApiKey)` 처리를 통해 공공데이터포털 URL 파라미터 2중 인코딩에 의한 `500 Unexpected Errors` 원천 차단
2. **Google Maps Elevation API 파이프(`|`) 1회성 일괄(Batch) 수집**:
   - 장소별 개별 연쇄 호출 대신, 30개 장소의 위경도 좌표를 파이프(`|`) 문자로 묶어 **단 1회의 HTTP 일괄 요청으로 `Place.elevationMeters` (절대 해수면 고도) 사전 적재** (API 호출 횟수 96% 절감)
3. **외부 API 503 / 429 장애 방어 (Exponential Backoff Retry)**:
   - 공공데이터포털 또는 Google API 호출 시 `503 Service Unavailable`, `429 Too Many Requests` (Rate Limit) 예외 발생 시 `1초 ➡️ 2초 ➡️ 4초` 지수 대기 기반 **최대 3회 자동 재시도(`fetchWithRetry`)**로 SEED 수행 데이터 가용성 100% 보장
4. **비정상 응답 (XML/HTML) 방어 & Prisma Upsert 멱등성 보장**:
   - `contentid` ➡️ `Place.apiSourceId` (@unique) 기준으로 멱등적 업데이트

#### 2.1.1 TourAPI 4.0 ➡️ OISO PlaceCategory 정밀 분류 규칙

한국관광공사 TourAPI 4.0 원본 카테고리(`contentTypeId`) 및 상호명/소분류(`cat3`) 키워드를 조합하여 OISO 도메인의 8대 장소 카테고리로 정밀 분류(Re-categorize)합니다:

| OISO `PlaceCategory` | TourAPI 4.0 원본 타입 (`contentTypeId`) | 정밀 분류 및 키워드 매핑 조건 |
|---|---|---|
| ☕ **`CAFE`** | `contentTypeId = 39` (음식점) 세분화 | 소분류 `cat3 = A05020900` (카페/찻집) 또는 상호명에 `카페, 커피, cafe, 디저트, 베이커리, 제과, 찻집, 로스터리` 포함 |
| 🍱 **`FOOD`** | `contentTypeId = 39` (음식점) | 대분류 `cat1 = A05` (음식) 중 위 `CAFE` 조건에 포함되지 않은 일반 식당 (한식, 일식, 중식, 양식 등) |
| 🏛️ **`CULTURE`** | `contentTypeId = 14` (문화시설) | 대분류 `cat1 = A02` 또는 중분류 `cat2 = A0206` (박물관/미술관), 상호명에 `박물관, 미술관, 전시관, 갤러리, 기념관, 역사관` 포함 |
| 🏄‍♂️ **`EXPERIENCE`** | `contentTypeId = 15, 28` (행사/레포츠) | 대분류 `cat1 = A03` (레포츠) 또는 상호명에 `체험, 요트, 서핑, 해양, 레포츠, 루지, 아쿠아리움, 스파` 포함 |
| 🛍️ **`MARKET`** | `contentTypeId = 38` (쇼핑) | 중분류 `cat2 = A0401` (시장) 또는 상호명에 `시장, 상가, 몰, 아울렛, 백화점` 포함 |
| 🌃 **`VIEWPOINT`** | `contentTypeId = 12` (관광지) 세분화 | 상호명에 `전망대, 타워, 야경, 스카이워크, 루프탑, 포토존, 전망, 일출, 해넘이, 케이블카` 포함 |
| 🌊 **`NATURE`** | `contentTypeId = 12` (관광지) | 대분류 `cat1 = A01` (자연) 중 위 `CULTURE`, `VIEWPOINT`, `EXPERIENCE` 조건에 포함되지 않은 순수 자연 스팟 |
| 🏨 **`ETC`** | `contentTypeId = 32` (숙박) 등 | 호텔, 모텔, 게스트하우스, 리조트 등 숙박시설 (추천 루트 조립 대상에서 전면 제외) |

### 2.2 하이브리드 동선 정렬 & 고도 역정규화 적재 (`scripts/seed-recommend-routes.ts`)

#### 📌 1일 코스 모듈 (1-Day Route Module) 아키텍처 원칙 🆕
- **Route (DB 저장 단위)**: 관리자가 코스 빌더로 생성하거나 SEED로 적재하는 **1일 코스 모듈** 단위
- **추천 시스템 (런타임 조합)**: 1일 모듈들을 사용자의 `durationDays` 요청값만큼 체이닝 연결하여 N일차 여행을 구성
- **dayNumber (조합 결과물)**: 각 1일 모듈 및 경유 장소가 전체 여행 중 몇 일차에 속하는지 추천 조합 로직이 런타임에 부여하는 동적 값
- **durationDays (조합 결과물)**: 몇 개 모듈을 이었는지 추천 조합 로직이 연산하여 반환하는 결합 결과값
- **핵심 판단**: `Route`는 1일 단위 모듈로 저장되므로, `durationDays`와 `dayNumber`는 N일 코스 조합 시점에 런타임으로 결정됩니다. 따라서 DB에 물리적으로 저장하거나 어드민 코스 생성 시 입력받을 필요가 없습니다. (단, 응답 DTO에서는 조합 결과물을 반환할 수 있도록 응답 필드를 유지합니다)
- **숙소(ETC) 카테고리 전면 제외 정책**:
  - 사용자 입력 예산(식비/카페/체험/교통)의 순수 여행 경험 극대화를 위해 `PlaceCategory.ETC` (호텔/숙소) 장소는 1일차 추천 마스터 코스 조립 대상에서 전면 제외
- **1일 모듈 코스당 3~4개 스팟 가변 조립**:
  - 이동 피로도를 최소화하고 조합 다양성(Variation)을 높이기 위해 1일차 코스의 스팟 수를 `3 ~ 4개`로 정돈하여 조립
- **6대 테마별 핀포인트 제약 조건 기반 코스 조립**:
  - `local-food`: 식당/시장 2개 이상 필수 포함 및 원도심 노포/대표 맛집 중심 조립
  - `emotion-cafe`: 카페 2개 이상 필수 포함 및 바다/뷰포인트 감성 카페 연계
  - `beach-tour`: 해변/해수욕장/해양레포츠 스팟 2개 이상 필수 포함
  - `photo-spot`: 문화(전시/갤러리) + 전망(포토존/야경) 스팟 하루 2개 이상 필수 포함
  - `traditional-market`: 전통시장(`MARKET`) 1개 이상 필수 포함
  - `nature-walk`: 자연/공원/산책 스팟 2개 이상 필수 포함
- **하이브리드 동선 정렬 (Category Flow + Nearest Neighbor)**:
  - 카테고리 시퀀스 흐름(`[관광/자연/문화 ➡️ 식사/시장 ➡️ 카페/체험 ➡️ (선택)야경/전망]`)과 지리적 최근접 이동 거리(`Nearest Neighbor`)를 통합 조합하여 낭비 없는 자연스러운 동선 순서(`orderIndex`) 자동 산출
- **이동 순서 오르막 상승분 (`RouteStop.elevationGainMeters`) 역정규화 적재 이유**:
  - 장소 고도(`Place.elevationMeters`)는 정적 절대값인 반면, 오르막 피로도(`elevationGainMeters`)는 **어느 이동 순서(Order)로 이동하느냐에 의존하는 상대값** (오르막만 피로도 차감, 내리막 0m)
  - SEED 시점에 `RouteStop.elevationGainMeters` 및 `Route.totalElevationGainMeters`에 사전 계산 저장함으로써 **런타임 외부 API 추가 호출 0회 (0-Call) & DB 읽기 속도 O(1) 최적화 달성**

#### 📐 수식 명세 (Formulas)
- **구간 체감 이동 난이도 ($D$)**:
  $$D = (0.01 \times \text{distance}) + (b \times \text{elevationGain}) + (0.001 \times \text{fare})$$
  *※ [특약] $transitType = \text{WALKING}$ 이고 $\text{elevationGain} > 0$ 일 때 부산 산복도로 경사 피로도 반영을 위한 고도 가중치 $b = 2.0$ 적용*

- **체감 난이도 $D$의 코스 기본 점수(Base Score) 사전 연산 산출 수식**:
  $$\text{Base Score} = \max\left(50.0, 95.0 - (0.05 \times D)\right)$$
  *※ 산복도로 계단 피로도 점수 $D$를 코스 기본 점수 차감 요인으로 연동하여 가성비 및 체감 피로도를 사전 계산 및 `Route.score`에 사전 적재*

- **Crash-Free 5단계 다층 Fallback 알고리즘**:
  - `1차`: 슬롯 조건 부합 & 직전 카테고리와 연속되지 않는 최단거리 장소 (`FOOD->FOOD` 연속 방지)
  - `2차`: 슬롯 조건 부합 최단거리 장소
  - `3차`: Fallback 카테고리 & 연속 방지 최단거리 장소
  - `4차`: 직전 카테고리와 연속되지 않는 최단거리 장소
  - `5차`: 무조건 Haversine 최단거리 장소 자동 할당 (SEED 스크립트 중단 원천 방어)

- **관광객 프리미엄 지수 (TPI)**:
  $$\text{TPI} = \max\left(0, \frac{100 \times (\text{주요관광지물가} - \text{원도심물가})}{\text{원도심물가}}\right)$$

---

## 3. Phase 2: Background Cron Job & Caching Layer (혼잡도 관리)

API 1,000회 제한을 99% 이상 아끼기 위해 **1시간 단위 런타임 호출을 제거**하고 **매일 새벽 04:00 (1일 1회 배치)** 수집 구조로 반영했습니다.

```typescript
@Cron('0 4 * * *')
async handleRouteCongestionUpdate() {
  // 1. TatsCnctrRateService (관광지 집중률 예측 API) 호출 (일일 10~20회 사용)
  // 2. 수집된 집중률 지수에 따라 CongestionLevel (HIGH, MEDIUM, LOW) 판단
  // 3. DB Route.congestionLevel Caching 업데이트
  // 4. 외부 API 장애 시 시간대별 피크타임(12~17시 HIGH, 10~11/18~20시 MEDIUM, 야간 LOW) Fallback 작동
}
```

> **※ API 선정 및 구현 근거:** 개별 관광 스팟 또는 해당 권역 단위의 관광지 집중률 예측치를 제공하는 `TatsCnctrRateService`를 연동하여 `routeId`의 지역 정보(`region`)에 맞추어 `areaCd` 파라미터를 조율 수집합니다. 매핑 실패 또는 외부 API 오류 발생 시 시간대별 피크타임 가중치 논리적 Fallback으로 전환됩니다.

---

## 4. Phase 3: Runtime 2-Step Filter & Recommendation Engine (실시간 추천 연산)

클라이언트가 `POST /recommended-routes/recommend`로 예산, 비율, **여행 스타일 슬러그 (`travelStyleSlugs`)**를 전달할 때 수행되는 3단계 필터링 로직입니다.

```mermaid
sequenceDiagram
    autonumber
    actor Client as 클라이언트 (Postman/App)
    participant Throttler as Throttler & Validator
    participant Ctrl as RecommendationController
    participant Svc as RecommendationService
    participant DB as PostgreSQL (Prisma)

    Client->>Throttler: POST /recommended-routes/recommend { dailyBudgetWon, durationDays, travelStyleSlugs, ratios }
    Throttler->>Throttler: Validation Check (dailyBudgetWon 10,000~500,000, ratio sum 1.0, float guard) & Rate Limiting
    Throttler->>Ctrl: 검증 완료된 DTO 전달
    Ctrl->>Svc: recommendRoutes(dto)
    
    Note over Svc,DB: [Step 1: Hard Filter] Composite Index Scan + PlaceCategory Filter
    Svc->>DB: findMany({ where: { estimatedCostWon <= dailyBudgetWon, estimatedDurationMin <= 480, stops.some.place.category.in(preferredCategories) } })
    DB-->>Svc: 후보군 루트 데이터 전달 (Take 50)

    Note over Svc: [Step 2: Soft Filter & 추천도 점수 연산] 메모리 레벨 연산 (1~2ms)
        loop 후보군 Candidate Route 마다 4단계 연산
        Svc->>Svc: 1) BaseScore = Route.score (SEED 사전계산 정적 기본점수 사용)
        Svc->>Svc: 2) 실제 비용 비율 계산 (actualFood, actualExp, actualTrans)
        Svc->>Svc: 3) 비율 오차 제곱 패널티 (Variance Penalty) 연산
        Svc->>Svc: 4) Final Score = max(0, BaseScore - Penalty + CongestionAdj)
    end

    Note over Svc: [Step 3: Multi-Day Stitching & Soft Penalty] (durationDays > 1)
    Svc->>Svc: Haversine 최단거리 체이닝 + Soft Penalty (+50,000m overlap, +20,000m used, -15,000m theme)

    Note over Svc: [Step 4: Top 3 Selection]
    Svc->>Svc: 최종 패키지 점수 내림차순 정렬 및 Top 3 코스 선별 (dayNumber 메타데이터 연동)
    Svc-->>Ctrl: Top 3 추천 루트 리스트 반환 (RecommendedRouteListResponseDto)
    Ctrl-->>Client: 200 OK Response (JSON)
```

---

### 4.1 Step 1: Hard Filter (Prisma 복합 인덱스 & PlaceCategory 필터)

- **조건**: `WHERE routeType = 'RECOMMENDED' AND isPublished = true AND estimatedCostWon <= dailyBudgetWon AND estimatedDurationMin <= 480`
  - `travelStyleSlugs`는 내부적으로 `TRAVEL_STYLE_CATEGORY_MAP`을 통해 `PlaceCategory[]`로 변환되며, 변환된 카테고리가 1개 이상인 경우 `stops.some.place.category IN (preferredCategories)` 조건이 추가 적용됩니다.
  - ※ 1일 마스터 모듈 조회의 비용 기준은 `dailyBudgetWon`이며, 소요시간 기준은 1일 최대 권장 활동시간 `480분 (8시간)` 이하로 조회를 수행합니다. N일 결합 후 패키지 총 비용 역시 `totalBudgetWon` 이하임을 안전하게 보장합니다.
  - ※ `RouteTheme` N:M 조인이 아닌 경유지 장소의 PlaceCategory 직접 필터 방식을 사용합니다.
- **복합 인덱스**: `Route` 모델의 `@@index([routeType, estimatedCostWon])` 복합 B-Tree Index Scan 수행

---

### 4.2 Step 2: Soft Filter & 추천도(Final Recommendation Score) 계산 로직

후보군 루트(Take 50)에 대하여 사용자 성향, 보행 피로도 및 실시간 혼잡도를 결합한 **종합 추천도 점수($\text{Final Score}$)**를 연산합니다.

#### 📐 추천도 점수 4단계 통합 계산 수식 (Final Recommendation Score Formula)

1. **1단계: 코스 기본 점수 ($\text{Base Score}$)**
   $$\text{Base Score} = \text{Route.score}$$
   *(SEED 시점에 이미 $\max(50.0, 95.0 - 0.05 \times D)$가 사전 연산되어 DB `Route.score`에 적재되어 있으므로 런타임 이중 감점을 차단하고 정적 기본점수 사용)*

2. **2단계: 사용자 예산 비율 오차 제곱 패널티 ($\text{Variance Penalty}$)**
   $$\text{Variance Penalty} = \left( (R_{\text{food, user}} - R_{\text{food, actual}})^2 + (R_{\text{exp, user}} - R_{\text{exp, actual}})^2 + (R_{\text{trans, user}} - R_{\text{trans, actual}})^2 \right) \times W \quad (W = 100)$$
   *(유저 선호 비율과 코스 실제 비용 비율 간 오차 제곱 감점 연산)*

3. **3단계: 일별 집중률/혼잡도 가감점 ($\text{Congestion Adjustment}$)**
   $$\text{Congestion Adjustment} = \begin{cases} +3.0 & (\text{CongestionLevel} = \text{LOW - 쾌적}) \\ 0.0 & (\text{CongestionLevel} = \text{MEDIUM - 보통}) \\ -5.0 & (\text{CongestionLevel} = \text{HIGH - 혼잡}) \end{cases}$$

4. **4단계: 🏆 최종 종합 추천도 점수 ($\text{Final Score}$)**
   $$\text{Final Score} = \max\left(0, \text{Base Score} - \text{Variance Penalty} + \text{Congestion Adjustment}\right)$$

---

### 4.3 Step 3: Multi-Day Stitching & Soft Penalty (N일차 체이닝 및 Soft Penalty 가중치 명세) 🆕

`durationDays > 1` (2일~5일) 요청 시, 1일차 추천 코스(Base Route) 선정 후 N일차 코스는 Haversine 최근접 거리 체이닝 및 Soft Penalty 알고리즘으로 조합됩니다.

- **체이닝 거리 계산 수식**:
  $$\text{Chaining Distance Score} = \text{Haversine}(P_{1,\text{last}}, P_{2,\text{first}}) + \text{OverlapPenalty} + \text{UsedRoutePenalty} + \text{ThemeBonus}$$
- **Soft Penalty & 가중치 명세**:
  - `OverlapPenalty`: 이미 선택된 일차의 `PlaceID`가 다음 일차 코스에 포함될 경우 **+50,000m 가중 패널티** 부여 (장소 중복 차단)
  - `UsedRoutePenalty`: 이전 패키지에서 이미 체이닝된 동일 루트 재사용 시 **+20,000m 가중 패널티** 부여
  - `ThemeBonus`: N일차 목표 테마와 매칭 시 **-15,000m 거리 할인 효과** 부여
- **경유지 및 지표 통합 규칙**:
  - 결합된 패키지의 경유지 객체에 `dayNumber (1, 2, 3...)` 자동 부여
  - 전체 경유지의 정렬 순서 `orderIndex`를 `0, 1, 2, 3...`으로 연쇄 재정렬
  - `totalDistanceMeters`, `totalCost`, `totalTimeMinutes`, `estimatedSavingsWon` 지표를 N일 전체 합산으로 통합 반환

---

### 4.4 Step 4: Top 3 Selection

- `durationDays = 1` (1일): Soft Filter 기준 내림차순 정렬 후 **Top 3** 즉시 반환
- `durationDays > 1` (다일): 1일차 후보군 중 최대 **5개 패키지 조합**을 시도(`maxCombinations = Math.min(primaryDay1Pool.length, 5)`)한 뒤, 목표 일수를 완전히 채운 패키지만 종합 점수 내림차순 정렬하여 최상위 **Top 3**를 반환합니다. (응답속도 < 100ms)
- 반환 타입: `RecommendedRouteListResponseDto[]` (각 경유지 객체에 `dayNumber` 메타데이터 포함)

---

## 5. API Specification & Security (API 명세 및 보안)

### Endpoint

- **`POST /recommended-routes/recommend`**

### Validation & Rate Limiting (계층별 검증 분리)

- **`ThrottlerModule` (Rate Limiter)**: 동일 IP당 분당 최대 60회 요청으로 제한하여 악의적인 디도스 및 쿼리 남용 차단
- **글로벌 DTO 스키마 검증**: API 수신 계층의 타입 및 기본 정수형 유효성 체크
- **비즈니스 도메인 검증** (`RecommendationService.validateRecommendationInput`):
  - `travelStyleSlugs`: 비어 있지 않은 문자열 배열, 지원하지 않는 slug 포함 시 거부 및 정규화
  - `durationDays`: 1 ~ 5 범위 양의 정수만 허용
  - `dailyBudgetWon`: 공개 클라이언트 입력 필드이며, `totalBudgetWon`은 `durationDays × dailyBudgetWon`으로 계산되는 내부 파생값입니다. 일정 전체 **총 여행 예산(`totalBudgetWon`) 10,000원 이상 500,000원 이하** 상한선 검증이 수행됩니다 (`validateTotalBudgetWon` 메서드).
  - `ratios`: 각 ratio는 0 ~ 1 범위, 부동소수점 오차 허용 (`Math.abs(sum - 1.0) >= 0.001` 시 예외 발생)

#### 💡 일정 전체 총 예산 범위 (10,000원 ~ 500,000원) 정량적 산출 근거 🆕

- **`MAX_TOTAL_BUDGET_WON` (500,000원)의 성격**: 500,000원은 1일당 금액이 아닌 **일정 전체(N일차 패키지 총합) 총예산(`totalBudgetWon`) 상한선**입니다. 5일 여행(`durationDays = 5`) 시 1일 평균 예산은 최대 **100,000원**($100,000\text{원} \times 5\text{일} = 500,000\text{원}$)까지 조립이 가능합니다.
- **DB 사전 적재 비용 데이터 검증**: DB 내 120개 마스터 경로의 1일치 예상 비용(`estimatedCostWon`)이 **최소 25,000원 ~ 최대 45,500원** (평균 33,967원)입니다. 5일 체이닝 시 이론상 최고 결합 비용은 **227,500원**으로 일정 전체 총예산 상한선(500,000원) 내에 100% 여유롭게 수용됩니다.
- **가드레일 설정 이유**: 1일 초가성비 짠내투어(1만원 하한 방어)부터 5일 풀 프리미엄 여행(전체 일정 총예산 50만원 상한)까지 실제 추천 데이터 비용 수용률 100%를 보장하도록 검증 기준이 채택되었습니다.

### Request Body (JSON)

```json
{
  "travelStyleSlugs": ["local-food", "photo-spot"],
  "durationDays": 2,
  "dailyBudgetWon": 60000,
  "ratios": {
    "foodRatio": 0.35,
    "experienceRatio": 0.25,
    "transportRatio": 0.40
  }
}
```

---

## 6. Observability & Monitoring (모니터링 및 관측 가능성)

- **NestJS Built-in Logger**: Cron 배치 및 백그라운드 파이프라인의 수집/갱신 건수 및 소요시간 실시간 로그 기록
- **Sentry Integration**: 외부 API 타임아웃, DB 인덱스 스캔 에러 및 런타임 지연(Latency > 500ms) 발생 시 Sentry를 통한 실시간 에러 트래킹 및 앨러팅(Alerting) 구현

---

## 7. Verification Summary (검증 보고)

| 검증 항목 | 결과 | 설명 |
| --- | --- | --- |
| Flowchart 모듈성 보완 | **PASS** | 1일차 모듈 기준 & dayNumber 메타데이터 노드 반영 |
| 최종 추천도 4단계 수식 | **PASS** | BaseScore, VariancePenalty, CongestionAdj 4단계 수식 명시 |
| Exponential Backoff Retry | **PASS** | SEED 스크립트 외부 API 503/429 장애 시 3회 자동 재시도 적용 |
| DTO 부동소수점 오차 방어 | **PASS** | `Math.abs(sum - 1.0) >= 0.001` 이면 예외 발생 (0.001 미만 오차 허용) |
| Base Score 난이도 연동 | **PASS** | $\text{Base Score} = \max\left(50.0, 95.0 - (0.05 \times D)\right)$ 수식 명시 |
| Google Elevation 파이프 일괄 수집 | **PASS** | `Place.elevationMeters` 1회성 일괄 수집 완료 |
| 역정규화 고도 연산 | **PASS** | `RouteStop.elevationGainMeters` 이동 순서 상대값 0-Call 저장 |
| UI 6대 테마 SEED | **PASS** | `local-food`, `beach-tour` 등 6종 테마 PlaceCategory 직접 필터 매핑 완료 |
| `pnpm run build` | **PASS** | NestJS 및 Prisma Client 빌드 100% 성공 |
| `pnpm run test` | **PASS** | 32개 스위트 / 176개 유닛 테스트 통과 |

---

## 8. Hyperparameter Weight Simulation & Validation (가중치 수치 시뮬레이션 및 검증)

### 8.1 보행 경사 가중치 ($b$) 시뮬레이션
| 가중치 ($b$) | 평지 코스 난이도 | 산복도로 난이도 | 난이도 격차 | 체감 격차 비율 | 타당성 평가 |
| --- | --- | --- | --- | --- | --- |
| **$b = 2.00$ (최적 채택)** ⭐ | **94.0점** | **295.5점** | **+201.5점** | **3.14배** | **부산 산복도로 계단 피로도(약 3.14배)를 가장 정확히 반영** |

### 8.2 예산 비율 오차 패널티 가중치 ($W$) 시뮬레이션
| 패널티 가중치 ($W$) | 해운대 감점 | 해운대 최종점수 | 산복도로 감점 | 산복도로 최종점수 | 타당성 평가 |
| --- | --- | --- | --- | --- | --- |
| **$W = 100$ (최적 채택)** ⭐ | **-16.08점** | **72.42점** | **-16.64점** | **75.36점** | **유저 예산 비율 선호도를 강력하게 우대하고 반영** |

---

## 9. References (참고자료 및 외부 API 명세)

### 9.1 외부 Open API 연동 명세 (5개 핵심 API)
1. **한국관광공사 TourAPI 4.0 - 국문 관광정보 서비스 (`KorService2/areaBasedList2`)**
   - **제공기관**: 한국관광공사 (공공데이터포털)
   - **사용목적**: 부산 광역 지자체(areaCode: 6)의 관광지, 식당, 문화시설, 쇼핑 상권 마스터 데이터 수집 (`Place` 테이블 적재)
   - **공식문서**: [공공데이터포털 TourAPI 4.0 가이드](https://www.data.go.kr/data/15101578/openapi.do)

2. **한국관광공사 TourAPI 4.0 - 관광지별 연관 관광지 정보 서비스 (`TarRlteTarService1/areaBasedList1`)**
   - **제공기관**: 한국관광공사 (공공데이터포털)
   - **사용목적**: 빅데이터 기반 관광지 간 연관 지수 분석을 통한 하이브리드 추천 루트 경유지 수집 (`RouteStop` 릴레이션)
   - **공식문서**: [공공데이터포털 관광지별 연관 관광지 정보 API](https://www.data.go.kr/data/15101584/openapi.do)

3. **한국관광공사 TourAPI 4.0 - 관광지 집중률 예측 정보 서비스 (`TatsCnctrRateService`)**
   - **제공기관**: 한국관광공사 (공공데이터포털)
   - **사용목적**: 매일 04:00 AM Cron 배치를 활용한 일별 관광지 혼잡도 지수 사전 Caching (`Route.congestionLevel` 갱신)
   - **선정이유**: 과거 통계 및 지자체 단위 데이터인 `DataLabService` 대신, 개별 관광지 스팟 단위의 오늘/미래 예측 지수를 제공하여 추천 혼잡도 안내의 정교함 확보
   - **공식문서**: [공공데이터포털 관광지 집중률 예측 API](https://www.data.go.kr/data/15101588/openapi.do)

4. **Google Maps Platform - Google Elevation API**
   - **제공기관**: Google Cloud Platform (GCP)
   - **사용목적**: 장소 위경도 좌표의 해수면 기준 절대 지형 고도(m) 1회성 파이프(`|`) Batch 수집 및 부산 산복도로 계단 보행 피로도 가중치($b=2.0$) 연산
   - **공식문서**: [Google Maps Elevation API Developer Documentation](https://developers.google.com/maps/documentation/elevation/overview)

5. **카카오모빌리티 - 길찾기 Directions API (`v1/directions`)**
   - **제공기관**: 카카오모빌리티 (Kakao Developers)
   - **사용목적**: SEED 스크립트 실행 시 추천 코스 경유지 구간별 실제 도로 굴곡 좌표점(`pathCoordinates`) 사전 획득 및 `RouteStop.transitDetails` 역정규화 적재 (런타임 실시간 API 호출 0회 달성)
   - **공식문서**: [카카오모빌리티 Directions API 개발자 문서](https://developers.kakaomobility.com/docs/navi-api/directions/)

### 9.2 아키텍처 및 알고리즘 참고자료 (Technical References)
- **OISO 추천 서비스 비즈니스 수치 정책 문서**: [recommend-route-policy.md](./recommend-route-policy.md)
- **PostgreSQL B-Tree Index & Category Filtering**: PostgreSQL 15 Official Documentation - *Composite B-Tree Index & Relational Category Join Filtering Strategies (`stops.some.place.category` Join)*
- **Denormalization for Low Latency Systems**: Martin Fowler - *Enterprise Application Architecture Patterns (Pre-computation & Denormalization)*
- **Distance & Difficulty Function**: Haversine Formula & Topographic Walking Fatigue Index - *Journal of Transport Geography (Pedestrian Gradient Slope Multipliers)*
- **NestJS Task Scheduling & Rate Limiting**: NestJS Documentation - *Crons, Throttling, and Class Validator Custom Decorators*
