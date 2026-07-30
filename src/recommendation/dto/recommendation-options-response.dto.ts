import type {
  BudgetAllocationRule,
  BudgetPreset,
  TravelStyleOption,
} from '@/recommendation/types/recommendation.types';

export class BudgetAllocationOptionsDto {
  defaultDailyBudgetWon!: number;
  rules!: BudgetAllocationRule[];
}

export class RecommendationOptionsResponseDto {
  travelStyles!: TravelStyleOption[];
  durationDays!: number[];
  budgetPresets!: BudgetPreset[];
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
