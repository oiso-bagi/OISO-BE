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
 * 추천 코스 퀄리티 점수(5.0 만점 기준: 3.5 ~ 4.9 범위 정규화) 연산 수식
 * - 적정 이동거리 (3km ~ 8km) 보너스 및 초단거리(< 1.5km) 페널티
 * - 경유지 수(3~4개) 및 대중교통(BUS/SUBWAY) 동선 다양성 가중치 반영
 */
export function calculateBaseScore(
  totalDifficultyScore: number,
  totalDistanceMeters: number = 3500,
  localContributionScore: number = 50,
  hasTransit: boolean = true,
): number {
  // 1) 기본 베이스 점수 (85.0점 기준)
  let score = 85.0;

  // 2) 이동 거리 적정성 평가 (부산 알찬 코스 적정거리: 3km ~ 8km)
  if (totalDistanceMeters >= 3000 && totalDistanceMeters <= 8000) {
    score += 10.0; // 적정 여행 거리 우대 (+10점)
  } else if (totalDistanceMeters > 8000 && totalDistanceMeters <= 15000) {
    score += 5.0; // 중거리 (+5점)
  } else if (totalDistanceMeters < 1500) {
    score -= 15.0; // 1.5km 미만 초단거리 감점 (-15점)
  } else if (totalDistanceMeters < 3000) {
    score -= 5.0; // 3km 미만 감점 (-5점)
  }

  // 3) 이동수단 다양성 우대 (대중교통 활용 코스 우대)
  if (hasTransit) {
    score += 5.0;
  }

  // 4) 외곽 로컬 상권 기여 우대 (로컬 비중에 따른 가산점 +5점)
  if (localContributionScore >= 50) {
    score += 5.0;
  }

  // 5) 과도한 오르막/난이도 체감 피로도 차감
  score -= 0.02 * totalDifficultyScore;

  // 6) 100점 만점 ➡️ 5.0 만점 변환 (3.5 ~ 4.9 범위 정규화)
  const normalized5Point = Math.min(
    4.9,
    Math.max(3.5, Number((score / 20).toFixed(1))),
  );
  return normalized5Point;
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
    '항구',
    '항만',
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
