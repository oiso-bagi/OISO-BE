# 📋 추천 루트 데이터 수집 및 비즈니스 서비스 정책 명세서 (Route Service Policy)
> **2026 관광데이터 공모전 (OISO-BE)**  
> **핵심 목적:** 추천 코스 SEED 적재 규모, 코스 제약 조건(시간/비용/스팟수), 카테고리 매핑 규칙의 표준화 및 정량적 기준 수립

---

## 1. 개요 (Overview)

본 문서는 OISO 추천 경로 서비스의 데이터 수집 스케일, 추천 알고리즘 런타임 제약 조건, 6대 마스터 테마 매핑 규칙을 정량적인 수치 정책(Quantitative Business Policy)으로 정의합니다. 본 정책 수치는 백엔드 SEED 스크립트(`scripts/seed-recommend-routes.ts`), DTO Validation, 프론트엔드 UI/UX 제약 조건의 단일 진실 공급원(Single Source of Truth) 역할을 합니다.

---

## 2. 📌 A. 데이터 적재 규모 정책 (SEED Scale Policy)

공공데이터 Open API 1,000회 제한 방어 및 부산 대표 관광 지점을 밀도 있게 커버하기 위한 적재 정책 수치입니다.

| 항목 (Parameter) | 수치 정책 (Standard Value) | 설명 및 산출 근거 |
| --- | --- | --- |
| **루트 기본 단위 (Route Unit)** 🆕 | **1일차(1-Day) 모듈 코스** | 기본 단위는 1일 코스로 생성하며, 다일(N박 M일) 여행 시 1일 코스를 N개 모듈 조합 |
| **관광지 마스터 (Place Scale)** 🆕 | **1,000개 장소** | 부산시 전체 음식점/카페/해변/전통시장/문화지 등 1,000개 마스터 데이터 적재 |
| **테마별 대표 관광지 수 (Anchor Spots)** | **테마당 20개** *(총 120개 스팟)* | 6대 UI 마스터 테마별 대표 거점 스팟 (해운대, 감천문화마을 등) 선정 🆕 |
| **테마별 루트 생성 목표** | **테마당 20개 코스** | 6대 테마 $\times$ 20개 코스 = **총 120개 마스터 추천 루트 사전 적재** 🆕 |
| **전체 코스 경유지 수 (Total Stops)** | **약 420개 이상 경유지** | 120개 마스터 루트 $\times$ 3.5개 경유지 스팟 릴레이 구성 🆕 |

---

## 3. 📌 B. 코스 제약 조건 정책 (Route Constraint Policy)

여행 유저의 현실적인 피로도, 일일 여행 동선 및 예산 범위를 고려한 코스 물리 제약 기준입니다.

| 항목 (Parameter) | 최소값 (Min) | 표준/권장 (Avg) | 최대값 (Max) | 설명 및 기획 의도 |
| --- | --- | --- | --- | --- |
| **코스 1개당 경유 장소 수 (Spot Count)** | **3개 스팟** 🆕 | **3 ~ 4개 스팟** | **4개 스팟** | 하루 이동 피로 없이 현실적으로 알차게 즐기는 3~4개 스팟 (조합 다변화 극대화) |
| **코스 총 소요시간 (Duration)** | **180분 (3시간)** | **300분 (5시간)** | **480분 (8시간)** | 1일 기준 알찬 반일~당일 여행 소요시간 제한 |
| **코스 총 이동거리 (Distance)** | **2.0 km** | **5.0 ~ 8.0 km** | **15.0 km** | 이동 동선 낭비를 막고 권역 내 동선 집중화 |
| **코스 1개당 총 예산 (Budget)** | **10,000원** | **30,000 ~ 150,000원** | **500,000원** 🆕 | 1일 짠내 투어부터 5일 풀 여행(최대 50만원)까지 수용 |

### 💡 일정 전체 총 예산 범위 (10,000원 ~ 500,000원) 정량적 산출 근거 🆕

