import { RecommendationController } from '@/recommendation/controllers/recommendation.controller';
import { RecommendationService } from '@/recommendation/services/recommendation.service';

describe('RecommendationController', () => {
  const mockRecommendationService = {
    getOptions: jest.fn(),
    submitPreference: jest.fn(),
  };

  let controller: RecommendationController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new RecommendationController(
      mockRecommendationService as unknown as RecommendationService,
    );
  });

  it('delegates recommendation option retrieval to service', () => {
    const options = {
      travelStyles: [],
      durationDays: [1, 2, 3, 4, 5],
      budgetPresets: [],
      budgetAllocation: {
        defaultDailyBudgetWon: 60000,
        rules: [],
      },
    };
    mockRecommendationService.getOptions.mockReturnValue(options);

    expect(controller.getOptions()).toBe(options);
    expect(mockRecommendationService.getOptions).toHaveBeenCalledTimes(1);
  });

  it('delegates preference submission to service with current user id', async () => {
    const user = { id: 'user-1' };
    const body = {
      travelStyleSlugs: ['local-food', 'cafe'],
      durationDays: 1,
      dailyBudgetWon: 60000,
    };
    const response = {
      ...body,
      budgetAllocation: [],
      updatedAt: '2026-07-29T00:00:00.000Z',
    };
    mockRecommendationService.submitPreference.mockResolvedValue(response);

    await expect(
      controller.submitPreference(
        user as Parameters<typeof controller.submitPreference>[0],
        body,
      ),
    ).resolves.toBe(response);
    expect(mockRecommendationService.submitPreference).toHaveBeenCalledWith(
      'user-1',
      body,
    );
  });
});
