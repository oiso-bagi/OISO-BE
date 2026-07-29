import { BadRequestException, Injectable } from '@nestjs/common';
import { RecommendRouteRequestDto } from '@/recommendation/dto/recommend-route-request.dto';
import { RecommendationOptionsResponseDto } from '@/recommendation/dto/recommendation-options-response.dto';
import { RecommendationRepository } from '@/recommendation/repositories/recommendation.repository';
import type {
  BudgetAllocationRule,
  BudgetPreset,
  RecommendationFilter,
  TravelStyleOption,
} from '@/recommendation/types/recommendation.types';
import { RecommendedRouteListResponseDto } from '@/route/dto/recommended-route-list-response.dto';

const DEFAULT_DAILY_BUDGET_WON = 60000;

const TRAVEL_STYLE_OPTIONS: TravelStyleOption[] = [
  { slug: 'local-food', label: '부산 로컬 맛집' },
  { slug: 'cafe', label: '감성 카페' },
  { slug: 'beach', label: '바다 관광' },
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
    const recommendedRoutes =
      await this.recommendationRepository.findRecommendedRoutes(validatedInput);

    return recommendedRoutes.map((route) =>
      RecommendedRouteListResponseDto.from(route),
    );
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
      '하루 예산',
    );

    return {
      travelStyleSlugs,
      durationDays,
      dailyBudgetWon,
      totalBudgetWon: durationDays * dailyBudgetWon,
    };
  }

  private validateTravelStyleSlugs(value: unknown): string[] {
    if (!Array.isArray(value)) {
      throw new BadRequestException('여행 스타일은 1개 이상 선택해야 합니다.');
    }

    const hasInvalidTravelStyleSlug = value.some(
      (travelStyleSlug) =>
        typeof travelStyleSlug !== 'string' ||
        travelStyleSlug.trim().length === 0,
    );

    if (hasInvalidTravelStyleSlug) {
      throw new BadRequestException(
        '여행 스타일은 비어 있지 않은 문자열이어야 합니다.',
      );
    }

    const travelStyleSlugs = value
      .map((travelStyleSlug) => travelStyleSlug.trim())
      .filter(
        (travelStyleSlug, index, self) =>
          self.indexOf(travelStyleSlug) === index,
      );

    if (travelStyleSlugs.length === 0) {
      throw new BadRequestException('여행 스타일은 1개 이상 선택해야 합니다.');
    }

    const supportedTravelStyleSlugs = new Set(
      TRAVEL_STYLE_OPTIONS.map((travelStyle) => travelStyle.slug),
    );
    const hasUnsupportedTravelStyle = travelStyleSlugs.some(
      (travelStyleSlug) => !supportedTravelStyleSlugs.has(travelStyleSlug),
    );

    if (hasUnsupportedTravelStyle) {
      throw new BadRequestException(
        '지원하지 않는 여행 스타일이 포함되어 있습니다.',
      );
    }

    return travelStyleSlugs;
  }

  private validateDurationDays(value: unknown): number {
    const durationDays = this.validatePositiveInteger(value, '여행 기간');

    if (!DURATION_DAY_OPTIONS.includes(durationDays)) {
      throw new BadRequestException(
        '여행 기간은 1일부터 5일까지 선택할 수 있습니다.',
      );
    }

    return durationDays;
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
