import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { AuthRepository } from '../repositories/auth.repository';
import { AuthTokenService } from './auth-token.service';
import { KakaoUserProfile } from '../types/kakao-auth.types';

export interface AuthTokens {
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
    this.getNormalizedNickname(profile.nickname);

    const existingUser = await this.authRepository.findUserByProvider(
      'kakao',
      profile.providerId,
    );
    const user = existingUser
      ? await this.authRepository.updateKakaoUser(existingUser.id, profile)
      : await this.createKakaoUserHandlingRace(profile);

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

  private issueTokens(user: User): AuthTokens {
    return {
      refreshToken: this.authTokenService.issueRefreshToken(
        user.id,
        user.provider,
      ),
    };
  }

  private async createKakaoUserHandlingRace(
    profile: KakaoUserProfile,
  ): Promise<User> {
    return this.createKakaoUserWithAvailableNickname(profile);
  }

  private async createKakaoUserWithAvailableNickname(
    profile: KakaoUserProfile,
  ): Promise<User> {
    for (const nickname of this.getNicknameCandidates(profile)) {
      const existing = await this.authRepository.findUserByNickname(nickname);

      if (existing) {
        continue;
      }

      try {
        return await this.authRepository.createKakaoUser(profile, nickname);
      } catch (error) {
        if (!this.isUniqueConstraintError(error)) {
          throw error;
        }

        const existingUser = await this.authRepository.findUserByProvider(
          'kakao',
          profile.providerId,
        );

        if (existingUser) {
          return this.authRepository.updateKakaoUser(existingUser.id, profile);
        }
      }
    }

    throw new ConflictException('Available Kakao nickname was not found.');
  }

  private getNicknameCandidates(profile: KakaoUserProfile): string[] {
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
      throw new BadRequestException('Kakao nickname is required.');
    }

    return baseNickname;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
