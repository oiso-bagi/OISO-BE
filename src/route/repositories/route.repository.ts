import { Injectable } from '@nestjs/common';
import { CongestionLevel, Prisma, RouteType } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const routeWithStopsAndPlaceSelect = Prisma.validator<Prisma.RouteSelect>()({
  id: true,
  name: true,
  totalDistanceMeters: true,
  estimatedSavingsWon: true,
  score: true,
  routeType: true,
  congestionLevel: true,
  stops: {
    orderBy: {
      orderIndex: 'asc',
    },
    select: {
      orderIndex: true,
      transitType: true,
      travelMinutesFromPrev: true,
      stayMinutes: true,
      fareWon: true,
      estimatedPriceWon: true,
      place: {
        select: {
          name: true,
          category: true,
          openTime: true,
          closeTime: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  },
});

const routeListSelect = Prisma.validator<Prisma.RouteSelect>()({
  id: true,
  name: true,
  totalDistanceMeters: true,
  estimatedSavingsWon: true,
  score: true,
  routeType: true,
  congestionLevel: true,
  stops: {
    orderBy: {
      orderIndex: 'asc',
    },
    select: {
      orderIndex: true,
      transitType: true,
      travelMinutesFromPrev: true,
      stayMinutes: true,
      fareWon: true,
      estimatedPriceWon: true,
      place: {
        select: {
          id: true,
          name: true,
          category: true,
          latitude: true,
          longitude: true,
          openTime: true,
          closeTime: true,
        },
      },
    },
  },
});

@Injectable()
export class RouteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findDetailWithStopsAndPlace(id: string) {
    return this.prisma.route.findUnique({
      where: { id },
      select: routeWithStopsAndPlaceSelect,
    });
  }

  async findDetailsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    return this.prisma.route.findMany({
      where: { id: { in: ids } },
      select: routeWithStopsAndPlaceSelect,
    });
  }

  async findListWithStops() {
    return this.prisma.route.findMany({
      where: {
        routeType: RouteType.RECOMMENDED,
        isPublished: true,
      },
      select: routeListSelect,
    });
  }

  findPublishedRecommendedRouteCongestionTargets() {
    return this.prisma.route.findMany({
      where: { routeType: RouteType.RECOMMENDED, isPublished: true },
      select: { id: true, region: true },
    });
  }

  updateRouteCongestionLevel(id: string, congestionLevel: CongestionLevel) {
    return this.prisma.route.update({
      where: { id },
      data: { congestionLevel },
    });
  }
}
