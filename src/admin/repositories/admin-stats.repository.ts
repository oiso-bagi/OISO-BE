import { Injectable } from '@nestjs/common';
import { PlaceCategory } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const CATEGORY_LABEL_MAP: Record<PlaceCategory, string> = {
  FOOD: '식당 / 음식점',
  CAFE: '감성 카페',
  MARKET: '전통시장 / 쇼핑',
  CULTURE: '문화시설',
  NATURE: '자연경관',
  EXPERIENCE: '체험 / 액티비티',
  VIEWPOINT: '전망대 / 야경',
  ETC: '기타',
};

@Injectable()
export class AdminStatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getUserCount(): Promise<number> {
    return this.prisma.user.count();
  }

  async getSavedRouteCount(): Promise<number> {
    return this.prisma.savedRoute.count();
  }

  async getSavingsCostAndContribution(): Promise<{
    totalSavingsCostWon: number;
    averageLocalContributionScore: number;
  }> {
    // 저장된 routeId 목록을 distinct하게 조회
    const savedRouteIds = await this.prisma.savedRoute.findMany({
      select: { routeId: true },
      distinct: ['routeId'],
    });

    if (savedRouteIds.length === 0) {
      return {
        totalSavingsCostWon: 0,
        averageLocalContributionScore: 0,
      };
    }

    const routeIds = savedRouteIds.map((r) => r.routeId);

    // DB에서 직접 합계와 평균 계산 (null은 _avg에서 자동 제외됨)
    const agg = await this.prisma.route.aggregate({
      where: { id: { in: routeIds } },
      _sum: { estimatedSavingsWon: true },
      _avg: { localContributionScore: true },
    });

    const totalSavingsCostWon = agg._sum.estimatedSavingsWon ?? 0;
    const rawAvg = agg._avg.localContributionScore;
    const averageLocalContributionScore =
      rawAvg != null ? Number(rawAvg.toFixed(1)) : 0;

    return {
      totalSavingsCostWon,
      averageLocalContributionScore,
    };
  }

  async getSavingsBreakdownByCategory(): Promise<{
    totalSavingsCostWon: number;
    breakdown: Array<{
      category: PlaceCategory;
      label: string;
      amountWon: number;
      percentage: number;
    }>;
  }> {
    // 1단계: 저장된 routeId 목록을 distinct하게 조회
    const savedRouteIds = await this.prisma.savedRoute.findMany({
      select: { routeId: true },
      distinct: ['routeId'],
    });

    if (savedRouteIds.length === 0) {
      return { totalSavingsCostWon: 0, breakdown: [] };
    }

    const routeIds = savedRouteIds.map((r) => r.routeId);

    // 2단계: 해당 route의 stops를 placeId 기준으로 groupBy하여 DB에서 savingsWon 집계
    // Prisma groupBy는 relation 필드 기준 groupBy를 지원하지 않으므로
    // placeId별 합계를 먼저 구한 뒤 place.category를 별도 조회하여 재집계
    const stopAggregates = await this.prisma.routeStop.groupBy({
      by: ['placeId'],
      where: { routeId: { in: routeIds } },
      _sum: { savingsWon: true },
    });

    if (stopAggregates.length === 0) {
      return { totalSavingsCostWon: 0, breakdown: [] };
    }

    // 3단계: placeId 목록으로 category 일괄 조회
    const placeIds = stopAggregates.map((s) => s.placeId);
    const places = await this.prisma.place.findMany({
      where: { id: { in: placeIds } },
      select: { id: true, category: true },
    });
    const placeCategoryMap = new Map(places.map((p) => [p.id, p.category]));

    // 4단계: category 기준으로 재집계
    const categoryMap = new Map<PlaceCategory, number>();
    let totalSavingsCostWon = 0;

    for (const stopAgg of stopAggregates) {
      const category = placeCategoryMap.get(stopAgg.placeId);
      if (!category) continue;

      const amount = stopAgg._sum.savingsWon ?? 0;
      const current = categoryMap.get(category) ?? 0;
      categoryMap.set(category, current + amount);
      totalSavingsCostWon += amount;
    }

    const breakdown: Array<{
      category: PlaceCategory;
      label: string;
      amountWon: number;
      percentage: number;
    }> = [];

    categoryMap.forEach((amountWon, category) => {
      const percentage =
        totalSavingsCostWon > 0
          ? Number(((amountWon / totalSavingsCostWon) * 100).toFixed(1))
          : 0;

      breakdown.push({
        category,
        label: CATEGORY_LABEL_MAP[category] ?? category,
        amountWon,
        percentage,
      });
    });

    breakdown.sort((a, b) => b.amountWon - a.amountWon);

    return {
      totalSavingsCostWon,
      breakdown,
    };
  }

  async getTargetPlaceCount(): Promise<number> {
    return this.prisma.place.count({
      where: { apiSourceId: { not: null }, isActive: true },
    });
  }
}
