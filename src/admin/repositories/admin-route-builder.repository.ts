import { Injectable } from '@nestjs/common';
import { PlaceCategory, Prisma, TransitType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AdminRouteDetailResponseDto,
  AdminRouteDetailStopDto,
  CreateAdminRouteDto,
  UpdateAdminRouteDto,
} from '@/admin/dto/admin-route-builder.dto';

const THEME_LABEL_MAP: Record<string, string> = {
  'local-food': '부산 로컬 맛집',
  'emotion-cafe': '감성 카페',
  'beach-tour': '바다 관광',
  'photo-spot': '포토 스팟',
  'traditional-market': '전통시장',
  'nature-walk': '자연 / 산책',
};

type RouteDetailSelectResult = {
  id: string;
  name: string;
  description: string | null;
  isPublished: boolean;
  totalDistanceMeters: number;
  createdAt: Date;
  themes: Array<{
    theme: {
      slug: string;
      name: string;
    } | null;
  }>;
  stops: Array<{
    orderIndex: number;
    stayMinutes: number | null;
    travelMinutesFromPrev: number | null;
    transitType: TransitType | null;
    place: {
      id: string;
      name: string;
      address: string | null;
      category: PlaceCategory | null;
      latitude: Prisma.Decimal | null;
      longitude: Prisma.Decimal | null;
    } | null;
  }>;
};

