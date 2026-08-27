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
  totalElevationGainMeters: true,
  localContributionScore: true,
  themes: {
    select: {
      theme: {
        select: {
          slug: true,
        },
      },
    },
  },
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
  'photo-spot': [
    PlaceCategory.CULTURE,
    PlaceCategory.VIEWPOINT,
    PlaceCategory.CAFE,
  ],
  'traditional-market': [PlaceCategory.MARKET],
  'nature-walk': [PlaceCategory.NATURE, PlaceCategory.VIEWPOINT],
};

@Injectable()
export class RecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findRecommendedRoutes(
    filter: RecommendationFilter,
  ): Promise<
    Prisma.RouteGetPayload<{ select: typeof recommendedRouteSelect }>[]
  > {
    const preferredCategories = Array.from(
      new Set(
        (filter.travelStyleSlugs ?? []).flatMap(
          (slug) => TRAVEL_STYLE_CATEGORY_MAP[slug] ?? [],
        ),
      ),
    );

    const maxDurationMinutes =
      filter.durationDays && filter.durationDays > 1 ? 1440 : 420;

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
        stops: {
          none: {
            place: {
              category: PlaceCategory.ETC,
            },
          },
        },
        ...(filter.travelStyleSlugs && filter.travelStyleSlugs.length > 0
          ? {
              OR: [
                {
                  themes: {
                    some: {
                      theme: {
                        slug: {
                          in: filter.travelStyleSlugs,
                        },
                      },
                    },
                  },
                },
                {
                  stops: {
                    some: {
                      place: {
                        category: {
                          in: preferredCategories,
                        },
                      },
                    },
                  },
                },
              ],
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
