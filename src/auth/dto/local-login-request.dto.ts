import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LocalLoginRequestDto {
  @ApiProperty({
    description: '로컬 계정 로그인 아이디',
  })
  @IsString()
  @Matches(/\S/, {
    message: '로그인 아이디는 공백만 입력할 수 없습니다.',
  })
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
