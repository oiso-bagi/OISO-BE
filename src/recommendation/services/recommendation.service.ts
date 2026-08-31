import { BadRequestException, Injectable } from '@nestjs/common';
import { RecommendRouteRequestDto } from '@/recommendation/dto/recommend-route-request.dto';
import { RecommendationOptionsResponseDto } from '@/recommendation/dto/recommendation-options-response.dto';
import { RecommendationRepository } from '@/recommendation/repositories/recommendation.repository';
import type {
  BudgetAllocationRule,
  BudgetPreset,
  BudgetRatios,
  RecommendationFilter,
  TravelStyleOption,
} from '@/recommendation/types/recommendation.types';
import { RecommendedRouteListResponseDto } from '@/route/dto/recommended-route-list-response.dto';
import type { RouteWithStops } from '@/route/dto/recommended-route-detail-response.dto';

import {
  PlaceCategory,
  TransitType,
  RouteType,
  CongestionLevel,
  Prisma,
} from '@prisma/client';

export interface GenericPlace {
  id: string;
  name: string;
  category?: PlaceCategory | null;
  latitude?: Prisma.Decimal | number | null;
  longitude?: Prisma.Decimal | number | null;
}

export interface GenericStop {
  orderIndex: number;
  dayNumber?: number;
  transitType?: TransitType | null;
  travelMinutesFromPrev?: number | null;
  stayMinutes?: number | null;
  fareWon?: number | null;
  estimatedPriceWon?: number | null;
  place?: GenericPlace | null;
}

export interface GenericRoute {
  id: string;
  name: string;
  totalDistanceMeters: number;
  estimatedSavingsWon: number;
  score: number;
  routeType: RouteType;
  congestionLevel: CongestionLevel;
  estimatedCostWon?: number;
  foodCostWon?: number;
  experienceCostWon?: number;
  transportCostWon?: number;
  localContributionScore?: number | null;
  totalElevationGainMeters?: number | null;
  estimatedDurationMin?: number;
  totalDifficultyScore?: Prisma.Decimal | number | null;
  stops?: GenericStop[];
  themes?: Array<{ theme?: { slug?: string } | null }> | null;
}

const DEFAULT_DAILY_BUDGET_WON = 60000;
const MIN_TOTAL_BUDGET_WON = 10000;
const MAX_TOTAL_BUDGET_WON = 500000;

const DEFAULT_RATIOS: BudgetRatios = {
  foodRatio: 0.35,
  experienceRatio: 0.25,
  transportRatio: 0.4,
};

const TRAVEL_STYLE_OPTIONS: TravelStyleOption[] = [
  { slug: 'local-food', label: '부산 로컬 맛집' },
  { slug: 'emotion-cafe', label: '감성 카페' },
  { slug: 'beach-tour', label: '바다 관광' },
  { slug: 'photo-spot', label: '포토 스팟' },
  { slug: 'traditional-market', label: '전통시장' },
  { slug: 'nature-walk', label: '자연 / 산책' },
];

const DURATION_DAY_OPTIONS = [1, 2, 3, 4, 5];

const BUDGET_PRESETS: BudgetPreset[] = [
  { label: '~3만원 · 가성비', amountWon: 30000 },
  { label: '3~6만원 · 적당', amountWon: 60000 },
  { label: '6만원 이상 · 여유', amountWon: 90000 },
];

const BUDGET_ALLOCATION_RULES: BudgetAllocationRule[] = [
  { type: 'transport', label: '교통비', percentage: 40 },
  { type: 'food', label: '식비', percentage: 35 },
  { type: 'activity', label: '체험/입장료', percentage: 25 },
];

function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3;
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

@Injectable()
export class RecommendationService {
  constructor(
    private readonly recommendationRepository: RecommendationRepository,
  ) {}

  getOptions(): RecommendationOptionsResponseDto {
    return RecommendationOptionsResponseDto.of({
      travelStyles: TRAVEL_STYLE_OPTIONS,
      durationDays: DURATION_DAY_OPTIONS,
      budgetPresets: BUDGET_PRESETS,
      budgetAllocation: {
        defaultDailyBudgetWon: DEFAULT_DAILY_BUDGET_WON,
        rules: BUDGET_ALLOCATION_RULES,
      },
    });
  }

