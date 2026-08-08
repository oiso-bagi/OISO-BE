import { PrismaClient, PlaceCategory, Prisma } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

function mapItemToCategory(item: any): PlaceCategory {
  const code = String(item?.contenttypeid ?? '');
  const titleText = String(item?.title ?? '').trim();
  const cat1 = String(item?.cat1 ?? '');
  const cat2 = String(item?.cat2 ?? '');
  const cat3 = String(item?.cat3 ?? '');

  if (
    cat3 === 'A05020900' ||
    titleText.includes('카페') ||
    titleText.includes('커피') ||
    titleText.toLowerCase().includes('cafe') ||
    titleText.includes('디저트') ||
    titleText.includes('베이커리') ||
    titleText.includes('제과') ||
    titleText.includes('찻집') ||
    titleText.includes('로스터리') ||
    titleText.includes('에스프레소') ||
    titleText.includes('아뜰리에')
  ) {
    return PlaceCategory.CAFE;
  }

  if (
    titleText.includes('전망대') ||
    titleText.includes('타워') ||
    titleText.includes('야경') ||
    titleText.includes('스카이워크') ||
    titleText.includes('루프탑') ||
    titleText.includes('포토존') ||
    titleText.includes('전망') ||
    titleText.includes('해넘이') ||
    titleText.includes('일출') ||
    titleText.includes('케이블카') ||
    titleText.includes('해변') ||
    titleText.includes('해수욕장') ||
    titleText.includes('포구') ||
    titleText.includes('항')
  ) {
    return PlaceCategory.VIEWPOINT;
  }

  if (
    code === '14' ||
    cat1 === 'A02' ||
    cat2 === 'A0206' ||
    titleText.includes('박물관') ||
    titleText.includes('미술관') ||
    titleText.includes('전시관') ||
    titleText.includes('갤러리') ||
    titleText.includes('기념관') ||
    titleText.includes('역사관') ||
    titleText.includes('서원') ||
    titleText.includes('향교')
  ) {
    return PlaceCategory.CULTURE;
  }

  if (
    code === '15' ||
    code === '28' ||
    cat1 === 'A03' ||
    titleText.includes('체험') ||
    titleText.includes('요트') ||
    titleText.includes('서핑') ||
    titleText.includes('해양') ||
    titleText.includes('레포츠') ||
    titleText.includes('루지') ||
    titleText.includes('공원') ||
    titleText.includes('아쿠아리움') ||
    titleText.includes('클럽') ||
    titleText.includes('볼링') ||
    titleText.includes('골프') ||
    titleText.includes('승마') ||
    titleText.includes('사격') ||
    titleText.includes('카트') ||
    titleText.includes('워터') ||
    titleText.includes('스파') ||
    titleText.includes('온천')
  ) {
    return PlaceCategory.EXPERIENCE;
  }

  if (
    code === '38' ||
    cat2 === 'A0401' ||
    titleText.includes('시장') ||
    titleText.includes('상가') ||
    titleText.includes('몰') ||
    titleText.includes('아울렛') ||
    titleText.includes('백화점')
  ) {
    return PlaceCategory.MARKET;
  }

  if (code === '39' || cat1 === 'A05') {
    return PlaceCategory.FOOD;
  }

  if (code === '12' || cat1 === 'A01') {
    return PlaceCategory.NATURE;
  }

  return PlaceCategory.ETC;
}

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
        `⚠️ 외부 API 대기 (Status: ${status ?? 'Timeout'}). ${delayMs}ms 후 재시도...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return fetchWithRetry(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
}

async function seedTourApiTest() {
  console.log('🚀 TourAPI 4.0 카테고리 대량 핀포인트 확충 수집을 시작합니다...');

  const rawApiKey = process.env.VK_KORSERVICE2_API_KEY;
  if (!rawApiKey) {
    console.error('❌ .env 파일에 VK_KORSERVICE2_API_KEY 환경변수가 없습니다.');
    process.exit(1);
  }

  const serviceKey = decodeURIComponent(rawApiKey);
  const areaEndpoint = 'https://apis.data.go.kr/B551011/KorService2/areaBasedList2';
  const searchEndpoint = 'https://apis.data.go.kr/B551011/KorService2/searchKeyword2';

  const rawItemsMap = new Map<string, any>();

  // 1. 카테고리별 다중 페이지 수집
  const contentTypes = ['12', '14', '15', '28', '38', '39'];
  for (const contentTypeId of contentTypes) {
    for (let pageNo = 1; pageNo <= 5; pageNo++) {
      try {
        const response = await fetchWithRetry(() =>
          axios.get(areaEndpoint, {
            params: {
              serviceKey,
              numOfRows: 200,
              pageNo,
              MobileOS: 'ETC',
              MobileApp: 'OISO',
              _type: 'json',
              areaCode: '6', // 부산광역시
              contentTypeId,
            },
            timeout: 15000,
          }),
        );
        const items = response.data?.response?.body?.items?.item;
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item?.contentid) rawItemsMap.set(String(item.contentid), item);
          }
        }
      } catch (err: any) {
        console.warn(`⚠️ areaBasedList2 (${contentTypeId}) 수집 지연`);
      }
    }
  }

  // 2. 핀포인트 키워드 대량 검색 수집
  const keywords = ['체험', '레포츠', '요트', '온천', '스파', '공원', '전망대', '야경', '해변', '카페', '커피', '디저트', '베이커리', '박물관', '미술관'];
  for (const keyword of keywords) {
    for (let pageNo = 1; pageNo <= 2; pageNo++) {
      try {
        const response = await fetchWithRetry(() =>
          axios.get(searchEndpoint, {
            params: {
              serviceKey,
              numOfRows: 100,
              pageNo,
              MobileOS: 'ETC',
              MobileApp: 'OISO',
              _type: 'json',
              areaCode: '6',
              keyword,
            },
            timeout: 15000,
          }),
        );
        const items = response.data?.response?.body?.items?.item;
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item?.contentid) rawItemsMap.set(String(item.contentid), item);
          }
        }
      } catch (err: any) {
        console.warn(`⚠️ searchKeyword2 ('${keyword}') 수집 지연`);
      }
    }
  }

  const items = Array.from(rawItemsMap.values());
  console.log(`📦 총 ${items.length}개의 카테고리/키워드 통합 원본 장소를 수집했습니다.`);

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

  // Google Elevation API 일괄 획득
  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  const elevationsMap: Record<string, number> = {};

  if (googleKey && validItems.length > 0) {
    const chunkSize = 100;
    for (let i = 0; i < validItems.length; i += chunkSize) {
      const chunk = validItems.slice(i, i + chunkSize);
      try {
        const locationsStr = chunk.map((v) => `${v.lat},${v.lng}`).join('|');
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
        console.warn(`⚠️ Elevation API 지연`);
      }
    }
    console.log(`🏔️ Google Elevation API 수집 완료 (${Object.keys(elevationsMap).length}개 고도 획득)`);
  }

  let successCount = 0;
  for (const { item, lat, lng } of validItems) {
    const contentId = String(item.contentid).trim();
    const longitude = new Prisma.Decimal(lng);
    const latitude = new Prisma.Decimal(lat);
    const category = mapItemToCategory(item);
    const elevationMeters = elevationsMap[contentId] ?? 15;

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

  console.log(`✅ Seed 작업 완료! (성공 적재/갱신: ${successCount}건, 스킵: ${skipCount}건)`);
  await prisma.$disconnect();
}

seedTourApiTest().catch(async (err) => {
  console.error('❌ TourAPI 적재 스크립트 실행 오류:', err?.message || err);
  await prisma.$disconnect();
  process.exit(1);
});
