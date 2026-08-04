import { ApiProperty } from '@nestjs/swagger';

export class RecommendRouteRequestDto {
  @ApiProperty({
    description: '추천에 사용할 여행 스타일 slug 목록',
    example: ['local-food', 'cafe'],
    type: [String],
  })
  travelStyleSlugs?: unknown;

  @ApiProperty({
    description: '여행 기간(일). 1부터 5까지 허용됩니다.',
    example: 2,
  })
  durationDays?: unknown;

  @ApiProperty({
    description: '1일 예산(원). 안전한 양의 정수여야 합니다.',
    example: 60000,
  })
  dailyBudgetWon?: unknown;
}