- **`MAX_TOTAL_BUDGET_WON` (500,000원)의 성격**: 500,000원은 **일정 전체(N일차 패키지 총합) 총예산(`totalBudgetWon`) 상한선**입니다. 5일 여행(`durationDays = 5`) 선택 시 1일 평균 예산은 최대 **100,000원**($100,000\text{원} \times 5\text{일} = 500,000\text{원}$)까지 설정 및 수용이 가능합니다.
- **DB 마스터 경로 1일 예상 비용 검증**: 사전 적재된 총 120개 1일차 마스터 추천 경로의 실제 예상 비용(`estimatedCostWon`)은 **최소 25,000원 ~ 최대 45,500원** (평균 33,967원) 범위에 분포합니다.
- **최대 5일차 패키지 조합 최적화**: 5일 여행(`durationDays = 5`) 체이닝 시 이론상 최고 비용 조합은 $45,500\text{원} \times 5\text{일} = \mathbf{227,500\text{원}}$으로 연산되어 일정 전체 총예산 500,000원 예산 내에 100% 여유롭게 수용됩니다.
- **범위 설정 이유**: 1일 초가성비 짠내투어(1만원 입력 시 하한 방어)부터, 5일간 식비·체험·교통비를 넉넉하게 투입하는 풀 부산 여행(일정 전체 50만원 상한)까지 **실제 DB 추천 경로의 비용 수용률 100%를 정밀하게 커버**하도록 산정되었습니다.

---

## 4. 📌 C. 테마 & 카테고리 매핑 규칙 (Mapping Rules)

유저가 6대 마스터 테마 선택 시 자연스러운 카테고리 시퀀스와 다채로운 여행 경험을 보장하기 위한 규칙입니다.

### 4.1 카테고리 필수 다변화 규칙 (Category Diversity Rules)
- **규칙 1 (식비/카페 필수)**: 모든 추천 코스에는 **최소 1개 이상의 [FOOD (식당)] 또는 [CAFE (카페)]** 카테고리가 필수 포함되어야 합니다.
- **규칙 2 (관광/체험 필수)**: 모든 추천 코스에는 **최소 1개 이상의 [NATURE (자연)], [CULTURE (문화)], [EXPERIENCE (체험)], [MARKET (쇼핑/시장)], [VIEWPOINT (전망대/야경)]** 카테고리가 필수 포함되어야 합니다.
- **규칙 3 (동일 카테고리 연속 방지)**: 식당 ➡️ 식당, 카페 ➡️ 카페와 같이 동일 카테고리가 연속 2회 이상 중복 연결되지 않도록 하이브리드 동선 정렬을 적용합니다.

### 4.2 6대 테마별 슬롯(Slot) 시퀀스 패턴 및 N일차 다중 테마 롤테이션 정책 🆕

사용자가 6대 마스터 테마 선택 시, 비즈니스 정책을 100% 반영하는 슬롯 시퀀스 구조를 적용하고 `FOOD->FOOD`, `CAFE->CAFE` 동일 카테고리 연속을 엄격히 방어합니다.

| 테마 slug | 슬롯 시퀀스 패턴 (Slot Sequence Pattern) | 핀포인트 조건 & 슬롯 구성 상세 |
|---|---|---|
| 🍱 **`local-food`** | **Slot 1**: FOOD ➡️ **Slot 2**: CAFE ➡️ **Slot 3**: FOOD/MARKET ➡️ **Slot 4(선택)**: VIEWPOINT/NATURE | 대표 맛집/노포 ➡️ 디저트 카페 ➡️ 시장 먹거리/맛집 ➡️ 산책/전망 |
| ☕ **`emotion-cafe`** | **Slot 1**: CAFE ➡️ **Slot 2**: CULTURE/VIEWPOINT ➡️ **Slot 3**: FOOD ➡️ **Slot 4(선택)**: CAFE | 감성/뷰 카페 ➡️ 전시/포토존 ➡️ 대표 식당 ➡️ 디저트/로스터리 카페 |
| 🌊 **`beach-tour`** | **Slot 1**: BEACH (NATURE/EXPERIENCE/VIEWPOINT) ➡️ **Slot 2**: FOOD ➡️ **Slot 3**: BEACH/CAFE ➡️ **Slot 4(선택)**: VIEWPOINT | 해수욕장/해양 ➡️ 해산물/식당 ➡️ 오션뷰 카페/해양레포츠 ➡️ 해안 전망대/야경 |
| 📸 **`photo-spot`** | **Slot 1**: CULTURE ➡️ **Slot 2**: CAFE ➡️ **Slot 3**: VIEWPOINT ➡️ **Slot 4(선택)**: FOOD/MARKET | 전시/갤러리/문화재 ➡️ 감성 카페 ➡️ 포토존/전망대/야경 ➡️ 대표 먹거리 |
| 🛍️ **`traditional-market`** | **Slot 1**: MARKET ➡️ **Slot 2**: CAFE ➡️ **Slot 3**: FOOD ➡️ **Slot 4(선택)**: CULTURE/VIEWPOINT | 대표 전통시장 ➡️ 시장 근처 카페 ➡️ 노포 맛집 ➡️ 문화/전망 |
| 🌲 **`nature-walk`** | **Slot 1**: NATURE ➡️ **Slot 2**: FOOD/CAFE ➡️ **Slot 3**: NATURE ➡️ **Slot 4(선택)**: VIEWPOINT | 공원/해안산책로 ➡️ 힐링 식당/카페 ➡️ 숲길/자연/섬 ➡️ 전망대 |

