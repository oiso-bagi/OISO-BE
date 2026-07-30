import { DistrictType, PlaceCategory } from '@prisma/client';

const FOOD_CATEGORIES = new Set<PlaceCategory>([
  PlaceCategory.FOOD,
  PlaceCategory.CAFE,
]);
const EXPERIENCE_CATEGORIES = new Set<PlaceCategory>([
  PlaceCategory.EXPERIENCE,
  PlaceCategory.CULTURE,
  PlaceCategory.NATURE,
  PlaceCategory.MARKET,
  PlaceCategory.VIEWPOINT,
  PlaceCategory.ETC,
]);

export type SavingsDashboardTripRawData = {
  id: string;
  startedAt: Date;
  route: {
    id: string;
    name: string;
    estimatedSavingsWon: number | null;
    localContributionScore: number | null;
    stops: {
      savingsWon: number | null;
      fareWon: number | null;
      place: {
        category: PlaceCategory;
        districtType: DistrictType;
      } | null;
    }[];
  };
};

export class SavingsCategoryDto {
  label: string;
  amountWon: number;

  static of(label: string, amountWon: number): SavingsCategoryDto {
    const dto = new SavingsCategoryDto();
    dto.label = label;
    dto.amountWon = amountWon;

    return dto;
  }
}

export class LocalContributionDto {
  scorePercent: number;
  label: string;
  message: string;

  static from(scorePercent: number): LocalContributionDto {
    const dto = new LocalContributionDto();
    dto.scorePercent = Math.max(0, Math.min(100, scorePercent));
    dto.label = '외곽·원도심 상권 방문';
    dto.message = '관광 수요 분산에 기여하고 있어요';

    return dto;
  }
}

export class SavingsHistoryDto {
  routeId: string;
  routeName: string;
  trippedAt: Date;
  savedAmountWon: number;

  static from(trip: SavingsDashboardTripRawData): SavingsHistoryDto {
    const dto = new SavingsHistoryDto();
    dto.routeId = trip.route.id;
    dto.routeName = trip.route.name;
    dto.trippedAt = trip.startedAt;
    dto.savedAmountWon = getTripSavingsWon(trip);

    return dto;
  }
}

export class SavingsDashboardResponseDto {
  totalSavingsWon: number;
  tripCount: number;
  averageSavingsWon: number;
  savingsByCategory: SavingsCategoryDto[];
  localContribution: LocalContributionDto;
  histories: SavingsHistoryDto[];

  static from(
    rawTrips: SavingsDashboardTripRawData[],
  ): SavingsDashboardResponseDto {
    const dto = new SavingsDashboardResponseDto();
    const trips = Array.isArray(rawTrips) ? rawTrips : [];

    dto.tripCount = trips.length;
    dto.totalSavingsWon = trips.reduce(
      (sum, trip) => sum + getTripSavingsWon(trip),
      0,
    );
    dto.averageSavingsWon =
      dto.tripCount > 0 ? Math.round(dto.totalSavingsWon / dto.tripCount) : 0;
    dto.savingsByCategory = buildSavingsByCategory(trips);
    dto.localContribution = LocalContributionDto.from(
      buildLocalContributionScore(trips),
    );
    dto.histories = trips.slice(0, 3).map((trip) => SavingsHistoryDto.from(trip));

    return dto;
  }
}

function getTripSavingsWon(trip: SavingsDashboardTripRawData): number {
  return trip.route.estimatedSavingsWon ?? 0;
}

function buildSavingsByCategory(
  trips: SavingsDashboardTripRawData[],
): SavingsCategoryDto[] {
  let foodSavingsWon = 0;
  let transportSavingsWon = 0;
  let experienceSavingsWon = 0;

  trips.forEach((trip) => {
    trip.route.stops.forEach((stop) => {
      const category = stop.place?.category;

      if (category && FOOD_CATEGORIES.has(category)) {
        foodSavingsWon += stop.savingsWon ?? 0;
        transportSavingsWon += stop.fareWon ?? 0;
        return;
      }

      if (category && EXPERIENCE_CATEGORIES.has(category)) {
        experienceSavingsWon += stop.savingsWon ?? 0;
      }

      transportSavingsWon += stop.fareWon ?? 0;
    });
  });

  return [
    SavingsCategoryDto.of('식비', foodSavingsWon),
    SavingsCategoryDto.of('교통비', transportSavingsWon),
    SavingsCategoryDto.of('체험비', experienceSavingsWon),
  ];
}

function buildLocalContributionScore(
  trips: SavingsDashboardTripRawData[],
): number {
  if (trips.length === 0) {
    return 0;
  }

  const totalScore = trips.reduce(
    (sum, trip) => sum + (trip.route.localContributionScore ?? 0),
    0,
  );

  return Math.round(totalScore / trips.length);
}
