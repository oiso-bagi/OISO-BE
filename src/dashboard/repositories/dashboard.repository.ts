import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  SavingsDashboardCategoryRawData,
  SavingsDashboardSummaryRawData,
  SavingsDashboardTripRawData,
} from '@/dashboard/dto/savings-dashboard-response.dto';

const savingsDashboardHistorySelect =
  Prisma.validator<Prisma.RouteTripSelect>()({
    id: true,
    startedAt: true,
    route: {
      select: {
        id: true,
        name: true,
        estimatedSavingsWon: true,
        foodCostWon: true,
        transportCostWon: true,
        experienceCostWon: true,
        stops: {
          select: {
            fareWon: true,
            estimatedPriceWon: true,
            transitDetails: true,
            place: {
              select: {
                category: true,
              },
            },
          },
        },
      },
    },
  });

const DEFAULT_DAILY_BUDGET_WON = 60000;
const DEFAULT_FOOD_BUDGET_RATIO = 0.35;
const DEFAULT_TRANSPORT_BUDGET_RATIO = 0.4;
const DEFAULT_EXPERIENCE_BUDGET_RATIO = 0.25;

@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSavingsSummaryByUserId(
    userId: string,
  ): Promise<SavingsDashboardSummaryRawData> {
    const rows = await this.prisma.$queryRaw<SavingsDashboardSummaryRawData[]>`
      WITH completed_trips AS (
        SELECT
          trip."id" AS "tripId",
          CASE
            WHEN COALESCE(route."foodCostWon", 0)
              + COALESCE(route."transportCostWon", 0)
              + COALESCE(route."experienceCostWon", 0) > 0
              THEN COALESCE(route."foodCostWon", 0)
            ELSE COALESCE(
              SUM(
                CASE
                  WHEN place."category" IN ('FOOD', 'CAFE')
                    THEN stop."estimatedPriceWon"
                  ELSE 0
                END
              ),
              0
            )
          END AS "foodCostWon",
          CASE
            WHEN COALESCE(route."foodCostWon", 0)
              + COALESCE(route."transportCostWon", 0)
              + COALESCE(route."experienceCostWon", 0) > 0
              THEN COALESCE(route."transportCostWon", 0)
            ELSE COALESCE(SUM(stop."fareWon"), 0)
          END AS "transportCostWon",
          CASE
            WHEN COALESCE(route."foodCostWon", 0)
              + COALESCE(route."transportCostWon", 0)
              + COALESCE(route."experienceCostWon", 0) > 0
              THEN COALESCE(route."experienceCostWon", 0)
            ELSE COALESCE(
              SUM(
                CASE
                  WHEN place."category" NOT IN ('FOOD', 'CAFE')
                    OR place."category" IS NULL
                    THEN stop."estimatedPriceWon"
                  ELSE 0
                END
              ),
              0
            )
          END AS "experienceCostWon",
          COALESCE(route."localContributionScore", 0) AS "localContributionScore",
          GREATEST(
            1,
            COALESCE(
              MAX(
                CASE
                  WHEN stop."transitDetails"->>'dayNumber' ~ '^[0-9]+$'
                    THEN (stop."transitDetails"->>'dayNumber')::int
                  ELSE 1
                END
              ),
              1
            )
          ) AS "dayCount"
        FROM "RouteTrip" trip
        INNER JOIN "Route" route ON route."id" = trip."routeId"
        LEFT JOIN "RouteStop" stop ON stop."routeId" = route."id"
        LEFT JOIN "Place" place ON place."id" = stop."placeId"
        WHERE trip."userId" = ${userId}
          AND trip."isCompleted" = true
        GROUP BY
          trip."id",
          route."foodCostWon",
          route."transportCostWon",
          route."experienceCostWon",
          route."localContributionScore"
      )
      SELECT
        COUNT(*)::int AS "tripCount",
        COALESCE(
          SUM(
            CASE
              WHEN "foodCostWon" + "transportCostWon" + "experienceCostWon" > 0
                THEN GREATEST(
                  0,
                  (${DEFAULT_DAILY_BUDGET_WON} * "dayCount")
                    - ("foodCostWon" + "transportCostWon" + "experienceCostWon")
                )
              ELSE 0
            END
          ),
          0
        )::int AS "totalSavingsWon",
        COALESCE(ROUND(AVG("localContributionScore")), 0)::int AS "localContributionScore"
      FROM completed_trips
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
      WITH completed_trips AS (
        SELECT
          trip."id" AS "tripId",
          CASE
            WHEN COALESCE(route."foodCostWon", 0)
              + COALESCE(route."transportCostWon", 0)
              + COALESCE(route."experienceCostWon", 0) > 0
              THEN COALESCE(route."foodCostWon", 0)
            ELSE COALESCE(
              SUM(
                CASE
                  WHEN place."category" IN ('FOOD', 'CAFE')
                    THEN stop."estimatedPriceWon"
                  ELSE 0
                END
              ),
              0
            )
          END AS "foodCostWon",
          CASE
            WHEN COALESCE(route."foodCostWon", 0)
              + COALESCE(route."transportCostWon", 0)
              + COALESCE(route."experienceCostWon", 0) > 0
              THEN COALESCE(route."transportCostWon", 0)
            ELSE COALESCE(SUM(stop."fareWon"), 0)
          END AS "transportCostWon",
          CASE
            WHEN COALESCE(route."foodCostWon", 0)
              + COALESCE(route."transportCostWon", 0)
              + COALESCE(route."experienceCostWon", 0) > 0
              THEN COALESCE(route."experienceCostWon", 0)
            ELSE COALESCE(
              SUM(
                CASE
                  WHEN place."category" NOT IN ('FOOD', 'CAFE')
                    OR place."category" IS NULL
                    THEN stop."estimatedPriceWon"
                  ELSE 0
                END
              ),
              0
            )
          END AS "experienceCostWon",
          GREATEST(
            1,
            COALESCE(
              MAX(
                CASE
                  WHEN stop."transitDetails"->>'dayNumber' ~ '^[0-9]+$'
                    THEN (stop."transitDetails"->>'dayNumber')::int
                  ELSE 1
                END
              ),
              1
            )
          ) AS "dayCount"
        FROM "RouteTrip" trip
        INNER JOIN "Route" route ON route."id" = trip."routeId"
        LEFT JOIN "RouteStop" stop ON stop."routeId" = route."id"
        LEFT JOIN "Place" place ON place."id" = stop."placeId"
        WHERE trip."userId" = ${userId}
          AND trip."isCompleted" = true
        GROUP BY
          trip."id",
          route."foodCostWon",
          route."transportCostWon",
          route."experienceCostWon"
      )
      SELECT
        COALESCE(SUM(ROUND(${DEFAULT_DAILY_BUDGET_WON} * "dayCount" * ${DEFAULT_FOOD_BUDGET_RATIO})::int), 0)::int AS "foodBudgetWon",
        COALESCE(SUM("foodCostWon"), 0)::int AS "foodEstimatedCostWon",
        COALESCE(
          SUM(
            CASE
              WHEN "foodCostWon" > 0
                THEN GREATEST(
                  0,
                  ROUND(${DEFAULT_DAILY_BUDGET_WON} * "dayCount" * ${DEFAULT_FOOD_BUDGET_RATIO})::int
                    - "foodCostWon"
                )
              ELSE 0
            END
          ),
          0
        )::int AS "foodSavingsWon",
        COALESCE(SUM(ROUND(${DEFAULT_DAILY_BUDGET_WON} * "dayCount" * ${DEFAULT_TRANSPORT_BUDGET_RATIO})::int), 0)::int AS "transportBudgetWon",
        COALESCE(SUM("transportCostWon"), 0)::int AS "transportEstimatedCostWon",
        COALESCE(
          SUM(
            CASE
              WHEN "transportCostWon" > 0
                THEN GREATEST(
                  0,
                  ROUND(${DEFAULT_DAILY_BUDGET_WON} * "dayCount" * ${DEFAULT_TRANSPORT_BUDGET_RATIO})::int
                    - "transportCostWon"
                )
              ELSE 0
            END
          ),
          0
        )::int AS "transportSavingsWon",
        COALESCE(SUM(ROUND(${DEFAULT_DAILY_BUDGET_WON} * "dayCount" * ${DEFAULT_EXPERIENCE_BUDGET_RATIO})::int), 0)::int AS "experienceBudgetWon",
        COALESCE(SUM("experienceCostWon"), 0)::int AS "experienceEstimatedCostWon",
        COALESCE(
          SUM(
            CASE
              WHEN "experienceCostWon" > 0
                THEN GREATEST(
                  0,
                  ROUND(${DEFAULT_DAILY_BUDGET_WON} * "dayCount" * ${DEFAULT_EXPERIENCE_BUDGET_RATIO})::int
                    - "experienceCostWon"
                )
              ELSE 0
            END
          ),
          0
        )::int AS "experienceSavingsWon"
      FROM completed_trips
    `;

    return (
      rows[0] ?? {
        foodSavingsWon: 0,
        foodBudgetWon: 0,
        foodEstimatedCostWon: 0,
        transportSavingsWon: 0,
        transportBudgetWon: 0,
        transportEstimatedCostWon: 0,
        experienceSavingsWon: 0,
        experienceBudgetWon: 0,
        experienceEstimatedCostWon: 0,
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

  async findCompletedSavingsTripsByUserId(
    userId: string,
    page: number,
    size: number,
  ): Promise<{
    items: SavingsDashboardTripRawData[];
    totalCount: number;
  }> {
    const where: Prisma.RouteTripWhereInput = {
      userId,
      isCompleted: true,
    };
    const skip = (page - 1) * size;

    const [totalCount, items] = await Promise.all([
      this.prisma.routeTrip.count({ where }),
      this.prisma.routeTrip.findMany({
        where,
        skip,
        take: size,
        orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
        select: savingsDashboardHistorySelect,
      }),
    ]);

    return { items, totalCount };
  }
}
