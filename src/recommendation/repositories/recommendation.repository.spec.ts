import { PlaceCategory } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { RecommendationRepository } from '@/recommendation/repositories/recommendation.repository';

describe('RecommendationRepository', () => {
  let repository: RecommendationRepository;
  let findMany: jest.MockedFunction<PrismaService['route']['findMany']>;

  beforeEach(() => {
    findMany = jest.fn() as jest.MockedFunction<
      PrismaService['route']['findMany']
    >;
    const prismaService = {
      route: {
        findMany,
      },
    } as PrismaService;
    repository = new RecommendationRepository(prismaService);
  });

  it('finds recommended routes with request body filters', async () => {
    const routes = [{ id: 'route-1' }];
    findMany.mockResolvedValue(routes);

    await expect(
      repository.findRecommendedRoutes({
        travelStyleSlugs: ['local-food', 'cafe'],
        durationDays: 2,
        dailyBudgetWon: 60000,
        totalBudgetWon: 120000,
      }),
    ).resolves.toBe(routes);

    expect(findMany).toHaveBeenCalledTimes(1);
    const findManyArgs = findMany.mock.calls[0]?.[0];

    expect(findManyArgs).toMatchObject({
      where: {
        routeType: 'RECOMMENDED',
        isPublished: true,
        estimatedCostWon: {
          lte: 120000,
        },
        estimatedDurationMin: {
          lte: 2880,
        },
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
      take: 10,
    });
  });
});
