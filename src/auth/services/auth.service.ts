import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AuthRepository } from '@/auth/repositories/auth.repository';
import type { SocialAuthUser } from '@/auth/repositories/auth.repository';
import { SocialAuthService } from '@/auth/services/social-auth.service';
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

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authTokenService: AuthTokenService,
    private readonly socialAuthService: SocialAuthService,
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
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        return false;
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        'Unexpected error occurred while verifying the refresh token.',
      );
    }
  }

  private async loginWithSocialProvider(
    provider: SocialProvider,
    profile: SocialUserProfile,
  ): Promise<SocialLoginResult> {
    const resolvedUser = await this.socialAuthService.resolveSocialUser(
      provider,
      profile,
    );

    return {
      user: resolvedUser.user,
      tokens: this.issueTokens(resolvedUser.user),
      isNewUser: resolvedUser.isNewUser,
    };
  }

  private issueTokens(user: Pick<User, 'id' | 'provider'>): AuthTokens {
    return {
      refreshToken: this.authTokenService.issueRefreshToken(
        user.id,
        user.provider,
      ),
    };
  }
}
