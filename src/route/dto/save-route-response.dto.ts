import { ApiProperty } from '@nestjs/swagger';

export class SaveRouteResponseDto {
  @ApiProperty({
    description:
      '새로운 보관함 저장 생성 여부 (신규 저장 시 true, 이미 저장되어 있어 중복 생성 없는 경우 false)',
    example: true,
    type: Boolean,
  })
  created!: boolean;

  static from(created: boolean): SaveRouteResponseDto {
    const dto = new SaveRouteResponseDto();
    dto.created = created;
    return dto;
  }
}
