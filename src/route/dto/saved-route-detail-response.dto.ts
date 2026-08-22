import { ApiProperty } from '@nestjs/swagger';
import {
  CongestionLevel,
  PlaceCategory,
  RouteType,
  TransitType,
} from '@prisma/client';
import {
  buildRouteMetrics,
  MetaCostDto,
  MetaTimeDto,
  RouteStopWithPlace,
  RouteWithStops,
} from '@/route/dto/recommended-route-detail-response.dto';

export type SavedRouteDetailRawData = {
  savedAt: Date;
  route: RouteWithStops & {
    tripLogs?: { isCompleted: boolean }[];
  };
};

export class SavedRouteStopDetailDto {
  @ApiProperty({
    description: '경유지 순서 (0부터 시작)',
    example: 0,
    type: Number,
  })
  sequence = 0;

  @ApiProperty({ description: '여행 일차 번호', example: 1, type: Number })
  dayNumber = 1;

  @ApiProperty({
    description: '장소 이름',
    example: '광안리해수욕장',
    type: String,
  })
  placeName = '';

  @ApiProperty({
    description:
      '장소 카테고리 (FOOD: 식당 | CAFE: 카페 | MARKET: 전통시장 | CULTURE: 문화 | NATURE: 자연 | EXPERIENCE: 체험 | VIEWPOINT: 전망대 | ETC: 기타)',
    enum: PlaceCategory,
    example: PlaceCategory.NATURE,
    nullable: true,
  })
  category: PlaceCategory | null = null;

  @ApiProperty({
    description: '장소 영업 시작 시간',
    example: '09:00',
    nullable: true,
    type: String,
  })
  openTime: string | null = null;

  @ApiProperty({
    description: '장소 영업 종료 시간',
    example: '21:00',
    nullable: true,
    type: String,
  })
  closeTime: string | null = null;

  @ApiProperty({
    description: '다음 경유지까지 이동 수단',
    enum: TransitType,
    example: 'BUS',
    nullable: true,
  })
  nextTransportType: TransitType | null = null;

  @ApiProperty({
    description: '다음 경유지까지 예상 이동 시간(분)',
    example: 15,
    nullable: true,
    type: Number,
  })
  nextTravelTimeMinutes: number | null = null;

  @ApiProperty({
    description: '장소 위도',
    example: 35.1532,
    nullable: true,
    type: Number,
  })
  latitude: number | null = null;

  @ApiProperty({
    description: '장소 경도',
    example: 129.1187,
    nullable: true,
    type: Number,
  })
  longitude: number | null = null;

  static from(stop: RouteStopWithPlace): SavedRouteStopDetailDto {
    const dto = new SavedRouteStopDetailDto();

    dto.sequence = stop.orderIndex ?? 0;
    const rawDayNum = stop.dayNumber;
    const jsonDayNum =
      stop.transitDetails &&
      typeof stop.transitDetails === 'object' &&
      'dayNumber' in stop.transitDetails &&
      typeof (stop.transitDetails as { dayNumber?: number }).dayNumber ===
        'number'
        ? (stop.transitDetails as { dayNumber: number }).dayNumber
        : undefined;

    const targetDayNumber = rawDayNum ?? jsonDayNum;

    dto.dayNumber =
      typeof targetDayNumber === 'number' &&
      Number.isInteger(targetDayNumber) &&
      targetDayNumber > 0
        ? targetDayNumber
        : 1;
    dto.placeName = stop.place?.name ?? '';
    dto.category = (stop.place?.category as PlaceCategory) ?? null;
    dto.openTime = stop.place?.openTime ?? null;
    dto.closeTime = stop.place?.closeTime ?? null;
    dto.nextTransportType = stop.transitType ?? null;
    dto.nextTravelTimeMinutes = stop.travelMinutesFromPrev ?? null;
    dto.latitude =
      stop.place?.latitude != null ? Number(stop.place.latitude) : null;
    dto.longitude =
      stop.place?.longitude != null ? Number(stop.place.longitude) : null;

    return dto;
  }
}