#### 🔄 N일차 다중 테마 롤테이션 체이닝 (Multi-Theme Rotation Chaining)
- 사용자가 테마를 2개 이상 다중 선택한 경우(`travelStyleSlugs: ["local-food", "emotion-cafe"]`), 런타임 엔진은 요청한 테마 순서대로 **1일차는 1번째 테마 특화 코스, 2일차는 2번째 테마 특화 코스**로 체이닝하여 "하루는 먹방, 하루는 카페 투어"의 일차별 교차 경험을 제공합니다.

### 4.3 마스터 코스 장소 재조합 & Multi-Day 장소 중복 제거 및 체이닝 정책 (Place Deduplication & Soft Penalty Policy) 🆕

- **규칙 1 (DB SEED 마스터 코스의 단위)**:
  - 사전 적재된 각 마스터 추천 코스(`Route`)는 **1일치(당일치기 3~4개 스팟, 180~480분 소요)** 코스 모듈 단위로 구성됩니다. (총 120개 코스 적재)
- **규칙 2 (Multi-Day N일차 결합 및 하버사인 체이닝 - Multi-Day Route Stitching)**:
  - 사용자가 `durationDays: N` (예: 2일, 3일 코스)을 요청하면, 시스템은 **1일치 코스 모듈 N개**를 최적의 동선 흐름으로 연결하여 1개의 통합 N일 여행 코스 패키지로 조합합니다.
  - **체이닝 조건**: 1일차 코스의 마지막 장소 좌표 $P_1(lat_1, lng_1)$에서 2일차 코스의 첫 번째 장소 좌표 $P_2(lat_2, lng_2)$까지의 **직선 거리(Haversine Distance)가 최소화**되는 1일 코스를 2일차 코스로 체이닝합니다.
- **규칙 3 (Soft Penalty 가중 감점 기반 중복 장소 완충 정책)**:
  - 1일차 코스에 이미 선택된 장소 `Set(PlaceIDs)`가 2일차/3일차 후보 코스에 포함되어 있을 경우 무조건 에러(404)를 뱉는 Hard Drop 대신 **Soft Penalty (거리 가중 감점 50,000m)**를 적용하여 중복이 없는 코스를 최우선 선택하고, 후보가 부족할 경우 완충 조립을 보장하여 100% 서비스 가용성을 유지합니다.
- **규칙 4 (통합 메타 지표 및 시퀀스 합산)**:
  - 결합된 N일 코스 응답 시 전체 경유지의 `sequence`는 `0, 1, 2, 3, 4...`로 연속 증가되며, 각 경유지 객체에 해당 일차를 명시하는 `dayNumber: 1, 2, 3...` 정수 메타데이터가 자동 부여됩니다.
  - `totalDistanceMeters`, `totalCost`, `totalTimeMinutes`, `estimatedSavingsWon` 지표는 N개 일차 코스의 합계로 통합 합산되어 제공됩니다.

