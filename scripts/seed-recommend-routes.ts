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

dotenv.config();

const prisma = new PrismaClient();

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

/**
 * 두 위경도 좌표 간 하버스인(Haversine) 직선 거리(m) 연산
 */
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // 지구 반지름 (m)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * 구간 체감 이동 난이도 비용 함수 연산
 */
function calculateDifficultyScore(
  distanceMeters: number,
  elevationGainMeters: number,
  fareWon: number,
  transitType: TransitType,
): number {
  let elevationWeight = 1.0;
  if (transitType === TransitType.WALKING && elevationGainMeters > 0) {
    elevationWeight = 2.0; // 보행 경사 가중치 2배 극대화
  }

  const score =
    distanceMeters * 0.01 +
    elevationGainMeters * elevationWeight +
    fareWon * 0.001;

  return Number(score.toFixed(2));
}

async function seedRecommendRoutes() {
  console.log('🚀 [30개 마스터 추천 코스 SEED] 6대 테마 × 5개 코스 동적 적재를 시작합니다...');

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

  console.log(`📌 DB 마스터 장소 ${allDbPlaces.length}건 기반으로 6대 테마 × 5개 코스 = 총 30개 코스 적재를 시작합니다.`);

  let totalRouteCount = 0;

  // 4. 6대 테마 각각 마다 5개 코스씩 총 30개 마스터 코스 100% 동적 생성
  for (const theme of masterThemes) {
    // 테마 성격에 부합하는 장소들 필터링
    let themeCategoryFilters: PlaceCategory[] = [];
    if (theme.slug === 'local-food') themeCategoryFilters = [PlaceCategory.FOOD, PlaceCategory.MARKET];
    else if (theme.slug === 'emotion-cafe') themeCategoryFilters = [PlaceCategory.CAFE, PlaceCategory.FOOD];
    else if (theme.slug === 'beach-tour') themeCategoryFilters = [PlaceCategory.NATURE, PlaceCategory.EXPERIENCE];
    else if (theme.slug === 'photo-spot') themeCategoryFilters = [PlaceCategory.CULTURE, PlaceCategory.EXPERIENCE];
    else if (theme.slug === 'traditional-market') themeCategoryFilters = [PlaceCategory.MARKET, PlaceCategory.FOOD];
    else themeCategoryFilters = [PlaceCategory.NATURE, PlaceCategory.CULTURE];

    const targetPlaces = allDbPlaces.filter((p) => themeCategoryFilters.includes(p.category));
    const themeAnchors = (targetPlaces.length >= 5 ? targetPlaces : allDbPlaces).slice(0, 5);

    for (let courseIdx = 0; courseIdx < themeAnchors.length; courseIdx++) {
      const anchor = themeAnchors[courseIdx];
      totalRouteCount++;

      // 거리순 정렬
      const otherPlaces = allDbPlaces.filter((p) => p.id !== anchor.id);
      const sortedByDistance = otherPlaces.map((p) => ({
        place: p,
        distance: calculateHaversineDistance(
          Number(anchor.latitude),
          Number(anchor.longitude),
          Number(p.latitude),
          Number(p.longitude),
        ),
      })).sort((a, b) => a.distance - b.distance);

      // 경유지 수: 4 ~ 6개 가변 조립 (부정합 3 해결!)
      const targetStopCount = 4 + (totalRouteCount % 3); // 4, 5, 6개 가변
      const rawStops = [
        anchor,
        sortedByDistance.find((i) => i.place.category === PlaceCategory.FOOD || i.place.category === PlaceCategory.CAFE)?.place || sortedByDistance[0].place,
        sortedByDistance.find((i) => i.place.category === PlaceCategory.CULTURE || i.place.category === PlaceCategory.NATURE)?.place || sortedByDistance[1].place,
        ...sortedByDistance.slice(2, targetStopCount + 2).map((i) => i.place),
      ];

      const uniqueStops = Array.from(new Set(rawStops)).slice(0, targetStopCount);

      // 결정론적 고유 해시 ID (SHA256)
      const hash = crypto
        .createHash('sha256')
        .update(`oiso-route-${theme.slug}-${anchor.id}-${courseIdx}`)
        .digest('hex')
        .substring(0, 16);
      const routeId = `route-${hash}`;

      const routeName = `부산 ${theme.name} - ${anchor.name} 릴레이 ${courseIdx + 1}호 코스`;
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
        const fare = i === 0 ? 0 : 1500;
        const travelMin = i === 0 ? 0 : Math.max(10, Math.round(distMeters / 100));
        const stayMin = isFood ? 90 : 60;

        if (isFood) foodCostWon += price;
        else experienceCostWon += price;
        transportCostWon += fare;

        const transitType = distMeters > 0 && distMeters < 1000 ? TransitType.WALKING : TransitType.BUS;
        const diffScore = calculateDifficultyScore(
          distMeters,
          elevationGainMeters,
          fare,
          transitType,
        );

        totalDifficultyScore += diffScore;
        totalDistanceMeters += distMeters;
        totalTimeMin += travelMin + stayMin;

        stopCreateInputs.push({
          placeId: place.id,
          orderIndex: i,
          transitType,
          travelMinutesFromPrev: travelMin,
          stayMinutes: stayMin,
          distanceFromPrevMeters: distMeters,
          elevationGainMeters,
          difficultyScore: new Prisma.Decimal(diffScore),
          fareWon: fare,
          estimatedPriceWon: price,
        });
      }

      const estimatedCostWon = foodCostWon + experienceCostWon + transportCostWon;
      const themeSlugs = Array.from(new Set([theme.slug, 'beach-tour', 'local-food'])).slice(0, 2);

      const themeConnections = themeSlugs.map((slug) => ({
        theme: { connect: { slug } },
      }));

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
          congestionLevel: totalRouteCount % 3 === 0 ? CongestionLevel.HIGH : totalRouteCount % 2 === 0 ? CongestionLevel.MEDIUM : CongestionLevel.LOW,
          score: new Prisma.Decimal(92.0 - (totalRouteCount % 5) * 1.5),
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
          stops: { create: stopCreateInputs },
          themes: { create: themeConnections },
        },
        create: {
          id: routeId,
          name: routeName,
          summary,
          region: '부산광역시',
          routeType: RouteType.RECOMMENDED,
          isPublished: true,
          congestionLevel: totalRouteCount % 3 === 0 ? CongestionLevel.HIGH : totalRouteCount % 2 === 0 ? CongestionLevel.MEDIUM : CongestionLevel.LOW,
          score: new Prisma.Decimal(92.0 - (totalRouteCount % 5) * 1.5),
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
          stops: { create: stopCreateInputs },
          themes: { create: themeConnections },
        },
      });

      console.log(
        `✅ [코스 #${totalRouteCount}/30] "${route.name}" (테마: ${theme.slug}, 경유지: ${uniqueStops.length}개, 비용: ${estimatedCostWon}원, 고도상승: ${totalElevationGainMeters}m)`,
      );
    }
  }

  console.log(`🎉 6대 테마 × 5개 코스 = 총 ${totalRouteCount}개 마스터 추천 코스 적재가 완벽히 완료되었습니다!`);
}

seedRecommendRoutes()
  .catch((err) => {
    console.error('❌ SEED 스크립트 실행 오류:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
