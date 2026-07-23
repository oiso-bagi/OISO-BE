import { RecommendedRouteListResponseDto } from './recommended-route-list-response.dto';

describe('RecommendedRouteListResponseDto', () => {
  it('calculates summary metrics without exposing stops', () => {
    const dto = RecommendedRouteListResponseDto.from({
      id: 'route-1',
      name: '부산 힐링 루트',
      totalDistanceMeters: 3200,
      estimatedSavingsWon: 1000,
      score: 4.7,
      routeType: 'SAVED',
      stops: [
        {
          orderIndex: 0,
          transitType: 'BUS',
          travelMinutesFromPrev: 20,
          stayMinutes: 10,
          fareWon: 1500,
          estimatedPriceWon: 9000,
          place: null,
        },
        {
          orderIndex: 1,
          transitType: 'WALKING',
          travelMinutesFromPrev: 30,
          stayMinutes: 20,
          fareWon: 0,
          estimatedPriceWon: 1500,
          place: null,
        },
      ],
    } as any);

    expect(dto.id).toBe('route-1');
    expect(dto.name).toBe('부산 힐링 루트');
    expect(dto.stopCount).toBe(2);
    expect(dto.totalDistanceMeters).toBe(3200);
    expect(dto.transitTypes).toEqual(['BUS', 'WALKING']);
    expect(dto.totalCost).toBe(12000);
    expect(dto.totalTimeMinutes).toBe(80);
    expect(dto.estimatedSavingsWon).toBe(1000);
    expect(dto.score).toBe(4.7);
    expect(dto.isRecommended).toBe(true);
    expect(dto).not.toHaveProperty('stops');
  });

  it('uses defaults safely for incomplete data', () => {
    const dto = RecommendedRouteListResponseDto.from({
      id: 'route-2',
      name: '부산 기본 루트',
      score: null,
      routeType: 'SAVED',
      stops: undefined,
    } as any);

    expect(dto.stopCount).toBe(0);
    expect(dto.totalDistanceMeters).toBe(0);
    expect(dto.transitTypes).toEqual([]);
    expect(dto.totalCost).toBe(0);
    expect(dto.totalTimeMinutes).toBe(0);
    expect(dto.estimatedSavingsWon).toBe(0);
    expect(dto.score).toBe(0);
    expect(dto.isRecommended).toBe(false);
  });
});
