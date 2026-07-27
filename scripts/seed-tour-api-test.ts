import { PrismaClient, PlaceCategory, Prisma } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * 한국관광공사 contentTypeId를 시스템 PlaceCategory로 맵핑합니다.
 * 12: 관광지(NATURE), 14: 문화시설(CULTURE), 15: 축제공연행사/28: 레포츠(EXPERIENCE),
 * 38: 쇼핑(MARKET), 39: 음식점(FOOD)
 */
function mapContentTypeToCategory(
  contentTypeId?: string | number,
): PlaceCategory {
  const code = String(contentTypeId ?? '');
  switch (code) {
    case '12':
      return PlaceCategory.NATURE;
    case '14':
      return PlaceCategory.CULTURE;
    case '15':
    case '28':
      return PlaceCategory.EXPERIENCE;
    case '38':
      return PlaceCategory.MARKET;
    case '39':
      return PlaceCategory.FOOD;
    default:
      return PlaceCategory.ETC;
  }
}

/**
 * 한국관광공사 국문 관광정보 서비스(TourAPI 4.0) 연동 테스트 Seed 스크립트
 */
async function seedTourApiTest() {
  console.log('🚀 TourAPI 4.0 연동 데이터 적재(Seed) 스크립트를 시작합니다...');

  const rawApiKey = process.env.VK_KORSERVICE2_API_KEY;
  if (!rawApiKey) {
    console.error(
      '❌ .env 파일에 VK_KORSERVICE2_API_KEY 환경변수가 설정되지 않았습니다.',
    );
    process.exit(1);
  }

  // API 키 이중 인코딩 방어 (Decoded Key 사용)
  const serviceKey = decodeURIComponent(rawApiKey);
  const endpoint = 'https://apis.data.go.kr/B551011/KorService2/areaBasedList2';

  try {
    const response = await axios.get(endpoint, {
      params: {
        serviceKey,
        numOfRows: 30,
        pageNo: 1,
        MobileOS: 'ETC',
        MobileApp: 'AppTest',
        _type: 'json',
        areaCode: '6', // 부산광역시
      },
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'application/json, text/plain, */*',
      },
      timeout: 10000,
    });

    // 비정상 응답(XML/HTML 텍스트) 방어
    if (
      typeof response.data === 'string' &&
      (response.data.includes('<xml') ||
        response.data.includes('<html') ||
        response.data.includes('OpenAPI_ServiceResponse'))
    ) {
      throw new Error(
        'TourAPI 응답이 JSON이 아닌 XML/HTML 형식으로 반환되었습니다. API 키 유효성 또는 트래픽 제한을 확인하세요.',
      );
    }

    const items = response.data?.response?.body?.items?.item;

    if (!Array.isArray(items)) {
      console.warn('⚠️ TourAPI 응답에 유효한 items 데이터가 존재하지 않습니다.');
      console.dir(response.data, { depth: null });
      return;
    }

    console.log(`📦 총 ${items.length}개의 관광지 원본 데이터를 수집했습니다.`);

    let successCount = 0;
    let skipCount = 0;

    for (const item of items) {
      const contentId = item.contentid ? String(item.contentid).trim() : '';
      const mapX = item.mapx ? String(item.mapx).trim() : '';
      const mapY = item.mapy ? String(item.mapy).trim() : '';

      // 유효성 필터링: contentid, mapx(경도), mapy(위도) 중 하나라도 없거나 '0'이면 쓰레기 데이터로 판단하여 스킵
      if (!contentId || !mapX || !mapY || mapX === '0' || mapY === '0') {
        console.log(
          `⚠️ 필수 데이터 누락으로 스킵됨 (Title: ${item.title ?? '알 수 없음'}, ContentID: ${contentId})`,
        );
        skipCount++;
        continue;
      }

      const longitude = new Prisma.Decimal(parseFloat(mapX));
      const latitude = new Prisma.Decimal(parseFloat(mapY));
      const category = mapContentTypeToCategory(item.contenttypeid);

      const placeData = {
        name: item.title ? String(item.title).trim() : '이름 없음',
        address: item.addr1 ? String(item.addr1).trim() : null,
        roadAddress: item.addr2 ? String(item.addr2).trim() : null,
        region: '부산광역시',
        district: item.sigungucode ? `시군구-${item.sigungucode}` : null,
        category,
        latitude,
        longitude,
        isActive: true,
      };

      // Prisma Upsert를 통한 멱등성 보장 (contentId 기준)
      await prisma.place.upsert({
        where: { apiSourceId: contentId },
        update: placeData,
        create: {
          apiSourceId: contentId,
          ...placeData,
        },
      });

      successCount++;
    }

    console.log(
      `✅ Seed 작업 완료! (성공 적재/갱신: ${successCount}건, 스킵: ${skipCount}건)`,
    );
  } catch (error: any) {
    console.error(
      '❌ TourAPI 적재 스크립트 실행 중 오류 발생:',
      error?.message || error,
    );
  } finally {
    await prisma.$disconnect();
  }
}

seedTourApiTest();

// npx ts-node scripts/seed-tour-api-test.ts
