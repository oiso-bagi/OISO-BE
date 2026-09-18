import { PlaceCategory } from '@prisma/client';

export type CostIndexType = 'food' | 'transport' | 'activity';

export type CostIndexAmounts = Record<CostIndexType, number>;

export type CostIndexValues = {
  foodCostIndex: number;
  transportCostIndex: number;
  activityCostIndex: number;
};

export const COST_INDEX_BASELINE = 100;

export const DAILY_COST_INDEX_BASELINES_WON: CostIndexAmounts = {
  food: 20000,
  transport: 6000,
  activity: 20000,
};

const FOOD_CATEGORIES = new Set<PlaceCategory>([
  PlaceCategory.FOOD,
  PlaceCategory.CAFE,
]);

export function getPlaceCostIndexType(
  category?: PlaceCategory | null,
): Exclude<CostIndexType, 'transport'> {
  return category != null && FOOD_CATEGORIES.has(category)
    ? 'food'
    : 'activity';
}

export function calculateCostIndex(
  amountWon: number,
  baselineWon: number,
): number {
  if (!Number.isFinite(amountWon) || amountWon <= 0) {
    return 0;
  }

  if (!Number.isFinite(baselineWon) || baselineWon <= 0) {
    return 0;
  }

  return Math.round((amountWon / baselineWon) * COST_INDEX_BASELINE);
}

export function calculateRouteCostIndices(
  amounts: CostIndexAmounts,
  dayCount = 1,
): CostIndexValues {
  const safeDayCount =
    Number.isInteger(dayCount) && dayCount > 0 ? dayCount : 1;

  return {
    foodCostIndex: calculateCostIndex(
      amounts.food,
      DAILY_COST_INDEX_BASELINES_WON.food * safeDayCount,
    ),
    transportCostIndex: calculateCostIndex(
      amounts.transport,
      DAILY_COST_INDEX_BASELINES_WON.transport * safeDayCount,
    ),
    activityCostIndex: calculateCostIndex(
      amounts.activity,
      DAILY_COST_INDEX_BASELINES_WON.activity * safeDayCount,
    ),
  };
}
