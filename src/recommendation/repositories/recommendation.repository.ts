import { Injectable } from '@nestjs/common';
import { PlaceCategory, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { RecommendationFilter } from '@/recommendation/types/recommendation.types';

const recommendedRouteSelect = Prisma.validator<Prisma.RouteSelect>()({
  id: true,
  name: true,
  totalDistanceMeters: true,
  estimatedSavingsWon: true,
  score: true,
  routeType: true,
  congestionLevel: true,
  estimatedCostWon: true,
  estimatedDurationMin: true,
  foodCostWon: true,
  experienceCostWon: true,
  transportCostWon: true,
  totalDifficultyScore: true,
  stops: {
    orderBy: {
      orderIndex: 'asc',
    },
    select: {
      orderIndex: true,
      transitType: true,
      travelMinutesFromPrev: true,
      stayMinutes: true,
      fareWon: true,
      estimatedPriceWon: true,
      place: {
        select: {
          id: true,
          name: true,
          category: true,
          latitude: true,
          longitude: true,
          openTime: true,
          closeTime: true,
        },
      },
    },
  },
});

const TRAVEL_STYLE_CATEGORY_MAP: Record<string, PlaceCategory[]> = {
  'local-food': [PlaceCategory.FOOD, PlaceCategory.MARKET],
  'emotion-cafe': [PlaceCategory.CAFE],
  'beach-tour': [
    PlaceCategory.NATURE,
    PlaceCategory.VIEWPOINT,
    PlaceCategory.EXPERIENCE,
  ],
  'photo-spot': [PlaceCategory.VIEWPOINT, PlaceCategory.CULTURE],
  'traditional-market': [PlaceCategory.MARKET],
  'nature-walk': [PlaceCategory.NATURE],
};

@Injectable()
export class RecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRecommendedRoutes(filter: RecommendationFilter) {
    const preferredCategories = this.getPreferredCategories(
      filter.travelStyleSlugs,
    );
    const maxDurationMinutes = 480; // 1일 마스터 모듈 코스 최대 권장 소요시간 상한선 (8시간 = 480분)

    return this.prisma.route.findMany({
      where: {
        routeType: 'RECOMMENDED',
        isPublished: true,
        id: {
          not: {
            startsWith: 'stitched-',
          },
        },
        estimatedCostWon: {
          lte: filter.dailyBudgetWon,
        },
        estimatedDurationMin: {
          lte: maxDurationMinutes,
        },
        ...(preferredCategories.length > 0
          ? {
              stops: {
                some: {
                  place: {
                    category: {
                      in: preferredCategories,
                    },
                  },
                },
              },
            }
          : {}),
      },
      orderBy: [
        {
          score: 'desc',
        },
        {
          estimatedSavingsWon: 'desc',
        },
      ],
      take: 50,
      select: recommendedRouteSelect,
    });
  }

  private getPreferredCategories(travelStyleSlugs: string[]): PlaceCategory[] {
    return Array.from(
      new Set(
        travelStyleSlugs.flatMap(
          (travelStyleSlug) => TRAVEL_STYLE_CATEGORY_MAP[travelStyleSlug] ?? [],
        ),
      ),
    );
  }
}
