import {
  PrismaClient,
  RouteType,
  CongestionLevel,
  TransitType,
  PlaceCategory,
  Prisma,
} from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';
import { KakaoMobilityService } from '../src/common/services/kakao-mobility.service';

dotenv.config();

const prisma = new PrismaClient();
const kakaoMobilityService = new KakaoMobilityService();

/**
 * 외부 API 503 / 429 (Rate Limit) 장애 발생 시 Exponential Backoff 기반 3회 재시도 헬퍼 함수
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.response?.status;
    if (retries > 0 && (status === 503 || status === 429 || !status)) {
      console.warn(
        `⚠️ 외부 API 연동 지연 (Status: ${status ?? 'Timeout'}). ${delayMs}ms 후 재시도...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return fetchWithRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

/**
 * 교통수단(TransitType) 6종 및 이동거리(distMeters)에 따른 정밀 이동 소요시간(분) 연산 헬퍼 함수
 */
function calculateTravelTimeMinutes(
  transitType: TransitType | null,
  distMeters: number,
): number {
  if (!transitType || distMeters <= 0) return 0;

  switch (transitType) {
    case TransitType.WALKING:
      // 도보 속도 80m/min (4.8km/h)
      return Math.max(2, Math.round(distMeters / 80));
    case TransitType.BUS:
      // 시내버스 속도 350m/min (21km/h) + 대기/승하차 5분
      return Math.max(5, Math.round(distMeters / 350) + 5);
    case TransitType.SUBWAY:
      // 지하철 속도 500m/min (30km/h) + 역사 진출입/환승/대기 7분
      return Math.max(7, Math.round(distMeters / 500) + 7);
    case TransitType.DRIVING:
      // 자차 속도 600m/min (36km/h) + 주차/출차 3분
      return Math.max(3, Math.round(distMeters / 600) + 3);
    case TransitType.TAXI:
      // 택시 속도 550m/min (33km/h) + 호출/승차 2분
      return Math.max(3, Math.round(distMeters / 550) + 2);
    case TransitType.BIKING:
      // 자전거 속도 250m/min (15km/h) + 거치/대여 2분
      return Math.max(2, Math.round(distMeters / 250) + 2);
    default:
      return Math.max(2, Math.round(distMeters / 100));
  }
}

/**
 * 부산 주소지 정규식을 활용한 메인 관광지(TOURIST) vs 외곽 로컬 상권(LOCAL) 판별 헬퍼 함수
 */
function classifyDistrictType(address: string | null): 'TOURIST' | 'LOCAL' {
  const addr = String(address || '').trim();
  const touristDistricts = ['해운대구', '중구', '영도구', '수영구'];
  const isTourist = touristDistricts.some((d) => addr.includes(d));
  return isTourist ? 'TOURIST' : 'LOCAL';
}

/**
 * 스팟(경유지)별 로컬 상권 기준 절약액 산출 헬퍼 함수 [C-3]
 * 로컬 상권(LOCAL) 장소는 관광지 기준가(+35%) 대비 절약분을 스팟 레벨에 배분하여
 * DashboardRepository.findSavingsCategorySummaryByUserId 집계가 정상 동작하도록 보장
 */
function calculateSpotSavingsWon(
  price: number,
  districtType: 'TOURIST' | 'LOCAL',
): number {
  if (districtType === 'LOCAL') {
    return Math.round(price * 0.35);
  }
  return 0;
}

/**
 * API Key 안전 디코딩 헬퍼 [M-6]
 * - 이중 인코딩(공공데이터포털 이중 URL 인코딩) 방어
 * - decodeURIComponent 실패 시 원본 반환으로 Crash 방지
 */
function safeDecodeApiKey(rawKey: string): string {
  try {
    const decoded = decodeURIComponent(rawKey);
    // 디코딩 후 여전히 %XX 인코딩이 남아 있으면 한 번 더 디코딩 (이중 인코딩 방어)
    if (/%[0-9A-Fa-f]{2}/.test(decoded)) {
      return decodeURIComponent(decoded);
    }
    return decoded;
  } catch {
    return rawKey; // 디코딩 실패 시 원본 반환
  }
}

/**
 * 한국관광공사 연관 관광지 정보 API (TarRlteTarService1) 수집 헬퍼 함수
 */
