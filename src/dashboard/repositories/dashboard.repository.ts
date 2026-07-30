import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  SavingsDashboardCategoryRawData,
  SavingsDashboardSummaryRawData,
} from '@/dashboard/dto/savings-dashboard-response.dto';

const savingsDashboardHistorySelect = Prisma.validator<Prisma.RouteTripSelect>()({
  id: true,
  startedAt: true,
  route: {
    select: {
      id: true,
      name: true,
      estimatedSavingsWon: true,
    },
  },
});

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSavingsSummaryByUserId(
    userId: string,
  ): Promise<SavingsDashboardSummaryRawData> {
    const rows = await this.prisma.$queryRaw<SavingsDashboardSummaryRawData[]>`
      SELECT
        COUNT(*)::int AS "tripCount",
        COALESCE(SUM(route."estimatedSavingsWon"), 0)::int AS "totalSavingsWon",
        COALESCE(ROUND(AVG(route."localContributionScore")), 0)::int AS "localContributionScore"
      FROM "RouteTrip" trip
      INNER JOIN "Route" route ON route."id" = trip."routeId"
      WHERE trip."userId" = ${userId}
        AND trip."isCompleted" = true
    `;

    return (
      rows[0] ?? {
        tripCount: 0,
        totalSavingsWon: 0,
        localContributionScore: 0,
      }
    );
  }

  async findSavingsCategorySummaryByUserId(
    userId: string,
  ): Promise<SavingsDashboardCategoryRawData> {
    const rows = await this.prisma.$queryRaw<SavingsDashboardCategoryRawData[]>`
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN place."category" IN ('FOOD', 'CAFE')
                THEN stop."savingsWon"
              ELSE 0
            END
          ),
          0
        )::int AS "foodSavingsWon",
        COALESCE(SUM(stop."fareWon"), 0)::int AS "transportSavingsWon",
        COALESCE(
          SUM(
            CASE
              WHEN place."category" IN (
                'EXPERIENCE',
                'CULTURE',
                'NATURE',
                'MARKET',
                'VIEWPOINT',
                'ETC'
              )
                THEN stop."savingsWon"
              ELSE 0
            END
          ),
          0
        )::int AS "experienceSavingsWon"
      FROM "RouteTrip" trip
      INNER JOIN "RouteStop" stop ON stop."routeId" = trip."routeId"
      LEFT JOIN "Place" place ON place."id" = stop."placeId"
      WHERE trip."userId" = ${userId}
        AND trip."isCompleted" = true
    `;

    return (
      rows[0] ?? {
        foodSavingsWon: 0,
        transportSavingsWon: 0,
        experienceSavingsWon: 0,
      }
    );
  }

  async findRecentCompletedSavingsTripsByUserId(userId: string) {
    return this.prisma.routeTrip.findMany({
      where: {
        userId,
        isCompleted: true,
      },
      orderBy: {
        startedAt: 'desc',
      },
      take: 3,
      select: savingsDashboardHistorySelect,
    });
  }
}