  async recommendRoutes(
    body: RecommendRouteRequestDto,
  ): Promise<RecommendedRouteListResponseDto[]> {
    const validatedInput = this.validateRecommendationInput(body);
    const rawCandidates =
      (await this.recommendationRepository.findRecommendedRoutes(
        validatedInput,
      )) as unknown as GenericRoute[];

    if (rawCandidates.length === 0) {
      return [];
    }

    // Step 2: Soft Filter (Final Score: 비율 오차 패널티, 혼잡도 가산점, 테마 일치 가산점, 예산 가점 연산)
    const ratios = validatedInput.ratios ?? DEFAULT_RATIOS;
    const actualTransportBudgetWon =
      ratios.transportRatio * validatedInput.dailyBudgetWon;
    const isPedestrianMode =
      validatedInput.isPedestrianMode ?? actualTransportBudgetWon < 4000;

    const candidateRoutes = rawCandidates
      .map((route) => ({
        ...route,
        score: this.calculateFinalScore(
          route,
          ratios,
          validatedInput.travelStyleSlugs,
          validatedInput.dailyBudgetWon,
          isPedestrianMode,
        ),
      }))
      .sort((a, b) => b.score - a.score);

    // 1일 여행 요청 시 Final Score 기준 Top 3 반환
    if (validatedInput.durationDays === 1) {
      return candidateRoutes
        .slice(0, 3)
        .map((route) =>
          RecommendedRouteListResponseDto.from(
            route as unknown as RouteWithStops,
          ),
        );
    }

    // Step 3: Multi-Day Stitching & Soft Penalty (N일차 체이닝 엔진)
    const stitchedRoutes = this.stitchMultiDayRoutes(
      candidateRoutes,
      validatedInput.durationDays,
      validatedInput.totalBudgetWon,
      validatedInput.travelStyleSlugs,
    );

    // Final Top 3 Selection
    return stitchedRoutes
      .slice(0, 3)
      .map((route) =>
        RecommendedRouteListResponseDto.from(
          route as unknown as RouteWithStops,
        ),
      );
  }

