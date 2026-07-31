import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BudgetRatiosDto,
  BudgetRecommendRouteRequestDto,
} from '@/route/dto/budget-recommend-route-request.dto';
import { RecommendedRouteDetailResponseDto } from '@/route/dto/recommended-route-detail-response.dto';
import { RecommendedRouteListResponseDto } from '@/route/dto/recommended-route-list-response.dto';
import { RouteRepository } from '@/route/repositories/route.repository';

const DEFAULT_BUDGET_RATIOS = {
  foodRatio: 0.4,
  experienceRatio: 0.4,
  transportRatio: 0.2,
};

type BudgetRatios = {
  foodRatio: number;
  experienceRatio: number;
  transportRatio: number;
};

@Injectable()
export class RouteService {
  constructor(private readonly routeRepository: RouteRepository) {}

  async getRecommendedRouteList(): Promise<RecommendedRouteListResponseDto[]> {
    const routeRawDataList = await this.routeRepository.findListWithStops();

    return routeRawDataList.map((routeRawData) =>
      RecommendedRouteListResponseDto.from(routeRawData),
    );
  }

  async getRecommendedRouteDetail(
    id: string,
  ): Promise<RecommendedRouteDetailResponseDto> {
    const normalizedId = this.validateRouteId(id);

    const routeRawData =
      await this.routeRepository.findDetailWithStopsAndPlace(normalizedId);

    if (!routeRawData) {
      throw new NotFoundException(
        `추천 루트 ID [${normalizedId}]를 찾을 수 없습니다.`,
      );
    }

    return RecommendedRouteDetailResponseDto.from(routeRawData);
  }

  async getBudgetRecommendedRoutes(
    body: unknown,
  ): Promise<RecommendedRouteListResponseDto[]> {
    const { budget, ratios, themeSlugs } =
      this.validateBudgetRecommendationInput(body);
    const candidates = await this.routeRepository.findRecommendedCandidates(
      budget,
      themeSlugs,
    );

    if (!candidates || candidates.length === 0) {
      return [];
    }

    const scoredCandidates = candidates.map((route) => {
      const totalCost = route.estimatedCostWon || 1;
      const actualFoodRatio = route.foodCostWon / totalCost;
      const actualExperienceRatio = route.experienceCostWon / totalCost;
      const actualTransportRatio = route.transportCostWon / totalCost;

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
      const difficultyScore = Number(route.totalDifficultyScore ?? 0);
      const initialRating = route.score != null ? Number(route.score) : 50;
      const baseScore = Math.max(0, initialRating - 0.05 * difficultyScore);
      const congestionAdjustment = this.getCongestionAdjustment(
        route.congestionLevel,
      );
      const finalScore = Math.max(
        0,
        baseScore - variancePenalty + congestionAdjustment,
      );

      return {
        ...route,
        calculatedMetrics: {
          actualRatios: {
            foodRatio: Number(actualFoodRatio.toFixed(2)),
            experienceRatio: Number(actualExperienceRatio.toFixed(2)),
            transportRatio: Number(actualTransportRatio.toFixed(2)),
          },
          variancePenalty: Number(variancePenalty.toFixed(2)),
          congestionAdjustment,
          finalScore: Number(finalScore.toFixed(2)),
        },
      };
    });

    return scoredCandidates
      .sort(
        (a, b) =>
          b.calculatedMetrics.finalScore - a.calculatedMetrics.finalScore,
      )
      .slice(0, 3)
      .map((route) => RecommendedRouteListResponseDto.from(route));
  }

  private validateRouteId(id: string): string {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new BadRequestException('추천 루트 ID는 비어 있을 수 없습니다.');
    }

    return id.trim();
  }

  private validateBudgetRecommendationInput(body: unknown): {
    budget: number;
    ratios: BudgetRatios;
    themeSlugs?: string[];
  } {
    const input = this.asBudgetRecommendRouteRequestDto(body);
    const budget = this.validateBudget(input.budget);
    const ratios = this.validateBudgetRatios(input.ratios);
    const themeSlugs = this.validateThemeSlugs(input.themeSlugs);

    return { budget, ratios, themeSlugs };
  }

  private asBudgetRecommendRouteRequestDto(
    body: unknown,
  ): BudgetRecommendRouteRequestDto {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw new BadRequestException('요청 바디는 객체여야 합니다.');
    }

    return body;
  }

  private validateBudget(value: unknown): number {
    const parsedValue =
      typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : value;

    if (
      typeof parsedValue !== 'number' ||
      !Number.isInteger(parsedValue) ||
      !Number.isSafeInteger(parsedValue) ||
      parsedValue < 10000 ||
      parsedValue > 500000
    ) {
      throw new BadRequestException(
        '예산(budget)은 10,000원 이상 500,000원 이하의 안전한 정수여야 합니다.',
      );
    }

    return parsedValue;
  }

  private validateBudgetRatios(
    value: BudgetRatiosDto | undefined,
  ): BudgetRatios {
    if (value == null) {
      return DEFAULT_BUDGET_RATIOS;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException(
        '비용 분배 비율(ratios)은 객체여야 합니다.',
      );
    }

    const ratios = {
      foodRatio: this.validateRatio(value.foodRatio, 'foodRatio'),
      experienceRatio: this.validateRatio(
        value.experienceRatio,
        'experienceRatio',
      ),
      transportRatio: this.validateRatio(
        value.transportRatio,
        'transportRatio',
      ),
    };
    const ratioSum =
      ratios.foodRatio + ratios.experienceRatio + ratios.transportRatio;

    if (Math.abs(ratioSum - 1) >= 0.001) {
      throw new BadRequestException(
        '비용 분배 비율(foodRatio, experienceRatio, transportRatio)의 합은 1이어야 합니다.',
      );
    }

    return ratios;
  }

  private validateRatio(value: unknown, label: string): number {
    const parsedValue =
      typeof value === 'string' && value.trim().length > 0
        ? Number(value)
        : value;

    if (
      typeof parsedValue !== 'number' ||
      !Number.isFinite(parsedValue) ||
      parsedValue < 0 ||
      parsedValue > 1
    ) {
      throw new BadRequestException(`${label}은 0부터 1 사이 숫자여야 합니다.`);
    }

    return parsedValue;
  }

  private validateThemeSlugs(value: unknown): string[] | undefined {
    if (value == null) {
      return undefined;
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException('themeSlugs는 배열 형식이어야 합니다.');
    }

    const themeSlugs = value.map((themeSlug) => {
      if (typeof themeSlug !== 'string' || themeSlug.trim().length === 0) {
        throw new BadRequestException(
          'themeSlugs의 요소는 빈 문자열이 아닌 문자열이어야 합니다.',
        );
      }

      return themeSlug.trim();
    });

    return Array.from(new Set(themeSlugs));
  }

  private getCongestionAdjustment(congestionLevel: string): number {
    if (congestionLevel === 'LOW') {
      return 3;
    }

    if (congestionLevel === 'HIGH') {
      return -5;
    }

    return 0;
  }
}
