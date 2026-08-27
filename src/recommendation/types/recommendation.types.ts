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

export type BudgetRatios = {
  foodRatio: number;
  experienceRatio: number;
  transportRatio: number;
};

export type RecommendationFilter = {
  travelStyleSlugs: string[];
  durationDays: number;
  dailyBudgetWon: number;
  totalBudgetWon: number;
  ratios?: BudgetRatios;
  isPedestrianMode?: boolean;
};

export type RecommendedCandidateStop = {
  orderIndex: number;
  dayNumber?: number;
  transitType?: any;
  travelMinutesFromPrev?: number | null;
  stayMinutes?: number | null;
  fareWon?: number | null;
  estimatedPriceWon?: number | null;
  place?: {
    id: string;
    name: string;
    category?: any;
    latitude?: any;
    longitude?: any;
  } | null;
};

export type RecommendedCandidateRoute = {
  id: string;
  name: string;
  totalDistanceMeters: number;
  estimatedSavingsWon: number;
  score: number;
  routeType: any;
  congestionLevel: any;
  estimatedCostWon?: number | null;
  foodCostWon?: number | null;
  experienceCostWon?: number | null;
  transportCostWon?: number | null;
  localContributionScore?: number | null;
  totalElevationGainMeters?: number | null;
  estimatedDurationMin?: number | null;
  stops?: RecommendedCandidateStop[];
  themes?: any[];
};
