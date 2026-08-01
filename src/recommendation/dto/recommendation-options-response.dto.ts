import { ApiProperty } from '@nestjs/swagger';
import type {
  BudgetAllocationRule,
  BudgetPreset,
  TravelStyleOption,
} from '@/recommendation/types/recommendation.types';

export class BudgetAllocationOptionsDto {
  @ApiProperty({
    description: '기본 1일 예산(원)',
    example: 60000,
  })
  defaultDailyBudgetWon!: number;

  @ApiProperty({
    description: '예산 항목별 배분 규칙',
    example: [
      { type: 'transport', label: '교통비', percentage: 40 },
      { type: 'food', label: '식비', percentage: 35 },
      { type: 'activity', label: '체험/입장료', percentage: 25 },
    ],
  })
  rules!: BudgetAllocationRule[];
}

export class RecommendationOptionsResponseDto {
  @ApiProperty({
    description: '선택 가능한 여행 스타일 목록',
    example: [
      { slug: 'local-food', label: '부산 로컬 맛집' },
      { slug: 'cafe', label: '감성 카페' },
    ],
  })
  travelStyles!: TravelStyleOption[];

  @ApiProperty({
    description: '선택 가능한 여행 기간(일) 목록',
    example: [1, 2, 3, 4, 5],
    type: [Number],
  })
  durationDays!: number[];

  @ApiProperty({
    description: '예산 프리셋 목록',
    example: [
      { label: '~3만원 · 가성비', amountWon: 30000 },
      { label: '3~6만원 · 적당', amountWon: 60000 },
      { label: '6만원 이상 · 자유', amountWon: 90000 },
    ],
  })
  budgetPresets!: BudgetPreset[];

  @ApiProperty({
    description: '기본 예산 및 항목별 예산 배분 옵션',
    type: BudgetAllocationOptionsDto,
  })
  budgetAllocation!: BudgetAllocationOptionsDto;

  static of(params: {
    travelStyles: TravelStyleOption[];
    durationDays: number[];
    budgetPresets: BudgetPreset[];
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
