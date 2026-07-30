export type SavingsDashboardTripRawData = {
  id: string;
  startedAt: Date;
  route: {
    id: string;
    name: string;
    estimatedSavingsWon: number | null;
  };
};

export type SavingsDashboardSummaryRawData = {
  tripCount: number;
  totalSavingsWon: number;
  localContributionScore: number;
};

export type SavingsDashboardCategoryRawData = {
  foodSavingsWon: number;
  transportSavingsWon: number;
  experienceSavingsWon: number;
};

export class SavingsCategoryDto {
  label: string;
  amountWon: number;

  static of(label: string, amountWon: number): SavingsCategoryDto {
    const dto = new SavingsCategoryDto();
    dto.label = label;
    dto.amountWon = amountWon;

    return dto;
  }
}

export class LocalContributionDto {
  scorePercent: number;
  label: string;
  message: string;

  static from(scorePercent: number): LocalContributionDto {
    const dto = new LocalContributionDto();
    dto.scorePercent = Math.max(0, Math.min(100, scorePercent));
    dto.label = '외곽·원도심 상권 방문';
    dto.message = '관광 수요 분산에 기여하고 있어요';

    return dto;
  }
}

export class SavingsHistoryDto {
  routeId: string;
  routeName: string;
  trippedAt: Date;
  savedAmountWon: number;

  static from(trip: SavingsDashboardTripRawData): SavingsHistoryDto {
    const dto = new SavingsHistoryDto();
    dto.routeId = trip.route.id;
    dto.routeName = trip.route.name;
    dto.trippedAt = trip.startedAt;
    dto.savedAmountWon = getTripSavingsWon(trip);

    return dto;
  }
}

export class SavingsDashboardResponseDto {
  totalSavingsWon: number;
  tripCount: number;
  averageSavingsWon: number;
  savingsByCategory: SavingsCategoryDto[];
  localContribution: LocalContributionDto;
  histories: SavingsHistoryDto[];

  static from(
    summary: SavingsDashboardSummaryRawData,
    categorySummary: SavingsDashboardCategoryRawData,
    recentTrips: SavingsDashboardTripRawData[],
  ): SavingsDashboardResponseDto {
    const dto = new SavingsDashboardResponseDto();

    dto.tripCount = summary.tripCount;
    dto.totalSavingsWon = summary.totalSavingsWon;
    dto.averageSavingsWon =
      dto.tripCount > 0 ? Math.round(dto.totalSavingsWon / dto.tripCount) : 0;
    dto.savingsByCategory = buildSavingsByCategory(categorySummary);
    dto.localContribution = LocalContributionDto.from(
      summary.localContributionScore,
    );
    dto.histories = recentTrips.map((trip) => SavingsHistoryDto.from(trip));

    return dto;
  }
}

function getTripSavingsWon(trip: SavingsDashboardTripRawData): number {
  return trip.route.estimatedSavingsWon ?? 0;
}

function buildSavingsByCategory({
  foodSavingsWon,
  transportSavingsWon,
  experienceSavingsWon,
}: SavingsDashboardCategoryRawData): SavingsCategoryDto[] {
  return [
    SavingsCategoryDto.of('식비', foodSavingsWon),
    SavingsCategoryDto.of('교통비', transportSavingsWon),
    SavingsCategoryDto.of('체험비', experienceSavingsWon),
  ];
}
