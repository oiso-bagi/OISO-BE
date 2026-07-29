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
          name: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  },
});

const TRAVEL_STYLE_CATEGORY_MAP: Record<string, PlaceCategory[]> = {
  'local-food': [PlaceCategory.FOOD, PlaceCategory.MARKET],
  cafe: [PlaceCategory.CAFE],
  beach: [PlaceCategory.NATURE, PlaceCategory.VIEWPOINT],
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
    const maxDurationMinutes = filter.durationDays * 24 * 60;

    return this.prisma.route.findMany({
      where: {
        routeType: 'RECOMMENDED',
        isPublished: true,
        estimatedCostWon: {
          lte: filter.totalBudgetWon,
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
      take: 10,
      select: recommendedRouteSelect,
    });
  }

  private getPreferredCategories(travelStyleSlugs: string[]): PlaceCategory[] {
    return Array.from(
      new Set(
        travelStyleSlugs.flatMap(
          (travelStyleSlug) =>
            TRAVEL_STYLE_CATEGORY_MAP[travelStyleSlug] ?? [],
        ),
      ),
    );
  }
}
