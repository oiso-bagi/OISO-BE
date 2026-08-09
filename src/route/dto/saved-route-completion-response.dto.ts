import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface RouteTripEntity {
  id: string;
  userId: string;
  routeId: string;
  actualCostWon?: number | null;
  isCompleted: boolean;
}

export class SavedRouteCompletionResponseDto {
  @ApiProperty({
    description: '보관 처리된 경로 ID',
    example: 'route_001',
    type: String,
  })
  routeId!: string;

  @ApiProperty({
    description: '여행 완료 여부 (ON/OFF)',
    example: true,
    type: Boolean,
  })
  isCompleted!: boolean;

  @ApiPropertyOptional({
    description: '실제 지출 금액 (원화)',
    example: 45000,
    nullable: true,
    type: Number,
  })
  actualCostWon!: number | null;

  static from(trip: RouteTripEntity): SavedRouteCompletionResponseDto {
    const dto = new SavedRouteCompletionResponseDto();
    dto.routeId = trip.routeId;
    dto.isCompleted = trip.isCompleted;
    dto.actualCostWon = trip.actualCostWon ?? null;
    return dto;
  }
}
