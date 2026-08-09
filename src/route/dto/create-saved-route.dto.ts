import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSavedRouteDto {
  @ApiProperty({
    description: '보관함에 저장할 추천/마스터 루트 ID',
    example: 'clx1234567890abcdef',
    type: String,
  })
  @IsString()
  @IsNotEmpty({ message: '루트 ID는 필수 입력값입니다.' })
  routeId!: string;
}
