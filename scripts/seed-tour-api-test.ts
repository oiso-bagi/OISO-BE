import { PrismaClient, PlaceCategory, Prisma } from '@prisma/client';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

/**
 * API Key 안전 디코딩 헬퍼 [M-6]
 */
function safeDecodeApiKey(rawKey: string): string {
  try {
    const decoded = decodeURIComponent(rawKey);
    if (/%[0-9A-Fa-f]{2}/.test(decoded)) {
      return decodeURIComponent(decoded);
    }
    return decoded;
  } catch {
    return rawKey;
  }
}

function parseTimeString(text: string): { openTime: string | null; closeTime: string | null } {
  if (!text) return { openTime: null, closeTime: null };
  const cleanText = String(text).trim();

  // 1) 09:00 ~ 21:00 형태 매칭 (한자리 시도 포함: 9:00 -> 09:00)
  const timeMatch = cleanText.match(/(\d{1,2}:\d{2})/g);
  if (timeMatch && timeMatch.length >= 2) {
    const formatTime = (t: string) => (t.length === 4 ? `0${t}` : t);
    const openTime = formatTime(timeMatch[0]);
    const closeTime = formatTime(timeMatch[1]);
    // [M-7] 야간 영업 감지 (closeTime < openTime 시 익일 영업)
    if (closeTime < openTime) {
      console.warn(`⚠️ [영업시간 야간형] openTime: ${openTime} > closeTime: ${closeTime} (익일 마감) → DB 저장 후 어플리케이션 연산 주의`);
    }
    return { openTime, closeTime };
  }

  // 2) 9시 30분 ~ 21시 30분 / 09시~21시 형태 매칭
  const koreanTimeMatch = Array.from(
    cleanText.matchAll(/(\d{1,2})\s*시\s*(\d{1,2})?분?/g),
  );
  if (koreanTimeMatch && koreanTimeMatch.length >= 2) {
    const toHHMM = (m: RegExpMatchArray) => {
      const hour = String(m[1]).padStart(2, '0');
      const min = m[2] ? String(m[2]).padStart(2, '0') : '00';
      return `${hour}:${min}`;
    };
    return {
      openTime: toHHMM(koreanTimeMatch[0]),
      closeTime: toHHMM(koreanTimeMatch[1]),
    };
  }

  // 3) 단일 시간 정보 추출시
  if (timeMatch && timeMatch.length === 1) {
    const t = timeMatch[0];
    return { openTime: t.length === 4 ? `0${t}` : t, closeTime: null };
  }

  // 4) 시간 표기 없이 '상시 개방' 또는 '24시간' 단독 표기인 경우만 23:59 표준화
  // ('연중무휴'는 휴무일 정보이므로 24시간 영업으로 오파싱하지 않음)
  if (cleanText.includes('상시') || cleanText.includes('24시간')) {
    return { openTime: '00:00', closeTime: '23:59' };
  }

  return { openTime: null, closeTime: null };
}

async function fetchTourApiPlaceHours(
  contentId: string | null,
  contentTypeId: string | null = '39',
): Promise<{ openTime: string | null; closeTime: string | null }> {
  const rawApiKey = process.env.VK_KORSERVICE2_API_KEY;
  if (!rawApiKey || !contentId) return { openTime: null, closeTime: null };

  try {
    const serviceKey = safeDecodeApiKey(rawApiKey);
    const endpoint = 'https://apis.data.go.kr/B551011/KorService2/detailIntro2';

    const res = await axios.get(endpoint, {
      params: {
        serviceKey,
        contentId,
        contentTypeId: contentTypeId || '39',
        MobileOS: 'ETC',
        MobileApp: 'OISO',
        _type: 'json',
      },
      timeout: 5000,
    });

    const item = res.data?.response?.body?.items?.item?.[0];
    if (item) {
      console.log(`🔍 [TourAPI detailIntro1 실측 데이터] (contentId: ${contentId}):`, JSON.stringify(item));
      const rawText =
        item.opentimefood ||
        item.opentime ||
        item.usetime ||
        item.usetimeculture ||
        item.usetimeleports ||
        item.usetimefestival ||
        '';

      const result = parseTimeString(rawText);
      if (result.openTime) {
        console.log(`✨ [영업시간 파싱 성공] contentId: ${contentId} => openTime: ${result.openTime}, closeTime: ${result.closeTime}`);
      } else {
        console.log(`ℹ️ [영업시간 텍스트 없음/미파싱] contentId: ${contentId}, rawText: "${rawText}"`);
      }
      return result;
    } else {
      console.log(`⚠️ [TourAPI detailIntro1 응답 빈 item] contentId: ${contentId}, response:`, res.data);
    }
  } catch (error: any) {
    console.error(`❌ [TourAPI detailIntro1 호출 에러] contentId: ${contentId}, error:`, error?.message || error);
  }
  return { openTime: null, closeTime: null };
}