  private calculateFinalScore(
    route: GenericRoute,
    ratios: BudgetRatios,
    requestedThemeSlugs?: string[],
    dailyBudgetWon?: number,
    isPedestrianMode?: boolean,
  ): number {
    const totalCost = route.estimatedCostWon || 1;
    const actualFoodRatio = (route.foodCostWon || 0) / totalCost;
    const actualExperienceRatio = (route.experienceCostWon || 0) / totalCost;
    const actualTransportRatio = (route.transportCostWon || 0) / totalCost;

    const foodDiff = Math.pow(ratios.foodRatio - actualFoodRatio, 2);
    const experienceDiff = Math.pow(
      ratios.experienceRatio - actualExperienceRatio,
      2,
    );
    const transportDiff = Math.pow(
      ratios.transportRatio - actualTransportRatio,
      2,
    );
    // 5.0점 스케일 맞춤 비율 오차 패널티 (식비 1.5배 가중치, 체험 1.0배, 교통 0.8배)
    const variancePenalty =
      (foodDiff * 1.5 + experienceDiff * 1.0 + transportDiff * 0.8) * 0.5;

    // rawBaseScore(5.0 만점 척도) 정규화 (3.8 ~ 5.0점 범위를 3.2 ~ 4.10 스케일로 매핑)
    const rawBaseScore = route.score != null ? Number(route.score) : 4.0;
    const baseScore =
      3.2 + Math.max(0, Math.min(0.9, (rawBaseScore - 3.8) * (0.9 / 1.2)));

    // 유저 선택 테마 부합 여부에 따른 테마 우대 가산점 (1개 일치시 +0.3점, 2개 이상 일치시 +0.45점, 미일치시 -0.2점)
    let themeBonus = 0;
    let primaryThemeBonus = 0;
    if (requestedThemeSlugs && requestedThemeSlugs.length > 0) {
      const routeThemes = route.themes ?? [];
      const routeThemeSlugs = routeThemes
        .map((t) => t?.theme?.slug)
        .filter((s): s is string => typeof s === 'string');
      const matchedCount = requestedThemeSlugs.filter((slug) =>
        routeThemeSlugs.includes(slug),
      ).length;

      if (matchedCount > 0) {
        themeBonus = matchedCount >= 2 ? 0.45 : 0.3;
      } else {
        themeBonus = -0.2;
      }

      // [타이브레이커 1] 1순위 대표 기획 테마 일치 시 추가 특화 보너스 (+0.06점)
      const primaryThemeSlug = routeThemes[0]?.theme?.slug;
      if (primaryThemeSlug && requestedThemeSlugs.includes(primaryThemeSlug)) {
        primaryThemeBonus = 0.06;
      }
    }

    // 예산 충실도 우대 (설정 예산의 40%~100% 사이 사용 코스 +0.15점, 미달시 -0.1점)
    let budgetBonus = 0;
    if (dailyBudgetWon && dailyBudgetWon > 0) {
      const budgetRatio = totalCost / dailyBudgetWon;
      if (budgetRatio >= 0.4 && budgetRatio <= 1.0) {
        budgetBonus = 0.15;
      } else if (budgetRatio < 0.25) {
        budgetBonus = -0.1;
      }
    }

    // 실시간 혼잡도 가감점 (LOW: +0.1점, HIGH: -0.15점)
    const congestionAdjustment = this.getCongestionAdjustment(
      route.congestionLevel,
    );

    // 외곽 로컬 상권 기여도 보너스 (최대 +0.1점 가산점)
    const localBonus = (Number(route.localContributionScore ?? 0) / 100) * 0.1;

    // 고도 피로도 차감 (기본 미세 감점 + 뚜벅이 전용 모드 시 가중 감점)
    const elevationGain = Number(route.totalElevationGainMeters ?? 0);
    const elevationPenalty = isPedestrianMode
      ? Math.max(0, Math.min(0.1, (elevationGain / 400) * 0.1))
      : Math.max(0, Math.min(0.05, (elevationGain / 400) * 0.05));

    // 총 소요시간 적정성 가감점 (3~6시간 쾌적 코스 +0.05점 우대, 7시간 초과 -0.1점 감점)
    const durationMin = route.estimatedDurationMin ?? 0;
    let durationAdjustment = 0;
    if (durationMin >= 180 && durationMin <= 360) {
      durationAdjustment = 0.05;
    } else if (durationMin > 420) {
      durationAdjustment = -0.1;
    }

    // [타이브레이커 2] 가성비 절약률 보너스 (지출 대비 절약액 비율 최대 +0.10점)
    const savingsWon = Number(route.estimatedSavingsWon || 0);
    const savingsRatio = Math.min(1.0, savingsWon / Math.max(1, totalCost));
    const savingsBonus = savingsRatio * 0.1;

    // [타이브레이커 3] 1일 이동 쾌적 거리(3km~5km) 우대 보너스 (+0.04점)
    const distanceMeters = Number(route.totalDistanceMeters || 0);
    let distanceBonus = 0;
    if (distanceMeters >= 3000 && distanceMeters <= 5000) {
      distanceBonus = 0.04;
    } else if (distanceMeters > 5000 && distanceMeters <= 7500) {
      distanceBonus = 0.02;
    }

    const finalScore =
      baseScore -
      variancePenalty +
      congestionAdjustment +
      localBonus -
      elevationPenalty +
      durationAdjustment +
      themeBonus +
      primaryThemeBonus +
      budgetBonus +
      savingsBonus +
      distanceBonus;

    const clamped5Score = Math.min(5.0, Math.max(0, finalScore));
    return Math.round((clamped5Score / 5.0) * 100);
  }

