export class BudgetRatiosDto {
  foodRatio!: number; // 식비 비율 (예: 0.4)
  experienceRatio!: number; // 체험/관광비 비율 (예: 0.4)
  transportRatio!: number; // 교통비 비율 (예: 0.2)
}

export class RecommendRouteRequestDto {
  budget!: number; // 사용자 입력 총 예산 (원화)
  ratios!: BudgetRatiosDto; // 사용자 원하는 비용 분배 비율
}
