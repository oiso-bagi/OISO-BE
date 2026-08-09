import { ApiProperty } from '@nestjs/swagger';

export class SavedRouteSummaryItemDto {
  @ApiProperty({
    description: '사용자 ID와 루트 ID를 조합한 저장 루트 요약 ID',
    example: 'user-1_route-101',
    type: String,
  })
  id!: string;

  @ApiProperty({
    description: '저장된 루트 ID',
    example: 'route-101',
    type: String,
  })
  routeId!: string;

  @ApiProperty({
    description: '저장된 루트 이름',
    example: '부산 해안 산책 코스',
    type: String,
  })
  name!: string;

  @ApiProperty({
    description: '루트 저장 일시',
    example: '2026-07-30T10:00:00.000Z',
    type: String,
    format: 'date-time',
  })
  savedAt!: Date;

  @ApiProperty({
    description: '해당 루트의 예상 절약 금액(원)',
    example: 15000,
    type: Number,
  })
  savingsWon!: number;

  @ApiProperty({ description: '총 이동 거리(km)', example: 8.5, type: Number })
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
