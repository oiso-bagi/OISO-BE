import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class AdminToggleRoutePublishedDto {
  @ApiProperty({ description: '게시 상태 여부', example: true })
  @IsBoolean()
  isPublished: boolean;
}

export class AdminTogglePlaceActiveDto {
  @ApiProperty({ description: '활성화 상태 여부 (Soft Delete)', example: true })
  @IsBoolean()
  isActive: boolean;
}
