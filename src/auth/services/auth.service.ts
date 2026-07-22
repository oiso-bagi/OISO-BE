import { Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthTokenService } from './auth-token.service';
import { KakaoUserProfile } from '../types/kakao-auth.types';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async loginWithKakao(profile: KakaoUserProfile): Promise<{
    user: User;
    tokens: AuthTokens;
  }> {
    const existingUser = await this.authRepository.findUserByProvider(
      'kakao',
      profile.providerId,
    );
    const user = existingUser
      ? await this.authRepository.updateKakaoUser(existingUser.id, profile)
      : await this.authRepository.createKakaoUser(
          profile,
          await this.createAvailableNickname(profile),
        );

    return {
      user,
      tokens: this.issueTokens(user),
    };
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

  private issueTokens(user: User): AuthTokens {
    return {
      accessToken: this.authTokenService.issueAccessToken(
        user.id,
        user.provider,
      ),
      refreshToken: this.authTokenService.issueRefreshToken(
        user.id,
        user.provider,
      ),
    };
  }

  private async createAvailableNickname(
    profile: KakaoUserProfile,
  ): Promise<string> {
    const baseNickname = profile.nickname.trim();
    const existing = await this.authRepository.findUserByNickname(baseNickname);

    if (!existing) {
      return baseNickname;
    }

    return `${baseNickname}_${profile.providerId}`;
  }
}
