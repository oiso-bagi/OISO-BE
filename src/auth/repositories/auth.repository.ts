import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { KakaoUserProfile } from '../types/kakao-auth.types';

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
  ): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        provider,
        providerId,
      },
    });
  }

  findUserByNickname(nickname: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { nickname },
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
