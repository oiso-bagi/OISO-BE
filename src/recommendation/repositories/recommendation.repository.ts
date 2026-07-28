import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import type { BudgetAllocationItem } from '@/recommendation/types/recommendation.types';

@Injectable()
export class RecommendationRepository {
  constructor(private readonly prisma: PrismaService) {}

  upsertPreference(params: {
    userId: string;
    travelStyleSlugs: string[];
    durationDays: number;
    dailyBudgetWon: number;
    budgetAllocation: BudgetAllocationItem[];
  }) {
    const budgetAllocation =
      params.budgetAllocation as unknown as Prisma.InputJsonValue;

    return this.prisma.recommendationPreference.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        travelStyleSlugs: params.travelStyleSlugs,
        durationDays: params.durationDays,
        dailyBudgetWon: params.dailyBudgetWon,
        budgetAllocation,
      },
      update: {
        travelStyleSlugs: params.travelStyleSlugs,
        durationDays: params.durationDays,
        dailyBudgetWon: params.dailyBudgetWon,
        budgetAllocation,
      },
    });
  }
}
