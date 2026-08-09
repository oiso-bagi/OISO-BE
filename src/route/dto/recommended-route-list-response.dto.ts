import { TransitType, CongestionLevel } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { buildRouteMetrics } from '@/route/dto/recommended-route-detail-response.dto';
import type {
  RouteStopWithPlace,
  RouteWithStops,
} from '@/route/dto/recommended-route-detail-response.dto';

export class RouteStopLocationDto {
  @ApiProperty({ description: '경유지 순서', example: 1, type: Number })
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
    dto.latitude =
      stop.place?.latitude != null ? Number(stop.place.latitude) : null;
    dto.longitude =
      stop.place?.longitude != null ? Number(stop.place.longitude) : null;
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

  @ApiProperty({ description: '추천 점수', example: 87.5, type: Number })
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
    const score =
      finalScore != null
        ? Number(finalScore)
        : route.score != null
          ? Number(route.score)
          : 0;
    dto.score = Number.isFinite(score) ? score : 0;
    dto.isRecommended = route.routeType === 'RECOMMENDED';

    dto.stopLocations = safeStops.map((stop) =>
      RouteStopLocationDto.from(stop),
    );

    return dto;
  }
}
