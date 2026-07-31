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
  routeId: string;
  routeName: string;
  savedAt: Date;
  isCompleted: boolean;
  stopCount: number;
  totalDistanceKm: number;
  transitTypes: TransitType[];
  totalCost: number;
  totalTimeMinutes: number;
  estimatedSavingsWon: number;

  static from(rawData: SavedRouteRawData): SavedRouteItemDto {
    const dto = new SavedRouteItemDto();
    const route = rawData.route;
    const safeStops = Array.isArray(route.stops) ? route.stops : [];

    dto.routeId = route.id ?? '';
    dto.routeName = route.name ?? '';
    dto.savedAt = rawData.savedAt;

    // tripLogs가 존재하는 경우 첫 번째 로그의 isCompleted 여부를 확인, 없을 경우 기본값 false
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
  savedRouteCount: number;
  totalSavedSavingsWon: number;
  savedRoutes: SavedRouteItemDto[];

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
