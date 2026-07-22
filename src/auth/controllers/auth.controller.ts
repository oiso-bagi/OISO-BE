import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { CookieOptions, Request, Response } from 'express';
import {
  ACCESS_TOKEN_COOKIE,
  OAUTH_STATE_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '../auth.constants';
import { AuthSessionResponseDto } from '../dto/auth-session-response.dto';
import { AuthTokenResponseDto } from '../dto/auth-token-response.dto';
import { CurrentUserResponseDto } from '../dto/current-user-response.dto';
import { AuthService } from '../services/auth.service';
import { KakaoAuthService } from '../services/kakao-auth.service';

@Controller('api/v1')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly kakaoAuthService: KakaoAuthService,
  ) {}

  @Get('auth/kakao/login')
  redirectToKakao(@Res() response: Response): void {
    const state = randomBytes(24).toString('base64url');

    response.cookie(OAUTH_STATE_COOKIE, state, {
      ...this.getBaseCookieOptions(),
      maxAge: 5 * 60 * 1000,
    });
    response.redirect(this.kakaoAuthService.getAuthorizationUrl(state));
  }

  @Get('auth/kakao/callback')
  async handleKakaoCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    try {
      if (error) {
        throw new BadRequestException('Kakao login was canceled.');
      }

      if (!code || code.trim().length === 0) {
        throw new BadRequestException('Kakao authorization code is required.');
      }

      const cookies = this.parseCookies(request);

      this.validateOAuthState(state, cookies[OAUTH_STATE_COOKIE]);

      const kakaoProfile = await this.kakaoAuthService.getUserProfile(code);
      const { tokens } = await this.authService.loginWithKakao(kakaoProfile);

      this.setRefreshTokenCookie(response, tokens.refreshToken);
      response.clearCookie(ACCESS_TOKEN_COOKIE, this.getBaseCookieOptions());
      response.clearCookie(OAUTH_STATE_COOKIE, this.getBaseCookieOptions());
      response.redirect(this.getSuccessRedirectUrl());
    } catch (error) {
      response.clearCookie(OAUTH_STATE_COOKIE, this.getBaseCookieOptions());
      response.redirect(
        this.getFailureRedirectUrl(this.getFailureReason(error)),
      );
    }
  }

  @Get('me')
  async getCurrentUser(
    @Req() request: Request,
  ): Promise<CurrentUserResponseDto> {
    const cookies = this.parseCookies(request);
    const user = await this.authService.getCurrentUser(
      this.getBearerToken(request) ?? cookies[ACCESS_TOKEN_COOKIE],
    );

    return CurrentUserResponseDto.from(user);
  }

  @Post('auth/refresh')
  @HttpCode(200)
  async refreshAccessToken(
    @Req() request: Request,
  ): Promise<AuthTokenResponseDto> {
    const cookies = this.parseCookies(request);
    const accessToken = await this.authService.refreshAccessToken(
      cookies[REFRESH_TOKEN_COOKIE],
    );

    return AuthTokenResponseDto.from(accessToken);
  }

  @Get('auth/session')
  async getSession(@Req() request: Request): Promise<AuthSessionResponseDto> {
    const cookies = this.parseCookies(request);
    const authenticated = await this.authService.hasAuthenticatedSession(
      cookies[REFRESH_TOKEN_COOKIE],
    );

    return AuthSessionResponseDto.from(authenticated);
  }

  @Post('auth/logout')
  @HttpCode(204)
  logout(@Res() response: Response): void {
    response.clearCookie(ACCESS_TOKEN_COOKIE, this.getBaseCookieOptions());
    response.clearCookie(REFRESH_TOKEN_COOKIE, this.getBaseCookieOptions());
    response.send();
  }

  private setRefreshTokenCookie(
    response: Response,
    refreshToken: string,
  ): void {
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      ...this.getBaseCookieOptions(),
      maxAge: this.getDurationMilliseconds(
        process.env.JWT_REFRESH_EXPIRES_IN ?? '14d',
      ),
    });
  }

  private validateOAuthState(
    state: string | undefined,
    storedState: string | undefined,
  ): void {
    if (!state || !storedState || !this.isEqual(state, storedState)) {
      throw new BadRequestException('Invalid OAuth state.');
    }
  }

  private isEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);

    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }

  private getBearerToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    return authorization.slice('Bearer '.length).trim();
  }

  private parseCookies(request: Request): Record<string, string> {
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

        cookies[name] = decodeURIComponent(value);

        return cookies;
      }, {});
  }

  private getBaseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax' as const,
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: '/',
    };
  }

  private getDurationMilliseconds(value: string): number {
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

  private getSuccessRedirectUrl(): string {
    const successUrl =
      process.env.FRONTEND_AUTH_SUCCESS_REDIRECT ??
      'http://localhost:5173/auth/kakao/success';
    const url = new URL(successUrl);

    url.searchParams.set('login', 'success');

    return url.toString();
  }

  private getFailureRedirectUrl(reason?: string): string {
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

  private getFailureReason(error: unknown): string {
    if (error instanceof BadRequestException) {
      const response = error.getResponse();
      const message =
        typeof response === 'object' &&
        response !== null &&
        'message' in response
          ? String(response.message)
          : error.message;

      if (message.includes('canceled')) {
        return 'kakao_canceled';
      }

      if (message.includes('authorization code')) {
        return 'missing_code';
      }

      if (message.includes('OAuth state')) {
        return 'invalid_state';
      }

      if (message.includes('exchange Kakao')) {
        return 'token_exchange_failed';
      }

      if (message.includes('fetch Kakao')) {
        return 'profile_fetch_failed';
      }

      if (message.includes('email')) {
        return 'email_required';
      }

      if (message.includes('nickname')) {
        return 'nickname_required';
      }
    }

    return 'server_error';
  }
}
