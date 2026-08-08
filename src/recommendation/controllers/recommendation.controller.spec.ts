import { RecommendationController } from '@/recommendation/controllers/recommendation.controller';
import { RecommendationService } from '@/recommendation/services/recommendation.service';

describe('RecommendationController', () => {
  const mockRecommendationService = {
    getOptions: jest.fn(),
    recommendRoutes: jest.fn(),
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

  it('delegates raw recommendation request body to service', async () => {
    const body = {
      travelStyleSlugs: ['local-food', 'emotion-cafe'],
      durationDays: 1,
      dailyBudgetWon: 60000,
    };
    const response = [{ id: 'route-1' }];
    mockRecommendationService.recommendRoutes.mockResolvedValue(response);

    await expect(controller.recommendRoutes(body)).resolves.toBe(response);
    expect(mockRecommendationService.recommendRoutes).toHaveBeenCalledWith(
      body,
    );
  });
});
