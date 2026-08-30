export const TOURIST_PREMIUM_MULTIPLIER = 1.54;

export interface TouristSavingsResult {
  touristPremiumWon: number | null;
  savedPriceWon: number | null;
}

/**
 * 장소 예상 지출가(estimatedPriceWon) 기준 관광지 프리미엄 원가 및 절약액 계산 도메인 헬퍼
 * - 관광지 프리미엄 원가 = estimatedPriceWon * 1.54 (반올림)
 * - 절약액 = Math.max(0, touristPremiumWon - estimatedPriceWon)
 */
export function calculateTouristSavings(
  estimatedPriceWon?: number | null,
): TouristSavingsResult {
  if (estimatedPriceWon != null && estimatedPriceWon > 0) {
    const touristPremiumWon = Math.round(
      estimatedPriceWon * TOURIST_PREMIUM_MULTIPLIER,
    );
    const savedPriceWon = Math.max(0, touristPremiumWon - estimatedPriceWon);
    return { touristPremiumWon, savedPriceWon };
  }
  return { touristPremiumWon: null, savedPriceWon: null };
}
