import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PlaceCategory, Prisma, TransitType } from '@prisma/client';
import { THEME_LABEL_MAP } from '@/admin/constants/admin-theme.constant';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AdminRouteDetailResponseDto,
  AdminRouteDetailStopDto,
  CreateAdminRouteDto,
  UpdateAdminRouteDto,
} from '@/admin/dto/admin-route-builder.dto';

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
    const { name, description, themeSlug, isPublished, stops } = dto;

    const targetTheme = await this.prisma.theme.findUnique({
      where: { slug: themeSlug },
      select: { id: true },
    });
    if (!targetTheme) {
      throw new BadRequestException(
        `유효하지 않은 테마 슬러그입니다: ${themeSlug}`,
      );
    }

    const { totalDistanceMeters, totalDurationMin, stopData } =
      await this.buildRouteAggregates(stops);

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

      await tx.routeTheme.create({
        data: {
          routeId: newRoute.id,
          themeId: targetTheme.id,
        },
      });

      if (stopData.length > 0) {
        await tx.routeStop.createMany({
          data: stopData.map((s) => ({ ...s, routeId: newRoute.id })),
        });
      }

      return newRoute.id;
    });

    const result = await this.findRouteDetail(createdRouteId);
    if (!result) {
      throw new InternalServerErrorException(
        '생성된 코스 정보를 조회할 수 없습니다.',
      );
    }
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
      dayNumber: 1, // Route는 1일 단위 모듈로 저장됨. 일차 정보는 조합 시점에서 부여됨
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
      durationDays: 1, // Route는 1일 단위 모듈. N일 코스는 N개를 조합하여 연결
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
    const { name, description, themeSlug, isPublished, stops } = dto;

    const targetTheme = await this.prisma.theme.findUnique({
      where: { slug: themeSlug },
      select: { id: true },
    });
    if (!targetTheme) {
      throw new BadRequestException(
        `유효하지 않은 테마 슬러그입니다: ${themeSlug}`,
      );
    }

    const { totalDistanceMeters, totalDurationMin, stopData } =
      await this.buildRouteAggregates(stops);

    try {
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
        await tx.routeTheme.create({
          data: {
            routeId: id,
            themeId: targetTheme.id,
          },
        });

        await tx.routeStop.deleteMany({ where: { routeId: id } });
        if (stopData.length > 0) {
          await tx.routeStop.createMany({
            data: stopData.map((s) => ({ ...s, routeId: id })),
          });
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('해당 추천 코스를 찾을 수 없습니다.');
      }
      throw error;
    }

    const result = await this.findRouteDetail(id);
    if (!result) {
      throw new InternalServerErrorException(
        '수정된 코스 정보를 조회할 수 없습니다.',
      );
    }
    return result;
  }

  private async buildRouteAggregates(stops: CreateAdminRouteDto['stops']) {
    const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence);

    const placeIds = Array.from(new Set(sortedStops.map((s) => s.placeId)));
    const places = await this.prisma.place.findMany({
      where: { id: { in: placeIds } },
      select: { id: true, latitude: true, longitude: true },
    });
    const placeMap = new Map(places.map((p) => [p.id, p]));

    let totalDistanceMeters = 0;
    for (let i = 0; i < sortedStops.length - 1; i++) {
      const s1 = sortedStops[i];
      const s2 = sortedStops[i + 1];

      const p1 = placeMap.get(s1.placeId);
      const p2 = placeMap.get(s2.placeId);
      if (p1?.latitude && p1?.longitude && p2?.latitude && p2?.longitude) {
        totalDistanceMeters += this.calculateDistanceMeters(
          Number(p1.latitude),
          Number(p1.longitude),
          Number(p2.latitude),
          Number(p2.longitude),
        );
      }
    }

    const totalDurationMin = sortedStops.reduce(
      (acc, s) =>
        acc + (s.stayTimeMinutes ?? 60) + (s.nextTravelTimeMinutes ?? 0),
      0,
    );

    const stopData = sortedStops.map((stop) => ({
      placeId: stop.placeId,
      orderIndex: stop.sequence,
      stayMinutes: stop.stayTimeMinutes,
      travelMinutesFromPrev: stop.nextTravelTimeMinutes ?? null,
      transitType: stop.nextTransportType ?? null,
    }));

    return {
      totalDistanceMeters,
      totalDurationMin,
      stopData,
    };
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
