import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthRepository } from '@/auth/repositories/auth.repository';
import type {
  SocialAuthUser,
  UserIdOnly,
} from '@/auth/repositories/auth.repository';
import type {
  SocialProvider,
  SocialUserProfile,
} from '@/auth/types/social-auth.types';

export interface SocialUserResolution {
  user: SocialAuthUser;
  isNewUser: boolean;
}

@Injectable()
export class SocialAuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  async resolveSocialUser(
    provider: SocialProvider,
    profile: SocialUserProfile,
  ): Promise<SocialUserResolution> {
    this.getNormalizedNickname(profile.nickname);

    const existingUser = await this.authRepository.findUserByProvider(
      provider,
      profile.providerId,
    );

    if (existingUser) {
      return {
        user: await this.updateSocialUserHandlingEmailConflict(
          existingUser.id,
          profile,
        ),
        isNewUser: false,
      };
    }

    return this.createSocialUserWithAvailableNickname(provider, profile);
  }

  private async createSocialUserWithAvailableNickname(
    provider: SocialProvider,
    profile: SocialUserProfile,
  ): Promise<SocialUserResolution> {
    for (const nickname of this.getNicknameCandidates(profile)) {
      const existing = await this.authRepository.findUserByNickname(nickname);

      if (existing) {
        continue;
      }

      try {
        const user = await this.authRepository.createSocialUser(
          provider,
          profile,
          nickname,
        );

        return { user, isNewUser: true };
      } catch (error: unknown) {
        if (this.isUniqueConstraintError(error, 'email')) {
          throw new ConflictException(
            'Email is already linked to another account.',
          );
        }

        if (!this.isUniqueConstraintError(error)) {
          throw this.toError(error, 'creating social user');
        }

        const existingUser: UserIdOnly | null =
          await this.authRepository.findUserByProvider(
            provider,
            profile.providerId,
          );

        if (existingUser) {
          return {
            user: await this.updateSocialUserHandlingEmailConflict(
              existingUser.id,
              profile,
            ),
            isNewUser: false,
          };
        }
      }
    }

    throw new ConflictException('Available nickname was not found.');
  }

  private async updateSocialUserHandlingEmailConflict(
    userId: string,
    profile: SocialUserProfile,
  ): Promise<SocialAuthUser> {
    try {
      return await this.authRepository.updateSocialUser(userId, profile);
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error, 'email')) {
        throw new ConflictException('email_conflict');
      }

      throw this.toError(error, 'updating social user');
    }
  }

  private getNicknameCandidates(profile: SocialUserProfile): string[] {
    const baseNickname = this.getNormalizedNickname(profile.nickname);

    return [
      baseNickname,
      `${baseNickname}_${profile.providerId}`,
      `${baseNickname}_${profile.providerId}_1`,
      `${baseNickname}_${profile.providerId}_2`,
      `${baseNickname}_${profile.providerId}_3`,
    ];
  }

  private getNormalizedNickname(nickname: string): string {
    const baseNickname = nickname.trim();

    if (!baseNickname) {
      throw new BadRequestException('Nickname is required.');
    }

    return baseNickname;
  }

  private isUniqueConstraintError(
    error: unknown,
    field?: string,
  ): error is Prisma.PrismaClientKnownRequestError {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    if (!field) {
      return true;
    }

    const target = error.meta?.target;

    return Array.isArray(target) && target.includes(field);
  }

  private toError(error: unknown, action: string): Error {
    if (error instanceof Error) {
      return error;
    }

    return new Error(`Unexpected error occurred while ${action}.`);
  }
}
