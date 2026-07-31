import {
  Route,
  RouteStop,
  Place,
  TransitType,
  CongestionLevel,
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

export class RouteStopResponseDto {
  sequence!: number;
  dayNumber!: number; // 일차 번호 (프론트엔드 지도 색상 분기용: 1일차, 2일차...)
  placeName!: string;
  category!: string;
  openTime!: string | null;
  closeTime!: string | null;
  latitude!: number | null;
  longitude!: number | null;
  nextTransportType!: TransitType | null;
  nextTravelTimeMinutes!: number | null;

  static from(stop: RouteStopWithPlace): RouteStopResponseDto {
    const dto = new RouteStopResponseDto();

    dto.sequence = stop.orderIndex ?? 0;
    // 저장된 양의 정수 dayNumber만 노출하며, 없을 경우 orderIndex 기반 추론 대신 기본 1일차 지정
    if (
      typeof stop.dayNumber === 'number' &&
      Number.isInteger(stop.dayNumber) &&
      stop.dayNumber > 0
    ) {
      dto.dayNumber = stop.dayNumber;
    } else {
      dto.dayNumber = 1;
    }

    dto.placeName = stop.place?.name ?? '';
    dto.category = stop.place?.category ?? '';

    dto.openTime = stop.place?.openTime ?? null;
    dto.closeTime = stop.place?.closeTime ?? null;
    dto.latitude =
      stop.place?.latitude != null ? Number(stop.place.latitude) : null;
    dto.longitude =
      stop.place?.longitude != null ? Number(stop.place.longitude) : null;
    dto.nextTransportType = stop.transitType ?? null;
    dto.nextTravelTimeMinutes = stop.travelMinutesFromPrev ?? null;

    return dto;
  }
}

export class RecommendedRouteDetailResponseDto {
  routeId!: string;
  routeName!: string;
  stopCount!: number;
  totalDistanceKm!: number;
  transportType!: string;
  congestionLevel!: CongestionLevel;
  savedCost!: number;
  recommendScore!: number;
  isRecommended!: boolean;
  isSaved!: boolean;

  totalCost!: number;
  totalTimeMinutes!: number;
  totalTimeDisplay!: string;

  metaCost!: {
    transportCost: number;
    placeCost: number;
  };
  metaTime!: {
    pureTravelTime: number;
    stayTime: number;
  };

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