function mapItemToCategory(item: any): PlaceCategory {
  const code = String(item?.contenttypeid ?? '');
  const titleText = String(item?.title ?? '').trim();
  const cat1 = String(item?.cat1 ?? '');
  const cat2 = String(item?.cat2 ?? '');
  const cat3 = String(item?.cat3 ?? '');

  // [M-3] 분류 우선순위: ETC(숙박) → VIEWPOINT → CAFE → CULTURE → EXPERIENCE → MARKET → FOOD → NATURE

  // 0순위: 숙박 명시 제외 (추천 코스 조립 대상 외)
  if (code === '32') {
    return PlaceCategory.ETC;
  }

  // 1순위: VIEWPOINT - 전망/야경 명소 (이전 CAFE보다 늦어 shadowing 발생하던 오류 수정)
  if (
    titleText.includes('전망대') ||
    titleText.includes('스카이워크') ||
    titleText.includes('야경') ||
    titleText.includes('루프탑') ||
    titleText.includes('포토존') ||
    titleText.includes('케이블카') ||
    titleText.includes('타워') ||
    titleText.includes('해넘이') ||
    titleText.includes('일출')
  ) {
    return PlaceCategory.VIEWPOINT;
  }

  // 2순위: CAFE (소분류 코드 기반 우선, '카페거리' 등 오분류 예외 처리)
  if (
    cat3 === 'A05020900' ||
    titleText.includes('로스터리') ||
    titleText.includes('에스프레소') ||
    titleText.includes('베이커리') ||
    titleText.includes('제과') ||
    titleText.includes('찻집') ||
    titleText.includes('디저트') ||
    titleText.toLowerCase().includes('cafe') ||
    (titleText.includes('카페') && !titleText.includes('카페거리'))
  ) {
    return PlaceCategory.CAFE;
  }

  // 3순위: CULTURE
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

  // 4순위: EXPERIENCE
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

  // 5순위: MARKET
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

  // 6순위: FOOD (기본 음식점)
  if (code === '39' || cat1 === 'A05') {
    return PlaceCategory.FOOD;
  }

  // 7순위: NATURE
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

  const serviceKey = safeDecodeApiKey(rawApiKey);
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

    const lng = parseFloat(mapX);
    const lat = parseFloat(mapY);

    // 유한수(Finite number) 검사: NaN인 경우 경계 비교가 항상 false가 되어 필터링을 우회하는 문제 차단
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      console.warn(
        `⚠️ 유효하지 않은 숫자(NaN) 좌표 제외: "${item.title}" (mapX: ${mapX}, mapY: ${mapY})`,
      );
      skipCount++;
      continue;
    }

    // [m-4] 부산 바운딩 박스 좌표 필터 (타 지역 데이터 혼입 방지)
    const BUSAN_BOUNDS = { minLat: 34.88, maxLat: 35.40, minLng: 128.74, maxLng: 129.32 };
    if (
      lat < BUSAN_BOUNDS.minLat || lat > BUSAN_BOUNDS.maxLat ||
      lng < BUSAN_BOUNDS.minLng || lng > BUSAN_BOUNDS.maxLng
    ) {
      console.warn(
        `⚠️ [m-4] 부산 바운딩 박스 외부 좌표 제외: "${item.title}" (lat: ${lat}, lng: ${lng})`,
      );
      skipCount++;
      continue;
    }

    validItems.push({
      item,
      lng,
      lat,
    });
  }

  // Open-Elevation 오픈소스 API (NASA SRTM DEM 기반) 일괄 획득
  const openElevationEndpoint =
    process.env.OPEN_ELEVATION_API_URL ||
    'https://api.open-elevation.com/api/v1/lookup';
  const elevationsMap: Record<string, number> = {};

  if (validItems.length > 0) {
    const ELEVATION_CHUNK_SIZE = 30; // [C-4] 오픈소스 API 서버 부하 방지를 위한 30개 단위 배치 청크
    for (let i = 0; i < validItems.length; i += ELEVATION_CHUNK_SIZE) {
      const chunk = validItems.slice(i, i + ELEVATION_CHUNK_SIZE);
      try {
        const payload = {
          locations: chunk.map((v) => ({
            latitude: v.lat,
            longitude: v.lng,
          })),
        };
        const elevRes = await axios.post<{
          results?: Array<{
            latitude: number;
            longitude: number;
            elevation: number;
          }>;
        }>(openElevationEndpoint, payload, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        });

        const results = elevRes.data?.results;
        if (!Array.isArray(results) || results.length !== chunk.length) {
          throw new Error(
            `불완전한 응답 결과 (요청: ${chunk.length}건, 수신: ${results?.length ?? 0}건)`,
          );
        }

        results.forEach((res, idx) => {
          if (typeof res?.elevation !== 'number' || Number.isNaN(res.elevation)) {
            throw new Error(`인덱스 ${idx}의 유효하지 않은 고도 값 (${res?.elevation})`);
          }
          if (chunk[idx]) {
            const contentId = String(chunk[idx].item.contentid);
            // [C-4] 음수 고도 방어: 간척지·해수면 아래 좌표는 0m 보정
            elevationsMap[contentId] = Math.max(0, Math.round(res.elevation));
          }
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(
          `⚠️ Open-Elevation API 지연/오류 (배치 ${i}~${i + ELEVATION_CHUNK_SIZE}, 기존 DB 고도 보존): ${errMsg}`,
        );
      }
    }
    console.log(
      `🏔️ Open-Elevation 오픈 API 수집 완료 (${Object.keys(elevationsMap).length}개 고도 획득)`,
    );
  }

  let successCount = 0;
  for (const { item, lat, lng } of validItems) {
    const contentId = String(item.contentid).trim();
    const longitude = new Prisma.Decimal(lng);
    const latitude = new Prisma.Decimal(lat);
    const category = mapItemToCategory(item);
    const freshElevation = elevationsMap[contentId];
    const { openTime, closeTime } = await fetchTourApiPlaceHours(
      contentId,
      String(item.contenttypeid ?? '39'),
    );

    const basePlaceData = {
      name: item.title ? String(item.title).trim() : '이름 없음',
      address: item.addr1 ? String(item.addr1).trim() : null,
      roadAddress: item.addr2 ? String(item.addr2).trim() : null,
      region: '부산광역시',
      district: item.sigungucode ? `시군구-${item.sigungucode}` : null,
      category,
      latitude,
      longitude,
      openTime,
      closeTime,
      isActive: true,
    };

    await prisma.place.upsert({
      where: { apiSourceId: contentId },
      update: {
        ...basePlaceData,
        // Open-Elevation에서 새로 획득한 고도가 있을 때만 갱신, 실패/누락 시 기존 DB 값 보존
        ...(freshElevation !== undefined ? { elevationMeters: freshElevation } : {}),
      },
      create: {
        apiSourceId: contentId,
        ...basePlaceData,
        elevationMeters: freshElevation ?? 15,
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
