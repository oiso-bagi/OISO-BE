import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class BudgetRatiosDto {
  @ApiProperty({
    description: '식비 비율 (0 ~ 1). 미입력 시 기본값 0.35 적용',
    example: 0.35,
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  foodRatio?: number;

  @ApiProperty({
    description: '체험/입장료 비율 (0 ~ 1). 미입력 시 기본값 0.25 적용',
    example: 0.25,
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  experienceRatio?: number;

  @ApiProperty({
    description: '교통비 비율 (0 ~ 1). 미입력 시 기본값 0.40 적용',
    example: 0.4,
    required: false,
    type: Number,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  transportRatio?: number;
}

export class RecommendRouteRequestDto {
  @ApiProperty({
    description:
      '추천에 사용할 여행 스타일 slug 목록 (1개 이상 선택 가능: local-food: 부산 로컬 맛집 | emotion-cafe: 감성 카페 | beach-tour: 바다 관광 | photo-spot: 포토 스팟 | traditional-market: 전통시장 | nature-walk: 자연 / 산책)',
    example: ['local-food', 'emotion-cafe'],
    isArray: true,
    type: [String],
    required: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  travelStyleSlugs!: string[];

  @ApiProperty({
    description: '여행 기간(일). 1부터 5까지 허용됩니다.',
    example: 2,
    type: Number,
    required: true,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  durationDays!: number;

  @ApiProperty({
    description: '1일 예산(원). 안전한 양의 정수여야 합니다.',
    example: 60000,
    type: Number,
    required: true,
  })
  @IsInt()
  @Min(10000)
  @Max(500000)
  dailyBudgetWon!: number;

  @ApiProperty({
    description:
      '예산 비율 배분 (선택). foodRatio + experienceRatio + transportRatio 합계가 1.0이어야 합니다. 미입력 시 기본값 { food: 0.35, experience: 0.25, transport: 0.40 } 적용.',
    type: BudgetRatiosDto,
    required: false,
    example: {
      foodRatio: 0.35,
      experienceRatio: 0.25,
      transportRatio: 0.4,
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => BudgetRatiosDto)
  ratios?: BudgetRatiosDto;
}
