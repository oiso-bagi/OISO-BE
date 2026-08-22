import { Injectable } from '@nestjs/common';
import { PlaceCategory } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

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

  async getRawSavingsBreakdown(): Promise<{
    stopAggregates: Array<{
      placeId: string;
      _sum: { savingsWon: number | null };
    }>;
    places: Array<{
      id: string;
      category: PlaceCategory | null;
      address: string | null;
    }>;
  }> {
    const savedRouteIds = await this.prisma.savedRoute.findMany({
      select: { routeId: true },
      distinct: ['routeId'],
    });

    if (savedRouteIds.length === 0) {
      return { stopAggregates: [], places: [] };
    }

    const routeIds = savedRouteIds.map((r) => r.routeId);

    const stopAggregates = await this.prisma.routeStop.groupBy({
      by: ['placeId'],
      where: { routeId: { in: routeIds } },
      _sum: { savingsWon: true },
    });

    if (stopAggregates.length === 0) {
      return { stopAggregates: [], places: [] };
    }

    const placeIds = stopAggregates.map((s) => s.placeId);
    const places = await this.prisma.place.findMany({
      where: { id: { in: placeIds } },
      select: { id: true, category: true, address: true },
    });

    return {
      stopAggregates,
      places,
    };
  }

  async getTargetPlaceCount(): Promise<number> {
    return this.prisma.place.count({
      where: { apiSourceId: { not: null }, isActive: true },
    });
  }
}
