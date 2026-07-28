import type { BudgetAllocationItem } from '@/recommendation/types/recommendation.types';

export class RecommendationPreferenceResponseDto {
  travelStyleSlugs!: string[];
  durationDays!: number;
  dailyBudgetWon!: number;
  budgetAllocation!: BudgetAllocationItem[];
  updatedAt!: string;

  static from(params: {
    travelStyleSlugs: string[];
    durationDays: number;
    dailyBudgetWon: number;
    budgetAllocation: BudgetAllocationItem[];
    updatedAt: Date;
  }): RecommendationPreferenceResponseDto {
    const dto = new RecommendationPreferenceResponseDto();
    dto.travelStyleSlugs = params.travelStyleSlugs;
    dto.durationDays = params.durationDays;
    dto.dailyBudgetWon = params.dailyBudgetWon;
    dto.budgetAllocation = params.budgetAllocation;
    dto.updatedAt = params.updatedAt.toISOString();
    return dto;
  }
}
