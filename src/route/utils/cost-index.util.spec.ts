import { PlaceCategory } from '@prisma/client';
import {
  calculateCostIndex,
  calculateRouteCostIndices,
  getPlaceCostIndexType,
} from '@/route/utils/cost-index.util';

describe('cost-index util', () => {
  it('calculates a cost index against the baseline value 100', () => {
    expect(calculateCostIndex(20000, 20000)).toBe(100);
    expect(calculateCostIndex(25000, 20000)).toBe(125);
    expect(calculateCostIndex(0, 20000)).toBe(0);
    expect(calculateCostIndex(10000, 0)).toBe(0);
  });

  it('scales route cost indices by day count', () => {
    expect(
      calculateRouteCostIndices(
        { food: 30000, transport: 9000, activity: 15000 },
        3,
      ),
    ).toEqual({
      foodCostIndex: 50,
      transportCostIndex: 50,
      activityCostIndex: 25,
    });
  });

  it('classifies food and cafe as food, and other categories as activity', () => {
    expect(getPlaceCostIndexType(PlaceCategory.FOOD)).toBe('food');
    expect(getPlaceCostIndexType(PlaceCategory.CAFE)).toBe('food');
    expect(getPlaceCostIndexType(PlaceCategory.MARKET)).toBe('activity');
    expect(getPlaceCostIndexType(null)).toBe('activity');
  });
});
