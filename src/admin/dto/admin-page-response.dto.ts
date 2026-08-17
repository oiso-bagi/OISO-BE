import { ApiProperty } from '@nestjs/swagger';

export class AdminPageResponseDto<T> {
  @ApiProperty({ description: '목록 데이터 아이템' })
  items: T[];

  @ApiProperty({ description: '현재 페이지 (1부터 시작)', example: 1 })
  page: number;

  @ApiProperty({ description: '페이지당 항목 수', example: 20 })
  size: number;

  @ApiProperty({ description: '전체 데이터 건수', example: 137 })
  totalCount: number;

  @ApiProperty({ description: '전체 페이지 수', example: 7 })
  totalPages: number;

  static of<T>(
    items: T[],
    page: number,
    size: number,
    totalCount: number,
  ): AdminPageResponseDto<T> {
    const dto = new AdminPageResponseDto<T>();
    dto.items = items;
    dto.page = page;
    dto.size = size;
    dto.totalCount = totalCount;
    dto.totalPages = Math.ceil(totalCount / size) || 1;
    return dto;
  }
}

export class AdminRouteListItemDto {
  @ApiProperty({ description: '코스 ID', example: 'route-03b77f38aa146d15' })
  id: string;

  @ApiProperty({ description: '코스명', example: '부산 로컬 맛집 릴레이 코스' })
  name: string;

  @ApiProperty({ description: '대표 테마 슬러그', example: 'local-food' })
  theme: string;

  @ApiProperty({
    description: '대표 테마 한글 라벨',
    example: '부산 로컬 맛집',
  })
  themeLabel: string;

  @ApiProperty({ description: '경유 장소 수', example: 4 })
  stopCount: number;

  @ApiProperty({ description: '총 이동 거리 (km)', example: 3.4 })
  totalDistanceKm: number;

  @ApiProperty({ description: '게시 여부', example: true })
  isPublished: boolean;

  @ApiProperty({
    description: '생성 일시',
    example: '2026-08-01T00:00:00.000Z',
  })
  createdAt: Date;
}

export class AdminPlaceListItemDto {
  @ApiProperty({ description: '장소 ID', example: 'place_001' })
  id: string;

  @ApiProperty({ description: '장소명', example: '가야포차선지국' })
  name: string;

  @ApiProperty({ description: '주소', example: '부산광역시 부산진구 ...' })
  address: string;

  @ApiProperty({ description: '카테고리', example: 'FOOD', nullable: true })
  category: string | null;

  @ApiProperty({ description: 'TPI 지수', example: 0.82, nullable: true })
  tpiScore: number | null;

  @ApiProperty({ description: '활성화 상태 (Soft Delete 여부)', example: true })
  isActive: boolean;

  @ApiProperty({ description: '위도', example: 35.3223258 })
  latitude: number;

  @ApiProperty({ description: '경도', example: 129.1788934 })
  longitude: number;
}

export class AdminRoutePageResponseDto extends AdminPageResponseDto<AdminRouteListItemDto> {
  @ApiProperty({
    type: [AdminRouteListItemDto],
    description: '추천 코스 목록 데이터 아이템',
  })
  declare items: AdminRouteListItemDto[];
}

export class AdminPlacePageResponseDto extends AdminPageResponseDto<AdminPlaceListItemDto> {
  @ApiProperty({
    type: [AdminPlaceListItemDto],
    description: '장소 목록 데이터 아이템',
  })
  declare items: AdminPlaceListItemDto[];
}
