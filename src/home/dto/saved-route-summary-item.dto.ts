export class SavedRouteSummaryItemDto {
  id!: string;
  routeId!: string;
  name!: string;
  savedAt!: Date;
  savingsWon!: number;
  totalDistanceKm!: number;

  static from(savedRoute: {
    userId: string;
    routeId: string;
    savedAt: Date;
    route: {
      id: string;
      name: string;
      estimatedSavingsWon?: number | null;
      totalDistanceMeters?: number | null;
    };
  }): SavedRouteSummaryItemDto {
    const dto = new SavedRouteSummaryItemDto();
    dto.id = `${savedRoute.userId}_${savedRoute.routeId}`;
    dto.routeId = savedRoute.route.id;
    dto.name = savedRoute.route.name;
    dto.savedAt = savedRoute.savedAt;
    dto.savingsWon = savedRoute.route.estimatedSavingsWon ?? 0;

    const distanceMeters = savedRoute.route.totalDistanceMeters ?? 0;
    dto.totalDistanceKm = Math.round((distanceMeters / 1000) * 10) / 10;

    return dto;
  }
}
