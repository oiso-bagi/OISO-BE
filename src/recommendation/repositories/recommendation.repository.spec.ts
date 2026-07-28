import { PrismaService } from '@/prisma/prisma.service';
import { RecommendationRepository } from '@/recommendation/repositories/recommendation.repository';

describe('RecommendationRepository', () => {
  let repository: RecommendationRepository;
  let prismaService: {
    recommendationPreference: {
      upsert: jest.Mock;
    };
  };

  beforeEach(() => {
    prismaService = {
      recommendationPreference: {
        upsert: jest.fn(),
      },
    };
    repository = new RecommendationRepository(
      prismaService as unknown as PrismaService,
    );
  });

  it('upserts recommendation preference by user id', async () => {
    const savedPreference = { userId: 'user-1' };
    const budgetAllocation = [
      {
        type: 'transport',
        label: '교통비',
        percentage: 40,
        amountWon: 24000,
      },
    ];
    prismaService.recommendationPreference.upsert.mockResolvedValue(
      savedPreference,
    );

    await expect(
      repository.upsertPreference({
        userId: 'user-1',
        travelStyleSlugs: ['local-food'],
        durationDays: 1,
        dailyBudgetWon: 60000,
        budgetAllocation,
      }),
    ).resolves.toBe(savedPreference);

    expect(prismaService.recommendationPreference.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: {
        userId: 'user-1',
        travelStyleSlugs: ['local-food'],
        durationDays: 1,
        dailyBudgetWon: 60000,
        budgetAllocation,
      },
      update: {
        travelStyleSlugs: ['local-food'],
        durationDays: 1,
        dailyBudgetWon: 60000,
        budgetAllocation,
      },
    });
  });
});
