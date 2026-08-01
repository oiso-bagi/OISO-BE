import { ApiProperty } from '@nestjs/swagger';
import { Place, RouteStop, TransitType } from '@prisma/client';
import { buildRouteMetrics } from '@/route/dto/recommended-route-detail-response.dto';

export type RouteStopMinimal = Partial<RouteStop> & {
  orderIndex?: number | null;
  transitType?: TransitType | null;
  travelMinutesFromPrev?: number | null;
  stayMinutes?: number | null;
  fareWon?: number | null;
  estimatedPriceWon?: number | null;
  place?: Partial<Place> | null;
};

export type SavedRouteRawData = {
  savedAt: Date;
  route: {
    id: string;
    name: string;
    totalDistanceMeters: number | null;
    estimatedSavingsWon: number | null;
    stops: RouteStopMinimal[];
    tripLogs?: { isCompleted: boolean }[];
  };
};

export class SavedRouteItemDto {
  @ApiProperty({ description: '저장 루트 ID', example: 'route_001' })
  routeId!: string;

  @ApiProperty({
    description: '저장 루트 이름',
    example: '부산 바다 감성 코스',
  })
  routeName!: string;

  @ApiProperty({
    description: '저장 일시',
    example: '2026-08-01T00:00:00.000Z',
  })
  savedAt!: Date;

  @ApiProperty({ description: '여행 완료 여부', example: false })
  isCompleted!: boolean;

  @ApiProperty({ description: '경유지 수', example: 4 })
  stopCount!: number;

  @ApiProperty({ description: '총 이동 거리(km)', example: 8.5 })
  totalDistanceKm!: number;

  @ApiProperty({
    description: '루트에서 사용하는 이동 수단 목록',
    enum: TransitType,
    isArray: true,
    example: ['WALKING', 'BUS'],
  })
  transitTypes!: TransitType[];

  @ApiProperty({ description: '예상 총 비용(원)', example: 42000 })
  totalCost!: number;

  @ApiProperty({ description: '예상 총 소요 시간(분)', example: 180 })
  totalTimeMinutes!: number;

  @ApiProperty({ description: '예상 절약 금액(원)', example: 15000 })
  estimatedSavingsWon!: number;

  static from(rawData: SavedRouteRawData): SavedRouteItemDto {
    const dto = new SavedRouteItemDto();
    const route = rawData.route;
    const safeStops = Array.isArray(route.stops) ? route.stops : [];

    dto.routeId = route.id ?? '';
    dto.routeName = route.name ?? '';
    dto.savedAt = rawData.savedAt;

    const tripLog = Array.isArray(route.tripLogs) ? route.tripLogs[0] : null;
    dto.isCompleted = tripLog?.isCompleted ?? false;

    dto.stopCount = safeStops.length;
    const totalDistanceMeters = route.totalDistanceMeters ?? 0;
    dto.totalDistanceKm = Number((totalDistanceMeters / 1000).toFixed(1));

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

    dto.estimatedSavingsWon = route.estimatedSavingsWon ?? 0;

    return dto;
  }
}

export class SavedRouteListResponseDto {
  @ApiProperty({ description: '저장 루트 개수', example: 3 })
  savedRouteCount!: number;

  @ApiProperty({ description: '총 예상 절약 금액(원)', example: 45000 })
  totalSavedSavingsWon!: number;

  @ApiProperty({
    description: '저장 루트 목록',
    type: [SavedRouteItemDto],
  })
  savedRoutes!: SavedRouteItemDto[];

  static from(rawList: SavedRouteRawData[]): SavedRouteListResponseDto {
    const dto = new SavedRouteListResponseDto();
    const safeList = Array.isArray(rawList) ? rawList : [];

    dto.savedRouteCount = safeList.length;
    dto.savedRoutes = safeList.map((item) => SavedRouteItemDto.from(item));

    dto.totalSavedSavingsWon = dto.savedRoutes.reduce(
      (sum, item) => sum + item.estimatedSavingsWon,
      0,
    );

    return dto;
  }
}
