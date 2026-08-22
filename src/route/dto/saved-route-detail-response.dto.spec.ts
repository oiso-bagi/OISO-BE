import { PlaceCategory, TransitType } from '@prisma/client';
import { SavedRouteStopDetailDto } from '@/route/dto/saved-route-detail-response.dto';

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
  });
});
