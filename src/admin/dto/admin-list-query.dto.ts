import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { UserProvider, UserRole } from '@prisma/client';

const toStrictBoolean = ({ value }: { value: unknown }) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
};

export class AdminPageQueryDto {
  @ApiPropertyOptional({ description: '페이지 번호 (1부터 시작)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: '페이지당 항목 수', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  size: number = 20;

  @ApiPropertyOptional({ description: '검색어 (이름, 주소 등)' })
  @IsOptional()
  @IsString()
  q?: string;
}

export class AdminRouteListQueryDto extends AdminPageQueryDto {
  @ApiPropertyOptional({
    description:
      '테마 슬러그 (local-food: 부산 로컬 맛집 | emotion-cafe: 감성 카페 | beach-tour: 바다 관광 | photo-spot: 포토 스팟 | traditional-market: 전통시장 | nature-walk: 자연 / 산책)',
    example: 'local-food',
  })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiPropertyOptional({ description: '게시 여부 (true/false)' })
  @IsOptional()
  @Transform(toStrictBoolean)
  @IsBoolean()
  isPublished?: boolean;
}

export class AdminPlaceListQueryDto extends AdminPageQueryDto {
  @ApiPropertyOptional({
    description:
      '장소 카테고리 (FOOD: 식당 | CAFE: 카페 | MARKET: 전통시장 | CULTURE: 문화 | NATURE: 자연 | EXPERIENCE: 체험 | VIEWPOINT: 전망대 | ETC: 기타)',
    example: 'FOOD',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: '활성화 여부 (true/false)' })
  @IsOptional()
  @Transform(toStrictBoolean)
  @IsBoolean()
  isActive?: boolean;
}

export class AdminUserListQueryDto extends AdminPageQueryDto {
  @ApiPropertyOptional({
    description: '가입 또는 로그인 제공자 필터',
    enum: UserProvider,
    example: 'GOOGLE',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(UserProvider)
  provider?: UserProvider;

  @ApiPropertyOptional({ description: '계정 활성 상태 필터 (true/false)' })
  @IsOptional()
  @Transform(toStrictBoolean)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: '회원 권한 필터',
    enum: UserRole,
    example: UserRole.USER,
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
