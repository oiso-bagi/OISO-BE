import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class ToggleSavedRouteCompletionDto {
  @ApiProperty({
    description: '여행 완료 여부 (true: 여행 완료 ON, false: 미완료 OFF)',
    example: true,
    type: Boolean,
  })
  @IsBoolean()
  isCompleted!: boolean;

  @ApiPropertyOptional({
    description: '유저가 해당 여행에서 실제 지출한 총 금액 (원화)',
    example: 45000,
    type: Number,
  })
  @IsOptional()
  @IsInt()
  @Min(0, { message: '실제 지출 금액은 0원 이상이어야 합니다.' })
  actualCostWon?: number;
}
