import { ApiProperty } from '@nestjs/swagger';
import { UserProvider, UserRole } from '@prisma/client';
import type { User } from '@prisma/client';

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
    description: '가입 또는 로그인에 사용한 제공자',
    enum: UserProvider,
    example: 'LOCAL',
  })
  provider!: UserProvider;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.USER,
  })
  role!: UserRole;

  static from(user: User): CurrentUserResponseDto {
    return {
      id: user.id,
      email: user.email,
      nickname: this.getDisplayNickname(user),
      provider: user.provider,
      role: user.role,
    };
  }

  private static getDisplayNickname(user: User): string {
    if (user.provider !== UserProvider.GOOGLE || !user.providerId) {
      return user.nickname;
    }

    const suffix = `_${user.providerId}`;
    const retrySuffixes = ['', '_1', '_2', '_3'];

    for (const retrySuffix of retrySuffixes) {
      const candidateSuffix = `${suffix}${retrySuffix}`;

      if (user.nickname.endsWith(candidateSuffix)) {
        return user.nickname.slice(0, -candidateSuffix.length);
      }
    }

    return user.nickname;
  }
}
