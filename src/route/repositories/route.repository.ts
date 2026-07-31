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

  async findDetailWithStopsAndPlace(id: string) {
    return this.prisma.route.findUnique({
      where: { id },
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

  async findRecommendedCandidates(budget: number, themeSlugs?: string[]) {
    const whereCondition: Prisma.RouteWhereInput = {
      routeType: RouteType.RECOMMENDED,
      isPublished: true,
      estimatedCostWon: {
        lte: budget,
      },
    };

    if (themeSlugs && themeSlugs.length > 0) {
      whereCondition.themes = {
        some: {
          theme: {
            slug: {
              in: themeSlugs,
            },
          },
        },
      };
    }

    return this.prisma.route.findMany({
      where: whereCondition,
      take: 50,
      select: {
        id: true,
        name: true,
        routeType: true,
        congestionLevel: true,
        score: true,
        estimatedCostWon: true,
        foodCostWon: true,
        experienceCostWon: true,
        transportCostWon: true,
        totalDifficultyScore: true,
        totalDistanceMeters: true,
        estimatedSavingsWon: true,
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
      },
    });
  }

  findPublishedRecommendedRouteCongestionTargets() {
    return this.prisma.route.findMany({
      where: { routeType: RouteType.RECOMMENDED, isPublished: true },
      select: { id: true, name: true, region: true },
    });
  }

  updateRouteCongestionLevel(id: string, congestionLevel: CongestionLevel) {
    return this.prisma.route.update({
      where: { id },
      data: { congestionLevel },
    });
  }
}
