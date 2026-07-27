import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  SocialProvider,
  SocialUserProfile,
} from '@/auth/types/social-auth.types';

export type UserIdOnly = Pick<User, 'id'>;
export type SocialAuthUser = Omit<User, 'passwordHash'>;

const socialUserSelect = {
  id: true,
  email: true,
  provider: true,
  providerId: true,
  nickname: true,
  phone: true,
  role: true,
  birthDate: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  findUserByProvider(
    provider: SocialProvider,
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
    provider: SocialProvider,
    profile: SocialUserProfile,
    nickname: string,
  ): Promise<SocialAuthUser> {
    const user = await this.prisma.user.create({
      data: {
        email: profile.email,
        nickname,
        provider,
        providerId: profile.providerId,
      },
      select: socialUserSelect,
    });

    return user;
  }

  async updateSocialUser(
    userId: string,
    profile: SocialUserProfile,
  ): Promise<SocialAuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: profile.email,
      },
      select: socialUserSelect,
    });

    return user;
  }
}