  private getCongestionAdjustment(congestionLevel: CongestionLevel): number {
    switch (congestionLevel) {
      case CongestionLevel.LOW:
        return 0.1;
      case CongestionLevel.HIGH:
        return -0.15;
      default:
        return 0;
    }
  }

  private stitchMultiDayRoutes(
    candidateRoutes: GenericRoute[],
    targetDurationDays: number,
    totalBudgetWon?: number,
    requestedThemeSlugs?: string[],
  ): GenericRoute[] {
    const results: GenericRoute[] = [];
    const previouslyStitchedRouteIds = new Set<string>();

    // 1일차 지정 테마가 있을 경우 해당 테마 후보군 우선 필터링
    const day1ThemeSlug =
      requestedThemeSlugs && requestedThemeSlugs.length > 0
        ? requestedThemeSlugs[0]
        : null;

    const day1Candidates = day1ThemeSlug
      ? candidateRoutes.filter((c) =>
          (c.themes ?? []).some((t) => t?.theme?.slug === day1ThemeSlug),
        )
      : candidateRoutes;

    const primaryDay1Pool =
      day1Candidates.length > 0 ? day1Candidates : candidateRoutes;

    const maxCombinations = Math.min(primaryDay1Pool.length, 5);

    for (let i = 0; i < maxCombinations; i++) {
      const day1Route = primaryDay1Pool[i];
      const selectedRoutes: GenericRoute[] = [day1Route];
      const visitedPlaceIds = new Set<string>();
      let totalChainingCostPenalty = 0;

      // 1일차 코스를 사용된 루트 목록에 등록하여 후속 패키지 재사용 시 UsedRoutePenalty 부여
      previouslyStitchedRouteIds.add(day1Route.id);

      const day1Stops = day1Route.stops || [];
      day1Stops.forEach((s) => {
        if (s.place?.id) visitedPlaceIds.add(s.place.id);
      });

      let currentLastStop =
        day1Stops.length > 0 ? day1Stops[day1Stops.length - 1] : null;

      for (let day = 2; day <= targetDurationDays; day++) {
        let bestNextRoute: GenericRoute | null = null;
        let minDistance = Infinity;

        // N일차 목표 테마 롤테이션 (다중 선택 시 2일차=2번째 테마, 3일차=3번째 테마...)
        const targetThemeSlug =
          requestedThemeSlugs && requestedThemeSlugs.length > 0
            ? requestedThemeSlugs[(day - 1) % requestedThemeSlugs.length]
            : null;

        const evaluateCandidate = (
          candidate: GenericRoute,
          allowSelectedReuse: boolean,
        ) => {
          if (!allowSelectedReuse && selectedRoutes.includes(candidate)) {
            return;
          }

          if (totalBudgetWon != null) {
            const currentAccumulatedCost = selectedRoutes.reduce(
              (sum, r) => sum + Number(r.estimatedCostWon || 0),
              0,
            );
            if (
              currentAccumulatedCost + Number(candidate.estimatedCostWon || 0) >
              totalBudgetWon
            ) {
              return;
            }
          }

          const candidateStops = candidate.stops || [];
          const firstStop =
            candidateStops.length > 0 ? candidateStops[0] : null;

          const candidatePlaceIds = candidateStops
            .map((s) => s.place?.id)
            .filter((id): id is string => typeof id === 'string');

          const hasOverlap = candidatePlaceIds.some((id) =>
            visitedPlaceIds.has(id),
          );

          let distance = 10000;
          if (currentLastStop?.place && firstStop?.place) {
            const lat1 = Number(currentLastStop.place.latitude);
            const lng1 = Number(currentLastStop.place.longitude);
            const lat2 = Number(firstStop.place.latitude);
            const lng2 = Number(firstStop.place.longitude);

            const isValidLat1 =
              currentLastStop.place.latitude != null &&
              Number.isFinite(lat1) &&
              lat1 >= -90 &&
              lat1 <= 90;
            const isValidLng1 =
              currentLastStop.place.longitude != null &&
              Number.isFinite(lng1) &&
              lng1 >= -180 &&
              lng1 <= 180;
            const isValidLat2 =
              firstStop.place.latitude != null &&
              Number.isFinite(lat2) &&
              lat2 >= -90 &&
              lat2 <= 90;
            const isValidLng2 =
              firstStop.place.longitude != null &&
              Number.isFinite(lng2) &&
              lng2 >= -180 &&
              lng2 <= 180;

            if (isValidLat1 && isValidLng1 && isValidLat2 && isValidLng2) {
              distance = calculateDistanceMeters(lat1, lng1, lat2, lng2);
            }
          }

          const overlapPenalty = hasOverlap ? 50000 : 0;
          const usedRoutePenalty = previouslyStitchedRouteIds.has(candidate.id)
            ? 20000
            : 0;

          // 요청한 N일차 테마에 부합할 경우 가산점 (-15,000m 거리 할인 효과)
          const candidateThemes = candidate.themes ?? [];
          const matchesTargetTheme =
            targetThemeSlug &&
            candidateThemes.some((t) => t?.theme?.slug === targetThemeSlug);
          const themeBonus = matchesTargetTheme ? -15000 : 0;

          const finalScore =
            distance + overlapPenalty + usedRoutePenalty + themeBonus;

          if (finalScore < minDistance) {
            minDistance = finalScore;
            bestNextRoute = candidate;
          }
        };

        // 1차 탐색: 아직 선택되지 않은 고유 코스 검색
        for (const candidate of candidateRoutes) {
          evaluateCandidate(candidate, false);
        }

        // 2차 탐색: 후보군이 부족하여 1차 탐색 실패 시 Soft Penalty 기반 재사용 코스 검색
        if (!bestNextRoute) {
          for (const candidate of candidateRoutes) {
            evaluateCandidate(candidate, true);
          }
        }

        if (bestNextRoute) {
          const nextRoute: GenericRoute = bestNextRoute;
          selectedRoutes.push(nextRoute);
          previouslyStitchedRouteIds.add(nextRoute.id);
          totalChainingCostPenalty += minDistance / 1000;
          const nextStops = nextRoute.stops || [];
          nextStops.forEach((s) => {
            if (s.place?.id) visitedPlaceIds.add(s.place.id);
          });
          currentLastStop =
            nextStops.length > 0
              ? nextStops[nextStops.length - 1]
              : currentLastStop;
        }
      }

      // N일 패키지의 목표 일수를 완전히 채우고 총 비용이 totalBudgetWon 이하인 경우만 결합 패키지로 수용
      if (selectedRoutes.length === targetDurationDays) {
        const stitchedRoute = this.combineChainedRoutes(
          selectedRoutes,
          targetDurationDays,
          results.length + 1,
          totalChainingCostPenalty,
        );
        if (
          totalBudgetWon == null ||
          Number(stitchedRoute.estimatedCostWon || 0) <= totalBudgetWon
        ) {
          results.push(stitchedRoute);
        }
      }
    }

    // 명시적 다일 패키지 종합 점수 기준 내림차순 정렬
    return results.sort((a, b) => b.score - a.score);
  }