async function fetchRelatedTourPlaces(): Promise<any[]> {
  const rawApiKey = process.env.VK_KORSERVICE2_API_KEY;
  if (!rawApiKey) return [];

  const serviceKey = safeDecodeApiKey(rawApiKey);
  const endpoint =
    'https://apis.data.go.kr/B551011/TarRlteTarService1/areaBasedList1';

  try {
    const res = await fetchWithRetry(() =>
      axios.get(endpoint, {
        params: {
          serviceKey,
          numOfRows: 50,
          pageNo: 1,
          MobileOS: 'ETC',
          MobileApp: 'OISO',
          _type: 'json',
          areaCode: '6', // 부산광역시
        },
        timeout: 5000,
      }),
    );

    const items = res.data?.response?.body?.items?.item;
    if (Array.isArray(items)) {
      console.log(`🔗 연관 관광지 API (TarRlteTarService1) ${items.length}건 실측 수집 완료`);
      return items;
    }
  } catch (err: any) {
    console.warn(`⚠️ 연관 API 수집 지연 (DB 마스터 장소 기반 동적 조립 진행): ${err?.message}`);
  }
  return [];
}

/**
 * 한국관광공사 TourAPI 4.0 detailIntro1 (소개정보조회 API) 기반 영업시간(openTime, closeTime) 수집 헬퍼 함수
 * - VK_KORSERVICE2_API_KEY 환경변수 활용
 * - contentId 기반으로 opentimefood / opentime / usetime 필드를 조회하여 HH:mm 파싱
 */
async function fetchTourApiPlaceHours(
  contentId: string | null,
  contentTypeId: string | null = '39',
): Promise<{ openTime: string | null; closeTime: string | null }> {
  const rawApiKey = process.env.VK_KORSERVICE2_API_KEY;
  if (!rawApiKey || !contentId) return { openTime: null, closeTime: null };

  try {
    const serviceKey = safeDecodeApiKey(rawApiKey);
    const endpoint = 'http://apis.data.go.kr/B551011/KorService1/detailIntro1';

    const res = await fetchWithRetry(() =>
      axios.get(endpoint, {
        params: {
          serviceKey,
          contentId,
          contentTypeId: contentTypeId || '39',
          MobileOS: 'ETC',
          MobileApp: 'OISO',
          _type: 'json',
        },
        timeout: 4000,
      }),
    );

    const item = res.data?.response?.body?.items?.item?.[0];
    if (item) {
      const rawText =
        item.opentimefood ||
        item.opentime ||
        item.usetime ||
        item.usetimeculture ||
        item.usetimeleports ||
        '';

      if (rawText) {
        const times = String(rawText).match(/\d{2}:\d{2}/g);
        if (times && times.length >= 2) {
          return { openTime: times[0], closeTime: times[1] };
        } else if (times && times.length === 1) {
          return { openTime: times[0], closeTime: null };
        }
      }
    }
  } catch (error) {
    // API 수집 지연 또는 미제공 시 null 비워둠
  }
  return { openTime: null, closeTime: null };
}

import {
  calculateHaversineDistance,
  calculateDifficultyScore,
  calculateBaseScore,
  calculateElevationGainMeters,
  isBeachPlace,
} from '../src/recommendation/utils/recommendation-calculator.util';

export {
  calculateHaversineDistance,
  calculateDifficultyScore,
  calculateBaseScore,
  calculateElevationGainMeters,
  isBeachPlace,
};

interface SlotPattern {
  primaryCategories?: PlaceCategory[];
  isBeach?: boolean;
  fallbackCategories?: PlaceCategory[];
}

