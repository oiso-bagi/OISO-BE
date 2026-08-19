import type { User } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CurrentUserResponseDto {
  @ApiProperty({
    description: '사용자 ID',
    example: 'cm1234567890',
  })
  id!: string;

  @ApiProperty({
    description: '사용자 이메일',
    example: 'user@example.com',
  })
  email!: string;

  @ApiProperty({
    description: '사용자 닉네임',
    example: '오이소',
  })
  nickname!: string;

  @ApiProperty({
    description: '가입 또는 로그인에 사용한 OAuth 제공자',
    example: 'LOCAL',
  })
  provider!: string;

  static from(user: User): CurrentUserResponseDto {
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      provider: user.provider,
    };
  }
}
