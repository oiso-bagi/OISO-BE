import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Injectable,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request } from 'express';
import {
  isAllowedFrontendOrigin,
  resolveFrontendOriginRules,
} from '@/common/config/frontend-origin.config';

@Injectable()
export class AuthCookieService {
  getBaseCookieOptions(): CookieOptions {
    const isSecureCookie = this.resolveCookieSecure();

    return {
      httpOnly: true,
      secure: isSecureCookie,
      sameSite: isSecureCookie ? ('none' as const) : ('lax' as const),
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: '/',
    };
  }

  getCookieRemovalOptions(): CookieOptions {
    return {
      httpOnly: true,
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: '/',
    };
  }

  private resolveCookieSecure(): boolean {
    const configuredSecure = process.env.COOKIE_SECURE;

    if (configuredSecure === undefined) {
      return process.env.NODE_ENV === 'production';
    }

    if (configuredSecure === 'true') {
      return true;
    }

    if (configuredSecure === 'false') {
      return false;
    }

    throw new InternalServerErrorException('서버 설정 오류가 발생했습니다.');
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
      throw new BadRequestException('OAuth state 값이 유효하지 않습니다.');
    }
  }

  getBearerToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    return authorization.slice('Bearer '.length).trim();
  }

  getSafeOAuthReturnUrl(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }

    const returnUrl = value.trim();

    if (!returnUrl) {
      return undefined;
    }

    try {
      const frontendOriginRules = this.getFrontendOriginRules();
      const frontendOrigin = this.getFrontendOrigin();
      const url = new URL(returnUrl, frontendOrigin);

      if (!isAllowedFrontendOrigin(url.origin, frontendOriginRules)) {
        return undefined;
      }

      return returnUrl.startsWith('/')
        ? `${url.pathname}${url.search}${url.hash}`
        : url.toString();
    } catch {
      return undefined;
    }
  }

  getSuccessRedirectUrl(returnUrl?: string): string {
    const successUrl =
      process.env.FRONTEND_AUTH_SUCCESS_REDIRECT ??
      'http://localhost:5173/auth/kakao/success';
    const url = this.getFrontendRedirectUrl(returnUrl || successUrl);

    url.searchParams.set('login', 'success');

    return url.toString();
  }

  getConsentRedirectUrl(): string {
    const consentUrl =
      process.env.FRONTEND_AUTH_CONSENT_REDIRECT ??
      'http://localhost:5173/consents';
    const url = this.getFrontendRedirectUrl(consentUrl);

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

      if (message.includes('취소')) {
        if (message.includes('카카오')) {
          return 'kakao_canceled';
        }

        if (message.includes('구글')) {
          return 'google_canceled';
        }

        return 'oauth_canceled';
      }

      if (message.includes('토큰으로 교환')) {
        return 'token_exchange_failed';
      }

      if (message.includes('프로필 조회')) {
        return 'profile_fetch_failed';
      }

      if (message.includes('인증 코드')) {
        return 'missing_code';
      }

      if (message.includes('OAuth state')) {
        return 'invalid_state';
      }

      if (message.includes('이메일')) {
        return 'email_required';
      }

      if (message.includes('닉네임')) {
        return 'nickname_required';
      }
    }

    if (error instanceof ConflictException) {
      const message = this.getExceptionMessage(error);

      if (message.includes('이메일') || message === 'email_conflict') {
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

  private getFrontendOrigin(): string {
    const frontendOriginRules = this.getFrontendOriginRules();
    const exactOrigin = frontendOriginRules.exactOrigins[0];

    if (exactOrigin) {
      return exactOrigin;
    }

    const defaultFrontendOrigin = this.getDefaultFrontendOrigin();

    if (isAllowedFrontendOrigin(defaultFrontendOrigin, frontendOriginRules)) {
      return defaultFrontendOrigin;
    }

    throw new InternalServerErrorException(
      'FRONTEND_AUTH_SUCCESS_REDIRECT must be configured when FRONTEND_ORIGIN only contains wildcard origins.',
    );
  }

  private getFrontendOriginRules() {
    return resolveFrontendOriginRules(
      process.env.FRONTEND_ORIGIN,
      process.env.NODE_ENV,
      this.getDefaultFrontendOrigin(),
    );
  }

  private getDefaultFrontendOrigin(): string {
    const successUrl =
      process.env.FRONTEND_AUTH_SUCCESS_REDIRECT ??
      'http://localhost:5173/auth/kakao/success';

    return new URL(successUrl).origin;
  }

  private getFrontendRedirectUrl(value: string): URL {
    if (value.startsWith('/') && !value.startsWith('//')) {
      return new URL(value, this.getFrontendOrigin());
    }

    return new URL(value);
  }
}
