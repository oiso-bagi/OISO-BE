import {
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  GoogleTokenResponse,
  GoogleUserProfile,
  GoogleUserResponse,
} from '@/auth/types/google-auth.types';

@Injectable()
export class GoogleAuthService {
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.getRequiredEnv('GOOGLE_CLIENT_ID'),
      redirect_uri: this.getRequiredEnv('GOOGLE_REDIRECT_URI'),
      response_type: 'code',
      scope: process.env.GOOGLE_AUTH_SCOPES ?? 'openid email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async getUserProfile(code: string): Promise<GoogleUserProfile> {
    const token = await this.requestToken(code);
    const googleUser = await this.requestUser(token.access_token);
    const providerId = googleUser.sub;
    const email = googleUser.email?.trim();
    const nickname = googleUser.name?.trim();

    if (!email) {
      throw new BadRequestException('Google account email is required.');
    }

    if (!nickname) {
      throw new BadRequestException('Google profile name is required.');
    }

    return {
      providerId,
      email,
      nickname,
    };
  }

  private async requestToken(code: string): Promise<GoogleTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.getRequiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: this.getRequiredEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: this.getRequiredEnv('GOOGLE_REDIRECT_URI'),
      code,
    });

    const response = await this.fetchGoogle(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
        },
        body: params,
      },
    );

    if (!response.ok) {
      throw new BadRequestException(
        'Failed to exchange Google authorization code.',
      );
    }

    return (await response.json()) as GoogleTokenResponse;
  }

  private async requestUser(accessToken: string): Promise<GoogleUserResponse> {
    const response = await this.fetchGoogle(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new BadRequestException('Failed to fetch Google user profile.');
    }

    return (await response.json()) as GoogleUserResponse;
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new InternalServerErrorException(`${name} is not configured.`);
    }

    return value;
  }

  private async fetchGoogle(url: string, init: RequestInit): Promise<Response> {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(this.getRequestTimeoutMs()),
      });
    } catch (error) {
      if (this.isTimeoutError(error)) {
        throw new GatewayTimeoutException('Google API request timed out.');
      }

      throw error;
    }
  }

  private getRequestTimeoutMs(): number {
    const configuredTimeout = Number(process.env.GOOGLE_REQUEST_TIMEOUT_MS);

    return Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : 5000;
  }

  private isTimeoutError(error: unknown): boolean {
    return (
      error instanceof Error &&
      (error.name === 'TimeoutError' || error.name === 'AbortError')
    );
  }
}
