import { PlaceCategory } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RecommendationRepository } from '@/recommendation/repositories/recommendation.repository';

describe('RecommendationRepository', () => {
  let repository: RecommendationRepository;
  let findMany: jest.Mock;

  beforeEach(() => {
    findMany = jest.fn();
    const prismaService = {
      route: {
        findMany,
      },
    } as unknown as PrismaService;
    repository = new RecommendationRepository(prismaService);
  });

  it('finds recommended routes with request body filters', async () => {
    const routes = [{ id: 'route-1' }];
    findMany.mockResolvedValue(routes);

    await expect(
      repository.findRecommendedRoutes({
        travelStyleSlugs: ['local-food', 'emotion-cafe'],
        durationDays: 2,
        dailyBudgetWon: 60000,
        totalBudgetWon: 120000,
      }),
    ).resolves.toBe(routes);

    expect(findMany).toHaveBeenCalledTimes(1);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          routeType: 'RECOMMENDED',
          isPublished: true,
          id: {
            not: {
              startsWith: 'stitched-',
            },
          },
          estimatedCostWon: {
            lte: 60000,
          },
          estimatedDurationMin: {
            lte: 1440,
          },
          OR: [
            {
              themes: {
                some: {
                  theme: {
                    slug: {
                      in: ['local-food', 'emotion-cafe'],
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
                      in: [
                        PlaceCategory.FOOD,
                        PlaceCategory.MARKET,
                        PlaceCategory.CAFE,
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
        take: 50,
      }),
    );
  });

  it('maps beach-tour travel style to NATURE, VIEWPOINT, and EXPERIENCE categories', async () => {
    findMany.mockResolvedValue([]);

    await repository.findRecommendedRoutes({
      travelStyleSlugs: ['beach-tour'],
      durationDays: 1,
      dailyBudgetWon: 50000,
      totalBudgetWon: 50000,
    });

    const calls = findMany.mock.calls as unknown as Array<
      [
        {
          where?: {
            OR?: Array<{
              stops?: {
                some?: {
                  place?: {
                    category?: {
                      in?: PlaceCategory[];
                    };
                  };
                };
              };
            }>;
          };
        },
      ]
    >;
    const callArg = calls[0][0];

    const stopsCondition = callArg.where?.OR?.find((c) => c.stops);

    expect(stopsCondition?.stops?.some?.place?.category?.in).toEqual([
      PlaceCategory.NATURE,
      PlaceCategory.VIEWPOINT,
      PlaceCategory.EXPERIENCE,
    ]);
  });
});
