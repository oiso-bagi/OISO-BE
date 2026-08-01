import { ApiProperty } from '@nestjs/swagger';

export class BudgetRatiosDto {
  @ApiProperty({
    description: '식비 선호 비율. 0부터 1 사이 값입니다.',
    example: 0.4,
    minimum: 0,
    maximum: 1,
    type: Number,
  })
  foodRatio!: number;

  @ApiProperty({
    description: '체험/관광비 선호 비율. 0부터 1 사이 값입니다.',
    example: 0.4,
    minimum: 0,
    maximum: 1,
    type: Number,
  })
  experienceRatio!: number;

  @ApiProperty({
    description: '교통비 선호 비율. 0부터 1 사이 값입니다.',
    example: 0.2,
    minimum: 0,
    maximum: 1,
    type: Number,
  })
  transportRatio!: number;
}

export class BudgetRecommendRouteRequestDto {
  @ApiProperty({
    description: '사용자 입력 총 예산(원). 10,000원 이상 500,000원 이하입니다.',
    example: 100000,
    format: 'int32',
    minimum: 10000,
    maximum: 500000,
    type: Number,
  })
  budget!: number;

  @ApiProperty({
    description:
      '사용자가 원하는 비용 분배 비율입니다. 생략하면 식비 40%, 체험비 40%, 교통비 20%를 사용합니다.',
    type: BudgetRatiosDto,
    required: false,
  })
  ratios?: BudgetRatiosDto;

  @ApiProperty({
    description: '사용자 선택 선호 테마 slug 목록',
    example: ['local-food', 'photo-spot'],
    type: [String],
    required: false,
  })
  themeSlugs?: string[];
}
