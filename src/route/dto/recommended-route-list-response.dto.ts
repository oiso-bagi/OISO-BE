import { TransitType, CongestionLevel, PlaceCategory } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { buildRouteMetrics } from '@/route/dto/recommended-route-detail-response.dto';
import type {
  RouteStopWithPlace,
  RouteWithStops,
} from '@/route/dto/recommended-route-detail-response.dto';

export class RouteStopLocationDto {
  @ApiProperty({
    description: '경유지 순서 (0부터 시작)',
    example: 0,
    type: Number,
  })
  sequence!: number;

  @ApiProperty({
    description: '일차 번호 (1일차, 2일차...)',
    example: 1,
    type: Number,
  })
  dayNumber!: number;

  @ApiProperty({
    description: '장소 이름',
    example: '광안리해수욕장',
    type: String,
  })
  placeName!: string;

  @ApiProperty({
    description:
      '장소 카테고리 (FOOD: 식당 | CAFE: 카페 | MARKET: 전통시장 | CULTURE: 문화 | NATURE: 자연 | EXPERIENCE: 체험 | VIEWPOINT: 전망대 | ETC: 기타)',
    enum: PlaceCategory,
    example: PlaceCategory.NATURE,
    nullable: true,
  })
  category!: PlaceCategory | null;

  @ApiProperty({
    description: '장소 영업 시작 시간',
    example: '09:00',
    nullable: true,
    type: String,
  })
  openTime!: string | null;

  @ApiProperty({
    description: '장소 영업 종료 시간',
    example: '21:00',
    nullable: true,
    type: String,
  })
  closeTime!: string | null;

  @ApiProperty({
    description:
      '다음 경유지로의 이동 수단 (WALKING, BUS, SUBWAY, TAXI, DRIVING 등)',
    enum: TransitType,
    example: TransitType.BUS,
    nullable: true,
  })
  nextTransportType!: TransitType | null;

  @ApiProperty({
    description: '다음 경유지로의 이동 소요 시간(분)',
    example: 20,
    nullable: true,
    type: Number,
  })
  nextTravelTimeMinutes!: number | null;

  @ApiProperty({
    description: '장소 체류 소요 시간(분)',
    example: 60,
    nullable: true,
    type: Number,
  })
  stayMinutes!: number | null;

  @ApiProperty({
    description: '장소 위도',
    example: 35.1532,
    nullable: true,
    type: Number,
  })
  latitude!: number | null;

  @ApiProperty({
    description: '장소 경도',
    example: 129.1187,
    nullable: true,
    type: Number,
  })
  longitude!: number | null;

  @ApiProperty({
    description: '구간 이동 대중교통/이동 비용(원)',
    example: 1500,
    nullable: true,
    type: Number,
  })
  fareWon!: number | null;

  @ApiProperty({
    description: '장소 실제/추정 이용 가격(원)',
    example: 12000,
    nullable: true,
    type: Number,
  })
  estimatedPriceWon!: number | null;

  @ApiProperty({
    description:
      '해당 장소 카테고리의 비교 기준이 되는 관광지 프리미엄 가격(원)',
    example: 18500,
    nullable: true,
    type: Number,
  })
  touristPremiumWon!: number | null;

  @ApiProperty({
    description:
      '해당 장소 이용으로 절약한 금액(원, touristPremiumWon - estimatedPriceWon)',
    example: 6500,
    nullable: true,
    type: Number,
  })
  savedPriceWon!: number | null;

  static from(stop: RouteStopWithPlace): RouteStopLocationDto {
    const dto = new RouteStopLocationDto();
    dto.sequence = stop.orderIndex ?? 0;
    dto.dayNumber =
      typeof stop.dayNumber === 'number' &&
      Number.isInteger(stop.dayNumber) &&
      stop.dayNumber > 0
        ? stop.dayNumber
        : 1;
    dto.placeName = stop.place?.name ?? '';
    dto.category = stop.place?.category ?? null;
    dto.openTime = stop.place?.openTime ?? null;
    dto.closeTime = stop.place?.closeTime ?? null;
    dto.nextTransportType = stop.transitType ?? null;
    dto.nextTravelTimeMinutes = stop.travelMinutesFromPrev ?? null;
    dto.stayMinutes = stop.stayMinutes ?? null;
    dto.latitude =
      stop.place?.latitude != null ? Number(stop.place.latitude) : null;
    dto.longitude =
      stop.place?.longitude != null ? Number(stop.place.longitude) : null;

    dto.fareWon = stop.fareWon != null ? Number(stop.fareWon) : null;
    dto.estimatedPriceWon =
      stop.estimatedPriceWon != null ? Number(stop.estimatedPriceWon) : null;

    if (dto.estimatedPriceWon != null && dto.estimatedPriceWon > 0) {
      // 관광지 프리미엄 지수 (로컬 35% 절감의 역산 기준가 = actualPrice / 0.65)
      dto.touristPremiumWon = Math.round(dto.estimatedPriceWon * 1.54);
      dto.savedPriceWon = Math.max(
        0,
        dto.touristPremiumWon - dto.estimatedPriceWon,
      );
    } else {
      dto.touristPremiumWon = null;
      dto.savedPriceWon = null;
    }

    return dto;
  }
}