  private combineChainedRoutes(
    routes: GenericRoute[],
    targetDurationDays: number,
    packageIdx: number,
    chainingCostPenalty = 0,
  ): GenericRoute {
    const combinedStops: GenericStop[] = [];
    let totalDistanceMeters = 0;
    let estimatedSavingsWon = 0;
    let estimatedCostWon = 0;
    let foodCostWon = 0;
    let experienceCostWon = 0;
    let transportCostWon = 0;
    let estimatedDurationMin = 0;
    let totalScoreSum = 0;
    let cumulativeSequence = 0;

    routes.forEach((route, idx) => {
      const dayNum = idx + 1;
      totalDistanceMeters += Number(route.totalDistanceMeters || 0);
      estimatedSavingsWon += Number(route.estimatedSavingsWon || 0);
      estimatedCostWon += Number(route.estimatedCostWon || 0);
      foodCostWon += Number(route.foodCostWon || 0);
      experienceCostWon += Number(route.experienceCostWon || 0);
      transportCostWon += Number(route.transportCostWon || 0);
      estimatedDurationMin += Number(route.estimatedDurationMin || 0);
      // nullish coalescing 적용하여 route.score가 유효한 0점일 때 85로 덮어씌워지지 않도록 방어
      totalScoreSum += route.score ?? 85;

      const stops = route.stops || [];
      stops.forEach((stop) => {
        combinedStops.push({
          ...stop,
          orderIndex: cumulativeSequence++,
          dayNumber: dayNum,
        });
      });
    });

    const leadRouteName = String(routes[0]?.name || '부산 여행');
    const durationText = `${targetDurationDays - 1}박 ${targetDurationDays}일`;
    const avgScore = totalScoreSum / routes.length;
    // 체이닝 과정의 패널티(이동거리/중복)를 감안한 명시적 다일 패키지 종합 점수 연산 (0~100점 백분율 스케일: 최대 -6점 감점 상한, 하한 0점 방어, 다일 우대 +1.0점)
    const penaltyDeduction = Math.max(
      0,
      Math.min(6.0, chainingCostPenalty * 0.1),
    );
    const multiDayBonus = targetDurationDays > 1 ? 1.0 : 0;
    const packageScore = Math.min(
      100,
      Math.max(0, Math.round(avgScore - penaltyDeduction + multiDayBonus)),
    );

    const routeIdsKey = routes
      .map((r) => r.id)
      .filter(Boolean)
      .join('_');

    return {
      id: `stitched-${routeIdsKey || String(routes[0]?.id || 'multi')}`,
      name: `[${durationText}] ${leadRouteName} 패키지 ${packageIdx}호`,
      totalDistanceMeters,
      estimatedSavingsWon,
      estimatedCostWon,
      foodCostWon,
      experienceCostWon,
      transportCostWon,
      estimatedDurationMin,
      score: packageScore,
      routeType: routes[0]?.routeType || 'RECOMMENDED',
      congestionLevel: routes[0]?.congestionLevel || 'MEDIUM',
      stops: combinedStops,
    };
  }

