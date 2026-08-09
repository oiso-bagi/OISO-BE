import { ApiProperty } from '@nestjs/swagger';

export class TravelStyleOptionDto {
  @ApiProperty({
    description: '여행 스타일 슬러그 식별자',
    example: 'local-food',
    type: String,
  })
  slug!: string;

  @ApiProperty({
    description: '여행 스타일 한국어 라벨',
    example: '부산 로컬 맛집',
    type: String,
  })
  label!: string;
}

export class BudgetPresetDto {
  @ApiProperty({
    description: '예산 구간 표기 라벨',
    example: '~3만원 · 가성비',
    type: String,
  })
  label!: string;

  @ApiProperty({ description: '금액(원)', example: 30000, type: Number })
  amountWon!: number;
}

export class BudgetAllocationRuleDto {
  @ApiProperty({
    description: '예산 항목 구분 (transport | food | activity)',
    enum: ['transport', 'food', 'activity'],
    example: 'transport',
  })
  type!: 'transport' | 'food' | 'activity';

  @ApiProperty({
    description: '예산 항목 한국어 라벨',
    example: '교통비',
    type: String,
  })
  label!: string;

  @ApiProperty({ description: '배분 비율(%)', example: 40, type: Number })
  percentage!: number;
}

export class BudgetAllocationOptionsDto {
  @ApiProperty({
    description: '기본 1일 예산(원)',
    example: 60000,
    type: Number,
  })
  defaultDailyBudgetWon!: number;

  @ApiProperty({
    description: '예산 항목별 배분 규칙 목록',
    type: [BudgetAllocationRuleDto],
    example: [
      { type: 'transport', label: '교통비', percentage: 40 },
      { type: 'food', label: '식비', percentage: 35 },
      { type: 'activity', label: '체험/입장료', percentage: 25 },
    ],
  })
  rules!: BudgetAllocationRuleDto[];
}

export class RecommendationOptionsResponseDto {
  @ApiProperty({
    description: '선택 가능한 여행 스타일 목록',
    type: [TravelStyleOptionDto],
    example: [
      { slug: 'local-food', label: '부산 로컬 맛집' },
      { slug: 'cafe', label: '감성 카페' },
    ],
  })
  travelStyles!: TravelStyleOptionDto[];

  @ApiProperty({
    description: '선택 가능한 여행 기간(일) 목록',
    example: [1, 2, 3, 4, 5],
    type: [Number],
  })
  durationDays!: number[];

  @ApiProperty({
    description: '예산 프리셋 목록',
    type: [BudgetPresetDto],
    example: [
      { label: '~3만원 · 가성비', amountWon: 30000 },
      { label: '3~6만원 · 적당', amountWon: 60000 },
      { label: '6만원 이상 · 자유', amountWon: 90000 },
    ],
  })
  budgetPresets!: BudgetPresetDto[];

  @ApiProperty({
    description: '기본 예산 및 항목별 예산 배분 옵션',
    type: BudgetAllocationOptionsDto,
  })
  budgetAllocation!: BudgetAllocationOptionsDto;

  static of(params: {
    travelStyles: TravelStyleOptionDto[];
    durationDays: number[];
    budgetPresets: BudgetPresetDto[];
    budgetAllocation: BudgetAllocationOptionsDto;
  }): RecommendationOptionsResponseDto {
    const dto = new RecommendationOptionsResponseDto();
    dto.travelStyles = params.travelStyles;
    dto.durationDays = params.durationDays;
    dto.budgetPresets = params.budgetPresets;
    dto.budgetAllocation = params.budgetAllocation;
    return dto;
  }
}
