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
 * 한국관광공사 연관 관광지 정보 API (TarRlteTarService1) 수집 헬퍼 함수
 */
async function fetchRelatedTourPlaces(): Promise<any[]> {
  const rawApiKey = process.env.VK_KORSERVICE2_API_KEY;
  if (!rawApiKey) return [];

  const serviceKey = decodeURIComponent(rawApiKey);
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

/**
 * 6대 마스터 테마별 4-슬롯(Slot) 시퀀스 패턴 정의
 */
function getThemeSlotPattern(themeSlug: string, targetStopCount: number): SlotPattern[] {
  if (themeSlug === 'local-food') {
    // 1) local-food: Slot 1(FOOD) -> Slot 2(CAFE) -> Slot 3(FOOD/MARKET) -> Slot 4(VIEWPOINT/NATURE)
    const pattern: SlotPattern[] = [
      { primaryCategories: [PlaceCategory.FOOD] },
      { primaryCategories: [PlaceCategory.CAFE] },
      { primaryCategories: [PlaceCategory.FOOD, PlaceCategory.MARKET] },
    ];
    if (targetStopCount === 4) {
      pattern.push({
        primaryCategories: [PlaceCategory.VIEWPOINT, PlaceCategory.NATURE],
        fallbackCategories: [PlaceCategory.CULTURE, PlaceCategory.EXPERIENCE],
      });
    }
    return pattern;
  }

  if (themeSlug === 'emotion-cafe') {
    // 2) emotion-cafe: Slot 1(CAFE) -> Slot 2(CULTURE/VIEWPOINT) -> Slot 3(FOOD) -> Slot 4(CAFE)
    const pattern: SlotPattern[] = [
      { primaryCategories: [PlaceCategory.CAFE] },
      { primaryCategories: [PlaceCategory.CULTURE, PlaceCategory.VIEWPOINT] },
      { primaryCategories: [PlaceCategory.FOOD] },
    ];
    if (targetStopCount === 4) {
      pattern.push({
        primaryCategories: [PlaceCategory.CAFE],
        fallbackCategories: [PlaceCategory.VIEWPOINT, PlaceCategory.EXPERIENCE],
      });
    }
    return pattern;
  }

  if (themeSlug === 'beach-tour') {
    // 3) beach-tour: Slot 1(BEACH) -> Slot 2(FOOD) -> Slot 3(BEACH/CAFE) -> Slot 4(VIEWPOINT)
    const pattern: SlotPattern[] = [
      { isBeach: true, primaryCategories: [PlaceCategory.NATURE, PlaceCategory.EXPERIENCE, PlaceCategory.VIEWPOINT] },
      { primaryCategories: [PlaceCategory.FOOD] },
      { isBeach: true, primaryCategories: [PlaceCategory.CAFE, PlaceCategory.EXPERIENCE, PlaceCategory.NATURE] },
    ];
    if (targetStopCount === 4) {
      pattern.push({
        primaryCategories: [PlaceCategory.VIEWPOINT],
        fallbackCategories: [PlaceCategory.NATURE, PlaceCategory.CAFE],
      });
    }
    return pattern;
  }

  if (themeSlug === 'photo-spot') {
    // 4) photo-spot: Slot 1(CULTURE) -> Slot 2(CAFE) -> Slot 3(VIEWPOINT) -> Slot 4(FOOD/MARKET)
    const pattern: SlotPattern[] = [
      { primaryCategories: [PlaceCategory.CULTURE] },
      { primaryCategories: [PlaceCategory.CAFE] },
      { primaryCategories: [PlaceCategory.VIEWPOINT] },
    ];
    if (targetStopCount === 4) {
      pattern.push({
        primaryCategories: [PlaceCategory.FOOD, PlaceCategory.MARKET],
        fallbackCategories: [PlaceCategory.CULTURE, PlaceCategory.CAFE],
      });
    }
    return pattern;
  }
    if (themeSlug === 'traditional-market') {
    // 5) traditional-market: Slot 1(MARKET) -> Slot 2(CAFE) -> Slot 3(FOOD) -> Slot 4(CULTURE/VIEWPOINT)
    const pattern: SlotPattern[] = [
      { primaryCategories: [PlaceCategory.MARKET] },
      { primaryCategories: [PlaceCategory.CAFE] },
      { primaryCategories: [PlaceCategory.FOOD] },
    ];
    if (targetStopCount === 4) {
      pattern.push({
        primaryCategories: [PlaceCategory.CULTURE, PlaceCategory.VIEWPOINT],
        fallbackCategories: [PlaceCategory.MARKET, PlaceCategory.FOOD],
      });
    }
    return pattern;
  }

  // 6) nature-walk: Slot 1(NATURE) -> Slot 2(FOOD/CAFE) -> Slot 3(NATURE) -> Slot 4(VIEWPOINT)
  const pattern: SlotPattern[] = [
    { primaryCategories: [PlaceCategory.NATURE] },
    { primaryCategories: [PlaceCategory.FOOD, PlaceCategory.CAFE] },
    { primaryCategories: [PlaceCategory.NATURE] },
  ];
  if (targetStopCount === 4) {
    pattern.push({
      primaryCategories: [PlaceCategory.VIEWPOINT],
      fallbackCategories: [PlaceCategory.EXPERIENCE, PlaceCategory.CAFE],
    });
  }
  return pattern;
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

  // 이전 추천 루트 전체 멱등성 클린업 (오래된 데이터 잔여 방지)
  await prisma.routeStop.deleteMany({ where: { route: { routeType: RouteType.RECOMMENDED } } });
  await prisma.routeTheme.deleteMany({ where: { route: { routeType: RouteType.RECOMMENDED } } });
  await prisma.route.deleteMany({ where: { routeType: RouteType.RECOMMENDED } });

  let totalRouteCount = 0;

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

      // 경유지 수: 3 ~ 4개 가변 정돈 (모듈 기준)
      const targetStopCount = 3 + (totalRouteCount % 2); // 3개 또는 4개 가변
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

      let prevElevation = Number(uniqueStops[0].elevationMeters ?? 15);
      const stopCreateInputs: Prisma.RouteStopUncheckedCreateWithoutRouteInput[] = [];

      for (let i = 0; i < uniqueStops.length; i++) {
        const place = uniqueStops[i];
        const currentElevation = Number(place.elevationMeters ?? 15);

        let elevationGainMeters = 0;
        let distMeters = 0;

        if (i > 0) {
          // 이동 순서 상대 오르막 고도 상승분: 오르막만 저장, 내리막 0m
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

        const isFood = place.category === PlaceCategory.FOOD || place.category === PlaceCategory.CAFE;
        const price = isFood ? 12000 : 5000;
        const transitType: TransitType = (
          distMeters > 0 && distMeters < 1000
            ? TransitType.WALKING
            : TransitType.BUS
        ) as TransitType;
        const travelMin =
          i === 0 ? 0 : calculateTravelTimeMinutes(transitType, distMeters);
        const stayMin = isFood ? 90 : 60;

        // 이동수단별 교통 요금 계산 (BUS/SUBWAY: 1,500원 정액, 그 외 0원)
        const fareWon: number =
          (transitType as TransitType) === TransitType.BUS ||
          (transitType as TransitType) === TransitType.SUBWAY
            ? 1500
            : 0;

        if (isFood) foodCostWon += price;
        else experienceCostWon += price;
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
          // transitType을 전달하여 도보 구간은 도보 경로 API로 조회
          pathCoordinates = await kakaoMobilityService.fetchPathCoordinates(
            p1,
            p2,
            [],
            transitType,
          );
        }

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
          transitDetails: {
            dayNumber: 1,
            pathCoordinates,
          },
        });
      }

      const estimatedCostWon = foodCostWon + experienceCostWon + transportCostWon;
      const themeSlugs = Array.from(new Set([theme.slug, 'beach-tour', 'local-food'])).slice(0, 2);

      const themeConnections = themeSlugs.map((slug) => ({
        theme: { connect: { slug } },
      }));

      // 코스 기본 점수 BaseScore 사전 연산 (BaseScore = max(50.0, 95.0 - (0.05 * D)))
      const calculatedScore = calculateBaseScore(totalDifficultyScore);

      // 기존 릴레이션 cleanup 후 Upsert
      await prisma.routeStop.deleteMany({ where: { route: { id: routeId } } });
      await prisma.routeTheme.deleteMany({ where: { route: { id: routeId } } });

      const route = await prisma.route.upsert({
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
          estimatedSavingsWon: 4500,
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
          estimatedSavingsWon: 4500,
          stops: {
            create: stopCreateInputs,
          },
          themes: {
            create: themeConnections,
          },
        },
      });

      console.log(
        `✅ [코스 #${totalRouteCount}/120] "${route.name}" (테마: ${theme.slug}, 경유지: ${uniqueStops.length}개, 비용: ${estimatedCostWon}원, 고도상승: ${totalElevationGainMeters}m)`,
      );
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
