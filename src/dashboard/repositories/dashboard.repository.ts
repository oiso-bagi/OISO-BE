import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const savingsDashboardTripSelect = Prisma.validator<Prisma.RouteTripSelect>()({
  id: true,
  startedAt: true,
  route: {
    select: {
      id: true,
      name: true,
      estimatedSavingsWon: true,
      localContributionScore: true,
      stops: {
        select: {
          savingsWon: true,
          fareWon: true,
          place: {
            select: {
              category: true,
              districtType: true,
            },
          },
        },
      },
    },
  },
});

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCompletedSavingsTripsByUserId(userId: string) {
    return this.prisma.routeTrip.findMany({
      where: {
        userId,
        isCompleted: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
      select: savingsDashboardTripSelect,
    });
  }
}
