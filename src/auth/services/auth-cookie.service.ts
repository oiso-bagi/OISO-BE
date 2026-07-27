import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request } from 'express';

@Injectable()
export class AuthCookieService {
  getBaseCookieOptions(): CookieOptions {
    const configuredSecure = process.env.COOKIE_SECURE;

    return {
      httpOnly: true,
      secure:
        configuredSecure === undefined
          ? process.env.NODE_ENV === 'production'
          : configuredSecure === 'true',
      sameSite: 'lax' as const,
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: '/',
    };
  }

  getDurationMilliseconds(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);

    if (!match) {
      return 15 * 60 * 1000;
    }

    const amount = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * multipliers[unit];
  }

  parseCookies(request: Request): Record<string, string> {
    const cookieHeader = request.headers.cookie;

    if (!cookieHeader) {
      return {};
    }

    return cookieHeader
      .split(';')
      .reduce<Record<string, string>>((cookies, cookie) => {
        const separatorIndex = cookie.indexOf('=');

        if (separatorIndex === -1) {
          return cookies;
        }

        const name = cookie.slice(0, separatorIndex).trim();
        const value = cookie.slice(separatorIndex + 1).trim();

        cookies[name] = this.decodeCookieValue(value);

        return cookies;
      }, {});
  }

  validateOAuthState(
    state: string | undefined,
    storedState: string | undefined,
  ): void {
    if (!state || !storedState || !this.isEqual(state, storedState)) {
      throw new BadRequestException('Invalid OAuth state.');
    }
  }

  getBearerToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    return authorization.slice('Bearer '.length).trim();
  }

  getSuccessRedirectUrl(): string {
    const successUrl =
      process.env.FRONTEND_AUTH_SUCCESS_REDIRECT ??
      'http://localhost:5173/auth/kakao/success';
    const url = new URL(successUrl);

    url.searchParams.set('login', 'success');

    return url.toString();
  }

  getFailureRedirectUrl(reason?: string): string {
    const fallbackUrl =
      process.env.FRONTEND_AUTH_FAILURE_REDIRECT ??
      'http://localhost:5173/login?error=kakao_auth_failed';

    if (!reason) {
      return fallbackUrl;
    }

    const url = new URL(fallbackUrl);

    url.searchParams.set('reason', reason);

    return url.toString();
  }

  getFailureReason(error: unknown): string {
    if (error instanceof BadRequestException) {
      const message = this.getExceptionMessage(error);

      if (message.includes('canceled')) {
        if (message.includes('Kakao')) {
          return 'kakao_canceled';
        }

        if (message.includes('Google')) {
          return 'google_canceled';
        }

        return 'oauth_canceled';
      }

      if (message.includes('Failed to exchange')) {
        return 'token_exchange_failed';
      }

      if (message.includes('Failed to fetch')) {
        return 'profile_fetch_failed';
      }

      if (message.includes('authorization code')) {
        return 'missing_code';
      }

      if (message.includes('OAuth state')) {
        return 'invalid_state';
      }

      if (message.includes('email')) {
        return 'email_required';
      }

      if (message.includes('nickname')) {
        return 'nickname_required';
      }
    }

    if (error instanceof ConflictException) {
      const message = this.getExceptionMessage(error);

      if (message.includes('Email')) {
        return 'email_conflict';
      }
    }

    return 'server_error';
  }

  private decodeCookieValue(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  private getExceptionMessage(
    error: BadRequestException | ConflictException,
  ): string {
    const response = error.getResponse();

    return typeof response === 'object' &&
      response !== null &&
      'message' in response
      ? String(response.message)
      : error.message;
  }

  private isEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }
}
