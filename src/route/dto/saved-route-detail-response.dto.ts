import { CongestionLevel, TransitType } from '@prisma/client';
import {
  buildRouteMetrics,
  RouteStopWithPlace,
  RouteWithStops,
} from './recommended-route-detail-response.dto';

export type SavedRouteDetailRawData = {
  savedAt: Date;
  route: RouteWithStops & {
    tripLogs?: { isCompleted: boolean }[];
  };
};

export class SavedRouteStopDetailDto {
  sequence: number;
  placeName: string;
  category: string;
  openTime: string | null;
  closeTime: string | null;
  nextTransportType: TransitType | null;
  nextTravelTimeMinutes: number | null;
  latitude: number | null;
  longitude: number | null;

  static from(stop: RouteStopWithPlace): SavedRouteStopDetailDto {
    const dto = new SavedRouteStopDetailDto();

    dto.sequence = stop.orderIndex ?? 0;
    dto.placeName = stop.place?.name ?? '';
    dto.category = stop.place?.category ?? '';
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
  routeId: string;
  routeName: string;
  savedAt: Date;
  isCompleted: boolean;
  stopCount: number;
  totalDistanceKm: number;
  transportType: string;
  congestionLevel: CongestionLevel;
  savedCost: number;
  recommendScore: number;
  isRecommended: boolean;
  isSaved: boolean;

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

  estimatedSavingsWon: number;
  stops: SavedRouteStopDetailDto[];

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
    dto.isRecommended = route.routeType === 'RECOMMENDED';
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
