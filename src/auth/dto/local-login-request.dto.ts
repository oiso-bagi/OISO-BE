import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class LocalLoginRequestDto {
  @ApiProperty({
    description: '로컬 계정 로그인 아이디',
  })
  @IsString()
  @MaxLength(255)
  email!: string;

  @ApiProperty({
    description: '로컬 계정 비밀번호',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
