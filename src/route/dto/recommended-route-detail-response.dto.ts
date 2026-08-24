import { ApiProperty } from '@nestjs/swagger';
import {
  Route,
  RouteStop,
  Place,
  TransitType,
  CongestionLevel,
  PlaceCategory,
} from '@prisma/client';

export type RouteStopWithPlace = Partial<RouteStop> & {
  orderIndex?: number | null;
  dayNumber?: number | null;
  transitType?: TransitType | null;
  travelMinutesFromPrev?: number | null;
  stayMinutes?: number | null;
  fareWon?: number | null;
  estimatedPriceWon?: number | null;
  place?: Partial<Place> | null;
};
export type RouteWithStops = Partial<Route> & {
  id?: string;
  name?: string;
  totalDistanceMeters?: number | null;
  estimatedSavingsWon?: number | null;
  score?: Route['score'];
  routeType?: Route['routeType'];
  congestionLevel?: CongestionLevel | null;
  stops?: RouteStopWithPlace[];
};

export type RouteMetrics = {
  transportType: string;
  totalCost: number;
  totalTimeMinutes: number;
  totalTimeDisplay: string;
  metaCost: {
    transportCost: number;
    placeCost: number;
  };
  metaTime: {
    pureTravelTime: number;
    stayTime: number;
  };
};

export class MetaCostDto {
  @ApiProperty({
    description: '대중교통/이동 비용(원)',
    example: 2500,
    type: Number,
  })
  transportCost!: number;

  @ApiProperty({
    description: '장소 예상 지출 비용(원)',
    example: 39500,
    type: Number,
  })
  placeCost!: number;
}

export class MetaTimeDto {
  @ApiProperty({ description: '순수 이동 시간(분)', example: 45, type: Number })
  pureTravelTime!: number;

  @ApiProperty({
    description: '장소 체류 시간(분)',
    example: 135,
    type: Number,
  })
  stayTime!: number;
}