function getThemeSlotPattern(themeSlug: string, _targetStopCount = 4): SlotPattern[] {
  if (themeSlug === 'local-food') {
    // 1) local-food: Issue #109 AC 준수 (Slot 3 식사/시장) + 전 테마 Slot 4 일몰/야경 피날레 표준화
    // Slot 1(FOOD 점심 맛집) -> Slot 2(CAFE 디저트 카페) -> Slot 3(FOOD/MARKET 저녁 맛집/시장 먹거리) -> Slot 4(VIEWPOINT/NATURE 일몰/야경 전망대)
    return [
      { primaryCategories: [PlaceCategory.FOOD] },
      { primaryCategories: [PlaceCategory.CAFE] },
      {
        primaryCategories: [PlaceCategory.FOOD, PlaceCategory.MARKET],
        fallbackCategories: [PlaceCategory.VIEWPOINT, PlaceCategory.CAFE],
      },
      {
        primaryCategories: [PlaceCategory.VIEWPOINT, PlaceCategory.NATURE],
        fallbackCategories: [PlaceCategory.EXPERIENCE, PlaceCategory.CULTURE],
      },
    ];
  }

  if (themeSlug === 'emotion-cafe') {
    // 2) emotion-cafe: Slot 1(CAFE) -> Slot 2(CULTURE/VIEWPOINT/EXPERIENCE 공방체험) -> Slot 3(FOOD) -> Slot 4(CAFE)
    return [
      { primaryCategories: [PlaceCategory.CAFE] },
      { primaryCategories: [PlaceCategory.CULTURE, PlaceCategory.VIEWPOINT, PlaceCategory.EXPERIENCE] },
      { primaryCategories: [PlaceCategory.FOOD] },
      {
        primaryCategories: [PlaceCategory.CAFE],
        fallbackCategories: [PlaceCategory.VIEWPOINT, PlaceCategory.EXPERIENCE],
      },
    ];
  }

  if (themeSlug === 'beach-tour') {
    // 3) beach-tour: Slot 1(BEACH) -> Slot 2(FOOD) -> Slot 3(BEACH/CAFE) -> Slot 4(VIEWPOINT)
    return [
      { isBeach: true, primaryCategories: [PlaceCategory.NATURE, PlaceCategory.EXPERIENCE, PlaceCategory.VIEWPOINT] },
      { primaryCategories: [PlaceCategory.FOOD] },
      { isBeach: true, primaryCategories: [PlaceCategory.CAFE, PlaceCategory.EXPERIENCE, PlaceCategory.NATURE] },
      {
        primaryCategories: [PlaceCategory.VIEWPOINT],
        fallbackCategories: [PlaceCategory.NATURE, PlaceCategory.CAFE],
      },
    ];
  }

  if (themeSlug === 'photo-spot') {
    // 4) photo-spot: Slot 1(CULTURE/EXPERIENCE 포토존/전시) -> Slot 2(CAFE 감성 포토 카페) -> Slot 3(FOOD 맛집/식사) -> Slot 4(VIEWPOINT 노을/야경 전망대)
    return [
      { primaryCategories: [PlaceCategory.CULTURE, PlaceCategory.EXPERIENCE] },
      { primaryCategories: [PlaceCategory.CAFE] },
      {
        primaryCategories: [PlaceCategory.FOOD],
        fallbackCategories: [PlaceCategory.EXPERIENCE, PlaceCategory.CULTURE],
      },
      {
        primaryCategories: [PlaceCategory.VIEWPOINT],
        fallbackCategories: [PlaceCategory.CULTURE, PlaceCategory.EXPERIENCE],
      },
    ];
  }

  if (themeSlug === 'traditional-market') {
    // 5) traditional-market: Slot 1(MARKET 전통시장) -> Slot 2(FOOD 시장 노포 먹거리) -> Slot 3(CAFE/CULTURE 레트로 카페/골목) -> Slot 4(MARKET/VIEWPOINT 야시장/야경)
    return [
      { primaryCategories: [PlaceCategory.MARKET] },
      { primaryCategories: [PlaceCategory.FOOD] },
      { primaryCategories: [PlaceCategory.CAFE, PlaceCategory.CULTURE] },
      {
        primaryCategories: [PlaceCategory.MARKET],
        fallbackCategories: [PlaceCategory.VIEWPOINT, PlaceCategory.CULTURE, PlaceCategory.FOOD],
      },
    ];
  }

  // 6) nature-walk: Slot 1(NATURE 숲길/산책로) -> Slot 2(FOOD 점심 맛집) -> Slot 3(CAFE 힐링 카페) -> Slot 4(VIEWPOINT/NATURE 일몰/전망대)
  return [
    { primaryCategories: [PlaceCategory.NATURE] },
    { primaryCategories: [PlaceCategory.FOOD] },
    { primaryCategories: [PlaceCategory.CAFE] },
    {
      primaryCategories: [PlaceCategory.VIEWPOINT, PlaceCategory.NATURE],
      fallbackCategories: [PlaceCategory.EXPERIENCE, PlaceCategory.CAFE],
    },
  ];
}

