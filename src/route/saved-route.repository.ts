import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

const savedRouteListSelect = Prisma.validator<Prisma.SavedRouteSelect>()({
  savedAt: true,
  route: {
    select: {
      id: true,
      name: true,
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
        },
      },
      tripLogs: {
        take: 1,
        select: {
          isCompleted: true,
        },
      },
    },
  },
});

const savedRouteDetailSelect = Prisma.validator<Prisma.SavedRouteSelect>()({
  savedAt: true,
  route: {
    select: {
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
      tripLogs: {
        take: 1,
        select: {
          isCompleted: true,
        },
      },
    },
  },
});

@Injectable()
export class SavedRouteRepository {
  constructor(private readonly prisma: PrismaService) { }

  async findListByUserId(userId?: string) {
    const where: Prisma.SavedRouteWhereInput = userId ? { userId } : {};

    return this.prisma.savedRoute.findMany({
      where,
      orderBy: {
        savedAt: 'desc',
      },
      select: savedRouteListSelect,
    });
  }

  async findDetailByRouteId(routeId: string, userId?: string) {
    const where: Prisma.SavedRouteWhereInput = {
      routeId,
      ...(userId ? { userId } : {}),
    };

    return this.prisma.savedRoute.findFirst({
      where,
      select: savedRouteDetailSelect,
    });
  }
}
