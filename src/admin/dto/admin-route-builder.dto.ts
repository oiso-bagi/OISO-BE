import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransitType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class AdminRouteStopInputDto {
  @ApiProperty({ description: '장소 ID', example: 'place_001' })
  @IsString()
  @IsNotEmpty()
  placeId!: string;

  @ApiProperty({
    description: '코스 내 경유 순서 (1부터 시작하는 연속 정수)',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sequence!: number;

  @ApiPropertyOptional({
    description: '장소 체류 시간 (분)',
    example: 60,
    default: 60,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stayTimeMinutes: number = 60;

  @ApiPropertyOptional({
    description: '다음 장소까지 이동 소요 시간 (분)',
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  nextTravelTimeMinutes?: number;

  @ApiPropertyOptional({
    description: '다음 장소까지 이동 수단 (WALKING, BUS, SUBWAY, TAXI, CAR 등)',
    enum: TransitType,
    example: TransitType.WALKING,
  })
  @IsOptional()
  @IsEnum(TransitType)
  nextTransportType?: TransitType;
}

export class CreateAdminRouteDto {
  @ApiProperty({
    description: '마스터 추천 코스명',
    example: '부산 감성 카페 & 야경 코스',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: '코스 상세 설명',
    example: '광안리와 해운대의 밤바다를 즐기는 로미오 코스',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description:
      '대표 테마 슬러그 (local-food: 부산 로컬 맛집 | emotion-cafe: 감성 카페 | beach-tour: 바다 관광 | photo-spot: 포토 스팟 | traditional-market: 전통시장 | nature-walk: 자연 / 산책)',
    example: 'emotion-cafe',
  })
  @IsString()
  @IsNotEmpty()
  themeSlug!: string;

  @ApiPropertyOptional({
    description: '게시 여부',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isPublished: boolean = true;

  @ApiProperty({
    description: '경유 장소 목록 (sequence는 1부터 시작하는 연속 정수)',
    type: [AdminRouteStopInputDto],
    example: [
      {
        placeId: 'place_001',
        sequence: 1,
        stayTimeMinutes: 60,
        nextTravelTimeMinutes: 20,
        nextTransportType: TransitType.WALKING,
      },
      {
        placeId: 'place_002',
        sequence: 2,
        stayTimeMinutes: 45,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AdminRouteStopInputDto)
  stops!: AdminRouteStopInputDto[];
}

export class UpdateAdminRouteDto extends CreateAdminRouteDto {}

export class AdminRouteDetailStopDto {
  @ApiProperty({ description: '경유지 순서 (1부터 시작)', example: 1 })
  sequence!: number;

  @ApiProperty({ description: '여행 일차', example: 1 })
  dayNumber!: number;

  @ApiProperty({ description: '장소 ID', example: 'place_001' })
  placeId!: string;

  @ApiProperty({ description: '장소명', example: '가야포차선지국' })
  placeName!: string;

  @ApiProperty({ description: '주소', example: '부산진구 ...' })
  address!: string;

  @ApiProperty({ description: '카테고리', example: 'FOOD', nullable: true })
  category!: string | null;

  @ApiProperty({ description: '체류 시간 (분)', example: 60 })
  stayTimeMinutes!: number;

  @ApiProperty({
    description: '다음 이동 시간 (분)',
    example: 20,
    nullable: true,
  })
  nextTravelTimeMinutes!: number | null;

  @ApiProperty({
    description: '다음 이동 수단',
    enum: TransitType,
    example: TransitType.WALKING,
    nullable: true,
  })
  nextTransportType!: TransitType | null;

  @ApiProperty({ description: '위도', example: 35.1532 })
  latitude!: number;

  @ApiProperty({ description: '경도', example: 129.1187 })
  longitude!: number;
}

export class AdminRouteDetailResponseDto {
  @ApiProperty({ description: '코스 ID', example: 'route-03b77f38aa146d15' })
  id!: string;

  @ApiProperty({ description: '코스명', example: '부산 감성 카페 & 야경 코스' })
  name!: string;

  @ApiProperty({
    description: '코스 설명',
    example: '광안리와 해운대의 밤바다를 즐기는 코스',
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ description: '대표 테마 슬러그', example: 'emotion-cafe' })
  themeSlug!: string;

  @ApiProperty({ description: '대표 테마 한글 라벨', example: '감성 카페' })
  themeLabel!: string;

  @ApiProperty({ description: '전체 소요 일수', example: 2 })
  durationDays!: number;

  @ApiProperty({ description: '총 경유 장소 수', example: 4 })
  stopCount!: number;

  @ApiProperty({ description: '총 이동 거리 (km)', example: 5.2 })
  totalDistanceKm!: number;

  @ApiProperty({ description: '게시 여부', example: true })
  isPublished!: boolean;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-08-01T00:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: '경유 장소 상세 목록',
    type: [AdminRouteDetailStopDto],
    example: [
      {
        sequence: 1,
        dayNumber: 1,
        placeId: 'place_001',
        placeName: '가야포차선지국',
        address: '부산진구 가야대로',
        category: 'FOOD',
        stayTimeMinutes: 60,
        nextTravelTimeMinutes: 20,
        nextTransportType: TransitType.WALKING,
        latitude: 35.1532,
        longitude: 129.1187,
      },
    ],
  })
  stops!: AdminRouteDetailStopDto[];
}
