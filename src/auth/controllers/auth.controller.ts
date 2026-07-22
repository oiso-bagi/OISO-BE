import {
  BadRequestException,
  Controller,
  Get,
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

      this.setAuthCookies(response, tokens.accessToken, tokens.refreshToken);
      response.clearCookie(OAUTH_STATE_COOKIE, this.getBaseCookieOptions());
      response.redirect(this.getSuccessRedirectUrl());
    } catch {
      response.clearCookie(OAUTH_STATE_COOKIE, this.getBaseCookieOptions());
      response.redirect(this.getFailureRedirectUrl());
    }
  }

  @Get('me')
  async getCurrentUser(
    @Req() request: Request,
  ): Promise<CurrentUserResponseDto> {
    const cookies = this.parseCookies(request);
    const user = await this.authService.getCurrentUser(
      cookies[ACCESS_TOKEN_COOKIE],
    );

    return CurrentUserResponseDto.from(user);
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ): void {
    response.cookie(ACCESS_TOKEN_COOKIE, accessToken, {
      ...this.getBaseCookieOptions(),
      maxAge: this.getDurationMilliseconds(
        process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      ),
    });
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
    return (
      process.env.FRONTEND_AUTH_SUCCESS_REDIRECT ??
      'http://localhost:5173/auth/kakao/success'
    );
  }

  private getFailureRedirectUrl(): string {
    return (
      process.env.FRONTEND_AUTH_FAILURE_REDIRECT ??
      'http://localhost:5173/login?error=kakao_auth_failed'
    );
  }
}