export function buildRouteMetrics(stops: RouteStopWithPlace[]): RouteMetrics {
  const transportType = stops.some((stop) => stop.transitType)
    ? Array.from(
        new Set(stops.map((stop) => stop.transitType).filter(Boolean)),
      ).join(' + ')
    : 'WALKING';

  const transportCost = stops.reduce(
    (acc, stop) => acc + (stop.fareWon ?? 0),
    0,
  );
  const placeCost = stops.reduce(
    (acc, stop) => acc + (stop.estimatedPriceWon ?? 0),
    0,
  );
  const pureTravelTime = stops.reduce(
    (acc, stop) => acc + (stop.travelMinutesFromPrev ?? 0),
    0,
  );
  const stayTime = stops.reduce(
    (acc, stop) => acc + (stop.stayMinutes ?? 0),
    0,
  );

  const totalTimeMinutes = pureTravelTime + stayTime;
  const hours = Math.floor(totalTimeMinutes / 60);
  const minutes = totalTimeMinutes % 60;

  return {
    transportType,
    totalCost: transportCost + placeCost,
    totalTimeMinutes,
    totalTimeDisplay: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`,
    metaCost: { transportCost, placeCost },
    metaTime: { pureTravelTime, stayTime },
  };
}

export class PathCoordinateDto {
  @ApiProperty({ description: '위도', example: 35.1587, type: Number })
  latitude!: number;

  @ApiProperty({ description: '경도', example: 129.1604, type: Number })
  longitude!: number;
}

export class RouteStopResponseDto {
  @ApiProperty({
    description: '경유지 순서 (0부터 시작하는 연속 정수)',
    example: 0,
    type: Number,
  })
  sequence!: number;

  @ApiProperty({ description: '여행 일차 번호', example: 1, type: Number })
  dayNumber!: number;

  @ApiProperty({
    description: '장소 고유 ID',
    example: 'place_001',
    nullable: true,
    type: String,
  })
  placeId!: string | null;

  @ApiProperty({
    description: '장소 이름',
    example: '해운대 해수욕장',
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
    description: '다음 경유지까지 이동 수단',
    enum: TransitType,
    example: 'BUS',
    nullable: true,
  })
  nextTransportType!: TransitType | null;

  @ApiProperty({
    description: '다음 경유지까지 예상 이동 시간(분)',
    example: 15,
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
    description:
      '이전 경유지부터 현재 경유지까지의 실제 도로 굴곡 좌표 배열 (카카오맵 Polyline 렌더링용, 첫 경유지는 빈 배열)',
    type: [PathCoordinateDto],
    example: [
      { latitude: 35.1587, longitude: 129.1604 },
      { latitude: 35.159, longitude: 129.161 },
    ],
  })
  pathCoordinates: PathCoordinateDto[] = [];

  static from(stop: RouteStopWithPlace): RouteStopResponseDto {
    const dto = new RouteStopResponseDto();

    const seq = stop.orderIndex ?? 0;
    dto.sequence = seq;
    if (
      typeof stop.dayNumber === 'number' &&
      Number.isInteger(stop.dayNumber) &&
      stop.dayNumber > 0
    ) {
      dto.dayNumber = stop.dayNumber;
    } else {
      dto.dayNumber = 1;
    }

    dto.placeId =
      stop.placeId ?? (stop.place as { id?: string } | null)?.id ?? null;
    dto.placeName = stop.place?.name ?? '';
    dto.category = (stop.place?.category as PlaceCategory) ?? null;

    dto.openTime = stop.place?.openTime ?? null;
    dto.closeTime = stop.place?.closeTime ?? null;
    dto.latitude =
      stop.place?.latitude != null ? Number(stop.place.latitude) : null;
    dto.longitude =
      stop.place?.longitude != null ? Number(stop.place.longitude) : null;
    dto.nextTransportType = stop.transitType ?? null;
    dto.nextTravelTimeMinutes = stop.travelMinutesFromPrev ?? null;
    dto.stayMinutes = stop.stayMinutes ?? null;

    const transitDetailsObj = stop.transitDetails as {
      pathCoordinates?: PathCoordinateDto[];
    } | null;

    if (
      transitDetailsObj &&
      typeof transitDetailsObj === 'object' &&
      Array.isArray(transitDetailsObj.pathCoordinates)
    ) {
      dto.pathCoordinates = transitDetailsObj.pathCoordinates;
    } else {
      dto.pathCoordinates = [];
    }

    return dto;
  }
}

export class RecommendedRouteDetailResponseDto {
  @ApiProperty({
    description: '추천 루트 ID',
    example: 'route_001',
    type: String,
  })
  routeId!: string;

  @ApiProperty({
    description: '추천 루트 이름',
    example: '부산 바다 감성 코스',
    type: String,
  })
  routeName!: string;

  @ApiProperty({ description: '경유지 수', example: 4, type: Number })
  stopCount!: number;

  @ApiProperty({ description: '총 이동 거리(km)', example: 8.5, type: Number })
  totalDistanceKm!: number;

  @ApiProperty({
    description: '대표 이동 수단',
    example: 'WALKING + BUS',
    type: String,
  })
  transportType!: string;

  @ApiProperty({
    description: '예상 혼잡도',
    enum: CongestionLevel,
    example: 'MEDIUM',
  })
  congestionLevel!: CongestionLevel;

  @ApiProperty({
    description:
      '절약 금액(원) — savedCost 호환 필드 (estimatedSavingsWon과 동일한 값)',
    example: 15000,
    type: Number,
  })
  savedCost!: number;

  @ApiProperty({
    description: '예상 절약 금액(원)',
    example: 15000,
    type: Number,
  })
  estimatedSavingsWon!: number;

  @ApiProperty({ description: '추천 점수', example: 87.5, type: Number })
  recommendScore!: number;

  @ApiProperty({ description: '추천 루트 여부', example: true, type: Boolean })
  isRecommended!: boolean;

  @ApiProperty({
    description: '사용자 저장 여부',
    example: false,
    type: Boolean,
  })
  isSaved!: boolean;

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
    description: '예상 총 소요 시간 표시값',
    example: '3h 0m',
    type: String,
  })
  totalTimeDisplay!: string;

  @ApiProperty({
    description: '비용 메타 정보',
    type: MetaCostDto,
  })
  metaCost!: MetaCostDto;

  @ApiProperty({
    description: '시간 메타 정보',
    type: MetaTimeDto,
  })
  metaTime!: MetaTimeDto;

  @ApiProperty({
    description: '경유지 상세 목록',
    type: [RouteStopResponseDto],
  })
  stops!: RouteStopResponseDto[];

  static from(route: RouteWithStops): RecommendedRouteDetailResponseDto {
    const dto = new RecommendedRouteDetailResponseDto();
    const safeStops = Array.isArray(route.stops) ? route.stops : [];

    dto.routeId = route.id ?? '';
    dto.routeName = route.name ?? '';
    dto.stopCount = safeStops.length;

    const totalDistanceMeters =
      typeof route.totalDistanceMeters === 'number'
        ? route.totalDistanceMeters
        : 0;
    dto.totalDistanceKm = Number((totalDistanceMeters / 1000).toFixed(1));

    dto.congestionLevel = route.congestionLevel ?? CongestionLevel.MEDIUM;
    dto.savedCost = route.estimatedSavingsWon ?? 0;
    dto.estimatedSavingsWon = route.estimatedSavingsWon ?? 0;
    const recommendScore = route.score != null ? Number(route.score) : 0;
    dto.recommendScore = Number.isFinite(recommendScore) ? recommendScore : 0;
    dto.isRecommended = route.routeType === 'RECOMMENDED';
    dto.isSaved = false;

    const metrics = buildRouteMetrics(safeStops);
    dto.transportType = metrics.transportType;
    dto.totalCost = metrics.totalCost;
    dto.totalTimeMinutes = metrics.totalTimeMinutes;
    dto.totalTimeDisplay = metrics.totalTimeDisplay;
    dto.metaCost = metrics.metaCost;
    dto.metaTime = metrics.metaTime;
    dto.stops = safeStops.map((stop) => RouteStopResponseDto.from(stop));

    return dto;
  }
}
