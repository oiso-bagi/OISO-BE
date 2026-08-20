import { PrismaClient, PlaceCategory, RouteType, CongestionLevel, TransitType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 더미 데이터 생성(Seed)을 시작합니다...');

  // 기존 데이터 초기화 (외래키 제약조건 순서대로)
  await prisma.savedRoute.deleteMany();
  await prisma.routeTrip.deleteMany();
  await prisma.routeStop.deleteMany();
  await prisma.routeTheme.deleteMany();
  await prisma.route.deleteMany();
  await prisma.place.deleteMany();
  await prisma.user.deleteMany();

  // 1. 더미 유저 생성
  const user = await prisma.user.create({
    data: {
      email: 'test@oiso.com',
      nickname: '부산여행러',
      provider: 'LOCAL',
      role: 'USER',
    },
  });

  // 2. 더미 장소(Place) 데이터 생성 (실제 부산 위도/경도 좌표 포함)
  const placeHaeundae = await prisma.place.create({
    data: {
      name: '해운대 해수욕장',
      description: '부산의 대표적인 힐링 해수욕장',
      region: '부산광역시',
      district: '해운대구',
      category: PlaceCategory.NATURE,
      latitude: 35.1587,
      longitude: 129.1604,
      openTime: '00:00',
      closeTime: '24:00',
    },
  });

  const placeHaeridan = await prisma.place.create({
    data: {
      name: '해리단길 카페거리',
      description: '아기자기한 감성 카페가 모여있는 거리',
      region: '부산광역시',
      district: '해운대구',
      category: PlaceCategory.CAFE,
      latitude: 35.1632,
      longitude: 129.1589,
      openTime: '10:00',
      closeTime: '22:00',
    },
  });

  const placeGamcheon = await prisma.place.create({
    data: {
      name: '감천문화마을',
      description: '알록달록한 계단식 주택이 아름다운 문화마을',
      region: '부산광역시',
      district: '사하구',
      category: PlaceCategory.CULTURE,
      latitude: 35.0975,
      longitude: 129.0106,
      openTime: '09:00',
      closeTime: '18:00',
    },
  });

  const placeSongdo = await prisma.place.create({
    data: {
      name: '송도 해수욕장 & 케이블카',
      description: '우리나라 최초의 공설 해수욕장이자 케이블카 명소',
      region: '부산광역시',
      district: '서구',
      category: PlaceCategory.EXPERIENCE,
      latitude: 35.0785,
      longitude: 129.0201,
      openTime: '09:00',
      closeTime: '21:00',
    },
  });

  const placeTaejongdae = await prisma.place.create({
    data: {
      name: '태종대 유원지',
      description: '깍아지른 절벽과 탁 트인 바다 경관이 멋진 명소',
      region: '부산광역시',
      district: '영도구',
      category: PlaceCategory.NATURE,
      latitude: 35.0531,
      longitude: 129.0874,
      openTime: '05:00',
      closeTime: '24:00',
    },
  });

  // 3. 더미 추천 경로(Route) 1 생성 (해운대 코스)
  const route1 = await prisma.route.create({
    data: {
      name: '부산 해운대 감성 힐링 코스',
      summary: '해운대 바다 감성과 감성 카페를 즐기는 힐링 코스',
      region: '부산',
      routeType: RouteType.RECOMMENDED,
      congestionLevel: CongestionLevel.MEDIUM,
      score: 4.8,
      estimatedCostWon: 12500,
      estimatedDurationMin: 80,
      totalDistanceMeters: 4200,
      estimatedSavingsWon: 3500,
      stops: {
        create: [
          {
            orderIndex: 0,
            placeId: placeHaeundae.id,
            transitType: TransitType.BUS,
            travelMinutesFromPrev: 20,
            stayMinutes: 40,
            fareWon: 1500,
            estimatedPriceWon: 5000,
          },
          {
            orderIndex: 1,
            placeId: placeHaeridan.id,
            transitType: TransitType.WALKING,
            travelMinutesFromPrev: 10,
            stayMinutes: 60,
            fareWon: 0,
            estimatedPriceWon: 6000,
          },
        ],
      },
    },
  });

  // 4. 더미 추천 경로(Route) 2 생성 (감천/송도 코스)
  const route2 = await prisma.route.create({
    data: {
      name: '부산 감천문화마을 & 송도 코스',
      summary: '문화마을 산책과 송도 바다 케이블카 체험 코스',
      region: '부산',
      routeType: RouteType.RECOMMENDED,
      congestionLevel: CongestionLevel.LOW,
      score: 4.5,
      estimatedCostWon: 23500,
      estimatedDurationMin: 120,
      totalDistanceMeters: 5400,
      estimatedSavingsWon: 5000,
      stops: {
        create: [
          {
            orderIndex: 0,
            placeId: placeGamcheon.id,
            transitType: TransitType.BUS,
            travelMinutesFromPrev: 30,
            stayMinutes: 60,
            fareWon: 1500,
            estimatedPriceWon: 3000,
          },
          {
            orderIndex: 1,
            placeId: placeSongdo.id,
            transitType: TransitType.TAXI,
            travelMinutesFromPrev: 15,
            stayMinutes: 45,
            fareWon: 7000,
            estimatedPriceWon: 12000,
          },
        ],
      },
    },
  });

  // 5. 더미 추천 경로(Route) 3 생성 (태종대 코스)
  await prisma.route.create({
    data: {
      name: '부산 태종대 자연 탐방 코스',
      summary: '영도 태종대 절경을 감상하는 시원한 자연 코스',
      region: '부산',
      routeType: RouteType.RECOMMENDED,
      congestionLevel: CongestionLevel.HIGH,
      score: 4.2,
      estimatedCostWon: 5500,
      estimatedDurationMin: 90,
      totalDistanceMeters: 8000,
      estimatedSavingsWon: 2000,
      stops: {
        create: [
          {
            orderIndex: 0,
            placeId: placeTaejongdae.id,
            transitType: TransitType.BUS,
            travelMinutesFromPrev: 40,
            stayMinutes: 90,
            fareWon: 1500,
            estimatedPriceWon: 4000,
          },
        ],
      },
    },
  });

  // 6. 유저의 저장된 루트(SavedRoute) 연결
  await prisma.savedRoute.create({
    data: {
      userId: user.id,
      routeId: route1.id,
      savedAt: new Date('2026-07-24T10:00:00Z'),
    },
  });

  await prisma.savedRoute.create({
    data: {
      userId: user.id,
      routeId: route2.id,
      savedAt: new Date('2026-07-23T15:30:00Z'),
    },
  });

  // 7. 유저 여정 완료 로그(RouteTrip) 생성 (route1 은 완료 처리)
  await prisma.routeTrip.create({
    data: {
      userId: user.id,
      routeId: route1.id,
      isCompleted: true,
      actualCostWon: 12000,
    },
  });

  console.log('✅ 더미 데이터 생성(Seed)이 성공적으로 완료되었습니다!');
  console.log(`👤 테스트 유저 ID: ${user.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed 생성 중 오류 발생:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
