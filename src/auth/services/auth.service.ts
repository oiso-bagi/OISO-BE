import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { AuthRepository } from '@/auth/repositories/auth.repository';
import { SocialAuthService } from '@/auth/services/social-auth.service';
import { AuthTokenService } from '@/auth/services/auth-token.service';
import type { SocialLoginResult } from '@/auth/types/auth-result.types';
import type { GoogleUserProfile } from '@/auth/types/google-auth.types';
import type { KakaoUserProfile } from '@/auth/types/kakao-auth.types';
import type {
  SocialProvider,
  SocialUserProfile,
} from '@/auth/types/social-auth.types';

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
      throw new UnauthorizedException('액세스 토큰이 필요합니다.');
    }

    const payload = this.authTokenService.verifyAccessToken(accessToken);
    const user = await this.authRepository.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('인증된 사용자를 찾을 수 없습니다.');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('Account is suspended.');
    }

    return user;
  }

  async refreshAccessToken(refreshToken: string | undefined): Promise<string> {
    if (!refreshToken) {
      throw new UnauthorizedException('리프레시 토큰이 필요합니다.');
    }

    const payload = this.authTokenService.verifyRefreshToken(refreshToken);
    const user = await this.authRepository.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('인증된 사용자를 찾을 수 없습니다.');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('Account is suspended.');
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

      return user !== null && user !== undefined && user.isActive !== false;
    } catch (error: unknown) {
      if (error instanceof UnauthorizedException) {
        return false;
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error(
        '리프레시 토큰 검증 중 예상하지 못한 오류가 발생했습니다.',
      );
    }
  }

  private async loginWithSocialProvider(
    provider: SocialProvider,
    profile: SocialUserProfile,
  ): Promise<SocialLoginResult> {
    return this.socialAuthService.loginWithSocialProvider(provider, profile);
  }
}