  private validateRecommendationInput(
    body: RecommendRouteRequestDto,
  ): RecommendationFilter {
    const travelStyleSlugs = this.validateTravelStyleSlugs(
      body?.travelStyleSlugs,
    );
    const durationDays = this.validateDurationDays(body?.durationDays);
    const dailyBudgetWon = this.validateDailyBudgetWon(body?.dailyBudgetWon);
    const totalBudgetWon = this.validateTotalBudgetWon(
      durationDays,
      dailyBudgetWon,
    );
    const ratios = this.validateBudgetRatios(body?.ratios);

    return {
      travelStyleSlugs,
      durationDays,
      dailyBudgetWon,
      totalBudgetWon,
      ratios,
      isPedestrianMode:
        typeof body?.isPedestrianMode === 'boolean'
          ? body.isPedestrianMode
          : undefined,
    };
  }

  private validateBudgetRatios(value: unknown): BudgetRatios | undefined {
    if (value == null) {
      return undefined;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('ratios는 객체 형식이어야 합니다.');
    }

    const raw = value as Record<string, unknown>;
    const foodRatio = this.validateRatioField(
      raw.foodRatio,
      'foodRatio',
      DEFAULT_RATIOS.foodRatio,
    );
    const experienceRatio = this.validateRatioField(
      raw.experienceRatio,
      'experienceRatio',
      DEFAULT_RATIOS.experienceRatio,
    );
    const transportRatio = this.validateRatioField(
      raw.transportRatio,
      'transportRatio',
      DEFAULT_RATIOS.transportRatio,
    );

    const sum = foodRatio + experienceRatio + transportRatio;
    if (Math.abs(sum - 1.0) >= 0.001) {
      throw new BadRequestException(
        'ratios의 합계(foodRatio + experienceRatio + transportRatio)는 1.0이어야 합니다.',
      );
    }

    return { foodRatio, experienceRatio, transportRatio };
  }

