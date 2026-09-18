import { Injectable } from '@nestjs/common';
import {
  CongestionLevel,
  PlaceCategory,
  Prisma,
  RouteType,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const routeWithStopsAndPlaceSelect = Prisma.validator<Prisma.RouteSelect>()({
  id: true,
  name: true,
  totalDistanceMeters: true,
  estimatedSavingsWon: true,
  score: true,
  localContributionScore: true,
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
      transitDetails: true,
      place: {
        select: {
          name: true,
          category: true,
          address: true,
          roadAddress: true,
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
      transitDetails: true,
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

  async upsertPlaceFromKto(
    apiSourceId: string,
    data: {
      name: string;
      address: string | null;
      roadAddress: string | null;
      region: string;
      district: string | null;
      category: PlaceCategory;
      latitude: Prisma.Decimal;
      longitude: Prisma.Decimal;
      elevationMeters: number;
      openTime: string | null;
      closeTime: string | null;
      isActive: boolean;
    },
  ) {
    const { isActive, elevationMeters, openTime, closeTime, ...updateData } =
      data;
    return this.prisma.place.upsert({
      where: { apiSourceId },
      update: {
        ...updateData,
        ...(openTime ? { openTime } : {}),
        ...(closeTime ? { closeTime } : {}),
      },
      create: {
        apiSourceId,
        isActive,
        elevationMeters,
        openTime,
        closeTime,
        ...updateData,
      },
    });
  }

  async countPlaces(): Promise<number> {
    return this.prisma.place.count();
  }

  async findPlaceByName(
    name: string,
  ): Promise<{ id: string; name: string } | null> {
    const trimmed = name.trim();
    if (!trimmed) {
      return null;
    }

    // 1. 정확히 일치하는 장소명 우선 탐색
    const exactMatch = await this.prisma.place.findFirst({
      where: {
        name: trimmed,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });
    if (exactMatch) {
      return exactMatch;
    }

    // 2. 장소명 접두 일치 탐색 (모호성 방지를 위해 단일 후보일 때만 매칭)
    const startsWithCandidates = await this.prisma.place.findMany({
      where: {
        name: {
          startsWith: trimmed,
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      take: 2,
    });
    if (startsWithCandidates.length === 1) {
      return startsWithCandidates[0];
    }

    // 3. Fallback: 포함 일치 탐색 (모호성 방지를 위해 단일 후보일 때만 매칭)
    const containsCandidates = await this.prisma.place.findMany({
      where: {
        name: {
          contains: trimmed,
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      take: 2,
    });
    if (containsCandidates.length === 1) {
      return containsCandidates[0];
    }

    return null;
  }

  async updatePlacePremiumIndex(placeId: string, premiumIndex: number) {
    return this.prisma.place.update({
      where: { id: placeId },
      data: {
        premiumIndex: new Prisma.Decimal(premiumIndex),
      },
    });
  }
}
