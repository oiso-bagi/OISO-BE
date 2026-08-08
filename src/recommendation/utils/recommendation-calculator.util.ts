import { TransitType } from '@prisma/client';

/**
 * 두 위경도 좌표 간 하버스인(Haversine) 직선 거리(m) 연산
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // 지구 반지름 (m)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * 이동 순서 상대 고도 상승분 연산 (오르막만 저장, 내리막 0m)
 */
export function calculateElevationGainMeters(
  currentElevation: number,
  prevElevation: number,
): number {
  return Math.max(0, currentElevation - prevElevation);
}

/**
 * 구간 체감 이동 난이도 비용 함수 (D) 연산
 * D = (0.01 * distanceMeters) + (2.0 * elevationGainMeters) + (0.001 * fareWon)
 */
export function calculateDifficultyScore(
  distanceMeters: number,
  elevationGainMeters: number,
  fareWon: number,
  transitType: TransitType,
): number {
  let elevationWeight = 1.0;
  if (transitType === TransitType.WALKING && elevationGainMeters > 0) {
    elevationWeight = 2.0; // 산복도로 보행 경사 가중치 2배 극대화 적용
  }

  const score =
    distanceMeters * 0.01 +
    elevationGainMeters * elevationWeight +
    fareWon * 0.001;

  return Number(score.toFixed(2));
}

/**
 * 코스 기본 점수 (Base Score) 연산 수식
 * BaseScore = max(50.0, 95.0 - (0.05 * D))
 */
export function calculateBaseScore(totalDifficultyScore: number): number {
  const calculated = 95.0 - 0.05 * totalDifficultyScore;
  return Number(Math.max(50.0, calculated).toFixed(2));
}

/**
 * 해변/바다 관련 장소 핀포인트 검증 헬퍼 함수 (키워드 및 소분류 필터)
 */
export function isBeachPlace(place?: { name?: string } | null): boolean {
  const name = String(place?.name ?? '').trim();
  const beachKeywords = [
    '해수욕장',
    '해변',
    '해양',
    '요트',
    '서핑',
    '해안',
    '포구',
    '항',
    '비치',
    '바다',
    '광안리',
    '해운대',
    '송정',
    '다대포',
    '일광',
    '임랑',
    '오륙도',
    '수변공원',
  ];
  return beachKeywords.some((keyword) => name.includes(keyword));
}
