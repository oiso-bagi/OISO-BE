import { ApiProperty } from '@nestjs/swagger';

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
  @ApiProperty({ description: '절약 카테고리 라벨', example: '식비' })
  label!: string;

  @ApiProperty({ description: '카테고리별 절약 금액(원)', example: 12000 })
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

  @ApiProperty({ description: '해당 여행에서 절약한 금액(원)', example: 15000 })
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

export class SavingsDashboardResponseDto {
  @ApiProperty({ description: '총 절약 금액(원)', example: 48000 })
  totalSavingsWon!: number;

  @ApiProperty({ description: '완료한 여행 수', example: 3 })
  tripCount!: number;

  @ApiProperty({ description: '여행당 평균 절약 금액(원)', example: 16000 })
  averageSavingsWon!: number;

  @ApiProperty({
    description: '카테고리별 절약 금액 목록',
    type: [SavingsCategoryDto],
  })
  savingsByCategory!: SavingsCategoryDto[];

  @ApiProperty({
    description: '지역 기여 정보',
    type: LocalContributionDto,
  })
  localContribution!: LocalContributionDto;

  @ApiProperty({
    description: '최근 완료 여행 절약 내역',
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
