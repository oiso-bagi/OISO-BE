import { calculateTouristSavings } from '@/route/utils/tourist-savings.util';

describe('calculateTouristSavings', () => {
  it('calculates tourist premium and saved price correctly for positive price', () => {
    const result = calculateTouristSavings(10000);
    expect(result.touristPremiumWon).toBe(15400);
    expect(result.savedPriceWon).toBe(5400);
  });

  it('handles 12000 won sample correctly', () => {
    const result = calculateTouristSavings(12000);
    expect(result.touristPremiumWon).toBe(18480);
    expect(result.savedPriceWon).toBe(6480);
  });

  it('returns nulls for null, undefined, zero or negative price', () => {
    expect(calculateTouristSavings(null)).toEqual({
      touristPremiumWon: null,
      savedPriceWon: null,
    });
    expect(calculateTouristSavings(undefined)).toEqual({
      touristPremiumWon: null,
      savedPriceWon: null,
    });
    expect(calculateTouristSavings(0)).toEqual({
      touristPremiumWon: null,
      savedPriceWon: null,
    });
    expect(calculateTouristSavings(-5000)).toEqual({
      touristPremiumWon: null,
      savedPriceWon: null,
    });
  });
});
