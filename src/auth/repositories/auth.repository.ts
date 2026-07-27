import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { SocialUserProfile } from '@/auth/types/social-auth.types';

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
    return this.prisma.user.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
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

  async createSocialUser(
    provider: string,
    profile: SocialUserProfile,
    nickname: string,
  ): Promise<User> {
    const user = await this.prisma.user.create({
      data: {
        email: profile.email,
        nickname,
        provider,
        providerId: profile.providerId,
      },
    });

    return user;
  }

  async updateSocialUser(
    userId: string,
    profile: SocialUserProfile,
  ): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: profile.email,
      },
    });

    return user;
  }
}
