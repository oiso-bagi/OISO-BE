import { ApiProperty } from '@nestjs/swagger';
import { SavedRouteSummaryItemDto } from '@/home/dto/saved-route-summary-item.dto';

export class HomeSummaryResponseDto {
  @ApiProperty({
    description: '저장 루트의 총 예상 절약 금액(원)',
    example: 35000,
    type: Number,
  })
  totalSavedSavingsWon!: number;

  @ApiProperty({ description: '저장 루트 개수', example: 2, type: Number })
  totalSavedCount!: number;

  @ApiProperty({
    description: '최근 저장 루트 요약 목록',
    type: [SavedRouteSummaryItemDto],
  })
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
