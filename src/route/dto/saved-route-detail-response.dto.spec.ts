import { PlaceCategory, TransitType } from '@prisma/client';
import {
  SavedRouteDetailResponseDto,
  SavedRouteStopDetailDto,
} from '@/route/dto/saved-route-detail-response.dto';

describe('SavedRouteStopDetailDto', () => {
  describe('from', () => {
    it('preserves dayNumber when valid positive integer like 2 is provided', () => {
      const dto = SavedRouteStopDetailDto.from({
        orderIndex: 2,
        dayNumber: 2,
        transitType: TransitType.SUBWAY,
        travelMinutesFromPrev: 20,
        place: {
          name: '해운대해수욕장',
          category: PlaceCategory.NATURE,
          openTime: '00:00',
          closeTime: '24:00',
          latitude: 35.1587,
          longitude: 129.1601,
        },
      });

      expect(dto.sequence).toBe(2);
      expect(dto.dayNumber).toBe(2);
      expect(dto.placeName).toBe('해운대해수욕장');
      expect(dto.category).toBe(PlaceCategory.NATURE);
    });

    it('falls back dayNumber to 1 when dayNumber is missing (undefined)', () => {
      const dto = SavedRouteStopDetailDto.from({
        orderIndex: 0,
        dayNumber: undefined,
        place: { name: '부산역' },
      });

      expect(dto.dayNumber).toBe(1);
    });

    it('falls back dayNumber to 1 when dayNumber is 0', () => {
      const dto = SavedRouteStopDetailDto.from({
        orderIndex: 0,
        dayNumber: 0,
        place: { name: '자갈치시장' },
      });

      expect(dto.dayNumber).toBe(1);
    });

    it('falls back dayNumber to 1 when dayNumber is negative', () => {
      const dto = SavedRouteStopDetailDto.from({
        orderIndex: 1,
        dayNumber: -1,
        place: { name: '광안리해수욕장' },
      });

      expect(dto.dayNumber).toBe(1);
    });

    it('falls back dayNumber to 1 when dayNumber is a floating point number', () => {
      const dto = SavedRouteStopDetailDto.from({
        orderIndex: 1,
        dayNumber: 1.5,
        place: { name: '태종대' },
      });

      expect(dto.dayNumber).toBe(1);
    });

    it('restores dayNumber from transitDetails JSON when stop.dayNumber is undefined', () => {
      const dto = SavedRouteStopDetailDto.from({
        orderIndex: 3,
        transitDetails: { dayNumber: 3 },
        place: { name: '감천문화마을' },
      });

      expect(dto.dayNumber).toBe(3);
    });

    it('restores pathCoordinates from transitDetails JSON when present', () => {
      const mockPath = [
        { latitude: 35.1587, longitude: 129.1604 },
        { latitude: 35.159, longitude: 129.161 },
      ];
      const dto = SavedRouteStopDetailDto.from({
        orderIndex: 1,
        transitDetails: { dayNumber: 1, pathCoordinates: mockPath },
        place: { name: '광안대교' },
      });

      expect(dto.pathCoordinates).toHaveLength(2);
      expect(dto.pathCoordinates[0]).toEqual({
        latitude: 35.1587,
        longitude: 129.1604,
      });
    });

    it('calculates touristPremiumWon and savedPriceWon when estimatedPriceWon exists', () => {
      const dto = SavedRouteStopDetailDto.from({
        orderIndex: 0,
        estimatedPriceWon: 10000,
        place: { name: '해운대 소문난 암소갈비' },
      });

      expect(dto.estimatedPriceWon).toBe(10000);
      expect(dto.touristPremiumWon).toBe(15400);
      expect(dto.savedPriceWon).toBe(5400);
    });

    it('maps stayMinutes correctly from stop data', () => {
      const dto = SavedRouteStopDetailDto.from({
        orderIndex: 0,
        stayMinutes: 90,
        place: { name: '광안리 카페' },
      });

      expect(dto.stayMinutes).toBe(90);

      const nullDto = SavedRouteStopDetailDto.from({
        orderIndex: 0,
        place: { name: '광안리 카페' },
      });

      expect(nullDto.stayMinutes).toBeNull();
    });

    it('resolves address using roadAddress first, then address, then null', () => {
      const withRoad = SavedRouteStopDetailDto.from({
        orderIndex: 0,
        place: {
          name: '해운대',
          roadAddress: '부산 해운대구 해운대변로 1',
          address: '부산 해운대구 우동 100',
        },
      });
      expect(withRoad.address).toBe('부산 해운대구 해운대변로 1');

      const withJibun = SavedRouteStopDetailDto.from({
        orderIndex: 0,
        place: {
          name: '광안리',
          roadAddress: null,
          address: '부산 수영구 광안동 200',
        },
      });
      expect(withJibun.address).toBe('부산 수영구 광안동 200');

      const withNull = SavedRouteStopDetailDto.from({
        orderIndex: 0,
        place: {
          name: '태종대',
          roadAddress: null,
          address: null,
        },
      });
      expect(withNull.address).toBeNull();
    });
  });

  describe('SavedRouteDetailResponseDto', () => {
    it('maps localContributionScore correctly from raw route data', () => {
      const dto = SavedRouteDetailResponseDto.from({
        savedAt: new Date('2026-09-09T10:00:00.000Z'),
        route: {
          id: 'route-saved-1',
          name: '부산 전통시장 코스',
          totalDistanceMeters: 4500,
          estimatedSavingsWon: 3000,
          score: 4.8,
          localContributionScore: 82,
          routeType: 'RECOMMENDED',
          stops: [],
          tripLogs: [{ isCompleted: true }],
        },
      });

      expect(dto.routeId).toBe('route-saved-1');
      expect(dto.localContributionScore).toBe(82);
      expect(dto.isCompleted).toBe(true);
      expect(dto.savedCost).toBe(3000);
    });

    it('falls back localContributionScore to 0 when missing', () => {
      const dto = SavedRouteDetailResponseDto.from({
        savedAt: new Date('2026-09-09T10:00:00.000Z'),
        route: {
          id: 'route-saved-2',
          name: '부산 일반 코스',
          stops: [],
        },
      });

      expect(dto.localContributionScore).toBe(0);
    });
  });
});