@Injectable()
export class AdminRouteBuilderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRoute(
    dto: CreateAdminRouteDto,
  ): Promise<AdminRouteDetailResponseDto> {
    const { name, description, themeSlug, durationDays, isPublished, stops } =
      dto;

    const placeIds = Array.from(new Set(stops.map((s) => s.placeId)));
    const places = await this.prisma.place.findMany({
      where: { id: { in: placeIds } },
      select: { id: true, latitude: true, longitude: true },
    });

    const placeMap = new Map(places.map((p) => [p.id, p]));

    let totalDistanceMeters = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const p1 = placeMap.get(stops[i].placeId);
      const p2 = placeMap.get(stops[i + 1].placeId);
      if (p1?.latitude && p1?.longitude && p2?.latitude && p2?.longitude) {
        totalDistanceMeters += this.calculateDistanceMeters(
          Number(p1.latitude),
          Number(p1.longitude),
          Number(p2.latitude),
          Number(p2.longitude),
        );
      }
    }

    const totalDurationMin = stops.reduce(
      (acc, s) =>
        acc + (s.stayTimeMinutes ?? 60) + (s.nextTravelTimeMinutes ?? 0),
      0,
    );

    const targetTheme = await this.prisma.theme.findUnique({
      where: { slug: themeSlug },
      select: { id: true },
    });

    const createdRouteId = await this.prisma.$transaction(async (tx) => {
      const newRoute = await tx.route.create({
        data: {
          name,
          region: '부산광역시',
          summary: description ?? null,
          description: description ?? null,
          routeType: 'RECOMMENDED',
          isPublished,
          totalDistanceMeters,
          estimatedDurationMin: totalDurationMin,
          estimatedCostWon: 0,
        },
      });

      if (targetTheme) {
        await tx.routeTheme.create({
          data: {
            routeId: newRoute.id,
            themeId: targetTheme.id,
          },
        });
      }

      const stopData: Prisma.RouteStopCreateManyInput[] = stops.map((stop) => ({
        routeId: newRoute.id,
        placeId: stop.placeId,
        orderIndex: stop.sequence,
        stayMinutes: stop.stayTimeMinutes,
        travelMinutesFromPrev: stop.nextTravelTimeMinutes ?? null,
        transitType: stop.nextTransportType ?? null,
      }));

      if (stopData.length > 0) {
        await tx.routeStop.createMany({
          data: stopData,
        });
      }

      return newRoute.id;
    });

    const result = await this.findRouteDetail(createdRouteId);
    if (!result) {
      throw new Error('생성된 코스 정보를 조회할 수 없습니다.');
    }
    result.durationDays = durationDays;
    return result;
  }

  async findRouteDetail(
    id: string,
  ): Promise<AdminRouteDetailResponseDto | null> {
    const route: RouteDetailSelectResult | null =
      await this.prisma.route.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          isPublished: true,
          totalDistanceMeters: true,
          createdAt: true,
          themes: {
            take: 1,
            select: {
              theme: {
                select: {
                  slug: true,
                  name: true,
                },
              },
            },
          },
          stops: {
            orderBy: { orderIndex: 'asc' },
            select: {
              orderIndex: true,
              stayMinutes: true,
              travelMinutesFromPrev: true,
              transitType: true,
              place: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  category: true,
                  latitude: true,
                  longitude: true,
                },
              },
            },
          },
        },
      });

    if (!route) {
      return null;
    }

    const firstTheme = route.themes[0]?.theme;
    const themeSlug = firstTheme?.slug ?? 'local-food';
    const themeLabel =
      THEME_LABEL_MAP[themeSlug] ?? firstTheme?.name ?? '추천 테마';

    const stops: AdminRouteDetailStopDto[] = route.stops.map((stop) => ({
      sequence: stop.orderIndex,
      dayNumber: 1,
      placeId: stop.place?.id ?? '',
      placeName: stop.place?.name ?? '',
      address: stop.place?.address ?? '',
      category: stop.place?.category ?? null,
      stayTimeMinutes: stop.stayMinutes ?? 60,
      nextTravelTimeMinutes: stop.travelMinutesFromPrev ?? null,
      nextTransportType: stop.transitType ?? null,
      latitude: stop.place?.latitude ? Number(stop.place.latitude) : 0,
      longitude: stop.place?.longitude ? Number(stop.place.longitude) : 0,
    }));

    return {
      id: route.id,
      name: route.name,
      description: route.description,
      themeSlug,
      themeLabel,
      durationDays: 1,
      stopCount: stops.length,
      totalDistanceKm: Number((route.totalDistanceMeters / 1000).toFixed(1)),
      isPublished: route.isPublished,
      createdAt: route.createdAt,
      stops,
    };
  }

  async updateRoute(
    id: string,
    dto: UpdateAdminRouteDto,
  ): Promise<AdminRouteDetailResponseDto> {
    const { name, description, themeSlug, durationDays, isPublished, stops } =
      dto;

    const placeIds = Array.from(new Set(stops.map((s) => s.placeId)));
    const places = await this.prisma.place.findMany({
      where: { id: { in: placeIds } },
      select: { id: true, latitude: true, longitude: true },
    });
    const placeMap = new Map(places.map((p) => [p.id, p]));

    let totalDistanceMeters = 0;
    for (let i = 0; i < stops.length - 1; i++) {
      const p1 = placeMap.get(stops[i].placeId);
      const p2 = placeMap.get(stops[i + 1].placeId);
      if (p1?.latitude && p1?.longitude && p2?.latitude && p2?.longitude) {
        totalDistanceMeters += this.calculateDistanceMeters(
          Number(p1.latitude),
          Number(p1.longitude),
          Number(p2.latitude),
          Number(p2.longitude),
        );
      }
    }

    const totalDurationMin = stops.reduce(
      (acc, s) =>
        acc + (s.stayTimeMinutes ?? 60) + (s.nextTravelTimeMinutes ?? 0),
      0,
    );

    const targetTheme = await this.prisma.theme.findUnique({
      where: { slug: themeSlug },
      select: { id: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.route.update({
        where: { id },
        data: {
          name,
          summary: description ?? null,
          description: description ?? null,
          isPublished,
          totalDistanceMeters,
          estimatedDurationMin: totalDurationMin,
        },
      });

      await tx.routeTheme.deleteMany({ where: { routeId: id } });
      if (targetTheme) {
        await tx.routeTheme.create({
          data: {
            routeId: id,
            themeId: targetTheme.id,
          },
        });
      }

      await tx.routeStop.deleteMany({ where: { routeId: id } });
      const stopData: Prisma.RouteStopCreateManyInput[] = stops.map((stop) => ({
        routeId: id,
        placeId: stop.placeId,
        orderIndex: stop.sequence,
        stayMinutes: stop.stayTimeMinutes,
        travelMinutesFromPrev: stop.nextTravelTimeMinutes ?? null,
        transitType: stop.nextTransportType ?? null,
      }));

      if (stopData.length > 0) {
        await tx.routeStop.createMany({
          data: stopData,
        });
      }
    });

    const result = await this.findRouteDetail(id);
    if (!result) {
      throw new Error('수정된 코스 정보를 조회할 수 없습니다.');
    }
    result.durationDays = durationDays;
    return result;
  }

  private calculateDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371e3;
    const rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad;
    const dLon = (lon2 - lon1) * rad;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * rad) *
        Math.cos(lat2 * rad) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }
}
