import { TransitType } from '@prisma/client';
import {
  calculateHaversineDistance,
  calculateDifficultyScore,
  calculateBaseScore,
  calculateElevationGainMeters,
} from '@/recommendation/utils/recommendation-calculator.util';

describe('SEED Script Numerical Calculations', () => {
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
    it('난이도가 클 경우 최소 50.0점을 하한선으로 보장해야 한다', () => {
      const extremeDifficulty = 1500;
      const baseScore = calculateBaseScore(extremeDifficulty);
      expect(baseScore).toBe(50.0);
    });

    it('일반 난이도 점수에 대해 BaseScore 수식(95.0 - 0.05 * D)을 정확히 계산해야 한다', () => {
      const difficulty = 100;
      const baseScore = calculateBaseScore(difficulty);
      // 95.0 - (0.05 * 100) = 90.0
      expect(baseScore).toBe(90.0);
    });
  });
});
