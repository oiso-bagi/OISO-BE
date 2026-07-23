import { TransitType, CongestionLevel } from '@prisma/client';
import {
  buildRouteMetrics,
  RouteStopWithPlace,
  RouteWithStops,
} from './recommended-route-detail-response.dto';

export class RouteStopLocationDto {
  sequence: number;
  placeName: string;
  latitude: number | null;
  longitude: number | null;

  static from(stop: RouteStopWithPlace): RouteStopLocationDto {
    const dto = new RouteStopLocationDto();
    dto.sequence = stop.orderIndex ?? 0;
    dto.placeName = stop.place?.name ?? '';
    dto.latitude =
      stop.place?.latitude != null ? Number(stop.place.latitude) : null;
    dto.longitude =
      stop.place?.longitude != null ? Number(stop.place.longitude) : null;
    return dto;
  }
}

export class RecommendedRouteListResponseDto {
  id: string;
  name: string;
  stopCount: number;
  totalDistanceMeters: number;
  totalDistanceKm: number;
  transitTypes: TransitType[];
  totalCost: number;
  totalTimeMinutes: number;
  congestionLevel: CongestionLevel;
  estimatedSavingsWon: number;
  score: number;
  isRecommended: boolean;
  stopLocations: RouteStopLocationDto[];

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
    const score = route.score != null ? Number(route.score) : 0;
    dto.score = Number.isFinite(score) ? score : 0;
    dto.isRecommended = route.routeType === 'RECOMMENDED';

    dto.stopLocations = safeStops.map((stop) =>
      RouteStopLocationDto.from(stop),
    );

    return dto;
  }
}