export class RecommendedRouteListResponseDto {
  @ApiProperty({
    description: '추천 루트 ID',
    example: 'route_001',
    type: String,
  })
  id!: string;

  @ApiProperty({
    description: '추천 루트 이름',
    example: '부산 바다 감성 코스',
    type: String,
  })
  name!: string;

  @ApiProperty({ description: '경유지 수', example: 4, type: Number })
  stopCount!: number;

  @ApiProperty({ description: '총 이동 거리(m)', example: 8500, type: Number })
  totalDistanceMeters!: number;

  @ApiProperty({ description: '총 이동 거리(km)', example: 8.5, type: Number })
  totalDistanceKm!: number;

  @ApiProperty({
    description: '루트에서 사용하는 이동 수단 목록',
    enum: TransitType,
    isArray: true,
    example: ['WALKING', 'BUS'],
  })
  transitTypes!: TransitType[];

  @ApiProperty({
    description: '예상 총 비용(원)',
    example: 42000,
    type: Number,
  })
  totalCost!: number;

  @ApiProperty({
    description: '예상 총 소요 시간(분)',
    example: 180,
    type: Number,
  })
  totalTimeMinutes!: number;

  @ApiProperty({
    description: '예상 혼잡도',
    enum: CongestionLevel,
    example: 'MEDIUM',
  })
  congestionLevel!: CongestionLevel;

  @ApiProperty({
    description: '예상 절약 금액(원)',
    example: 15000,
    type: Number,
  })
  estimatedSavingsWon!: number;

  @ApiProperty({
    description: '추천도 점수 (0 ~ 100점 백분율 척도)',
    example: 94,
    type: Number,
  })
  score!: number;

  @ApiProperty({ description: '추천 루트 여부', example: true, type: Boolean })
  isRecommended!: boolean;

  @ApiProperty({
    description: '루트 경유지 위치 목록',
    type: [RouteStopLocationDto],
  })
  stopLocations!: RouteStopLocationDto[];

  static from(route: RouteWithStops): RecommendedRouteListResponseDto {
    const dto = new RecommendedRouteListResponseDto();
    const safeStops = Array.isArray(route.stops) ? route.stops : [];

    dto.id = route.id ?? '';
    dto.name = route.name ?? '';
    dto.stopCount = safeStops.length;
    dto.totalDistanceMeters = route.totalDistanceMeters ?? 0;
    dto.totalDistanceKm = Number((dto.totalDistanceMeters / 1000).toFixed(1));
    dto.transitTypes = Array.from(
      new Set(
        safeStops
          .map((stop) => stop.transitType)
          .filter((transitType): transitType is TransitType =>
            Boolean(transitType),
          ),
      ),
    );

    const metrics = buildRouteMetrics(safeStops);
    dto.totalCost = metrics.totalCost;
    dto.totalTimeMinutes = metrics.totalTimeMinutes;

    dto.congestionLevel = route.congestionLevel ?? CongestionLevel.MEDIUM;
    dto.estimatedSavingsWon = route.estimatedSavingsWon ?? 0;

    const rawRoute = route as Record<string, unknown>;
    const calculatedMetrics = rawRoute?.calculatedMetrics as
      { finalScore?: number } | undefined;
    const finalScore = calculatedMetrics?.finalScore;
    const rawScore =
      finalScore != null
        ? Number(finalScore)
        : route.score != null
          ? Number(route.score)
          : 0;
    // score가 0.0 ~ 5.0 범위인 경우 100점 백분율 척도로 안전 변환
    const normalizedScore =
      Number.isFinite(rawScore) && rawScore > 0 && rawScore <= 5.0
        ? Math.round((rawScore / 5.0) * 100)
        : Math.round(rawScore);
    dto.score = Number.isFinite(normalizedScore) ? normalizedScore : 0;
    dto.isRecommended = route.routeType === 'RECOMMENDED';

    dto.stopLocations = safeStops.map((stop) =>
      RouteStopLocationDto.from(stop),
    );

    return dto;
  }
}
