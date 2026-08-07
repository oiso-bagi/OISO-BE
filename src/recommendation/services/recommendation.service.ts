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
  estimatedDurationMin?: number;
  totalDifficultyScore?: Prisma.Decimal | number | null;
  stops?: GenericStop[];
  themes?: Array<{ theme?: { slug?: string } | null }> | null;
}

const DEFAULT_DAILY_BUDGET_WON = 60000;

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

    // Step 2: Soft Filter (Final Score: 비율 오차 패널티, 혼잡도 가산점 연산)
    const ratios = validatedInput.ratios ?? DEFAULT_RATIOS;
    const candidateRoutes = rawCandidates
      .map((route) => ({
        ...route,
        score: this.calculateFinalScore(route, ratios),
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
    const variancePenalty = (foodDiff + experienceDiff + transportDiff) * 100;

    // SEED 시점에 이미 난이도 감점(0.05 * D)이 반영된 Route.score를 그대로 사용하여 이중 차감 방지
    const baseScore = route.score != null ? Number(route.score) : 50;

    const congestionAdjustment = this.getCongestionAdjustment(
      route.congestionLevel,
    );

    return Math.max(0, baseScore - variancePenalty + congestionAdjustment);
  }

  private getCongestionAdjustment(congestionLevel: CongestionLevel): number {
    switch (congestionLevel) {
      case CongestionLevel.LOW:
        return 3;
      case CongestionLevel.HIGH:
        return -5;
      default:
        return 0;
    }
  }

  private stitchMultiDayRoutes(
    candidateRoutes: GenericRoute[],
    targetDurationDays: number,
    requestedThemeSlugs?: string[],
  ): GenericRoute[] {
    const results: GenericRoute[] = [];
    const maxCombinations = Math.min(candidateRoutes.length, 5);
    const previouslyStitchedRouteIds = new Set<string>();

    for (let i = 0; i < maxCombinations; i++) {
      const day1Route = candidateRoutes[i];
      const selectedRoutes: GenericRoute[] = [day1Route];
      const visitedPlaceIds = new Set<string>();

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

        for (const candidate of candidateRoutes) {
          if (selectedRoutes.includes(candidate)) continue;

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
        }

        if (bestNextRoute) {
          selectedRoutes.push(bestNextRoute);
          previouslyStitchedRouteIds.add(bestNextRoute.id);
          const nextStops = bestNextRoute.stops || [];
          nextStops.forEach((s) => {
            if (s.place?.id) visitedPlaceIds.add(s.place.id);
          });
          currentLastStop =
            nextStops.length > 0
              ? nextStops[nextStops.length - 1]
              : currentLastStop;
        } else {
          selectedRoutes.push(day1Route);
        }
      }

      const stitchedRoute = this.combineChainedRoutes(
        selectedRoutes,
        targetDurationDays,
        i + 1,
      );
      results.push(stitchedRoute);
    }

    // 패키지 종합 점수 기준 내림차순 정렬
    return results.sort((a, b) => b.score - a.score);
  }

  private combineChainedRoutes(
    routes: GenericRoute[],
    targetDurationDays: number,
    packageIdx: number,
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
      totalScoreSum += Number(route.score || 85);

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
    const avgScore = Number((totalScoreSum / routes.length).toFixed(2));

    return {
      id: `stitched-${String(routes[0]?.id || 'multi')}-${packageIdx}`,
      name: `[${durationText}] ${leadRouteName} 패키지 ${packageIdx}호`,
      totalDistanceMeters,
      estimatedSavingsWon,
      estimatedCostWon,
      foodCostWon,
      experienceCostWon,
      transportCostWon,
      estimatedDurationMin,
      score: avgScore,
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
    const dailyBudgetWon = this.validatePositiveInteger(
      body?.dailyBudgetWon,
      'dailyBudgetWon',
    );
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

  private validateTotalBudgetWon(
    durationDays: number,
    dailyBudgetWon: number,
  ): number {
    if (dailyBudgetWon > Math.floor(Number.MAX_SAFE_INTEGER / durationDays)) {
      throw new BadRequestException(
        'totalBudgetWon은 안전한 양의 정수여야 합니다.',
      );
    }

    return durationDays * dailyBudgetWon;
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
