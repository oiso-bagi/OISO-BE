import { SavedRouteSummaryItemDto } from '@/home/dto/saved-route-summary-item.dto';

export class HomeSummaryResponseDto {
  totalSavedSavingsWon!: number;
  totalSavedCount!: number;
  savedRoutes!: SavedRouteSummaryItemDto[];

  static from(
    totalSavedSavingsWon: number,
    savedRoutes: SavedRouteSummaryItemDto[],
  ): HomeSummaryResponseDto {
    const dto = new HomeSummaryResponseDto();
    dto.totalSavedSavingsWon = totalSavedSavingsWon;
    dto.totalSavedCount = savedRoutes.length;
    dto.savedRoutes = savedRoutes;
    return dto;
  }
}
