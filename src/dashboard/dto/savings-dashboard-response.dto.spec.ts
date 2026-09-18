import {
  SavingsDashboardCategoryRawData,
  SavingsDashboardResponseDto,
  SavingsDashboardSummaryRawData,
  SavingsDashboardTripRawData,
  SavingsHistoriesPageResponseDto,
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
            foodCostWon: 12000,
            transportCostWon: 4000,
            experienceCostWon: 26000,
          },
          startedAt: new Date('2026-06-28T00:00:00.000Z'),
        }),
        createTrip({
          id: 'trip-2',
          route: {
            id: 'route-trip-2',
            name: 'Route trip-2',
            estimatedSavingsWon: 12000,
            foodCostWon: 20000,
            transportCostWon: 8000,
            experienceCostWon: 20000,
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
        foodBudgetWon: 21000,
        foodEstimatedCostWon: 11000,
        transportSavingsWon: 2700,
        transportBudgetWon: 24000,
        transportEstimatedCostWon: 21300,
        experienceSavingsWon: 9000,
        experienceBudgetWon: 15000,
        experienceEstimatedCostWon: 6000,
      }),
      [],
    );

    expect(result.savingsByCategory).toEqual([
      {
        label: '식비',
        amountWon: 10000,
        budgetWon: 21000,
        estimatedCostWon: 11000,
        status: 'SAVED',
      },
      {
        label: '교통비',
        amountWon: 2700,
        budgetWon: 24000,
        estimatedCostWon: 21300,
        status: 'SAVED',
      },
      {
        label: '체험비',
        amountWon: 9000,
        budgetWon: 15000,
        estimatedCostWon: 6000,
        status: 'SAVED',
      },
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
        {
          label: '식비',
          amountWon: 0,
          budgetWon: 0,
          estimatedCostWon: 0,
          status: 'NO_DATA',
        },
        {
          label: '교통비',
          amountWon: 0,
          budgetWon: 0,
          estimatedCostWon: 0,
          status: 'NO_DATA',
        },
        {
          label: '체험비',
          amountWon: 0,
          budgetWon: 0,
          estimatedCostWon: 0,
          status: 'NO_DATA',
        },
      ],
      localContribution: {
        scorePercent: 0,
        label: '외곽·원도심 상권 방문',
        message: '관광 수요 분산에 기여하고 있어요',
      },
      histories: [],
    });
  });

  it('classifies category savings status for frontend message mapping', () => {
    const result = SavingsDashboardResponseDto.from(
      createSummary(),
      createCategorySummary({
        foodSavingsWon: 500,
        foodBudgetWon: 21000,
        foodEstimatedCostWon: 20500,
        transportSavingsWon: 0,
        transportBudgetWon: 24000,
        transportEstimatedCostWon: 26000,
        experienceSavingsWon: 0,
        experienceBudgetWon: 15000,
        experienceEstimatedCostWon: 0,
      }),
      [],
    );

    expect(result.savingsByCategory).toEqual([
      {
        label: '식비',
        amountWon: 500,
        budgetWon: 21000,
        estimatedCostWon: 20500,
        status: 'NO_SAVINGS',
      },
      {
        label: '교통비',
        amountWon: 0,
        budgetWon: 24000,
        estimatedCostWon: 26000,
        status: 'OVER_BUDGET',
      },
      {
        label: '체험비',
        amountWon: 0,
        budgetWon: 15000,
        estimatedCostWon: 0,
        status: 'NO_DATA',
      },
    ]);
  });

  it('builds savings history page metadata and items', () => {
    const result = SavingsHistoriesPageResponseDto.of(
      [
        createTrip({
          id: 'trip-1',
          route: {
            id: 'route_001',
            name: 'Busan sea route',
            estimatedSavingsWon: 15000,
            foodCostWon: 15000,
            transportCostWon: 10000,
            experienceCostWon: 20000,
          },
          startedAt: new Date('2026-07-31T03:00:00.000Z'),
        }),
      ],
      1,
      10,
      25,
    );

    expect(result).toEqual({
      items: [
        {
          routeId: 'route_001',
          routeName: 'Busan sea route',
          trippedAt: new Date('2026-07-31T03:00:00.000Z'),
          savedAmountWon: 15000,
        },
      ],
      page: 1,
      size: 10,
      totalCount: 25,
      totalPages: 3,
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
    foodBudgetWon: 0,
    foodEstimatedCostWon: 0,
    transportSavingsWon: 0,
    transportBudgetWon: 0,
    transportEstimatedCostWon: 0,
    experienceSavingsWon: 0,
    experienceBudgetWon: 0,
    experienceEstimatedCostWon: 0,
    ...overrides,
  };
}
