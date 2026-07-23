import { CongestionLevel, Prisma, TransitType } from '@prisma/client';
import { RouteWithStops } from './recommended-route-detail-response.dto';
import { RecommendedRouteListResponseDto } from './recommended-route-list-response.dto';

describe('RecommendedRouteListResponseDto', () => {
  it('calculates summary metrics without exposing stops', () => {
    const routeFixture: RouteWithStops = {
      id: 'route-1',
      name: '부산 힐링 루트',
      totalDistanceMeters: 3200,
      estimatedSavingsWon: 1000,
      score: new Prisma.Decimal(4.7),
      routeType: 'RECOMMENDED',
      congestionLevel: CongestionLevel.HIGH,
      stops: [
        {
          orderIndex: 0,
          transitType: TransitType.BUS,
          travelMinutesFromPrev: 20,
          stayMinutes: 10,
          fareWon: 1500,
          estimatedPriceWon: 9000,
          place: {
            name: '해운대 해수욕장',
            latitude: new Prisma.Decimal(35.1587),
            longitude: new Prisma.Decimal(129.1604),
          },
        },
        {
          orderIndex: 1,
          transitType: TransitType.WALKING,
          travelMinutesFromPrev: 30,
          stayMinutes: 20,
          fareWon: 0,
          estimatedPriceWon: 1500,
          place: null,
        },
      ],
    };

    const dto = RecommendedRouteListResponseDto.from(routeFixture);

    expect(dto.id).toBe('route-1');
    expect(dto.name).toBe('부산 힐링 루트');
    expect(dto.stopCount).toBe(2);
    expect(dto.totalDistanceMeters).toBe(3200);
    expect(dto.totalDistanceKm).toBe(3.2);
    expect(dto.transitTypes).toEqual(['BUS', 'WALKING']);
    expect(dto.totalCost).toBe(12000);
    expect(dto.totalTimeMinutes).toBe(80);
    expect(dto.congestionLevel).toBe(CongestionLevel.HIGH);
    expect(dto.estimatedSavingsWon).toBe(1000);
    expect(dto.score).toBe(4.7);
    expect(dto.isRecommended).toBe(true);
    expect(dto.stopLocations[0]).toEqual({
      sequence: 0,
      placeName: '해운대 해수욕장',
      latitude: 35.1587,
      longitude: 129.1604,
    });
    expect(dto).not.toHaveProperty('stops');
  });

  it('uses defaults safely for incomplete data', () => {
    const routeFixture: RouteWithStops = {
      id: 'route-2',
      name: '부산 기본 루트',
      score: null,
      routeType: 'SAVED',
      stops: undefined,
    };

    const dto = RecommendedRouteListResponseDto.from(routeFixture);

    expect(dto.stopCount).toBe(0);
    expect(dto.totalDistanceMeters).toBe(0);
    expect(dto.totalDistanceKm).toBe(0);
    expect(dto.transitTypes).toEqual([]);
    expect(dto.totalCost).toBe(0);
    expect(dto.totalTimeMinutes).toBe(0);
    expect(dto.congestionLevel).toBe(CongestionLevel.MEDIUM);
    expect(dto.estimatedSavingsWon).toBe(0);
    expect(dto.score).toBe(0);
    expect(dto.isRecommended).toBe(false);
  });
});
