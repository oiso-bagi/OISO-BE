export type TravelStyleOption = {
  slug: string;
  label: string;
};

export type BudgetPreset = {
  label: string;
  amountWon: number;
};

export type BudgetAllocationType = 'transport' | 'food' | 'activity';

export type BudgetAllocationRule = {
  type: BudgetAllocationType;
  label: string;
  percentage: number;
};

export type BudgetAllocationItem = BudgetAllocationRule & {
  amountWon: number;
};