export class SavedRouteDetailResponseDto {
  @ApiProperty({
    description: '저장 루트 ID',
    example: 'route_001',
    type: String,
  })
  routeId = '';

  @ApiProperty({
    description: '저장 루트 이름',
    example: '부산 바다 감성 코스',
    type: String,
  })
  routeName = '';

  @ApiProperty({
    description: '저장 일시',
    example: '2026-08-01T00:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  savedAt = new Date(0);

  @ApiProperty({ description: '여행 완료 여부', example: false, type: Boolean })
  isCompleted = false;

  @ApiProperty({ description: '경유지 수', example: 4, type: Number })
  stopCount = 0;

  @ApiProperty({ description: '총 이동 거리(km)', example: 8.5, type: Number })
  totalDistanceKm = 0;

  @ApiProperty({
    description: '대표 이동 수단',
    example: 'WALKING + BUS',
    type: String,
  })
  transportType = '';

  @ApiProperty({
    description: '예상 혼잡도',
    enum: CongestionLevel,
    example: 'MEDIUM',
  })
  congestionLevel: CongestionLevel = CongestionLevel.MEDIUM;

  @ApiProperty({
    description:
      '절약 금액(원) — savedCost 호환 필드 (estimatedSavingsWon과 동일한 값)',
    example: 15000,
    type: Number,
  })
  savedCost = 0;

  @ApiProperty({ description: '추천 점수', example: 87.5, type: Number })
  recommendScore = 0;

  @ApiProperty({ description: '추천 루트 여부', example: true, type: Boolean })
  isRecommended = false;

  @ApiProperty({
    description: '사용자 저장 여부',
    example: true,
    type: Boolean,
  })
  isSaved = false;

  @ApiProperty({
    description: '예상 총 비용(원)',
    example: 42000,
    type: Number,
  })
  totalCost = 0;

  @ApiProperty({
    description: '예상 총 소요 시간(분)',
    example: 180,
    type: Number,
  })
  totalTimeMinutes = 0;

  @ApiProperty({
    description: '예상 총 소요 시간 표시값',
    example: '3h 0m',
    type: String,
  })
  totalTimeDisplay = '';

  @ApiProperty({
    description: '비용 메타 정보',
    type: MetaCostDto,
  })
  metaCost: MetaCostDto = {
    transportCost: 0,
    placeCost: 0,
  };

  @ApiProperty({
    description: '시간 메타 정보',
    type: MetaTimeDto,
  })
  metaTime: MetaTimeDto = {
    pureTravelTime: 0,
    stayTime: 0,
  };

  @ApiProperty({
    description: '예상 절약 금액(원)',
    example: 15000,
    type: Number,
  })
  estimatedSavingsWon = 0;

  @ApiProperty({
    description: '저장 루트 경유지 상세 목록',
    type: [SavedRouteStopDetailDto],
  })
  stops: SavedRouteStopDetailDto[] = [];

  static from(rawData: SavedRouteDetailRawData): SavedRouteDetailResponseDto {
    const dto = new SavedRouteDetailResponseDto();
    const route = rawData.route;
    const safeStops = Array.isArray(route.stops) ? route.stops : [];

    dto.routeId = route.id ?? '';
    dto.routeName = route.name ?? '';
    dto.savedAt = rawData.savedAt;

    const tripLog = Array.isArray(route.tripLogs) ? route.tripLogs[0] : null;
    dto.isCompleted = tripLog?.isCompleted ?? false;

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
    dto.isRecommended = route.routeType === RouteType.RECOMMENDED;
    dto.isSaved = true;

    const metrics = buildRouteMetrics(safeStops);
    dto.transportType = metrics.transportType;
    dto.totalCost = metrics.totalCost;
    dto.totalTimeMinutes = metrics.totalTimeMinutes;
    dto.totalTimeDisplay = metrics.totalTimeDisplay;
    dto.metaCost = metrics.metaCost;
    dto.metaTime = metrics.metaTime;

    dto.stops = safeStops.map((stop) => SavedRouteStopDetailDto.from(stop));

    return dto;
  }
}
