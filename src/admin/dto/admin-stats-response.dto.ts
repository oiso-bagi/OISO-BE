import { ApiProperty } from '@nestjs/swagger';

export class AdminStatsOverviewResponseDto {
  @ApiProperty({ description: '총 가입 유저 수', example: 128 })
  totalUserCount!: number;

  @ApiProperty({ description: '누적 저장 루트 수', example: 342 })
  totalSavedRouteCount!: number;

  @ApiProperty({ description: '누적 절약 금액 합계 (원)', example: 4850000 })
  totalSavingsCostWon!: number;

  @ApiProperty({
    description: '누적 로컬 기여 지수 평균 (0~100점)',
    example: 78.4,
  })
  averageLocalContributionScore!: number;
}

export class AdminSavingsCategoryItemDto {
  @ApiProperty({ description: '장소 카테고리 코드', example: 'MARKET' })
  category!: string;

  @ApiProperty({ description: '카테고리 한글 라벨', example: '전통시장' })
  label!: string;

  @ApiProperty({
    description: '해당 카테고리 절약 금액 (원)',
    example: 1940000,
  })
  amountWon!: number;

  @ApiProperty({ description: '전체 대비 절약 금액 비율 (%)', example: 40.0 })
  percentage!: number;
}

export class AdminSavingsBreakdownResponseDto {
  @ApiProperty({ description: '전체 절약 금액 합계 (원)', example: 4850000 })
  totalSavingsCostWon!: number;

  @ApiProperty({
    description: '카테고리별 절약 지출 요약 목록 (내림차순 정렬)',
    type: [AdminSavingsCategoryItemDto],
    example: [
      {
        category: 'MARKET',
        label: '전통시장',
        amountWon: 1940000,
        percentage: 40.0,
      },
      {
        category: 'FOOD',
        label: '식당 / 음식점',
        amountWon: 1455000,
        percentage: 30.0,
      },
      {
        category: 'CAFE',
        label: '감성 카페',
        amountWon: 970000,
        percentage: 20.0,
      },
      {
        category: 'LOCAL',
        label: '로컬 상권',
        amountWon: 485000,
        percentage: 10.0,
      },
    ],
  })
  breakdown!: AdminSavingsCategoryItemDto[];
}