---

## 5. 📌 D. 프론트엔드 연동 & Multi-Day 지도 Color Coding 프로토콜 🆕

N박 M일(다일) 추천 코스 응답 시, 프론트엔드 지도(Map Component)에서 일차별 경유지 마커 및 이동 동선 라인을 시각적으로 명확히 분기(Color-coded Polylines)하기 위한 데이터 프로토콜 규격입니다.

### 5.1 `dayNumber` 응답 메타데이터 규격
- 경유지(`RouteStop`) 응답 배열의 모든 스팟 객체에 해당 장소가 몇 일차에 방문하는 장소인지를 나타내는 `dayNumber` (정수, 1-indexed) 필드를 필수 제공합니다.
- 실시간 추천 응답(`RecommendedRouteListResponseDto → RouteStopLocationDto`):
  - **1일 여행** (`durationDays = 1`): 모든 경유지에 `dayNumber: 1` 고정
  - **다일 여행** (`durationDays > 1`): `combineChainedRoutes()`가 체이닝 시 N일차 코스에 `dayNumber: N` 자동 부여
- **저장 루트 응답** (`SavedRouteDetailResponseDto → SavedRouteStopDetailDto`):
  - `SavedRouteStopDetailDto`에도 `dayNumber` 필드를 포함하여 저장된 다일 코스의 일차별 탭/마커 색상 구분을 동일하게 지원합니다.
- **예시**:
  - `dayNumber: 1` ➡️ 1일차 경유지 (스팟 1~4번)
  - `dayNumber: 2` ➡️ 2일차 경유지 (스팟 5~9번)
  - `dayNumber: 3` ➡️ 3일차 경유지 (스팟 10~13번)

### 5.2 프론트엔드 지도 렌더링 가이드라인 (Color Palette Standard)
프론트엔드 클라이언트는 `dayNumber` 필드값을 기준으로 지도 UI 렌더링 시 아래 표준 컬러 팔레트를 적용하여 일차별 동선을 시각화합니다.

| 일차 (Day) | 마커 & 동선 테마 색상 (Color Code) | 디자인 렌더링 스타일 |
| --- | --- | --- |
| **1일차 (Day 1)** | 🔵 **Ocean Blue** (`#1E88E5`) | 파란색 숫자 마커 & 파란색 Polyline |
| **2일차 (Day 2)** | 🟠 **Sunset Orange** (`#FB8C00`) | 주황색 숫자 마커 & 주황색 Polyline |
| **3일차 (Day 3)** | 🟣 **Deep Purple** (`#8E24AA`) | 보라색 숫자 마커 & 보라색 Polyline |
| **4일차+ (Day 4+)** | 🟢 **Emerald Green** (`#43A047`) | 에메랄드 green 마커 & Green Polyline |

---

## 6. 아키텍처 명세서 및 시스템 연동 (Integration Matrix)

| 시스템 컴포넌트 | 본 정책 문서 연동 역할 |
| --- | --- |
| **`scripts/seed-recommend-routes.ts`** | 본 수치 정책에 따라 6대 테마 × 20개 코스 = 총 120개 마스터 추천 코스 및 약 420개 이상 경유지 자동 연산 및 SEED 저장 |
| **`RecommendRouteRequestDto`** | `totalBudgetWon` 최소값(10,000원) ~ 최대값(500,000원) 유효성 검증 레인지 설정 (`RecommendationService.validateTotalBudgetWon`) |
| **`RecommendedRouteListResponseDto` → `RouteStopLocationDto`** | 실시간 추천 경유지 객체 내 `dayNumber` 필드를 포함하여 프론트 지도 Color Coding 연동 지원 |
| **`SavedRouteDetailResponseDto` → `SavedRouteStopDetailDto`** | 저장된 다일 코스 경유지 객체 내 `dayNumber` 필드를 포함하여 일차별 탭 및 지도 마커 색상 구분 지원 |
| **`docs/recommend-route-architecture.md`** | [recommend-route-architecture.md](./recommend-route-architecture.md) 기술 아키텍처 문서와 연동되어 비즈니스 기획 표준 가이드로 링크 |
