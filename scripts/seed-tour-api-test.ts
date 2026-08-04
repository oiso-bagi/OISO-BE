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
  title?: string,
): PlaceCategory {
  const code = String(contentTypeId ?? '');
  const titleText = title ?? '';

  if (
    titleText.includes('카페') ||
    titleText.includes('커피') ||
    titleText.includes('디저트') ||
    titleText.includes('베이커리')
  ) {
    return PlaceCategory.CAFE;
  }

  if (titleText.includes('전망대') || titleText.includes('야경')) {
    return PlaceCategory.VIEWPOINT;
  }

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
 * 외부 API 503 / 429 (Rate Limit) 장애 발생 시 Exponential Backoff 기반 3회 재시도 헬퍼 함수
 */
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.response?.status;
    if (retries > 0 && (status === 503 || status === 429 || !status)) {
      console.warn(
        `⚠️ 외부 API 장애/트래픽 한도 연동 지연 (Status: ${status ?? 'Timeout'}). ${delayMs}ms 후 재시도합니다... (남은 재시도: ${retries}회)`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return fetchWithRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
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
    const response = await fetchWithRetry(() =>
      axios.get(endpoint, {
        params: {
          serviceKey,
          numOfRows: 1000,
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
        timeout: 15000,
      }),
    );

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

    // Google Elevation API 파이프(|) 일괄 획득을 위한 유효 장소 목록 준비
    const validItems: Array<{ item: any; lat: number; lng: number }> = [];
    let skipCount = 0;

    for (const item of items) {
      const contentId = item.contentid ? String(item.contentid).trim() : '';
      const mapX = item.mapx ? String(item.mapx).trim() : '';
      const mapY = item.mapy ? String(item.mapy).trim() : '';

      if (!contentId || !mapX || !mapY || mapX === '0' || mapY === '0') {
        skipCount++;
        continue;
      }

      validItems.push({
        item,
        lng: parseFloat(mapX),
        lat: parseFloat(mapY),
      });
    }

    // Google Elevation API 청크(100개씩) 일괄 파이프(|) 획득
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    const elevationsMap: Record<string, number> = {};

    if (googleKey && validItems.length > 0) {
      const chunkSize = 100;
      for (let i = 0; i < validItems.length; i += chunkSize) {
        const chunk = validItems.slice(i, i + chunkSize);
        try {
          const locationsStr = chunk
            .map((v) => `${v.lat},${v.lng}`)
            .join('|');
          const elevUrl = `https://maps.googleapis.com/maps/api/elevation/json?locations=${encodeURIComponent(
            locationsStr,
          )}&key=${googleKey}`;
          const elevRes = await axios.get(elevUrl, { timeout: 10000 });

          if (Array.isArray(elevRes.data?.results)) {
            elevRes.data.results.forEach((res: any, idx: number) => {
              if (res?.elevation != null && chunk[idx]) {
                const contentId = String(chunk[idx].item.contentid);
                elevationsMap[contentId] = Math.round(res.elevation);
              }
            });
          }
        } catch (err: any) {
          console.warn(`⚠️ Google Elevation API 청크 수집 지연: ${err?.message}`);
        }
      }
      console.log(
        `🏔️ Google Elevation API 일괄 수집 완료 (${Object.keys(elevationsMap).length}개 고도 획득)`,
      );
    }

    let successCount = 0;
    for (const { item, lat, lng } of validItems) {
      const contentId = String(item.contentid).trim();
      const longitude = new Prisma.Decimal(lng);
      const latitude = new Prisma.Decimal(lat);
      const category = mapContentTypeToCategory(
        item.contenttypeid,
        item.title,
      );
      const elevationMeters = elevationsMap[contentId] ?? 15; // API 미제공시 기본 15m

      const placeData = {
        name: item.title ? String(item.title).trim() : '이름 없음',
        address: item.addr1 ? String(item.addr1).trim() : null,
        roadAddress: item.addr2 ? String(item.addr2).trim() : null,
        region: '부산광역시',
        district: item.sigungucode ? `시군구-${item.sigungucode}` : null,
        category,
        latitude,
        longitude,
        elevationMeters,
        isActive: true,
      };

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