  private validateRatioField(
    value: unknown,
    label: string,
    defaultValue: number,
  ): number {
    if (value == null) {
      return defaultValue;
    }

    const parsed =
      typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : value;

    if (
      typeof parsed !== 'number' ||
      !Number.isFinite(parsed) ||
      parsed < 0 ||
      parsed > 1
    ) {
      throw new BadRequestException(
        `ratios.${label}은 0 이상 1 이하의 숫자여야 합니다.`,
      );
    }

    return parsed;
  }

  private validateTravelStyleSlugs(value: unknown): string[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException(
        'travelStyleSlugs는 최소 1개 이상 포함해야 합니다.',
      );
    }

    const rawTravelStyleSlugs: unknown[] = value;

    if (!this.isNonEmptyStringArray(rawTravelStyleSlugs)) {
      throw new BadRequestException(
        'travelStyleSlugs는 비어 있지 않은 문자열만 포함해야 합니다.',
      );
    }

    const travelStyleSlugs = Array.from(
      new Set(
        rawTravelStyleSlugs.map((travelStyleSlug) => travelStyleSlug.trim()),
      ),
    );

    if (travelStyleSlugs.length === 0) {
      throw new BadRequestException(
        'travelStyleSlugs는 최소 1개 이상 포함해야 합니다.',
      );
    }

    const supportedTravelStyleSlugs = new Set(
      TRAVEL_STYLE_OPTIONS.map((travelStyle) => travelStyle.slug),
    );
    const hasUnsupportedTravelStyle = travelStyleSlugs.some(
      (travelStyleSlug) => !supportedTravelStyleSlugs.has(travelStyleSlug),
    );

    if (hasUnsupportedTravelStyle) {
      throw new BadRequestException(
        '지원하지 않는 travelStyleSlugs 항목이 포함되어 있습니다.',
      );
    }

    return travelStyleSlugs;
  }

  private isNonEmptyStringArray(value: unknown[]): value is string[] {
    return value.every(
      (travelStyleSlug): travelStyleSlug is string =>
        typeof travelStyleSlug === 'string' &&
        travelStyleSlug.trim().length > 0,
    );
  }

  private validateDurationDays(value: unknown): number {
    const durationDays = this.validatePositiveInteger(value, 'durationDays');

    if (!DURATION_DAY_OPTIONS.includes(durationDays)) {
      throw new BadRequestException('durationDays는 1부터 5 사이여야 합니다.');
    }

    return durationDays;
  }

  private validateDailyBudgetWon(value: unknown): number {
    return this.validatePositiveInteger(value, 'dailyBudgetWon');
  }

  private validateTotalBudgetWon(
    durationDays: number,
    dailyBudgetWon: number,
  ): number {
    if (dailyBudgetWon > Math.floor(Number.MAX_SAFE_INTEGER / durationDays)) {
      throw new BadRequestException(
        'totalBudgetWon은 안전한 양의 정수여야 합니다.',
      );
    }

    const totalBudgetWon = durationDays * dailyBudgetWon;

    if (
      totalBudgetWon < MIN_TOTAL_BUDGET_WON ||
      totalBudgetWon > MAX_TOTAL_BUDGET_WON
    ) {
      throw new BadRequestException(
        `총 여행 예산(totalBudgetWon = durationDays × dailyBudgetWon)은 ${MIN_TOTAL_BUDGET_WON.toLocaleString()}원 이상 ${MAX_TOTAL_BUDGET_WON.toLocaleString()}원 이하여야 합니다.`,
      );
    }

    return totalBudgetWon;
  }

  private validatePositiveInteger(value: unknown, label: string): number {
    const parsedValue =
      typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : value;

    if (
      typeof parsedValue !== 'number' ||
      !Number.isInteger(parsedValue) ||
      !Number.isSafeInteger(parsedValue) ||
      parsedValue <= 0
    ) {
      throw new BadRequestException(`${label}은 안전한 양의 정수여야 합니다.`);
    }

    return parsedValue;
  }
}
