import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export type SavingsDashboardTripRawData = {
  id: string;
  startedAt: Date;
  route: {
    id: string;
    name: string;
    estimatedSavingsWon: number | null;
    foodCostWon?: number | null;
    transportCostWon?: number | null;
    experienceCostWon?: number | null;
    stops?: Array<{
      fareWon?: number | null;
      estimatedPriceWon?: number | null;
      transitDetails?: unknown;
      place?: {
        category?: string | null;
      } | null;
    }>;
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

const DEFAULT_DAILY_BUDGET_WON = 60000;

export class SavingsCategoryDto {
  @ApiProperty({ description: '절약 카테고리 라벨', example: '식비' })
  label!: string;

  @ApiProperty({
    description: '카테고리별 기준 예산 대비 예상 절약 효과 금액(원)',
    example: 12000,
  })
  amountWon!: number;

  static of(label: string, amountWon: number): SavingsCategoryDto {
    const dto = new SavingsCategoryDto();
    dto.label = label;
    dto.amountWon = amountWon;

    return dto;
  }
}

export class LocalContributionDto {
  @ApiProperty({ description: '지역 기여 점수(0~100)', example: 72 })
  scorePercent!: number;

  @ApiProperty({
    description: '지역 기여 라벨',
    example: '환경·지역 상생 방문',
  })
  label!: string;

  @ApiProperty({
    description: '지역 기여 안내 문구',
    example: '관광 소비 분산에 기여하고 있어요.',
  })
  message!: string;

  static from(scorePercent: number): LocalContributionDto {
    const dto = new LocalContributionDto();
    dto.scorePercent = Math.max(0, Math.min(100, scorePercent));
    dto.label = '외곽·원도심 상권 방문';
    dto.message = '관광 수요 분산에 기여하고 있어요';

    return dto;
  }
}

export class SavingsHistoryDto {
  @ApiProperty({ description: '여행 루트 ID', example: 'route_001' })
  routeId!: string;

  @ApiProperty({
    description: '여행 루트 이름',
    example: '부산 바다 감성 코스',
  })
  routeName!: string;

  @ApiProperty({
    description: '여행 시작 일시',
    example: '2026-07-31T03:00:00.000Z',
  })
  trippedAt!: Date;

  @ApiProperty({
    description:
      '해당 완료 여행의 기준 예산 대비 추천 코스 예상 절약 효과 금액(원)',
    example: 15000,
  })
  savedAmountWon!: number;

  static from(trip: SavingsDashboardTripRawData): SavingsHistoryDto {
    const dto = new SavingsHistoryDto();
    dto.routeId = trip.route.id;
    dto.routeName = trip.route.name;
    dto.trippedAt = trip.startedAt;
    dto.savedAmountWon = getTripSavingsWon(trip);

    return dto;
  }
}

export class SavingsHistoriesQueryDto {
  @ApiPropertyOptional({
    description: 'Page number. Starts from 1.',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({
    description: 'Number of history items per page.',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size: number = 10;
}

export class SavingsHistoriesPageResponseDto {
  @ApiProperty({
    description: 'Savings history items.',
    type: [SavingsHistoryDto],
  })
  items!: SavingsHistoryDto[];

  @ApiProperty({
    description: 'Current page number. Starts from 1.',
    example: 1,
  })
  page!: number;

  @ApiProperty({ description: 'Number of items per page.', example: 10 })
  size!: number;

  @ApiProperty({
    description: 'Total number of savings histories.',
    example: 25,
  })
  totalCount!: number;

  @ApiProperty({ description: 'Total number of pages.', example: 3 })
  totalPages!: number;

  static of(
    trips: SavingsDashboardTripRawData[],
    page: number,
    size: number,
    totalCount: number,
  ): SavingsHistoriesPageResponseDto {
    const dto = new SavingsHistoriesPageResponseDto();
    dto.items = trips.map((trip) => SavingsHistoryDto.from(trip));
    dto.page = page;
    dto.size = size;
    dto.totalCount = totalCount;
    dto.totalPages = Math.ceil(totalCount / size) || 1;

    return dto;
  }
}

export class SavingsDashboardResponseDto {
  @ApiProperty({
    description: '총 기준 예산 대비 예상 절약 효과 금액(원)',
    example: 48000,
  })
  totalSavingsWon!: number;

  @ApiProperty({ description: '완료한 여행 수', example: 3 })
  tripCount!: number;

  @ApiProperty({
    description: '여행당 평균 기준 예산 대비 예상 절약 효과 금액(원)',
    example: 16000,
  })
  averageSavingsWon!: number;

  @ApiProperty({
    description: '카테고리별 기준 예산 대비 예상 절약 효과 목록',
    type: [SavingsCategoryDto],
  })
  savingsByCategory!: SavingsCategoryDto[];

  @ApiProperty({
    description: '지역 기여 정보',
    type: LocalContributionDto,
  })
  localContribution!: LocalContributionDto;

  @ApiProperty({
    description: '최근 완료 여행의 기준 예산 대비 예상 절약 효과 내역',
    type: [SavingsHistoryDto],
  })
  histories!: SavingsHistoryDto[];

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
  const dayCount = getTripDayCount(trip);
  const totalBudgetWon = DEFAULT_DAILY_BUDGET_WON * dayCount;
  const costs = getTripEstimatedCosts(trip);
  const estimatedCostWon = costs.food + costs.transport + costs.experience;

  return Math.max(0, totalBudgetWon - estimatedCostWon);
}

function getTripEstimatedCosts(trip: SavingsDashboardTripRawData): {
  food: number;
  transport: number;
  experience: number;
} {
  const routeCosts = {
    food: trip.route.foodCostWon ?? 0,
    transport: trip.route.transportCostWon ?? 0,
    experience: trip.route.experienceCostWon ?? 0,
  };
  const hasRouteCosts =
    routeCosts.food + routeCosts.transport + routeCosts.experience > 0;

  if (hasRouteCosts) {
    return routeCosts;
  }

  const stops = Array.isArray(trip.route.stops) ? trip.route.stops : [];

  return stops.reduce(
    (acc, stop) => {
      acc.transport += stop.fareWon ?? 0;

      if (isFoodCategory(stop.place?.category)) {
        acc.food += stop.estimatedPriceWon ?? 0;
      } else {
        acc.experience += stop.estimatedPriceWon ?? 0;
      }

      return acc;
    },
    { food: 0, transport: 0, experience: 0 },
  );
}

function isFoodCategory(category?: string | null): boolean {
  return category === 'FOOD' || category === 'CAFE';
}

function getTripDayCount(trip: SavingsDashboardTripRawData): number {
  const stops = Array.isArray(trip.route.stops) ? trip.route.stops : [];

  return stops.reduce((maxDay, stop) => {
    const transitDetails = stop.transitDetails;
    const dayNumber =
      transitDetails != null &&
      typeof transitDetails === 'object' &&
      'dayNumber' in transitDetails
        ? Number((transitDetails as { dayNumber?: unknown }).dayNumber)
        : 1;

    return Number.isInteger(dayNumber) && dayNumber > maxDay
      ? dayNumber
      : maxDay;
  }, 1);
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
