import type { User } from '@prisma/client';

export class CurrentUserResponseDto {
  id!: string;
  email!: string;
  nickname!: string;
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
