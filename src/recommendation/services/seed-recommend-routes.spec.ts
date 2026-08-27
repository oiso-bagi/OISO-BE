import { TransitType } from '@prisma/client';
import {
  calculateHaversineDistance,
  calculateDifficultyScore,
  calculateBaseScore,
  calculateElevationGainMeters,
  isBeachPlace,
} from '@/recommendation/utils/recommendation-calculator.util';

describe('SEED Script Numerical Calculations', () => {
  describe('isBeachPlace', () => {
    it('항아리수제비 등 무관한 식당 상호명을 해변으로 오탐하지 않아야 한다', () => {
      expect(isBeachPlace({ name: '항아리수제비' })).toBe(false);
      expect(isBeachPlace({ name: '항정살구이 전문점' })).toBe(false);
    });

    it('해운대해수욕장, 부산항구 등 바다 관련 장소를 정상 분류해야 한다', () => {
      expect(isBeachPlace({ name: '해운대해수욕장' })).toBe(true);
      expect(isBeachPlace({ name: '부산항구 국제여객터미널' })).toBe(true);
    });
  });
  describe('calculateHaversineDistance', () => {
    it('광안리 해수욕장 ~ 민락수변공원 간 거리를 정확히 미터 단위로 연산해야 한다', () => {
      // 광안리: 35.1461, 129.1168
      // 민락수변공원: 35.1554, 129.1235
      const distance = calculateHaversineDistance(
        35.1461,
        129.1168,
        35.1554,
        129.1235,
      );
      expect(distance).toBeGreaterThan(1000);
      expect(distance).toBeLessThan(1500);
    });
  });

  describe('calculateElevationGainMeters', () => {
    it('이동 시 오르막 상승분만 가산하고 내리막은 0m로 처리해야 한다', () => {
      const prevElevation = 15;
      const currentElevationHigh = 45;
      const currentElevationLow = 10;

      const gainUp = calculateElevationGainMeters(
        currentElevationHigh,
        prevElevation,
      );
      const gainDown = calculateElevationGainMeters(
        currentElevationLow,
        prevElevation,
      );

      expect(gainUp).toBe(30);
      expect(gainDown).toBe(0);
    });
  });

  describe('calculateDifficultyScore (D)', () => {
    it('도보(WALKING) 이동 시 경사 고도 가중치 2.0배를 정확히 적용해야 한다', () => {
      const distanceMeters = 500;
      const elevationGainMeters = 20;
      const fareWon = 0;

      const score = calculateDifficultyScore(
        distanceMeters,
        elevationGainMeters,
        fareWon,
        TransitType.WALKING,
      );

      // 500 * 0.01 + 20 * 2.0 + 0 = 5 + 40 = 45.0
      expect(score).toBe(45.0);
    });
  });

  describe('calculateBaseScore', () => {
    it('초단거리(< 1.5km)의 경우 점수가 하향 보정되어야 한다', () => {
      const baseScore = calculateBaseScore(10, 500, 30, false);
      expect(baseScore).toBeLessThanOrEqual(4.0);
    });

    it('적정거리(3~8km) 및 대중교통 이용 시 상위 점수(4.5 ~ 4.9)를 반환해야 한다', () => {
      const baseScore = calculateBaseScore(10, 4500, 60, true);
      expect(baseScore).toBeGreaterThanOrEqual(4.5);
      expect(baseScore).toBeLessThanOrEqual(4.9);
    });
  });
});
