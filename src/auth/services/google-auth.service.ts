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

const GOOGLE_TOKEN_EXCHANGE_FAILED_MESSAGE =
  'Failed to exchange Google authorization code.';
const GOOGLE_PROFILE_FETCH_FAILED_MESSAGE =
  'Failed to fetch Google user profile.';

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

    if (googleUser.email_verified === false) {
      throw new BadRequestException('Google account email is not verified.');
    }

    const email = googleUser.email?.trim();
    const nickname = googleUser.name?.trim();

    if (!email) {
      throw new BadRequestException('Google account email is required.');
    }

    if (!nickname) {
      throw new BadRequestException('Google account nickname is required.');
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
      GOOGLE_TOKEN_EXCHANGE_FAILED_MESSAGE,
    );

    if (!response.ok) {
      throw new BadRequestException(GOOGLE_TOKEN_EXCHANGE_FAILED_MESSAGE);
    }

    const tokenResponse = await this.parseGoogleResponse(
      response,
      GOOGLE_TOKEN_EXCHANGE_FAILED_MESSAGE,
    );

    if (!this.isGoogleTokenResponse(tokenResponse)) {
      throw new BadRequestException(GOOGLE_TOKEN_EXCHANGE_FAILED_MESSAGE);
    }

    return tokenResponse;
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
      GOOGLE_PROFILE_FETCH_FAILED_MESSAGE,
    );

    if (!response.ok) {
      throw new BadRequestException(GOOGLE_PROFILE_FETCH_FAILED_MESSAGE);
    }

    const googleUser = await this.parseGoogleResponse(
      response,
      GOOGLE_PROFILE_FETCH_FAILED_MESSAGE,
    );

    if (!this.isGoogleUserResponse(googleUser)) {
      throw new BadRequestException(GOOGLE_PROFILE_FETCH_FAILED_MESSAGE);
    }

    return googleUser;
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
      throw new InternalServerErrorException(`${name} is not configured.`);
    }

    return value;
  }

  private async fetchGoogle(
    url: string,
    init: RequestInit,
    failureMessage: string,
  ): Promise<Response> {
    try {
      return await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(this.getRequestTimeoutMs()),
      });
    } catch (error) {
      if (this.isTimeoutError(error)) {
        throw new GatewayTimeoutException('Google API request timed out.');
      }

      throw new BadRequestException(failureMessage);
    }
  }

  private async parseGoogleResponse(
    response: Response,
    failureMessage: string,
  ): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      throw new BadRequestException(failureMessage);
    }
  }

  private isGoogleTokenResponse(value: unknown): value is GoogleTokenResponse {
    return (
      typeof value === 'object' &&
      value !== null &&
      'access_token' in value &&
      typeof value.access_token === 'string' &&
      value.access_token.trim().length > 0
    );
  }

  private isGoogleUserResponse(value: unknown): value is GoogleUserResponse {
    return (
      typeof value === 'object' &&
      value !== null &&
      'sub' in value &&
      typeof value.sub === 'string' &&
      value.sub.trim().length > 0 &&
      (!('email' in value) || typeof value.email === 'string') &&
      (!('name' in value) || typeof value.name === 'string') &&
      (!('email_verified' in value) ||
        typeof value.email_verified === 'boolean')
    );
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
