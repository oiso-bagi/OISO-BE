import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

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

const getSavedRouteDetailSelect = (userId: string) =>
  Prisma.validator<Prisma.SavedRouteSelect>()({
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
          where: { userId },
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
  constructor(private readonly prisma: PrismaService) {}

  async findListByUserId(userId: string) {
    return this.prisma.savedRoute.findMany({
      where: { userId },
      orderBy: {
        savedAt: 'desc',
      },
      select: savedRouteListSelect,
    });
  }

  async findDetailByRouteId(routeId: string, userId: string) {
    return this.prisma.savedRoute.findFirst({
      where: {
        routeId,
        userId,
      },
      select: getSavedRouteDetailSelect(userId),
    });
  }
}