async function seedRecommendRoutes() {
  console.log('🚀 [120개 마스터 추천 코스 SEED] 6대 테마 × 20개 코스 동적 적재를 시작합니다...');

  // 1. TourAPI 연관 관광지 API 수집
  await fetchRelatedTourPlaces();

  // 2. UI 6대 마스터 테마 사전 적재
  const masterThemes = [
    { name: '부산 로컬 맛집', slug: 'local-food' },
    { name: '감성 카페', slug: 'emotion-cafe' },
    { name: '해변 관광', slug: 'beach-tour' },
    { name: '포토 스팟', slug: 'photo-spot' },
    { name: '전통 시장', slug: 'traditional-market' },
    { name: '자연/산책', slug: 'nature-walk' },
  ];

  for (const t of masterThemes) {
    await prisma.theme.upsert({
      where: { slug: t.slug },
      update: t,
      create: t,
    });
  }
  console.log(`✅ 6대 마스터 테마 사전 적재 완료`);

  // 3. DB Place 목록 조회
  const allDbPlaces = await prisma.place.findMany();

  if (allDbPlaces.length === 0) {
    console.error('❌ DB에 Place 데이터가 없습니다! 먼저 pnpm run seed:places를 실행하여 장소 마스터를 수집해 주세요.');
    return;
  }

  console.log(`📌 DB 마스터 장소 ${allDbPlaces.length}건 기반으로 6대 테마 × 20개 코스 = 총 120개 코스 적재를 시작합니다.`);

  let totalRouteCount = 0;
  const createdRouteIds: string[] = [];

  // 4. 6대 테마 각각 마다 20개 코스씩 총 120개 마스터 코스 100% 동적 생성
  for (const theme of masterThemes) {
    // 숙소(ETC) 카테고리를 전면 제외한 마스터 장소 리스트
    const validDbPlaces = allDbPlaces.filter((p) => p.category !== PlaceCategory.ETC);

    // 테마 성격에 부합하는 대표 앵커 장소 필터링
    let themeAnchors: any[] = [];
    if (theme.slug === 'beach-tour') {
      themeAnchors = validDbPlaces.filter((p) => isBeachPlace(p));
    } else if (theme.slug === 'local-food') {
      themeAnchors = validDbPlaces.filter((p) => p.category === PlaceCategory.FOOD);
    } else if (theme.slug === 'emotion-cafe') {
      themeAnchors = validDbPlaces.filter((p) => p.category === PlaceCategory.CAFE);
    } else if (theme.slug === 'photo-spot') {
      themeAnchors = validDbPlaces.filter(
        (p) => p.category === PlaceCategory.CULTURE || p.category === PlaceCategory.VIEWPOINT,
      );
    } else if (theme.slug === 'traditional-market') {
      themeAnchors = validDbPlaces.filter((p) => p.category === PlaceCategory.MARKET);
    } else {
      themeAnchors = validDbPlaces.filter((p) => p.category === PlaceCategory.NATURE);
    }

    if (themeAnchors.length < 20) {
      themeAnchors = [
        ...themeAnchors,
        ...validDbPlaces.filter((p) => !themeAnchors.includes(p)),
      ];
    }
    themeAnchors = themeAnchors.slice(0, 20);

    for (let courseIdx = 0; courseIdx < themeAnchors.length; courseIdx++) {
      const anchor = themeAnchors[courseIdx];
      totalRouteCount++;

      // 경유지 수: 4개 고정
      const targetStopCount = 4;
      const slotPatterns = getThemeSlotPattern(theme.slug, targetStopCount);

      const selectedStops: any[] = [anchor];
      const usedPlaceIds = new Set<string>([anchor.id]);
      let lastCategory: PlaceCategory | null = anchor.category ?? null;

      // Slot 1은 anchor가 담당, Slot 2 ~ S 조립 (Nearest Neighbor + 연속 동일 카테고리 방지 + 5단계 Fallback)
      for (let slotIdx = 1; slotIdx < slotPatterns.length; slotIdx++) {
        const slot = slotPatterns[slotIdx];
        const prevStop = selectedStops[selectedStops.length - 1];

        // 이전 스팟 기준 Haversine 직선 거리순 후보군 정렬
        const sortedCandidates = validDbPlaces
          .filter((p) => !usedPlaceIds.has(p.id))
          .map((p) => ({
            place: p,
            distance: calculateHaversineDistance(
              Number(prevStop.latitude),
              Number(prevStop.longitude),
              Number(p.latitude),
              Number(p.longitude),
            ),
          }))
          .sort((a, b) => a.distance - b.distance);

        // 1차: 슬롯 조건 부합 & 직전 카테고리와 연속되지 않는 최단거리 장소 (FOOD->FOOD 방지)
        let pickedCandidate = sortedCandidates.find((c) => {
          const isCatMatch =
            slot.primaryCategories && slot.primaryCategories.includes(c.place.category);
          const isBeachMatch = slot.isBeach ? isBeachPlace(c.place) : true;
          const isNoConsecutiveSameCategory = lastCategory !== c.place.category;
          return (isCatMatch || slot.isBeach) && isBeachMatch && isNoConsecutiveSameCategory;
        })?.place;

        // 2차: 슬롯 조건 부합 최단거리 장소 (동일 카테고리 연속 방지 조건 완화)
        if (!pickedCandidate) {
          pickedCandidate = sortedCandidates.find((c) => {
            const isCatMatch =
              slot.primaryCategories && slot.primaryCategories.includes(c.place.category);
            const isBeachMatch = slot.isBeach ? isBeachPlace(c.place) : true;
            return (isCatMatch || slot.isBeach) && isBeachMatch;
          })?.place;
        }

        // 3차 (Fallback): Fallback 카테고리 & 연속 방지
        if (!pickedCandidate && slot.fallbackCategories) {
          pickedCandidate = sortedCandidates.find((c) => {
            const isFallbackMatch = slot.fallbackCategories!.includes(c.place.category);
            const isNoConsecutiveSameCategory = lastCategory !== c.place.category;
            return isFallbackMatch && isNoConsecutiveSameCategory;
          })?.place;
        }

        // 4차 (최후 Fallback): 직전 카테고리와 연속되지 않는 최단거리 장소
        if (!pickedCandidate) {
          pickedCandidate = sortedCandidates.find(
            (c) => lastCategory !== c.place.category,
          )?.place;
        }

        // 5차 (Crash 방지): 무조건 최단거리 장소 자동 할당
        if (!pickedCandidate && sortedCandidates.length > 0) {
          pickedCandidate = sortedCandidates[0].place;
        }

        if (pickedCandidate) {
          selectedStops.push(pickedCandidate);
          usedPlaceIds.add(pickedCandidate.id);
          lastCategory = pickedCandidate.category ?? null;
        }
      }

      // [정책 검증 C-2] 경유지 수 4개 미달 시 코스 SKIP (4개 스팟 표준 정규화)
      if (selectedStops.length < targetStopCount) {
        console.warn(
          `⚠️ [코스 #${totalRouteCount}] 경유지 수 미달(${selectedStops.length}개 / 목표 ${targetStopCount}개) → 코스 SKIP (테마: ${theme.slug}, Anchor: ${anchor.name})`,
        );
        totalRouteCount--;
        continue;
      }
      const uniqueStops = selectedStops.slice(0, targetStopCount);

      // 결정론적 고유 해시 ID (SHA256)
      const hash = crypto
        .createHash('sha256')
        .update(`oiso-route-${theme.slug}-${anchor.id}-${courseIdx}`)
        .digest('hex')
        .substring(0, 16);
      const routeId = `route-${hash}`;

      const formattedThemeName = theme.name.startsWith('부산')
        ? theme.name
        : `부산 ${theme.name}`;
      const routeName = `${formattedThemeName} - ${anchor.name} 릴레이 ${courseIdx + 1}호 코스`;
      const summary = `${anchor.name}을(를) 거점으로 ${theme.name}의 매력을 만끽하는 ${uniqueStops.length}스팟 맞춤 동선`;

      let foodCostWon = 0;
      let experienceCostWon = 0;
      let transportCostWon = 0;
      let totalElevationGainMeters = 0;
      let totalDifficultyScore = 0;
      let totalDistanceMeters = 0;
      let totalTimeMin = 0;
      let localPlaceCount = 0;

      let prevElevation = Number(uniqueStops[0].elevationMeters ?? 15);
      const stopCreateInputs: any[] = [];

      for (let i = 0; i < uniqueStops.length; i++) {
        const place = uniqueStops[i];
        const currentElevation = Number(place.elevationMeters ?? 15);

        // 주소지 정규식 기반 외곽 로컬 상권 스팟 판별
        if (classifyDistrictType(place.address) === 'LOCAL') {
          localPlaceCount++;
        }

        let elevationGainMeters = 0;
        let distMeters = 0;

        if (i > 0) {
          elevationGainMeters = Math.max(0, currentElevation - prevElevation);
          distMeters = calculateHaversineDistance(
            Number(uniqueStops[i - 1].latitude),
            Number(uniqueStops[i - 1].longitude),
            Number(place.latitude),
            Number(place.longitude),
          );
        }
        prevElevation = currentElevation;
        totalElevationGainMeters += elevationGainMeters;

        const isFoodCategory =
          place.category === PlaceCategory.FOOD || place.category === PlaceCategory.CAFE;
        const transitType: TransitType = (
          distMeters > 0 && distMeters < 1000
            ? TransitType.WALKING
            : TransitType.BUS
        ) as TransitType;

        const travelMin =
          i === 0 ? 0 : calculateTravelTimeMinutes(transitType, distMeters);
        const stayMin = isFoodCategory ? 90 : 60;

        // 이동수단별 정밀 요금 연산 (첫번째 경유지 i === 0은 무조건 0원)
        let fareWon = 0;
        if (i > 0) {
          if (transitType === TransitType.BUS) {
            fareWon = 1500; // 부산 시내버스 정액
          } else if (transitType === TransitType.SUBWAY) {
            fareWon = 1400; // 부산 도시철도 정액
          } else if (transitType === TransitType.TAXI) {
            fareWon = 4800 + Math.round(Math.max(0, distMeters - 2000) * 1.0); // 택시 기본 4,800원+거리비례
          }
        }

        // 카테고리별 및 장소 해시 기반 현실적 예상 지출 가격 연산
        let price = 5000;
        const placeNameHash = String(place.name || '').length * 500;
        if (place.category === PlaceCategory.FOOD) {
          price = 12000 + (placeNameHash % 5000); // 12,000 ~ 16,500원
        } else if (place.category === PlaceCategory.CAFE) {
          price = 5500 + (placeNameHash % 2500); // 5,500 ~ 7,500원
        } else if (
          place.category === PlaceCategory.CULTURE ||
          place.category === PlaceCategory.EXPERIENCE
        ) {
          price = 4000 + (placeNameHash % 4000); // 4,000 ~ 7,500원
        } else if (place.category === PlaceCategory.MARKET) {
          price = 6000 + (placeNameHash % 8000); // 6,000 ~ 13,500원
        } else {
          // NATURE, VIEWPOINT 등: 1,000 ~ 4,000원 (무료~소정 입장료) [M-2] 최소 1,000원 보장
          price = 1000 + (placeNameHash % 3000);
        }

        if (place.category === PlaceCategory.FOOD || place.category === PlaceCategory.CAFE) {
          foodCostWon += price;
        } else {
          experienceCostWon += price;
        }
        transportCostWon += fareWon;

        const diffScore = calculateDifficultyScore(
          distMeters,
          elevationGainMeters,
          fareWon,
          transitType,
        );

        totalDifficultyScore += diffScore;
        totalDistanceMeters += distMeters;
        totalTimeMin += travelMin + stayMin;

        let pathCoordinates: Array<{ latitude: number; longitude: number }> = [];
        if (i > 0) {
          const p1 = {
            latitude: Number(uniqueStops[i - 1].latitude),
            longitude: Number(uniqueStops[i - 1].longitude),
          };
          const p2 = {
            latitude: Number(place.latitude),
            longitude: Number(place.longitude),
          };
          pathCoordinates = await kakaoMobilityService.fetchPathCoordinates(
            p1,
            p2,
            [],
            transitType,
          );
        }

        // [C-3] 스팟 레벨 절약액 산출 - DashboardRepository 카테고리별 집계 정상화
        const spotDistrictType = classifyDistrictType(place.address);
        const spotSavingsWon = calculateSpotSavingsWon(price, spotDistrictType);

        stopCreateInputs.push({
          placeId: place.id,
          orderIndex: i,
          transitType,
          travelMinutesFromPrev: travelMin,
          stayMinutes: stayMin,
          distanceFromPrevMeters: distMeters,
          elevationGainMeters,
          difficultyScore: new Prisma.Decimal(diffScore),
          fareWon,
          estimatedPriceWon: price,
          savingsWon: spotSavingsWon,
          transitDetails: {
            dayNumber: 1,
            pathCoordinates,
          },
        });
      }

      const estimatedCostWon = foodCostWon + experienceCostWon + transportCostWon;

      // [M-4] 정책 비용 범위 검증 경고 (25,000원 ~ 45,500원)
      const POLICY_MIN_COST = 25_000;
      const POLICY_MAX_COST = 45_500;
      if (estimatedCostWon < POLICY_MIN_COST || estimatedCostWon > POLICY_MAX_COST) {
        console.warn(
          `⚠️ [코스 #${totalRouteCount}] 비용 정책 범위 이탈: ${estimatedCostWon.toLocaleString()}원 (정책: ${POLICY_MIN_COST.toLocaleString()}~${POLICY_MAX_COST.toLocaleString()}원)`,
        );
      }

      // [m-1] 이동거리 정책 범위 검증 경고 (2,000m ~ 15,000m)
      const POLICY_MIN_DISTANCE_M = 2_000;
      const POLICY_MAX_DISTANCE_M = 15_000;
      if (totalDistanceMeters < POLICY_MIN_DISTANCE_M || totalDistanceMeters > POLICY_MAX_DISTANCE_M) {
        console.warn(
          `⚠️ [코스 #${totalRouteCount}] 이동거리 정책 범위 이탈: ${totalDistanceMeters.toLocaleString()}m (정책: ${POLICY_MIN_DISTANCE_M.toLocaleString()}~${POLICY_MAX_DISTANCE_M.toLocaleString()}m)`,
        );
      }

      // [m-2] 소요시간 정책 범위 검증 경고 (180분 ~ 480분)
      const POLICY_MIN_DURATION_MIN = 180;
      const POLICY_MAX_DURATION_MIN = 480;
      if (totalTimeMin < POLICY_MIN_DURATION_MIN || totalTimeMin > POLICY_MAX_DURATION_MIN) {
        console.warn(
          `⚠️ [코스 #${totalRouteCount}] 소요시간 정책 범위 이탈: ${totalTimeMin}분 (정책: ${POLICY_MIN_DURATION_MIN}~${POLICY_MAX_DURATION_MIN}분)`,
        );
      }
      const matchingThemes: string[] = [theme.slug];
      if (uniqueStops.some((p) => isBeachPlace(p)) && theme.slug !== 'beach-tour') {
        matchingThemes.push('beach-tour');
      }
      const foodCount = uniqueStops.filter((p) => p.category === PlaceCategory.FOOD).length;
      if (foodCount >= 2 && theme.slug !== 'local-food') {
        matchingThemes.push('local-food');
      }
      if (uniqueStops.some((p) => p.category === PlaceCategory.CAFE)) {
        matchingThemes.push('emotion-cafe');
      }
      if (uniqueStops.some((p) => p.category === PlaceCategory.CULTURE || p.category === PlaceCategory.VIEWPOINT)) {
        matchingThemes.push('photo-spot');
      }
      if (uniqueStops.some((p) => p.category === PlaceCategory.MARKET)) {
        matchingThemes.push('traditional-market');
      }
      if (uniqueStops.some((p) => p.category === PlaceCategory.NATURE)) {
        matchingThemes.push('nature-walk');
      }
      const themeSlugs = Array.from(new Set(matchingThemes)).slice(0, 2);

      const themeConnections = themeSlugs.map((slug) => ({
        theme: { connect: { slug } },
      }));

      const hasBusOrSubway = stopCreateInputs.some(
        (s) => s.transitType === TransitType.BUS || s.transitType === TransitType.SUBWAY,
      );
      // 로컬 기여 점수: 로컬 비율 70점 + 가격 합리성 30점 (2축 산출)
      const localRatio = localPlaceCount / uniqueStops.length;
      const avgCostPerStop = estimatedCostWon / uniqueStops.length;
      const localRatioScore = localRatio * 70;
      const priceRationalityScore = Math.min(
        30,
        Math.max(0, (30000 - avgCostPerStop) / 300),
      );
      const localContributionScore = Math.round(
        localRatioScore + priceRationalityScore,
      );
      const calculatedScore = calculateBaseScore(
        totalDifficultyScore,
        totalDistanceMeters,
        localContributionScore,
        hasBusOrSubway,
      );

      // 절약액: 관광지 기준가(+35%) 대비 로컬 이용 절약 + 대중교통 이용 절약
      const localSavingsWon = Math.round(estimatedCostWon * 0.35 * localRatio);
      const transitSavingsWon = hasBusOrSubway
        ? Math.round(transportCostWon * 2.5)
        : 0;
      const estimatedSavingsWon = localSavingsWon + transitSavingsWon;

      // 기존 릴레이션 cleanup 후 Upsert - 배열형 원자적 트랜잭션으로 RTT 단축 및 타임아웃 방지 [C-1]
      const [, , route] = await prisma.$transaction([
        prisma.routeStop.deleteMany({ where: { route: { id: routeId } } }),
        prisma.routeTheme.deleteMany({ where: { route: { id: routeId } } }),
        prisma.route.upsert({
          where: { id: routeId },
          update: {
            name: routeName,
            summary,
            region: '부산광역시',
            routeType: RouteType.RECOMMENDED,
            isPublished: true,
            congestionLevel:
              totalRouteCount % 3 === 0
                ? CongestionLevel.HIGH
                : totalRouteCount % 2 === 0
                  ? CongestionLevel.MEDIUM
                  : CongestionLevel.LOW,
            score: new Prisma.Decimal(calculatedScore),
            estimatedCostWon,
            foodCostWon,
            experienceCostWon,
            transportCostWon,
            totalElevationGainMeters,
            totalDifficultyScore: new Prisma.Decimal(
              Number(totalDifficultyScore.toFixed(2)),
            ),
            estimatedDurationMin: totalTimeMin,
            totalDistanceMeters,
            estimatedSavingsWon,
            localContributionScore,
            stops: {
              create: stopCreateInputs,
            },
            themes: {
              create: themeConnections,
            },
          },
          create: {
            id: routeId,
            name: routeName,
            summary,
            region: '부산광역시',
            routeType: RouteType.RECOMMENDED,
            isPublished: true,
            congestionLevel:
              totalRouteCount % 3 === 0
                ? CongestionLevel.HIGH
                : totalRouteCount % 2 === 0
                  ? CongestionLevel.MEDIUM
                  : CongestionLevel.LOW,
            score: new Prisma.Decimal(calculatedScore),
            estimatedCostWon,
            foodCostWon,
            experienceCostWon,
            transportCostWon,
            totalElevationGainMeters,
            totalDifficultyScore: new Prisma.Decimal(
              Number(totalDifficultyScore.toFixed(2)),
            ),
            estimatedDurationMin: totalTimeMin,
            totalDistanceMeters,
            estimatedSavingsWon,
            localContributionScore,
            stops: {
              create: stopCreateInputs,
            },
            themes: {
              create: themeConnections,
            },
          },
        }),
      ]);

      createdRouteIds.push(route.id);

      console.log(
        `✅ [코스 #${totalRouteCount}/120] "${route.name}" (테마: ${theme.slug}, 경유지: ${uniqueStops.length}개, 비용: ${estimatedCostWon}원, 고도상승: ${totalElevationGainMeters}m)`,
      );
    }
  }

  // 120개 코스 적재가 100% 온전히 완료된 직후에만 생성된 ID 외의 레거시 추천 코스 일괄 정리 [Zero-Downtime Swap]
  if (createdRouteIds.length === 120) {
    const cleanupResult = await prisma.route.deleteMany({
      where: {
        routeType: RouteType.RECOMMENDED,
        id: { notIn: createdRouteIds },
      },
    });
    if (cleanupResult.count > 0) {
      console.log(`🧹 미사용/레거시 추천 코스 ${cleanupResult.count}건 안전 정리 완료 (Zero-Downtime Swap)`);
    }
  }

  console.log('🎉 6대 테마 × 20개 코스 = 총 120개 마스터 추천 코스 적재가 완벽히 완료되었습니다!');
}

seedRecommendRoutes()
  .catch((err) => {
    console.error('❌ SEED 스크립트 실행 오류:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
