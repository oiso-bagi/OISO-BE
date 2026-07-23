import { TransitType } from '@prisma/client';
import {
  buildRouteMetrics,
  RouteWithStops,
} from './recommended-route-detail-response.dto';

const RECOMMENDED_SCORE_THRESHOLD = 4.5;

export class RecommendedRouteListResponseDto {
  id: string;
  name: string;
  stopCount: number;
  totalDistanceMeters: number;
  transitTypes: TransitType[];
  totalCost: number;
  totalTimeMinutes: number;
  estimatedSavingsWon: number;
  score: number;
  isRecommended: boolean;

  static from(route: RouteWithStops): RecommendedRouteListResponseDto {
    const dto = new RecommendedRouteListResponseDto();
    const safeStops = Array.isArray(route.stops) ? route.stops : [];

    dto.id = route.id ?? '';
    dto.name = route.name ?? '';
    dto.stopCount = safeStops.length;
    dto.totalDistanceMeters = route.totalDistanceMeters ?? 0;
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
    const score = route.score != null ? Number(route.score) : 0;
    dto.score = Number.isFinite(score) ? score : 0;
    dto.isRecommended =
      route.routeType === 'RECOMMENDED' ||
      dto.score >= RECOMMENDED_SCORE_THRESHOLD;

    return dto;
  }
}
