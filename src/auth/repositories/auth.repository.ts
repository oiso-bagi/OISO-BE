import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { KakaoUserProfile } from '../types/kakao-auth.types';

export type UserIdOnly = Pick<User, 'id'>;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findUserByProvider(
    provider: string,
    providerId: string,
  ): Promise<UserIdOnly | null> {
    return this.prisma.user.findFirst({
      where: {
        provider,
        providerId,
      },
      select: {
        id: true,
      },
    });
  }

  findUserByNickname(nickname: string): Promise<UserIdOnly | null> {
    return this.prisma.user.findUnique({
      where: { nickname },
      select: {
        id: true,
      },
    });
  }

  createKakaoUser(profile: KakaoUserProfile, nickname: string): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: profile.email,
        nickname,
        provider: 'kakao',
        providerId: profile.providerId,
      },
    });
  }

  updateKakaoUser(userId: string, profile: KakaoUserProfile): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        email: profile.email,
      },
    });
  }
}
