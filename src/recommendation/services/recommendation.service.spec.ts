import { BadRequestException } from '@nestjs/common';
import { RecommendationRepository } from '@/recommendation/repositories/recommendation.repository';
import { RecommendationService } from '@/recommendation/services/recommendation.service';

describe('RecommendationService', () => {
  const mockRecommendationRepository = {
    upsertPreference: jest.fn(),
  };

  let service: RecommendationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RecommendationService(
      mockRecommendationRepository as unknown as RecommendationRepository,
    );
  });

  it('returns recommendation preference options for onboarding screens', () => {
    const result = service.getOptions();

    expect(result).toEqual({
      travelStyles: [
        { slug: 'local-food', label: '부산 로컬 맛집' },
        { slug: 'cafe', label: '감성 카페' },
        { slug: 'beach', label: '해변 관광' },
        { slug: 'photo-spot', label: '포토 스팟' },
        {
          slug: 'traditional-market',
          label: '전통시장',
        },
        { slug: 'nature-walk', label: '자연 / 산책' },
      ],
      durationDays: [1, 2, 3, 4, 5],
      budgetPresets: [
        { label: '~3만 · 가성비', amountWon: 30000 },
        { label: '3~6만 · 적당', amountWon: 60000 },
        { label: '6만+ · 여유', amountWon: 90000 },
      ],
      budgetAllocation: {
        defaultDailyBudgetWon: 60000,
        rules: [
          {
            type: 'transport',
            label: '교통비',
            percentage: 40,
          },
          { type: 'food', label: '식비', percentage: 35 },
          {
            type: 'activity',
            label: '체험/입장료',
            percentage: 25,
          },
        ],
      },
    });
  });

  it('stores selected travel styles and calculated budget allocation', async () => {
    const updatedAt = new Date('2026-07-29T00:00:00.000Z');
    const budgetAllocation = [
      {
        type: 'transport',
        label: '교통비',
        percentage: 40,
        amountWon: 24000,
      },
      { type: 'food', label: '식비', percentage: 35, amountWon: 21000 },
      {
        type: 'activity',
        label: '체험/입장료',
        percentage: 25,
        amountWon: 15000,
      },
    ];
    mockRecommendationRepository.upsertPreference.mockResolvedValue({
      userId: 'user-1',
      travelStyleSlugs: ['local-food', 'cafe'],
      durationDays: 1,
      dailyBudgetWon: 60000,
      budgetAllocation,
      updatedAt,
    });

    const result = await service.submitPreference('user-1', {
      travelStyleSlugs: ['local-food', 'cafe', 'local-food'],
      durationDays: 1,
      dailyBudgetWon: 60000,
    });

    expect(mockRecommendationRepository.upsertPreference).toHaveBeenCalledWith({
      userId: 'user-1',
      travelStyleSlugs: ['local-food', 'cafe'],
      durationDays: 1,
      dailyBudgetWon: 60000,
      budgetAllocation,
    });
    expect(result).toEqual({
      travelStyleSlugs: ['local-food', 'cafe'],
      durationDays: 1,
      dailyBudgetWon: 60000,
      budgetAllocation,
      updatedAt: '2026-07-29T00:00:00.000Z',
    });
  });

  it('rejects preference submission when travel styles are empty', async () => {
    await expect(
      service.submitPreference('user-1', {
        travelStyleSlugs: [],
        durationDays: 1,
        dailyBudgetWon: 60000,
      }),
    ).rejects.toThrow(BadRequestException);
    expect(
      mockRecommendationRepository.upsertPreference,
    ).not.toHaveBeenCalled();
  });

  it('rejects preference submission when duration days are out of range', async () => {
    await expect(
      service.submitPreference('user-1', {
        travelStyleSlugs: ['local-food'],
        durationDays: 6,
        dailyBudgetWon: 60000,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects preference submission when daily budget is invalid', async () => {
    await expect(
      service.submitPreference('user-1', {
        travelStyleSlugs: ['local-food'],
        durationDays: 1,
        dailyBudgetWon: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
