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
    const savedRoutes = await this.prisma.savedRoute.findMany({
      select: {
        route: {
          select: {
            estimatedSavingsWon: true,
            localContributionScore: true,
          },
        },
      },
    });

    if (savedRoutes.length === 0) {
      return {
        totalSavingsCostWon: 0,
        averageLocalContributionScore: 0,
      };
    }

    let totalSavings = 0;
    let totalScore = 0;

    for (const item of savedRoutes) {
      totalSavings += item.route?.estimatedSavingsWon ?? 0;
      totalScore += item.route?.localContributionScore ?? 0;
    }

    const averageLocalContributionScore = Number(
      (totalScore / savedRoutes.length).toFixed(1),
    );

    return {
      totalSavingsCostWon: totalSavings,
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
    const savedRouteStops = await this.prisma.savedRoute.findMany({
      select: {
        route: {
          select: {
            stops: {
              select: {
                savingsWon: true,
                place: {
                  select: {
                    category: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const categoryMap = new Map<PlaceCategory, number>();
    let totalSavingsCostWon = 0;

    for (const savedRoute of savedRouteStops) {
      for (const stop of savedRoute.route?.stops ?? []) {
        if (stop.place?.category) {
          const category = stop.place.category;
          const savings = stop.savingsWon ?? 0;
          const current = categoryMap.get(category) ?? 0;
          categoryMap.set(category, current + savings);
          totalSavingsCostWon += savings;
        }
      }
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
