import {
  SavingsDashboardCategoryRawData,
  SavingsDashboardResponseDto,
  SavingsDashboardSummaryRawData,
  SavingsDashboardTripRawData,
} from '@/dashboard/dto/savings-dashboard-response.dto';

describe('SavingsDashboardResponseDto', () => {
  it('uses route estimated savings as the display savings amount', () => {
    const result = SavingsDashboardResponseDto.from(
      createSummary({
        tripCount: 2,
        totalSavingsWon: 30000,
        localContributionScore: 0,
      }),
      createCategorySummary(),
      [
        createTrip({
          id: 'trip-1',
          route: {
            id: 'route-trip-1',
            name: 'Route trip-1',
            estimatedSavingsWon: 18000,
          },
          startedAt: new Date('2026-06-28T00:00:00.000Z'),
        }),
        createTrip({
          id: 'trip-2',
          route: {
            id: 'route-trip-2',
            name: 'Route trip-2',
            estimatedSavingsWon: 12000,
          },
          startedAt: new Date('2026-06-15T00:00:00.000Z'),
        }),
      ],
    );

    expect(result.totalSavingsWon).toBe(30000);
    expect(result.tripCount).toBe(2);
    expect(result.averageSavingsWon).toBe(15000);
    expect(result.histories).toEqual([
      {
        routeId: 'route-trip-1',
        routeName: 'Route trip-1',
        trippedAt: new Date('2026-06-28T00:00:00.000Z'),
        savedAmountWon: 18000,
      },
      {
        routeId: 'route-trip-2',
        routeName: 'Route trip-2',
        trippedAt: new Date('2026-06-15T00:00:00.000Z'),
        savedAmountWon: 12000,
      },
    ]);
  });

  it('builds category and local contribution values for the dashboard cards', () => {
    const result = SavingsDashboardResponseDto.from(
      createSummary({
        tripCount: 2,
        totalSavingsWon: 20000,
        localContributionScore: 70,
      }),
      createCategorySummary({
        foodSavingsWon: 10000,
        transportSavingsWon: 2700,
        experienceSavingsWon: 9000,
      }),
      [],
    );

    expect(result.savingsByCategory).toEqual([
      { label: '식비', amountWon: 10000 },
      { label: '교통비', amountWon: 2700 },
      { label: '체험비', amountWon: 9000 },
    ]);
    expect(result.localContribution).toEqual({
      scorePercent: 70,
      label: '외곽·원도심 상권 방문',
      message: '관광 수요 분산에 기여하고 있어요',
    });
  });

  it('returns a stable empty dashboard when the user has no trips', () => {
    const result = SavingsDashboardResponseDto.from(
      createSummary(),
      createCategorySummary(),
      [],
    );

    expect(result).toEqual({
      totalSavingsWon: 0,
      tripCount: 0,
      averageSavingsWon: 0,
      savingsByCategory: [
        { label: '식비', amountWon: 0 },
        { label: '교통비', amountWon: 0 },
        { label: '체험비', amountWon: 0 },
      ],
      localContribution: {
        scorePercent: 0,
        label: '외곽·원도심 상권 방문',
        message: '관광 수요 분산에 기여하고 있어요',
      },
      histories: [],
    });
  });
});

function createTrip(
  trip: SavingsDashboardTripRawData,
): SavingsDashboardTripRawData {
  return trip;
}

function createSummary(
  overrides: Partial<SavingsDashboardSummaryRawData> = {},
): SavingsDashboardSummaryRawData {
  return {
    tripCount: 0,
    totalSavingsWon: 0,
    localContributionScore: 0,
    ...overrides,
  };
}

function createCategorySummary(
  overrides: Partial<SavingsDashboardCategoryRawData> = {},
): SavingsDashboardCategoryRawData {
  return {
    foodSavingsWon: 0,
    transportSavingsWon: 0,
    experienceSavingsWon: 0,
    ...overrides,
  };
}
