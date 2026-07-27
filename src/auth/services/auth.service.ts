import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { AuthRepository } from '@/auth/repositories/auth.repository';
import type {
  SocialAuthUser,
  UserIdOnly,
} from '@/auth/repositories/auth.repository';
import { AuthTokenService } from '@/auth/services/auth-token.service';
import type { GoogleUserProfile } from '@/auth/types/google-auth.types';
import type { KakaoUserProfile } from '@/auth/types/kakao-auth.types';
import type {
  SocialProvider,
  SocialUserProfile,
} from '@/auth/types/social-auth.types';

export interface AuthTokens {
  refreshToken: string;
}

export interface SocialLoginResult {
  user: SocialAuthUser;
  tokens: AuthTokens;
  isNewUser: boolean;
}

interface SocialUserResolution {
  user: SocialAuthUser;
  isNewUser: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async loginWithKakao(profile: KakaoUserProfile): Promise<SocialLoginResult> {
    return this.loginWithSocialProvider('kakao', profile);
  }

  async loginWithGoogle(
    profile: GoogleUserProfile,
  ): Promise<SocialLoginResult> {
    return this.loginWithSocialProvider('google', profile);
  }

  async getCurrentUser(accessToken: string | undefined): Promise<User> {
    if (!accessToken) {
      throw new UnauthorizedException('Access token is required.');
    }

    const payload = this.authTokenService.verifyAccessToken(accessToken);
    const user = await this.authRepository.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Authenticated user was not found.');
    }

    return user;
  }

  async refreshAccessToken(refreshToken: string | undefined): Promise<string> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required.');
    }

    const payload = this.authTokenService.verifyRefreshToken(refreshToken);
    const user = await this.authRepository.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Authenticated user was not found.');
    }

    return this.authTokenService.issueAccessToken(user.id, user.provider);
  }

  async hasAuthenticatedSession(
    refreshToken: string | undefined,
  ): Promise<boolean> {
    if (!refreshToken) {
      return false;
    }

    try {
      const payload = this.authTokenService.verifyRefreshToken(refreshToken);
      const user = await this.authRepository.findUserById(payload.sub);

      return user !== null && user !== undefined;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        return false;
      }

      throw error;
    }
  }

  private async loginWithSocialProvider(
    provider: SocialProvider,
    profile: SocialUserProfile,
  ): Promise<SocialLoginResult> {
    this.getNormalizedNickname(profile.nickname);

    const existingUser: UserIdOnly | null =
      await this.authRepository.findUserByProvider(
        provider,
        profile.providerId,
      );
    const resolvedUser = existingUser
      ? await this.updateExistingSocialUser(existingUser.id, profile)
      : await this.createSocialUserHandlingRace(provider, profile);

    return {
      user: resolvedUser.user,
      tokens: this.issueTokens(resolvedUser.user),
      isNewUser: resolvedUser.isNewUser,
    };
  }

  private async findSocialUserByProvider(
    provider: SocialProvider,
    providerId: string,
  ): Promise<UserIdOnly | null> {
    return this.authRepository.findUserByProvider(provider, providerId);
  }

  private issueTokens(user: Pick<User, 'id' | 'provider'>): AuthTokens {
    return {
      refreshToken: this.authTokenService.issueRefreshToken(
        user.id,
        user.provider,
      ),
    };
  }

  private async createSocialUserHandlingRace(
    provider: SocialProvider,
    profile: SocialUserProfile,
  ): Promise<SocialUserResolution> {
    return this.createSocialUserWithAvailableNickname(provider, profile);
  }

  private async updateExistingSocialUser(
    userId: string,
    profile: SocialUserProfile,
  ): Promise<SocialUserResolution> {
    const user = await this.updateSocialUserHandlingEmailConflict(
      userId,
      profile,
    );

    return { user, isNewUser: false };
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
      } catch (error) {
        if (this.isUniqueConstraintError(error, 'email')) {
          throw new ConflictException(
            'Email is already linked to another account.',
          );
        }

        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }

        const existingUser = await this.findSocialUserByProvider(
          provider,
          profile.providerId,
        );

        if (existingUser) {
          return this.updateExistingSocialUser(existingUser.id, profile);
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
    } catch (error) {
      if (this.isUniqueConstraintError(error, 'email')) {
        throw new ConflictException('email_conflict');
      }

      throw error;
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

  private isUniqueConstraintError(error: unknown, field?: string): boolean {
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
}
