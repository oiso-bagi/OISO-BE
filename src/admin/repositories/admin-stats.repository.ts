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

  async getSavingsBreakdown(): Promise<{
    totalSavingsCostWon: number;
    breakdown: Array<{
      category: PlaceCategory;
      label: string;
      amountWon: number;
      percentage: number;
    }>;
    regionBreakdown: Array<{
      region: string;
      label: string;
      amountWon: number;
      percentage: number;
    }>;
  }> {
    const savedRouteIds = await this.prisma.savedRoute.findMany({
      select: { routeId: true },
      distinct: ['routeId'],
    });

    if (savedRouteIds.length === 0) {
      return { totalSavingsCostWon: 0, breakdown: [], regionBreakdown: [] };
    }

    const routeIds = savedRouteIds.map((r) => r.routeId);

    const stopAggregates = await this.prisma.routeStop.groupBy({
      by: ['placeId'],
      where: { routeId: { in: routeIds } },
      _sum: { savingsWon: true },
    });

    if (stopAggregates.length === 0) {
      return { totalSavingsCostWon: 0, breakdown: [], regionBreakdown: [] };
    }

    const placeIds = stopAggregates.map((s) => s.placeId);
    const places = await this.prisma.place.findMany({
      where: { id: { in: placeIds } },
      select: { id: true, category: true, address: true },
    });
    const placeMap = new Map(places.map((p) => [p.id, p]));

    const categoryMap = new Map<PlaceCategory, number>();
    const regionMap = new Map<string, number>();
    let totalSavingsCostWon = 0;

    for (const stopAgg of stopAggregates) {
      const place = placeMap.get(stopAgg.placeId);
      if (!place) continue;

      const amount = stopAgg._sum.savingsWon ?? 0;
      totalSavingsCostWon += amount;

      if (place.category) {
        const currentCategoryAmount = categoryMap.get(place.category) ?? 0;
        categoryMap.set(place.category, currentCategoryAmount + amount);
      }

      // 주소에서 구 단위 파싱 (예: "부산광역시 해운대구 ..." -> "해운대구")
      let regionName = '기타 상권';
      if (place.address) {
        const districtMatch = place.address.match(/([가-힣]+구)/);
        if (districtMatch && districtMatch[1]) {
          regionName = districtMatch[1];
        }
      }

      const currentRegionAmount = regionMap.get(regionName) ?? 0;
      regionMap.set(regionName, currentRegionAmount + amount);
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

    const regionBreakdown: Array<{
      region: string;
      label: string;
      amountWon: number;
      percentage: number;
    }> = [];

    regionMap.forEach((amountWon, region) => {
      const percentage =
        totalSavingsCostWon > 0
          ? Number(((amountWon / totalSavingsCostWon) * 100).toFixed(1))
          : 0;

      regionBreakdown.push({
        region,
        label: region,
        amountWon,
        percentage,
      });
    });

    regionBreakdown.sort((a, b) => b.amountWon - a.amountWon);

    return {
      totalSavingsCostWon,
      breakdown,
      regionBreakdown,
    };
  }

  async getTargetPlaceCount(): Promise<number> {
    return this.prisma.place.count({
      where: { apiSourceId: { not: null }, isActive: true },
    });
  }
}
