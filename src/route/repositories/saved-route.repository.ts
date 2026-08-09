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

  async findRouteById(routeId: string) {
    return this.prisma.route.findUnique({
      where: { id: routeId },
      select: { id: true },
    });
  }

  async findSavedRoute(userId: string, routeId: string) {
    return this.prisma.savedRoute.findUnique({
      where: {
        userId_routeId: {
          userId,
          routeId,
        },
      },
      select: {
        userId: true,
        routeId: true,
      },
    });
  }

  async createSavedRoute(userId: string, routeId: string) {
    try {
      return await this.prisma.savedRoute.create({
        data: {
          userId,
          routeId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { userId, routeId };
      }
      throw error;
    }
  }

  async deleteSavedRoute(userId: string, routeId: string) {
    return this.prisma.savedRoute.delete({
      where: {
        userId_routeId: {
          userId,
          routeId,
        },
      },
    });
  }

  async findTripByUserIdAndRouteId(userId: string, routeId: string) {
    return this.prisma.routeTrip.findFirst({
      where: {
        userId,
        routeId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async upsertRouteTripCompletion(
    userId: string,
    routeId: string,
    isCompleted: boolean,
    actualCostWon?: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existingTrip = await tx.routeTrip.findFirst({
        where: {
          userId,
          routeId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (existingTrip) {
        return tx.routeTrip.update({
          where: { id: existingTrip.id },
          data: {
            isCompleted,
            ...(actualCostWon !== undefined && { actualCostWon }),
          },
        });
      }

      return tx.routeTrip.create({
        data: {
          userId,
          routeId,
          isCompleted,
          startedAt: new Date(),
          ...(actualCostWon !== undefined && { actualCostWon }),
        },
      });
    });
  }
}
