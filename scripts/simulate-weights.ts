/**
 * 추천 알고리즘 가중치 하이퍼파라미터 시뮬레이션 테스트 스크립트
 * 
 * 1. 보행 경사 가중치 (b): 1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0 다단계 시뮬레이션
 * 2. 오차 제곱 패널티 가중치 (W): 25, 50, 100, 150, 200 다단계 시뮬레이션
 */

interface RouteSample {
  name: string;
  isSanbok: boolean; // 산복도로/경사지 여부
  totalDistanceMeters: number;
  totalElevationGainMeters: number;
  totalFareWon: number;
  baseScore: number;
  costRatios: {
    food: number;
    experience: number;
    transport: number;
  };
}

const samples: RouteSample[] = [
  {
    name: '부산 해운대 감성 힐링 코스 (평지)',
    isSanbok: false,
    totalDistanceMeters: 2650,
    totalElevationGainMeters: 33,
    totalFareWon: 1500,
    baseScore: 88.5,
    costRatios: { food: 0.72, experience: 0.18, transport: 0.1 },
  },
  {
    name: '부산 원도심 & 감천 산복도로 짠내 코스 (경사)',
    isSanbok: true,
    totalDistanceMeters: 2200,
    totalElevationGainMeters: 136,
    totalFareWon: 1500,
    baseScore: 92.0,
    costRatios: { food: 0.72, experience: 0.16, transport: 0.12 },
  },
];

console.log('===============================================================');
console.log('🧪 [테스트 1] 보행 경사 가중치 (b) 다단계 시뮬레이션');
console.log('===============================================================');

const bWeights = [1.0, 1.25, 1.5, 2.0, 2.5, 3.0, 4.0];

console.log('가중치(b)\t평지코스 난이도\t산복도로 난이도\t난이도 격차\t격차 비율');
console.log('---------------------------------------------------------------');

bWeights.forEach((b) => {
  const haeundaeDiff =
    2650 * 0.01 + 33 * b + 1500 * 0.001;
  const gamcheonDiff =
    2200 * 0.01 + 136 * b + 1500 * 0.001;
  const diffGap = gamcheonDiff - haeundaeDiff;
  const gapRatio = (gamcheonDiff / haeundaeDiff).toFixed(2);

  console.log(
    `b = ${b.toFixed(2)}\t\t${haeundaeDiff.toFixed(1)}점\t\t${gamcheonDiff.toFixed(1)}점\t\t+${diffGap.toFixed(1)}점\t\t${gapRatio}배`,
  );
});

console.log('\n===============================================================');
console.log('🧪 [테스트 2] 예산 비율 오차 패널티 가중치 (W) 다단계 시뮬레이션');
console.log('===============================================================');

// 유저 선호 비율: 식비 40%, 체험 40%, 교통 20%
const userRatios = { food: 0.4, experience: 0.4, transport: 0.2 };
const wWeights = [25, 50, 100, 150, 200];

console.log('패널티가중치(W)\t해운대 감점\t해운대 최종점수\t산복도로 감점\t산복도로 최종점수\t1위 역전여부');
console.log('---------------------------------------------------------------------------------------------------');

wWeights.forEach((W) => {
  // 해운대 패널티 (비율: 0.72, 0.18, 0.10)
  const hVariance =
    Math.pow(userRatios.food - 0.72, 2) +
    Math.pow(userRatios.experience - 0.18, 2) +
    Math.pow(userRatios.transport - 0.1, 2);
  const hPenalty = Number((hVariance * W).toFixed(2));
  const hFinal = Math.max(0, Number((88.5 - hPenalty).toFixed(2)));

  // 산복도로 패널티 (비율: 0.72, 0.16, 0.12)
  const gVariance =
    Math.pow(userRatios.food - 0.72, 2) +
    Math.pow(userRatios.experience - 0.16, 2) +
    Math.pow(userRatios.transport - 0.12, 2);
  const gPenalty = Number((gVariance * W).toFixed(2));
  const gFinal = Math.max(0, Number((92.0 - gPenalty).toFixed(2)));

  const winner = gFinal > hFinal ? '산복도로 1위' : '해운대 1위';

  console.log(
    `W = ${W}\t\t-${hPenalty}점\t\t${hFinal}점\t\t-${gPenalty}점\t\t${gFinal}점\t\t${winner}`,
  );
});

console.log('===============================================================\n');
