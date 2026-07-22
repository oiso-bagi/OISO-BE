import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  KakaoTokenResponse,
  KakaoUserProfile,
  KakaoUserResponse,
} from '../types/kakao-auth.types';

@Injectable()
export class KakaoAuthService {
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.getRequiredEnv('KAKAO_REST_API_KEY'),
      redirect_uri: this.getRequiredEnv('KAKAO_REDIRECT_URI'),
      response_type: 'code',
      scope: process.env.KAKAO_AUTH_SCOPES ?? 'account_email,profile_nickname',
      state,
    });

    return `https://kauth.kakao.com/oauth/authorize?${params.toString()}`;
  }

  async getUserProfile(code: string): Promise<KakaoUserProfile> {
    const token = await this.requestToken(code);
    const kakaoUser = await this.requestUser(token.access_token);
    const providerId = String(kakaoUser.id);
    const email = kakaoUser.kakao_account?.email?.trim();
    const nickname = kakaoUser.kakao_account?.profile?.nickname?.trim();

    if (!email) {
      throw new BadRequestException('Kakao account email is required.');
    }

    if (!nickname) {
      throw new BadRequestException('Kakao profile nickname is required.');
    }

    return {
      providerId,
      email,
      nickname,
    };
  }

  private async requestToken(code: string): Promise<KakaoTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.getRequiredEnv('KAKAO_REST_API_KEY'),
      redirect_uri: this.getRequiredEnv('KAKAO_REDIRECT_URI'),
      code,
    });
    const clientSecret = process.env.KAKAO_CLIENT_SECRET;

    if (clientSecret) {
      params.set('client_secret', clientSecret);
    }

    const response = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: params,
    });

    if (!response.ok) {
      throw new BadRequestException(
        'Failed to exchange Kakao authorization code.',
      );
    }

    return (await response.json()) as KakaoTokenResponse;
  }

  private async requestUser(accessToken: string): Promise<KakaoUserResponse> {
    const response = await fetch('https://kapi.kakao.com/v2/user/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new BadRequestException('Failed to fetch Kakao user profile.');
    }

    return (await response.json()) as KakaoUserResponse;
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new InternalServerErrorException(`${name} is not configured.`);
    }

    return value;
  }
}
