import {
  RecommendedRouteDetailResponseDto,
  RouteWithStops,
} from '@/route/dto/recommended-route-detail-response.dto';

describe('RecommendedRouteDetailResponseDto', () => {
  it('returns safe defaults when route data is incomplete', () => {
    const dto = RecommendedRouteDetailResponseDto.from({
      id: 'route-1',
      name: '부산 힐링 루트',
      totalDistanceMeters: 3200,
      estimatedSavingsWon: 1000,
      score: null,
      routeType: 'RECOMMENDED',
      stops: undefined,
    } as unknown as RouteWithStops);

    expect(dto.stopCount).toBe(0);
    expect(dto.totalDistanceKm).toBe(3.2);
    expect(dto.transportType).toBe('WALKING');
    expect(dto.savedCost).toBe(1000);
    expect(dto.recommendScore).toBe(0);
    expect(dto.isRecommended).toBe(true);
    expect(dto.totalCost).toBe(0);
    expect(dto.totalTimeMinutes).toBe(0);
    expect(dto.totalTimeDisplay).toBe('0m');
    expect(dto.stops).toEqual([]);
  });

  it('maps stop details safely when place data is missing', () => {
    const dto = RecommendedRouteDetailResponseDto.from({
      id: 'route-2',
      name: '부산 먹거리 루트',
      totalDistanceMeters: 5000,
      estimatedSavingsWon: 500,
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
      ],
    } as unknown as RouteWithStops);

    expect(dto.stopCount).toBe(1);
    expect(dto.transportType).toBe('BUS');
    expect(dto.stops[0].placeName).toBe('');
    expect(dto.stops[0].category).toBeNull();
    expect(dto.stops[0].openTime).toBeNull();
    expect(dto.stops[0].closeTime).toBeNull();
    expect(dto.stops[0].nextTransportType).toBe('BUS');
    expect(dto.stops[0].nextTravelTimeMinutes).toBe(20);
    expect(dto.stops[0].estimatedPriceWon).toBe(9000);
    expect(dto.stops[0].touristPremiumWon).toBe(13860);
    expect(dto.stops[0].savedPriceWon).toBe(4860);
  });
});
