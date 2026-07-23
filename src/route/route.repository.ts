import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

// Prisma validator Pattern for route detail
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

// Prisma validator Pattern for route list (excludes unused place fields like category, openTime, closeTime)
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
          name: true,
          latitude: true,
          longitude: true,
        },
      },
    },
  },
});

@Injectable()
export class RouteRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 추천 루트의 상세 내역과 함께 엮여있는 경유지 정보(Stops) 및 장소(Place) 정보까지
   * N+1 문제를 방지하며 통째로 조인(include)하여 조회합니다.
   */
  async findDetailWithStopsAndPlace(id: string) {
    return this.prisma.route.findUnique({
      where: { id },
      select: routeWithStopsAndPlaceSelect,
    });
  }

  async findListWithStops() {
    return this.prisma.route.findMany({
      where: {
        routeType: 'RECOMMENDED',
      },
      select: routeListSelect,
    });
  }
}
