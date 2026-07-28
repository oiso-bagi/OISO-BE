import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RouteRepository } from './route.repository';
import { RecommendedRouteDetailResponseDto } from './dto/recommended-route-detail-response.dto';
import { RecommendedRouteListResponseDto } from './dto/recommended-route-list-response.dto';
import { RecommendRouteRequestDto } from './dto/recommend-route-request.dto';

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
        `추천 루트 ID [${normalizedId}]를 시스템에서 찾을 수 없습니다.`,
      );
    }

    return RecommendedRouteDetailResponseDto.from(routeRawData);
  }

  private validateRouteId(id: string): string {
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new BadRequestException('추천 루트 ID는 비어 있을 수 없습니다.');
    }

    return id.trim();
  }

  /**
   * 실시간 추천 경로 필터링 및 오차율 패널티 연산 Top 3 반환
   */
  async getRecommendedRoutes(dto: RecommendRouteRequestDto) {
    if (!dto || typeof dto.budget !== 'number' || dto.budget <= 0) {
      throw new BadRequestException('유효한 총 예산(budget)을 입력해 주세요.');
    }

    const budget = dto.budget;
    const foodRatio = dto.ratios?.foodRatio ?? 0.4;
    const experienceRatio = dto.ratios?.experienceRatio ?? 0.4;
    const transportRatio = dto.ratios?.transportRatio ?? 0.2;

    // 1단계: Hard Filter (Prisma DB 레벨 - 예산 이하 후보군 선별)
    const candidates =
      await this.routeRepository.findRecommendedCandidates(budget);

    if (!candidates || candidates.length === 0) {
      return [];
    }

    // 2단계: Soft Filter (메모리 레벨 - 예산 비율 오차 제곱 분산 패널티 연산)
    const scoredCandidates = candidates.map((route) => {
      const totalCost = route.estimatedCostWon || 1;

      const actualFoodRatio = route.foodCostWon / totalCost;
      const actualExpRatio = route.experienceCostWon / totalCost;
      const actualTransRatio = route.transportCostWon / totalCost;

      const foodDiff = Math.pow(foodRatio - actualFoodRatio, 2);
      const expDiff = Math.pow(experienceRatio - actualExpRatio, 2);
      const transDiff = Math.pow(transportRatio - actualTransRatio, 2);

      const variancePenalty = (foodDiff + expDiff + transDiff) * 100;
      const baseScore = Number(route.score ?? 50.0);
      const finalScore = Math.max(0, baseScore - variancePenalty);

      return {
        ...route,
        calculatedMetrics: {
          actualRatios: {
            foodRatio: Number(actualFoodRatio.toFixed(2)),
            experienceRatio: Number(actualExpRatio.toFixed(2)),
            transportRatio: Number(actualTransRatio.toFixed(2)),
          },
          variancePenalty: Number(variancePenalty.toFixed(2)),
          finalScore: Number(finalScore.toFixed(2)),
        },
      };
    });

    // 3단계: Final Score 기준 내림차순 정렬 후 Top 3 추출
    scoredCandidates.sort(
      (a, b) => b.calculatedMetrics.finalScore - a.calculatedMetrics.finalScore,
    );

    return scoredCandidates.slice(0, 3);
  }
}
